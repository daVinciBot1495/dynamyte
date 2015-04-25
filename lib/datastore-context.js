var _ = require('underscore');

function DatastoreContext (other) {
    return {
	version: !_.isUndefined(other) ? other.version : 0,

	/**
	 * @return {Boolean} Whether or not this context is more recent than
	 * another context.
	 */
	isMoreRecent: function (other) {
	    return this.version > other.version;
	},

	/**
	 * Merges this context with another context.
	 *
	 * @param {Object} Another context.
	 */
	merge: function (other) {
	    this.version = Math.max(this.version, other.version) + 1;
	}
    };
}

module.exports.DatastoreContext = DatastoreContext;
