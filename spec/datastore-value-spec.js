var DatastoreValue = require('../lib/datastore-value').DatastoreValue;

describe('A datastore value', function () {
    var dsValue;
    var mockValue;
    var mockContext;
    var mockOtherValue;
    var mockOtherContext;

    beforeEach(function () {
	mockValue = 'value';
	mockContext = jasmine.createSpyObj('context', ['isMoreRecent', 'merge']);
	dsValue = new DatastoreValue(mockValue, mockContext);

	mockOtherValue = 'otherValue';
	mockOtherContext = 'otherContext';
    });
    
    describe('when written to', function () {
	describe('and is more recent than the provided value', function () {
	    var dsValueWritten;
	    
	    beforeEach(function () {
		mockContext.isMoreRecent.andReturn(true);
		dsValueWritten = dsValue.write(
		    mockOtherValue,
		    mockOtherContext);
	    });
	    
	    it('should reject the write', function () {
		expect(dsValueWritten).toEqual(false);
	    });

	    it('should not update the value', function () {
		expect(dsValue.value).toEqual(mockValue);
	    });
	});

	describe('and is as recent as the provided value', function () {
	    var dsValueWritten;
	    
	    beforeEach(function () {
		mockContext.isMoreRecent.andReturn(false);
		dsValueWritten = dsValue.write(
		    mockOtherValue,
		    mockOtherContext);
	    });
	    
	    it('should accept the write', function () {
		expect(dsValueWritten).toEqual(true);
	    });

	    it('should update the value', function () {
		expect(dsValue.value).toEqual(mockOtherValue);
	    });

	    it('should merge the contexts', function () {
		expect(mockContext.merge).toHaveBeenCalledWith(mockOtherContext);
	    });
	});
    });
});
