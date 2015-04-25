var DatastoreContext = require('../lib/datastore-context').DatastoreContext;

describe('The datastore context', function () {
    describe('when created without another context', function () {
	it('should set the version to zero', function () {
	    var context = new DatastoreContext();
	    expect(context.version).toEqual(0);
	});
    });

    describe('when created with a context that has a version', function () {
	it('should use the version', function () {
	    var version = 1234;
	    var context = new DatastoreContext({
		version: version
	    });
	    expect(context.version).toEqual(version);
	});
    });

    describe('when compared to another context', function () {
	var v1;
	var v2;
	var c1;
	var c2;

	beforeEach(function () {
	    v1 = 1;
	    c1 = new DatastoreContext({
		version: v1
	    });
	    v2 = 2;
	    c2 = new DatastoreContext({
		version: v2
	    });
	});

	describe('and it is less recent', function () {
	    it('should say it is less recent', function () {
		expect(c1.isMoreRecent(c2)).toEqual(false);
	    });
	});

	describe('and it is more recent', function () {
	    it('should say it is more recent', function () {
		expect(c2.isMoreRecent(c1)).toEqual(true);
	    });
	});
    });

    describe('when merged with another context', function () {
	var v1;
	var v2;
	var c1;
	var c2;

	beforeEach(function () {
	    v1 = 1;
	    c1 = new DatastoreContext({
		version: v1
	    });
	    v2 = 2;
	    c2 = new DatastoreContext({
		version: v2
	    });
	});
	
	it('should set the version to the max version + 1', function () {
	    c1.merge(c2);
	    expect(c1.version).toEqual(v2 + 1);
	});

	it('it is commutative', function () {
	    c2.merge(c1);
	    expect(c2.version).toEqual(v2 + 1);
	});
    });
});
