import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import { item_data } from '../db.js';
import { add_item } from '../func_play.js';

export const data = new SlashCommandBuilder()
    .setName('add_item')
    .setDescription('Add an item to your inventory!')
    .addStringOption(option => option.setName('item')
        .setDescription('ID of item')
        .setAutocomplete(true)
        .setRequired(true))
    .addUserOption(option => option.setName('user')
        .setDescription('user to give item')
        .setRequired(true))
    .addIntegerOption(option => option.setName('number_to_add')
        .setDescription('How many of the item to add')
        .setRequired(true));
export async function execute(interaction) {

    if (interaction.user.id != '145342159724347393' && interaction.user.id != '122568101995872256') return interaction.reply({ content: 'You can\'t use this!', flags: MessageFlags.Ephemeral });
    let id = interaction.options.getString('item');
    if (isNaN(id)) return interaction.reply('You must input an item ID here.');
    let num_to_add = interaction.options.getInteger('number_to_add');
    let user_to_add = interaction.options.getUser('user');
    add_item(user_to_add.id, id, num_to_add);

    interaction.reply(`Added ${num_to_add}x ${item_data.get(`${id}`, 'name')} to **${user_to_add.username}**'s inventory!`);
}