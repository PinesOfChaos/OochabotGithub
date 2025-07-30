import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import { profile } from '../db.js';
import { PlayerState } from '../types.js';

export const data = new SlashCommandBuilder()
    .setName('get_coords')
    .setDescription('Get your current position in the area.');
export async function execute(interaction) {
    if (!profile.has(interaction.user.id)) {
        return interaction.reply({ content: `You must be playing the Oochamon to use this command!`, flags: MessageFlags.Ephemeral });
    }

    let playerState = profile.get(`${interaction.user.id}`, 'player_state');
    if (playerState === PlayerState.NotPlaying) {
        return interaction.reply({ content: 'You must be playing the game to view your in-game location.', flags: MessageFlags.Ephemeral });
    }

    let locationData = profile.get(`${interaction.user.id}`, 'location_data');

    interaction.reply({ content: `Current Area: **${locationData.area}**\n[X: ${locationData.x}, Y: ${locationData.y}]`, flags: MessageFlags.Ephemeral });
}