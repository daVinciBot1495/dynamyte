var _ = require('underscore');

function PartitionMap (numReplicas, crypto) {
    var partitionMap = {};
    var partitionKeys = [];

    function createKey (partition, replica) {
	var md5 = crypto.createHash('md5');
	md5.update(partition.concat(replica));
	return md5.digest('hex');
    }
    
    return {
	/**
	 * Adds the provided partition to the partition map.
	 *
	 * @param partition {String} A string representation of a partition.
	 */
	addPartition: function (partition) {
	    for (var i = 0; i < numReplicas; ++i) {
		var key = createKey(partition, i);
		var index = _.sortedIndex(partitionKeys, key);
		partitionMap[key] = partition;
		partitionKeys.splice(index, 0, key);
	    }
	},

	/**
	 * Removes the provided partition from the partition map.
	 *
	 * @param partition {String} A string representation of a partition.
	 */
	removePartition: function (partition) {
	    for (var i = 0; i < numReplicas; ++i) {
		var key = createKey(partition, i);
		var index = _.sortedIndex(partitionKeys, key);
		delete partitionMap[key];
		partitionKeys.splice(index, 1);
	    }
	},

	/**
	 * Returns whether or not the partition map contains the provided
	 * partition.
	 *
	 * @param partition {String} A string representation of a partition.
	 * @return {Boolean} Whether or not the partition map contains the
	 * provided
	 * partition.
	 */
	containsPartition: function (partition) {
	    var key = createKey(partition, 0);
	    return !!partitionMap[key];
	},

	/**
	 * Returns the partition that is responsible for storing the provided
	 * key.
	 *
	 * @param key {String} The key of a key value pair.
	 * @param {String} The partition that is responsible for storing the
	 * provided key.
	 */
	getPartitionForKey: function (key) {
	    var internalKey = createKey(key, '');
	    var index = _.sortedIndex(partitionKeys, internalKey);
	    return partitionMap[partitionKeys[index]];
	}
    };
}

module.exports.PartitionMap = PartitionMap;
