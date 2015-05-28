var _ = require('underscore');
var Datastore = require('../lib/datastore').Datastore;

describe('The datastore', function () {
    var datastore;
    var mockNodeMap;

    beforeEach(function () {
	mockNodeMap = jasmine.createSpyObj('nodeMap', ['getNodeForKey']);
	datastore = new Datastore(mockNodeMap);
    });

    describe('when given a key', function () {
	describe('that does not have a node mapping', function () {
	    var key;

	    beforeEach(function () {
		key = 'key';
	    });
	    
	    it('should not create a new value for the key', function () {
		expect(function () {
		    datastore.createValueForKey(key);
		}).toThrow();
	    });

	    it('should not provide the value for the key', function () {
		expect(function () {
		    datastore.getValueForKey(key);
		}).toThrow();
	    });
	});
	
	describe('and it does not contain any values', function () {
	    var key;
	    var node;
	    
	    beforeEach(function () {
		key = 'key';
		node = 'node';
		mockNodeMap.getNodeForKey.andReturn(node);
	    });
	    
	    it('should provide undefined', function () {
		expect(datastore.getValueForKey(key)).toBeUndefined();
	    });
	});

	describe('and it does contain values', function () {
	    var key;
	    var node;
	    
	    beforeEach(function () {
		key = 'key';
		node = 'node';
		mockNodeMap.getNodeForKey.andReturn(node);
		datastore.createValueForKey(key);
	    });

	    it('should not create a new value for a key that already exists', function () {
		expect(function () {
		    datastore.createValueForKey(key);
		}).toThrow();
	    });
	    
	    it('should provide the value for a key', function () {
		var dsValue = datastore.getValueForKey(key);
		dsValue = _.omit(dsValue, 'write');
		dsValue.context = _.pick(dsValue.context, 'version');
		expect(dsValue).toEqual({
		    value: undefined,
		    context: {
			version: 0
		    }
		});
	    });
	});
    });
});
