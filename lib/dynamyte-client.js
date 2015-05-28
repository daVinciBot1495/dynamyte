var _ = require('underscore');
var Promise = require('bluebird');

function DynamyteClient (serverUrl, httpClient) {
    var headers = {
	'Content-Type': 'application/json'
    };

    function getUrlForKey (quorum, key) {
	return serverUrl + (quorum ? '/val/' : '/no-quorum/val/') + key;
    }

    function reqObj2ReqStr (reqObj) {
	return _.isUndefined(reqObj) || _.isEmpty(reqObj) ?
	    undefined : JSON.stringify(reqObj);
    }

    function resStr2ResObj (resStr) {
	var resObj = undefined;
		
	if (!_.isUndefined(resStr) && !_.isEmpty(resStr)) {
	    try {
		resObj = JSON.parse(resStr);
	    } catch (error) {
		resObj = resStr;
	    }
	}

	return resObj;
    }

    function makeRequest (method, url, reqObj) {
	return new Promise(function (resolve, reject) {
	    var reqStr = reqObj2ReqStr(reqObj);
	    method.call(httpClient, url, headers, reqStr).spread(function (res, resStr) {
		var resObj = resStr2ResObj(resStr);

		if (res.statusCode >= 400) {
		    reject({
			statusCode: res.statusCode,
			reason: resObj.reason
		    });
		} else {
		    resolve({
			statusCode: res.statusCode,
			value: resObj
		    });
		}
	    }).catch(function (error) {
		// This usually happens when a connection cannot be established
		reject({
		    statusCode: 503,
		    reason: 'Service unavailable'
		});
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
	    return makeRequest(httpClient.get, getUrlForKey(quorum, key));
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
	    return makeRequest(httpClient.put, getUrlForKey(quorum, key), {
		key: key,
		value: value,
		context: context
	    });
	}
    };
}

module.exports.DynamyteClient = DynamyteClient;
