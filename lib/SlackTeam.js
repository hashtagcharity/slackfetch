var mongoose = require('mongoose');

var SlackTeamSchema = mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    token: {
        type: String,
        required: true,
        unique: true
    }
});

module.exports = mongoose.model('SlackTeam', SlackTeamSchema);
