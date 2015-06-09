var _ = require('underscore');
var logger = require('morgan');
var express = require('express');
var Promise = require('bluebird');
var commander = require('commander');
var bodyParser = require('body-parser');
var Hasher = require('./lib/hasher').Hasher;
var NodeMap = require('./lib/node-map').NodeMap;
var Datastore = require('./lib/datastore').Datastore;
var HttpClient = require('./lib/http-client').HttpClient;
var DynamyteClient = require('./lib/dynamyte-client').DynamyteClient;
var DatastoreValue = require('./lib/datastore-value').DatastoreValue;
var DatastoreContext = require('./lib/datastore-context').DatastoreContext;
var MerkleTreeBuilder = require('./lib/merkle-tree-builder').MerkleTreeBuilder;
var MerkleTreeResource = require('./lib/merkle-tree-resource').MerkleTreeResource;

/**
 * Converts a CSV string to a list of strings.
 */
function list (val) {
    return val.split(',');
}

/**
 * Converts a port number to the a server URL.
 */
function portToServerUrl (port) {
    return 'http://localhost:' + port;    
}

// Paser command line arguments
commander
    .option('--partitionSize [partitionSize]', 'partitionSize')
    .option('--quorumReads [quorumReads]', 'quorumReads')
    .option('--quorumWrites [quorumWrites]', 'quorumWrites')
    .option('--replicas [replicas]', 'replicas')
    .option('--port [port]', 'port')
    .option('--servers <servers>', 'servers', list)
    .parse(process.argv);

if (!commander.partitionSize ||
    !commander.quorumReads ||
    !commander.quorumWrites ||
    !commander.replicas ||
    !commander.port ||
    !commander.servers) {
    commander.help();
}

commander.partitionSize = Number(commander.partitionSize);
commander.quorumReads = Number(commander.quorumReads);
commander.quorumWrites = Number(commander.quorumWrites);
commander.replicas = Number(commander.replicas);
commander.server = portToServerUrl(commander.port);
commander.servers.push(commander.port);
commander.servers.sort();
commander.servers = _.map(commander.servers, portToServerUrl);

// Setup the express service
var app = express();

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// Define the service APIs
var hasher = new Hasher();
var nodeMap = new NodeMap(
    commander.partitionSize,
    commander.replicas,
    hasher);
var merkleTreeBuilder = new MerkleTreeBuilder(hasher);
var merkleTreeResource = new MerkleTreeResource(commander.server);
var datastore = new Datastore(
    nodeMap,
    hasher,
    merkleTreeResource,
    merkleTreeBuilder);

_.each(commander.servers, function (server) {
    nodeMap.addNode(server);
});

/**
 * Common middleware.
 */
function middleware (req, res, next) {
    var key = req.params.key || req.body.key;
    
    if (_.isUndefined(key)) {
	res.status(400).json({
	    reason: 'No key provided'
	});
    } else {
	var partition = nodeMap.getNodesForKey(key);

	/*
	 * If it's the correct partition handle the request. Otherwise, redirect
	 * to the first node of the correct partition.
	 */
	if (_.contains(partition, commander.server)) {
	    /*
	     * It's possible this partition may contain multiple copies of this
	     * node. We want to move the first copy of the node to be first in
	     * the partition so all requests are handled locally first, and the
	     * remaining copies to the end of the partition so other members of
	     * the quorum are not starved.
	     * 
	     */
	    var partitions = _.partition(partition, function (node) {
		return node === commander.server;
	    });
	    var otherNodes = partitions[1];
	    var allButOneServerCopies = _.rest(partitions[0], 1);
	    req.body.partition = otherNodes.concat(allButOneServerCopies);
	    req.body.partition = [commander.server].concat(req.body.partition);
	    next(); // Call the next piece of middleware in the chain
	} else {
	    res.redirect(307, _.first(partition) + req.originalUrl);
	}
    }
}

function sendQuorumError(res, error) {
    var response = _.chain(error).omit('length').values()
	.sortBy(function (response) {
	    return response.statusCode;
	}).first().value();
    res.status(response.statusCode).json({
	reason: response.reason
    });
}

/**
 * Gets a value from the provided node's datastore.
 *
 * @param node {String} A node.
 * @param key {String} A key.
 * @return {Promise}
 */
function get (node, key) {
    if (node === commander.server) {
	var dsValue = datastore.getValueForKey(key);
	return _.isUndefined(dsValue) ? Promise.reject({
	    statusCode: 404,
	    reason: 'Value for key=' + key + ' not found'
	}): Promise.resolve({
	    statusCode: 200,
	    value: dsValue
	});
    } else {
	var httpClient = new HttpClient();
	var dynamyte = new DynamyteClient(node, httpClient);
	return dynamyte.get(key, false);
    }
}

/**
 * Gets a value from this node's datastore.
 *
 * @param key {String} A key.
 * @return {Object} A datastore value of the form: {
 *     value: {Object}
 *     context: {Object}
 * }
 */
