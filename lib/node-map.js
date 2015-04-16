var _ = require('underscore');

function NodeMap (numReplicas, crypto) {
    var nodeMap = {};
    var nodeKeys = [];

    function createKey (node, replica) {
	var md5 = crypto.createHash('md5');
	md5.update(node.concat(replica));
	return md5.digest('hex');
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
	 * Returns the node that is responsible for storing the provided
	 * key.
	 *
	 * @param key {String} The key of a key value pair.
	 * @param {String} The node that is responsible for storing the
	 * provided key.
	 */
	getNodeForKey: function (key) {
	    var internalKey = createKey(key, '');
	    var index = _.sortedIndex(nodeKeys, internalKey);
	    return nodeMap[nodeKeys[index]];
	}
    };
}

module.exports.NodeMap = NodeMap;
