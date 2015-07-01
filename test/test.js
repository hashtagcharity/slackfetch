var should = require('should');
var metaReplacer = require('../lib/meta-replacer');

describe('meta-replacer', function() {

    var ids = {};

    var pic = 'http://media.hashtagcharity.org/common/placeholder.png';

    beforeEach(function() {
        ids.U1 = newUser('testuser', 'User', 'Test', pic);
        ids.U2 = newUser('teztuzer', 'Uzer', '', pic);
        ids.C1 = newChannel('test');
        ids.C2 = newChannel('tezt');
    });

    it('should replace userid to full name of the user if both first and last name exists', function() {
        var replaced = metaReplacer(ids, '<@U1|testuser>');
        replaced.should.be.exactly('@User Test');
    });

    it('should replace userid to username if either first or last name does not exists', function() {
        var replaced = metaReplacer(ids, '<@U2|teztuzer>');
        replaced.should.be.exactly('@teztuzer');
    });

    it('should replace channel', function() {
        var replaced = metaReplacer(ids, '<#C1>');
        replaced.should.be.exactly('#test');
    });

    it('should replace anchor', function() {
        var replaced = metaReplacer(ids, '<http://hashtagcharity.org|hashtagcharity>');
        replaced.should.be.exactly('<a href="http://hashtagcharity.org" target="_blank">hashtagcharity</a>');
    });

    it('should replace only user, channel and anchor metas', function() {
        var replaced = metaReplacer(ids, '<#C1> and <@U1|testuser> and an <http://hashtagcharity.org|hashtagcharity>');
        replaced.should.be.exactly('#test and @User Test and an <a href="http://hashtagcharity.org" target="_blank">hashtagcharity</a>');
    });

    function newUser(userName, firstName, lastName, image) {
        return JSON.stringify({
            name: userName,
            profile: {
                first_name: firstName,
                last_name: lastName,
                pictureUrl: image
            }
        });
    }

    function newChannel(name) {
        return JSON.stringify({
            name: name
        });
    }
});
