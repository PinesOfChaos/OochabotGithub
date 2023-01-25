const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const db = require('./db.js');
const _ = require('lodash');
const { PlayerState, TypeEmote, EventMode, DialogueType } = require('./types.js');

module.exports = {
    /**
     * Runs an event based on event array
     * @param {String} message The thread currently being played in
     * @param {Array} event_array The event array.
     * @param {Number} start_pos The position to start in the event array (defaults to 0)
     */
    event_process: async function(message, event_array, start_pos = 0) {

        let next_buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId('next').setEmoji('▶').setStyle(ButtonStyle.Success),
            );

        // Switch state to dialogue
        db.profile.set(message.author.id, PlayerState.Dialogue, 'player_state');

        let current_place = start_pos;
        let event_mode = event_array[current_place][0];
        let obj_content = event_array[current_place][1];
        let event_embed = new EmbedBuilder()
            .setColor('#808080')
            .setTitle(`Error`);

        while (event_mode == EventMode.Flags) {
            event_mode = event_array[current_place][0];
            obj_content = event_array[current_place][1];
            switch (event_mode) {
                //Basic Text Event
                case EventMode.Text: 
                    event_embed
                        .setTitle(obj_content.title)
                        .setDescription(obj_content.description);
                break;

                //No Visual representation, just sets appropriate flags in the player
                case EventMode.Flags: 
                    // TODO: Set flags
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
            event_mode = event_array[current_place][0];
            obj_content = event_array[current_place][1];

            if (current_place >= event_array.length) {
                await confirm_collector.stop();
                await msg.delete();
                db.profile.set(message.author.id, PlayerState.Playspace, 'player_state');
                return;
            }
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
                    break;

                    //No Visual representation, just sets appropriate flags in the player
                    case EventMode.Flags: 
                        wait_for_input = false;
                        // TODO: Set flags
                    break;
                }
                current_place++;
            }

            sel.update({ embeds: [event_embed], components: [next_buttons] })
        });
    },

    /**
     * Converts NPC dialogue into an Event
     * @param {Array} dialogue_array NPC dialogue array
     */
    event_from_dialogue: function(name, dialogue_array, post_event_flag = -1){
        let return_array = [];
        let i = 0;
        for(i = 0; i < dialogue_array.length; i++){
            return_array[i] = [EventMode.Text , {
                title: name,
                description: dialogue_array[i]
            }]
        }
        if(post_event_flag != -1){
            return_array.push([EventMode.Flags, post_event_flag]);
        }

        return return_array;
    }

}