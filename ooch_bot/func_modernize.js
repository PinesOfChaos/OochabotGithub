const db = require("./db")
const { Flags, PlayerState, Tile, Zone, ItemType, UserType, Weather } = require('./types.js');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, AttachmentBuilder, EmbedBuilder } = require('discord.js');
const wait = require('wait');
const _ = require('lodash');

functions = {
    modernize_all : async function() {

        //Modernizes the profiles
        let user_ids = await db.profile.keys()
        for (let user_id of user_ids) { 
            modernize_profile(user_id);
        }

        let battle_ids = await db.battle_data.keys()
        for (let battle_id of battle_ids) {
            modernize_battle_info(battle_id);
        }
    },


    modernize_profile : async function(user_id) {
        let profile = db.profile.get(user_id);
        let box_data = profile.ooch_pc;
        let party_data = profile.ooch_party;

        modernize_box(box_data);
        modernize_party(party_data);
    },

    modernize_box : async function(box_data) {
        for(let ooch of box_data){
            modernize_mon_data(ooch);
        }
    },

    modernize_party : async function(party_data) {
        for(let ooch of party_data){
            modernize_mon_data(ooch);
        }
    },

    modernize_battle_info : async function(battle_id) {
        
    },

    modernize_mon_data : async function(mon_data) {
        let blank_ooch = functions.get_blank_oochamon();
        _.merge(blank_ooch, mon_data);
    },

    get_blank_profile : function() {
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

            oochadex : [],
            flags : [],
            ooch_party : [],
            friends_list : [],
            move_speed : 1,
            objective : 'Talk to the professor.',

            cur_event_name : false,
            cur_event_array : [],
            cur_event_pos : 0,
            cur_battle_id : false,

            areas_visited : [], //TO DO
            notifications : [], //TO DO

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
            
            tame_value: 0,
            tame_treat_cooldown: 0,
            tame_pet_cooldown: 0,
            tame_walk_cooldown: 0,
            tame_play_cooldown: 0
        }

        return(ooch_obj);
    }


}