var _ = require('lodash');
var evcheck = require('evcheck');
var morgan = require('morgan');
var express = require('express');
var winston = require('winston');
var Slack = require('slack-node');
var metaReplacer = require('./lib/meta-replacer');

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
    fetchInterval: process.env.INTERVAL
};

evcheck.checkVars(['PORT', 'INTERVAL', 'SLACK_TOKEN'], function(err) {
    if (err) {
        console.log(err.message);
        process.exit(9);
    }
});

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
                var replacedMessage = metaReplacer(usersMap, channelsMap, message);

                messages.push({
                    user: usersMap[message.user],
                    text: replacedMessage,
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
