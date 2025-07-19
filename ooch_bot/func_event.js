const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, User } = require('discord.js');
const db = require('./db.js');
const _ = require('lodash');
const { PlayerState, EventMode, Flags, UserType, Weather } = require('./types.js');
const { get_art_file } = require('./func_other.js');
const { generate_battle_user, setup_battle } = require('./func_battle.js');
const wait = require('wait');

let functions = {
    /**
     * Runs an event based on event array
     * @param {String} user_id The ID of the user who called the event.
     * @param {Object} thread The main thread that Oochamon is being played in.
     * @param {Array} event_array The event array.
     * @param {Number} start_pos The position to start in the event array (defaults to 0)
     * @param {String} event_name The name of the global event (defaults to false if not needed)
     */
    event_process: async function(user_id, thread, event_array, start_pos = 0, event_name = false) {
        
        const { give_item, setup_playspace_str, create_ooch, move, get_map_weather } = require('./func_play.js');

        let next_buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId('next').setLabel('▶').setStyle(ButtonStyle.Success),
            );
        
        db.profile.set(user_id, event_name, 'cur_event_name');
        db.profile.set(user_id, event_array, 'cur_event_array');
        db.profile.set(user_id, start_pos, 'cur_event_pos');
        let current_place = start_pos;
        let event_mode = event_array[current_place][0];
        let obj_content = event_array[current_place][1];
        let placeholder_desc = 'Error';
        let info_data;
        let quit_init_loop = false;
        let profile_data = db.profile.get(user_id);
        let msg_to_edit = profile_data.display_msg_id;
        let imageFiles = [];
        let battleGroupBattleArr = [];
        let filter = i => i.user.id == user_id;
        let oochamonPicks = new ActionRowBuilder();
        let optionsRow = new ActionRowBuilder();
        let event_buttons = next_buttons
    
        let event_embed = new EmbedBuilder()
            .setColor('#808080')
            .setDescription(placeholder_desc)

        // Switch state to dialogue if coming from the playspace
        if (db.profile.get(user_id, 'player_state') == PlayerState.Playspace) {
            db.profile.set(user_id, PlayerState.Dialogue, 'player_state');
        }

        // Using helper functions here because we have to essentially duplicate this across 2 different while loops,
        // and one for right when we start the event and one for after dialogue options are picked. Helper functions
        // make this easier to work with.
        async function dialogueEvent(obj_content, initial=false) {
            if (obj_content.description.includes('{')) {
                let dialogue_var = obj_content.description.split('{').pop().split('}')[0];
                if (dialogue_var.includes('player')) {
                    obj_content.description = obj_content.description.replace('{player}', thread.guild.members.cache.get(user_id).displayName);
                } else if (dialogue_var.includes('objective')) {
                    let match = obj_content.description.match(/\{objective:([^}]+)\}/);
                    obj_content.objective = match ? match[1] : null;
                    db.profile.set(user_id, obj_content.objective, 'objective');

                    // Remove the `{...}` part from the original string
                    obj_content.description = obj_content.description.replace(/\{[^}]+\}/, '').trim();
                }
            }

            if (obj_content.description != '') {
                event_embed.setDescription(obj_content.description);
            }

            if (obj_content.title != '') {
                event_embed.setTitle(obj_content.title);
            }

            // Set NPC dialogue portrait
            if (obj_content.dialogue_portrait != '' && obj_content.dialogue_portrait != undefined) {
                if (obj_content.dialogue_portrait.includes('NPC|')) {
                    event_embed.setThumbnail(`attachment://${obj_content.dialogue_portrait.split('|')[1]}`)
                    imageFiles.push(get_art_file(`./Art/NPCs/${obj_content.dialogue_portrait.split('|')[1]}`));
                } else {
                    event_embed.setThumbnail(`attachment://${obj_content.dialogue_portrait}.png`)
                    imageFiles.push(get_art_file(`./Art/Portraits/${obj_content.dialogue_portrait}.png`));
                }
            }

            if (obj_content.image) {
                event_embed.setImage(`attachment://${obj_content.image}`)
                imageFiles.push(get_art_file(`./Art/EventImages/${obj_content.image}`));
            }

            info_data = '';
            if (obj_content.money != 0) {
                info_data += `**${obj_content.money}** Oochabux\n`;
                db.profile.math(user_id, '+', obj_content.money, 'oochabux');
            } 

            if (obj_content.items != false) {
                if (obj_content.items.length != 0) {
                    for (let item of obj_content.items) {
                        let itemData = db.item_data.get(item.id);
                        info_data += `${itemData.emote} **${itemData.name}** x${item.count}\n`;
                        give_item(user_id, item.id, item.count);
                    }
                }
            } 

            if (obj_content.objective != false) {
                event_embed.addFields([{ name: 'New Objective', value: `*${obj_content.objective}*` }])
                db.profile.set(user_id, obj_content.objective, 'objective');
            } else if (event_embed.data.fields != undefined) {
                event_embed.data.fields = event_embed.data.fields.filter(field => field.name !== 'New Objective');
            }

            if (info_data.length != 0) {
                event_embed.addFields({name: 'You Received:', value: info_data });
            } else if (event_embed.data.fields != undefined) {
                event_embed.data.fields = event_embed.data.fields.filter(field => field.name !== 'You Received:');
            }
        }

        async function battleEvent(obj_content, initial=false, battle_group_arr = []) {    
            if (initial == false) {
                // Delete the embed message to prep for battle, and kill the collector as well.
                await msg.delete();
                if (confirm_collector !== undefined) confirm_collector.stop();
            }

            obj_content.team_id = 1;
            if (battle_group_arr.length == 0) {
                let user_type = obj_content.hasOwnProperty("user_type") ? obj_content.user_type : UserType.NPCTrainer
                let trainerObj = await generate_battle_user(user_type, obj_content);
                battleGroupBattleArr = [trainerObj];
            }

            let userObj = await generate_battle_user(UserType.Player, { user_id: user_id, team_id: 0, thread_id: thread.id, guild_id: thread.guild.id });
            let allyList = [];
            for (let ally of profile_data.allies_list) {
                ally.team_id = 0;
                let user_type = UserType.NPCTrainer;
                let trainerObj = await generate_battle_user(user_type, ally);
                allyList.push(trainerObj);
            }

            allyList.unshift(userObj);

            battleGroupBattleArr.unshift(allyList);
            battleGroupBattleArr = battleGroupBattleArr.flat(1);
            let map_data = db.maps.get(profile_data.location_data.area);
            let battle_bg = map_data.map_info.map_battleback;

            // Setup the battle for trainers
            await setup_battle(battleGroupBattleArr, get_map_weather(map_data.map_weather, profile_data.location_data), obj_content.coin, 0, true, true, false, false, false, battle_bg);

            // Increment by one so that after the battle we end up in the next part of the event.
            db.profile.set(user_id, current_place+1, 'cur_event_pos');
        }

        async function battleGroupEvent() {
            current_place++;
            battleGroupBattleArr = [];
            let event_mode = event_array[current_place][0];
            let obj_content  = event_array[current_place][1];
            while (event_mode != EventMode.BattleGroupEnd) {
                obj_content.team_id = 1;
                if (event_mode == EventMode.Battle) {
                    let user_type = obj_content.hasOwnProperty("user_type") ? obj_content.user_type : UserType.NPCTrainer
                    let trainerObj = await generate_battle_user(user_type, obj_content);
                    battleGroupBattleArr.push(trainerObj)
                }

                current_place++;
                event_mode = event_array[current_place][0];
                obj_content = event_array[current_place][1];
            }

            await battleEvent(obj_content, false, battleGroupBattleArr)
        }

        async function oochPickEvent(obj_content, initial=false) {
            oochamonPicks = new ActionRowBuilder();

            for (let ooch of obj_content.options) {
                let oochData = db.monster_data.get(ooch.id)
                ooch.moveset = ooch.moveset.filter(v => v != 9999);
                oochamonPicks.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`ooch|${ooch.id}|${ooch.level}|${ooch.moveset.join(',')}|${ooch.nickname}|${ooch.ability}|${ooch.hp_iv}|${ooch.atk_iv}|${ooch.def_iv}|${ooch.spd_iv}`)
                        .setLabel(`${oochData.name}`)
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji(`${oochData.emote}`),
                );
            }

            if (obj_content.title != '') event_embed.setTitle(obj_content.title);
            if (obj_content.description != '') event_embed.setDescription(obj_content.description);

            // Set NPC dialogue portrait
            if (obj_content.dialogue_portrait != false && obj_content.dialogue_portrait != '') {
                if (obj_content.dialogue_portrait.includes('NPC|')) {
                    event_embed.setThumbnail(`attachment://${obj_content.dialogue_portrait.split('|')[1]}`)
                    imageFiles.push(get_art_file(`./Art/NPCs/${obj_content.dialogue_portrait.split('|')[1]}`));
                } else {
                    event_embed.setThumbnail(`attachment://${obj_content.dialogue_portrait}.png`)
                    imageFiles.push(get_art_file(`./Art/Portraits/${obj_content.dialogue_portrait}.png`));
                }
            }

            if (obj_content.image) {
                event_embed.setImage(`attachment://${obj_content.image}`)
                imageFiles.push(get_art_file(`./Art/EventImages/${obj_content.image}`));
            }

            event_buttons = oochamonPicks;

        }

        async function flagEvent(obj_content) {
            let flags = db.profile.get(user_id, 'flags');
            if (!flags.includes(obj_content.text) || obj_content.text.includes('toggle')) {
                if (!obj_content.text.includes('toggle')) {
                    db.profile.push(user_id, obj_content.text, 'flags');
                } else {
                    let index = flags.indexOf(obj_content.text);
                    
                    if (index === -1) {
                        db.profile.push(user_id, obj_content.text, 'flags');
                    } else {
                        flags.splice(index, 1);
                        db.profile.set(user_id, flags, 'flags');
                    }
                }

                //Trap the player in the Access Tunnel after Cade battle
                if(obj_content.text == 'cade_battle_tunnel'){
                    db.profile.set(user_id, {area: 'access_tunnel', x : 23, y : 22}, 'checkpoint_data')
                }

                if (!obj_content.text.includes('NPC|')) {
                    let msg_to_edit = db.profile.get(user_id, 'display_msg_id');
                    let playspace_str = setup_playspace_str(user_id);
                    await thread.messages.fetch(msg_to_edit).then((msg) => {
                        msg.edit({ content: playspace_str[0], components: playspace_str[1] });
                    }).catch(() => {});
                }
            }
        }

        async function transitionEvent(obj_content) {
            //remove the player's info from the old biome and add it to the new one
            let ogBiome = db.profile.get(user_id, 'location_data.area');
            if (ogBiome == undefined) ogBiome = 'hub';
            if (obj_content.map_to == false) obj_content.map_to = ogBiome;
            let mapData = db.maps.get(obj_content.map_to);
            let map_default = mapData.map_savepoints.filter(v => v.is_default !== false);
            if (mapData.map_savepoints.filter(v => v.is_default !== false).length == 0) {
                map_default = [mapData.map_savepoints[0]];
            }

            db.profile.set(user_id, { area: obj_content.map_to, x: map_default[0].x, y: map_default[0].y }, 'checkpoint_data');
            db.profile.set(user_id, [], 'previous_positions')

            if (obj_content.default_tp === true) {
                obj_content.x_to = map_default[0].x;
                obj_content.y_to = map_default[0].y;
            }

            db.player_positions.set(obj_content.map_to, { x: obj_content.x_to, y: obj_content.y_to }, user_id);
            db.player_positions.delete(ogBiome, user_id);
            db.profile.set(user_id, { area: obj_content.map_to, x: obj_content.x_to, y: obj_content.y_to }, 'location_data')
            

            let msg_to_edit = db.profile.get(user_id, 'display_msg_id');
            let playspace_str = setup_playspace_str(user_id);
            await thread.messages.fetch(msg_to_edit).then((msg) => {
                msg.edit({ content: playspace_str[0], components: playspace_str[1] });
            }).catch(() => {});
        }

        function objectiveEvent(obj_content) {
            db.profile.set(user_id, obj_content.objective, 'objective');
        }

        function optionsEvent(obj_content, initial=false) {
            optionsRow = new ActionRowBuilder();

            for (let option of obj_content.options) {
                // Convert button style
                switch (option.style) {
                    case 0: option.style = ButtonStyle.Primary; break;
                    case 1: option.style = ButtonStyle.Secondary; break;
                    case 2: option.style = ButtonStyle.Success; break;
                    case 3: option.style = ButtonStyle.Danger; break;
                }

                if (profile_data.flags.includes(option.flag) || option.flag == false) {
                    optionsRow.addComponents(
                        new ButtonBuilder()
                            .setCustomId(`option|${option.event}|${option.price}`)
                            .setLabel(`${option.text}`)
                            .setStyle(option.style)
                            //.setEmoji(`${option.emote == ""}`)
                            .setDisabled(option.price > profile_data.oochabux),
                    );
                }
            }

            if (obj_content.title != '') event_embed.setTitle(obj_content.title);
            if (obj_content.description != '') event_embed.setDescription(obj_content.description);

            // Set NPC dialogue portrait
            if (obj_content.dialogue_portrait != false && obj_content.dialogue_portrait != '') {
                if (obj_content.dialogue_portrait.includes('NPC|')) {
                    event_embed.setThumbnail(`attachment://${obj_content.dialogue_portrait.split('|')[1]}`)
                    imageFiles.push(get_art_file(`./Art/NPCs/${obj_content.dialogue_portrait.split('|')[1]}`));
                } else {
                    event_embed.setThumbnail(`attachment://${obj_content.dialogue_portrait}.png`)
                    imageFiles.push(get_art_file(`./Art/Portraits/${obj_content.dialogue_portrait}.png`));
                }
            }

            if (obj_content.image) {
                event_embed.setImage(`attachment://${obj_content.image}`)
                imageFiles.push(get_art_file(`./Art/EventImages/${obj_content.image}`));
            }

            if (initial) event_buttons = optionsRow;
        }

        async function waitEvent(obj_content) {
            await wait(obj_content.duration * 1000);
        }

        function allyChangeEvent(obj_content, event) {
            if (event == EventMode.AddAlly) {
                obj_content.coin = 5;
                db.profile.push(user_id, obj_content, 'allies_list');
            }
            if (event == EventMode.RemoveAlly) db.profile.set(user_id, [], 'allies_list');
        }

        while (!quit_init_loop) {
            event_mode = event_array[current_place][0];
            obj_content = event_array[current_place][1];

            switch (event_mode) {
                //Basic Text Event
                case EventMode.Dialogue: 
                    await dialogueEvent(obj_content, true);
                    quit_init_loop = true;
                break;

                case EventMode.Battle:
                    await battleEvent(obj_content, true);
                return;

                case EventMode.OochamonPick:
                    await oochPickEvent(obj_content, true);
                    quit_init_loop = true;
                break;
                
                case EventMode.Flags: 
                    await flagEvent(obj_content);
                break;

                case EventMode.Transition:
                    await transitionEvent(obj_content);
                break;

                case EventMode.Objective:
                    objectiveEvent(obj_content);
                break;

                case EventMode.Options:
                    optionsEvent(obj_content, true);
                    quit_init_loop = true;
                break;

                case EventMode.Wait:
                    await waitEvent(obj_content);
                break;

                case EventMode.AddAlly:
                case EventMode.RemoveAlly:
                    allyChangeEvent(obj_content, event_mode);
                break;

                case EventMode.BattleGroupStart:
                    await battleGroupEvent();
                break;
            }

            // If we are at the end of the event_array, quit out entirely
            if ([EventMode.Transition, EventMode.Flags, EventMode.Objective].includes(event_mode)) {

                if (current_place + 1 == event_array.length) {
                    db.profile.set(user_id, PlayerState.Playspace, 'player_state');
                    db.profile.set(user_id, false, 'cur_event_name');
                    db.profile.set(user_id, [], 'cur_event_array');
                    db.profile.set(user_id, 0, 'cur_event_pos');
                    let playspace_str = setup_playspace_str(user_id);
                    await thread.messages.fetch(msg_to_edit).then((msg) => {
                        msg.edit({ content: playspace_str[0], components: playspace_str[1] });
                    }).catch(() => {});
                    //await move(thread, user_id, '', 1);
                    return;
                }
            }

            if (quit_init_loop == false) {
                current_place++;
                db.profile.set(user_id, current_place, 'cur_event_pos');
            }
        }

        //Send Embed and Await user input before proceeding
        let msg = await thread.send({ embeds: [event_embed], components: [event_buttons], files: imageFiles });
        if (msg_to_edit == false) {
            await db.profile.set(user_id, msg.id, 'display_msg_id');
            profile_data = await db.profile.get(user_id);
            msg_to_edit = profile_data.display_msg_id;
        }

        // Hide movement buttons
        if (event_name !== 'ev_intro') {
            await thread.messages.fetch(msg_to_edit).then(async (msg) => {
                await msg.edit({ components: [] }).catch(() => {});
            }).catch(() => {});
        }

        const confirm_collector = await msg.createMessageComponentCollector({ filter });

        await confirm_collector.on('collect', async sel => {
            let quit = false;
            imageFiles = [];

            // If we collect an Oochamon data type, handle that first then move on
            if (sel.customId.includes('ooch')) {
                let oochChoices = event_array[current_place][1].options.map(v => v = v.id);
                let oochButtonData = sel.customId.split('|');

                // Oochadex update
                for (ooch_id of oochChoices) {
                    if (ooch_id == parseInt(oochButtonData[1])) {
                        db.profile.math(user_id, '+', 1, `oochadex[${ooch_id}].caught`);
                    }
                }

                let ooch = create_ooch(oochButtonData[1], oochButtonData[2], oochButtonData[3].split(','), oochButtonData[4], 0, oochButtonData[5],
                                       oochButtonData[6], oochButtonData[7], oochButtonData[8], oochButtonData[9]);
                // Have it check here if you want to send the Oochamon to your party or not
                if (db.profile.get(user_id, 'ooch_party').length < 4) {
                    db.profile.push(user_id, ooch, `ooch_party`);
                } else {
                    db.profile.push(user_id, ooch, `ooch_pc`)
                }
            } else if (sel.customId.includes('option')) {
                let optionButtonData = sel.customId.split('|');
                
                let eventName = optionButtonData[1];
                let buttonPrice = optionButtonData[2];

                // Remove price
                db.profile.math(user_id, '-', buttonPrice, 'oochabux');
                profile_data.oochabux -= buttonPrice;

                if (eventName != false) {
                    current_place = event_array.length;
                    await functions.event_process(user_id, thread, db.events_data.get(eventName), 0, eventName);
                }
            }

            current_place++;
            db.profile.set(user_id, current_place, 'cur_event_pos');

            // Check if we are at the end of the event array, and if we are, cut back to the normal player state.
            if (current_place >= event_array.length) {
                await confirm_collector.stop();
                if (msg.id !== msg_to_edit) await msg.delete();
                db.profile.set(user_id, PlayerState.Playspace, 'player_state');
                db.profile.set(user_id, false, 'cur_event_name');
                db.profile.set(user_id, [], 'cur_event_array');
                db.profile.set(user_id, 0, 'cur_event_pos');
                let playspace_str = setup_playspace_str(user_id);
                await thread.messages.fetch(msg_to_edit).then((msg) => {
                    msg.edit({ content: playspace_str[0], components: playspace_str[1], embeds: [] });
                }).catch(() => {});
                return;
            }

            while (!quit) {
                event_mode = event_array[current_place][0];
                obj_content = event_array[current_place][1];

                //Customize Embed
                switch (event_mode) {
                    //Basic Text Event
                    case EventMode.Dialogue: 
                        quit = true;
                        await dialogueEvent(obj_content);
                        await sel.update({ embeds: [event_embed], components: [next_buttons], files: imageFiles });
                    break;

                    case EventMode.Battle:
                        quit = true;
                        await battleEvent(obj_content);
                    break;

                    case EventMode.OochamonPick:
                        quit = true;
                        await oochPickEvent(obj_content);
                        sel.update({ embeds: [event_embed], components: [oochamonPicks], files: imageFiles });
                    break;

                    //No Visual representation, just sets appropriate flags in the player
                    case EventMode.Flags: 
                        await flagEvent(obj_content);
                    break;

                    case EventMode.Transition:
                        await transitionEvent(obj_content);
                    break;

                    case EventMode.Objective:
                        objectiveEvent(obj_content);
                    break;

                    case EventMode.Options:
                        quit = true;
                        optionsEvent(obj_content);
                        sel.update({ embeds: [event_embed], components: [optionsRow], files: imageFiles });
                    break;

                    case EventMode.Wait:
                        await waitEvent(obj_content);
                    break;

                    case EventMode.AddAlly:
                    case EventMode.RemoveAlly:
                        allyChangeEvent(obj_content, event_mode);
                    break;

                    case EventMode.BattleGroupStart:
                        quit = true;
                        battleGroupEvent();
                    break;
                }

                if ([EventMode.Transition, EventMode.Flags, EventMode.Objective, EventMode.AddAlly, EventMode.RemoveAlly].includes(event_mode)) {
                    // If we are at the end of the event_array, quit out entirely
                    if (current_place + 1 == event_array.length) {
                        // Manual event check just to help reset us back for the tutorial
                        if (event_name == 'ev_tutorial_8') {
                            let ooch_party = db.profile.get(user_id, 'ooch_party');
                            // Remove Vrumbox
                            ooch_party = ooch_party.filter(v => v.id !== 52);
                            let mainOoch = ooch_party[0];
                            let mainOochFixed = create_ooch(mainOoch.id, 5, [], mainOoch.nickname, 0, mainOoch.ability, 5, 5, 5, 5);
                            ooch_party[0] = mainOochFixed;
                            db.profile.set(user_id, ooch_party, 'ooch_party')

                            // Reset other values upon tutorial completion
                            db.profile.set(user_id, 0, 'oochabux');
                            db.profile.set(user_id, {}, 'other_inv')
                            db.profile.set(user_id, {}, 'prism_inv')
                            db.profile.set(user_id, {}, 'heal_inv')
                            db.profile.set(user_id, 0, `oochadex[52].caught`);
                        }

                        await confirm_collector.stop();
                        if (msg.id != msg_to_edit) await msg.delete();
                        await db.profile.set(user_id, PlayerState.Playspace, 'player_state');
                        await db.profile.set(user_id, false, 'cur_event_name');
                        await db.profile.set(user_id, [], 'cur_event_array');
                        await db.profile.set(user_id, 0, 'cur_event_pos');
                        quit = true; 
                        let playspace_str = setup_playspace_str(user_id);
                        await thread.messages.fetch(msg_to_edit).then(async (msg) => {
                            await msg.edit({ content: playspace_str[0], components: playspace_str[1], embeds: [] });
                        }).catch((err) => { console.log(err) });

                        await move(thread, user_id, '', 2);
                        return;
                    } else {
                        current_place++;
                        db.profile.set(user_id, current_place, 'cur_event_pos');
                    }
                }
            
            }
        });
    },

    /**
     * Converts an NPC into an event array for use with event_process.
     * @param {Array} npc_obj the NPC object we want to create the event array for
     * @param {String} user_id The user id of the user interacting with the NPC
     */
    event_from_npc: async function(npc_obj, user_id) {
        let npc_flag = `${Flags.NPC}${npc_obj.name}${npc_obj.npc_id}`; //Flag generated for this npc at this position
        let return_array = [];
        let user_flags = db.profile.get(user_id, 'flags');
        let battle_npc = npc_obj.team.length != 0;
        let flags_to_give = []

        //Set any post-default dialogue flags
        if (npc_obj.flag_given != false) {
            flags_to_give.push(npc_obj.flag_given)
        }

        //Set any post-combat_flags
        flags_to_give.push(npc_flag)

        let player_location = db.profile.get(user_id, 'location_data');
        let map_obj = db.maps.get(player_location.area.toLowerCase());
        let map_weather = map_obj.map_weather;
        let weather_options = []
        let px = player_location.x;
        let py = player_location.y;
        for(let w of map_weather) {
            if(px >= w.x && py >= w.y &&
                px <= w.x + w.width && py <= w.y + w.height
            ){
                weather_options.push(w.weather_name);
            }
        }
        
        let battle_weather = weather_options.length > 0 ? _.sample(weather_options) : Weather.None
        npc_obj.battle_weather = battle_weather;

        // Set the dialogue to be properly formatted
        // Sign NPCs should display all their info at once
        npc_obj.pre_combat_dialogue = npc_obj.name == 'Sign' ? [npc_obj.pre_combat_dialogue] : npc_obj.pre_combat_dialogue.split('\n');
        npc_obj.post_combat_dialogue = npc_obj.name == 'Sign' ? [npc_obj.post_combat_dialogue] : npc_obj.post_combat_dialogue.split('\n');
        
        // If we don't have the NPCs flag, it means they haven't been beaten yet.
        if (!user_flags.includes(npc_flag) && battle_npc == true) {
            //Pre-combat dialogue
            for (let i = 0; i < npc_obj.pre_combat_dialogue.length; i++) {
                if (npc_obj.pre_combat_dialogue[i] == '') continue;
                return_array.push([EventMode.Dialogue, {
                    title: npc_obj.name,
                    description: npc_obj.pre_combat_dialogue[i],
                    money: 0,
                    image: false,
                    items: false,
                    flags: [],
                    objective: false,
                    dialogue_portrait: npc_obj.sprite_dialog == false ? `NPC|${npc_obj.sprite_id.slice(0, 1) + npc_obj.sprite_id.slice(3)}.png` : `${npc_obj.sprite_dialog}.png`,
                }])
            }

            //Setup a battle
            return_array.push([EventMode.Battle, npc_obj])

        } else if (battle_npc == false && !user_flags.includes(npc_flag)) {
            // If this NPC isn't a battle NPC and the user doesn't yet have their flag (meaning they haven't interacted with them yet)
            // we should throw their pre interaction dialogue into the event_array. Otherwise, we don't include it.
            // Also put their designated items and money at the end of their dialogue.
            for (let i = 0; i < npc_obj.pre_combat_dialogue.length; i++) {
                if (npc_obj.pre_combat_dialogue[i] == '') continue;
                return_array.push([EventMode.Dialogue, {
                    title: npc_obj.name,
                    description: npc_obj.pre_combat_dialogue[i],
                    money: (i+1 == npc_obj.pre_combat_dialogue.length) ? npc_obj.coin : 0,
                    items: (i+1 == npc_obj.pre_combat_dialogue.length) ? (npc_obj.items.length > 0 ? npc_obj.items : false) : false,
                    image: false,
                    objective: false,
                    dialogue_portrait: npc_obj.sprite_dialog == false ? `NPC|${npc_obj.sprite_id.slice(0, 1) + npc_obj.sprite_id.slice(3)}.png` : `${npc_obj.sprite_dialog}.png`,
                    flags : flags_to_give
                }]);
            }
        }

        //Set any post-default dialogue flags
        if (npc_obj.flag_given != false) {
            return_array.push([EventMode.Flags, { text: npc_obj.flag_given }]);
        }

        //Set any post-combat_flags
        return_array.push([EventMode.Flags, { text: npc_flag }]);

        //Post-combat (or post interaction) text.
        // If we are not a battle NPC and the user DOES have this NPCs flag, we should include
        // the post interaction dialogue. Otherwise, don't include it.
        // If we are a battle NPC, include post combat dialogue as it is necessary for the flow.
        if ((battle_npc == true) || (battle_npc == false && user_flags.includes(npc_flag))) {
            for (let i = 0; i < npc_obj.post_combat_dialogue.length; i++) {
                // If we are on the last dialogue, and the user has not interacted with this NPC, and the NPC is a battle NPC,
                // put their designated items at the end of their dialogue.
                if (i+1 == npc_obj.post_combat_dialogue.length && !user_flags.includes(npc_flag) && battle_npc == true) {
                    if (npc_obj.post_combat_dialogue[i] == '') continue;
                    return_array.push([EventMode.Dialogue, {
                        title: npc_obj.name,
                        description: npc_obj.post_combat_dialogue[i],
                        money: 0,
                        items: (npc_obj.items.length > 0 ? npc_obj.items : false),
                        image: false,
                        objective: false,
                        dialogue_portrait: npc_obj.sprite_dialog == false ? `NPC|${npc_obj.sprite_id.slice(0, 1) + npc_obj.sprite_id.slice(3)}.png` : `${npc_obj.sprite_dialog}.png`,
                        flags : flags_to_give
                    }])
                } else {
                    if (npc_obj.post_combat_dialogue[i] == '') continue;
                    return_array.push([EventMode.Dialogue, {
                        title: npc_obj.name,
                        description: npc_obj.post_combat_dialogue[i],
                        money: 0,
                        image: false,
                        items: false,
                        objective: false,
                        dialogue_portrait: npc_obj.sprite_dialog == false ? `NPC|${npc_obj.sprite_id.slice(0, 1) + npc_obj.sprite_id.slice(3)}.png` : `${npc_obj.sprite_dialog}.png`,
                        flags: []
                    }])
                }
            }
        }

        return return_array;
    }

}

module.exports = functions;