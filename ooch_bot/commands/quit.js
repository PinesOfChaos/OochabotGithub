import { SlashCommandBuilder } from 'discord.js';
import { profile } from '../db.js';
import { quit_oochamon } from '../func_other.js';

export const data = new SlashCommandBuilder()
    .setName('quit')
    .setDescription('Quit playing Oochamon.');
export async function execute(interaction, client) {
    const thread = await interaction.guild.channels.cache.get(`${profile.get(interaction.user.id)}`, 'play_thread_id');
    await interaction.reply('This thread has been archived. You can now leave, your game has been saved!');
    await quit_oochamon(thread, interaction.user.id, client);
}

//ඞ