import { SlashCommandBuilder } from 'discord.js';
import { profile } from '../db.js';
import { PlayerState } from '../types.js';
import { menu_handler } from '../event_handlers/menu_handler.js';
 
export const data = new SlashCommandBuilder()
    .setName('menu')
    .setDescription('Pull up the menu.');
export async function execute(interaction) {
    await interaction.deferReply();
    let playerState = profile.get(`${interaction.user.id}`, 'player_state');

    if (playerState == PlayerState.NotPlaying) {
        return interaction.editReply({ content: 'You must be playing the game to pull up the menu.' });
    } else if (playerState != PlayerState.NotPlaying && interaction.channel.id != profile.get(`${interaction.user.id}`, 'play_thread_id')) {
        return interaction.editReply({ content: 'You can\'t pull up the menu here.' });
    } else if (playerState == PlayerState.Menu) {
        return interaction.editReply({ content: `The menu is already open, you cannot open it again! If you don't have the menu open, please restart the game by running \`/play\`.` });
    } else if (playerState != PlayerState.Playspace) {
        return interaction.editReply({ content: 'You can\'t pull up the menu right now.' });
    }

    profile.set(interaction.user.id, PlayerState.Menu, 'player_state');
    // Delete the current playspace
    let playspace_msg = await interaction.channel.messages.fetch(profile.get(`${interaction.user.id}`, 'display_msg_id')).catch(() => {});
    await playspace_msg.delete().catch(() => { });;

    await menu_handler(interaction, true);
}