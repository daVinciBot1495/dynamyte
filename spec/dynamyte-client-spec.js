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
	mockHttpClient = jasmine.createSpyObj('httpClient', ['get', 'put']);
	dynamyteClient = new DynamyteClient(serverUrl, mockHttpClient);
    });

    describe('when making a get request', function () {
	var key;
	var quorum;

	beforeEach(function () {
	    key = 'key';
	    quorum = true;
	    mockHttpClient.get.andReturn(Promise.resolve([]));
	});

	describe('and a quorum is needed', function () {
	    beforeEach(function () {
		quorum = true;
		dynamyteClient.get(key, quorum);
	    });

	    it('should properly construct the request', function () {
		expect(mockHttpClient.get).toHaveBeenCalledWith(
		    serverUrl + '/val/' + key,
		    headers
		);
	    });
	});

	describe('and a quorum is not needed', function () {
	    beforeEach(function () {
		quorum = false;
		dynamyteClient.get(key, quorum);
	    });

	    it('should properly construct the request', function () {
		expect(mockHttpClient.get).toHaveBeenCalledWith(
		    serverUrl + '/no-quorum/val/' + key,
		    headers
		);
	    });
	});

	describe('and the service is unavailable', function () {
	    beforeEach(function () {
		mockHttpClient.get.andReturn(Promise.reject());
	    });

	    it('should reject the promise', function (done) {
		dynamyteClient.get(key, quorum).then(function (resObj) {
		    expect('Promise').toBe('rejected');
		    done();
		}).catch(function (rejected) {
		    expect(rejected).toEqual({
			statusCode: 503,
			reason: any(String)
		    });
		    done();
		});
	    });
	});

	describe('and the response code is 400', function () {
	    var resObj;
	    var reason;
	    var statusCode;
	    
	    beforeEach(function () {
		statusCode = 400;
		reason = "I've made a huge mistake";
		resObj = {
		    reason: reason		    
		};
		mockHttpClient.get.andReturn(Promise.resolve([{
		    statusCode: statusCode
		}, JSON.stringify(resObj)]));
	    });

	    it('should reject the promise', function (done) {
		dynamyteClient.get(key, quorum).then(function (resObj) {
		    expect('Promise').toBe('rejected');
		    done();
		}).catch(function (rejected) {
		    expect(rejected).toEqual({
			statusCode: statusCode,
			reason: reason
		    });
		    done();
		});
	    });
	});

	describe('and the response code is greater than 400', function () {
	    var resObj;
	    var reason;
	    var statusCode;
	    
	    beforeEach(function () {
		statusCode = 404;
		reason = "I've made a huge mistake";
		resObj = {
		    reason: reason		    
		};
		mockHttpClient.get.andReturn(Promise.resolve([{
		    statusCode: statusCode
		}, JSON.stringify(resObj)]));
	    });

	    it('should reject the promise', function (done) {
		dynamyteClient.get(key, quorum).then(function (resObj) {
		    expect('Promise').toBe('rejected');
		    done();
		}).catch(function (rejected) {
		    expect(rejected).toEqual({
			statusCode: statusCode,
			reason: reason
		    });
		    done();
		});
	    });
	});
    });
    
    describe('when making a get request', function () {
	var key;
	var value;
	var quorum;
	var statusCode;

	beforeEach(function () {
	    key = 'key';
	    quorum = false;
	    statusCode = 200;
	});

	describe('and the response body is undefined', function () {
	    beforeEach(function () {
		value = undefined;
		mockHttpClient.get.andReturn(Promise.resolve([{
		    statusCode: statusCode
		}, value]));
	    });

	    it('should return undefined', function (done) {
		dynamyteClient.get(key, quorum).then(function (res) {
		    expect(res).toEqual({
			statusCode: statusCode
		    });
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
		mockHttpClient.get.andReturn(Promise.resolve([{
		    statusCode: statusCode
		}, value]));
	    });

	    it('should return the string', function (done) {
		dynamyteClient.get(key, quorum).then(function (res) {
		    expect(res).toEqual({
			statusCode: statusCode,
			value: value
		    });
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
		mockHttpClient.get.andReturn(Promise.resolve([{
		    statusCode: statusCode
		}, value]));
	    });

	    it('should return the object', function (done) {
		dynamyteClient.get(key, quorum).then(function (res) {
		    expect(res).toEqual({
			statusCode: statusCode,
			value: obj
		    });
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
	var context;

	beforeEach(function () {
	    key = 'key';
	    value = {
		p1: 'hello',
		p2: 'world',
		v: 2,
		o: {
		    a: [1, 2, 3]
		}
	    };
	    quorum = true;
	    context = {
		version: 2
	    };
	});

	describe('and a quorum is needed', function () {
	    beforeEach(function () {
		dynamyteClient.put(key, value, quorum, context);
	    });

	    it('should properly construct the request', function () {
		expect(mockHttpClient.put).toHaveBeenCalledWith(
		    serverUrl + '/val/' + key,
		    headers,
		    JSON.stringify({
			key: key,
			value: value,
			context: context
		    })
		);
	    });
	});

	describe('and a quorum is not needed', function () {
	    beforeEach(function () {
		quorum = false;
		dynamyteClient.put(key, value, quorum, context);
	    });

	    it('should properly construct the request', function () {
		expect(mockHttpClient.put).toHaveBeenCalledWith(
		    serverUrl + '/no-quorum/val/' + key,
		    headers,
		    JSON.stringify({
			key: key,
			value: value,
			context: context
		    })
		);
	    });
	});

	describe('and the service is unavailable', function () {
	    beforeEach(function () {
		mockHttpClient.put.andReturn(Promise.reject());
	    });

	    it('should reject the promise', function (done) {
		dynamyteClient.put(key, value, quorum, context).then(function (resObj) {
		    expect('Promise').toBe('rejected');
		    done();
		}).catch(function (rejected) {
		    expect(rejected).toEqual({
			statusCode: 503,
			reason: any(String)
		    });
		    done();
		});
	    });
	});

	describe('and the response code is 400', function () {
	    var resObj;
	    var reason;
	    var statusCode;
	    
	    beforeEach(function () {
		statusCode = 400;
		reason = "I've made a huge mistake";
		resObj = {
		    reason: reason		    
		};
		mockHttpClient.put.andReturn(Promise.resolve([{
		    statusCode: statusCode
		}, JSON.stringify(resObj)]));
	    });

	    it('should reject the promise', function (done) {
		dynamyteClient.put(key, value, quorum, context).then(function (resObj) {
		    expect('Promise').toBe('rejected');
		    done();
		}).catch(function (rejected) {
		    expect(rejected).toEqual({
			statusCode: statusCode,
			reason: reason
		    });
		    done();
		});
	    });
	});

	describe('and the response code is greater than 400', function () {
	    var resObj;
	    var reason;
	    var statusCode;
	    
	    beforeEach(function () {
		statusCode = 404;
		reason = "I've made a huge mistake";
		resObj = {
		    reason: reason		    
		};
		mockHttpClient.put.andReturn(Promise.resolve([{
		    statusCode: statusCode
		}, JSON.stringify(resObj)]));
	    });

	    it('should reject the promise', function (done) {
		dynamyteClient.put(key, value, quorum, context).then(function (resObj) {
		    expect('Promise').toBe('rejected');
		    done();
		}).catch(function (rejected) {
		    expect(rejected).toEqual({
			statusCode: statusCode,
			reason: reason
		    });
		    done();
		});
	    });
	});

	describe('and the response code is 200', function () {
	    var reason;
	    var statusCode;
	    
	    beforeEach(function () {
		statusCode = 200;
		mockHttpClient.put.andReturn(Promise.resolve([{
		    statusCode: statusCode
		}, JSON.stringify(context)]));
	    });

	    it('should return the updated context', function (done) {
		dynamyteClient.put(key, value, quorum, context).then(function (resObj) {
		    expect(resObj).toEqual({
			statusCode: statusCode,
			value: context
		    });
		    done();
		}).catch(function (rejected) {
		    expect('Promise').toBe('resolved');
		    done();
		});
	    });
	});
    });
});
