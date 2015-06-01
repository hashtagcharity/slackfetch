var should = require('should');
var stream = require('stream');
var Readable = stream.Readable;
var Writable = stream.Writable;

var metaReplacer = require('../lib/meta-replacer');
var userTransformer = require('../lib/user-transformer');
var channelTransformer = require('../lib/channel-transformer');
var anchorTransformer = require('../lib/anchor-transformer');

describe('userTransformer', function() {

    var users = {},
        channels = {};

    var pic = 'http://media.hashtagcharity.org/common/placeholder.png';

    beforeEach(function() {
        users.U1 = newUser('testuser', 'User', 'Test', pic);
        users.U2 = newUser('teztuzer', 'Uzer', 'Tezt', pic);
        channels.C1 = newChannel('test');
        channels.C2 = newChannel('tezt');
    });

    it('should replace user', function() {
        var replaced = metaReplacer(users, channels, '<@U1|testuser>');
        replaced.should.be.exactly('@testuser');
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
        replaced.should.be.exactly('#test and @testuser and an <a href="http://hashtagcharity.org" target="_blank">hashtagcharity</a>');
    });

    function newUser(userName, firstName, lastName, image) {
        return {
            userName: userName,
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
