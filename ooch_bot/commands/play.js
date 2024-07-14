const { SlashCommandBuilder, ThreadAutoArchiveDuration, ChannelType, EmbedBuilder } = require('discord.js');
const db = require('../db.js');
const { setup_playspace_str } = require('../func_play.js');
const { PlayerState } = require('../types.js');
const { event_process } = require('../func_event.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Begin playing Oochamon!'),
    async execute(interaction) {
        let target = interaction.user.id;

        if (!db.profile.has(target)) {
            return interaction.reply({ content: 'Please run `/setup` before you play the game!', ephemeral: true });
        } 
        let thread = interaction.channel;

        if (interaction.channel.type != ChannelType.PrivateThread) {
            // Setup the play thread
            thread = await interaction.channel.threads.create({
                name: `${interaction.member.displayName}'s Oochamon Play Thread`,
                autoArchiveDuration: ThreadAutoArchiveDuration.OneHour,
                type: ChannelType.PrivateThread,
                reason: 'Play thread',
            });

            if (thread.joinable) await thread.join();
            await thread.members.add(interaction.user.id);
            await thread.setInvitable(false);
            
            db.profile.set(interaction.user.id, thread.id, 'play_thread_id');
            interaction.reply({ content: `Made your playspace! Use the thread created for you to play!`, ephemeral: true });
        } else {
            await thread.bulkDelete(100);
        }

        let playspace_str = '**Intro**';
        if (db.profile.get(interaction.user.id, 'player_state') != PlayerState.Intro) {
            db.profile.set(interaction.user.id, PlayerState.Playspace, 'player_state');
            playspace_str = setup_playspace_str(interaction.user.id);
        }

        // Reset Oochamon's stat and abilities and status effects
        let ooch_party = db.profile.get(interaction.user.id, 'ooch_party');
        for (let i = 0; i < ooch_party.length; i++) {
            ooch_party[i].stats.atk_mul = 1;
            ooch_party[i].stats.def_mul = 1;
            ooch_party[i].stats.acc_mul = 1;
            ooch_party[i].stats.eva_mul = 1;
            ooch_party[i].stats.spd_mul = 1;
            ooch_party[i].ability = ooch_party[i].og_ability;
            ooch_party[i].type = ooch_party[i].og_type;
            ooch_party[i].doom_timer = 3;
            ooch_party[i].status_effects = [];
        }
        db.profile.set(interaction.user.id, ooch_party, 'ooch_party');
        db.profile.set(interaction.user.id, {}, 'ooch_enemy');

        let outputMsg = `This is your play thread! All game related messages and playing will happen in this thread.\nRun \`/quit\` when you are done playing!`;
        //Send reply displaying the player's location on the map
        (thread != interaction.channel) ? thread.send(outputMsg) : interaction.reply(outputMsg);
        await thread.send({ content: playspace_str }).then(msg => {
            db.profile.set(interaction.user.id, msg.id, 'display_msg_id');
        });

        if (db.profile.get(interaction.user.id, 'player_state') == PlayerState.Intro) {
            event_process(interaction.user.id, thread, db.events_data.get('ev_intro'));
        }
    },
};