const { SlashCommandBuilder } = require('@discordjs/builders');
const Discord = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Replies with Pong!'),
    async execute(interaction) {
        const embad = new Discord.MessageEmbed()
            .setColor('#808080')
            .setTitle('Pong');
        interaction.reply({ embeds: [embad] });
    },
};