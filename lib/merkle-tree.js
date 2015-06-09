function MerkleTree (rootNode, hashTreeNodeMap) {
    return {
	getRoot: function () {
	    return rootNode;
	},

	getBranch: function (branchId) {
	    return hashTreeNodeMap[branchId];
	}
    };
}

module.exports.MerkleTree = MerkleTree;
