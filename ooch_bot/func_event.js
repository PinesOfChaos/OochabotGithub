const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const db = require('./db.js');
const _ = require('lodash');
const { PlayerState, TypeEmote, EventMode, DialogueType, Flags } = require('./types.js');

module.exports = {
    /**
     * Runs an event based on event array
     * @param {String} message The thread currently being played in
     * @param {Array} event_array The event array.
     * @param {Number} start_pos The position to start in the event array (defaults to 0)
     */
    event_process: async function(message, event_array, start_pos = 0) {

        const { setup_battle } = require('./func_battle.js');

        let next_buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId('next').setEmoji('▶').setStyle(ButtonStyle.Success),
            );

        // Switch state to dialogue
        db.profile.set(message.author.id, PlayerState.Dialogue, 'player_state');

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

        while (event_mode == EventMode.Flags) {
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
                    db.profile.set(message.author.id, event_array, 'npc_event_data');
                    db.profile.set(message.author.id, current_place, 'npc_event_pos');
                    // Setup the battle
                    await setup_battle(message.channel, message.author.id, obj_content, true);
                break;

                //No Visual representation, just gives appropriate flags in the player if they don't already have them
                case EventMode.Flags: 
                    let flags = db.profile.get(message.author.id, 'flags');
                    if(!flags.includes(obj_content)){
                        flags.push(obj_content);
                    }
                    db.profile.set(message.author.id, flags, 'flags');
                break;
            }
            current_place++;
        }

        //Send Embed and Await user input before proceeding
        let msg = await message.channel.send({ embeds: [event_embed], components: [next_buttons] })
        let filter = i => i.user.id == message.author.id;
        const confirm_collector = await msg.createMessageComponentCollector({ filter });

        await confirm_collector.on('collect', async sel => {
            let wait_for_input = false;
            current_place++;

            // Check if we are at the end of the event array, and if we are, cut back to the normal player state.
            if (current_place >= event_array.length) {
                await confirm_collector.stop();
                await msg.delete();
                db.profile.set(message.author.id, PlayerState.Playspace, 'player_state');
                return;
            }

            console.log('Running Event', current_place);

            event_mode = event_array[current_place][0];
            obj_content = event_array[current_place][1];

            while (!wait_for_input) {
                event_mode = event_array[current_place][0];
                obj_content = event_array[current_place][1];

                //Customize Embed
                switch (event_mode) {
                    //Basic Text Event
                    case EventMode.Text: 
                        wait_for_input = true;
                        event_embed
                            .setTitle(obj_content.title)
                            .setDescription(obj_content.description);

                        sel.update({ embeds: [event_embed], components: [next_buttons] })
                    break;

                    case EventMode.BattleTrainer:
                        wait_for_input = true;
                        // Hold the data related to our current NPC event in our profile, so we can access it post battle.
                        db.profile.set(message.author.id, event_array, 'npc_event_data');
                        db.profile.set(message.author.id, current_place, 'npc_event_pos');
                        // Delete the embed message to prep for battle, and kill the collector as well.
                        await msg.delete();
                        confirm_collector.stop();
                        // Setup the battle
                        await setup_battle(message.channel, message.author.id, obj_content, true);
                    break;

                    //No Visual representation, just sets appropriate flags in the player
                    case EventMode.Flags: 
                        wait_for_input = false;
                        // TODO: Set flags
                    break;
                }
            }
        });
    },

    /**
     * Converts NPC  into an Event
     * @param {Array} npc_obj NPC object
     * @param {Array} beaten has this NPC been beaten
     */
    event_from_npc: function(npc_obj, beaten = false){

        const { generate_trainer_battle } = require('./func_battle.js');

        let npc_flag = `${Flags.NPC}${npc_obj.name}${npc_obj.x}${npc_obj.y}`; //Flag generated for this npc at this position
        let return_array = [];
        
        if(!beaten){
            //Pre-combat dialogue
            for(let i = 0; i < npc_obj.pre_combat_dialogue.length; i++){
                return_array.push([EventMode.Text , {
                    title: npc_obj.name,
                    description: npc_obj.pre_combat_dialogue[i]
                }])
            }

            //Setup a battle if applicable
            if(npc_obj.team.length > 0){
                return_array.push([EventMode.BattleTrainer, generate_trainer_battle(npc_obj)])
            }
        }

        //Set any post-default dialogue flags
        if(npc_obj.flag_given != -1){
            return_array.push([EventMode.Flags, npc_obj.flag_given]);
        }

        //Set any post-combat_flags
            return_array.push([EventMode.Flags, npc_flag]);

        //Post-combat text
        for(let i = 0; i < npc_obj.player_won_dialogue.length; i++){
            return_array.push([EventMode.Text , {
                title: npc_obj.name,
                description: npc_obj.player_won_dialogue[i]
            }])
        }

        return return_array;
    }

}