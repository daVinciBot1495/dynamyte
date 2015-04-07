var _ = require('underscore');
var crypto = require('crypto');
var logger = require('morgan');
var express = require('express');
var commander = require('commander');
var bodyParser = require('body-parser');
var PartitionMap = require('./lib/partition-map').PartitionMap;

// Parse the command line arguments
function list (val) {
    return val.split(',');
}

commander.option('-p, --port [port]', 'port')
    .option('-s, --servers <servers>', 'servers', list)
    .parse(process.argv);

if (!commander.port || !commander.servers) {
    commander.help();
}

commander.servers.push(commander.port);
commander.servers.sort();
commander.servers = _.map(commander.servers, function (port) {
    return 'http://localhost:' + port;
});

// Setup the express service
var app = express();

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// Define the service APIs
var keyValueMap = {};
var partitionMap = new PartitionMap(3, crypto);

_.each(commander.servers, function (server) {
    partitionMap.addPartition(server);
});

/**
 * Common middleware.
 */
function middleware (req, res, next) {
    if (_.isUndefined(req.body.key)) {
	res.status(400).json({
	    message: 'No key provided'
	});
    } else {
	var key = req.body.key;
	var server = partitionMap.getPartitionForKey(key);

	// If this is not the server has the value for the key then redirect
	if (server.indexOf(commander.port) < 0) {
	    res.redirect(307, server + req.originalUrl);
	} else {
	    next();
	}
    }
}

/**
 * Gets a value from the datastore.
 *
 * @param key {String} A key.
 * @return {Object} A value.
 */
app.post('/api/get', middleware, function (req, res) {
    var value = keyValueMap[req.body.key];

    if (_.isUndefined(value)) {
	res.status(404).json({
	    message: 'Value for key not found'
	});
    } else {
	res.json(value);
    }
});

/**
 * Puts a key value pair into the datastore.
 *
 * @param key {String} A key.
 * @param value {Object} A value.
 */
app.post('/api/put', middleware, function (req, res) {
    if (_.isUndefined(req.body.value)) {
	res.status(400).json({
	    message: 'No value provided'
	});
    } else {
	keyValueMap[req.body.key] = req.body.value;
	res.send();
    }
});

app.listen(commander.port);
