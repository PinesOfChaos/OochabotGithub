const { SlashCommandBuilder, ComponentType, ButtonStyle, ActionRowBuilder, ButtonBuilder } = require('discord.js');
const db = require('../db.js');
const wait = require('wait');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reset_progress')
        .setDescription('Restart your Oochamon quest! THIS WILL DELETE ALL OF YOUR DATA AND PROGRESS!!!!')
        .addStringOption(option => 
            option.setName('confirm_code')
                .setDescription('Type in "oochamon" to reset fully. THIS WILL DELETE ALL OF YOUR DATA AND PROGRESS!!!!')
                .setRequired(true)),
    async execute(interaction, client) {
        if (interaction.options.getString('confirm_code') == 'oochamon') {
            await db.profile.delete(interaction.user.id);
            // Begin introduction!
            let command = client.commands.get('start');
            await command.execute(interaction, client);
        } else {
            let resetMsg = await interaction.reply('You can only reset if you type in the correct confirmation code, "oochamon", into the argument.');
            await wait(5000);
            await resetMsg.delete().catch(() => {});
        }
    }
}