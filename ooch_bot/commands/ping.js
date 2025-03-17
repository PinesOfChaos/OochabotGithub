const { SlashCommandBuilder } = require('discord.js');
const { modernize_profile } = require('../func_modernize.js')
module.exports = {
    data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Pong!'),
    async execute(interaction) {
        modernize_profile(interaction.user.id)
        interaction.reply('Pong!');
        
    },
};
