function MerkleTreeResource (server) {
    return {
	getUriForTreeBranch: function (treeId) {
	    return server + '/tree/' + treeId + '/branch';
	},

	getUriTemplateForTreeBranch: function () {
	    return '/tree/:treeId/branch/:branchId';
	}
    };
}

module.exports.MerkleTreeResource = MerkleTreeResource;
