const { SlashCommandBuilder } = require('discord.js');
const db = require('../db.js');
const { map_emote_string } = require('../func_play.js');
const wait = require('wait');
const { PlayerState } = require('../types.js');

module.exports = {
    data: new SlashCommandBuilder()

    .setName('map')
    .setDescription('View the map of your current area, if you have unlocked it.'),
    async execute(interaction) {
        await interaction.reply({ content: 'This command is not finished yet.', ephemeral: true });
    },
};