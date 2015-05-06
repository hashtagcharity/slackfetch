var _ = require('lodash');
var Slack = require('slack-node');
var winston = require('winston');

module.exports = function(slackToken) {
    var slack = new Slack(slackToken);

    return {
        fetchUsers: function(cb) {
            slack.api('users.list', {}, function(err, data) {
                if (err || !data.ok) {
                    cb(err || data);
                    return;
                }

                logger.info('Fetched %d users', data.members.length);

                var users = _.reduce(data.members, function(users, member) {
                    users[member.id] = {
                        username: member.name,
                        firstName: member.profile.first_name,
                        lastName: member.profile.last_name,
                        pictureUrl: member.profile.image_72
                    };

                    return users;
                }, {});

                cb(null, users);
            });
        },
        fetchChannels: function(cb) {
            slack.api('channels.list', {}, function(err, data) {
                if (err || !data.ok) {
                    cb(err || data);
                    return;
                }

                logger.info('Fetched %d channels', data.channels.length);

                var channels = _.reduce(data.channels, function(channels, channel) {
                    channels[channel.id] = {
                        name: channel.name
                    };

                    return channels;
                }, {});

                cb(null, channels);
            });
        },
        fetchChannelMessages: function(channelId, cb) {
            slack.api('channels.history', {
                channel: channelId
            }, function(err, data) {
                if (err || !data.ok) {
                    cb(err || data);
                    return;
                }

                cb(null, data.messages);
            });
        }

    };
};
