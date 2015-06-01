var util = require('util');

var SLACK_PATTERN = /<(.*?)>/gi;

module.exports = function replaceMessage(usersMap, channelsMap, message) {
    return message.replace(SLACK_PATTERN, function(match) {
        if (match.indexOf('#C') > -1) {
            var channelId = match.slice(2, match.indexOf('>'));
            var channel = channelsMap[channelId];

            if (channel) {
                return '#' + channel.name;
            } else {
                return '#unknown';
            }
        } else if (match.indexOf('@U') > -1) {
            var userId = match.slice(2, match.indexOf('|'));
            var user = usersMap[userId];

            if (user) {
                return '@' + user.userName;
            } else {
                return '@unknown';
            }
        } else if (match.indexOf('!') > -1) {
            return match;
        } else {
            var ref = match.slice(1, match.indexOf('>'));
            var href = ref.slice(0, ref.indexOf('|'));
            var label = ref.slice(ref.indexOf('|') + 1, ref.lenth) || href;

            return util.format('<a href="%s" target="_blank">%s</a>', href, label);
        }
    });
};
