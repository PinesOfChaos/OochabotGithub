const { SlashCommandBuilder } = require('@discordjs/builders');
const { channel } = require('diagnostics_channel');
const Discord = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Replies with Pong!'),
    async execute(interaction) {
        const embad = new Discord.MessageEmbed()
            .setColor('#808080')
            .setTitle('Pong');
        interaction.editReply({ embeds: [embad] });
    },
};