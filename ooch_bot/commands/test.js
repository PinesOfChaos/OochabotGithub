import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import { profile } from '../db.js';
import { setup_playspace_str } from '../func_play.js';

export const data = new SlashCommandBuilder()
    .setName('test')
    .setDescription('Test development stuff!');
export async function execute(interaction) {
    if (interaction.user.id != '122568101995872256' && interaction.user.id != '145342159724347393') {
        interaction.reply({ content: 'This is not for you!', flags: MessageFlags.Ephemeral });
        return;
    }

    const user_id = interaction.user.id;

    // Check if player has a profile
    if (!profile.has(user_id)) {
        return interaction.reply({ content: 'No profile found. Run /start first!', flags: MessageFlags.Ephemeral });
    }

    // Temporarily set zoom to 9x9 for testing
    const originalZoom = profile.get(user_id, 'settings.zoom');
    profile.set(user_id, '9_9', 'settings.zoom');

    // Get the playspace (now returns v2 format)
    const playspace = await setup_playspace_str(user_id);

    // Restore original zoom
    profile.set(user_id, originalZoom, 'settings.zoom');

    // Use the v2 format directly
    interaction.reply({ components: playspace.components, flags: playspace.flags });
}
