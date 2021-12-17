const { SlashCommandBuilder } = require('@discordjs/builders');
//const Discord = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('slap')
        .setDescription('oof ow')
        .addUserOption(option => 
            option.setName('name')
                .setDescription('Whomst Slappth')
                .setRequired(true)),
    async execute(interaction) {
        let target = interaction.options.getUser('name');
        interaction.deleteReply();
        interaction.channel.send(`OOCHABOT slaps ${target}`);
    },
};