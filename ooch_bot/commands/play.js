const { SlashCommandBuilder, ThreadAutoArchiveDuration, ChannelType, EmbedBuilder } = require('discord.js');
const db = require('../db.js');
const { setup_playspace_str, move } = require('../func_play.js');
const { PlayerState } = require('../types.js');
const { event_process } = require('../func_event.js');
const wait = require('wait');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Begin playing Oochamon!'),
    async execute(interaction) {
        let target = interaction.user.id;

        if (!db.profile.has(target)) {
            return interaction.reply({ content: 'Please run `/start` before you play the game!', ephemeral: true });
        } 
        let thread = interaction.channel;

        if (interaction.channel.type != ChannelType.PrivateThread) {

            // if (db.profile.has(target)) {
            //     if (db.profile.get(target, 'play_thread_id') !== false) {
            //         let thread = await interaction.guild.channels.cache.get(db.profile.get(interaction.user.id, 'play_thread_id'));
            //         if (thread && thread.isThread()) {
            //             await thread.members.remove(interaction.user.id);
            //             await thread.leave();
            //             await thread.setArchived(true);
            //         } 
            //     }
            // }

            // Setup the play thread
            thread = await interaction.channel.threads.create({
                name: `${interaction.member.displayName}'s Oochamon Play Thread`,
                autoArchiveDuration: ThreadAutoArchiveDuration.OneHour,
                type: ChannelType.PrivateThread,
                reason: 'Play thread',
            });

            if (thread.joinable) await thread.join();
            await thread.members.add(interaction.user.id);

            // Add Jeff and Pines, this should be REMOVED on full release, just useful for beta testing
            await thread.members.add('145342159724347393');
            await thread.members.add('122568101995872256');

            await thread.setInvitable(false);
            
            db.profile.set(interaction.user.id, thread.id, 'play_thread_id');
            db.profile.set(interaction.user.id, interaction.guild.id, 'play_guild_id');
            interaction.reply({ content: `Made your playspace! Go to this thread: <#${thread.id}> created for you to play!`, ephemeral: true });
        } else {
            db.profile.set(interaction.user.id, thread.id, 'play_thread_id');
            db.profile.set(interaction.user.id, interaction.guild.id, 'play_guild_id');
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
        db.profile.set(interaction.user.id, [], 'npc_event_data'); 
        db.profile.set(interaction.user.id, 0, 'battle_msg_counter'); 
        db.profile.set(interaction.user.id, 0, 'turn_msg_counter'); 
        db.profile.set(interaction.user.id, 0, 'npc_event_pos');

        let outputMsg = false;
        if (db.profile.get(interaction.user.id, 'settings.controls_msg') == true) {
            outputMsg = `This is your play thread! All game related messages and playing will happen in this thread.\nUse \`/lookup controls\` if you would like to view controls.`;
        }

        //Send reply displaying the player's location on the map
        await thread.send({ content: playspace_str }).then(async msg => {
            await db.profile.set(interaction.user.id, msg.id, 'display_msg_id');
        });

        if (db.profile.get(interaction.user.id, 'player_state') == PlayerState.Intro) {
            await event_process(interaction.user.id, thread, db.events_data.get('ev_intro'));
        } else {
            await move(thread, interaction.user.id, '', 1);
        }

        if (playspace_str != "**Intro**") {
            if (outputMsg != false) {
                if (thread != interaction.channel) {
                    let tipMsg = await thread.send({ content: outputMsg, ephemeral: true });
                    await wait(15000);
                    await tipMsg.delete().catch(() => {});
                } else {
                    await interaction.reply({ content: outputMsg, ephemeral: true });
                }
            } else if (thread === interaction.channel) {
                await interaction.deferReply();
                await interaction.deleteReply();
            }
        } else if (thread === interaction.channel) {
            await interaction.deferReply();
            await interaction.deleteReply();
        }
    },
};