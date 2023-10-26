const { SlashCommandBuilder } = require('discord.js');
const db = require('../db.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('add_item')
        .setDescription('Add an item to your inventory!')
        .addStringOption(option => 
            option.setName('item')
                .setDescription('ID of item')
                .setAutocomplete(true)
                .setRequired(true))
        .addIntegerOption(option => 
            option.setName('number_to_add')
                .setDescription('How many of the item to add')
                .setRequired(true)),
    async execute(interaction) {

        let id = interaction.options.getString('item');
        if (isNaN(id)) return interaction.reply('You must input an item ID here.');
        id = parseInt(id);
        let num_to_add = interaction.options.getInteger('number_to_add');
        let item_category = db.item_data.get(id, 'category');
    
        db.profile.set(interaction.user.id, num_to_add, `${item_category}.${id}`);

        return interaction.reply(`Added Item ${db.item_data.get(id, 'name')} to your Inventory!`)
    },
};