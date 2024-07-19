const { SlashCommandBuilder } = require('discord.js');
const db = require('../db.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reset')
        .setDescription('Restart your Oochamon quest! THIS WILL DELETE ALL OF YOUR DATA!'),
    async execute(interaction, client) {

        await db.profile.delete(interaction.user.id);

        // Begin introduction!
        let command = client.commands.get('start');
        await command.execute(interaction, client);

    }
}