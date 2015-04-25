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
var nodeMap = new NodeMap(commander.partitionSize, commander.replicas, new Hasher());

_.each(commander.servers, function (server) {
    nodeMap.addNode(server);
});

/**
 * Common middleware.
 */
function middleware (req, res, next) {
    if (_.isUndefined(req.body.key)) {
	res.status(400).json({
	    message: 'No key provided'
	});
    } else if (!_.isBoolean(req.body.quorum)) {
	res.status(400).json({
	    message: 'Invalid quorum provided'
	});
    } else {
	var key = req.body.key;
	var node = commander.server;
	var partition = nodeMap.getNodesForKey(key);

	if (_.contains(partition, node)) {
	    req.body.partition = _.without(partition, node);
	    next();
	} else {
	    res.redirect(307, _.first(partition) + req.originalUrl);
	}
    }
}

/**
 * Gets a value from the datastore.
 *
 * @param key {String} A key.
 * @param quorum {Boolean} Whether or not a quorum read should be performed.
 * @return {Object} A datastore value of the form: {
 *     value: {Object}
 *     context: {Object}
 * }
 */
app.post('/api/get', middleware, function (req, res) {
    var dsValue = keyValueMap[req.body.key];

    if (_.isUndefined(dsValue)) {
	dsValue = new DatastoreValue(undefined, new DatastoreContext());
    }

    res.json(dsValue);
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
	    message: 'No value provided'
	});
    } else if (_.isUndefined(req.body.context)) {
	res.status(400).json({
	    message: 'No context provided'
	});
    } else {
	var key = req.body.key;
	var value = req.body.value;
	var quorum = req.body.quorum;
	var context = req.body.context;
	var dsValue = keyValueMap[key];
	
	if (_.isUndefined(dsValue)) {
	    dsValue = new DatastoreValue(undefined, new DatastoreContext());
	}

	// Write the value locally
	if (!dsValue.write(value, context)) {
	    res.status(409).json({
		message: 'Context is out of date'
	    });
	} else {
	    keyValueMap[key] = dsValue;

	    if (!quorum) {
		res.send(dsValue.context);
	    } else {
		var httpClient = new HttpClient();
		var partition = req.body.partition;
		
		// Write the value to the other nodes in the partition
		var writes = _.map(partition, function (node) {
		    var dynamyte = new DynamyteClient(node, httpClient);
		    return dynamyte.put(key, value, false, context);
		});
		
		// If all the writes succeed send a 200, else send a 500
		Promise.all(writes).then(function () {
		    res.send(dsValue.context);
		}).catch(function (error) {
		    res.status(500).json({
			message: 'Error writing value to other servers'
		    });
		});
	    }
	}
    }
});

app.listen(commander.port);
