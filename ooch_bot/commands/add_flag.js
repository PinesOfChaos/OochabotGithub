import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import { profile } from '../db.js';

export const data = new SlashCommandBuilder()
    .setName('add_flag')
    .setDescription('Add a flag to someone')
    .addUserOption(option => option.setName('user')
        .setDescription('User to add flag to')
        .setRequired(true))
    .addStringOption(option => option.setName('flag_to_add')
        .setDescription('What flag to add')
        .setRequired(true))
export async function execute(interaction) {

    if (interaction.user.id != '145342159724347393' && interaction.user.id != '122568101995872256') return interaction.reply({ content: 'You can\'t use this!', flags: MessageFlags.Ephemeral });
    let user = interaction.options.getUser('user');
    let flag = interaction.options.getString('flag_to_add');
    profile.push(user.id, flag, 'flags');

    interaction.reply(`Added ${flag} to ${user.id}`);
}