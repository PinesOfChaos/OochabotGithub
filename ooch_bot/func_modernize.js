const db = require("./db")
const { Flags, PlayerState, Tile, Zone, ItemType, UserType, Weather, FieldEffect, StanceForms } = require('./types.js');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, AttachmentBuilder, EmbedBuilder, User } = require('discord.js');
const wait = require('wait');
const _ = require('lodash');

m_functions = {
    modernize_all : async function() {

        //Modernizes the profiles
        let user_ids = await db.profile.keys()
        for (let user_id of user_ids) { 
            await m_functions.modernize_profile(user_id);
        }

        //Modernizes the battle ids
        let battle_ids = await db.battle_data.keys()
        for (let battle_id of battle_ids) {
            await m_functions.modernize_battle_info(battle_id);
        }
    },


    modernize_profile : async function(user_id) {
        let profile = await db.profile.get(user_id);
        let blank_profile = m_functions.get_blank_profile();
        _.merge(blank_profile, profile);
        profile = blank_profile;


        profile.ooch_pc = await m_functions.modernize_box(profile.ooch_pc);
        profile.ooch_party = await m_functions.modernize_party(profile.ooch_party);
        profile.oochadex = await m_functions.modernize_oochadex(profile.oochadex);


        //TODO SET THE Profile Info in the database, this is todo so that nothing breaks
        db.profile.set(user_id, profile);
    },

    modernize_box : async function(box_data) {
        for(let i = 0; i < box_data.length; i++){
            box_data[i] = await m_functions.modernize_mon_data(box_data[i]);
        }
        return box_data;
    },

    modernize_party : async function(party_data) {
        for(let i = 0; i < party_data.length; i++){
            party_data[i] = await m_functions.modernize_mon_data(party_data[i]);
        }
        return party_data;
    },

    modernize_oochadex : async function(oochadex_current){
        let oochadex = [];
        let  i = 0;
        for (ooch_id in db.monster_data.keyArray()) {
            let index = oochadex_current.findIndex((o) => o.id == ooch_id);
            let base_info = { //if anything else ever needs to be tracked in the oochadex, add it here
                id : ooch_id, 
                caught : 0
            }
            if(index == -1){
                oochadex.push(base_info);
            }
            else{
                _.merge(base_info, oochadex_current[index]);
                oochadex.push(oochadex_current[index]);
            }
        }
        return oochadex;
    },

    modernize_mon_data : async function(mon_data) {
        let blank_ooch = m_functions.get_blank_oochamon();
        _.merge(blank_ooch, mon_data);
        mon_data = blank_ooch;

        return mon_data;
    },

    modernize_battle_info : async function(battle_id) {
        let battle_info = db.battle_data.get(battle_id);
        let battle_info_blank = m_functions.get_blank_battle_info();
        _.merge(battle_info_blank, battle_info);
        battle_info = battle_info_blank;

        for(let user of battle_info.users){
            let user_blank = m_functions.get_blank_battle_user();
            _.merge(user_blank, user);
            user = user_blank;

            for(let ooch of user.party){
                m_functions.modernize_mon_data(ooch);
            }

            for(let slot_actions of user.slot_actions){
                let slot_actions_blank = m_functions.get_blank_slot_actions();
                _.merge(slot_actions_blank, slot_actions);
                slot_actions = slot_actions_blank;
            }
        }

        //TODO SET THE Battle Info in the database, this is todo so that nothing breaks
    },

    get_blank_profile : function() {
        // Setup Oochadex template
        let oochadex = []
        for (ooch_id in db.monster_data.keyArray()) {
            oochadex.push({ id: ooch_id, caught: 0 })
        }

        // Setup user data
        let profile_obj = {
            player_sprite : 'c_000',
            ooch_pc : [],
            ooch_active_slot : 0,
            other_inv : {},
            prism_inv : {},
            heal_inv : {},

            oochabux : 0,
            repel_steps : 0,
            player_state : PlayerState.Intro,
            location_data : false,
            checkpoint_data : false,
            display_msg_id : false,
            play_thread_id : false,
            play_guild_id : false,

            oochadex : oochadex,
            flags : [],
            ooch_party : [],
            friends_list : [],
            allies_list: [],
            previous_positions: [],
            move_speed : 1,
            objective : 'Talk to the professor.',

            cur_event_name : false,
            cur_event_array : [],
            cur_event_pos : 0,
            cur_battle_id : false,

            areas_visited : [], //TODO
            notifications : [], //TODO
            stance_list   : [StanceForms.Base], //TODO

            settings : {
                controls_msg: false,
                battle_cleanup: true,
                zoom: '9_7',
                battle_speed: 2500,
                discord_move_buttons: true,
                objective: true,
            }
        }

        return(profile_obj);
    },

    get_blank_oochamon : function() {
        let ooch_obj = { 
            id: 0,
            name: "", 
            nickname: "",
            item: -1,
            ability: 0,
            og_ability: 0,
            level: 0,
            moveset: [],
            unlocked_special_move : false,
            stats: {
                hp: 1,
                atk: 0,
                def: 0,
                spd: 0,
                hp_iv: 0,
                atk_iv: 0,
                def_iv: 0,
                spd_iv: 0,
                atk_mul: 0,
                def_mul: 0,
                spd_mul: 0,
                acc_mul: 0, // Accuracy Multiplier, used for accuracy checks
                eva_mul: 0 // Evasion Multiplier, used for accuracy checks
            },
            status_effects: [],
            current_hp: 1,
            current_exp: 0,
            next_lvl_exp: 0,
            current_hp: 1,
            alive: true,
            evo_stage: 0,
            type: 0,
            og_type: 0,
            doom_timer: 4, // Used for the doomed status effect
            emote: "",
            stance: StanceForms.Base,
            stance_cooldown: 0,
            
            tame_value: 0,
            tame_treat_cooldown: 0,
            tame_pet_cooldown: 0,
            tame_walk_cooldown: 0,
            tame_play_cooldown: 0
        }

        return(ooch_obj);
    },

    get_blank_battle_info : function(){
        let battle_obj = {
            battle_id : "",
            battle_msg_counter : 0,
            turn_msg_counter : 0, //This was 0, but because each user has an intro-message, we need to account for those
            battle_state : 0,
            battle_action_queue : [],
            battle_speed : 1000,
            
            end_of_turn_switch_queue : [],

            turn_counter : 0,
            users : [],

            fake_battle : false,
            is_online : false,

            turn_timer : 0,
            allow_items : false,
            give_rewards : false,
            allow_run : false,
            weather : Weather.None,
            field_effect : FieldEffect.None,
            oochabux: 0,
            amount_of_teams: 2 // TODO: MAKE THIS DYNAMIC, I don't wanna deal with this rn lol -Jeff

        }

        return(battle_obj);
    },

    get_blank_battle_user: function(){
        let battle_user_obj = { 
                name: 'name',
                name_possessive: '',
                battle_sprite: '',
                user_id: `${_.random(5, 1_000_000)}`,
                heal_inv: [],
                prism_inv: [],
                other_inv: [],
                team_id: 0,
                user_type: UserType.Wild,
                thread_id: '',
                guild_id: '',
                active_slot: 0, 
                is_catchable: false,
                party: [],
                action_selected: false,
                slot_actions : [],
                is_player: false,
                display_msg_id: '',
                defeated : false,
                oochabux: 0,
                stance_list : [StanceForms.Base]
        }

        return(battle_user_obj);
    },

    get_blank_slot_actions : function(){
        let slot_actions_obj = {
            move_used_first : false,
            move_used_last : false,

            this_turn_did_attack : false,
            this_turn_did_damage : false,
            this_turn_was_attacked : false,
            this_turn_was_damaged : false,
            this_turn_switched_in : false,

            this_turn_revealed : false,

            used_ability_matryoshka : false,

            counter_thunderstorm : 0,

            status_counter_infect : 0,
            
            hp_starting : 0
        }

        return(slot_actions_obj);
    }
}

module.exports = m_functions;