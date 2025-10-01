import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import { profile } from '../db.js';

export const data = new SlashCommandBuilder()
    .setName('remove_flag')
    .setDescription('Remove a flag from someone')
    .addUserOption(option => option.setName('user')
        .setDescription('User to remove flag from')
        .setRequired(true))
    .addStringOption(option => option.setName('flag_to_remove')
        .setDescription('What flag to remove')
        .setRequired(true))
export async function execute(interaction) {

    if (interaction.user.id != '145342159724347393' && interaction.user.id != '122568101995872256') return interaction.reply({ content: 'You can\'t use this!', flags: MessageFlags.Ephemeral });
    let user = interaction.options.getUser('user');
    let flag = interaction.options.getString('flag_to_remove');
    let flag_list = profile.get(user.id, 'flags');
    flag_list = flag_list.filter(f => f !== flag);
    profile.set(user.id, flag_list, 'flags');

    interaction.reply(`Removed ${flag} from ${user.id}`);
}