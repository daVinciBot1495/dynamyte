var _ = require('underscore');
var logger = require('morgan');
var express = require('express');
var Promise = require('bluebird');
var commander = require('commander');
var bodyParser = require('body-parser');
var Hasher = require('./lib/hasher').Hasher;
var NodeMap = require('./lib/node-map').NodeMap;
var HttpClient = require('./lib/http-client').HttpClient;
var DynamyteClient = require('./lib/dynamyte-client').DynamyteClient;
var DatastoreValue = require('./lib/datastore-value').DatastoreValue;
var DatastoreContext = require('./lib/datastore-context').DatastoreContext;

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
var keyValueMap = {};
var nodeMap = new NodeMap(
    commander.partitionSize,
    commander.replicas,
    new Hasher());

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
    }/* else if (!_.isBoolean(req.body.quorum)) {
	res.status(400).json({
	    reason: 'Invalid quorum provided'
	});
    }*/ else {
	var partition = nodeMap.getNodesForKey(key);

	/*
	 * If it's the correct partition handle the request. Otherwise, redirect
	 * to the first node of correct partition.
	 */
	if (_.contains(partition, commander.server)) {
	    // Isolate the other nodes in the partition from this server
	    var partitions = _.partition(partition, function (node) {
		return node === commander.server;
	    });
	    var otherNodes = partitions[1];
	    var allButOneServerCopies = _.rest(partitions[0], 1);
	    
	    /*
	     * All server copies but one should be added back to the partition.
	     * In the ideal case, allButOneServerCopies is empty, but it's
	     * possible that this is not the case. This is necessary to ensure
	     * the partition passed to the get and put APIs has size N - 1.
	     */
	    req.body.partition = otherNodes.concat(allButOneServerCopies);
	    next();
	} else {
	    res.redirect(307, _.first(partition) + req.originalUrl);
	}
    }
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
	var dsValue = keyValueMap[key];
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
    var partition = [commander.server].concat(req.body.partition);
	
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
	    value.context.version;
	}).last().value();
	res.json(dsValue);	
    }).catch (function (error) {
	var response = _.chain(error).omit('length').values()
	    .sortBy(function (response) {
		return response.statusCode;
	    }).first().value();
	res.status(response.statusCode).json({
	    reason: response.reason
	});
    });
});

/**
 * Puts a key value pair into the datastore.
 *
 * @param key {String} A key.
 * @param value {Object} A value.
 * @param quorum {Boolean} Whether or not a quorum read should be performed.
 * @param context {Object} The context object used to version values.
 * @return {Object} The updated context.
 */
app.post('/api/put', middleware, function (req, res) {
    if (_.isUndefined(req.body.value)) {
	res.status(400).json({
	    reason: 'No value provided'
	});
    } else if (_.isUndefined(req.body.context)) {
	res.status(400).json({
	    reason: 'No context provided'
	});
    } else {
	var key = req.body.key;
	var value = req.body.value;
	var context = req.body.context;
	var dsValue = keyValueMap[key];
	
	if (_.isUndefined(dsValue)) {
	    dsValue = new DatastoreValue(undefined, new DatastoreContext());
	}

	// Write the value locally
	if (!dsValue.write(value, context)) {
	    res.status(409).json({
		reason: 'Context is out of date'
	    });
	} else {
	    keyValueMap[key] = dsValue;

	    if (!req.body.quorum) {
		res.send(dsValue.context);
	    } else {
		var httpClient = new HttpClient();
		var partition = req.body.partition;
		
		// Write the value to the other nodes in the partition
		var writes = _.map(partition, function (node) {
		    if (node === commander.server) {
			return Promise.resolve(dsValue.context);
		    } else {
			var dynamyte = new DynamyteClient(node, httpClient);
			return dynamyte.put(key, value, false, context);
		    }
		});
		
		/*
		 * If W - 1 of N - 1 writes succeed return the updated context
		 * to the client. Otherwise, send a 500.
		 */
		Promise.some(writes, commander.quorumWrites - 1).then(function () {
		    res.send(dsValue.context);
		}).catch(function () {
		    res.status(500).json({
			reason: 'Error writing value to other servers'
		    });
		});
	    }
	}
    }
});

app.listen(commander.port);
