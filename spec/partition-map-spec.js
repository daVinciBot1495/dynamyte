var crypto = require('crypto');
var PartitionMap = require('../lib/partition-map').PartitionMap;

describe('The partition map', function () {
    var numReplicas;
    var partitionMap;    

    beforeEach(function () {
	numReplicas = 3;
	partitionMap = new PartitionMap(numReplicas, crypto);
    });

    it('should not contain any partitions initially', function () {
	var partition = 'partition';
	expect(partitionMap.containsPartition(partition)).toEqual(false);
    });
    
    it('should add partitions to the map', function () {
	var partition = 'partiton';
	partitionMap.addPartition(partition);
	expect(partitionMap.containsPartition(partition)).toEqual(true);
    });

    it('should remove partitions from the map', function () {
	var partition = 'partition';
	partitionMap.addPartition(partition);
	partitionMap.removePartition(partition);
	expect(partitionMap.containsPartition(partition)).toEqual(false);
    });

    it('should return the partition that holds the value for a provided key', function () {
	var partition = 'partition';
	partitionMap.addPartition(partition);
	var key = '8kkma88f38oi23roijf32';
	expect(partitionMap.getPartitionForKey(key)).toEqual(partition);
    });
});
