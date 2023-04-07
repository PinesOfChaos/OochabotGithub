const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const db = require('./db.js');
const _ = require('lodash');
const { PlayerState, TypeEmote, EventMode, DialogueType, Flags } = require('./types.js');

module.exports = {
    /**
     * Runs an event based on event array
     * @param {String} user_id The ID of the user who called the event.
     * @param {String} channel The main channel that Oochamon is being played in.
     * @param {Array} event_array The event array.
     * @param {Number} start_pos The position to start in the event array (defaults to 0)
     */
    event_process: async function(user_id, channel, event_array, start_pos = 0) {

        const { setup_battle } = require('./func_battle.js');

        console.log(event_array);

        let next_buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId('next').setEmoji('▶').setStyle(ButtonStyle.Success),
            );

        // Switch state to dialogue
        db.profile.set(user_id, PlayerState.Dialogue, 'player_state');

        let current_place = start_pos;
        let event_mode = event_array[current_place][0];
        let obj_content = event_array[current_place][1];
        let placeholder_title = 'Error';
        let placeholder_desc = 'Error';
        if (event_mode == EventMode.Text) {
            if (obj_content.description == '') obj_content.description = ' ';
            placeholder_title = obj_content.title;
            placeholder_desc = obj_content.description;
        }

        let event_embed = new EmbedBuilder()
            .setColor('#808080')
            .setTitle(placeholder_title)
            .setDescription(placeholder_desc)

        while (event_mode == EventMode.Flags || event_mode == EventMode.BattleTrainer) {
            event_mode = event_array[current_place][0];
            obj_content = event_array[current_place][1];
            switch (event_mode) {
                //Basic Text Event
                case EventMode.Text: 
                    if (obj_content.description == '') obj_content.description = ' ';
                    event_embed
                        .setTitle(obj_content.title)
                        .setDescription(obj_content.description);
                break;
                case EventMode.BattleTrainer:
                    // Hold the data related to our current NPC event in our profile, so we can access it post battle.
                    db.profile.set(user_id, event_array, 'npc_event_data');
                    db.profile.set(user_id, current_place+1, 'npc_event_pos');
                    // Setup the battle
                    await setup_battle(channel, user_id, obj_content, true);
                    return;
                break;

                //No Visual representation, just gives appropriate flags in the player if they don't already have them
                case EventMode.Flags: 
                    let flags = db.profile.get(user_id, 'flags');
                    if( !flags.includes(obj_content)) {
                        db.profile.push(user_id, obj_content, 'flags');
                    }
                    // If we are at the end of the event_array, quit out entirely
                    if (current_place + 1 == event_array.length) {
                        db.profile.set(user_id, PlayerState.Playspace, 'player_state');
                        return;
                    }
                break;
            }
            current_place++;
        }

        //Send Embed and Await user input before proceeding
        let msg = await channel.send({ embeds: [event_embed], components: [next_buttons] })
        let filter = i => i.user.id == user_id;
        const confirm_collector = await msg.createMessageComponentCollector({ filter });

        await confirm_collector.on('collect', async sel => {
            let quit = false;
            current_place++;

            // Check if we are at the end of the event array, and if we are, cut back to the normal player state.
            if (current_place >= event_array.length) {
                await confirm_collector.stop();
                await msg.delete();
                db.profile.set(user_id, PlayerState.Playspace, 'player_state');
                return;
            }

            event_mode = event_array[current_place][0];
            obj_content = event_array[current_place][1];

            while (!quit) {
                event_mode = event_array[current_place][0];
                obj_content = event_array[current_place][1];

                //Customize Embed
                switch (event_mode) {
                    //Basic Text Event
                    case EventMode.Text: 
                        quit = true;
                        event_embed
                            .setTitle(obj_content.title)
                            .setDescription(obj_content.description);

                        sel.update({ embeds: [event_embed], components: [next_buttons] })
                    break;

                    case EventMode.BattleTrainer:
                        quit = true;
                        // Hold the data related to our current NPC event in our profile, so we can access it post battle.
                        db.profile.set(user_id, event_array, 'npc_event_data');
                        db.profile.set(user_id, current_place + 1, 'npc_event_pos'); // Store the position as the event AFTER this one, so we can start there when we restart the event process
                        // Delete the embed message to prep for battle, and kill the collector as well.
                        await msg.delete();
                        confirm_collector.stop();
                        // Setup the battle
                        await setup_battle(channel, user_id, obj_content, true);
                    break;

                    //No Visual representation, just sets appropriate flags in the player
                    case EventMode.Flags: 
                        let flags = db.profile.get(user_id, 'flags');
                        if( !flags.includes(obj_content)) {
                            db.profile.push(user_id, obj_content, 'flags');
                        }

                        // If we are at the end of the event_array, quit out entirely
                        if (current_place + 1 == event_array.length) {
                            await confirm_collector.stop();
                            await msg.delete();
                            db.profile.set(user_id, PlayerState.Playspace, 'player_state');
                            quit = true;
                            return;
                        }
                    break;
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
        
        // If we don't have the NPCs flag, it means they haven't been beaten yet.
        if (!user_flags.includes(npc_flag) && npc_obj.battle_npc == true) {
            //Pre-combat dialogue
            for (let i = 0; i < npc_obj.pre_combat_dialogue.length; i++) {
                return_array.push([EventMode.Text, {
                    title: npc_obj.name,
                    description: npc_obj.pre_combat_dialogue[i]
                }])
            }

            //Setup a battle
            return_array.push([EventMode.BattleTrainer, generate_trainer_battle(npc_obj)])

        } else if (npc_obj.battle_npc == false && !user_flags.includes(npc_flag)) {
            // If this NPC isn't a battle NPC and the user doesn't yet have their flag (meaning they haven't interacted with them yet)
            // we should throw their pre interaction dialogue into the event_array. Otherwise, we don't include it.
            for (let i = 0; i < npc_obj.pre_combat_dialogue.length; i++) {
                return_array.push([EventMode.Text, {
                    title: npc_obj.name,
                    description: npc_obj.pre_combat_dialogue[i]
                }])
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
        if ((npc_obj.battle_npc == true) || (npc_obj.battle_npc == false && user_flags.includes(npc_flag))) {
            for (let i = 0; i < npc_obj.post_combat_dialogue.length; i++) {
                return_array.push([EventMode.Text, {
                    title: npc_obj.name,
                    description: npc_obj.post_combat_dialogue[i]
                }])
            }
        }

        return return_array;
    }

}