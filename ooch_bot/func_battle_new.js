

const db = require("./db")
const wait = require('wait');
const { ActionRowBuilder, ButtonBuilder, StringSelectMenuBuilder, ButtonStyle, ComponentType, EmbedBuilder } = require('discord.js');
const _ = require('lodash');
const { PlayerState, UserType, Stats, Ability, OochType, TypeEmote, MoveTag, MoveTarget, BattleState, BattleAction, BattleInput } = require("./types");
const { Status } = require('./types.js');
const { ooch_info_embed, check_chance } = require("./func_other");
const { Canvas, loadImage, FontLibrary } = require('skia-canvas');

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
     * Generates a battle user object
     * @param {Object} thread Thread this user session is taking place in
     * @param {Number} type Type of Battle UserType(Wild, NPCTrainer, User, OnlineUser)
     * @param {Object} options Additional data, data required varies by type
     * @returns 
     */
    generate_battle_user: function(thread, type, options) {

        const { create_ooch } = require('./func_play');

        let party = [];
        let battle_sprite = false;
        let user_id = false;
        let team_id = false;
        let oochabux = false;
        let active_slot = 0;
        let is_catchable = false;
        let name = 'Wild Oochamon';
        let is_player = false;
        let display_msg_id = false;
        
        switch (type) {
            case UserType.Wild:
                let ooch = create_ooch(options.ooch_id, options.ooch_level);
                party = [ooch];
                is_catchable = true;
                team_id = UserType.Wild
            break;
            case UserType.NPCTrainer:
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
                team_id = type;
                battle_sprite = options.sprite_combat == false ? options.sprite_id.slice(0, 1) + options.sprite_id.slice(3) : options.sprite_combat;
            break;
            case UserType.Player:
                is_player = true;
                user_id = options.user_id;
                team_id = options.team_id;
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
            name_possessive: name == 'Wild Oochamon' ? 'Wild' : name + '\'s',
            battle_sprite: battle_sprite,
            user_id: user_id,
            team_id: team_id,
            user_type: type,
            thread: thread,
            active_slot: active_slot, 
            is_catchable: is_catchable,
            party: party,
            action_selected: false,
            is_player: is_player,
            display_msg_id: display_msg_id,
            defeated : false
        }
    },

    /**
     * Sets up an Oochamon battle and begins prompting for input.
     * @param {Object} users The user object
     * @param {Number} weather The weather enum
     * @param {Number} oochabux The amount of Oochabux to give
     * @param {Number} turn_timer The amount of time to do a turn before timeout (0 does not activate this)
     * @param {Boolean} allow_items Allow the use of items in the battle
     * @param {Boolean} give_rewards Give rewards at the end of a battle
     * @param {Boolean} allow_run Allow running from the battle
     */
    setup_battle: async function(users, weather, oochabux, turn_timer, allow_items, give_rewards, allow_run) {
        
        let abilityMsg = '';
        let battle_action_queue = [];
    
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

        // Setup the battle data
        let battleId = functions.generate_battle_id();

        let battleDataObj = {
            battle_id : battleId,
            battle_msg_counter : abilityMsg == '' ? 1 : 2,
            turn_msg_counter : 0,
            battle_state : BattleState.Start,
            battle_action_queue : [],
            
            end_of_turn_switch_queue : [],

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

        // Handle all the text
        let battleStartText = ``;
            // if (users[id].is_player) { 
            //     let playspace_msg = await users[id].thread.messages.fetch(users[id].display_msg_id).catch(() => {});
            //     await playspace_msg.delete().catch(() => {});
            // }

        for (let [id, user] of battleDataObj.users.entries()) {
            //Handles the newly sent out oochamon
            functions.new_battle_action_switch(battleDataObj, id, user.active_slot, false, true);

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

        db.battle_data.set(battleId, battleDataObj);
    
        await functions.prompt_battle_actions(battleId);
    },

    /**
     * Create an Attack action
     * @param {Number} user_id The user which is causing this action
     * @param {Number} target_user_id The user to be hit by the move
     * @param {Number} move_slot The move to be used
     * @returns returns a battle action object
     */
    new_battle_action_attack : function(battle_data, user_id, target_user_id, move_id) {
        let action = {
            action_type : BattleAction.Attack,
            priority : BattleAction.Attack,
            user_id : user_id,
            target_user_id : target_user_id,
            move_id : move_id
        }

        battle_data.battle_action_queue.push(action);
    },

    /**
     * Create a Run action
     * @param {Number} user_id The user which is causing this action
     * @returns returns a battle action object
     */
    new_battle_action_run : function(battle_data, user_id){
        let action = {
            action_type : BattleAction.Run,
            priority : BattleAction.Run,
            user_id : user_id
        }

        battle_data.battle_action_queue.push(action);
    },

    /**
     * Create a Switch action
     * @param {Number} user_id The user which is causing this action
     * @param {Number} slot_to The slot to switch to
     * @param {Boolean} is_switching Whether the user is switching a mon in or just sending one out
     * @param {Boolean} skip_initial_text Whether to skip the "User sent out/switched" lines of text
     * @returns returns a battle action object
     */
    new_battle_action_switch(battle_data, user_id, slot_target, is_switching, skip_initial_text = false){
        let action = {
            action_type : BattleAction.Switch,
            priority : BattleAction.Switch,
            user_id : user_id,
            slot_target : slot_target,
            is_switching : is_switching,
            skip_initial_text : skip_initial_text
        }

        battle_data.battle_action_queue.push(action);
    },

    /**
     * Create a Prism action
     * @param {Number} user_id The user which is causing this action
     * @param {Number} item_id The id of the Item to use
     * @param {Number} target_user_id The user whos active mon we're catching
     * @returns returns a battle action object
     */
    new_battle_action_prism(battle_data, user_id, target_user_id){
        let action = {
            action_type : BattleAction.Prism,
            priority : BattleAction.Prism,
            user_id : user_id,
            item_id : item_id,
            target_user_id : target_user_id
        }

        battle_data.battle_action_queue.push(action);
    },

    /**
     * Create a Heal action
     * @param {Number} user_id The user which is causing this action
     * @param {Number} item_id The id of the Item to use
     * @param {Number} slot_target The slot to apply healing to
     * @returns returns a battle action object
     */
    new_battle_action_heal(battle_data, user_id, slot_to){
        let action = {
            action_type : BattleAction.Heal,
            priority : BattleAction.Heal,
            user_id : user_id,

            item_id : item_id,
            slot_target : slot_target
        }

        battle_data.battle_action_queue.push(action);
    },

    /**
     * Create an Other action
     * @param {Number} user_id The user which is causing this action
     * @param {Number} item_id The id of the Item to use
     * @returns returns a battle action object
     */
    new_battle_action_other(battle_data, user_id, slot_to){
        let action = {
            action_type : BattleAction.Other,
            priority : BattleAction.Other,
            user_id : user_id,

            item_id : item_id
        }

        battle_data.battle_action_queue.push(action);
    },

    /**
     * Create a user_type
     * @param {Object} user_obj The user which is causing this action
     * @param {Object} battle_data The relevant battle data
     * @returns returns a battle action object
     */
    get_ai_action: function(user_obj, battle_data) {
        let active_mon = user_obj.party[user_obj.active_slot]
        let moves = active_mon.moveset;
        let num_moves = moves.length;
        let users = battle_data.users;
        let target_user = false;
        let action = false;
        let move_id = false;
        let move_intentions = []

        let users_enemy = users.filter(u => u.team_id != user_obj.team_id);
        let users_friendly = users.filter(u => u.team_id == user_obj.team_id && u.user_id != user_obj.user_id);
        let party_alive_slots = [];
        user_obj.party.forEach((mon, i) => {
            if(mon.hp > 0){party_alive_slots.push(i)}
        })
        

        switch (user_obj.user_type) {
            case UserType.Wild:
                target_user = _.sample(users_enemy);
                move_id = _.sample(moves.move_id);
                action = functions.new_battle_action_attack(battle_data, user_obj.user_id, target_user.user_id, move_id);
            break;
            case UserType.NPCTrainer:
                target_user = _.sample(users_enemy);
                target_mon = target_user.party[target_user.active_slot];
                move_intentions = functions.get_move_intention(moves, target_mon.type);
                move_id = move_intentions[_.random(10) < 6 ? 0 : _.random(move_intentions.length - 1)];
                
                action = functions.new_battle_action_attack(battle_data, user_obj.user_id, target_user.user_id, move_id);
            break;
            case UserType.NPCSmart:
                target_user = _.sample(users_enemy);
                target_mon = target_user.party[target_user.active_slot];
                move_intentions = functions.get_move_intention(moves, target_mon.type);
                let good_moves = move_intentions.filter((move) => move.priority > 1);
                let okay_moves = move_intentions.filter((move) => move.priority == 1);
                let okay_moves_damage = okay_moves.filter((move) => move.damge > 0)
                let stat_stages = active_mon.stats.atk_mul + active_mon.stats.def_mul + active_mon.stats.spd_mul;
                
                if(good_moves.length + okay_moves_damage.length == 0 && stat_stages <= 2 && party_alive_slots.length > 0){
                    //Switch if there are no acceptable attacking moves and there is a mon we can switch to
                    action = functions.new_battle_action_switch(battle_data, user_obj.user_id, party_alive_slots[_.random(party_alive_slots.length - 1)]);
                }
                else if(good_moves.length > 0 || okay_moves.length > 0){
                    move_id = _.random(10) < 7 ? good_moves[0] : okay_moves[0];
                    action = functions.new_battle_action_attack(battle_data, user_obj.user_id, target_user.user_id, move_id);
                }
                else{
                    move_id = move_intentions[_.random(move_intentions.length - 1)];
                    action = functions.new_battle_action_attack(battle_data, user_obj.user_id, target_user.user_id, move_id);
                }
            break;
        }

        return(action);
    },

    /**
     * Gets a sorted list of moves
     * @param {Array} moves_list 
     * @param {Enum} target_type 
     * @returns Array of moves shuffled and then sorted by their priority
     */
    get_move_intention: function(moves_list, target_type){
        let moves_to_sort = [];
        for(let move of moves_list){
            moves_to_sort.push({
                priority : move.damage == 0 ? 1 : functions.type_effectiveness(move.type, target_type), 
                move_id : move.id,
                damage : move.damage})
        }
        
        moves_to_sort = _.shuffle(moves_to_sort);
        let moves_sorted = moves_to_sort.sort((a, b) => b.priority - a.priority);
        return(moves_sorted)
    },

    /**
     * Sorts the action queue of a given battle id in the database
     * @param {String} battle_id 
     */
    sort_action_priority(action_list){
        //Add the speed of the user's active oochamon
        for(let action of action_list){
            
            let user_id = action.user_id;
            let user = battle_data.users[user_id];
            let ooch_obj = user.party[user.active_slot];

            //Priority based on action type
            let base_priority = action.priority;

            //Priority based on Oochamon Speed stat
            let speed = ooch_obj.stats.spd * (ooch_obj.stats.spd_mul + 1);
            if (ooch_obj.status_effects.includes(Status.Snare)) speed /= 100;
            if (ooch_obj.ability == Ability.Immobile) speed /= 100

            //Priority based on whether the move has the "priority" effect
            let move_priority = 0;
            if(action.action_type == BattleAction.Attack){
                let move = db.move_data.get(action.move_id);
                let status_effects = move.status_effects;
                for(let status of status_effects){
                    let status_split = status.split('_');
                    if(status_split[0] == 'priority'){
                        move_priority += parseInt(status_split[1]) * 10_000;
                    }
                }

            }
            
            //Combine the priorities to get the final value
            action.priority = base_priority + move_priority + speed;
        }

        //Sort the actions in descending order by priority, then set it in the database
        action_list.sort((a, b) => b.priority - a.priority);
    },

    /**
     * Sends messages to all player-type users in an array of users
     * @param {Array} users the list of users to send the message to (automatically skips non-players)
     * @param {Object} message anything that can be sent as a discord message
     */
    distribute_messages : async function(users, message){
        for(let user of users){
            if(user.is_player){
                let thread = user.thread;
                await thread.send(message);
            }
        }
    },

    /**
     * Processes the battle_action_queue of a given battle_id
     * @param {String} battle_id the id of the battle
     */
    process_battle_actions : async function(battle_id){
        let battle_data = db.battle_data.get(battle_id);
        let actions = battle_data.battle_action_queue;
        
        while(actions.length > 0){
            //Sort the actions before we do anything, this needs to be re-sorted to account for speed/status changes
            sort_action_priority(actions);

            let action = actions.shift();

            let text = `**------------ ${user.name_possessive} Turn ------------**\n`;
            let turn_data = false;

            switch(action.action_type){
                case BattleAction.Attack:
                    //TODO
                break;
                case BattleAction.Switch:
                    turn_data = await functions.action_process_switch(battle_data, action);
                break;
                case BattleAction.Run:
                    turn_data = await functions.action_process_run(battle_data, action);
                break;
                case BattleAction.Heal:
                    turn_data = await functions.action_process_heal(battle_data, action);
                break;
                case BattleAction.Prism:
                    turn_data = await functions.action_process_prism(battle_data, action);
                break;
                case BattleAction.Other:
                    //TODO
                break;
            }

            //Send the text to each of the user's threads
            text += turn_data.return_string;
            await functions.distribute_messages(battle_data.users, text);

            //Clear any remaining actions if we're meant to finish the battle
            //Also send any final messages for the action
            if(turn_data.finish_battle){
                
                if(turn_data.has('finish_data') && turn_data.finish_data != false){
                    let finish_data = turn_data.finish_data;
                    switch(finish_data.type){
                        case 'capture':
                            let delay = turn_data.finish_data.delay;
                            let embed = turn_data.finish_data.info_embed;
                            let png = turn_data.finish_data.ooch_png

                            await functions.distribute_messages(battle_data.users, { embeds: [embed], files: [png] });
                            await wait(delay);
                        break;
                    }
                }

                battle_data.actions = [];
            }
        }

        //Apply end of round effects (burn, stat changes, etc.)
        //TODO

        //Check if anyone needs to send out a new mon
        //TODO

        //End the battle here if a win/loss-state has been achieved
        //OR
        //Send end of round message and increment the turn counter
        //TODO
        battle_data.battle_msg_counter +=1;
        battle_data.turn_counter++;
        db.battle_data.set(battle_id, battle_data);

        //Round Ends here
    },


    action_process_switch : async function(battle_data, action){
        let user = battle_data.users[action.user_id];
        let finish_battle = false;

        let ooch_to = user.party[user.active_slot];
        let ooch_from = user.party[action.slot_target];
        user.active_slot = action.slot_target;
        
        let return_string = (action.is_switching 
            ? `${user.name} switched from ${db.monster_data.get(ooch_from.id, 'emote')} **${ooch_from.nickname}** to ${db.monster_data.get(ooch_to.id, 'emote')} **${ooch_to.nickname}**.`
            : `${user.name} sent out ${db.monster_data.get(ooch_to.id, 'emote')} **${ooch_to.nickname}**.`
        )
        if (action.skip_text) {return_string = '';}

        ooch_from.stats.atk_mul = 0;
        ooch_from.stats.def_mul = 0;
        ooch_from.stats.spd_mul = 0;
        ooch_from.stats.acc_mul = 0;
        ooch_from.stats.eva_mul = 0;
        ooch_from.ability = ooch_from.og_ability;
        ooch_from.type = ooch_from.og_type;
        ooch_from.doom_timer = 4;

        //Check abilities vs other users
        for(let u of battle_data.users){
            if(u.team_id != user.team_id && !u.party[u.active_slot].defeated){
                let ooch_enemy = u.party[u.ooch_active_slot];

                //Enemy users' mons that affect the new mon
                switch (ooch_enemy.ability) {
                    case Ability.Alert: //Increases atk if a new enemy mon switches in
                        ooch_enemy = modify_stat(ooch_enemy, Stats.Attack, 1);
                        string_to_send += `\n${ooch_enemy.emote} **${ooch_enemy.nickname}**'s ability **Alert** raised its ATK from the new Oochamon switch!`;
                    break;
                    case Ability.Duplicant: //Copies the ability of the newly switched-in mon
                        if (ooch_to.ability !== Ability.InvalidEntry) {
                            ooch_enemy.ability = ooch_to.ability;
                            string_to_send += `\n${ooch_enemy.emote} **${ooch_enemy.nickname}** ability was changed to **${_.startCase(db.ability_data.get(ooch_to.ability, 'name'))}** through it's **Duplicant** ability!`;
                        }
                    break;
                    case Ability.Nullify: //Changes the ability of the newly switched mon to "Null"
                        ooch_to.ability = Ability.Null;
                        string_to_send += `\n${ooch_to.emote} **${ooch_to.nickname}**'s ability changed to **Null** due to ${ooch_enemy.emote} **${ooch_enemy.nickname}**'s **Nullify**!`
                    break;
                }

                //User's new mon abilities that affect all enemies
                switch (ooch_to.ability) {
                    case Ability.Boisterous: //Enemy loses 10% HP
                        let prev_hp = ooch_enemy.current_hp;
                        ooch_enemy.current_hp = _.clamp(Math.floor(ooch_enemy.current_hp - ooch_enemy.stats.hp * 0.1), 1, ooch_enemy.stats.hp);
                        string_to_send += `\n${ooch_enemy.emote} **${ooch_enemy.nickname}** lost ${prev_hp - ooch_enemy.current_hp} HP due to ${ooch_to.emote} **${ooch_to.nickname}**'s **Boisterous**!`;
                    break;
                    case Ability.Gentle: //Lowers enemy ATK 1 stage
                        ooch_enemy = modify_stat(ooch_enemy, Stats.Attack, -1);
                        string_to_send += `\n${ooch_enemy.emote} **${ooch_enemy.nickname}** had its ATK lowered due to ${ooch_to.emote} **${ooch_to.nickname}**'s **Gentle**!`;
                    break;
                    case Ability.Withering: //Lowers enemy DEF 1 stage
                        ooch_enemy = modify_stat(ooch_enemy, Stats.Defense, -1);
                        string_to_send += `\n${ooch_enemy.emote} **${ooch_enemy.nickname}** had its DEF lowered due to ${ooch_to.emote} **${ooch_to.nickname}**'s **Withering**!`;
                    break;
                }
            }
        }

        return {
            finish_battle : finish_battle,
            return_string : return_string
        }
    },

    /**
     * Attemts to capture an oochamon, and if successful tells the battle to end
     * @param {*} battle_data the current battle data
     * @param {*} action the action data to process
     * @returns Turn data {finish_battle : Boolean, finish_data : Varying, return_string : String}
     */
    action_process_prism : async function(battle_data, action){
        let user = battle_data.users[action.user_id];
        let finish_battle = false;
        let finish_data = false;

        let target_user = battle_data[action.target_user_id]
        let item = await db.item_data.get(action.item_id);
        let ooch_target = target_user.party[target_user.active_slot];
        let return_string = `${user.name} threw a ${item.emote} ${item.name}.`;

        let prism_result = functions.item_use(user.user_id, ooch, action.item_id); //True if successful catch, False if not
        if(prism_result == true){
            return_string += `\n\n**You successfully caught the wild ${ooch_target.nickname}!**`;
            
                if (user.party.length < 4) {
                    return_string += `\nIt's been added to your party.`;
                } else {
                    return_string += `\nIt's been sent to your box.`;
                }

                let ooch_party = user.party;
                let is_first_catch = (db.profile.get(user_id, `oochadex[${ooch_target.id}].caught`) == 0);
                
                // Distribute XP for a caught Oochamon
                // The Oochamon in the active slot at the moment of beating the Oochamon gets 1.25x more EXP than the others.
                exp_earned = functions.battle_calc_exp(ooch_target.level, db.monster_data.get(ooch_target.id, 'evo_stage'), 1); //catching mons will always give 1x EXP
                if(is_first_catch) exp_earned *= 2;

                let exp_earned_main = Math.round(exp_earned * 1.25);
                if (ooch_plr.level != 50) {
                    return_string += `\n${db.monster_data.get(ooch_plr.id, 'emote')} **${ooch_plr.nickname}** earned **${Math.round(exp_earned * 1.25)} exp!**` + 
                                        ` (EXP: **${_.clamp(ooch_plr.current_exp + exp_earned_main, 0, ooch_plr.next_lvl_exp)}/${ooch_plr.next_lvl_exp})**`
                }
                if (ooch_party.length > 1) {
                    return_string += `\nThe rest of your team earned **${exp_earned}** exp.`;
                }
                if(is_first_catch) return_string += `\n✨ *Gained 2x Experience from catching a New Oochamon!*`;

                for (let i = 0; i < ooch_party.length; i++) {
                    let ooch = ooch_party[i];
                    if (i == user.active_slot) { 
                        ooch.current_exp += Math.round(exp_earned * 1.25);
                    } else { 
                        ooch.current_exp += (ooch.alive === false ? exp_earned : Math.round(exp_earned / 2)); 
                    }
                    
                    // Check for level ups
                    if (ooch.current_exp >= ooch_data.next_lvl_exp) { // If we can level up
                        ooch = level_up(ooch);
                        return_string += `\n${ooch[1]}`;
                        ooch_party[i] = ooch[0];
                    }
                }

                displayEmbed.setDescription(return_string)
                await item_sel.update({ content: `**------------ Player Turn ------------**`, embeds: [displayEmbed], components: []});

                // Heal the caught Oochamon when you catch it.
                ooch_target.current_hp = ooch_target.stats.hp;

                // Have it check here if you want to send the Oochamon to your party or not
                if (user.party.length < 4) {
                    user.party.push(ooch_target);
                } else {
                    db.profile.push(user_id, ooch_target, `ooch_pc`)
                }
                db.profile.math(user_id, '+', 1, `oochadex[${ooch_target.id}].caught`)
                let info_embed = ooch_info_embed(ooch_target);
                let ooch_png = info_embed[1];
                info_embed = info_embed[0];
                info_embed.setAuthor({ name: 'Here\'s some information about the Oochamon you just caught!' })
                finish_data = {type : 'capture', info_embed : info_embed, ooch_png : ooch_png, delay : 5000};
                finish_battle = true;
        }
        else{
            return_string = `\n\nUnfortunately, your prism catch attempt failed...`
        }

        return {
            finish_battle : finish_battle,
            finish_data : finish_data,
            return_string : return_string
        }
    },

    /**
     * Uses a healing item
     * @param {*} battle_data the current battle data
     * @param {*} action the action data to process
     * @returns Turn data {finish_battle : Boolean, return_string : String}
     */
    action_process_heal : async function(battle_data, action){
        let user = battle_data.users[action.user_id];
        let finish_battle = false;

        let item = await db.item_data.get(action.item_id);
        let ooch = user.party[action.slot_target];
        let return_string = `${user.name} used 1 ${item.emote} ${item.name}.`;

        switch(item.type){
            case 'potion':
                return_string += await functions.item_use(user.user_id, ooch, action.item_id);
            break;
            case 'status':
                return_string += await functions.item_use(user.user_id, ooch, action.item_id);
            break;
        }

        return {
            finish_battle : finish_battle,
            return_string : return_string
        }
    },

    /**
     * Attempts to run away
     * @param {*} battle_data the current battle data
     * @param {*} action the action data to process
     * @returns Turn data {finish_battle : Boolean, return_string : String}
     */
    action_process_run : async function(battle_data, action){
        let user = battle_data.users[action.user_id];
        let ooch_user = user.party[user.active_slot];
        let ooch_max_check = 0;
        let return_string = '';
        let finish_battle = false;

        for(let other_user of battle_data.users){
            if(other_user.user_id != user.user_id){
                let ooch_other = other_user.party[other_user.active_slot];
                ooch_max_check = max(ooch_other.stats.spd + ooch_other.level * 10, ooch_max_check)
            } 
        }

        if ((ooch_user.stats.spd + ooch_user.level * 15) / ((ooch_user.stats.spd + ooch_user.level * 10) + ooch_max_check ) > Math.random()) {
            return_string += `You successfully ran away!\nYour playspace will appear momentarily.`;
            finish_battle = true;
        }
        else{
            return_string += 'Failed to run away!'
        }

        return {
            finish_battle : finish_battle,
            return_string : return_string
        }
    },

    /* TODOs: 
        - Ensure the turn msg counters are correct after this is correct globally
        - Make sure messages are updated properly
    */

    /** Gather input for battle actions
     * @param battle_id The ID of the battle being prompted for
     */
    prompt_battle_actions: async function(battle_id) {
        let battle_data = db.battle_data.get(battle_id);

        // Store current battle state to roll back to if needed
        // db.battle_data.delete(battle_id, 'rollback_profile');
        // db.battle_data.set(battle_id, JSON.stringify(db.profile.get(user_id)), 'rollback_profile');
        // db.battle_data.set(battle_id, 0, 'turn_msg_counter');

        //#region Setup buttons and select menus
        const inputRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('fight')
                    .setLabel('Fight')
                    .setEmoji('⚔️')
                    .setStyle(ButtonStyle.Primary),
            ) .addComponents(
                new ButtonBuilder()
                    .setCustomId('switch')
                    .setLabel('Switch')
                    .setEmoji('<:item_prism:1274937161262698536>')
                    .setStyle(ButtonStyle.Success),
            );
    
        const inputRow2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('bag')
                    .setLabel('Item')
                    .setEmoji('🎒')
                    .setStyle(ButtonStyle.Danger),
            ) .addComponents(
                new ButtonBuilder()
                    .setCustomId('run')
                    .setLabel('Run')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🏃‍♂️')
                    .setDisabled(!battle_data.allow_run),
            );
    
        const inputRow3 = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('info')
                        .setLabel('View Battle Info')
                        .setEmoji('📒')
                        .setStyle(ButtonStyle.Secondary),
                )
                
        const moveButtons = new ActionRowBuilder();
        const switchButtons1 = new ActionRowBuilder();
        const switchButtons2 = new ActionRowBuilder();
        const bagButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('heal_button')
                    .setLabel('Healing')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('<:item_potion_magic:1274937146423115922>'),
            ).addComponents(
                new ButtonBuilder()
                    .setCustomId('prism_button')
                    .setLabel('Prism')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('<:item_prism:1274937161262698536>')
                    .setDisabled(!battle_data.is_catchable),
            ).addComponents(
                new ButtonBuilder()
                    .setCustomId('back')
                    .setLabel('Back')
                    .setStyle(ButtonStyle.Danger),
            )
    
        const backButton = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('back')
                    .setLabel('Back')
                    .setStyle(ButtonStyle.Danger),
            )
        //#endregion

        // Handle users
        await battle_data.users.forEach(async (user) => {
            if (user.user_type != UserType.Player) {
                user.action_selected = functions.get_ai_action(user, battle_data);

                // Continue on if everyone has selected (which should happen at the end)
                if (battle_data.users.every(u => u.action_selected !== false)) {
                    db.battle_data.set(battle_id, battleData);
                    await functions.process_battle_actions(battle_id);
                }
            } else {
                console.log(user.thread);
                await user.thread.send({ content: `### -- Select An Action --`, components: [inputRow, inputRow2, inputRow3] });

                const inputCollector = user.thread.createMessageComponentCollector();
                
                await inputCollector.on('collect', async i => {
                    let customId = i.customId;
                    let activeOoch = user.party[user.active_slot];
                    
                    switch(customId) {

                        case BattleInput.Back:
                            await i.update({ content: `### -- Select An Action --`, components: [inputRow, inputRow2, inputRow3] });
                        break;
                        
                        case BattleInput.Attack:
                            let move_id, move_name, move_type, move_damage, move_effective_emote = '',
                                buttonStyle = ButtonStyle.Primary;

                            // Get the Oochamon's Attack options
                            for (let i = 0; i < activeOoch.moveset.length; i++) {
                                move_id = activeOoch.moveset[i];
                                move_name = db.move_data.get(`${move_id}`, 'name')
                                move_type = db.move_data.get(`${move_id}`, 'type')
                                move_damage = db.move_data.get(`${move_id}`, 'damage')
                                
                                // TODO: Figure out how to display this properly
                                /*
                                move_effective_emote = type_effectiveness(move_type, ooch_enemy.type);
                                let buttonStyle = ButtonStyle.Primary
                                if (move_effective_emote[0] > 1) {
                                    move_effective_emote = ' △';
                                    buttonStyle = ButtonStyle.Success
                                } else if (move_effective_emote[0] < 1) {
                                    move_effective_emote = ' ▽';
                                    buttonStyle = ButtonStyle.Danger
                                } else {
                                    move_effective_emote = '';
                                }
            
                                if (move_damage == 0) {
                                    move_effective_emote = '';
                                    buttonStyle = ButtonStyle.Secondary
                                }*/
            
                                moveButtons.addComponents(
                                    new ButtonBuilder()
                                        .setCustomId(`atk_${move_id}`)
                                        .setLabel(`${move_name} ${move_effective_emote}`)
                                        .setStyle(buttonStyle)
                                        .setEmoji(`${type_to_emote(move_type)}`)
                                )
                            }
            
                            // Switch message to be about using the move input
                            await i.update({ content: `Select a move to use!`, components: [moveButtons, backButton]});

                        break;
                        // Selecting a move
                        case customId.includes('atk_'):
                            if (battle_data.users.length == 2) {
                                let enemy_user = battle_data.users.filter(u => u.team_id != user_obj.team_id)[0];
                                let move_id = customId.replace('atk_', '');
                                user.action_selected = functions.new_battle_action_attack(user.user_id, enemy_user.user_id, move_id);
                            } else {
                                // TODO: Handle more than 1 user, this needs a new submenu
                            }

                            i.update({ content: 'Waiting for other players...', components: [], embeds: [] });

                            // Continue on if everyone has selected (which should happen at the end)
                            if (battle_data.users.every(u => u.action_selected !== false)) {
                                db.battle_data.set(battle_id, battleData);
                                inputCollector.stop();
                                await functions.process_battle_actions(battle_id);
                            }
                        break;

                        case BattleInput.Switch:

                        break;

                        case BattleInput.Bag:
                            
                        break;
                        case BattleInput.BagHeal:

                        break;

                        case BattleInput.BagPrism:

                        break;

                        case BattleInput.Run:
                            user.action_selected = functions.new_battle_action_run(user.user_id);

                            i.update({ content: 'Waiting for other players...', components: [], embeds: [] });

                            // Continue on if everyone has selected (which should happen at the end)
                            if (battle_data.users.every(u => u.action_selected !== false)) {
                                db.battle_data.set(battle_id, battleData);
                                inputCollector.stop();
                                functions.handle_battle_action(battle_id);
                            }

                        break;

                        // TODO: Add this, and make support for multiple Oochamon somehow
                        case BattleInput.Info:
                            // let plrOochPrisms = '';
                            // for (let ooch of d) {
                            //     plrOochPrisms += ooch.alive ? '<:item_prism:1274937161262698536>' : `❌`;
                            // }
            
                            // let enemyOochPrisms = '';
                            // for (let ooch of ooch_enemy_profile.ooch_party) {
                            //     enemyOochPrisms += ooch.alive ? '<:item_prism:1274937161262698536>' : `❌`;
                            // }
            
                            // let oochInfoFields = [];
                            // const formatStatBar = (stat) => {
                            //     return `${stat > 0 ? '▲' : '▼'}`.repeat(Math.abs(stat)) + '○'.repeat(8 - Math.abs(stat));
                            // };
            
                            // // Setup field info for the embed about both oochamon
                            // for (let ooch of [ooch_plr, ooch_enemy]) {
                            //     let oochStatusEffects = ooch.status_effects.map(v => db.status_data.get(v, 'emote'));
                                
                            //     let infoStr = `**Oochamon Left:** ${oochInfoFields.length == 0 ? plrOochPrisms : enemyOochPrisms}\n` +
                            //                 `**Type:** ${type_to_emote(ooch.type)} **${ooch.type.map(v => _.capitalize(v)).join(' | ')}**\n` +
                            //                 `**Ability:** ${db.ability_data.get(ooch.ability, 'name')}\n` +
                            //                 `**Status Effects:** ${oochStatusEffects.length != 0 ? `${oochStatusEffects.join('')}` : `None`}\n\n` +
                            //                 `**Stat Changes:**\n` +
                            //                 `Atk: ${formatStatBar(ooch.stats.atk_mul)}\n` +
                            //                 `Def: ${formatStatBar(ooch.stats.def_mul)}\n` +
                            //                 `Spd: ${formatStatBar(ooch.stats.spd_mul)}\n` +
                            //                 `Eva: ${formatStatBar(ooch.stats.eva_mul)}\n` +
                            //                 `Acc: ${formatStatBar(ooch.stats.acc_mul)}\n`;
            
                            //     if (ooch != ooch_enemy) {
                            //         let moveset_str = ``;
                            //         for (let move_id of ooch.moveset) {
                            //             let move = db.move_data.get(move_id);
                            //             move.accuracy = Math.abs(move.accuracy);
                            //             if (move.damage !== 0) {
                            //                 moveset_str += `${type_to_emote(move.type)} **${move.name}**: **${move.damage}** power, **${move.accuracy}%** accuracy\n`;
                            //             } else {
                            //                 moveset_str += `${type_to_emote(move.type)} **${move.name}**: **${move.accuracy}%** accuracy\n`;
                            //             }
                            //         }
                            //         infoStr += `\n**${ooch.emote} ${ooch.nickname}'s Moveset:**\n${moveset_str}`;
                            //     }
            
                            //     oochInfoFields.push({
                            //         name: `${ooch == ooch_plr ? 'Player' : 'Enemy'} (Lv. ${ooch.level} ${ooch.emote} ${ooch.nickname})`,
                            //         value: infoStr,
                            //         inline: true,
                            //     });
                            // }
            
            
                            // let battleInfoEmbed = new EmbedBuilder()
                            //     .setTitle('Battle Information 📒')
                            //     .setDescription(`**Turn #${ooch_plr_profile.battle_turn_counter}**\n`)
                            //     .addFields(oochInfoFields)
                            // let info_msg = await thread.send({ content: null, embeds: [battleInfoEmbed], components: [back_button]});
                        break;
                    }

                    
                });
            }
        }); 
    },

    /**
     * Checks if any oochamon have been fainted
     * @param {Object} battle_data The current battle_data
     */
    battle_faint_check: async function(battle_data) {
        let string_to_send = '';
        let active_teams = [];
        // Get the players active oochamon, check if they are alive
        for(let user of battle_data.users){
            let active_ooch = user.party[user.active_slot];
            let user_defeated = true;
            let user_next_slot = 999;
            if(active_ooch.current_hp <= 0 && active_ooch.alive == true){
                
                
                active_ooch.current_hp = 0;
                active_ooch.alive = false;

                string_to_send += `${user.name}'s ${active_ooch.emote} ${active_ooch.nickname} was defeated!`
                
                for(let [i, party_ooch] of user.party.entries()){
                    if(party_ooch.hp > 0){
                        user_defeated = false;
                        user_next_slot = min(user_next_slot, i);
                    }
                }

                if(user_defeated){
                    string_to_send += `${user.name}'s party was wiped out!`
                    user.defeated = true;
                }
                else{
                    battle_data.end_of_turn_switch_queue.push(user.user_id);
                    if(!active_teams.includes(user.team_id)){
                        active_teams.push(user.team_id);
                    }
                }
            }
        }

        if(active_teams.length < 2){
            //Finish the battle
        }
        
        return(string_to_send);
    },

    //Handle letting the users switch mons during end of round here
    end_of_round_switch : async function(battle_data){
        let users = battle_data.users;
        let next_slot = 9999;
        for(let user of users){
            switch(user.user_type){
                case UserType.Wild:
                case UserType.NPCTrainer:
                case UserType.NPCSmart:
                    for(let [i, ooch] of user.party.entries()){
                        if(ooch.alive){ i = min(i, next_slot)}
                    }
                    
                    await functions.new_battle_action_switch(battle_data, user.user_id, next_slot, false);
                break;
                case UserType.Player:
                    //Prompt buttons here

                    //Submit their next slot for combat
                    await functions.new_battle_action_switch(battle_data, user.user_id, next_slot, false);
                break;
            }
        }


        let active_slot = ooch_plr_profile.ooch_active_slot;
        let ooch_plr = ooch_plr_profile.ooch_party[active_slot];
        let ooch_pos = active_slot;
        let moveset = ooch_plr.moveset;
        let move_id, move_name, move_damage, move_accuracy, turn_order; // Battle variables
        let displayEmbed = new EmbedBuilder();
        let battleSpeed = ooch_plr_profile.settings.battle_speed;
            
        // If our current oochamon sent out is dead, we need to get input to switch our oochamon.
        if (ooch_plr.current_hp <= 0) {
            let ooch_check, ooch_emote, ooch_hp, ooch_button_color, ooch_disable;
            let ooch_party = db.profile.get(user_id, 'ooch_party');
    
            // On death ability that affects the entire party:
            if (ooch_plr.ability === Ability.EasyGo) {
                for (let i = 0; i < ooch_party.length; i++) {
                    let plr = ooch_party[i];
                    if (plr.id != ooch_plr.id && plr.current_hp != 0) {
                        plr.current_hp = _.clamp(Math.round(plr.current_hp + (plr.stats.hp / 10)), 0, plr.stats.hp)
                        ooch_party[i] = plr;
                    }
                }
                db.profile.set(user_id, ooch_party, 'ooch_party');
            }
    
            const switch_buttons_1_die = new ActionRowBuilder();
            const switch_buttons_2_die = new ActionRowBuilder();
    
            //Go through the party and create buttons of mons to switch to
            for (let i = 0; i < ooch_party.length; i++) {
                ooch_check = ooch_party[i];
                ooch_emote = db.monster_data.get([ooch_check.id], 'emote');
                ooch_hp = `${ooch_check.current_hp}/${ooch_check.stats.hp} HP`;
                ooch_button_color = ButtonStyle.Primary;
                ooch_disable = false;
    
                //Check if the slot we're checking is the currently active mon (dead) or another dead party member, and if so, disable the button
                if (i == db.profile.get(user_id, 'ooch_active_slot')) {
                    ooch_button_color = ButtonStyle.Success;
                    ooch_disable = true;
                } else if (ooch_check.current_hp <= 0) {
                    ooch_button_color = ButtonStyle.Primary;
                    ooch_disable = true;
                }
    
                ((i <= 1) ? switch_buttons_1_die : switch_buttons_2_die).addComponents(
                    new ButtonBuilder()
                        .setCustomId(`${i}`)
                        .setLabel(`${ooch_check.nickname} (${ooch_hp})`)
                        .setStyle(ooch_button_color)
                        .setEmoji(ooch_emote)
                        .setDisabled(ooch_disable),
                )
            }
    
            await thread.send({ content: `Select the new Oochamon you want to switch in!`, components: (switch_buttons_2_die.components.length != 0) ? [switch_buttons_1_die, switch_buttons_2_die] : [switch_buttons_1_die] })
            db.profile.inc(user_id, 'turn_msg_counter');
            db.profile.inc(user_id, 'battle_msg_counter');
    
            const s_collector_d = thread.createMessageComponentCollector({ max: 1 });
    
            await s_collector_d.on('collect', async ooch_sel => {
                let ooch_pick = db.profile.get(user_id, `ooch_party[${parseInt(ooch_sel.customId)}]`)
                let string_to_send = `You sent out ${db.monster_data.get(ooch_pick.id, 'emote')} **${ooch_pick.nickname}** to battle!`;
    
                // Reset stat multipliers for dead Oochamon
                ooch_plr.stats.atk_mul = 0;
                ooch_plr.stats.def_mul = 0;
                ooch_plr.stats.spd_mul = 0;
                ooch_plr.stats.acc_mul = 0;
                ooch_plr.stats.eva_mul = 0;
                ooch_plr.ability = ooch_plr.og_ability;
                ooch_plr.type = ooch_plr.og_type;
                ooch_plr.status_effects = [];
                ooch_plr.doom_timer = 4;
                db.profile.set(user_id, ooch_plr, `ooch_party[${active_slot}]`);
    
                // Check for on switch in abilities, player switching in, enemy ability activated
                switch (ooch_enemy.ability) {
                    case Ability.Alert:
                        ooch_enemy = modify_stat(ooch_enemy, Stats.Attack, 1);
                        string_to_send += `\n${ooch_enemy.emote} **${ooch_enemy.nickname}**'s ability **Alert** raised its ATK from the new Oochamon switch!`;
                    break;
                    case Ability.Duplicant:
                        if (ooch_pick.ability !== Ability.InvalidEntry) {
                            ooch_enemy.ability = ooch_pick.ability;
                            string_to_send += `\n${ooch_enemy.emote} **${ooch_enemy.nickname}**'s copied its ability to **${_.startCase(db.ability_data.get(ooch_pick.ability, 'name'))}** through it's **Duplicant** ability!`;
                        }
                    break;
                    case Ability.Nullify:
                        ooch_pick.ability = Ability.Null;
                        string_to_send += `\n${ooch_pick.emote} **${ooch_pick.nickname}**'s ability changed to **Null** from the ability **Nullify** from ${ooch_enemy.emote} **${ooch_enemy.nickname}**!`
                    break;
                }
    
                // Check for on switch in abilities, player switching in, player ability activated
                switch (ooch_pick.ability) {
                    case Ability.Boisterous:
                        ooch_enemy.current_hp = _.clamp(Math.floor(ooch_enemy.current_hp - ooch_enemy.stats.hp * 0.1), 1, ooch_enemy.stats.hp);
                        string_to_send += `\n${ooch_enemy.emote} **${ooch_enemy.nickname}** lost 10% of it's hp from the switch in ability **Boisterous** from ${ooch_pick.emote} **${ooch_pick.nickname}**!`;
                    break;
                    case Ability.Gentle:
                        ooch_enemy = modify_stat(ooch_enemy, Stats.Attack, -1);
                    break;
                    case Ability.Withering:
                        ooch_enemy = modify_stat(ooch_enemy, Stats.Defense, -1);
                        string_to_send += `\n${ooch_enemy.emote} **${ooch_enemy.nickname}** had its defense lowered from the switch in ability **Withering** from ${ooch_pick.emote} **${ooch_pick.nickname}**!`;
                    break;
                }
    
                let ooch_pos = parseInt(ooch_sel.customId);
                ooch_plr = ooch_pick;
                db.profile.set(user_id, ooch_pos, 'ooch_active_slot');
                active_slot = ooch_pos;
    
                // Update on switch in stats
                ooch_plr = ability_stat_change(ooch_plr, ooch_plr_profile.ooch_party);
                string_to_send += `\n${ooch_plr[1]}`;
                ooch_plr = ooch_plr[0];
                
                await ooch_sel.update({ content: string_to_send, components: [] })
                await prompt_battle_input(thread, user_id);
            });
            
        } else { // If our currently sent out Oochamon is alive, do input as normal.
    
        let sel_msg = await thread.send({ content: `### -- Select An Action --`, components: [row, row2, row3] });
        db.profile.inc(user_id, 'turn_msg_counter');
        db.profile.inc(user_id, 'battle_msg_counter');
        const collector = thread.createMessageComponentCollector({ max: 1 });
    
        await collector.on('collect', async sel => {
            await sel_msg.delete().catch(() => {});
            db.profile.dec(user_id, 'turn_msg_counter');
            db.profile.dec(user_id, 'battle_msg_counter');
            switch (sel.customId) {
                case 'fight':
                    function calculate_speed(ooch_obj) {
                        let speed = ooch_obj.stats.spd * (ooch_obj.stats.spd_mul + 1);
                        if (ooch_obj.status_effects.includes(Status.Snare)) speed /= 100;
                        if (ooch_obj.ability == Ability.Immobile) speed /= 100; 
                    
                        return speed;
                    }

                    //Get the speed values for the oochamons in the fighterino
                    let enemy_speed = calculate_speed(ooch_enemy);
                    let plr_speed = calculate_speed(ooch_plr);

                    //Turn Order
                    if (enemy_speed > plr_speed) { // Enemy goes first
                        turn_order = ['e', 'p'];
                    } else if (plr_speed > enemy_speed){ // Player goes first
                        turn_order = ['p', 'e'];
                    } else if (ooch_enemy.stats.spd > ooch_plr.stats.spd){ // (Speed tie use base stats) Enemy goes first
                        turn_order = ['e', 'p'];
                    } else if (ooch_plr.stats.spd > ooch_enemy.stats.spd){ // (Speed tie use base stats) Player goes first
                        turn_order = ['p', 'e'];
                    } else{ //Do a coinflip in the case of a speed tie
                        turn_order = Math.random() < .5 ? turn_order = ['e', 'p'] : turn_order = ['p', 'e'];
                    }

                    await thread.send(`# Turn ${db.profile.get(user_id, 'battle_turn_counter')}`);
                    db.profile.inc(user_id, 'turn_msg_counter');
                    db.profile.inc(user_id, 'battle_msg_counter');

                    for (let i = 0; i < turn_order.length; i++) {

                        let atk_id = atk.customId;
                        if (ooch_plr.ability === Ability.Uncontrolled) atk_id = _.sample(moveset);

                        if (turn_order[i] == 'p') {
                            // Player attacks enemy
                            [ooch_plr, ooch_enemy] = await attack(thread, user_id, atk_id, ooch_plr, ooch_enemy, '**------------ Player Turn ------------**');
                        } else {
                            // Enemy attacks player
                            atk_id = _.sample(ooch_enemy.moveset);
                            if (ooch_enemy.ability === Ability.Uncontrolled) atk_id = _.sample(ooch_enemy.moveset);
                            [ooch_enemy, ooch_plr] = await attack(thread, user_id, atk_id, ooch_enemy, ooch_plr, '**------------ Enemy Turn ------------**');
                        }

                        // Update ooch_enemy and ooch_plr in the database.
                        db.profile.set(user_id, ooch_plr, `ooch_party[${ooch_plr_profile.ooch_active_slot}]`);
                        db.profile.set(user_id, ooch_enemy, `ooch_enemy.ooch_party[${ooch_enemy_profile.ooch_active_slot}]`);

                        // Victory/Defeat Check
                        let victory_check = await victory_defeat_check(thread, user_id, ooch_enemy, ooch_plr);
                        if (victory_check == true) return;
                        
                        // The next user doesn't get a turn if we defeat their Oochamon
                        if (i == 0 && ((turn_order[i] == 'p' && ooch_enemy.current_hp <= 0) || (turn_order[i] == 'e' && ooch_plr.current_hp <= 0))) {
                            break;
                        }

                    }

                    //Apply Status Effects and other end of turn stuff
                    await end_of_round(thread, user_id, ooch_plr, ooch_enemy);
                    
                    //Double check for Victory/Defeat after status effects have happened
                    let victory_check = await victory_defeat_check(thread, user_id, ooch_enemy, ooch_plr);
                    if (victory_check == true) return;

                    // Prompt for more input
                    await prompt_battle_input(thread, user_id);
                break;
                case 'switch':
                    let ooch_inv = db.profile.get(user_id, 'ooch_party')
                    let ooch_check, ooch_emote, ooch_name, ooch_hp, ooch_button_color, ooch_prev, ooch_disable;
    
                    // Check if we have only 1 oochamon.
                    if (ooch_inv.length == 1) {
                        thread.send('You only have 1 oochamon in your party, so you cannot switch.' +
                        '\nSelect a different action!');
                        db.profile.inc(user_id, 'turn_msg_counter');
                        db.profile.inc(user_id, 'battle_msg_counter');
                        
                        // Prompt for more input
                        await prompt_battle_input(thread, user_id);
                        return;
                    }
    
                    for (let i = 0; i < ooch_inv.length; i++) {
                        ooch_check = ooch_inv[i];
                        ooch_emote = db.monster_data.get([ooch_check.id], 'emote');
                        ooch_name = ooch_check.nickname;
                        ooch_hp = `${ooch_check.current_hp}/${ooch_check.stats.hp} HP`;
                        ooch_button_color = ButtonStyle.Primary;
                        ooch_disable = false;
    
                        if (i == db.profile.get(user_id, 'ooch_active_slot')) {
                            ooch_button_color = ButtonStyle.Success;
                            ooch_prev = ooch_check;
                            ooch_disable = true;
                        }
                        else if (ooch_check.current_hp <= 0) {
                            ooch_disable = true;
                        }
    
                        ((i <= 1) ? switch_buttons_1 : switch_buttons_2).addComponents(
                            new ButtonBuilder()
                                .setCustomId(`${i}`)
                                .setLabel(`Lv. ${ooch_check.level} ${ooch_name} (${ooch_hp})`)
                                .setStyle(ooch_button_color)
                                .setEmoji(ooch_emote)
                                .setDisabled(ooch_disable),
                        )
                    }
    
                    let switch_msg = await thread.send({ content: `**------------ Player Turn ------------**` + 
                    `\nSelect the new Oochamon you want to switch in!`, components: (switch_buttons_2.components.length != 0) ? [switch_buttons_1, switch_buttons_2, back_button] : [switch_buttons_1, back_button] })
                    db.profile.inc(user_id, 'turn_msg_counter');
                    db.profile.inc(user_id, 'battle_msg_counter');
    
                    const s_collector = thread.createMessageComponentCollector({ max: 1 });
    
                    await s_collector.on('collect', async ooch_sel => {
    
                        if (ooch_sel.customId == 'back') {
                            s_collector.stop();
                            await switch_msg.delete();
                            db.profile.dec(user_id, 'turn_msg_counter');
                            db.profile.dec(user_id, 'battle_msg_counter');
                            await prompt_battle_input(thread, user_id);
                            return;
                        }
                            
                        await thread.send(`# Turn ${db.profile.get(user_id, 'battle_turn_counter')}`);
                        db.profile.inc(user_id, 'turn_msg_counter');
                        db.profile.inc(user_id, 'battle_msg_counter');
    
                        let ooch_pick = db.profile.get(user_id, `ooch_party[${parseInt(ooch_sel.customId)}]`)
                        let string_to_send = `You switched your active Oochamon from ${db.monster_data.get(ooch_prev.id, 'emote')} **${ooch_prev.nickname}** to ${db.monster_data.get(ooch_pick.id, 'emote')} **${ooch_pick.nickname}**.`;
                        displayEmbed = new EmbedBuilder()
                        displayEmbed.setColor('#0095ff')
                        displayEmbed.setTitle('↩️ Switch ↩️')
    
                        // Reset stat multipliers for oochamon being swapped
                        ooch_prev.stats.atk_mul = 0;
                        ooch_prev.stats.def_mul = 0;
                        ooch_prev.stats.spd_mul = 0;
                        ooch_prev.stats.acc_mul = 0;
                        ooch_prev.stats.eva_mul = 0;
                        ooch_prev.ability = ooch_prev.og_ability;
                        ooch_prev.type = ooch_prev.og_type;
                        ooch_prev.doom_timer = 4;
                        db.profile.set(user_id, ooch_prev, `ooch_party[${active_slot}]`);
    
                        // Check for on switch in abilities, player switching in, enemy ability activated
                        switch (ooch_enemy.ability) {
                            case Ability.Alert:
                                ooch_enemy = modify_stat(ooch_enemy, Stats.Attack, 1);
                                string_to_send += `\n${ooch_enemy.emote} **${ooch_enemy.nickname}**'s ability **Alert** raised its ATK from the new Oochamon switch!`;
                            break;
                            case Ability.Duplicant:
                                if (ooch_pick.ability !== Ability.InvalidEntry) {
                                    ooch_enemy.ability = ooch_pick.ability;
                                    string_to_send += `\n${ooch_enemy.emote} **${ooch_enemy.nickname}**'s copied its ability to **${_.startCase(db.ability_data.get(ooch_pick.ability, 'name'))}** through it's **Duplicant** ability!`;
                                }
                            break;
                            case Ability.Nullify:
                                ooch_pick.ability = Ability.Null;
                                string_to_send += `\n${ooch_pick.emote} **${ooch_pick.nickname}**'s ability changed to **Null** from the ability **Nullify** from ${ooch_enemy.emote} **${ooch_enemy.nickname}**!`
                            break;
                        }
    
                        // Check for on switch in abilities, player switching in, player ability activated
                        switch (ooch_pick.ability) {
                            case Ability.Boisterous:
                                ooch_enemy.current_hp = _.clamp(Math.floor(ooch_enemy.current_hp - ooch_enemy.stats.hp * 0.1), 1, ooch_enemy.stats.hp);
                                string_to_send += `\n${ooch_enemy.emote} **${ooch_enemy.nickname}** lost 10% of it's hp from the switch in ability **Boisterous**!`;
                            break;
                            case Ability.Gentle:
                                ooch_enemy = modify_stat(ooch_enemy, Stats.Attack, -1);
                            break;
                            case Ability.Withering:
                                ooch_enemy = modify_stat(ooch_enemy, Stats.Defense, -1);
                                string_to_send += `\n${ooch_enemy.emote} **${ooch_enemy.nickname}** had its defense lowered from the switch in ability **Withering** from ${ooch_pick.emote} **${ooch_pick.nickname}**!`;
                            break;
                        }
                    
                        ooch_pos = parseInt(ooch_sel.customId);
                        ooch_plr = ooch_pick;
                        db.profile.set(user_id, ooch_pos, 'ooch_active_slot');
                        // Update on switch in stats
                        ooch_plr = ability_stat_change(ooch_plr, ooch_plr_profile.ooch_party);
                        string_to_send += `\n${ooch_plr[1]}`;
                        ooch_plr = ooch_plr[0];
    
                        displayEmbed.setDescription(string_to_send)
                        await ooch_sel.update({ content: `**------------ Player Turn ------------**`, embeds: [displayEmbed], components: [] })
    
                        db.profile.set(user_id, ooch_plr, `ooch_party[${ooch_pos}]`);
    
                        // Enemy attacks player
                        let atk_id = ooch_enemy.moveset[_.random(0,ooch_enemy.moveset.length-1)];
                        [ooch_enemy, ooch_plr] = await attack(thread, user_id, atk_id, ooch_enemy, ooch_plr, '**------------ Enemy Turn ------------**');
    
                        //Apply Status Effects and other end of turn stuff
                        await end_of_round(thread, user_id, ooch_plr, ooch_enemy);                        
    
                        // Victory/Defeat Check
                        let victory_check = await victory_defeat_check(thread, user_id, ooch_enemy, ooch_plr, true);
                        if (victory_check == true) return;
    
                        // Prompt for more input
                        await prompt_battle_input(thread, user_id);
    
                    });
                break;
                case 'bag':
                    //#region
                    let heal_inv = db.profile.get(user_id, 'heal_inv');
                    let heal_inv_keys = Object.keys(heal_inv);
                    let prism_inv = db.profile.get(user_id, 'prism_inv');
                    let prism_inv_keys = Object.keys(prism_inv);
                    let bag_select = new ActionRowBuilder();
                    displayEmbed = new EmbedBuilder();
                    
                    if (heal_inv_keys.length == 0) bag_buttons.components[0].disabled = true;
                    if (prism_inv_keys.length == 0) bag_buttons.components[1].disabled = true;
                    if (heal_inv_keys.length == 0 && prism_inv_keys.length == 0) {
                        thread.send(`You don't have any items, so you can't use any!` +
                        `\nSelect a different action!`)
    
                        await prompt_battle_input(thread, user_id);
                        return;
                    }
    
                    let bag_msg = await thread.send({ content: `Select the item category you'd like to use an item in!`, components: [bag_buttons]});
                    db.profile.inc(user_id, 'turn_msg_counter');
                    db.profile.inc(user_id, 'battle_msg_counter');
    
                    const b_collector = thread.createMessageComponentCollector({ componentType:  ComponentType.Button });
                    let prism_collector;
                    let heal_collector;
    
                    await b_collector.on('collect', async i_sel => {
    
                        if (i_sel.customId == 'back') {
                            b_collector.stop();
                            if (prism_collector != undefined) prism_collector.stop();
                            if (heal_collector != undefined) heal_collector.stop();
                            await bag_msg.delete();
                            db.profile.dec(user_id, 'turn_msg_counter');
                            db.profile.dec(user_id, 'battle_msg_counter');
                            await prompt_battle_input(thread, user_id);
                            return;
                        }
    
                        if (prism_collector != undefined) prism_collector.stop();
                        if (heal_collector != undefined) heal_collector.stop();
    
                        if (i_sel.customId == 'heal_button') {
                            bag_select = new ActionRowBuilder();
                            let heal_select_options = [];
                            for (let i = 0; i < heal_inv_keys.length; i++) {
                                let id = heal_inv_keys[i];
                                let amount = db.profile.get(user_id, `heal_inv.${heal_inv_keys[i]}`)
    
                                if (amount > 0 && amount != undefined) {
                                    heal_select_options.push({ 
                                        label: `${db.item_data.get(id, 'name')} (${amount})`,
                                        description: db.item_data.get(id, 'description_short').slice(0, 100),
                                        value: `${id}`,
                                        emoji: db.item_data.get(id, 'emote'),
                                    })
                                }
                            }
    
                            bag_select.addComponents(
                                new StringSelectMenuBuilder()
                                    .setCustomId('heal_select')
                                    .setPlaceholder('Select an item in your heal inventory to use!')
                                    .addOptions(heal_select_options),
                            );
    
                            await i_sel.update({ content: `Select the healing item you'd like to use!`, components: [bag_select, bag_buttons] })
    
                            heal_collector = thread.createMessageComponentCollector({ componentType: ComponentType.StringSelect, max: 1 });
    
                            await heal_collector.on('collect', async item_sel => {
                                let item_id = item_sel.values[0];
                                let item_data = db.item_data.get(item_id);
    
                                if (db.profile.get(user_id, `heal_inv.${item_id}`) == undefined) return;
                                
                                ooch_plr = item_use(user_id, ooch_plr, item_id)
                                db.profile.set(user_id, ooch_plr, `ooch_party[${active_slot}]`);
                                let item_usage_text = '';
                                switch (item_data.type) {
                                    case 'potion': item_usage_text = ` and healed **${item_data.potency}** HP!`; break;
                                    case 'status': item_usage_text = ` and recovered from **${db.status_data.get(item_data.potency, 'name').toUpperCase()}**!`; break;
                                }
    
                                if (ooch_plr.alive == false) item_usage_text = ', but it failed, because the Oochamon has fainted.'
    
                                displayEmbed.setColor('#02ff2c');
                                displayEmbed.setTitle(`❤️ Healing ❤️`)
                                displayEmbed.setDescription(`${item_data.emote} Used **${item_data.name}**${item_usage_text}`)
                                item_sel.update({ content: `**------------ Player Turn ------------**`, embeds: [displayEmbed], components: []});
                                
                                db.profile.math(user_id, '-', 1, `heal_inv.${item_id}`);
    
                                b_collector.stop();
                                if (prism_collector != undefined) prism_collector.stop();
                                heal_collector.stop();
    
                                // Enemy attacks player
                                let atk_id = ooch_enemy.moveset[_.random(0,ooch_enemy.moveset.length-1)];
                                [ooch_enemy, ooch_plr] = await attack(thread, user_id, atk_id, ooch_enemy, ooch_plr, '**------------ Enemy Turn ------------**');
    
                                //Apply Status Effects and other end of turn stuff
                                await end_of_round(thread, user_id, ooch_plr, ooch_enemy);                        
    
                                // Victory/Defeat Check
                                let victory_check = await victory_defeat_check(thread, user_id, ooch_enemy, ooch_plr, true);
                                if (victory_check == true) return;
    
                                // Prompt for more input
                                await prompt_battle_input(thread, user_id);
                            });
    
                        } else if (i_sel.customId == 'prism_button') {
    
                            bag_select = new ActionRowBuilder();
                            let prism_select_options = [];
                            for (let i = 0; i < prism_inv_keys.length; i++) {
                                let id = prism_inv_keys[i];
                                let amount = db.profile.get(user_id, `prism_inv.${prism_inv_keys[i]}`)
    
                                if (amount > 0 && amount != undefined) {
                                    prism_select_options.push({ 
                                        label: `${db.item_data.get(id, 'name')} (${amount})`,
                                        description: db.item_data.get(id, 'description').slice(0,100),
                                        value: `${id}`,
                                        emoji: db.item_data.get(id, 'emote'),
                                    })
                                }
                            }
    
                            bag_select.addComponents(
                                new StringSelectMenuBuilder()
                                    .setCustomId('prism_select')
                                    .setPlaceholder('Select a prism you\'d like to use!')
                                    .addOptions(prism_select_options),
                            );
    
                            await i_sel.update({ content: `Select a prism to use!`, components: [bag_select, bag_buttons] })
    
                            prism_collector = thread.createMessageComponentCollector({ componentType: ComponentType.StringSelect, max: 1 });
    
                            await prism_collector.on('collect', async item_sel => { 
                                let item_id = item_sel.values[0];
                                let item_data = db.item_data.get(item_id);
                                if (db.profile.get(user_id, `prism_inv.${item_id}`) == undefined) return;
    
                                let string_to_send = `${item_data.emote} Used a **${item_data.name}** on the ${db.monster_data.get(ooch_enemy.id, 'emote')} **${ooch_enemy.nickname}**`;
                                
                                db.profile.math(user_id, '-', 1, `prism_inv.${item_id}`);
    
                                let prism_result = item_use(user_id, ooch_enemy, item_id)
                                b_collector.stop();
                                prism_collector.stop();
                                if (heal_collector != undefined) heal_collector.stop();
                                
                                // Setup embed
                                displayEmbed.setColor('#f2d751');
                                displayEmbed.setTitle(`<:item_prism:1274937161262698536> Prism Throw <:item_prism:1274937161262698536>`)
    
                                // If we caught the Oochamon successfully
                                if (prism_result == true) { 
                                    string_to_send += `\n\n**You successfully caught the wild ${ooch_enemy.nickname}!**`;
    
                                    if (db.profile.get(user_id, 'ooch_party').length < 4) {
                                        string_to_send += `\nIt's been added to your party.`;
                                    } else {
                                        string_to_send += `\nIt's been added to your box.`;
                                    }
    
                                    let user_profile = db.profile.get(user_id);
                                    let ooch_party = user_profile.ooch_party;
                                    let is_first_catch = (db.profile.get(user_id, `oochadex[${ooch_enemy.id}].caught`) == 0);
                                    
                                    // Distribute XP for a caught Oochamon
                                    // The Oochamon in the active slot at the moment of beating the Oochamon gets 1.25x more EXP than the others.
                                    exp_earned = battle_calc_exp(ooch_enemy.level, db.monster_data.get(ooch_enemy.id, 'evo_stage'), 1); //catching mons will always give 1x EXP
                                    if(is_first_catch) exp_earned *= 2;
    
                                    let exp_earned_main = Math.round(exp_earned * 1.25);
                                    if (ooch_plr.level != 50) {
                                        string_to_send += `\n${db.monster_data.get(ooch_plr.id, 'emote')} **${ooch_plr.nickname}** earned **${Math.round(exp_earned * 1.25)} exp!**` + 
                                                            ` (EXP: **${_.clamp(ooch_plr.current_exp + exp_earned_main, 0, ooch_plr.next_lvl_exp)}/${ooch_plr.next_lvl_exp})**`
                                    }
                                    if (ooch_party.length > 1) {
                                        string_to_send += `\nThe rest of your team earned **${exp_earned}** exp.`;
                                    }
                                    if(is_first_catch) string_to_send += `\n✨ *Gained 2x Experience from catching a New Oochamon!*`;
    
                                    for (let i = 0; i < ooch_party.length; i++) {
                                        if (i == user_profile.ooch_active_slot) { 
                                            db.profile.math(user_id, '+', Math.round(exp_earned * 1.25), `ooch_party[${i}].current_exp`);
                                        } else { 
                                            db.profile.math(user_id, '+', (ooch_party[i].alive === false ? exp_earned : Math.round(exp_earned / 2)), `ooch_party[${i}].current_exp`); 
                                        }
                                        
                                        // Check for level ups
                                        let ooch_data = db.profile.get(user_id, `ooch_party[${i}]`)
                                        if (ooch_data.current_exp >= ooch_data.next_lvl_exp) { // If we can level up
                                            ooch_data = level_up(ooch_data);
                                            string_to_send += `\n${ooch_data[1]}`;
                                            await db.profile.set(user_id, ooch_data[0], `ooch_party[${i}]`)
                                        }
                                    }
    
                                    displayEmbed.setDescription(string_to_send)
                                    await item_sel.update({ content: `**------------ Player Turn ------------**`, embeds: [displayEmbed], components: []});
    
                                    // Heal the caught Oochamon when you catch it.
                                    ooch_enemy.current_hp = ooch_enemy.stats.hp;
    
                                    // Have it check here if you want to send the Oochamon to your party or not
                                    if (db.profile.get(user_id, 'ooch_party').length < 4) {
                                        db.profile.push(user_id, ooch_enemy, `ooch_party`);
                                    } else {
                                        db.profile.push(user_id, ooch_enemy, `ooch_pc`)
                                    }
                                    db.profile.math(user_id, '+', 1, `oochadex[${ooch_enemy.id}].caught`)
                                    let infoEmbed = ooch_info_embed(ooch_enemy);
                                    let oochPng = infoEmbed[1];
                                    infoEmbed = infoEmbed[0];
                                    infoEmbed.setAuthor({ name: 'Here\'s some information about the Oochamon you just caught!' })
    
                                    // Wait a bit after finishing a battle to allow viewing info about Oochamon
                                    await thread.send({ embeds: [infoEmbed], files: [oochPng] });
                                    await db.profile.inc(user_id, 'turn_msg_counter');
                                    await db.profile.inc(user_id, 'battle_msg_counter');
    
                                    await wait(5000);
    
                                    await finish_battle(thread, user_id, true);
    
                                    return;
                                } else {
                                    string_to_send += `\n\nUnfortunately, your prism catch attempt failed...`;
                                    displayEmbed.setDescription(string_to_send);
                                    await item_sel.update({ content: `**------------ Player Turn ------------**`, embeds: [displayEmbed], components: []}).catch(() => {});
                                }
    
                                // Enemy attacks player
                                let atk_id = ooch_enemy.moveset[_.random(0,ooch_enemy.moveset.length-1)];
                                [ooch_enemy, ooch_plr] = await attack(thread, user_id, atk_id, ooch_enemy, ooch_plr, '**------------ Enemy Turn ------------**');
    
                                //Apply Status Effects and other end of turn stuff
                                await end_of_round(thread, user_id, ooch_plr, ooch_enemy);                        
    
                                // Victory/Defeat Check
                                let victory_check = await victory_defeat_check(thread, user_id, ooch_enemy, ooch_plr, true);
                                if (victory_check == true) return;
    
                                // Prompt for more input
                                await prompt_battle_input(thread, user_id);
                            });
                        } 
    
                    });
                    //#endregion
                break;
                case 'run':
                    if ((ooch_plr.stats.spd + ooch_plr.level * 15) / ((ooch_plr.stats.spd + ooch_plr.level * 10) + (ooch_enemy.stats.spd + ooch_enemy.level * 10) ) > Math.random()) {
                        await wait(battleSpeed);
                        await thread.send(`**------------ Player Turn ------------**` +
                        `\nYou successfully ran away!\nYour playspace will appear momentarily.`);
                        await db.profile.inc(user_id, 'turn_msg_counter');
                        await db.profile.inc(user_id, 'battle_msg_counter');
                        await finish_battle(thread, user_id);
                        return;
                    } else {
                        await wait(battleSpeed);
                        await thread.send(`**------------ Player Turn ------------**` + 
                        `\nYou failed to run away!`)
                        await db.profile.inc(user_id, 'turn_msg_counter');
                        await db.profile.inc(user_id, 'battle_msg_counter');
    
                        // Enemy attacks player
                        let atk_id = ooch_enemy.moveset[_.random(0,ooch_enemy.moveset.length-1)];
                        [ooch_enemy, ooch_plr] = await attack(thread, user_id, atk_id, ooch_enemy, ooch_plr, '**------------ Enemy Turn ------------**');
    
                        //Apply Status Effects and other end of turn stuff
                        await end_of_round(thread, user_id, ooch_plr, ooch_enemy);
    
                        // Victory/Defeat Check
                        let victory_check = await victory_defeat_check(thread, user_id, ooch_enemy, ooch_plr, true);
                        if (victory_check == true) return;
    
                        // Prompt for more input
                        await prompt_battle_input(thread, user_id);
                    }
                break;
                case 'info':
                    let plrOochPrisms = '';
                    for (let ooch of ooch_plr_profile.ooch_party) {
                        plrOochPrisms += ooch.alive ? '<:item_prism:1274937161262698536>' : `❌`;
                    }
    
                    let enemyOochPrisms = '';
                    for (let ooch of ooch_enemy_profile.ooch_party) {
                        enemyOochPrisms += ooch.alive ? '<:item_prism:1274937161262698536>' : `❌`;
                    }
    
                    let oochInfoFields = [];
                    const formatStatBar = (stat) => {
                        return `${stat > 0 ? '▲' : '▼'}`.repeat(Math.abs(stat)) + '○'.repeat(8 - Math.abs(stat));
                    };
    
                    // Setup field info for the embed about both oochamon
                    for (let ooch of [ooch_plr, ooch_enemy]) {
                        let oochStatusEffects = ooch.status_effects.map(v => db.status_data.get(v, 'emote'));
                        
                        let infoStr = `**Oochamon Left:** ${oochInfoFields.length == 0 ? plrOochPrisms : enemyOochPrisms}\n` +
                                    `**Type:** ${type_to_emote(ooch.type)} **${ooch.type.map(v => _.capitalize(v)).join(' | ')}**\n` +
                                    `**Ability:** ${db.ability_data.get(ooch.ability, 'name')}\n` +
                                    `**Status Effects:** ${oochStatusEffects.length != 0 ? `${oochStatusEffects.join('')}` : `None`}\n\n` +
                                    `**Stat Changes:**\n` +
                                    `Atk: ${formatStatBar(ooch.stats.atk_mul)}\n` +
                                    `Def: ${formatStatBar(ooch.stats.def_mul)}\n` +
                                    `Spd: ${formatStatBar(ooch.stats.spd_mul)}\n` +
                                    `Eva: ${formatStatBar(ooch.stats.eva_mul)}\n` +
                                    `Acc: ${formatStatBar(ooch.stats.acc_mul)}\n`;
    
                        if (ooch != ooch_enemy) {
                            let moveset_str = ``;
                            for (let move_id of ooch.moveset) {
                                let move = db.move_data.get(move_id);
                                move.accuracy = Math.abs(move.accuracy);
                                if (move.damage !== 0) {
                                    moveset_str += `${type_to_emote(move.type)} **${move.name}**: **${move.damage}** power, **${move.accuracy}%** accuracy\n`;
                                } else {
                                    moveset_str += `${type_to_emote(move.type)} **${move.name}**: **${move.accuracy}%** accuracy\n`;
                                }
                            }
                            infoStr += `\n**${ooch.emote} ${ooch.nickname}'s Moveset:**\n${moveset_str}`;
                        }
    
                        oochInfoFields.push({
                            name: `${ooch == ooch_plr ? 'Player' : 'Enemy'} (Lv. ${ooch.level} ${ooch.emote} ${ooch.nickname})`,
                            value: infoStr,
                            inline: true,
                        });
                    }
    
    
                    let battleInfoEmbed = new EmbedBuilder()
                        .setTitle('Battle Information 📒')
                        .setDescription(`**Turn #${ooch_plr_profile.battle_turn_counter}**\n`)
                        .addFields(oochInfoFields)
                    let info_msg = await thread.send({ content: null, embeds: [battleInfoEmbed], components: [back_button]});
    
                    const info_collector = thread.createMessageComponentCollector({ componentType:  ComponentType.Button });
                    await info_collector.on('collect', async i_sel => {
                        switch (i_sel.customId) {
                            case 'back':
                                info_collector.stop();
                                await info_msg.delete();
                                await prompt_battle_input(thread, user_id);
                            break;
                        }
                    });
                break;
            }
        });
        }
    },

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
    },

    /**
 * A helper function for type effectiveness, takes 2 types and figures out the
 * attack multiplier for the attacking type based on the defending type.
 * @param {String} attack_type The type that is attacking
 * @param {Array} target_type The type that is defending
 * @returns An array with structured like [attack_multiplier, attack_string]
 */
