const { SlashCommandBuilder } = require('discord.js');
const db = require('../db.js');
const { PlayerState } = require('../types.js');
const { quit_oochamon } = require('../func_other.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('quit')
        .setDescription('Quit playing Oochamon.'),
    async execute(interaction) {
        const thread = await interaction.guild.channels.cache.get(db.profile.get(interaction.user.id, 'play_thread_id'));
        await interaction.reply('This thread has been archived. You can now leave, your game has been saved!');
        await quit_oochamon(thread, interaction.user.id);
    },
};

//ඞ