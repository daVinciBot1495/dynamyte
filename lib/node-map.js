var _ = require('underscore');

function NodeMap (numNodesPerPartition, numReplicas, hasher) {
    var nodeMap = {};
    var nodeKeys = [];

    function createKey (node, replica) {
	return hasher.hash(node.concat(replica));
    }
    
    return {
	/**
	 * Adds the provided node to the node map.
	 *
	 * @param node {String} A string representation of a node.
	 */
	addNode: function (node) {
	    for (var i = 0; i < numReplicas; ++i) {
		var key = createKey(node, i);
		var index = _.sortedIndex(nodeKeys, key);
		nodeMap[key] = node;
		nodeKeys.splice(index, 0, key);
	    }
	},

	/**
	 * Removes the provided node from the node map.
	 *
	 * @param node {String} A string representation of a node.
	 */
	removeNode: function (node) {
	    for (var i = 0; i < numReplicas; ++i) {
		var key = createKey(node, i);
		var index = _.sortedIndex(nodeKeys, key);
		delete nodeMap[key];
		nodeKeys.splice(index, 1);
	    }
	},

	/**
	 * Returns whether or not the node map contains the provided
	 * node.
	 *
	 * @param node {String} A string representation of a node.
	 * @return {Boolean} Whether or not the node map contains the
	 * provided
	 * node.
	 */
	containsNode: function (node) {
	    var key = createKey(node, 0);
	    return !!nodeMap[key];
	},

	/**
	 * Returns the nodes that are responsible for storing the provided
	 * key.
	 *
	 * @param key {String} The key of a key value pair.
	 * @param {Array} The nodes that are responsible for storing the
	 * provided key.
	 */
	getNodesForKey: function (key) {
	    var nodes = [];

	    if (!_.isEmpty(nodeKeys)) {
		var internalKey = createKey(key, '');
		var index = _.sortedIndex(nodeKeys, internalKey);

		for (var i = 0; i < numNodesPerPartition; ++i) {
		    var nodeIndex = (index + i) % _.size(nodeKeys);
		    nodes.push(nodeMap[nodeKeys[nodeIndex]]);
		}
	    }

	    return nodes;
	}
    };
}

module.exports.NodeMap = NodeMap;