type_effectiveness: function(attack_type, target_type) {
    let multiplier = 1;
    let string = '';

    for (let type_defender of target_type) {
        switch(attack_type){
            case OochType.Neutral:
                switch(type_defender){
                    case OochType.Magic: multiplier *= .5; break;
                }
            break;
            case OochType.Fungal:
                switch(type_defender){
                    case OochType.Flame:   multiplier *= .5; break;
                    case OochType.Fungal:  multiplier *= .5; break;
                    case OochType.Stone:   multiplier *= 2; break;
                    case OochType.Ooze:    multiplier *= 2; break;
                    case OochType.Crystal: multiplier *= .5; break;
                    case OochType.Sound:   multiplier *= 2; break;
                }
            break;
            case OochType.Flame:
                switch(type_defender){
                    case OochType.Ooze:    multiplier *= .5; break;
                    case OochType.Flame:   multiplier *= .5; break;
                    case OochType.Stone:   multiplier *= .5; break;
                    case OochType.Void:    multiplier *= 2; break;
                    case OochType.Fungal:  multiplier *= 2; break;
                    case OochType.Crystal: multiplier *= .5; break;
                    case OochType.Cloth:   multiplier *= 2; break;
                }
            break;
            case OochType.Stone:
                switch(type_defender){
                    case OochType.Ooze:    multiplier *= .5; break;
                    case OochType.Tech:    multiplier *= 2; break;
                    case OochType.Flame:   multiplier *= 2; break;
                    case OochType.Crystal: multiplier *= 2; break;
                    case OochType.Sound:   multiplier *= .5; break;
                }
            break;
            case OochType.Tech:
                switch(type_defender){
                    case OochType.Magic:   multiplier *= .5; break;
                    case OochType.Ooze:    multiplier *= .5; break;
                    case OochType.Fungal:  multiplier *= 2; break;
                    case OochType.Stone:   multiplier *= 2; break;
                }
            break;
            case OochType.Ooze:
                switch(type_defender){
                    case OochType.Fungal:  multiplier *= .5; break;
                    case OochType.Ooze:    multiplier *= .5; break;
                    case OochType.Flame:   multiplier *= 2; break;
                    case OochType.Stone:   multiplier *= 2; break;
                }
            break;
            case OochType.Magic:
                switch(type_defender){
                    case OochType.Flame:  multiplier *= .5; break;
                    case OochType.Tech:   multiplier *=  2; break;
                    case OochType.Stone:  multiplier *=  2; break;
                    case OochType.Crystal: multiplier *= .5; break;
                }
            break;
            case OochType.Sound:
                switch(type_defender){
                    case OochType.Fungal:  multiplier *= .5; break;
                    case OochType.Crystal: multiplier *=  2; break;
                    case OochType.Stone:   multiplier *=  2; break;
                    case OochType.Cloth:   multiplier *= .5; break;
                    case OochType.Martial: multiplier *= .5; break; 
                }
            break;
            case OochType.Crystal:
                switch(type_defender){
                    case OochType.Cloth:    multiplier *=  2; break;
                    case OochType.Magic:    multiplier *=  2; break;
                    case OochType.Stone:    multiplier *= .5; break;
                    case OochType.Martial:  multiplier *=  2; break;
                }
            break;
            case OochType.Cloth:
                switch(type_defender){
                    case OochType.Sound:   multiplier *= 2; break;
                    case OochType.Fungal:  multiplier *= .5; break;
                    case OochType.Crystal: multiplier *= .5; break;
                }
            break;
            case OochType.Martial:
                switch(type_defender){
                    case OochType.Magic:  multiplier *= .5; break; 
                    case OochType.Ooze:   multiplier *= .5; break; 
                    case OochType.Stone:  multiplier *= 2; break; 
                }
            break;
            case OochType.Void:
                multiplier *= 1.5;
            break;
        }
    }
    
    multiplier = Math.min(8, Math.max(.125,multiplier))

    switch(multiplier){
        case(0.125):    string = '*Barely effective...*';        break;
        case(0.25):     string = '*Very ineffective...*';        break;
        case(0.5):      string = '*Not very effective...*';      break;
        case(2):        string = '*Super effective!*';           break;
        case(4):        string = '*Incredibly effective!*';      break;
        case(8):        string = '*Devastatingly effective!*';   break;
    }

    return([multiplier,string])
},
    item_use: function(user_id, ooch, item_id) {
        let item_data = db.item_data.get(item_id);
    
        if (item_data.type == 'potion') {
            if (db.profile.get(user_id, 'player_state') == PlayerState.Combat && ooch.alive == true) {
                ooch.current_hp += item_data.potency;
                ooch.current_hp = _.clamp(ooch.current_hp, 0, ooch.stats.hp);
                return ooch;
            } else if (db.profile.get(user_id, 'player_state') != PlayerState.Combat) {
                ooch.alive = true;
                let prev_hp = ooch.current_hp;
                ooch.current_hp += item_data.potency;
                ooch.current_hp = _.clamp(ooch.current_hp, 0, ooch.stats.hp);
                return(`\n${ooch.emote} ${ooch.nickname} recovered ${ooch.current_hp - prev_hp} HP.`);
            } 
            
        } else if (item_data.type == 'prism') {
            let status_bonus = 1;
            let prism_multiplier = item_data.potency;
            let prism_chance = prism_multiplier / ooch.level * (ooch.stats.hp / ooch.current_hp) * status_bonus * 2;
    
            if (Math.random() < prism_chance) {
                return true;
            } else {
                return false;
            }
        } else if (item_data.type == 'status') {
            let return_string = false;
            if (item_data.potency !== 'All') {
                ooch.status_effects = ooch.status_effects.filter(v => v != item_data.potency);
                return_string = `\n${ooch.emote} ${ooch.nickname} recovered from its ${item.potency}.`
                    
            } else {
                ooch.status_effects = [];
                return_string = `\n${ooch.emote} ${ooch.nickname} had its status effects removed.`
            }
            return return_string == false ? ooch : return_string;
        } else if (item_data.type == 'repel') {
            db.profile.set(user_id, item_data.potency, 'repel_steps'); 
        } 
        
    },
}

module.exports = functions;

