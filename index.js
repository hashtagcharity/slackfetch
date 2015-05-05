var _ = require('lodash');
var express = require('express');

var config = {
    port: process.env.PORT || 3000,
    slackToken: process.env.SLACK_TOKEN,
    fetchInterval: process.env.INTERVAL || 30000
};

if (!config.slackToken) {
    console.log('Please set the SLACK_TOKEN environment variable');
    process.exit(0);
}

var slackService = require('./lib/slack-service')(config.slackToken);

var usersMap = {};
var channelsMap = {};

function fetchSlackInfo() {
    process.nextTick(function() {
        slackService.fetchUsers(function(err, users) {
            if (err) {
                console.log(err);
                return;
            }

            usersMap = users;
        });
        slackService.fetchChannels(function(err, channels) {
            if (err) {
                console.log(err);
                return;
            }

            channelsMap = channels;
        });

        setTimeout(fetchSlackInfo, config.fetchInterval);
    });
}

fetchSlackInfo();

var app = express();
app.listen(config.port);
app.get('/messages/:channelId', function(req, res, next) {
    slackService.fetchChannelMessages(req.params.channelId, function(err, messages) {
        if (err) {
            console.log(err || data);
            res.status(500).json(err || data);
            return;
        }

        var transformecMessages = _.reduce(messages, function(messages, message) {
            var date = parseFloat(message.ts.split('.').shift()) * 1000;
            messages.push({
                user: usersMap[message.user],
                text: replaceSlackMetas(usersMap, channelsMap, message.text),
                date: new Date(date)
            });

            return messages;
        }, []);

        res.json(transformecMessages);
    });
});

var userPattern = /<@[a-z0-9]+\|?[a-z0-9]*>/gi;
var channelPattern = /<#[a-z0-9]+>/gi;

function replaceSlackMetas(users, channels, message) {
    var replacedWithUser = message.replace(userPattern, function(match) {
        var userId = match.slice(2, match.indexOf('|'));
        var user = users[userId];

        if (user) {
            return '@' + (user.firstName || user.lastName) ? user.firstName + ' ' + user.lastName : user.username;
        } else {
            return 'Anonymus';
        }
    });

    var replacedWithChannel = replacedWithUser.replace(channelPattern, function(match) {
        var channelId = match.slice(2, match.indexOf('>'));
        var channel = channels[channelId];

        if (channel) {
            return '#' + channel.name;
        } else {
            return '#Unknown';
        }
    });

    return replacedWithChannel;
}
