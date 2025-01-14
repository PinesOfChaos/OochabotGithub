const { SlashCommandBuilder } = require('discord.js');
const db = require('../db.js');
const { PlayerState } = require('../types.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('quit')
        .setDescription('Quit playing Oochamon.'),
    async execute(interaction) {
        let state = db.profile.get(interaction.user.id, 'player_state');
        const thread = await interaction.guild.channels.cache.get(db.profile.get(interaction.user.id, 'play_thread_id'));
        await db.profile.set(interaction.user.id, false, 'play_thread_id');
        await db.profile.set(interaction.user.id, false, 'play_guild_id');
        await interaction.reply('This thread has been archived. You can now leave, your game has been saved!');
        await thread.members.remove(interaction.user.id);
        await thread.leave();
        await thread.setArchived(true);
        await db.profile.set(interaction.user.id, PlayerState.NotPlaying, 'player_state');
    },
};