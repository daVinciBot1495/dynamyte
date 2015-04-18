var Promise = require('bluebird');
var DynamyteClient = require('../lib/dynamyte-client').DynamyteClient;

describe('The Dynamyte client', function () {
    var headers;
    var serverUrl;
    var mockHttpClient;
    var dynamyteClient;

    beforeEach(function () {
	headers = {
	    'Content-Type': 'application/json'
	};
	serverUrl = 'serverUrl';
	mockHttpClient = jasmine.createSpyObj('httpClient', ['post']);
	dynamyteClient = new DynamyteClient(serverUrl, mockHttpClient);
    });

    describe('when making a get request', function () {
	var key;
	var quorum;

	beforeEach(function () {
	    key = 'key';
	    quorum = false;
	    mockHttpClient.post.andReturn(Promise.resolve([]));
	    dynamyteClient.get(key, quorum);
	});
	
	it('should properly construct the request', function () {
	    expect(mockHttpClient.post).toHaveBeenCalledWith(
		serverUrl + '/api/get',
		headers,
		JSON.stringify({
		    key: key,
		    quorum: quorum
		})
	    );
	});

	describe('and there is an error', function () {
	    var error;
	    
	    beforeEach(function () {
		error = {
		    message: "I've made a huge mistake"
		};
		mockHttpClient.post.andReturn(Promise.reject(error));
	    });

	    it('should return the error', function (done) {
		dynamyteClient.get(key, quorum).then(function (resObj) {
		    expect('Promise').toBe('rejected');
		    done();
		}).catch(function (err) {
		    expect(error).toEqual(err);
		    done();
		});
	    });
	});
    });
    
    describe('when making a get request', function () {
	var key;
	var value;
	var quorum;

	beforeEach(function () {
	    key = 'key';
	    quorum = false;
	});

	describe('and the response body is undefined', function () {
	    beforeEach(function () {
		value = undefined;
		mockHttpClient.post.andReturn(Promise.resolve([{}, value]));
	    });

	    it('should return undefined', function (done) {
		dynamyteClient.get(key, quorum).then(function (resObj) {
		    expect(resObj).toBeUndefined();
		    done();
		}).catch(function () {
		    expect('Promise').toBe('resolved');
		    done();
		});
	    });
	});

	describe('and the response body is a string', function () {
	    beforeEach(function () {
		value = 'value';
		mockHttpClient.post.andReturn(Promise.resolve([{}, value]));
	    });

	    it('should return the string', function (done) {
		dynamyteClient.get(key, quorum).then(function (resObj) {
		    expect(resObj).toEqual(value);
		    done();
		}).catch(function () {
		    expect('Promise').toBe('resolved');
		    done();
		});
	    });
	});

	describe('and the response body is an object', function () {
	    var obj;
	    
	    beforeEach(function () {
		obj = {
		    p1: 'hello',
		    p2: 'world',
		    v: 2,
		    o: {
			a: [1, 2, 3]
		    }
		};
		value = JSON.stringify(obj);
		mockHttpClient.post.andReturn(Promise.resolve([{}, value]));
	    });

	    it('should return the object', function (done) {
		dynamyteClient.get(key, quorum).then(function (resObj) {
		    expect(resObj).toEqual(obj);
		    done();
		}).catch(function () {
		    expect('Promise').toBe('resolved');
		    done();
		});
	    });
	});
    });

    describe('when making a put request', function () {
	var key;
	var value;
	var quorum;

	beforeEach(function () {
	    key = 'key';
	    quorum = true;
	    value = {
		p1: 'hello',
		p2: 'world',
		v: 2,
		o: {
		    a: [1, 2, 3]
		}
	    };
	    mockHttpClient.post.andReturn(Promise.resolve([]));
	    dynamyteClient.put(key, value, quorum);
	});
	
	it('should properly construct the request', function () {
	    expect(mockHttpClient.post).toHaveBeenCalledWith(
		serverUrl + '/api/put',
		headers,
		JSON.stringify({
		    key: key,
		    value: value,
		    quorum: quorum
		})
	    );
	});

	describe('and there is an error', function () {
	    var error;
	    
	    beforeEach(function () {
		error = {
		    message: "I've made a huge mistake"
		};
		mockHttpClient.post.andReturn(Promise.reject(error));
	    });

	    it('should return the error', function (done) {
		dynamyteClient.put(key, value, quorum).then(function (resObj) {
		    expect('Promise').toBe('rejected');
		    done();
		}).catch(function (err) {
		    expect(error).toEqual(err);
		    done();
		});
	    });
	});
    });    
});