app.get('/no-quorum/val/:key', middleware, function (req, res) {
    get(commander.server, req.params.key).then(function (resolved) {
    	res.status(resolved.statusCode).json(resolved.value);
    }).catch(function (rejected) {
    	res.status(rejected.statusCode).json(_.omit(rejected, 'statusCode'));
    });
});

/**
 * Gets a value from the datastore using quorum reads.
 *
 * @param key {String} A key.
 * @return {Object} A datastore value of the form: {
 *     value: {Object}
 *     context: {Object}
 * }
 */
app.get('/val/:key', middleware, function (req, res) {
    var key = req.params.key;
    var partition = req.body.partition;
	
    // Read the value from the other nodes in the partition
    var reads = _.map(partition, function (node) {
	return get(node, key);
    });

    /*
     * If R of N reads succeed find the value with the most recent version and
     * return it to the client. Otherwise, determine the best status code to
     * return.
     */
    Promise.some(reads, commander.quorumReads).then(function (responses) {
	var dsValue = _.chain(responses).map(function (response) {
	    return response.value;
	}).sortBy(function (value) {
	    return value.context.version;
	}).last().value();
	res.json(dsValue);	
    }).catch (function (error) {
	sendQuorumError(res, error);
    });
});

/**
 * Puts a value into the provided node's datastore.
 *
 * @param node {String} A node.
 * @param key {String} A key.
 * @param value {Object} A value.
 * @param context {Object} The context.
 * @return {Promise}
 */
function put (node, key, value, context) {
    if (node === commander.server) {
	// Write the value locally
	var newContext = datastore.putValueForKey(key, value, context);

	if (_.isUndefined(newContext)) {
	    return Promise.reject({
		statusCode: 409,
		reason: 'Context for key=' + key + ' is out of date'
	    });
	} else {
	    return Promise.resolve({
		statusCode: 200,
		value: newContext
	    });
	}
    } else {
	var httpClient = new HttpClient();
	var dynamyte = new DynamyteClient(node, httpClient);
	return dynamyte.put(key, value, false, context);
    }
}

/**
 * Puts a value into this node's datastore.
 *
 * @param key {String} A key.
 * @param value {Object} A value.
 * @param context {Object} The context.
 * @return {Object} The updated context.
 */
app.put('/no-quorum/val/:key', middleware, function (req, res) {
    var key = req.params.key;
    var value = req.body.value;
    var context = req.body.context;
    
    if (_.isUndefined(value)) {
	res.status(400).json({
	    reason: 'No value provided'
	});
    } else if (_.isUndefined(context)) {
	res.status(400).json({
	    reason: 'No context provided'
	});
    } else {
	put(commander.server, key, value, context).then(function (resolved) {
	    res.status(resolved.statusCode).json(resolved.value);
	}).catch(function (rejected) {
	    res.status(rejected.statusCode).json(_.omit(rejected, 'statusCode'));
	});
    }
});

/**
 * Puts a value into the datastore using quorum writes.
 *
 * @param key {String} A key.
 * @param value {Object} A value.
 * @param context {Object} The context.
 * @return {Object} The updated context.
 */
app.put('/val/:key', middleware, function (req, res) {
    var key = req.params.key;
    var value = req.body.value;
    var context = req.body.context;
    var partition = req.body.partition;
    
    if (_.isUndefined(value)) {
	res.status(400).json({
	    reason: 'No value provided'
	});
    } else if (_.isUndefined(context)) {
	res.status(400).json({
	    reason: 'No context provided'
	});
    } else {
	var writes = _.map(partition, function (node) {
	    return put(node, key, value, context);
	});
	
	/*
	 * If W of N writes succeed return the updated context to the client.
	 * Otherwise, determine the best status code to return.
	 */
	Promise.some(writes, commander.quorumWrites).then(function (responses) {
	    var context = _.chain(responses).map(function (response) {
		return response.value;
	    }).sortBy(function (value) {
		return value.version;
	    }).last().value();
	    res.json(context);	
	}).catch (function (error) {
	    sendQuorumError(res, error);
	});
    }
});

/**
 * Returns the array of Merkle tree URIs maintained by this node.
 *
 * @return {Array} The array of Merkle tree URIs maintained by this node.
 */
app.get('/trees', function (req, res) {
    res.json(datastore.getMerkleTreeUris());
});

/**
 * Returns the requested branch of the provided Merkle tree.
 *
 * @param treeId {String} The id of the Merkle tree.
 * @param branchId {String} The id of the Merkle tree's branch.
 * @return {Object} A tree node object.
 */
app.get(merkleTreeResource.getUriTemplateForTreeBranch(), function (req, res) { 
    var treeId = req.params.treeId;
    var branchId = req.params.branchId;
    var tree = datastore.getMerkleTree(treeId);

    if (_.isUndefined(tree)) {
	res.status(404).json({
	    reason: 'No Merkle tree found for treeId=' + treeId
	});
    } else if (_.isUndefined(tree.getBranch(branchId))) {
	res.status(404).json({
	    reason: 'No Merkle tree branch found for branchId=' + branchId
	});
    } else {
	res.json(tree.getBranch(branchId));
    }
});

app.listen(commander.port);
