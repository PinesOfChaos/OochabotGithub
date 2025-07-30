import { SlashCommandBuilder } from 'discord.js';
import { profile } from '../db.js';
import { PlayerState } from '../types.js';

export const data = new SlashCommandBuilder()
    .setName('get_coords')
    .setDescription('Get your current position in the area.');
export async function execute(interaction) {
    if (!profile.has(interaction.user.id)) {
        return interaction.reply({ content: `You must be playing the Oochamon to use this command!`, ephemeral: true });
    }

    let playerState = profile.get(`${interaction.user.id}`, 'player_state');
    if (playerState === PlayerState.NotPlaying) {
        return interaction.reply({ content: 'You must be playing the game to view your in-game location.', ephemeral: true });
    }

    let locationData = profile.get(`${interaction.user.id}`, 'location_data');

    interaction.reply({ content: `Current Area: **${locationData.area}**\n[X: ${locationData.x}, Y: ${locationData.y}]`, ephemeral: true });
}