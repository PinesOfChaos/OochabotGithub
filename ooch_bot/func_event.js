const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const db = require('./db.js');
const _ = require('lodash');
const { PlayerState, EventMode, Flags } = require('./types.js');
const { get_art_file } = require('./func_other.js');

module.exports = {
    /**
     * Runs an event based on event array
     * @param {String} user_id The ID of the user who called the event.
     * @param {Object} thread The main thread that Oochamon is being played in.
     * @param {Array} event_array The event array.
     * @param {Number} start_pos The position to start in the event array (defaults to 0)
     */
    event_process: async function(user_id, thread, event_array, start_pos = 0) {

        const { setup_battle } = require('./func_battle.js');
        const { give_item, setup_playspace_str, create_ooch } = require('./func_play.js');

        let next_buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId('next').setEmoji('▶').setStyle(ButtonStyle.Success),
            );

        let current_place = start_pos;
        let event_mode = event_array[current_place][0];
        let obj_content = event_array[current_place][1];
        let placeholder_desc = 'Error';
        let info_data;
        let quit_init_loop = false;
        let profile_data = db.profile.get(user_id);
        let msg_to_edit = profile_data.display_msg_id;
        let imageFiles = [];
        let filter = i => i.user.id == user_id;
        let oochamonPicks = new ActionRowBuilder();
    
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
                switch (dialogue_var) {
                    case 'player':
                        obj_content.description = obj_content.description.replace('{player}', thread.guild.members.cache.get(user_id).displayName);
                    break;
                }
            }

            event_embed.setDescription(obj_content.description);

            if (obj_content.title != '') {
                event_embed.setTitle(obj_content.title);
            }

            // Set NPC dialogue portrait
            if (obj_content.dialogue_portrait != '') {
                
                if (obj_content.dialogue_portrait.includes('NPC|')) {
                    event_embed.setThumbnail(`attachment://${obj_content.dialogue_portrait.split('|')[1]}`)
                    imageFiles.push(get_art_file(`./Art/NPCs/${obj_content.dialogue_portrait.split('|')[1]}`));
                } else {
                    event_embed.setThumbnail(`attachment://${obj_content.dialogue_portrait}`)
                    imageFiles.push(get_art_file(`./Art/EventImages/Portraits/${obj_content.dialogue_portrait}`));
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
            }

            if (info_data.length != 0) {
                event_embed.addFields({name: 'You Received:', value: info_data });
            } else if (event_embed.data.fields != undefined) {
                event_embed.data.fields = event_embed.data.fields.filter(field => field.name !== 'You Received:');
            }
        }

        async function battleEvent(obj_content, initial=false) {
            // Hold the data related to our current NPC event in our profile, so we can access it post battle.
            db.profile.set(user_id, event_array, 'npc_event_data');
            db.profile.set(user_id, current_place+1, 'npc_event_pos');

            if (initial == false) {
                // Delete the embed message to prep for battle, and kill the collector as well.
                await msg.delete();
                if (confirm_collector !== undefined) confirm_collector.stop();
            }

            // Setup the battle
            await setup_battle(thread, user_id, obj_content, true);
        }

        async function oochPickEvent(obj_content, initial=false) {
            oochamonPicks = new ActionRowBuilder();

            for (let ooch of obj_content.options) {
                let oochData = db.monster_data.get(ooch.id)
                oochamonPicks.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`ooch|${ooch.id}|${ooch.level}|${ooch.moveset.join(',')}|${ooch.nickname}|${ooch.ability}|${ooch.hp_iv}|${ooch.atk_iv}|${ooch.def_iv}|${ooch.spd_iv}`)
                        .setLabel(`${oochData.name}`)
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji(`${oochData.emote}`),
                );
            }

            event_embed.setTitle(obj_content.title);
            event_embed.setDescription(obj_content.description);
        }

        function flagEvent(obj_content) {
            let flags = db.profile.get(user_id, 'flags');
            if (!flags.includes(obj_content)) {
                db.profile.push(user_id, obj_content, 'flags');
            }
        }

        async function transitionEvent(obj_content) {
            //remove the player's info from the old biome and add it to the new one
            let ogBiome = db.profile.get(user_id, 'location_data.area');
            let mapData = db.maps.get(db.maps.get(obj_content.map_to));
            db.player_positions.set(obj_content.map_to, { x: obj_content.xto, y: obj_content.yto }, user_id);
            db.player_positions.delete(ogBiome, user_id);
            db.profile.set(user_id, { area: obj_content.map_to, x: obj_content.xto, y: obj_content.yto }, 'location_data')

            let msg_to_edit = db.profile.get(user_id, 'display_msg_id');
            (interaction.channel.messages.fetch(msg_to_edit)).then((msg) => {
                msg.edit({ content: map_emote_string(obj_content.map_to, mapData, obj_content.xto, obj_content.yto, user_id) });
            });
        }

        function objectiveEvent(obj_content) {
            db.profile.set(user_id, obj_content, 'objective');
        }

        function optionsEvent(obj_content, initial=false) {
            // TODO: Make this work
            console.log('Oops! Not working yet!')
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

                case EventMode.BattleTrainer:
                    await battleEvent(obj_content, true);
                return;

                case EventMode.OochamonPick:
                    await oochPickEvent(obj_content, true);
                    quit_init_loop = true;
                break;
                
                case EventMode.Flags: 
                    flagEvent(obj_content);
                break;

                case EventMode.Transition:
                    await transitionEvent(obj_content);
                break;

                case EventMode.Objective:
                    objectiveEvent(obj_content);
                break;

                case EventMode.Options:
                    optionsEvent(obj_content);
                    quit_init_loop = true;
                break;
            }

            // If we are at the end of the event_array, quit out entirely
            if ([EventMode.Transition, EventMode.Flags, EventMode.Objective].includes(event_mode)) {
                if (current_place + 1 == event_array.length) {
                    db.profile.set(user_id, PlayerState.Playspace, 'player_state');
                    let playspace_str = setup_playspace_str(user_id);
                    await thread.messages.fetch(msg_to_edit).then((msg) => {
                        msg.edit({ content: playspace_str[0], components: playspace_str[1] });
                    }).catch(() => {});
                    return;
                }
            }

            if (quit_init_loop == false) current_place++;
        }

        //Send Embed and Await user input before proceeding
        let msg = await thread.send({ embeds: [event_embed], components: [next_buttons], files: imageFiles })
        if (msg_to_edit == false) {
            db.profile.set(user_id, msg.id, 'display_msg_id');
            profile_data = db.profile.get(user_id);
            msg_to_edit = profile_data.display_msg_id;
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
                    db.profile.math(user_id, '+', 1, `oochadex[${ooch_id}].seen`);
                    if (ooch_id == oochButtonData[0]) {
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
            }

            current_place++;

            // Check if we are at the end of the event array, and if we are, cut back to the normal player state.
            if (current_place >= event_array.length) {
                await confirm_collector.stop();
                if (msg.id !== msg_to_edit) await msg.delete();
                db.profile.set(user_id, PlayerState.Playspace, 'player_state');
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

                    case EventMode.BattleTrainer:
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
                        flagEvent(obj_content);
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
                    break;
                }

                if ([EventMode.Transition, EventMode.Flags, EventMode.Objective].includes(event_mode)) {
                    // If we are at the end of the event_array, quit out entirely
                    if (current_place + 1 == event_array.length) {
                        await confirm_collector.stop();
                        if (msg.id != msg_to_edit) await msg.delete();
                        db.profile.set(user_id, PlayerState.Playspace, 'player_state');
                        quit = true; 
                        let playspace_str = setup_playspace_str(user_id);
                        await thread.messages.fetch(msg_to_edit).then(async (msg) => {
                            await msg.edit({ content: playspace_str[0], components: playspace_str[1], embeds: [] });
                        }).catch((err) => { console.log(err) });
                        return;
                    } else {
                        current_place++;
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
    event_from_npc: function(npc_obj, user_id) {

        const { generate_trainer_battle } = require('./func_battle.js');
        let npc_flag = `${Flags.NPC}${npc_obj.name}${npc_obj.x}${npc_obj.y}`; //Flag generated for this npc at this position
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
        
        // If we don't have the NPCs flag, it means they haven't been beaten yet.
        if (!user_flags.includes(npc_flag) && battle_npc == true) {
            //Pre-combat dialogue
            for (let i = 0; i < npc_obj.pre_combat_dialogue.length; i++) {
                return_array.push([EventMode.Dialogue, {
                    title: npc_obj.name,
                    description: npc_obj.pre_combat_dialogue[i],
                    money: 0,
                    image: false,
                    items: false,
                    flags: [],
                    objective: false,
                    dialogue_portrait: npc_obj.sprite_dialogue === false ? `NPC|${npc_obj.sprite_id.slice(0, 1) + npc_obj.sprite_id.slice(3)}.png` : `${npc_obj.sprite_dialogue}.png`,
                }])
            }

            //Setup a battle
            return_array.push([EventMode.BattleTrainer, generate_trainer_battle(npc_obj)])

        } else if (battle_npc == false && !user_flags.includes(npc_flag)) {
            // If this NPC isn't a battle NPC and the user doesn't yet have their flag (meaning they haven't interacted with them yet)
            // we should throw their pre interaction dialogue into the event_array. Otherwise, we don't include it.
            // Also put their designated items and money at the end of their dialogue.
            for (let i = 0; i < npc_obj.pre_combat_dialogue.length; i++) {
                return_array.push([EventMode.Dialogue, {
                    title: npc_obj.name,
                    description: npc_obj.pre_combat_dialogue[i],
                    money: (i+1 == npc_obj.pre_combat_dialogue.length) ? npc_obj.coin : 0,
                    items: (i+1 == npc_obj.pre_combat_dialogue.length) ? (npc_obj.item_count > 0 ? { item_id: npc_obj.item_id, item_count: npc_obj.item_count } : false) : false,
                    image: false,
                    objective: false,
                    dialogue_portrait: npc_obj.sprite_dialogue === false ? `NPC|${npc_obj.sprite_id.slice(0, 1) + npc_obj.sprite_id.slice(3)}.png` : `${npc_obj.sprite_dialogue}.png`,
                    flags : flags_to_give
                }]);
            }
        }

        //Set any post-default dialogue flags
        if (npc_obj.flag_given != false) {
            return_array.push([EventMode.Flags, npc_obj.flag_given]);
        }

        //Set any post-combat_flags
        return_array.push([EventMode.Flags, npc_flag]);

        //Post-combat (or post interaction) text.
        // If we are not a battle NPC and the user DOES have this NPCs flag, we should include
        // the post interaction dialogue. Otherwise, don't include it.
        // If we are a battle NPC, include post combat dialogue as it is necessary for the flow.
        if ((battle_npc == true) || (battle_npc == false && user_flags.includes(npc_flag))) {
            for (let i = 0; i < npc_obj.post_combat_dialogue.length; i++) {
                // If we are on the last dialogue, and the user has not interacted with this NPC, and the NPC is a battle NPC,
                // put their designated items at the end of their dialogue.
                if (i+1 == npc_obj.post_combat_dialogue.length && !user_flags.includes(npc_flag) && battle_npc == true) {
                    return_array.push([EventMode.Dialogue, {
                        title: npc_obj.name,
                        description: npc_obj.post_combat_dialogue[i],
                        money: 0,
                        items: (npc_obj.item_count > 0 ? { item_id: npc_obj.item_id, item_count: npc_obj.item_count } : false),
                        image: false,
                        objective: false,
                        dialogue_portrait: npc_obj.sprite_dialogue === false ? `NPC|${npc_obj.sprite_id.slice(0, 1) + npc_obj.sprite_id.slice(3)}.png` : `${npc_obj.sprite_dialogue}.png`,
                        flags : flags_to_give
                    }])
                } else {
                    return_array.push([EventMode.Dialogue, {
                        title: npc_obj.name,
                        description: npc_obj.post_combat_dialogue[i],
                        money: 0,
                        image: false,
                        items: false,
                        objective: false,
                        dialogue_portrait: npc_obj.sprite_dialogue === false ? `NPC|${npc_obj.sprite_id.slice(0, 1) + npc_obj.sprite_id.slice(3)}.png` : `${npc_obj.sprite_dialogue}.png`,
                        flags: []
                    }])
                }
            }
        }

        return return_array;
    }

}