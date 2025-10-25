import dotenv from 'dotenv';
import process from 'process';
dotenv.config();

import { Events } from 'discord.js';
import { profile, battle_data, events_data } from '../db.js';
import { PlayerState } from '../types.js';
import { quit_oochamon, reset_oochamon } from '../func_other.js';
import { prompt_battle_actions } from '../func_battle.js';
import { inactivityTrackers, setClientEmojis } from '../index.js';
import { event_process } from '../func_event.js';
import { move, setup_playspace_str } from '../func_play.js';

export default {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
        let userIds = profile.keys();
        
        const emojis = await client.application.emojis.fetch();
        setClientEmojis(emojis);

        for (let user of userIds) {

            let user_profile = profile.get(`${user}`);

            if (process.env.NODE_ENV == "DEVELOPMENT") {
                if (user != '122568101995872256' && user != '145342159724347393' && user != '791144786685067274') continue;
            } 

            if (user_profile.play_guild_id === undefined || user_profile.play_guild_id === false) continue;
            let userGuild = await client.guilds.fetch(user_profile.play_guild_id);
            let userThread = userGuild.channels.cache.get(`${user_profile.play_thread_id}`);
            if (userThread == undefined) continue;
            
            // Set inactivity timer
            const inactivityTimer = setTimeout(async () => {
                await quit_oochamon(userThread, user);
            }, 30 * 60 * 1000);

            inactivityTrackers[user] = inactivityTimer;

            if (user_profile.player_state == PlayerState.Combat) continue;

            if (user_profile.player_state == PlayerState.Intro) {
                await userThread.bulkDelete(100).catch(() => {});
                await reset_oochamon(user);
                await profile.set(user, userThread.id, 'play_thread_id');
                await profile.set(user, userGuild.id, 'play_guild_id');
                await event_process(user, userThread, events_data.get(`${'ev_intro'}`), 0, 'ev_intro');

            } else if (user_profile.player_state == PlayerState.Dialogue && user_profile.cur_event_name !== false) {
                await userThread.bulkDelete(100).catch(() => {});

                // Setup playspace
                let playspace_str = await setup_playspace_str(user);
                await profile.set(user, PlayerState.Playspace, 'player_state');

                await userThread.send({ content: playspace_str[0], components: playspace_str[1] }).then(msg => {
                    profile.set(user, msg.id, 'display_msg_id');
                });

                await event_process(user, userThread, events_data.get(`${user_profile.cur_event_name}`), 0, user_profile.cur_event_name);
            } else if (user_profile.player_state == PlayerState.Dialogue) {
                await userThread.bulkDelete(100).catch(() => {});

                // Setup playspace
                let playspace_str = await setup_playspace_str(user);
                await profile.set(user, PlayerState.Playspace, 'player_state');

                await userThread.send({ content: playspace_str[0], components: playspace_str[1] }).then(msg => {
                    profile.set(user, msg.id, 'display_msg_id');
                });

                if (user_profile.cur_event_array.length != 0) {
                    await event_process(user, userThread, user_profile.cur_event_array, user_profile.cur_event_pos);
                }

            } else if ((user_profile.player_state !== PlayerState.NotPlaying && user_profile.player_state !== PlayerState.Playspace)) {
                if (userThread !== undefined) {
                    await userThread.bulkDelete(100).catch(() => {});
                    // Setup playspace
                    let playspace_str = await setup_playspace_str(user);
                    await profile.set(user, PlayerState.Playspace, 'player_state');

                    await userThread.send({ content: playspace_str[0], components: playspace_str[1] }).then(msg => {
                        profile.set(user, msg.id, 'display_msg_id');
                    });

                    await move(userThread, user, '', 1);
                }
            }
        }

        let battleIds = battle_data.keys();
        for (let battle of battleIds) {
            let db_battle_data = battle_data.get(`${battle}`);
            if (db_battle_data == undefined) continue;

            for (let user of db_battle_data.users) {
                if (user.is_player) {
                    let user_profile = profile.get(`${user.user_id}`);

                    if (user_profile.cur_battle_id != db_battle_data.battle_id || user_profile.player_state != PlayerState.Combat) {
                        battle_data.delete(db_battle_data.battle_id);
                        break;
                    }

                    let userGuild = await client.guilds.fetch(user_profile.play_guild_id);
                    let userThread = userGuild.channels.cache.get(`${user_profile.play_thread_id}`);

                    // Delete turn messages
                    let msgDeleteCount = battle_data.get(`${battle}`, 'turn_msg_counter');
                    if (msgDeleteCount <= 100 && msgDeleteCount !== 0 && msgDeleteCount !== undefined) {
                        if (userThread != undefined) await userThread.bulkDelete(msgDeleteCount).catch(() => {});
                    }  
                    
                    user.action_selected = false;
                }
            }

            if (battle_data.has(db_battle_data.battle_id)) {
                db_battle_data.battle_action_queue = [];
                battle_data.set(battle, db_battle_data);

                await prompt_battle_actions(battle);
            }
        }

        console.log('Bot Ready')
    }
}