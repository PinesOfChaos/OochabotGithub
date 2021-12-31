const { SlashCommandBuilder } = require('@discordjs/builders');
const Discord = require('discord.js');
const { gen_map } = require('../func');
const db = require('../db.js');

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
            .setRequired(true))
    .addStringOption(option => 
            option.setName('biome')
                .setDescription('Set the biome of the generated map')
                .setRequired(true)
                .addChoices([['Desert','desert'],['Obsidian','obsidian'],['Fungal','fungal'],['Hub','hub']])),
    async execute(interaction) {
        let size = interaction.options.getInteger('size');
        let chests = interaction.options.getInteger('chests');
        let biome = interaction.options.getString('biome');

        db.maps.set(biome, gen_map(size, chests, biome));

        return interaction.reply(`Generated map of ${biome}`);
    },
};