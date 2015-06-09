var _ = require('underscore');
var MerkleTree = require('./merkle-tree').MerkleTree;
var MerkleTreeNode = require('./merkle-tree-node').MerkleTreeNode;

function MerkleTreeBuilder (hasher) {
    var pathToRoot = '';
    
    function getLink (hash) {
	return pathToRoot + '/' + hash;
    }

    function isEven (val) {
	return 0 === (val % 2);
    }

    function createParentForChildren (childNodes) {
	var hash = hasher.hash(_.reduce(childNodes, function (memo, childNode) {
	    return memo + childNode.hash;
	}, ''));
	var treeLink = getLink(hash);
	var treeNode = new MerkleTreeNode(null, hash);

	_.each(childNodes, function (childNode) {
	    treeNode.childLinks.push(getLink(childNode.hash));
	    childNode.parentLink = treeLink;
	});

	return treeNode;
    }
    
    return {
	pathToRoot: function (newPathToRoot) {
	    pathToRoot = newPathToRoot;
	    return this;
	},
	
	build: function (values) {
	    if (!_.isArray(values) || _.isEmpty(values)) {
		return undefined;
	    }
	    
	    var hashTreeNodeMap = {};
	    var leafNodes = _.map(values, function (value) {
		var hash = hasher.hash(JSON.stringify(value));
		var treeNode = new MerkleTreeNode(value, hash);
		hashTreeNodeMap[treeNode.hash] = treeNode;
		return treeNode;
	    });
	    var leafNodes = _.sortBy(leafNodes, function (leafNode) {
		return leafNode.hash;
	    });
	    var leafNodeParents = _.map(leafNodes, function (leafNode) {
		var hash = hasher.hash(leafNode.hash);
		var treeNode = new MerkleTreeNode(null, hash);
		treeNode.childLinks.push(getLink(leafNode.hash));
		leafNode.parentLink = getLink(hash);
		hashTreeNodeMap[treeNode.hash] = treeNode;
		return treeNode;
	    });
	    var N = _.size(leafNodeParents);
	    var queue = isEven(N) ?
		leafNodeParents.splice(0, N) : leafNodeParents.splice(0, N - 1);

	    while (_.size(queue) > 1) {
		var childNodes = queue.splice(0, 2);
		var treeNode = createParentForChildren(childNodes);
		hashTreeNodeMap[treeNode.hash] = treeNode;
		queue.push(treeNode);
	    }

	    if (!_.isEmpty(queue) && !_.isEmpty(leafNodeParents)) {
		var childNodes = [
		    _.first(queue.splice(0, 1)),
		    _.first(leafNodeParents.splice(0, 1))];
		var treeNode = createParentForChildren(childNodes);
		hashTreeNodeMap[treeNode.hash] = treeNode;
		queue.push(treeNode);
	    } else if (_.isEmpty(queue) && !_.isEmpty(leafNodeParents)) {
		queue.push(_.first(leafNodeParents.splice(0, 1)));
	    }

	    return new MerkleTree(queue[0], hashTreeNodeMap);
	}
    };
}

module.exports.MerkleTreeBuilder = MerkleTreeBuilder;
