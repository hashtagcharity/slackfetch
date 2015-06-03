var should = require('should');
var metaReplacer = require('../lib/meta-replacer');

describe('meta-replacer', function() {

    var users = {},
        channels = {};

    var pic = 'http://media.hashtagcharity.org/common/placeholder.png';

    beforeEach(function() {
        users.U1 = newUser('testuser', 'User', 'Test', pic);
        users.U2 = newUser('teztuzer', 'Uzer', '', pic);
        channels.C1 = newChannel('test');
        channels.C2 = newChannel('tezt');
    });

    it('should replace userid to full name of the user if both first and last name exists', function() {
        var replaced = metaReplacer(users, channels, '<@U1|testuser>');
        replaced.should.be.exactly('@User Test');
    });

    it('should replace userid to username if either first or last name does not exists', function() {
        var replaced = metaReplacer(users, channels, '<@U2|teztuzer>');
        replaced.should.be.exactly('@teztuzer');
    });

    it('should replace channel', function() {
        var replaced = metaReplacer(users, channels, '<#C1>');
        replaced.should.be.exactly('#test');
    });

    it('should replace anchor', function() {
        var replaced = metaReplacer(users, channels, '<http://hashtagcharity.org|hashtagcharity>');
        replaced.should.be.exactly('<a href="http://hashtagcharity.org" target="_blank">hashtagcharity</a>');
    });

    it('should replace only user, channel and anchor metas', function() {
        var replaced = metaReplacer(users, channels, '<#C1> and <@U1|testuser> and an <http://hashtagcharity.org|hashtagcharity>');
        replaced.should.be.exactly('#test and @User Test and an <a href="http://hashtagcharity.org" target="_blank">hashtagcharity</a>');
    });

    function newUser(userName, firstName, lastName, image) {
        return {
            username: userName,
            firstName: firstName,
            lastName: lastName,
            pictureUrl: image
        };
    }

    function newChannel(name) {
        return {
            name: name
        };
    }
});
