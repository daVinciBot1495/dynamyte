var _ = require('underscore');
var DatastoreValue = require('./datastore-value').DatastoreValue;
var DatastoreContext = require('./datastore-context').DatastoreContext;

function Datastore (nodeMap) {
    var nodeKeySpaceMap = {};

    function getNodeForKey (key) {
	var node = nodeMap.getNodeForKey(key);

	if (_.isUndefined(node)) {
	    throw new Error('Node for key does not exist');
	}

	return node;
    }
    
    return {
	createValueForKey: function (key) {
	    var node = getNodeForKey(key);
	    var keyValueMap = nodeKeySpaceMap[node];

	    if (_.isUndefined(keyValueMap)) {
		keyValueMap = {};
		nodeKeySpaceMap[node] = keyValueMap;
	    }

	    var dsValue = keyValueMap[key];

	    if (_.isUndefined(dsValue)) {
		dsValue = new DatastoreValue(undefined, new DatastoreContext());
		keyValueMap[key] = dsValue;
	    } else {
		throw new Error('Value for key already exists');
	    }

	    return dsValue;
	},

	getValueForKey: function (key) {
	    var dsValue = undefined;
	    var node = getNodeForKey(key);
	    var keyValueMap = nodeKeySpaceMap[node];

	    if (!_.isUndefined(keyValueMap)) {
		dsValue = keyValueMap[key];
	    }

	    return dsValue;	    
	}	
    }
}

module.exports.Datastore = Datastore;
