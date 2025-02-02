const { SlashCommandBuilder } = require('discord.js');
const db = require('../db.js');
const { PlayerState } = require('../types.js');

module.exports = {
    data: new SlashCommandBuilder()
    .setName('get_coords')
    .setDescription('Get your current position in the area.'),
    async execute(interaction) {
        if (!db.profile.has(interaction.user.id)) {
            return interaction.reply({ content: `You must be playing the Oochamon to use this command!`, ephemeral: true })
        }

        let playerState = db.profile.get(interaction.user.id, 'player_state');
        if (playerState === PlayerState.NotPlaying) {
            return interaction.reply({ content: 'You must be playing the game to view your in-game location.', ephemeral: true });
        }

        let locationData = db.profile.get(interaction.user.id, 'location_data');

        interaction.reply({ content: `Current Area: **${locationData.area}**\n[X: ${locationData.x}, Y: ${locationData.y}]`, ephemeral: true });
    }   
}