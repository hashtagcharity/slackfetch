var _ = require('lodash');
var async = require('async');
var evcheck = require('evcheck');
var morgan = require('morgan');
var express = require('express');
var winston = require('winston');
var Slack = require('slack-node');
var metaReplacer = require('./lib/meta-replacer');

var redis = require('redis');
var mongoose = require('mongoose');

var logger = new(winston.Logger)({
    transports: [
        new(winston.transports.Console)({
            timestamp: true
        })
    ]
});

evcheck.checkVars(['PORT'], function(err) {
    if (err) {
        logger.error(err.message);
        process.exit(9);
    }
});

var config = {
    port: process.env.PORT,
    fetchInterval: process.env.INTERVAL || 30000,
    mongo: {
        host: process.env.MONGO_HOST || '192.168.59.103',
        port: process.env.MONGO_PORT || 27017,
        name: process.env.MONGO_NAME || 'platform'
    },
    redis: {
        host: process.env.REDIS_HOST || '192.168.59.103',
        port: process.env.REDIS_PORT || 6379
    }
};


var redisClient = redis.createClient(config.redis.port, config.redis.host, {});
var mongooseClient = mongoose.connect('mongodb://' + config.mongo.host + ':' + config.mongo.port + '/' + config.mongo.name);

mongooseClient.connection.on('error', function(error) {
    logger.error(error);
});

logger.info('Mongo services at ' + config.mongo.host + ':' + config.mongo.port + '/' + config.mongo.name);

global.config = config;
global.mongoose = mongooseClient;
global.redis = redisClient;
global.logger = logger;

var SlackTeam = require('./lib/SlackTeam');

var REDIS_SLACK_PREFIX = "slackteam:";
var SLACK_API = {
    USERS_LIST: 'users.list',
    CHANNELS_LIST: 'channels.list',
    CHANNELS_HISTORY: 'channels.history'
};

function fetchSlackInfo() {

    process.nextTick(function() {

        var findAllSlackTeamsResult = function findAllSlackTeamsResult(err, teams) {
            if (err) {
                logger.error(err);
                return;
            }

            logger.info('Found %d teams', teams.length);

            var createTeamSlack = function createTeamSlack(team, slackApi, dataProperty, callback) {
                if (!team.token) {
                    var errMsg = 'Cannot fetch ' + slackApi + ' of ' + team.name + '(noslacktoken)';
                    logger.error(errMsg);
                    return callback(errMsg);
                }

                logger.debug('(%s) API client created for %s', slackApi, team.name);
                callback(null, team, slackApi, dataProperty, new Slack(team.token));
            };

            var fetchSlackApi = function fetchSlackApi(team, slackApi, dataProperty, slackClient, callback) {
                slackClient.api(slackApi, {}, function(err, data) {
                    var error = (err || !data.ok) ? err || data : '';
                    if (error) {
                        logger.error(error);
                        return callback(error);
                    }

                    logger.info('Fetched %d %s', data[dataProperty].length, slackApi);
                    callback(null, team, dataProperty, data);
                });
            };

            var storeInRedis = function storeInRedis(team, dataProperty, data, callback) {
                data[dataProperty].forEach(function(entity) {
                    redisClient.hset(REDIS_SLACK_PREFIX + team.name, entity.id, JSON.stringify(entity));
                });
            };

            var fetchAndStore = async.seq(createTeamSlack, fetchSlackApi, storeInRedis);

            var scheduleFetch = function scheduleFetch(slackApi, dataProperty) {
                return function(team) {
                    setTimeout(function() {
                        fetchAndStore(team, slackApi, dataProperty);
                    }, 1000);
                };
            };

            teams.forEach(scheduleFetch(SLACK_API.USERS_LIST, 'members'));
            teams.forEach(scheduleFetch(SLACK_API.CHANNELS_LIST, 'channels'));
        };

        SlackTeam.find({}, findAllSlackTeamsResult);
    });

    setTimeout(fetchSlackInfo, config.fetchInterval);
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

app.get('/api/:team/:channelId/messages',
    function(req, res, next) {
        var team = req.params.team;
        var channelId = req.params.channelId;

        function convertFromUser(ids, userId) {
            var memberString = ids[userId];

            if (memberString) {
                var member = JSON.parse(memberString);
                return {
                    username: member.name,
                    firstName: member.profile.first_name,
                    lastName: member.profile.last_name,
                    pictureUrl: member.profile.image_72
                };
            } else {
                return null;
            }
        }

        logger.info('Fetch channel(%s) from %s', channelId, team);

        SlackTeam.findOne({
            name: team
        }, function(err, slackTeam) {
            if (err) {
                logger.error(err);
                return res.status(500).json(err);
            }

            if (!slackTeam) {
                return res.status(404).json({
                    message: 'No Slack team domain found with this ID'
                });
            }
            var slackClient = new Slack(slackTeam.token);
            slackClient.api(SLACK_API.CHANNELS_HISTORY, {
                channel: channelId
            }, function(err, data) {
                if (err || !data.ok) {
                    logger.info(err || data);
                    res.status(500).json(err || data);
                    return;
                }

                redisClient.hgetall(REDIS_SLACK_PREFIX + team, function(err, ids) {
                    var teamInfo = ids[channelId];
                    logger.info('Channel resolved to %s', JSON.parse(teamInfo).name);

                    logger.info(data.messages)
                    var transformedMessages = _.reduce(data.messages, function(messages, message) {
                        var date = parseFloat(message.ts.split('.').shift()) * 1000;

                        if (message.type === 'message') {
                            var replacedMessage = metaReplacer(ids, message.text);
                            messages.push({
                                user: convertFromUser(ids, message.user),
                                text: replacedMessage,
                                date: new Date(date)
                            });
                        }

                        return messages;
                    }, []);

                    res.set('Content-type', 'application/json');
                    res.json(transformedMessages);
                });
            });
        });

    });

app.get('/healthcheck',
    function(req, res) {
        res.send('yo');
    });
