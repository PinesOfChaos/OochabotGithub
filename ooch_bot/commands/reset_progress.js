import { SlashCommandBuilder } from 'discord.js';
import { profile } from '../db.js';
import wait from 'wait';

export const data = new SlashCommandBuilder()
    .setName('reset_progress')
    .setDescription('Restart your Oochamon quest! THIS WILL DELETE ALL OF YOUR DATA AND PROGRESS!!!!')
    .addStringOption(option => option.setName('confirm_code')
        .setDescription('Type in "oochamon" to reset fully. THIS WILL DELETE ALL OF YOUR DATA AND PROGRESS!!!!')
        .setRequired(true));
export async function execute(interaction, client) {
    if (interaction.options.getString('confirm_code') == 'oochamon') {
        await profile.delete(interaction.user.id);
        // Begin introduction!
        let command = client.commands.get(`${'start'}`);
        await command.execute(interaction, client);
    } else {
        let resetMsg = await interaction.reply('You can only reset if you type in the correct confirmation code, "oochamon", into the argument.');
        await wait(5000);
        await resetMsg.delete().catch(() => { });
    }
}