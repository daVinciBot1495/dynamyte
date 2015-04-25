function DatastoreValue (value, context) {
    return {
	value: value,
	context: context,

	/**
	 * Overwrites this datastore value with the provided one based on the
	 * given context.
	 *
	 * @param otherValue {Object} An object.
	 * @param otherContext {Object} A context object.
	 */
	write: function (otherValue, otherContext) {
	    if (this.context.isMoreRecent(otherContext)) {
		return false;
	    } else {
		this.context.merge(otherContext);
		this.value = otherValue;
		return true;
	    }
	}
    };
}

module.exports.DatastoreValue = DatastoreValue;
