var _ = require('underscore');
var MerkleTreeNode = require('../lib/merkle-tree-node').MerkleTreeNode;

describe('The Merkle tree node', function () {
    describe('when initialized', function () {
	var hash;
	var value;
	var treeNode;

	beforeEach(function () {
	    value = 'Her?';
	    hash = "Who's Anne?";
	    treeNode = new MerkleTreeNode(value, hash);
	});

	it('should provide a null parent link', function () {
	    expect(treeNode.parentLink).toEqual(null);
	});
	
	it('should provide an empty child link list', function () {
	    expect(_.isEmpty(treeNode.childLinks)).toEqual(true);
	});

	it('should provide the given value', function () {
	    expect(treeNode.value).toEqual(value);
	});

	it('should provide the given hash', function () {
	    expect(treeNode.hash).toEqual(hash);
	});
    });    
});
