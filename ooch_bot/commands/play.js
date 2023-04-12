const { SlashCommandBuilder, ThreadAutoArchiveDuration, ChannelType } = require('discord.js');
const db = require('../db.js');
const { setup_playspace_str } = require('../func_play.js');
const { PlayerState } = require('../types.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Begin playing Oochamon!'),
    async execute(interaction) {
        let target = interaction.user.id;
        if (!db.profile.has(target)) {
            return interaction.reply({ content: 'Please run `/setup` before you play the game!', ephemeral: true });
        } 

        if (db.profile.get(target, 'state') == PlayerState.NotPlaying) {
            return interaction.reply({ content: 'You can\'t run `/play` when you have an active game session going!', ephemeral: true });
        }

        // Setup the play thread
        const thread = await interaction.channel.threads.create({
            name: `${interaction.member.displayName}'s Oochamon Play Thread`,
            autoArchiveDuration: ThreadAutoArchiveDuration.OneHour,
            type: ChannelType.PrivateThread,
            reason: 'Play thread',
        });

        if (thread.joinable) await thread.join();
        await thread.members.add(interaction.user.id);
        await thread.setInvitable(false);

        db.profile.set(interaction.user.id, thread.id, 'play_thread_id');
        db.profile.set(interaction.user.id, PlayerState.Playspace, 'player_state');
        let playspace_str = setup_playspace_str(interaction.user.id);

        //Send reply displaying the player's location on the map
        interaction.reply({ content: `Made your playspace! Use the thread created for you to play!`, ephemeral: true });
        thread.send(`This is your play thread! All game related messages and playing will happen in this thread.\nRun \`/quit\` when you are done playing!`);
        thread.send({ content: playspace_str }).then(msg => {
            db.profile.set(interaction.user.id, msg.id, 'display_msg_id');
        });
    },
};