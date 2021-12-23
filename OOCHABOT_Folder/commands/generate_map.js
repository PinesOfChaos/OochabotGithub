const { SlashCommandBuilder } = require('@discordjs/builders');
const Discord = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('generate_map')
        .setDescription('Builds a randomly generated map.'),
    async execute(interaction) {
        //interaction.editReply(`Map generated; see console.`);
    },
};