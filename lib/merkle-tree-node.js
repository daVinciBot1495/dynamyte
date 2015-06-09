function MerkleTreeNode (value, hash) {
    return {
	parentLink: null,
	childLinks: [],
	value: value,
	hash: hash
    };
}

module.exports.MerkleTreeNode = MerkleTreeNode;
