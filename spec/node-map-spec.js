var crypto = require('crypto');
var NodeMap = require('../lib/node-map').NodeMap;

describe('The node map', function () {
    var nodeMap;
    var numReplicas;

    beforeEach(function () {
	numReplicas = 3;
	nodeMap = new NodeMap(numReplicas, crypto);
    });

    it('should not contain any nodes initially', function () {
	var node = 'node';
	expect(nodeMap.containsNode(node)).toEqual(false);
    });
    
    it('should add nodes to the map', function () {
	var node = 'partiton';
	nodeMap.addNode(node);
	expect(nodeMap.containsNode(node)).toEqual(true);
    });

    it('should remove nodes from the map', function () {
	var node = 'node';
	nodeMap.addNode(node);
	nodeMap.removeNode(node);
	expect(nodeMap.containsNode(node)).toEqual(false);
    });

    it('should return the node that holds the value for a provided key', function () {
	var node = 'node';
	nodeMap.addNode(node);
	var key = '8kkma88f38oi23roijf32';
	expect(nodeMap.getNodeForKey(key)).toEqual(node);
    });
});
