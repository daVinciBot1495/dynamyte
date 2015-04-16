var crypto = require('crypto');

function Hasher () {
    return {
	hash: function (str) {
	    var md5 = crypto.createHash('md5');
	    md5.update(str);
	    return md5.digest('hex');
	}
    };
}

module.exports.Hasher = Hasher;
