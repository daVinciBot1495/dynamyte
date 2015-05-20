var request = require('request');
var Promise = require('bluebird');
var getAsync = Promise.promisify(request);
var postAsync = Promise.promisify(request.post);

function HttpClient () {
    return {
	/**
	 * Performs an HTTP GET request.
	 *
	 * @param url {String}
	 * @param headers {Object}
	 * @param body {String}
	 * @return {Promise}
	 */
	get: function (url, headers) {
	    return getAsync({
	    	url: url,
	    	headers: headers
	    });
	},
	
	/**
	 * Performs an HTTP POST request.
	 *
	 * @param url {String}
	 * @param headers {Object}
	 * @param body {String}
	 * @return {Promise}
	 */
	post: function (url, headers, body) {
	    return postAsync({
		url: url,
		headers: headers,
		body: body
	    });
	}
    };
}

module.exports.HttpClient = HttpClient;
