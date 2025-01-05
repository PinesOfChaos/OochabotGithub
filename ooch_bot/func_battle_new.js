const db = require("./db")
const wait = require('wait');
const { ActionRowBuilder, ButtonBuilder, StringSelectMenuBuilder, ButtonStyle, ComponentType, EmbedBuilder } = require('discord.js');
const _ = require('lodash');
const { PlayerState, TrainerType, Stats, Ability, OochType, TypeEmote, MoveTag, MoveTarget, BattleState, BattleAction} = require("./types");
const { Status } = require('./types.js');
const { ooch_info_embed, check_chance } = require("./func_other");
const { Canvas, loadImage, FontLibrary } = require('skia-canvas');
const { create_ooch, setup_playspace_str, move } = require('./func_play');

let functions = {
    /** 
     * Generate a Battle ID
     * @returns Generates a Battle ID as a string
     */
    generate_battle_id: function() {
        let id = _.random(1, 1_000_000_000).toString();
        if (db.battle_data.has(id)) {
            id = functions.generate_battle_id();
        }
        return id;
    },

    /**
     * Generates a battle team
     * @param {Object} guild Guild this battle is taking place in
     * @param {Object} thread Thread this battle is taking place in
     * @param {Number} type Type of Battle TrainerType(Wild, NPCTrainer, User, OnlineUser)
     * @param {Object} options Additional data, data required varies by type
     * @returns 
     */
    generate_battle_user: function(guild, thread, type, options) {
        let party = [];
        let battle_sprite = false;
        let user_id = false;
        let oochabux = false;
        let active_slot = 0;
        let is_catchable = false;
        let name = 'Wild Oochamon';
        let is_player = false;
        let display_msg_id = false;
        
        switch (type) {
            case TrainerType.Wild:
                let ooch = create_ooch(options.ooch_id, options.ooch_level);
                party = [ooch];
                is_catchable = true;
            break;
            case TrainerType.NPCTrainer:
                let party_base = options.team;
                let party_generated = [];
                
                //Loop through the party_base and convert to the required format for battles
                for(let i = 0; i < party_base.length; i++){
                    let ooch_base = party_base[i];
                    // Filter out 9999 which is "no move"
                    ooch_base.moveset = ooch_base.moveset.filter(v => v != 9999);
                    let ooch = create_ooch(ooch_base.id, ooch_base.level, ooch_base.moveset, ooch_base.nickname, 0, ooch_base.ability,
                                        ooch_base.hp_iv, ooch_base.atk_iv, ooch_base.def_iv, ooch_base.spd_iv);
                    party_generated.push(ooch);  
                }

                name = options.name;
                oochabux = options.coin;
                party = party_generated;
                is_catchable = options.is_catchable;
                battle_sprite = options.sprite_combat == false ? options.sprite_id.slice(0, 1) + options.sprite_id.slice(3) : options.sprite_combat;
            break;
            case TrainerType.User:
                is_player = true;
                user_id = options.user_id;
                let profile = db.profile.get(user_id);
                
                name = profile.name; // TODO: Fix this from being undefined
                battle_sprite = profile.player_sprite;
                party = profile.ooch_party;
                active_slot = profile.ooch_active_slot;
                display_msg_id = profile.display_msg_id;
            break;
        }

        return {
            name: name,
            battle_sprite: battle_sprite,
            user_id: user_id,
            thread: thread,
            guild: guild,
            active_slot: active_slot, 
            is_catchable: is_catchable,
            party: party,
            action_selected: false,
            is_player: is_player,
            display_msg_id: display_msg_id
        }
    },

    /**
     * Sets up an Oochamon battle and begins prompting for input.
     * @param {Object} users The user object
     */
    setup_battle: async function(users, weather, oochabux, turn_timer, allow_items, give_rewards, allow_run) {
        
        let abilityMsg = '';
    
        // // Adjust things for abilities
        // for (let id in users) {

        //     let activeOoch = activeOoch;
        //     activeOoch = ability_stat_change(activeOoch, users[id].party);

        //     // Index 0 is the oochamon itself, 1 is the ability msg
        //     activeOoch = activeOoch[0];
        //     abilityMsg += `\n${activeOoch[1]}`;
            
        //     switch (activeOoch.ability) {
        //         case Ability.Duplicant:
        //             let randTarget = functions.get_random_targets(teams, users[id].team_id, id);
        //             if (users[randTarget].party[users[randTarget].active_slot].ability !== Ability.InvalidEntry) {
        //                 activeOoch.ability = users[randTarget].party[users[randTarget].active_slot].ability;
        //                 abilityMsg += `\n${activeOoch.emote} **${activeOoch.name}**'s copied its ability to **${_.startCase(db.ability_data.get(users[randTarget].party[users[randTarget].active_slot].ability, 'name'))}** through it's **Duplicant** ability!`;
        //             }
        //         break;
        //         case Ability.Nullify:
        //             trainer_obj.users[i].party[0].ability = Ability.Null;
        //             abilityMsg += `\nAll abilities were changed to **Null** from the ability **Nullify** from ${plrOochEmote} **${plrOochName}**!`
        //         break;
        //         case Ability.Gentle: // Affects enemy oochamon
        //             modify_stat(trainer_obj.users[i].party[0], Stats.Attack, -1);
        //         break;
        //     }

        //     teams[i][j] = users[i];
        // }
    

        // Handle all the text
        let battleStartText = ``;
        for (let id in users) {
            // if (users[id].is_player) { 
            //     let playspace_msg = await users[id].thread.messages.fetch(users[id].display_msg_id).catch(() => {});
            //     await playspace_msg.delete().catch(() => {});
            // }

            if (users[id].is_player) {
                let my_team = users[id].team_id
                for (let id2 in users) {
                    if (id2 != id){
                        
                        if (users[id2].is_catchable) { //Wild oochamon
                            battleStartText += `# A wild ${users[id2].name} appeared!\n`;
                            //Uncaught mon text here
                            if (db.profile.get(id, `oochadex[${users[id2].party[users[id2].active_slot]}].caught`) == 0) {
                                battleStartText += `<:item_prism:1274937161262698536> ***Uncaught Oochamon!***\n`
                            }
                        }
                        else if (users[id2].team_id != my_team) { //Opposing Player/NPC
                            battleStartText += `# ${users[id2].name} wants to battle!\n`; 
                        }
                        else { //Allied Player/NPC
                            let activeOoch = users[id2].party[users[id2].active_slot];
                            battleStartText += `# ${users[id2].name} sent out ${activeOoch.emote} **${activeOoch.name}!**\n`; //REPLACE
                        }
                    }
                }

                //Send the start_message to the user
                // // Generate intro to battle image
                // let battle_image = await generate_battle_image(thread, user_id, db.profile.get(user_id), trainer_obj, is_npc_battle);
                // thread.send({ 
                //     content: battleStartText
                //     //files: [battle_image]
                // });
                
                // if (abilityMsg.replaceAll('\n','') != '') {
                //     await thread.send(abilityMsg);
                // }
            }
        }

        // Setup the battle data
        let battleId = functions.generate_battle_id();

        let battleDataObj = {
            battle_id : battleId,
            battle_msg_counter : abilityMsg == '' ? 1 : 2,
            turn_msg_counter : 0,
            battle_state : BattleState.Start,
            battle_action_queue : [],


            turn_counter : 0,
            users : users,

            turn_timer : turn_timer,
            allow_items : allow_items,
            give_rewards : give_rewards,
            allow_run : allow_run,
            weather : weather,
            oochabux: oochabux,
            amount_of_teams: 2 // TODO: MAKE THIS DYNAMIC, I don't wanna deal with this rn lol -Jeff
        }

        db.battle_data.set(battleId, battleDataObj);

        console.log(battleDataObj, battleDataObj.users);
    
        // TODO: Uncomment this when this function is ready to go
        //await functions.prompt_battle_input(thread, user_id);
    },

    /**
     * Create an Attack action
     * @param {Number} user_id The user which is causing this action
     * @param {Number} target_user_id The user to be hit by the move
     * @param {Number} move_slot The move to be used
     * @returns returns a battle action object
     */
    new_battle_action_attack : function(user_id, target_user_id, move_slot){
        let action = {
            action_type : BattleAction.Attack,
            priority : BattleAction.Attack,
            user_id : user_id,
            target_user_id : target_user_id,
            move_slot : move_slot

            
        }

        return(action);
    },

    /**
     * Create a Run action
     * @param {Number} user_id The user which is causing this action
     * @returns returns a battle action object
     */
    new_battle_action_run : function(user_id){
        let action = {
            action_type : BattleAction.Run,
            priority : BattleAction.Run,
            user_id : user_id
        }

        return(action);
    },

    /**
     * Create a Switch action
     * @param {Number} user_id The user which is causing this action
     * @param {Number} slot_to The slot to switch to
     * @returns returns a battle action object
     */
    new_battle_action_switch(user_id, slot_to){
        let action = {
            action_type : BattleAction.Run,
            priority : BattleAction.Run,
            user_id : user_id,

            slot_to : slot_to
        }

        return(action);
    }

    /**
     * Selects a random target player in the battle
     * @param {Arrays} users The current battle users array
     * @param {Number} my_team_id The id of the mon checking this value
     * @param {Number} my_user_id The id of the user
     * @param {Number} max_num The maximum number to return (default 1)
     * @param {Boolean} other_team whether to check for other teams (default true)
     * @param {Boolean} same_team whether to check for allies (default false)
     * @param {Boolean} allow_self whether to check for self (default false)
     * @returns returns an array of user_id(s) within the battle
     */
    get_random_targets: function(users, my_team_id, my_user_id, max_num = 1, other_team = true, same_team = false, allow_self = false) {
        let options = []
        for(let user of users){
            if(user.user_id == my_user_id && allow_self){
                options.push(user.user_id)
            }
            else if(user.team_id == my_team_id && same_team){
                options.push(user.user_id)
            }
            else if(user.team_id != my_team_id && other_team){
                options.push(user.user_id)
            }
        }

        let targets = []
        for(let i in max_num){
            targets.push(options[_.random(options.length)])
        }

        return targets;
    },

    /**
     * Get a list of users that belong to a certain team_id
     */
    get_team_users: function(users, team_id) {
        return Object.entries(users).filter(usr => usr.team_id == team_id).map(usr => usr[0]);
    }
    
}

module.exports = functions;

