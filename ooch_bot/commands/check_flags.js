import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import { profile } from '../db.js';

export const data = new SlashCommandBuilder()
    .setName('check_flag')
    .setDescription('Check the flags of a user')
    .addUserOption(option => option.setName('user')
        .setDescription('User to check flags for')
        .setRequired(true)
    )
    .addStringOption(option => option.setName('flag_to_check')
        .setDescription('What flag to check')
        .setRequired(true)
    );
export async function execute(interaction) {
    if (interaction.user.id != '145342159724347393' && interaction.user.id != '122568101995872256') return interaction.reply({ content: 'You can\'t use this!', flags: MessageFlags.Ephemeral });
    let user = interaction.options.getUser('user');
    let flag = interaction.options.getString('flag_to_check');
    let flag_list = profile.get(user.id, 'flags').filter(f => f.includes(flag));
    
    await interaction.reply(`Flags currently in ${user.username}'s profile:\n${flag_list.join(', ')}`);
}