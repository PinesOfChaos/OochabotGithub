const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Discord = require('discord.js');
const db = require('../db.js');
const _ = require('lodash');
const { get_stats } = require('../func_battle.js');
const { PlayerState, GraphicsMode, Item } = require('../types.js');
const { create_ooch } = require('../func_play.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Choose your starter'),
    async execute(interaction, client) {
        // Setup user data
        db.profile.set(interaction.user.id, interaction.member.displayName, 'player_name');
        db.profile.set(interaction.user.id, 'c_000', 'player_sprite');
        db.profile.set(interaction.user.id, [], 'ooch_pc')
        db.profile.set(interaction.user.id, 0, 'ooch_active_slot')
        db.profile.set(interaction.user.id, {}, 'other_inv')
        db.profile.set(interaction.user.id, {}, 'prism_inv')
        db.profile.set(interaction.user.id, {}, 'heal_inv')
        db.profile.set(interaction.user.id, 0, 'oochabux')
        db.profile.set(interaction.user.id, PlayerState.Intro, 'player_state')
        db.profile.set(interaction.user.id, {}, 'ooch_enemy')
        db.profile.set(interaction.user.id, { area: 'valley', x: 30, y: 36 }, 'location_data')
        db.profile.set(interaction.user.id, { area: 'valley', x: 30, y: 36 }, 'savepoint_data');
        db.profile.set(interaction.user.id, false, 'display_msg_id');
        db.profile.set(interaction.user.id, false, 'play_thread_id');
        db.profile.set(interaction.user.id, 0, 'battle_msg_counter');
        db.profile.set(interaction.user.id, 0, 'battle_turn_counter');
        db.profile.set(interaction.user.id, [], 'oochadex');
        db.profile.set(interaction.user.id, [], 'flags');
        db.profile.set(interaction.user.id, [], 'ooch_party');
        db.profile.set(interaction.user.id, [Item.Potion, Item.Prism], 'global_shop_items');
        
        // These values are used because when we enter a battle, we have to drop the event loop to handle the battle.
        // With these values, we can keep track of our event data position, and the event data related to the NPC that is being battled.
        db.profile.set(interaction.user.id, [], 'npc_event_data'); 
        db.profile.set(interaction.user.id, 0, 'npc_event_pos');
        
        // Settings
        db.profile.set(interaction.user.id, {
            graphics: GraphicsMode.Quality,
            battle_cleanup: true,
            zoom: 7
        }, 'settings');

        // Setup Oochadex template
        for (ooch_id in db.monster_data.keyArray()) {
            db.profile.push(interaction.user.id, { id: ooch_id, seen: 0, caught: 0 }, 'oochadex')
        }

        // Begin introduction!
        let command = client.commands.get('play');
        await command.execute(interaction);

    }
}