const { SlashCommandBuilder } = require('discord.js');
const db = require('../db.js');
const { reset_oochamon } = require('../func_other.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('start')
        .setDescription('Begin your Oochamon quest!'),
    async execute(interaction, client) {

        if (!db.profile.has(interaction.user.id)) {
            await reset_oochamon(interaction.user.id);
        }

        // Begin introduction!
        let command = client.commands.get('play');
        await command.execute(interaction);

    }
}