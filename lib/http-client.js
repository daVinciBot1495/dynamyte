var Promise = require('bluebird');
var postAsync = Promise.promisify(require('request').post);

function HttpClient () {
    return {
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
