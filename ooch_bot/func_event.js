const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, EmbedBuilder, StringSelectMenuBuilder, ButtonStyle, ComponentType, StringSelectMenuOptionBuilder } = require('discord.js');
const Discord = require('discord.js');
const db = require('../db.js');
const _ = require('lodash');
const { map_emote_string, setup_playspace_str } = require('../func_play');
const { PlayerState, TypeEmote, EventMode } = require('../types.js');
const { type_to_emote, type_to_string } = require('../func_battle.js');

module.exports = {
    /**
     * Runs an event based on an event array
     * @param {Array} event_array The event array.
     */
    event_run: function(event_array){

    },


    /**
     * Converts NPC dialogue into an Event
     * @param {Array} dialogue_array NPC dialogue array
     */
    event_from_dialogue: function(dialogue_array){
        let return_array = [];
        let i = 0;
        for(i = 0; i < dialogue_array.length; i++){
            return_array[i] = [EventMode.Text , dialogue_array[i]]
        }
        return return_array;
    }

}