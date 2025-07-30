import { SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Pong!');
export async function execute(interaction) {
    interaction.reply('Pong!');
}
