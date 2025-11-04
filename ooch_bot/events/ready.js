import dotenv from 'dotenv';
import process from 'process';
dotenv.config();

import { Events } from 'discord.js';
import { profile } from '../db.js';
import { inactivityTrackers, setClientEmojis } from '../index.js';
import { quit_oochamon } from '../func_other.js';

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

        }

        console.log('Bot Ready')
    }
}