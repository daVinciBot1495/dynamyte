var _ = require('underscore');
var DatastoreValue = require('./datastore-value').DatastoreValue;
var DatastoreContext = require('./datastore-context').DatastoreContext;

function Datastore (nodeMap, hasher, merkleTreeResource, merkleTreeBuilder) {
    var merkleTreeMap = {};
    var nodeKeySpaceMap = {};

    function getTreeForNode (node) {
	return hasher.hash(node);
    }
    
    function getNodeForKey (key) {
	var node = nodeMap.getNodeForKey(key);

	if (_.isUndefined(node)) {
	    throw new Error('Node for key does not exist');
	}

	return node;
    }

    function updateMerkleTrees () {
	_.each(nodeKeySpaceMap, function (keySpace, node) {
	    var treeId = getTreeForNode(node);
	    var pathToRoot = merkleTreeResource.getUriForTreeBranch(treeId);
	    var values = _.map(keySpace, function (dsValue, key) {
		return {
		    key: key,
		    dsValue: dsValue
		};
	    });
	    var tree = merkleTreeBuilder
		.pathToRoot(pathToRoot)
		.build(values);
	    merkleTreeMap[treeId] = tree;
	});
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
	},

	putValueForKey: function (key, value, context) {
	    var dsValue = this.getValueForKey(key);

	    if (_.isUndefined(dsValue)) {
		// TODO: Return 404 Not Found once create is implemented
		dsValue = this.createValueForKey(key);
	    }

	    if (dsValue.write(value, context)) {		
		updateMerkleTrees();
		return dsValue.context;
	    }
	},

	getMerkleTreeUris: function () {
	    var resources = [];
	    
	    _.each(merkleTreeMap, function (tree, treeId) {
		var branchId = tree.getRoot().hash;
		var uri = merkleTreeResource.getUriForTreeBranch(treeId) + '/';
		uri += branchId;
		resources.push(uri);
	    });

	    return resources;
	},

	getMerkleTree: function (treeId) {
	    return merkleTreeMap[treeId];
	}
    }
}

module.exports.Datastore = Datastore;
