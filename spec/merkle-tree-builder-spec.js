var MerkleTreeBuilder = require('../lib/merkle-tree-builder').MerkleTreeBuilder;

describe('The Merkle tree builder', function () {
    var builder;
    var mockHasher;
    var mockPathToRoot;

    function mockHash (str) {
	return 'hash(' + str + ')';
    }

    beforeEach(function () {
	mockPathToRoot = '/path/to/root';
	mockHasher = jasmine.createSpyObj('hasher', ['hash']);
	mockHasher.hash.andCallFake(mockHash);
	builder = new MerkleTreeBuilder(mockHasher).pathToRoot(mockPathToRoot);
    });
    
    describe('when given a non-list', function () {
	it('should build an undefined Merkle tree', function () {
	    expect(builder.build('Her?')).toBeUndefined();
	});
    });
    
    describe('when given an empty list of values', function () {
	it('should build an undefined Merkle tree', function () {
	    expect(builder.build([])).toBeUndefined();
	});
    });

    describe('when given a list with one value', function () {
	var value;
	var values;

	beforeEach(function () {
	    value = 1;
	    values = [value];
	});
	
	it('should build a Merkle tree', function () {
	    expect(builder.build(values).getRoot()).toEqual({
		parentLink: null,
		childLinks: [
		    mockPathToRoot + '/' + mockHash(value)
		],
		value: null,
		hash: mockHash(mockHash(value))
	    });
	});
    });

    describe('when given a list with two values', function () {
	var one;
	var two;
	var values;

	beforeEach(function () {
	    one = 1;
	    two = 2;
	    values = [one, two];
	});
	
	it('should build a Merkle tree', function () {
	    expect(builder.build(values).getRoot()).toEqual({
		parentLink: null,
		childLinks: [
		    mockPathToRoot + '/' + mockHash(mockHash(1)),
		    mockPathToRoot + '/' + mockHash(mockHash(2))
		],
		value: null,
		hash: mockHash(mockHash(mockHash(1)) + mockHash(mockHash(2)))
	    });
	});
    });

    describe('when given a list with three values', function () {
	var one;
	var two;
	var three;
	var values;

	beforeEach(function () {
	    one = 1;
	    two = 2;
	    three = 3;
	    values = [one, two, three];
	});
	
	it('should build a Merkle tree', function () {
	    expect(builder.build(values).getRoot()).toEqual({
		parentLink: null,
		childLinks: [
		    mockPathToRoot + '/' + mockHash(mockHash(mockHash(1)) + mockHash(mockHash(2))),
		    mockPathToRoot + '/' + mockHash(mockHash(3))
		],
		value: null,
		hash: mockHash(mockHash(mockHash(mockHash(1)) + mockHash(mockHash(2))) + mockHash(mockHash(3)))
	    });
	});
    });
});
