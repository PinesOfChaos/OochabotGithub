const { SlashCommandBuilder } = require('@discordjs/builders');
const db = require('../db.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('add_item')
        .setDescription('Add an item to your inventory!')
        .addIntegerOption(option => 
            option.setName('id')
                .setDescription('ID of item')
                .setRequired(true))
        .addIntegerOption(option => 
            option.setName('number_to_add')
                .setDescription('How many of the item to add')
                .setRequired(true)),
    async execute(interaction) {

        let id = interaction.options.getInteger('id');
        let num_to_add = interaction.options.getInteger('number_to_add');
        let item_category = db.item_data.get(id, 'category');
        console.log(db.item_data.get(id));
    
        db.profile.push(interaction.user.id, { item_id: id, num_held: num_to_add }, `${item_category}`);

        return interaction.reply(`Added Item ${db.item_data.get(id, 'name')} to your Inventory!`)
    },
};