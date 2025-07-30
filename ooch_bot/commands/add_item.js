import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import { item_data, profile } from '../db.js';

export const data = new SlashCommandBuilder()
    .setName('add_item')
    .setDescription('Add an item to your inventory!')
    .addStringOption(option => option.setName('item')
        .setDescription('ID of item')
        .setAutocomplete(true)
        .setRequired(true))
    .addIntegerOption(option => option.setName('number_to_add')
        .setDescription('How many of the item to add')
        .setRequired(true));
export async function execute(interaction) {

    if (interaction.user.id != '145342159724347393' && interaction.user.id != '122568101995872256') return interaction.reply({ content: 'You can\'t use this!', flags: MessageFlags.Ephemeral });
    let id = interaction.options.getString('item');
    if (isNaN(id)) return interaction.reply('You must input an item ID here.');
    id = parseInt(id);
    let num_to_add = interaction.options.getInteger('number_to_add');
    let item_category = item_data.get(`${id}`, 'category');

    profile.set(interaction.user.id, num_to_add, `${item_category}.${id}`);

    return interaction.reply(`Added Item ${item_data.get(`${id}`, 'name')} to your Inventory!`);
}