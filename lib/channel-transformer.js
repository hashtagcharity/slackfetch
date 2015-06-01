var stream = require('stream');
var Readble = stream.Readble;
var Transform = stream.Transform;

var CHANNEL_PATTERN = /<#[a-z0-9]+>/gi;

var _transform = function(chunk, encoding, done) {
    var that = this;
    var data = chunk.toString();

    var replaced = data.replace(CHANNEL_PATTERN, function(match) {
        var channelId = match.slice(2, match.indexOf('>'));
        var channel = that.channelsMap[channelId];

        if (channel) {
            return '#' + channel.name;
        } else {
            return '#unknown';
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

module.exports = function(channelsMap) {
    var transformer = new Transform({
        objectMode: true
    });

    transformer.channelsMap = channelsMap;
    transformer._transform = _transform.bind(transformer);
    transformer._flush = _flush.bind(transformer);

    return transformer;
};
