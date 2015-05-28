var Hasher = require('../lib/hasher').Hasher;
var NodeMap = require('../lib/node-map').NodeMap;

describe('The node map', function () {
    var mockHasher;
    var mockHashSuffix;
    
    var nodeMap;
    var numNodes;
    var numReplicas;
    var numNodesPerPartition;

    function addNodesToMap () {
	for (var i = 0; i < numNodes; ++i) {
	    nodeMap.addNode(i.toString());
	}
    }

    function removeNodesFromMap () {
	for (var i = 0; i < numNodes; ++i) {
	    nodeMap.removeNode(i.toString());
	}
    }
    
    function mockHashFunc (str) {
	return str.concat(mockHashSuffix);
    }    
    
    beforeEach(function () {
	mockHashSuffix = 'hash';
	mockHasher = jasmine.createSpyObj('hasher', ['hash']);
	mockHasher.hash.andCallFake(mockHashFunc);

	numNodes = 9;
	numReplicas = 3;
	numNodesPerPartition = 3;
	nodeMap = new NodeMap(numNodesPerPartition, numReplicas, mockHasher);
    });

    describe('when nodes have not been added', function () {
	it('should not contain any nodes', function () {
	    expect(nodeMap.getNodesForKey('any')).toEqual([]);
	});

	it('should not use the hasher', function () {
	    expect(mockHasher.hash).not.toHaveBeenCalled();
	});
    });

    describe('when nodes have been added', function () {
	beforeEach(function () {
	    addNodesToMap();
	});
	
	it('should hash each node number of replicas times', function () {
	    expect(mockHasher.hash.callCount).toEqual(numNodes * numReplicas);
	});

	it('should contain each node', function () {
	    for (var i = 0; i < numNodes; ++i) {
		expect(nodeMap.containsNode(i.toString())).toEqual(true);
	    }
	});

	describe('and then removed', function () {
	    beforeEach(function () {
		removeNodesFromMap();
	    });

	    it('should be empty', function () {
		for (var i = 0; i < numNodes; ++i) {
		    expect(nodeMap.containsNode(i.toString())).toEqual(false);
		}	
	    });
	});
    });

    describe('when nodes have been added', function () {
	beforeEach(function () {
	    numReplicas = 1;
	    nodeMap = new NodeMap(numNodesPerPartition, numReplicas, mockHasher);
	    addNodesToMap();
	});

	it('should return the first node responsible for storing a given key', function () {
	    expect(nodeMap.getNodeForKey('00')).toEqual('0');
	    expect(nodeMap.getNodeForKey('60')).toEqual('6');
	    expect(nodeMap.getNodeForKey('70')).toEqual('7');
	});
	
	it('should return the nodes responsible for storing a given key', function () {
	    expect(nodeMap.getNodesForKey('00')).toEqual(['0', '1', '2']);
	    expect(nodeMap.getNodesForKey('60')).toEqual(['6', '7', '8']);
	    expect(nodeMap.getNodesForKey('70')).toEqual(['7', '8', '0']);
	});
    });
});
