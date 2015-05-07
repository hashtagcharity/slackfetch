var _ = require('lodash');
var morgan = require('morgan');
var express = require('express');
var winston = require('winston');
var Slack = require('slack-node');

var logger = new(winston.Logger)({
    transports: [
        new(winston.transports.Console)({
            timestamp: true
        })
    ]
});

var config = {
    port: process.env.PORT,
    slackToken: process.env.SLACK_TOKEN,
    fetchInterval: process.env.INTERVAL || 60000
};

if (!config.slackToken) {
    logger.info('Please set the SLACK_TOKEN environment variable');
    process.exit(0);
}

var slack = new Slack(config.slackToken);

var usersMap = [];
var channelsMap = [];

function fetchSlackInfo() {
    process.nextTick(function() {
        slack.api('users.list', {}, function(err, data) {
            if (err || !data.ok) {
                logger.error(err || data);
                return;
            }

            logger.info('Fetched %d users', data.members.length);

            data.members.forEach(function(member) {
                usersMap[member.id] = {
                    username: member.name,
                    firstName: member.profile.first_name,
                    lastName: member.profile.last_name,
                    pictureUrl: member.profile.image_72
                };
            });
        });
        slack.api('channels.list', {}, function(err, data) {
            if (err || !data.ok) {
                logger.error(err || data);
                return;
            }

            logger.info('Fetched %d channels', data.channels.length);

            data.channels.forEach(function(channel) {
                channelsMap[channel.id] = {
                    name: channel.name
                };
            });
        });


        setTimeout(fetchSlackInfo, config.fetchInterval);
    });
}

fetchSlackInfo();

var app = express();
app.listen(config.port, function() {
    logger.info("App listening on port %d", this.address().port);
});
app.use(morgan('common'));
app.use(function setNoCacheHeaders(req, res, next) {
    res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': 0
    });

    next();
});

app.get('/api/v1/messages/:channelId',
    function(req, res, next) {
        slack.api('channels.history', {
            channel: req.params.channelId
        }, function(err, data) {
            if (err || !data.ok) {
                logger.info(err || data);
                res.status(500).json(err || data);
                return;
            }

            var transformedMessages = _.reduce(data.messages, function(messages, message) {
                var date = parseFloat(message.ts.split('.').shift()) * 1000;
                messages.push({
                    user: usersMap[message.user],
                    text: replaceSlackMetas(usersMap, channelsMap, message.text),
                    date: new Date(date)
                });

                return messages;
            }, []);

            res.set('Content-type', 'application/json');
            res.json(transformedMessages);
        });
    });

app.get('/healthcheck',
    function(req, res) {
        res.send('yo');
    });

var userPattern = /<@[a-z0-9]+\|?[a-z0-9]*>/gi;
var channelPattern = /<#[a-z0-9]+>/gi;


function replaceSlackMetas(users, channels, message) {
    var replacedWithUser = message.replace(userPattern, function(match) {
        var userId = match.slice(2, match.indexOf('|'));
        var user = users[userId];

        if (user) {
            return (user.firstName || user.lastName) ? user.firstName + ' ' + user.lastName : user.username;
        } else {
            return 'Unknown';
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
