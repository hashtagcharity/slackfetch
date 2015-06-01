var stream = require('stream');
var Readble = stream.Readble;
var Transform = stream.Transform;

var USER_PATTERN = /<@[a-z0-9]+\|?[a-z0-9]*>/gi;

var _transform = function(chunk, encoding, done) {
    var that = this;
    var data = chunk.toString();

    var replaced = data.replace(USER_PATTERN, function(match) {
        var userId = match.slice(2, match.indexOf('|'));
        var user = that.usersMap[userId];

        if (user) {
            return '@' + user.userName;
        } else {
            return '@unknown';
        }
    });

    this.push(replaced);

    done();
};

var _flush = function(done) {
    if (this._lastLineData) this.push(this._lastLineData);
    this._lastLineData = null;
    done();
};

module.exports = function(usersMap) {
    var userTransformer = new Transform({
        objectMode: true
    });

    userTransformer.usersMap = usersMap;
    userTransformer._transform = _transform.bind(userTransformer);
    userTransformer._flush = _flush.bind(userTransformer);

    return userTransformer;
};
