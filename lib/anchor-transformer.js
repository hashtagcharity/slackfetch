var util = require('util');
var stream = require('stream');
var Readble = stream.Readble;
var Transform = stream.Transform;

var HREF_PATTERN = /<https?[^>]*>/gi;

var _transform = function(chunk, encoding, done) {
    var data = chunk.toString();

    var replaced = data.replace(HREF_PATTERN, function(match) {
        var ref = match.slice(1, match.indexOf('>'));
        var href = ref.slice(0, ref.indexOf('|'));
        var label = ref.slice(ref.indexOf('|') + 1, ref.lenth) || href;

        return util.format('<a href="%s" target="_blank">%s</a>', href, label);
    });

    this.push(replaced);

    done();
};

var _flush = function(done) {
    if (this._lastLineData) this.push(this._lastLineData);
    this._lastLineData = null;
    done();
};

module.exports = function() {
    var transformer = new Transform({
        objectMode: true
    });

    transformer._transform = _transform.bind(transformer);
    transformer._flush = _flush.bind(transformer);

    return transformer;
};
