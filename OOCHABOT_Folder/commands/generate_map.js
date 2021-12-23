const { SlashCommandBuilder } = require('@discordjs/builders');
const Discord = require('discord.js');
const { gen_map } = require('../func');

module.exports = {
    data: new SlashCommandBuilder()

    .setName('generate_map')
    .setDescription('Generate the map.')
    .addIntegerOption(option => 
        option.setName('size')
            .setDescription('The map will be X by X size.')
            .setRequired(true))
    .addIntegerOption(option => 
        option.setName('chests')
            .setDescription('Determines how many chests will spawn.')
            .setRequired(true)),

    async execute(interaction) {
        let size = interaction.options.getInteger('size');
        let chests = interaction.options.getInteger('chests');
        
        gen_map(size,chests);

        interaction.reply('Finished generating map.');
    },
};