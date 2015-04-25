var _ = require('underscore');
var Promise = require('bluebird');

function DynamyteClient (serverUrl, httpClient) {
    var headers = {
	'Content-Type': 'application/json'
    };

    function post (api, reqObj) {
	return new Promise(function (resolve, reject) {
	    var url = serverUrl + api;
	    var reqStr = _.isEmpty(reqObj) ? '' : JSON.stringify(reqObj);
	    
	    httpClient.post(url, headers, reqStr).spread(function (res, resStr) {
		var resObj = undefined;

		if (!_.isUndefined(resStr) && !_.isEmpty(resStr)) {
		    try {
			resObj = JSON.parse(resStr);
		    } catch (error) {
			resObj = resStr;
		    }
		}
		
		resolve(resObj);
	    }).catch(function (error) {
		reject(error);
	    });
	});
    }
    
    return {
	/**
	 * Gets a value from the datastore.
	 *
	 * @param key {String} A key.
	 * @param quorum {Boolean} Whether or not a quorum read should be performed.
	 * @return {Promise} A promise to a datastore value.
	 */
	get: function (key, quorum) {
	    return post('/api/get', {
		key: key,
		quorum: quorum
	    });
	},

	/**
	 * Puts a key value pair into the datastore.
	 *
	 * @param key {String} A key.
	 * @param value {Object} A value.
	 * @param quorum {Boolean} Whether or not a quorum read should be performed.
	 * @param context {Object} The context object used to version values.
	 * @return {Promise} A promise to the updated context.
	 */
	put: function (key, value, quorum, context) {
	    return post('/api/put', {
		key: key,
		value: value,
		quorum: quorum,
		context: context
	    });
	}
    };
}

module.exports.DynamyteClient = DynamyteClient;
