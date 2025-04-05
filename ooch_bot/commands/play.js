const { SlashCommandBuilder, ThreadAutoArchiveDuration, ChannelType, EmbedBuilder } = require('discord.js');
const db = require('../db.js');
const { setup_playspace_str, move } = require('../func_play.js');
const { PlayerState } = require('../types.js');
const { event_process } = require('../func_event.js');
const wait = require('wait');
const { finish_battle } = require('../func_battle.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Begin playing Oochamon!'),
    async execute(interaction, client) {
        let target = interaction.user.id;
        console.log(db.profile.get(target, 'player_state'));

        if (!db.profile.has(target)) {
            return interaction.reply({ content: 'Please run `/start` before you play the game!', ephemeral: true });
        } else if (db.profile.get(target, 'player_state') == PlayerState.BattleSetup || db.profile.get(target, 'player_state') == PlayerState.Encounter) {
            return interaction.reply({ content: 'You cannot run `/play` right now.', ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        // UNCOMMENT THIS IF DOING DEV STUFF!!
        if (target != '122568101995872256' && target != '145342159724347393' && target != '156859982778859520' && target != '791144786685067274') return interaction.editReply({ content: 'The bot is being developed on right now, so please don\'t use it!', ephemeral: true });

        let thread = interaction.channel;

        if (interaction.channel.type != ChannelType.PrivateThread) {

            if (db.profile.has(target)) {
                if (db.profile.get(target, 'play_thread_id') !== false) {
                    let oldThread = await interaction.guild.channels.cache.get(db.profile.get(interaction.user.id, 'play_thread_id'));
                    if (oldThread && oldThread.isThread() && thread.id != oldThread.id) {
                        await oldThread.members.remove(interaction.user.id);
                        await oldThread.leave();
                        await oldThread.setArchived(true);
                    } 
                }
            }

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
            
            await db.profile.set(interaction.user.id, thread.id, 'play_thread_id');
            await db.profile.set(interaction.user.id, interaction.guild.id, 'play_guild_id');
            await interaction.editReply({ content: `Made your playspace! Go to this thread: <#${thread.id}> created for you to play!` });
        } else {
            await db.profile.set(interaction.user.id, thread.id, 'play_thread_id');
            await db.profile.set(interaction.user.id, interaction.guild.id, 'play_guild_id');
            await thread.bulkDelete(100);
        }

        let playspace_str = ['**Intro**', []];
        if (db.profile.get(interaction.user.id, 'player_state') != PlayerState.Intro) {
            db.profile.set(interaction.user.id, PlayerState.Playspace, 'player_state');
            playspace_str = setup_playspace_str(interaction.user.id);
        }

        let curBattleId = db.profile.get(interaction.user.id, 'cur_battle_id');
        if (curBattleId != false && db.battle_data.has(curBattleId)) {
            await interaction.deleteReply().catch(() => {});
            
            let battleData = db.battle_data.get(curBattleId);
            await db.battle_data.delete(curBattleId);

            for (let user of battleData.users) {
                if (user.is_player) {
                    db.profile.set(user.user_id, 0, 'cur_event_pos');
                    db.profile.set(user.user_id, false, 'cur_battle_id');
                    let userThread = client.channels.cache.get(user.thread_id);

                    await finish_battle(battleData, user.user_index, true);
                    await move(userThread, user.user_id, '', 1, 0);
                }
            } 
        } else {
            let outputMsg = false;
            if (db.profile.get(interaction.user.id, 'settings.controls_msg') == true) {
                outputMsg = `This is your play thread! All game related messages and playing will happen in this thread.\nUse \`/lookup controls\` if you would like to view controls.`;
            }

            //Send reply displaying the player's location on the map
            await thread.send({ content: playspace_str[0], components: playspace_str[1] }).then(async msg => {
                await db.profile.set(interaction.user.id, msg.id, 'display_msg_id');
            });
            
            if (db.profile.get(interaction.user.id, 'player_state') == PlayerState.Intro) {
                await event_process(interaction.user.id, thread, db.events_data.get('ev_intro'), 0, 'ev_intro');
            } else {
                await move(thread, interaction.user.id, '', 1, 0);
            }

            if (playspace_str[0] != "**Intro**") {
                if (outputMsg != false) {
                    if (thread != interaction.channel) {
                        let tipMsg = await thread.send({ content: outputMsg, ephemeral: true });
                        await wait(15000);
                        await tipMsg.delete().catch(() => {});
                    } else {
                        await interaction.editReply({ content: outputMsg, ephemeral: true });
                    }
                } else if (thread === interaction.channel) {
                    await interaction.deleteReply().catch(() => {});
                }
            } else if (thread === interaction.channel) {
                await interaction.deleteReply().catch(() => {});
            }
        }
    },
};