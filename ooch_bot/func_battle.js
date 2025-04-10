

const db = require("./db.js")
const wait = require('wait');
const { ActionRowBuilder, ButtonBuilder, StringSelectMenuBuilder, ButtonStyle, ComponentType, EmbedBuilder, ActionRow, AttachmentBuilder, Attachment } = require('discord.js');
const _ = require('lodash');
const { PlayerState, UserType, Stats, Ability, OochType, Move, TypeEmote, MoveTag, MoveTarget, BattleState, BattleAction, BattleInput, Weather, FieldEffect, StanceForms, BattleAi } = require("./types.js");
const { Status } = require('./types.js');
const { ooch_info_embed, check_chance, get_ooch_art } = require("./func_other.js");
const { Canvas, loadImage, FontLibrary } = require('skia-canvas');
const { get_blank_slot_actions, get_blank_battle_user } = require('./func_modernize.js')


const closeButton = new ActionRowBuilder()
    .addComponents(
        new ButtonBuilder()
            .setCustomId('close_prompt')
            .setLabel('Click To Dismiss')
            .setStyle(ButtonStyle.Danger),
    )

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
     * @param {Number} type Type of Battle UserType(Wild, NPCTrainer, User, OnlineUser)
     * @param {Object} options Additional data, data required varies by type
     * @returns 
     */
    generate_battle_user: async function(type, options) {
        const { create_ooch, move } = require('./func_play.js');
        const { botClient } = require("./index.js");

        let user_info = get_blank_battle_user();
        user_info.user_type = type;
        let party = [];
        let active_slot = 0;

        if(options.hasOwnProperty("user_index")){
            user_info.user_index = options.user_index;
        }
        
        switch (type) {
            case UserType.Wild:
                
                if(options.hasOwnProperty("party")){ //This mon is created via an event/ability
                    
                    let ooch_base = options.party[0];
                    let ooch = create_ooch(
                        ooch_base.id, ooch_base.level, ooch_base.moveset, false, 0, ooch_base.ability, 
                        ooch_base.hp_iv, ooch_base.atk_iv, ooch_base.def_iv, ooch_base.spd_iv );

                    party = [ooch];
                    user_info.is_catchable = true;
                    user_info.oochabux = options.coin;
                    user_info.team_id = options.team_id;
                    user_info.name = `${ooch.name}`;
                    user_info.name_possessive = `${ooch.name}'s`

                }
                else{
                    let ooch = create_ooch(options.ooch_id, options.ooch_level);
                    party = [ooch];
                    user_info.is_catchable = true;
                    user_info.team_id = options.team_id;
                    user_info.oochabux = _.random(5, 40);
                    user_info.name = `Wild ${ooch.name}`;
                    user_info.name_possessive = `${ooch.name}'s`
                }
                
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

                user_info.battle_ai = options.battle_ai;
                user_info.name = options.name;
                user_info.oochabux = options.coin;
                if (user_info.oochabux == 0) {
                    user_info.oochabux = (party_base.reduce((sum, ooch) => sum + ooch.level, 0)) * 15;
                }
                party = party_generated;
                user_info.is_catchable = options.is_catchable;
                user_info.team_id = options.team_id;
                user_info.battle_sprite = options.sprite_combat == false ? options.sprite_id.slice(0, 1) + options.sprite_id.slice(3) : options.sprite_combat;
            break;
            case UserType.Player:
                user_info.is_player = true;
                user_info.user_id = options.user_id;
                user_info.team_id = options.team_id;
                user_info.thread_id = options.thread_id;
                user_info.guild_id = options.guild_id;

                let profile = db.profile.get(user_info.user_id)
                if (options.profile != undefined && options.profile != false) {
                    profile = options.profile;
                }
                
                let guild = botClient.guilds.cache.get(user_info.guild_id);
                let member = await guild.members.fetch(user_info.user_id);
                user_info.name = member.displayName;
                
                user_info.battle_sprite = profile.player_sprite;
                party = profile.ooch_party;
                active_slot = profile.ooch_active_slot;
                user_info.display_msg_id = profile.display_msg_id;
                user_info.heal_inv = profile.heal_inv;
                user_info.prism_inv = profile.prism_inv;
                user_info.other_inv = profile.other_inv;
            break;
        }

        //Force swap to another slot if the active one's hp is 0
        if(party[active_slot].current_hp <= 0){
            active_slot = 0;
            for(let i = 0; i < party.length; i++){
                if(party[i].current_hp > 0){
                    active_slot = i;
                    break;
                }
            }
        }
        
        
        
        //Set battle-specific values/triggers here
        let slot_actions = [];
        for(let slot of party){
            let temp_slot = get_blank_slot_actions()
            temp_slot.hp_starting = slot.current_hp
            slot_actions.push(temp_slot)
        }

        user_info.party = party;
        user_info.active_slot = active_slot;
        user_info.slot_actions = slot_actions;
        user_info.name_possessive = user_info.name == 'Wild ' ? 'Wild' : user_info.name + '\'s';

        return user_info
    },

    /**
     * Resets all triggers that should be used once-per-turn
     * @param {Object} battle_data The battle_data
     */
    reset_this_turn_triggers(battle_data){
        for(let user of battle_data.users){
            for(let [i, slot] of user.slot_actions.entries()){
                slot.hp_starting = user.party[i].current_hp;

                for (const [key, value] of Object.entries(slot)) {
                    if(key.includes('this_turn')){
                        slot[key] = false;
                    }
                }
            }
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
    setup_battle: async function(users, weather, oochabux, turn_timer, allow_items, give_rewards, allow_run, fake_battle = false, scale_to_level = false, battle_bg = 'battle_bg_tutorial', is_online = false) {
        const { botClient } = require("./index.js");

        // Add index to users
        for (let i = 0; i < users.length; i++) {
            users[i].user_index = i;
            if (users[i].is_player) {
                db.profile.set(users[i].user_id, PlayerState.BattleSetup, 'player_state');
            }
        }

        // Setup the battle data
        let battleId = functions.generate_battle_id();

        let battleDataObj = {
            battle_id : battleId,
            battle_msg_counter : 0,
            turn_msg_counter : users.length, //This was 0, but because each user has an intro-message, we need to account for those
            battle_state : BattleState.Start,
            battle_action_queue : [],
            battle_speed : 1000,
            
            end_of_turn_switch_queue : [],

            turn_counter : 0,
            users : users,

            fake_battle : fake_battle,
            is_online : is_online,

            turn_timer : turn_timer,
            allow_items : allow_items,
            give_rewards : give_rewards,
            allow_run : allow_run,
            weather : weather,
            field_effect : FieldEffect.None,
            oochabux: oochabux,
            amount_of_teams: 2 // TODO: MAKE THIS DYNAMIC, I don't wanna deal with this rn lol -Jeff

        }

        if (fake_battle) {
            for(let [id, user] of battleDataObj.users.entries()) {
                for (let i = 0; i < user.party.length; i++) {
                    user.party[i].current_hp = user.party[i].stats.hp;
                    user.party[i].alive = true;
                    if (scale_to_level !== false) {
                        let new_stats = functions.get_stats(user.party[i].id, scale_to_level, user.party[i].stats.hp_iv, user.party[i].stats.atk_iv, user.party[i].stats.def_iv, user.party[i].stats.spd_iv);
                        user.party[i].stats.hp = new_stats[0];
                        user.party[i].stats.atk = new_stats[1];
                        user.party[i].stats.def = new_stats[2];
                        user.party[i].stats.spd = new_stats[3];
                        user.party[i].current_hp = user.party[i].stats.hp;
                        user.party[i].level = scale_to_level;
                    }
                }
            }
        }

        // Handle all the text
        let battleStartText, sendOutText, active_ooch, types_string;
        battleDataObj.battle_msg_counter += 2;
        
        for (let [id, user] of battleDataObj.users.entries()) {
            //Reset text messages per player
            battleStartText = '';
            sendOutText = '';

            //The current player in combat
            active_ooch = user.party[user.active_slot];
            types_string = ` ${functions.type_to_emote(active_ooch.type)}`;
            sendOutText += sendOutText += `You sent out ${active_ooch.emote} **${active_ooch.name}**! ${types_string}\n`

            if (users[id].is_player) {
                let my_team_id = users[id].team_id;
                for (let id2 in users) {
                    //All other players in combat
                    if(id2 != id){ 
                        let user2 = users[id2];
                        active_ooch = user2.party[user2.active_slot];
                        types_string = ` ${functions.type_to_emote(active_ooch.type)}`;
                        
                        if (user2.is_catchable) { //Wild oochamon
                            battleStartText += `## A Wild ${active_ooch.name} appeared!\n`;
                            if (db.profile.get(user.user_id, `oochadex[${active_ooch.id}].caught`) == 0) {
                                battleStartText += `<:item_prism:1274937161262698536> ***Uncaught Oochamon!***\n`
                            }
                            sendOutText += `The wild ${active_ooch.emote} **${active_ooch.name}** wants to battle! ${types_string}\n`
                        }
                        else if (user2.team_id != my_team_id) { //Opposing Player/NPC
                            battleStartText += `## ${user2.name} wants to battle!\n`;
                            sendOutText += `${user2.name} sent out ${active_ooch.emote} **${active_ooch.name}**! ${types_string}\n`
                        }
                        else { //Allied Player/NPC
                            battleStartText += `## ${user2.name} allies with you!\n`; 
                            sendOutText += `${user2.name} sent out ${active_ooch.emote} **${active_ooch.name}**! ${types_string}\n`
                        }
                    }
                }

                let thread = botClient.channels.cache.get(user.thread_id);

                db.profile.set(user.user_id, battleDataObj.battle_id, 'cur_battle_id');

                // Delete playspace to enter battle
                let playspace_msg = await thread.messages.fetch(db.profile.get(user.user_id, 'display_msg_id'));
                await playspace_msg.delete().catch(() => {});

                // Generate intro to battle image
                let battle_image = await functions.generate_battle_image(battleDataObj, user.user_index, battle_bg);
                thread.send({ 
                    content: battleStartText,
                    files: [battle_image]
                });
                await wait(battleDataObj.delay);
                await thread.send({content: '## ------ Battle Start ------', embeds : [functions.battle_embed_create(`${sendOutText}`)]});

            }
        }

        //Handle switch-in abilities
        let switch_in_text = '';
        for(let user of battleDataObj.users){
            switch_in_text += functions.use_switch_ability(battleDataObj, user.user_index, user.active_slot, user.active_slot, false);
        }

        db.battle_data.set(battleId, battleDataObj);

        switch(weather){
            case Weather.Heatwave: 
                switch_in_text += '\n☀️ *The extreme heat of the area makes the Oochamon start to sweat...*'
            break;
            case Weather.Thunderstorm:
                switch_in_text += '\n⛈️ *A thunderstorm starts to brew...*'
            break;
        }

        if(switch_in_text != ''){
            await functions.distribute_messages(battleDataObj, { embeds : [functions.battle_embed_create(switch_in_text)]});
        }

        //Send the round start message
        await functions.distribute_messages(battleDataObj, { embeds : [functions.generate_round_start_embed(battleDataObj)]});

        db.battle_data.set(battleId, battleDataObj);

        await functions.prompt_battle_actions(battleId);

        // This is mostly just to fix people running play while a battle is setup
        for(let user of battleDataObj.users){
            if (user.is_player) {
                db.profile.set(user.user_id, PlayerState.Combat, 'player_state');
            }
        }
    },

    // #region Battle Action New
    // #endregion

    /**
     * Creates a battle action where a user joins the battle
     * @param {Object} battle_data 
     * @param {String} user_index 
     * @param {String} text_to_show 
     * @param {Number} name 
     * @param {Array} battle_sprite 
     * @param {Array} team_id 
     * @param {Array} party 
     */
    new_battle_action_add_user: async function(battle_data, user_index, text_to_show, name, battle_sprite, team_id, party){
        let user_options = get_blank_battle_user();

        user_options.name = name;
        user_options.name_possessive = (name == 'Wild Oochamon' ? 'Wild' : name + '\'s');
        user_options.battle_sprite = battle_sprite;
        user_options.battle_ai = BattleAi.Basic;
        user_options.user_type = UserType.Wild;
        user_options.team_id = team_id;
        user_options.is_catchable = false;
        user_options.party = party;
        user_options.user_index = user_index
        
        
        let user = await functions.generate_battle_user(user_options.user_type, user_options);
        battle_data.users.push(user);
        console.log(`New User: ${user.user_index}`);

        let action = {
            action_type : BattleAction.UserJoin,
            priority : BattleAction.UserJoin,
            user_index : user_index,
            text_to_show : text_to_show,
            user : user
        }

        battle_data.battle_action_queue.push(action);
    },


    /**
     * Create an Attack action
     * @param {Object} battle_data The battle data object
     * @param {Number} user_index The user which is causing this action
     * @param {Number} target_user_index The user to be hit by the move
     * @param {Number} move_id The id of the move to be used
     * @returns returns a battle action object
     */
    new_battle_action_attack : function(battle_data, user_index, target_user_index, move_id) {

        let action = {
            action_type : BattleAction.Attack,
            priority : BattleAction.Attack,
            user_index : user_index,
            target_user_index : target_user_index,
            move_id : move_id
        }

        battle_data.battle_action_queue.push(action);
    },

    /**
     * Create an Stance Change action
     * @param {Object} battle_data The battle data object
     * @param {Number} user_index The user which is causing this action
     * @param {Number} stance_to The id of the stance to shift to
     * @returns returns a battle action object
     */
    new_battle_action_stance_change : function(battle_data, user_index, stance_to) {

        let action = {
            action_type : BattleAction.StanceChange,
            priority : BattleAction.StanceChange,
            user_index : user_index,
            stance_to : stance_to
        }

        battle_data.battle_action_queue.push(action);
    },

    /**
     * Create a Run action
     * @param {Object} battle_data The battle data object
     * @param {Number} user_index The user which is causing this action
     * @returns returns a battle action object
     */
    new_battle_action_run : function(battle_data, user_index){
        let action = {
            action_type : BattleAction.Run,
            priority : BattleAction.Run,
            user_index : user_index
        }

        battle_data.battle_action_queue.push(action);
    },

    /**
     * Create a Switch action
     * @param {Object} battle_data The battle data object
     * @param {Number} user_index The user which is causing this action
     * @param {Number} slot_target The slot to switch to
     * @param {Boolean} is_switching Whether the user is switching a mon in or just sending one out
     * @param {Boolean} skip_initial_text Whether to skip the "User sent out/switched" lines of text
     * @returns returns a battle action object
     */
    new_battle_action_switch : function(battle_data, user_index, slot_target, is_switching, skip_initial_text = false){
        let action = {
            action_type : BattleAction.Switch,
            priority : BattleAction.Switch,
            user_index : user_index,
            slot_target : slot_target,
            is_switching : is_switching,
            skip_initial_text : skip_initial_text
        }

        battle_data.battle_action_queue.push(action);
    },

    /**
     * Create a Prism action
     * @param {Object} battle_data The battle data object
     * @param {Number} user_index The user which is causing this action
     * @param {Number} item_id The id of the Item to use
     * @param {Number} target_user_index The user whos active mon we're catching
     * @returns returns a battle action object
     */
    new_battle_action_prism : function(battle_data, user_index, item_id, target_user_index){
        let action = {
            action_type : BattleAction.Prism,
            priority : BattleAction.Prism,
            user_index : user_index,
            item_id : item_id,
            target_user_index : target_user_index
        }

        battle_data.battle_action_queue.push(action);
    },

    /**
     * Create a Heal action
     * @param {Object} battle_data The battle data object
     * @param {Number} user_index The user which is causing this action
     * @param {Number} item_id The id of the Item to use
     * @param {Number} slot_target The slot to apply healing to
     * @returns returns a battle action object
     */
    new_battle_action_heal : function(battle_data, user_index, item_id, slot_target){
        let action = {
            action_type : BattleAction.Heal,
            priority : BattleAction.Heal,
            user_index : user_index,

            item_id : item_id,
            slot_target : slot_target
        }

        battle_data.battle_action_queue.push(action);
    },

    /**
     * Create an Other action
     * @param {Object} battle_data The battle data object
     * @param {Number} user_index The user which is causing this action
     * @param {Number} item_id The id of the Item to use
     * @returns returns a battle action object
     */
    new_battle_action_other : function(battle_data, user_index, item_id){
        let action = {
            action_type : BattleAction.Other,
            priority : BattleAction.Other,
            user_index : user_index,

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
    get_ai_action : function(user_obj, battle_data) {
        let active_mon = user_obj.party[user_obj.active_slot];
        let moves = active_mon.moveset;
        let users = battle_data.users;
        let target_user = false;
        let action = false;
        let move_id = false;
        let move_intentions = []

        let users_enemy = users.filter(u => u.team_id != user_obj.team_id);
        let users_friendly = users.filter(u => u.team_id == user_obj.team_id && u.user_index != user_obj.user_index);
        let party_alive_slots = [];
        user_obj.party.forEach((mon, i) => {
            if(mon.hp > 0){party_alive_slots.push(i)}
        })
        

        switch (user_obj.user_type) {
            case UserType.Wild:
                target_user = _.sample(users_enemy);
                move_id = _.sample(moves);
                functions.new_battle_action_attack(battle_data, user_obj.user_index, target_user.user_index, move_id);
            break;
            case UserType.NPCTrainer:
                target_user = _.sample(users_enemy);
                target_mon = target_user.party[target_user.active_slot];
                move_intentions = functions.get_move_intention(moves, target_mon.type);

                switch (user_obj.battle_ai) {
                case BattleAi.Basic: 
                    if (battle_data.turn_counter % _.random(2, 3) == 0) { //Allow Setup
                        move_id = move_intentions[_.random(10) < 6 ? 0 : _.random(move_intentions.length - 1)].move_id;
                        functions.new_battle_action_attack(battle_data, user_obj.user_index, target_user.user_index, move_id); 
                    } else { 
                        let damage_moves = move_intentions.filter((move) => move.damage > 0);
                        if(damage_moves.length > 0){
                            move_id = damage_moves[_.random(10) < 6 ? 0 : _.random(damage_moves.length - 1)].move_id;
                        } else {
                            move_id = move_intentions[_.random(10) < 6 ? 0 : _.random(move_intentions.length - 1)].move_id;
                        }

                        functions.new_battle_action_attack(battle_data, user_obj.user_index, target_user.user_index, move_id); 
                        
                    }
                break;
                case BattleAi.Smart:
                    let good_moves = move_intentions.filter((move) => move.priority > 1);
                    let okay_moves = move_intentions.filter((move) => move.priority == 1);
                    let okay_moves_damage = okay_moves.filter((move) => move.damage > 0)
                    let stat_stages = active_mon.stats.atk_mul + active_mon.stats.def_mul + active_mon.stats.spd_mul;
                    
                    if(good_moves.length + okay_moves_damage.length == 0 && stat_stages <= 2 && party_alive_slots.length > 0){
                        //Switch if there are no acceptable attacking moves and there is a mon we can switch to
                        functions.new_battle_action_switch(battle_data, user_obj.user_index, party_alive_slots[_.random(party_alive_slots.length - 1)]);
                    }
                    else{
                        let stance_options = functions.get_stance_options(active_mon);
                        if((stance_options.length > 0) && (active_mon.stance_cooldown <= 0)){
                            let stance_to = _.sample(stance_options).id;
                            functions.new_battle_action_stance_change(battle_data, user_obj.user_index, stance_to);
                        }
                        
                        if(good_moves.length > 0 && (_.random(10) < 7)) {
                            move_id =  good_moves[0].move_id;
                            functions.new_battle_action_attack(battle_data, user_obj.user_index, target_user.user_index, move_id);
                        } else if (okay_moves.length > 0) {
                            move_id = okay_moves[0].move_id;
                            functions.new_battle_action_attack(battle_data, user_obj.user_index, target_user.user_index, move_id);
                        } else {
                            move_id = move_intentions[_.random(move_intentions.length - 1)].move_id;
                            functions.new_battle_action_attack(battle_data, user_obj.user_index, target_user.user_index, move_id);
                        }
                    }
                break;
            }
            
            break;
        }
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
            let move_data = db.move_data.get(move);
            moves_to_sort.push({
                priority : move_data.damage == 0 ? 1 : functions.type_effectiveness(move_data.type, target_type)[0], 
                move_id : move_data.id,
                damage : move_data.damage})
        }
        
        moves_to_sort = _.shuffle(moves_to_sort);
        let moves_sorted = moves_to_sort.sort((a, b) => b.priority - a.priority);

        return(moves_sorted);
    },

    /**
     * Sorts the action queue of a given battle id in the database
     * @param {String} battle_data 
     */
    sort_action_priority(battle_data){
        let action_list = battle_data.battle_action_queue;
        //Add the speed of the user's active oochamon
        for(let action of action_list){
            
            let user_index = action.user_index;
            let user = battle_data.users[user_index];
            console.log(action)
            console.log(user)

            let ooch_obj = user.party[user.active_slot];
            

            //Priority based on action type
            let base_priority = action.action_type;

            //Priority based on Oochamon Speed stat
            let speed = ooch_obj.stats.spd * (ooch_obj.stats.spd_mul + 1);
            if (ooch_obj.stance == StanceForms.Speed) speed *= 1.5;
            if (ooch_obj.stance == StanceForms.Sniper) speed *= 0.66;

            //Priority based on whether the move has the "priority" effect
            let move_priority = 0;
            if(action.action_type == BattleAction.Attack){
                let move = db.move_data.get(action.move_id);
                let effects = move.effect;
            
                for(let effect of effects) {

                    if (typeof effect.status == "string") {
                        let status_split = effect.status.split('_');
                        if(status_split[0] == 'priority'){
                            
                            move_priority += parseInt(status_split[1]) * 10_000;
                        }
                    }
                }

                //Status and ability priority modifiers
                if(ooch_obj.status_effects.includes(Status.Petrify)){
                    move_priority -= 10_000;
                }
                if(ooch_obj.status_effects.includes(Status.Snare)){
                    move_priority -= 10_000;
                }
                if(ooch_obj.ability == Ability.Immobile){
                    move_priority -= 10_000;
                }
                if(ooch_obj.ability == Ability.Chronomancy){
                    move_priority += move.damage > 0 ? -10_000 : 10_000;
                }

                //Non-ooze mons lose priority in the Wetlands field effect
                if((battle_data.field_effect == FieldEffect.Wetlands) && (!ooch_obj.type.includes(OochType.Ooze))){
                    action.priority -= 10_000;
                }

                //Reverse the attack order if the Twisted Reality field effect is active
                if(battle_data.field_effect == FieldEffect.TwistedReality){
                    action.priority *= -1;
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
     * @param {Object} battle_data The battle data
     * @param {Object} message anything that can be sent as a discord message
     * @param {Boolean} end_battle_msg If this is the end of battle message with a button
     */
    distribute_messages : async function(battle_data, message, end_battle_msg = false){
        const { botClient } = require("./index.js");

        battle_data.battle_msg_counter += 1;
        db.battle_data.math(battle_data.battle_id, '+', 1, 'turn_msg_counter');
        
        for(let user of battle_data.users) {
            if(user.is_player){
                let thread = botClient.channels.cache.get(user.thread_id);
                await thread.send(message);

                if (end_battle_msg == true) {
                    const collector = thread.createMessageComponentCollector({ max: 1 });

                    collector.on('collect', async i => {
                        await i.update({ content: 'Ending battle...', components: [] });
                        await i.deleteReply();

                        await functions.finish_battle(battle_data, user.user_index);
                    })
                }
            }
        }
    },

        /**
     * Sends messages to all player-type users in an array of users
     * @param {Object} battle_data The battle data
     * @param {Object} num_to_delete Number of messages to delete
     */
    delete_messages_in_threads : async function(battle_data, num_to_delete) {
        const { botClient } = require("./index.js");

        let temp_num_to_delete;
        for(let user of battle_data.users) {
            temp_num_to_delete = num_to_delete;
            if(user.is_player){
                let thread = botClient.channels.cache.get(user.thread_id);
                do {
                    await thread.bulkDelete(100);
                    temp_num_to_delete -= 100;
                } while (temp_num_to_delete > 0);
            }
        }
    },
    
    /* TODOs: 
        - Ensure the turn msg counters are correct after this is correct globally
        - Make sure messages are updated properly
        - Disable the switch button if you have no oochamon is selected
        - Setup submenu to select Oochamon to heal, rather than only being able to heal the currently sent out Oochamon.
    */

    /** Gather input for battle actions
     * @param battle_id The ID of the battle being prompted for
     */
    prompt_battle_actions: async function(battle_id) {

        const { botClient } = require("./index.js");

        db.battle_data.math(battle_id, '+', 1, 'battle_msg_counter');
        let battle_data = db.battle_data.get(battle_id);
        db.battle_data.set(battle_id, 1, 'turn_msg_counter');

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
                    .setStyle(ButtonStyle.Danger)
                    .setDisabled(!battle_data.allow_items),
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
                        .setLabel('Info')
                        .setEmoji('📒')
                        .setStyle(ButtonStyle.Secondary),
                ) .addComponents(
                    new ButtonBuilder()
                        .setCustomId('shift_stance')
                        .setLabel('Stance')
                        .setEmoji('🤺')
                        .setStyle(ButtonStyle.Secondary)
                )
                
        let moveButtons1 = new ActionRowBuilder();
        let moveButtons2 = new ActionRowBuilder();
        let moveInfoViewing = false;

        let targetButtons1 = new ActionRowBuilder();
        let targetButtons2 = new ActionRowBuilder();
        
        let switchButtons1 = new ActionRowBuilder();
        let switchButtons2 = new ActionRowBuilder();
        let bagButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('heal')
                    .setLabel('Healing')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('<:item_potion_magic:1274937146423115922>'),
            ).addComponents(
                new ButtonBuilder()
                    .setCustomId('prism')
                    .setLabel('Prism')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('<:item_prism:1274937161262698536>')
                    .setDisabled(true),
            )
    
        const backButton = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('back')
                    .setLabel('Back')
                    .setStyle(ButtonStyle.Danger),
            )

        const moveBackButton = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('back')
                    .setLabel('Back')
                    .setStyle(ButtonStyle.Danger),
            )

            .addComponents(
                new ButtonBuilder()
                    .setCustomId('view_move_info')
                    .setLabel('View Moves Info')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🗒️'),
            )
            
        //#endregion

        // Handle users
        await battle_data.users.forEach(async (user) => {
            if (user.user_type != UserType.Player) {
                functions.get_ai_action(user, battle_data);
                user.action_selected = true;

                if(user.is_catchable && user.party[user.active_slot].id >= 0){
                    bagButtons.components[1].setDisabled(false);
                }

                // Can't run from void enemy battles, whose IDs are less than 0
                if (user.party[user.active_slot].id < 0) {
                    inputRow2.components[1].setDisabled(true);
                }

                // Continue on if everyone has selected (which should happen at the end)
                if (battle_data.users.every(u => u.action_selected !== false)) {
                    db.battle_data.set(battle_id, battle_data);
                    await functions.process_battle_actions(battle_id);
                }
            } else {
                let userThread = botClient.channels.cache.get(user.thread_id);
                if (userThread == undefined) return;

                let activeOoch = user.party[user.active_slot];
                if (activeOoch.stance_cooldown != 0) {
                    inputRow3.components[1].setDisabled(true);
                } else {
                    inputRow3.components[1].setDisabled(false);
                }

                await userThread.send({ content: `**-- Select An Action --**`, components: [inputRow, inputRow2, inputRow3] });

                const inputFilter = async i => {
                    if (i.user.id != user.user_id) return false;
                    if (db.profile.get(i.user.id, 'cur_battle_id') != battle_data.battle_id) return false;
                    return true;
                }

                const inputCollector = userThread.createMessageComponentCollector({ time: 1.8e+6, filter: inputFilter });
                
                await inputCollector.on('collect', async i => {
                    let customId = i.customId;
                    activeOoch = user.party[user.active_slot];

                    if (customId == BattleInput.Back) {
                        await i.update({ content: `**-- Select An Action --**`, embeds: [], components: [inputRow, inputRow2, inputRow3] });
                        
                    } else if (customId == BattleInput.Attack) {
                        let move_id, move_name, move_type, move_damage, move_effective_emote = '',
                            buttonStyle = ButtonStyle.Primary;

                        moveButtons1 = new ActionRowBuilder()
                        moveButtons2 = new ActionRowBuilder()

                        // Get the Oochamon's Attack options
                        for (let i = 0; i < activeOoch.moveset.length; i++) {
                            move_id = activeOoch.moveset[i];
                            move_name = db.move_data.get(`${move_id}`, 'name')
                            move_type = db.move_data.get(`${move_id}`, 'type')
                            move_damage = db.move_data.get(`${move_id}`, 'damage')

                            if (battle_data.users.length == 2) {
                                let enemy_user = battle_data.users.filter(u => u.team_id != user.team_id)[0];
                                move_effective_emote = functions.type_effectiveness(move_type, enemy_user.party[enemy_user.active_slot].type);
                                if (move_effective_emote[0] > 1) {
                                    move_effective_emote = ' △';
                                    buttonStyle = ButtonStyle.Success
                                } else if (move_effective_emote[0] < 1) {
                                    move_effective_emote = ' ▽';
                                    buttonStyle = ButtonStyle.Danger
                                } else {
                                    move_effective_emote = '';
                                    buttonStyle = ButtonStyle.Primary
                                }
            
                                if (move_damage == 0) {
                                    move_effective_emote = '';
                                    buttonStyle = ButtonStyle.Secondary
                                }
                            }
        
                            ((i <= 1) ? moveButtons1 : moveButtons2).addComponents(
                                new ButtonBuilder()
                                    .setCustomId(`atk_${move_id}`)
                                    .setLabel(`${move_name} ${move_effective_emote}`)
                                    .setStyle(buttonStyle)
                                    .setEmoji(`${functions.type_to_emote(move_type)}`)
                            )
                        }

                        inputRow3.components[1].setDisabled((activeOoch.stance_cooldown != 0))
        
                        // Switch message to be about using the move input
                        await i.update({ content: `Select a move to use!\n**Current Stance: ${db.stance_data.get(activeOoch.stance, 'name')}**`, components: (moveButtons2.components.length != 0) ? [moveButtons1, moveButtons2, moveBackButton] : [moveButtons1, moveBackButton]}).catch(() => {});
                    } else if (customId.includes('atk_')) {
                        let move_id = customId.replace('atk_', '');
                        let self_target = db.move_data.get(move_id, 'self_target');

                        if (battle_data.users.length == 2 || self_target == true) {
                            let enemy_user = battle_data.users.filter(u => u.team_id != user.team_id)[0];
                            user.action_selected = true;
                            functions.new_battle_action_attack(battle_data, user.user_index, enemy_user.user_index, move_id);

                            // Continue on if everyone has selected (which should happen at the end)
                            if (battle_data.users.every(u => u.action_selected !== false)) {
                                battle_data.battle_msg_counter -= 1;
                                db.battle_data.set(battle_id, battle_data);
                                inputCollector.stop();
                                await i.update({ content: `Waiting for other players...` }).catch(() => {});

                                // Delete all input messages
                                for (let user of battle_data.users) {
                                    if (user.is_player) {
                                        let thread = botClient.channels.cache.get(user.thread_id);
                                        await thread.bulkDelete(1).catch(() => {});
                                    }
                                }

                                await inputCollector.stop();
                                functions.process_battle_actions(battle_id);
                            } else {
                                await inputCollector.stop();
                                await i.update({ content: 'Waiting for other players...', components: [], embeds: [] }).catch(() => {});
                            }

                        } else {
                            // Select an Oochamon to attack
                            let user_list = battle_data.users.filter(usr => usr.team_id != user.team_id);
                            let ooch_options = user_list.map(usr => [usr.party[usr.active_slot], usr]);
                            let ooch_check, ooch_emote, ooch_name, ooch_hp;
                            
                            targetButtons1 = new ActionRowBuilder();
                            targetButtons2 = new ActionRowBuilder();
    
                            for (let i = 0; i < ooch_options.length; i++) {
                                ooch_check = ooch_options[i][0];
                                ooch_emote = db.monster_data.get([ooch_check.id], 'emote');
                                ooch_name = ooch_check.nickname;
                                ooch_hp = `${ooch_check.current_hp}/${ooch_check.stats.hp} HP`;
                                ooch_disable = false;

                                if (ooch_check.alive == false) ooch_disable = true;
            
                                ((i <= 1) ? targetButtons1 : targetButtons2).addComponents(
                                    new ButtonBuilder()
                                        // target_teamId_userId_atkId
                                        .setCustomId(`target_${ooch_options[i][1].team_id}_${ooch_options[i][1].user_id}_${move_id}`)
                                        .setLabel(`${ooch_name} (${ooch_hp})`)
                                        .setStyle(ButtonStyle.Primary)
                                        .setEmoji(ooch_emote)
                                        .setDisabled(ooch_disable),
                                )
                            }
    
                            await i.update({ content: `**-- Select An Oochamon To Use Move On --**`, components: (targetButtons2.components.length != 0) ? [targetButtons1, targetButtons2, backButton] : [targetButtons1, backButton] });
                        }
                    } else if (customId.includes('target')) {
                        
                        let parts = customId.split('_');
                        let team_id = parts[1]; 
                        let user_id = parts[2];
                        let move_id = parts[3];

                        let enemy_user = battle_data.users.filter(u => u.team_id == team_id && u.user_id == user_id)[0];
                        user.action_selected = true;
                        functions.new_battle_action_attack(battle_data, user.user_index, enemy_user.user_index, move_id);

                        // Continue on if everyone has selected (which should happen at the end)
                        if (battle_data.users.every(u => u.action_selected !== false)) {
                            battle_data.battle_msg_counter -= 1;
                            db.battle_data.set(battle_id, battle_data);
                            inputCollector.stop();
                            await i.update({ content: `Waiting for other players...` }).catch(() => {});

                            // Delete all input messages
                            for (let user of battle_data.users) {
                                if (user.is_player) {
                                    let thread = botClient.channels.cache.get(user.thread_id);
                                    await thread.bulkDelete(1).catch(() => {});
                                }
                            }

                            await inputCollector.stop();
                            functions.process_battle_actions(battle_id);
                        } else {
                            await inputCollector.stop();
                            await i.update({ content: 'Waiting for other players...', components: [], embeds: [] }).catch(() => {});
                        }

                    } else if (customId == 'view_move_info') {

                        let moveInfoEmbed = new EmbedBuilder()
                            .setTitle('Move Info');
                        let moveInfoFields = [];

                        // Get the Oochamon's Attack options
                        for (let i = 0; i < activeOoch.moveset.length; i++) {
                            let move_id = activeOoch.moveset[i];
                            let move_data = db.move_data.get(move_id);
                            if (move_data.accuracy == -1) move_data.accuracy = 100;
                            let move_string = `
                            ${move_data.damage > 0 ? `**${move_data.damage} Power / ` : `**`}${move_data.accuracy}% Accuracy**
                                *${move_data.description}*
                            `;
                            
                            moveInfoFields.push({
                                name: `${functions.type_to_emote([move_data.type])} ${move_data.name}`,
                                value: move_string,
                                inline: true
                             });
                        }

                        moveInfoFields.splice(2, 0, { name: '\u200B', value: '\u200B', inline: true });
                        moveInfoFields.splice(5, 0, { name: '\u200B', value: '\u200B', inline: true });
                        moveInfoEmbed.addFields(moveInfoFields);

                        if (moveInfoViewing == true) {
                            moveBackButton.components[1].setLabel('View Move Info');
                            i.update({ embeds: [], components: (moveButtons2.components.length != 0) ? [moveButtons1, moveButtons2, moveBackButton] : [moveButtons1, moveBackButton] });
                            moveInfoViewing = false;
                        } else {
                            moveBackButton.components[1].setLabel('Close Move Info');
                            i.update({ embeds: [moveInfoEmbed],  components: (moveButtons2.components.length != 0) ? [moveButtons1, moveButtons2, moveBackButton] : [moveButtons1, moveBackButton] });
                            moveInfoViewing = true;
                        }

                    } else if (customId == 'shift_stance') {
                        let stance_list = functions.get_stance_options(activeOoch);
                        
                        stanceSelectMenu = new ActionRowBuilder();
                        let stanceSelectOptions = [];
                        
                        for (let stance of stance_list) {
                            stanceSelectOptions.push({ 
                                label: `${stance.name}`,
                                description: stance.description_short.slice(0, 100),
                                value: `stance_sel_${stance.id}`
                            })
                        }

                        stanceSelectMenu.addComponents(
                            new StringSelectMenuBuilder()
                                .setCustomId('stance_shift_select')
                                .setPlaceholder('Select a stance to shift to.')
                                .addOptions(stanceSelectOptions),
                        );

                        await i.update({ content: `**Select the new stance to shift to! (You will be unable to switch off of this for the next 2 turns)**\n**Current Stance: ${db.stance_data.get(activeOoch.stance, 'name')}**`, components: [stanceSelectMenu, backButton] });

                    } else if (customId == 'stance_shift_select') {

                        let stance_id = i.values[0].split('_')[2];
                        activeOoch.stance = stance_id;
                        activeOoch.stance_cooldown = 3;

                        functions.new_battle_action_stance_change(battle_data, user.user_index, stance_id);
                        inputRow3.components[1].setDisabled(true)

                        await i.update({ content: `**-- Select An Action --**`, embeds: [], components: [inputRow, inputRow2, inputRow3] });

                    } else if (customId == BattleInput.Switch) {

                        let ooch_inv = user.party;
                        let ooch_check, ooch_emote, ooch_name, ooch_hp, ooch_button_color, ooch_prev, ooch_disable;
                        
                        switchButtons1 = new ActionRowBuilder();
                        switchButtons2 = new ActionRowBuilder();

                        for (let i = 0; i < ooch_inv.length; i++) {
                            ooch_check = ooch_inv[i];
                            ooch_emote = db.monster_data.get([ooch_check.id], 'emote');
                            ooch_name = ooch_check.nickname;
                            ooch_hp = `${ooch_check.current_hp}/${ooch_check.stats.hp} HP`;
                            ooch_button_color = ButtonStyle.Primary;
                            ooch_disable = false;
        
                            if (i == user.active_slot) {
                                ooch_button_color = ButtonStyle.Success;
                                ooch_prev = ooch_check;
                                ooch_disable = true;
                            }
                            else if (ooch_check.current_hp <= 0) {
                                ooch_disable = true;
                            }
        
                            ((i <= 1) ? switchButtons1 : switchButtons2).addComponents(
                                new ButtonBuilder()
                                    .setCustomId(`switch_${i}`)
                                    .setLabel(`Lv. ${ooch_check.level} ${ooch_name} (${ooch_hp})`)
                                    .setStyle(ooch_button_color)
                                    .setEmoji(ooch_emote)
                                    .setDisabled(ooch_disable),
                            )
                        }

                        await i.update({ content: `**-- Select An Oochamon To Switch To --**`, components: (switchButtons2.components.length != 0) ? [switchButtons1, switchButtons2, backButton] : [switchButtons1, backButton] });

                    } else if (customId.includes('switch_')) {

                        user.action_selected = functions.new_battle_action_switch(battle_data, user.user_index, customId.replace('switch_', ''), true, false);

                        // Continue on if everyone has selected (which should happen at the end)
                        if (battle_data.users.every(u => u.action_selected !== false)) {
                            battle_data.battle_msg_counter -= 1;
                            db.battle_data.set(battle_id, battle_data);
                            inputCollector.stop();
                            await i.update({ content: `Waiting for other players...` });
                            await i.deleteReply();

                            // Delete all input messages
                            for (let user of battle_data.users) {
                                if (user.is_player) {
                                    let thread = botClient.channels.cache.get(user.thread_id);
                                    await thread.bulkDelete(1);
                                }
                            }

                            await inputCollector.stop();
                            functions.process_battle_actions(battle_id);
                        } else {
                            await inputCollector.stop();
                            await i.update({ content: 'Waiting for other players...', components: [], embeds: [] });
                        }

                    } else if (customId == BattleInput.Bag) {
                        await i.update({ content: `Select the item category you'd like to use an item in!`, components: [bagButtons, backButton] });
                        
                    } else if (customId == BattleInput.BagHeal) {
                        
                        let heal_inv = user.heal_inv;
                        let heal_inv_keys = Object.keys(heal_inv);
                        let bag_select = new ActionRowBuilder();
                        let heal_select_options = [];
                        
                        for (let i = 0; i < heal_inv_keys.length; i++) {
                            let id = heal_inv_keys[i];
                            let amount = heal_inv[heal_inv_keys[i]];

                            if (amount > 0 && amount != undefined) {
                                heal_select_options.push({ 
                                    label: `${db.item_data.get(id, 'name')} (${amount})`,
                                    description: db.item_data.get(id, 'description_short').slice(0, 100),
                                    value: `${id}`,
                                    emoji: db.item_data.get(id, 'emote'),
                                })
                            }
                        }

                        if (heal_select_options.length > 0) {
                            bag_select.addComponents(
                                new StringSelectMenuBuilder()
                                    .setCustomId('heal_item_select')
                                    .setPlaceholder('Select an item in your heal inventory to use!')
                                    .addOptions(heal_select_options),
                            );

                            await i.update({ content: `Select the healing item you'd like to use!`, components: [bag_select, bagButtons, backButton] })
                        } else {
                            await i.update({ content: `Select the item category you'd like to use an item in!`, components: [bagButtons, backButton] })
                        }

                    } else if (customId == BattleInput.BagPrism) {

                        let prism_inv = user.prism_inv;
                        let prism_inv_keys = Object.keys(prism_inv);
                        let bag_select = new ActionRowBuilder();
                        let prism_select_options = [];
                        
                        for (let i = 0; i < prism_inv_keys.length; i++) {
                            let id = prism_inv_keys[i];
                            let amount = prism_inv[prism_inv_keys[i]];

                            if (amount > 0 && amount != undefined) {
                                prism_select_options.push({ 
                                    label: `${db.item_data.get(id, 'name')} (${amount})`,
                                    description: db.item_data.get(id, 'description_short').slice(0, 100),
                                    value: `${id}`,
                                    emoji: db.item_data.get(id, 'emote'),
                                })
                            }
                        }

                        bag_select.addComponents(
                            new StringSelectMenuBuilder()
                                .setCustomId('prism_item_select')
                                .setPlaceholder('Select an item in your iventory to use!')
                                .addOptions(prism_select_options),
                        );

                        await i.update({ content: `Select the prism you'd like to use!`, components: [bag_select, bagButtons, backButton] });

                    } else if (customId.includes('_item_select')) {

                        let ooch_inv = user.party;
                        let ooch_check, ooch_emote, ooch_name, ooch_hp, ooch_button_color, ooch_prev, ooch_disable;
                        
                        healSelectButtons1 = new ActionRowBuilder();
                        healSelectButtons2 = new ActionRowBuilder();

                        if (customId == 'heal_item_select') {
                            for (let slot = 0; slot < ooch_inv.length; slot++) {
                                ooch_check = ooch_inv[slot];
                                ooch_emote = db.monster_data.get([ooch_check.id], 'emote');
                                ooch_name = ooch_check.nickname;
                                ooch_hp = `${ooch_check.current_hp}/${ooch_check.stats.hp} HP`;
                                ooch_button_color = ButtonStyle.Primary;
                                ooch_disable = false;
            
                                if (i == user.active_slot) {
                                    ooch_button_color = ButtonStyle.Success;
                                    ooch_prev = ooch_check;
                                    ooch_disable = true;
                                }
                                else if (ooch_check.current_hp <= 0 || ooch_check.current_hp == ooch_check.stats.hp) {
                                    ooch_disable = true;
                                }
            
                                ((slot <= 1) ? healSelectButtons1 : healSelectButtons2).addComponents(
                                    new ButtonBuilder()
                                        .setCustomId(`${i.values[0]}_${slot}_item_sel_target`)
                                        .setLabel(`Lv. ${ooch_check.level} ${ooch_name} (${ooch_hp})`)
                                        .setStyle(ooch_button_color)
                                        .setEmoji(ooch_emote)
                                        .setDisabled(ooch_disable),
                                )
                            }

                            await i.update({ content: `**-- Select An Oochamon To Heal --**`, components: (healSelectButtons2.components.length != 0) ? [healSelectButtons1, healSelectButtons2, backButton] : [healSelectButtons1, backButton] });
                        } else {
                            let user_to_catch;
                            for(let catch_target of battle_data.users){
                                if(catch_target.is_catchable){
                                    user_to_catch = catch_target.user_index;
                                }
                            }
                            
                            user.action_selected = functions.new_battle_action_prism(battle_data, user.user_index, i.values[0], user_to_catch);
    
                            // Continue on if everyone has selected (which should happen at the end)
                            if (battle_data.users.every(u => u.action_selected !== false)) {
                                battle_data.battle_msg_counter -= 1;
                                db.battle_data.set(battle_id, battle_data);
                                inputCollector.stop();
                                await i.update({ content: `` });
                                await i.deleteReply();
    
                                // Delete all input messages
                                for (let user of battle_data.users) {
                                    if (user.is_player) {
                                        let thread = botClient.channels.cache.get(user.thread_id);
                                        await thread.bulkDelete(1);
                                    }
                                }
    
                                await inputCollector.stop();
                                functions.process_battle_actions(battle_id);
                            } else {
                                await inputCollector.stop();
                                await i.update({ content: 'Waiting for other players...', components: [], embeds: [] });
                            }                                
                        }
                    } else if (customId.includes('_item_sel_target')) {
                        let custom_id_data = customId.split('_');
                        user.action_selected = functions.new_battle_action_heal(battle_data, user.user_index, custom_id_data[0], custom_id_data[1]);

                        // Continue on if everyone has selected (which should happen at the end)
                        if (battle_data.users.every(u => u.action_selected !== false)) {
                            db.battle_data.set(battle_id, battle_data);
                            inputCollector.stop();
                            await i.update({ content: `` });
                            await i.deleteReply();

                            // Delete all input messages
                            for (let user of battle_data.users) {
                                if (user.is_player) {
                                    let thread = botClient.channels.cache.get(user.thread_id);
                                    await thread.bulkDelete(1);
                                }
                            }

                            await inputCollector.stop();
                            functions.process_battle_actions(battle_id);
                        } else {
                            await inputCollector.stop();
                            await i.update({ content: 'Waiting for other players...', components: [], embeds: [] });
                        }             
                    } else if (customId == BattleInput.Run) {
                        user.action_selected = functions.new_battle_action_run(battle_data, user.user_index);

                        // Continue on if everyone has selected (which should happen at the end)
                        if (battle_data.users.every(u => u.action_selected !== false)) {
                            battle_data.battle_msg_counter -= 1;
                            db.battle_data.set(battle_id, battle_data);
                            inputCollector.stop();
                            await i.update({ content: `` });
                            await i.deleteReply();

                            // Delete all input messages
                            for (let user of battle_data.users) {
                                if (user.is_player) {
                                    let thread = botClient.channels.cache.get(user.thread_id);
                                    await thread.bulkDelete(1);
                                }
                            }

                            await inputCollector.stop();
                            functions.process_battle_actions(battle_id);
                        } else {
                            await inputCollector.stop();
                            await i.update({ content: 'Waiting for other players...', components: [], embeds: [] });
                        }
                        
                    } else if (customId == BattleInput.Info) {
                        // TODO: Make this a page system to show enemy data
                        
                        let oochPrisms = '';
                        for (let ooch of user.party) {
                            oochPrisms += ooch.alive ? '<:item_prism:1274937161262698536>' : `❌`;
                        }
        
                        let oochInfoFields = [];
                        const formatStatBar = (stat) => {
                            return `${stat > 0 ? '▲' : '▼'}`.repeat(Math.abs(stat)) + '○'.repeat(8 - Math.abs(stat));
                        };
        
                        // Setup field info for the embed about both oochamon
                        for (let ooch of [user.party[user.active_slot]]) {
                            let oochStatusEffects = ooch.status_effects.map(v => db.status_data.get(v, 'emote'));
                            
                            let infoStr = `**Oochamon Left:** ${oochPrisms}\n` +
                                        `**Type:** ${functions.type_to_emote(ooch.type)} **${ooch.type.map(v => _.capitalize(v)).join(' | ')}**\n` +
                                        `**Ability:** ${db.ability_data.get(ooch.ability, 'name')}\n` +
                                        `**Status Effects:** ${oochStatusEffects.length != 0 ? `${oochStatusEffects.join('')}` : `None`}\n\n` +
                                        `**Stat Changes:**\n` +
                                        `Atk: ${formatStatBar(ooch.stats.atk_mul)}\n` +
                                        `Def: ${formatStatBar(ooch.stats.def_mul)}\n` +
                                        `Spd: ${formatStatBar(ooch.stats.spd_mul)}\n` +
                                        `Eva: ${formatStatBar(ooch.stats.eva_mul)}\n` +
                                        `Acc: ${formatStatBar(ooch.stats.acc_mul)}\n`;
        
                            let moveset_str = ``;
                            for (let move_id of ooch.moveset) {
                                let move = db.move_data.get(move_id);
                                move.accuracy = Math.abs(move.accuracy);
                                if (move.damage !== 0) {
                                    moveset_str += `${functions.type_to_emote(move.type)} **${move.name}**: **${move.damage}** power, **${move.accuracy}%** accuracy\n`;
                                } else {
                                    moveset_str += `${functions.type_to_emote(move.type)} **${move.name}**: **${move.accuracy}%** accuracy\n`;
                                }
                            }
                            infoStr += `\n**${ooch.emote} ${ooch.nickname}'s Moveset:**\n${moveset_str}`;
        
                            oochInfoFields.push({
                                name: `${user.name_possessive} (Lv. ${ooch.level} ${ooch.emote} ${ooch.nickname})`,
                                value: infoStr,
                                inline: true,
                            });
                        }
        
        
                        let battleInfoEmbed = new EmbedBuilder()
                            .setTitle('Battle Information 📒')
                            .setDescription(`**Turn #${battle_data.turn_counter + 1}**\n`)
                            .addFields(oochInfoFields)
                            
                        await i.update({ content: null, embeds: [battleInfoEmbed], components: [backButton] });
                    }
                });
            }
        }); 
    },

    /**
     * Processes the battle_action_queue of a given battle_id
     * @param {String} battle_id the id of the battle
     */
    process_battle_actions : async function(battle_id){
        const { botClient } = require("./index.js");

        db.battle_data.set(battle_id, 0, 'turn_msg_counter');
        let battle_data = db.battle_data.get(battle_id);
        let actions = battle_data.battle_action_queue;
        let finish_battle = false;
        let action, header, text, faint_check;

        await functions.distribute_messages(battle_data, { content: `# ------ Round ${battle_data.turn_counter + 1} ------` });

        //Reset all battle triggers
        functions.reset_this_turn_triggers(battle_data);

        while(actions.length > 0 && !finish_battle){
            //Sort the actions before we do anything, this needs to be re-sorted to account for speed/status changes
            functions.sort_action_priority(battle_data);

            action = actions.shift();

            let user = battle_data.users[action.user_index]
            if(user.party[user.active_slot].alive == false){ continue; }

            text = ``;

            //Perform the action for the turn
            let turn_data = await functions.action_process(battle_data, action);
            text += turn_data.return_string;
            finish_battle = turn_data.finish_battle;
            
            //Check if anything fainted
            faint_check = await functions.battle_faint_check(battle_data) //.text, .finish_battle
            text += faint_check.text;
            finish_battle = finish_battle || faint_check.finish_battle;
            if (!finish_battle) text += faint_check.finish_text;

            //Send the text to each of the user's threads
            let author_obj = false;
            let battle_sprite_icon = null;
            let battle_sprite_files = [];

            if (user.is_player) {
                let user_data = await botClient.users.fetch(user.user_id);
                author_obj = { name: `${turn_data.turn_emote} ${user.name}'s Turn ${turn_data.turn_emote}`, iconURL: `${user_data.displayAvatarURL()}`}
            } else {
                if (user.battle_sprite != undefined && user.battle_sprite != false) {
                    battle_sprite_files = [new AttachmentBuilder(`./Art/NPCs/${user.battle_sprite}.png`)]
                    battle_sprite_icon = `attachment://${user.battle_sprite}.png`;
                } else {
                    let name_space_replaced = `${_.replace(_.toLower(user.party[user.active_slot].name), RegExp(" ", "g"), "_")}`
                    battle_sprite_files = [get_ooch_art(name_space_replaced)]
                    battle_sprite_icon = `attachment://${name_space_replaced}.png`;
                }

                author_obj = { name: `${turn_data.turn_emote} ${user.name}'s Turn ${turn_data.turn_emote}`, 
                            iconURL: battle_sprite_icon }
            }
            
            await functions.distribute_messages(battle_data, { embeds: [functions.battle_embed_create(text, turn_data.embed_color, author_obj)], files: battle_sprite_files });

            //Clear any remaining actions if we're meant to finish the battle
            //Also send any final messages for the action
            if(finish_battle == true){
                if(('finish_data' in turn_data) && turn_data.finish_data != false){
                    let finish_data = turn_data.finish_data;
                    switch(finish_data.type) {
                        case 'capture':
                            let embed = turn_data.finish_data.info_embed;
                            let png = turn_data.finish_data.ooch_png

                            await functions.distribute_messages(battle_data, { embeds: [embed], files: [png] });
                        break;
                    }
                }

                battle_data.actions = [];
            }

            await wait(battle_data.battle_speed);
        }

        if (!finish_battle) {

            //End of round stuff
            let end_of_round_header = `## ------ End of Round ------`;
            let end_of_round_text = ``;

            //Apply end of round abilities/effects (burn, stat changes, etc.)
            let ooch, eot_result, slot;
            for(let user of battle_data.users) {
                ooch = user.party[user.active_slot];
                slot = user.slot_actions[user.active_slot];
                if(!ooch.alive){ continue; } //Skip this one if it's dead                

                //Handle end of turn abilities (use_eot_ability returns the ooch, as well as a string with what the ability did)
                eot_result = await functions.use_eot_ability(battle_data, user.user_index); 
                ooch = eot_result.ooch;
                end_of_round_text += eot_result.text;

                //Check if anything fainted from abilities
                faint_check = await functions.battle_faint_check(battle_data) //.text, .finish_battle
                end_of_round_text += faint_check.text;
                finish_battle = finish_battle || faint_check.finish_battle;

                // Take down stance cooldown timer
                if (ooch.stance_cooldown > 0) ooch.stance_cooldown -= 1;

                // Handle status effects ORDER HERE MATTERS!!!
                let status_checks = []
                if (ooch.status_effects.includes(Status.Sleep))     {status_checks.push(Status.Sleep)};
                if (ooch.status_effects.includes(Status.Burn))      {status_checks.push(Status.Burn)};
                if (ooch.status_effects.includes(Status.Infect))    {status_checks.push(Status.Infect)};
                if (ooch.status_effects.includes(Status.Doom))      {status_checks.push(Status.Doom)};
                if (ooch.status_effects.includes(Status.Digitize))  {status_checks.push(Status.Digitize)};
                if (ooch.status_effects.includes(Status.Petrify))   {status_checks.push(Status.Petrify)};
                if (ooch.status_effects.includes(Status.Vanish))    {status_checks.push(Status.Vanish)};
                if (ooch.status_effects.includes(Status.Revealed))  {status_checks.push(Status.Revealed)};

                for(let effect of status_checks){
                    if(finish_battle){ break; }

                    switch(effect){ //Status effects
                        case Status.Vanish:
                            end_of_round_text += `\n<:status_vanish:1274938531864776735> ${ooch.emote} **${ooch.nickname}** reappeared!`;
                            end_of_round_text +=  `\nfunctions.add_status_effect(ooch, Status.Revealed)`;
                            ooch.status_effects = ooch.status_effects.filter(v => v !== Status.Vanish);
                            
                        break;
                        case Status.Revealed:
                            if (slot.this_turn_revealed) { 
                                slot.this_turn_revealed = false;
                            }
                            else {
                                end_of_round_text += `\n<:status_reveal:1339448769871220866> ${ooch.emote} **${ooch.nickname}** is no longer revealed.`;
                                ooch.status_effects = ooch.status_effects.filter(v => v !== Status.Revealed);
                            }
                        break;
                        case Status.Sleep:
                            let sleep_val = Math.round(ooch.stats.hp/10);
                            ooch.current_hp += sleep_val;
                            ooch.current_hp = _.clamp(ooch.current_hp, 0, ooch.stats.hp);
                            end_of_round_text += `\n<:status_sleep:1335446202275070034> ${ooch.emote} **${ooch.nickname}** is resting peacefully and recovered **${sleep_val} HP**.`;
                        break;
                        case Status.Burn:
                            let burn_val = Math.round(ooch.stats.hp * 0.07);
                            ooch.current_hp -= burn_val;
                            ooch.current_hp = _.clamp(ooch.current_hp, 0, ooch.stats.hp);
                            end_of_round_text += `\n<:status_burned:1274938453569830997> ${ooch.emote} **${ooch.nickname}** was hurt by its burn and lost **${burn_val} HP**.`;
                        break;
                        case Status.Infect:
                            if(!slot.hasOwnProperty("status_counter_infect")){
                                slot.status_counter_infect = 0;
                            }

                            slot.status_counter_infect += 1;
                            let infect_val = Math.round(slot.status_counter_infect * ooch.stats.hp/16);
                            ooch.current_hp -= infect_val;
                            ooch.current_hp = _.clamp(ooch.current_hp, 0, ooch.stats.hp);
                            end_of_round_text += `\n<:status_infected:1274938506225123358> ${ooch.emote} **${ooch.nickname}**'s infection gets worse, it lost **${infect_val} HP**!`;                           
                        break;
                        case Status.Doom:
                            ooch.doom_timer -= 1;
                            if (ooch.doom_timer == 0) {
                                ooch.current_hp = 0;
                                //ooch.alive = false;
                                end_of_round_text += `\n<:status_doomed:1274938483924009062> ${ooch.emote} **${ooch.nickname}**'s **DOOM** timer hit 0!`
                            } else {
                                end_of_round_text += `\n<:status_doomed:1274938483924009062> ${ooch.emote} **${ooch.nickname}**'s **DOOM** timer ticked down to **${ooch.doom_timer}!**`
                            }
                        break;
                        case Status.Digitize:
                            if(ooch.type != [OochType.Tech]){
                                ooch.type = [OochType.Tech];
                                end_of_round_text += `\n<:status_digitized:1274938471034654770> ${ooch.emote} **${ooch.nickname}** was DIGITIZED and had its type changed to **Tech**!.`;
                            }
                        break;
                        case Status.Petrify:
                            if(ooch.type != [OochType.Stone]){
                                ooch.type = [OochType.Stone];
                                end_of_round_text += `\n<:status_petrify:1335446218393784454> ${ooch.emote} **${ooch.nickname}** was PETRIFIED and had its type changed to **Stone**!.`;
                            }
                        break;
                    }

                    //Check if anything fainted from status effects
                    faint_check = await functions.battle_faint_check(battle_data) //.text, .finish_battle
                    end_of_round_text += faint_check.text;
                    finish_battle = finish_battle || faint_check.finish_battle;
                }
                
            }

            if(end_of_round_text.replaceAll("\n","") != ''){
                await wait(battle_data.battle_speed);
                await functions.distribute_messages(battle_data, { content: end_of_round_header, embeds: [functions.battle_embed_create(end_of_round_text)]});
            }

            //End of round switch-ins
            let faint_switch_header = '## ------ Switching In ------';
            let faint_switch_text = '';
            await functions.end_of_round_prompt_switch(battle_data);

            //Send out any new mons or any other actions that have been moved to the end of turn queue
            while(actions.length > 0 && finish_battle == false){
                functions.sort_action_priority(battle_data);
                action = actions.shift();
                turn_data = await functions.action_process(battle_data, action);
                faint_switch_text += turn_data.return_string;

                //Check if anything fainted as a result of the actions
                faint_check = await functions.battle_faint_check(battle_data) //.text, .finish_battle
                faint_switch_text += faint_check.text;
                finish_battle = finish_battle || faint_check.finish_battle;
            }
            
            if(faint_switch_text != ''){
                await functions.distribute_messages(battle_data, { content: faint_switch_header, embeds: [functions.battle_embed_create(faint_switch_text)]});
            }

            //Clear all user's actions
            battle_data.turn_counter++;
            for(let user of battle_data.users){ user.action_selected = false; }
        }
        
        //Do stuff depending on whether the battle is finished
        if(!finish_battle) {
            await wait(battle_data.battle_speed);
            await functions.distribute_messages(battle_data, { embeds : [functions.generate_round_start_embed(battle_data)]});
            db.battle_data.set(battle_id, battle_data);
            
            await wait(battle_data.battle_speed);
            await functions.prompt_battle_actions(battle_data.battle_id);
        }
        else if (finish_battle === true) { 
            const endButton = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('end_battle')
                    .setLabel('Continue To Playspace')
                    .setStyle(ButtonStyle.Primary),
            )
            let victoryUser = battle_data.users.filter(user => user.defeated !== true)[0];

            if (faint_check.finish_text != '') {
                const victorEmbed = new EmbedBuilder()
                    .setColor('#ffee00')
                    .setAuthor({ name: '🏆 Victory 🏆' })
                    .setTitle(`${victoryUser.name} has won the battle!`)
                    .setDescription(`${faint_check.finish_text}`)

                if (victoryUser.is_player) {
                    let victoryDiscordUser = await botClient.users.fetch(victoryUser.user_id);
                    victorEmbed.setThumbnail(victoryDiscordUser.avatarURL());
                }

                await functions.distribute_messages(battle_data, { components: [endButton], embeds: [victorEmbed] }, true);
            } else {
                await functions.distribute_messages(battle_data, { components: [endButton], embeds: [] }, true);
            }
            db.battle_data.set(battle_id, battle_data);
        }
    },

    /**
     * Creates a simple embed for the battle
     * @param {String} text the text to display in the body of the embed
     * @param {Color} color the color along the edge of the embed
     * @param {Object} author the setAuthor object
     * @param {String} header the text to display at the top of the embed
     * @returns a simple embed
     */
    battle_embed_create : function(text, color = '#808080', author = false, header = false) {
        let embed = new EmbedBuilder()
            .setColor(color)
            .setDescription(text);
        if (header != false) embed.setTitle(header)
        if (author != false) embed.setAuthor(author);
            
        return embed;
    },

    // #region Battle Action Process
    // #endregion

    /**
     * Processes an action inside of a battle
     * @param {Object} battle_data the current battle_data
     * @param {Object} action the action to process
     */
    action_process : async function(battle_data, action){
        let turn_data;
        switch(action.action_type){
            case BattleAction.Attack:
                turn_data = await functions.action_process_attack(battle_data, action);
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
            case BattleAction.StanceChange:
                turn_data = await functions.action_process_stance_change(battle_data, action);
            break;
            case BattleAction.UserJoin:
                turn_data = await functions.action_process_add_user(battle_data, action);
            break;
            case BattleAction.Other:
                //TODO
            break;
        }
        return turn_data;
    },

    /**
     * Lets a user dynamically join the battle
     * @param {*} battle_data the current battle data
     * @param {*} action the action data to process
     * @returns Turn data {finish_battle : Boolean, return_string : String}
     */
    action_process_add_user : async function(battle_data, action){
        let user = action.user;
        let finish_battle = false;
        let return_string = ``;
        let active_ooch = user.party[user.active_slot];
       
        if(action.text_to_show != ''){
            return_string = action.text_to_show;
        }
        else if(user.user_type != UserType.Wild){
            return_string += `A Wild ${active_ooch.emote} ${active_ooch.nickname} has joined the battle!`
        }
        else{
            return_string += `${user.name} has joined the battle!`
        }

        functions.new_battle_action_switch(battle_data, user.user_index, user.active_slot, false);

        return {
            finish_battle : finish_battle,
            return_string : return_string,
            turn_emote : '❕',
            embed_color : '#ffaa00',
        }
    },

    /**
     * Uses an attack
     * @param {*} battle_data the current battle data
     * @param {*} action the action data to process
     * @returns Turn data {finish_battle : Boolean, return_string : String}
     */
    action_process_attack : async function(battle_data, action){
        let user = battle_data.users[action.user_index];
        let finish_battle = false;

        let return_string = await functions.attack(battle_data, user.user_index, action.target_user_index, action.move_id);

        return {
            finish_battle : finish_battle,
            return_string : return_string,
            turn_emote : '⚔️',
            embed_color : '#ffaa00',
        }
    },

    /**
     * Processes a "Switch" action type
     * @param {Object} battle_data the current battle_data
     * @param {Object} action the action to process
     */
    action_process_switch : async function(battle_data, action){
        let user = battle_data.users[action.user_index];
        let finish_battle = false;

        let ooch_to = user.party[action.slot_target];
        let ooch_from = user.party[user.active_slot];

        let slot_info_to = user.slot_actions[action.slot_target];
        let slot_info_from = user.slot_actions[user.active_slot];
        slot_info_to.this_turn_switched_in = true;
        slot_info_to.move_used_first = false;
        slot_info_to.move_used_last = false;

        slot_info_from.status_counter_infect = 0;

        user.active_slot = action.slot_target;
        
        let return_string = (action.is_switching
            ? `\n${user.name} switched from ${db.monster_data.get(ooch_from.id, 'emote')} **${ooch_from.nickname}** to ${db.monster_data.get(ooch_to.id, 'emote')} **${ooch_to.nickname}**.`
            : `\n${user.name} sent out ${db.monster_data.get(ooch_to.id, 'emote')} **${ooch_to.nickname}**.`
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
        ooch_from.stance_cooldown = 0;
        ooch_from.stance = StanceForms.Base;

        return_string += functions.use_switch_ability(battle_data, action.user_index, user.active_slot, action.slot_target, action.is_switching);
 
        return {
            finish_battle : finish_battle,
            return_string : return_string,
            turn_emote : '↩️',
            embed_color : '#0095ff',
        }
    },

    use_switch_ability(battle_data, user_index, slot_from, slot_to, is_switching){
        let user = battle_data.users[user_index]
        let ooch_to = user.party[slot_to];
        let ooch_from = user.party[slot_from];
        let string_to_send = '';
        let status_types = []

        //If the ooch is affected by Digitize make it a tech type again
        if (ooch_to.status_effects.includes(Status.Digitize)) {
            status_types.push(OochType.Tech);
        }
        if (ooch_to.status_effects.includes(Status.Petrify)) {
            status_types.push(OochType.Stone);
        }
        if(status_types.length > 0){
            ooch_to.type = status_types;
        }

        
        //Effects of the mon to switching in
        switch (ooch_to.ability) {
            case Ability.Miniscule: 
                string_to_send += `\n${ooch_to.emote} **${ooch_to.nickname}**'s **Miniscule**:`;
                string_to_send += `\n--- ${functions.modify_stat(ooch_to, Stats.Evasion, 1)}\n`;
            break;
            case Ability.Burdened: 
                string_to_send += `\n${ooch_to.emote} **${ooch_to.nickname}**'s **Burdened**:`;
                string_to_send += `--- ${functions.modify_stat(ooch_to, Stats.Speed, -1)}`;
                string_to_send += `--- ${functions.modify_stat(ooch_to, Stats.Defense, 1)}\n`;
            break;
            case Ability.Tough:
                string_to_send += `\n${ooch_to.emote} **${ooch_to.nickname}**'s **Tough**:`;
                string_to_send += `\n--- ${functions.modify_stat(ooch_to, Stats.Defense, 1)}\n`;
            break;
            case Ability.Immobile:
                string_to_send += `\n${ooch_to.emote} **${ooch_to.nickname}**'s **Immobile**:`;
                string_to_send += `\n--- ${functions.modify_stat(ooch_to, Stats.Defense, 1)}\n`;
            break;
            case Ability.Gentle:
                string_to_send += `\n${ooch_to.emote} **${ooch_to.nickname}**'s **Gentle**:`;
                string_to_send += `\n--- ${functions.modify_stat(ooch_to, Stats.Attack, -1)}\n`;
            break;
            case Ability.Conflicted:
                string_to_send += `\n${ooch_to.emote} **${ooch_to.nickname}**'s **Conflicted**:`;
                string_to_send += `\n--- ${functions.modify_stat(ooch_to, Stats.Attack, 1)}`;
                string_to_send += `\n--- ${functions.modify_stat(ooch_to, Stats.Defense, 1)}`;
                string_to_send += `\n--- ${functions.modify_stat(ooch_to, Stats.Speed, 1)}\n`;
            break;
            case Ability.Dense:
                string_to_send += `\n${ooch_to.emote} **${ooch_to.nickname}**'s **Dense**:`;
                string_to_send += `\n--- ${functions.modify_stat(ooch_to, Stats.Attack, 1)}`;
                string_to_send += `\n--- ${functions.modify_stat(ooch_to, Stats.Speed, -1)}\n`;
            break;
            case Ability.Fleeting:
                string_to_send += `\n${ooch_to.emote} **${ooch_to.nickname}**'s **Fleeting**:`;
                string_to_send += `\n--- ${functions.modify_stat(ooch_to, Stats.Attack, 2)}`;
                string_to_send += `\n--- ${functions.modify_stat(ooch_to, Stats.Speed, 2)}\n`;
            break;
            case Ability.Uncontrolled:
                string_to_send += `\n${ooch_to.emote} **${ooch_to.nickname}**'s **Uncontrolled**:`;
                string_to_send += `\n--- ${functions.modify_stat(ooch_to, Stats.Attack, 3)}`;
                string_to_send += `\n--- ${functions.modify_stat(ooch_to, Stats.Defense, -1)}\n`;
            break;
            case Ability.Immense:
                string_to_send += `\n${ooch_to.emote} **${ooch_to.nickname}**'s **Immense**:`;
                string_to_send += `\n--- ${functions.modify_stat(ooch_to, Stats.Defense, 2)}\n`;
            break;
            case Ability.Swaying:
                string_to_send += `\n${ooch_to.emote} **${ooch_to.nickname}**'s **Swaying**:`;
                string_to_send += `\n--- ${functions.modify_stat(ooch_to, Stats.Defense, 1)}`;
                string_to_send += `\n--- ${functions.modify_stat(ooch_to, Stats.Accuracy, -1)}\n`;
            break;
            case Ability.Thrashing:
                string_to_send += `\n${ooch_to.emote} **${ooch_to.nickname}**'s **Thrashing**:`;
                string_to_send += `\n--- ${functions.modify_stat(ooch_to, Stats.Attack, 1)}`;
                string_to_send += `\n--- ${functions.modify_stat(ooch_to, Stats.Evasion, -1)}\n`;
            break;
            case Ability.Union:
                string_to_send += `\n${ooch_to.emote} **${ooch_to.nickname}**'s **Union**:`;
                string_to_send += `\n--- ${functions.modify_stat(ooch_to, Stats.Attack, 1)}`;
                string_to_send += `\n--- ${functions.modify_stat(ooch_to, Stats.Defense, 1)}\n`;
            break;
            case Ability.Broodmother:
                incAmount = 0;
                for (let ooch_i of user.party) {
                    if (ooch_i.type[0] === ooch.type[0] && ooch_i.id != ooch.id) {
                        incAmount += 1;
                    }
                } 
                if(incAmount > 0){
                    string_to_send += `\n${ooch_to.emote} **${ooch_to.nickname}**'s **Broodmother**:`;
                    string_to_send += `\n--- ${functions.modify_stat(ooch_to, Stats.Attack, incAmount)}\n`;
                }
            break;
            case Ability.Apprentice:
                incAmount = 0;
                for (let ooch_i of user.party) {
                    if (ooch_i.moveset.some(item => ooch_to.moveset.includes(item)) && ooch_i.id != ooch_to.id) {
                        incAmount = 1;
                        break;
                    }
                }
                if(incAmount > 0){
                    string_to_send += `\n${ooch_to.emote} **${ooch_to.nickname}**'s **Apprentice**:`;
                    string_to_send += `\n--- ${functions.modify_stat(ooch_to, Stats.Attack, incAmount)}\n`;
                }
            break;
        }

        //Switch-out abilities
        switch(ooch_from.ability){
            case Ability.Martyr:
                if(ooch_from.hp_current == 0){
                    string_to_send += `\n${ooch_from.emote} **${ooch_from.nickname}**'s **Martyr**:`;
                    string_to_send += `\n--- ${functions.modify_stat(ooch_to, Stats.Attack, 1)}`;
                    string_to_send += `\n--- ${functions.modify_stat(ooch_to, Stats.Defense, 1)}`;
                    string_to_send += `\n--- ${functions.modify_stat(ooch_to, Stats.Speed, 1)}\n`;
                }
            break;
        }

        //Abilities that are triggered by mons in the user's party
        for(let i = 0; i < user.party.length; i++) {
            if(i != slot_to){ //Slot to is the mon that's about to be out, so don't count it
                let ooch_in_party = user.party[i];
                switch(ooch_in_party.ability){
                    case Ability.Condiment:
                        if(['Lasangato'].includes(ooch_to.name)){ //Checks an array to see if food-based mons are in the list
                            string_to_send += `\n${ooch_in_party.emote} **${ooch_in_party.nickname}**'s **Condiment**:`;
                            string_to_send += `\n--- ${functions.modify_stat(ooch_to, Stats.Defense, 1)}`;
                            string_to_send += `\n--- ${functions.modify_stat(ooch_to, Stats.Speed, 1)}\n`;
                        }
                    break;
                }
            }
        }

        //Check abilities vs other users
        for(let u of battle_data.users){
            if(u.team_id != user.team_id && u.party[u.active_slot].alive){
                let ooch_enemy = u.party[u.active_slot];

                //Enemy users' mons that affect the new mon or the mon that switched out
                switch (ooch_enemy.ability) {
                    case Ability.Alert: //Increases atk if a new enemy mon switches in
                        string_to_send += `\n${ooch_enemy.emote} **${ooch_enemy.nickname}**'s **Alert**:`;
                        string_to_send += `\n--- ${functions.modify_stat(ooch_enemy, Stats.Attack, 1)}\n`;
                    break;
                    case Ability.Duplicant: //Copies the ability of the newly switched-in mon
                        if(![Ability.InvalidEntry].includes(ooch_to.ability)) { //the array is for abilities that we don't want copied
                            ooch_enemy.ability = ooch_to.ability;
                            string_to_send += `\n${ooch_enemy.emote} **${ooch_enemy.nickname}**'s **Duplicant**:`;
                            string_to_send += `\n--- ${ooch_enemy.emote} **${ooch_enemy.nickname}** ability was changed to **${_.startCase(db.ability_data.get(ooch_to.ability, 'name'))}**!\n`;
                        }
                    break;
                    case Ability.Nullify: //Changes the ability of the newly switched mon to "Null"
                        ooch_to.ability = Ability.Null;
                        string_to_send += `\n${ooch_enemy.emote} **${ooch_enemy.nickname}**'s **Nullify**:`;
                        string_to_send += `\n${ooch_to.emote} **${ooch_to.nickname}**'s ability changed to **Null**!\n`
                    break;
                    case Ability.Pursuer:
                        if(ooch_from.current_hp > 1){
                            string_to_send += `\n${ooch_enemy.emote} **${ooch_enemy.nickname}**'s **Pursuer**:`;

                            let prev_hp = ooch_from.current_hp
                            ooch_from.current_hp = _.max(Math.floor(ooch_from.current_hp - ooch_from.current_hp / 5), 1); //This should never kill the mon swapping out
                            string_to_send += `\n--- The fleeing ${ooch_from.emote} **${ooch_from.nickname}** lost ${prev_hp - ooch_from.current_hp} HP.\n`;
                        }
                    break;
                }

                //User's new mon abilities that affect all enemies
                switch (ooch_to.ability) {
                    case Ability.Boisterous: //Enemy loses 10% HP
                        string_to_send += `\n${ooch_to.emote} **${ooch_to.nickname}**'s **Boisterous**:`;

                        let prev_hp = ooch_enemy.current_hp;
                        ooch_enemy.current_hp = _.clamp(Math.floor(ooch_enemy.current_hp - ooch_enemy.stats.hp * 0.1), 1, ooch_enemy.stats.hp);
                        string_to_send += `\n--- ${ooch_enemy.emote} **${ooch_enemy.nickname}** lost ${prev_hp - ooch_enemy.current_hp} HP!\n`;
                    break;
                    case Ability.Gentle: //Lowers enemy ATK 1 stage
                        string_to_send += `\n${ooch_to.emote} **${ooch_to.nickname}**'s **Gentle**:`;
                        string_to_send += `\n--- ${functions.modify_stat(ooch_enemy, Stats.Attack, -1)}\n`;
                    break;
                    case Ability.Withering: //Lowers enemy DEF 1 stage
                        string_to_send += `\n${ooch_to.emote} **${ooch_to.nickname}**'s **Withering**:`;
                        string_to_send += `\n--- ${functions.modify_stat(ooch_enemy, Stats.Defense, -1)}\n`;
                    break;
                }
            }
        }

        switch(battle_data.field_effect) {
            case FieldEffect.JaggedGround:
                if(!ooch_to.type.includes(OochType.Stone)){
                    let jagged_dmg = Math.floor(ooch_to.stats.hp * 0.1);
                    ooch_to.current_hp = _.clamp(Math.floor(ooch_to.current_hp - ooch_to.stats.hp * 0.1), 1, ooch_to.stats.hp);
                    string_to_send += `\n${ooch_to.emote} **${ooch_to.nickname}** lost **${jagged_dmg} HP** from the jagged terrain!\n`;
                }
            break;
        }

        return(string_to_send);
    },

    /**
     * Attemts to capture an oochamon, and if successful tells the battle to end
     * @param {*} battle_data the current battle data
     * @param {*} action the action data to process
     * @returns Turn data {finish_battle : Boolean, finish_data : Varying, return_string : String}
     */
    action_process_prism : async function(battle_data, action){
        let user = battle_data.users[action.user_index];
        let user_id = user.user_id;
        let finish_battle = false;
        let finish_data = false;

        let target_user = battle_data.users[action.target_user_index]
        let item = await db.item_data.get(action.item_id);
        let ooch_target = target_user.party[target_user.active_slot];
        let return_string = `${user.name} threw a ${item.emote} **${item.name}**.`;

        let prism_result = functions.item_use(user.user_id, ooch_target, action.item_id, true); //True if successful catch, False if not
        let prism_pulses = prism_result[1];
        prism_result = prism_result[0];
        battle_data.users[action.user_index].prism_inv[action.item_id] -= 1;

        if(prism_result == true){
            return_string += `\n*The prism pulses once...*\n*The prism pulses twice..!*\n\n**You successfully caught the wild ${ooch_target.nickname}!**`;
            
                if (user.party.length < 4) {
                    return_string += `\nIt's been added to your party.`;
                } else {
                    return_string += `\nIt's been sent to your box.`;
                }

                // Distribute XP for a caught Oochamon
                // The Oochamon in the active slot at the moment of beating the Oochamon gets 1.25x more EXP than the others.
                let is_first_catch = (db.profile.get(user.user_id, `oochadex[${ooch_target.id}].caught`) == 0);
                exp_earned = functions.battle_calc_exp(ooch_target, is_first_catch ? 2 : 1); //catching mons will always give 1x EXP, 2x for first catch

                let ooch_party = user.party;
                let ooch_plr = ooch_party[user.active_slot]
                let exp_earned_main = Math.round(exp_earned * 1.25);
                if (ooch_plr.level != 50) {
                    return_string += `\n\n${db.monster_data.get(ooch_plr.id, 'emote')} **${ooch_plr.nickname}** earned **${exp_earned_main} exp!**`
                                        //` (EXP: **${_.clamp(ooch_plr.current_exp + exp_earned_main, 0, ooch_plr.next_lvl_exp)}/${ooch_plr.next_lvl_exp})**`
                }
                if (ooch_party.length > 1) {
                    return_string += `\nThe rest of your team earned **${exp_earned}** exp.\n`;
                }
                if(is_first_catch) return_string += `\n✨ *Gained 2x Experience from catching a New Oochamon!*`;

                for (let i = 0; i < ooch_party.length; i++) {
                    let ooch = ooch_party[i];
                    if (i == user.active_slot) { 
                        ooch.current_exp += Math.round(exp_earned_main);
                    } else { 
                        ooch.current_exp += Math.round(exp_earned); 
                    }
                    
                    // Check for level ups
                    if (ooch.current_exp >= ooch.next_lvl_exp) { // If we can level up
                        ooch = functions.level_up(ooch);
                        return_string += `\n${ooch[1]}`;
                        ooch_party[i] = ooch[0];
                    }
                }

                //functions.distribute_messages(battle_data, {})
                //await item_sel.update({ content: `## ------ ${user.name}'s Turn ------`, embeds: [capture_embed], components: []});

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
            for (let i = 0; i < prism_pulses; i++) {
                if (i == 0) return_string += '\n*The prism pulses once...*';
                if (i == 1) return_string += '\n*The prism pulses twice..!*';
            }
            return_string += `\nThe prism cracks open, and the ${ooch_target.emote} **${ooch_target.nickname}** bounces back into the battlefield!`
        }

        return {
            finish_battle : finish_battle,
            finish_data : finish_data,
            return_string : return_string,
            turn_emote : `🔶`,
            embed_color : '#49f6ff'
        }
    },

    /**
     * Uses a healing item
     * @param {*} battle_data the current battle data
     * @param {*} action the action data to process
     * @returns Turn data {finish_battle : Boolean, return_string : String}
     */
    action_process_heal : async function(battle_data, action){
        let user = battle_data.users[action.user_index];
        let finish_battle = false;

        let item = await db.item_data.get(action.item_id);
        let ooch = user.party[action.slot_target];
        let return_string = `${user.name} used 1 ${item.emote} **${item.name}**.`;
        let extra_text = await functions.item_use(user.user_index, ooch, action.item_id, true); 
        battle_data.users[action.user_index].heal_inv[action.item_id] -= 1;
        return_string += extra_text;

        return {
            finish_battle : finish_battle,
            return_string : return_string,
            turn_emote : `❤️`,
            embed_color : '#02ff2c',
        }
    },


    /**
     * Changes Oochamon stance
     * @param {Object} battle_data the current battle data
     * @param {Object} action the action data to process {user_index, stance_to}
     * @returns Turn data {finish_battle : Boolean, return_string : String}
     */
    action_process_stance_change : async function(battle_data, action){
        let user = battle_data.users[action.user_index];
        let finish_battle = false;
        let stance_to = action.stance_to;

        user.party[user.active_slot].stance = parseInt(stance_to);
        user.party[user.active_slot].stance_cooldown = 3; // 2 turns essentially
        let active_ooch = user.party[user.active_slot];

        let return_string = `${active_ooch.emote} **${active_ooch.nickname}** shifted its stance to the **${db.stance_data.get(stance_to, 'name')} Stance!**`;

        return {
            finish_battle : finish_battle,
            return_string : return_string,
            turn_emote : `🤺`,
            embed_color : '#767674',
        }
    },

    /**
     * Attempts to run away
     * @param {*} battle_data the current battle data
     * @param {*} action the action data to process
     * @returns Turn data {finish_battle : Boolean, return_string : String}
     */
    action_process_run : async function(battle_data, action){
        let user = battle_data.users[action.user_index];
        let ooch_user = user.party[user.active_slot];
        let ooch_max_check = 0;
        let return_string = '';
        let finish_battle = false;

        for(let other_user of battle_data.users){
            if(other_user.user_index != user.user_index){
                let ooch_other = other_user.party[other_user.active_slot];
                ooch_max_check = Math.max(ooch_other.stats.spd + ooch_other.level * 10, ooch_max_check)
            } 
        }

        if ((ooch_user.stats.spd + ooch_user.level * 15) / ((ooch_user.stats.spd + ooch_user.level * 10) + ooch_max_check ) > Math.random()) {
            return_string += `You successfully ran away!`;
            finish_battle = true;
        }
        else{
            return_string += 'Failed to run away!'
        }

        return {
            finish_battle : finish_battle,
            return_string : return_string,
            turn_emote : '🏃‍♂️',
            embed_color : '#ff0000'
        }
    },

    /**
     * Checks if any oochamon have been fainted
     * @param {Object} battle_data The current battle_data
     */
    battle_faint_check: async function(battle_data) {
        let string_to_send = '';
        let finish_string_to_send = '';
        let active_teams = [];
        let finish_battle = false;
        
        // Get the players active oochamon, check if they are alive
        for(let user of battle_data.users) {
            let exp_given = 0;
            let tame_given = 0;
            let active_ooch = user.party[user.active_slot];
            let user_defeated = true;
            let user_next_slot = 999;
            let bonus_multiplier = user.type != UserType.Wild ? 2 : 1;
            
            if(active_ooch.current_hp > 0){
                user_defeated = false;
                if(!active_teams.includes(user.team_id)){
                    active_teams.push(user.team_id);
                }
            }
            else if (active_ooch.current_hp <= 0 && active_ooch.alive == true) {
                string_to_send += `\n--- 🪦 ${user.name_possessive} ${active_ooch.emote} **${active_ooch.nickname}** fainted!`
                
                if (battle_data.give_rewards) {
                    exp_given += Math.round(functions.battle_calc_exp(active_ooch, bonus_multiplier));
                }

                active_ooch.current_hp = 0;
                active_ooch.alive = false;
                if (active_ooch.tame_value < 200) {
                    active_ooch.tame_value = _.clamp(active_ooch.tame_value - _.random(10, 20), 0, 200);
                    if (active_ooch.tame_value == 200) {
                        active_ooch.stats.hp_iv = _.clamp(active_ooch.stats.hp_iv + 1, 0, 10);
                        active_ooch.stats.atk_iv = _.clamp(active_ooch.stats.atk_iv + 1, 0, 10);
                        active_ooch.stats.def_iv = _.clamp(active_ooch.stats.def_iv + 1, 0, 10);
                        active_ooch.stats.spd_iv = _.clamp(active_ooch.stats.spd_iv + 1, 0, 10);
                    }
                }
            }

            for(let [i, party_ooch] of user.party.entries()){
                if(party_ooch.current_hp > 0) {
                    user_defeated = false;
                    user_next_slot = Math.min(user_next_slot, i);
                }
            }

            if (user_defeated) {
                if (user.user_type !== UserType.Wild) string_to_send += `\n--- **${user.name}'s party was wiped out!**`;
                if (user.oochabux !== 0) {
                    finish_string_to_send += `\nReceived **${user.oochabux} oochabux** for winning the battle!`
                }
                user.defeated = true;
            } else {
                battle_data.end_of_turn_switch_queue.push(user.user_index);
                if(!active_teams.includes(user.team_id)){
                    active_teams.push(user.team_id);
                }
            }

            //Distribute EXP to other users' mons & level them up if possible
            if(exp_given > 0){
                for(let other_user of battle_data.users){
                    if((other_user.user_type == UserType.Player) && (other_user.user_index != user.user_index)){

                        let ooch_party = other_user.party;
                        let other_ooch = ooch_party[other_user.active_slot];
                        let exp_main = Math.floor(exp_given * 1.25);
                        let max_level = db.global_data.get("max_level");
                        if (max_level == false || max_level == undefined) max_level = 50;

                        if (user.oochabux) {
                            db.profile.math(other_user.user_id, '+', user.oochabux, 'oochabux');
                        }

                        if (other_ooch.level < max_level) { 
                            finish_string_to_send += `\n\n${db.monster_data.get(other_ooch.id, 'emote')} **${other_ooch.nickname}** earned **${exp_main} EXP!**` + 
                                                ` (EXP: **${_.clamp(other_ooch.current_exp + exp_main, 0, other_ooch.next_lvl_exp)}/${other_ooch.next_lvl_exp})**`
                        }
                        if (other_user.party.length > 1) {
                            finish_string_to_send += `\nThe rest of the team earned **${exp_given}** exp.\n`;
                        }

                        for (let i = 0; i < ooch_party.length; i++) {
                            if (i == other_user.active_slot) { 
                                ooch_party[i].current_exp += exp_main;
                                if (ooch_party[i].tame_value < 200) {
                                    ooch_party[i].tame_value = _.clamp(ooch_party[i].tame_value + _.random(1, 3), 0, 200);
                                    if (ooch_party[i].tame_value == 200) {
                                        ooch_party[i].stats.hp_iv = _.clamp(ooch_party[i].stats.hp_iv + 1, 0, 10);
                                        ooch_party[i].stats.atk_iv = _.clamp(ooch_party[i].stats.atk_iv + 1, 0, 10);
                                        ooch_party[i].stats.def_iv = _.clamp(ooch_party[i].stats.def_iv + 1, 0, 10);
                                        ooch_party[i].stats.spd_iv = _.clamp(ooch_party[i].stats.spd_iv + 1, 0, 10);
                                    }
                                }
                            } 
                            else { 
                                ooch_party[i].current_exp += exp_given; 
                            }
                            
                            // Check for level ups
                            let ooch_data = ooch_party[i];
                            if (ooch_data.current_exp >= ooch_data.next_lvl_exp) { // If we can level up
                                ooch_data = functions.level_up(ooch_data);
                                string_to_send += ooch_data[1];
                            }
                        }
                    }
                }
            }
        }

        //If there's 0 - 1 remaining teams finish the battle
        if(active_teams.length < 2){
            finish_battle = true;
        }
        
        return({
            text : string_to_send, 
            finish_text : finish_string_to_send,
            finish_battle : finish_battle
        });
        
    },

    /**
     * Calculates the amount of EXP earned when defeating an Oochamon.
     * @param {Object} ooch The oochamon that was defeated
     * @param {Number} bonus_multiplier Multiplier for exp given (default 1)
     * @returns A number of the amount of EXP earned
     */
    battle_calc_exp: function(ooch, bonus_multiplier = 1) {
        let mon_data = db.monster_data.get(`${ooch.id}`);
        let evo_stage = mon_data.evo_stage;
        let exp_multiplier = 0.90
        let level = ooch.level;
        
        return Math.round(
            ((bonus_multiplier * (1.025 ** level) * (2 ** evo_stage) * 8 * level * (_.random(90, 100)/100)) + 20) * exp_multiplier + //Base EXP given at all levels
            (Math.max(level - 20, 0) * 100) //Extra EXP given after LV 20
        );
    },

    //Handle letting the users switch mons during end of round here
    end_of_round_prompt_switch : async function(battle_data){

        const { botClient } = require('./index.js');
        let users_to_wait_for = [];
        let users = battle_data.users;
        let next_slot = 9999;
        let notify_death = false;
        
        for(let user of users){

            if(!user.party[user.active_slot].alive && !user.defeated){
                switch(user.user_type){
                    case UserType.Player:
                        notify_death = true;
                        users_to_wait_for.push(user.user_id);
                        let ooch_inv = user.party;
                        let ooch_check, ooch_emote, ooch_name, ooch_hp, ooch_button_color, ooch_prev, ooch_disable;
                        
                        switchButtons1 = new ActionRowBuilder();
                        switchButtons2 = new ActionRowBuilder();

                        for (let i = 0; i < ooch_inv.length; i++) {
                            ooch_check = ooch_inv[i];
                            ooch_emote = db.monster_data.get([ooch_check.id], 'emote');
                            ooch_name = ooch_check.nickname;
                            ooch_hp = `${ooch_check.current_hp}/${ooch_check.stats.hp} HP`;
                            ooch_button_color = ButtonStyle.Primary;
                            ooch_disable = false;
        
                            if (i == user.active_slot) {
                                ooch_button_color = ButtonStyle.Success;
                                ooch_prev = ooch_check;
                                ooch_disable = true;
                            } else if (ooch_check.current_hp <= 0) {
                                ooch_disable = true;
                            }
        
                            ((i <= 1) ? switchButtons1 : switchButtons2).addComponents(
                                new ButtonBuilder()
                                    .setCustomId(`switch_${i}`)
                                    .setLabel(`Lv. ${ooch_check.level} ${ooch_name} (${ooch_hp})`)
                                    .setStyle(ooch_button_color)
                                    .setEmoji(ooch_emote)
                                    .setDisabled(ooch_disable),
                            )
                        }

                        let thread = botClient.channels.cache.get(user.thread_id);
                        await thread.send({ content: `**-- Select An Oochamon To Switch To --**`, components: (switchButtons2.components.length != 0) ? [switchButtons1, switchButtons2] : [switchButtons1] });

                        const collector = thread.createMessageComponentCollector({ max: 1 });

                        collector.on('collect', async i => {
                            await i.update({ content: 'Sending out new mon...', components: [] });
                            await i.deleteReply();

                            next_slot = parseInt(i.customId.replace('switch_', ''));

                            //Submit their next slot for combat
                            functions.new_battle_action_switch(battle_data, user.user_index, next_slot, false);
                            users_to_wait_for = users_to_wait_for.filter(u => u != user.user_id);
                        });
                        
                    break;
                    default:
                        for(let [i, ooch] of user.party.entries()){
                            if(ooch.alive){ next_slot = i; break;}
                        }
                        functions.new_battle_action_switch(battle_data, user.user_index, next_slot, false);
                    break;
                }
            }
        }

        if (notify_death == true) {
            await functions.distribute_messages(battle_data, { content: `Waiting for players to send out their Oochamon...` });
            
            // Wait for input from the dead player
            while (users_to_wait_for.length != 0) {
                await wait(1000);
            }

            await functions.delete_messages_in_threads(battle_data, 1);
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
    get_random_targets: function(users, my_team_id, my_user_index, max_num = 1, other_team = true, same_team = false, allow_self = false) {
        let options = []
        for(let user of users){
            if(user.user_index == my_user_index && allow_self){
                options.push(user.user_index)
            }
            else if(user.team_id == my_team_id && same_team){
                options.push(user.user_index)
            }
            else if(user.team_id != my_team_id && other_team){
                options.push(user.user_index)
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
     * Gives a set of stats for an Oochamon, adjusted by level and specific IVs.
     * @param {String} species_id The ID of the Oochamon
     * @param {Number} level The level of the Oochamon
     * @param {Number} hp_iv The HP IV of the Oochamon 
     * @param {Number} atk_iv The Attack IV of the Oochamon
     * @param {Number} def_iv The Defense IV of the Oochamon
     * @param {Number} spd_iv The Speed IV of the Oochamon
     * @returns An array for each stat, adjusted by level and IVs.
     */
    get_stats: function(species_id, level, hp_iv, atk_iv, def_iv, spd_iv) {
        let base_hp = db.monster_data.get(species_id, Stats.HP)
        let base_atk = db.monster_data.get(species_id, Stats.Attack)
        let base_def = db.monster_data.get(species_id, Stats.Defense)
        let base_spd = db.monster_data.get(species_id, Stats.Speed)
        let iv_influence = .025
        let base_influence1 = 12
        let base_influence2 = .5

        let hp =    Math.floor((((level * ((base_hp *  base_influence1) *  ((hp_iv *  iv_influence) + 1)))/100 + (base_hp *  base_influence2)) + level + 10) * 1.3);
        let atk =   Math.floor(((level * ((base_atk * base_influence1) *  ((atk_iv * iv_influence + 1))))/100 + (base_atk * base_influence2)) + level + 5);
        let def =   Math.floor(((level * ((base_def * base_influence1) *  ((def_iv * iv_influence + 1))))/100 + (base_def * base_influence2)) + level + 5);
        let spd =   Math.floor(((level * ((base_spd * base_influence1) *  ((spd_iv * iv_influence + 1))))/100 + (base_spd * base_influence2)) + level + 5);
        return [hp, atk, def, spd];
    },

    /**
     * Add a status effect to an oochamon.
     * @param {Object} ooch The oochamon to add a status effect to
     * @param {String} status The status effect to add
     * @returns The affected Oochamon object, with its status added
     */
    add_status_effect: function(ooch, status) {
        let return_string = '';
        let statusData = db.status_data.get(status);
        let statusEmote = functions.status_to_emote(status);
        let statusUpper = _.toUpper(statusData.name);

        //Ignore if we already have this status
        if (ooch.status_effects.includes(status)) {
            return_string += `${ooch.emote} **${ooch.nickname}** is already ${statusEmote} **${statusUpper}**!`
            return return_string;
        }

        //Ignore if we already have this status
        if (ooch.status_effects.includes(Status.Revealed) && status == Status.Vanish) {
            return_string += `${ooch.emote} **${ooch.nickname}** cannot ${statusEmote} **VANISH** because it is <:status_reveal:1339448769871220866> **REVEALED**!`
            return return_string;
        }

        //Mundane ignores status effects
        if (ooch.ability == Ability.Mundane){
            return_string += `${ooch.emote} **${ooch.nickname}**\'s **Mundane**:`
            return_string += `\n--- ${ooch.emote} **${ooch.nickname}** is immune to status effects!`;
            return return_string;
        } 
        
        //Stone types are immune to Petrify
        if(ooch.type.includes(OochType.Stone) && status == Status.Petrify){
            return_string += `${ooch.emote} **${ooch.nickname}** is Stone-type and cannot be ${statusEmote} **${statusUpper}**!`
            return return_string;
        }

        //Tech types are immune to Digitize
        if(ooch.type.includes(OochType.Tech) && status == Status.Digitize){
            return_string += `${ooch.emote} **${ooch.nickname}** is Tech-type and cannot be ${statusEmote} **${statusUpper}**!`
            return return_string;
        }

        //Mons with Seer are immune to Exposed and instead gain +1 spd
        if(ooch.ability == 'Seer' && status == Status.Expose){
            return_string += `${ooch.emote} **${ooch.nickname}**\'s **Seer**:`
            return_string += `\n--- ${ooch.emote} **${ooch.nickname}** is immune to being ${statusEmote} **${statusUpper}**!`;
            return_string += `\n--- ${functions.modify_stat(ooch, 'spd', 1)}\n`;
            return return_string;
        }

        ooch.status_effects.push(status);
        return_string += `${ooch.emote} **${ooch.nickname}** was ${statusEmote} **${statusUpper}**!`

        return return_string;
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
        //
        multiplier = Math.min(8, Math.max(.125,multiplier))

        switch(multiplier){
            case(0.125):    string = '*Barely effective...*';        break;
            case(0.25):     string = '*Very ineffective...*';        break;
            case(0.5):      string = '*Not very effective...*';      break;
            case(2):        string = '*Super effective!*';           break;
            case(4):        string = '*Incredibly effective!*';      break;
            case(8):        string = '*Devastatingly effective!*';   break;
        }

        return([multiplier, string])
    },
    
    item_use: function(user_id, ooch, item_id, in_battle=false) {
        let item_data = db.item_data.get(item_id); 
    
        if (item_data.type == 'potion') {
            if (in_battle && ooch.alive == true) {
                let prev_hp = ooch.current_hp;
                ooch.current_hp += item_data.potency;
                ooch.current_hp = _.clamp(ooch.current_hp, 0, ooch.stats.hp);
                if (ooch.tame_value < 200) {
                    ooch.tame_value = _.clamp(ooch.tame_value + 3, 0, 200);
                    if (ooch.tame_value == 200) {
                        ooch.stats.hp_iv = _.clamp(ooch.stats.hp_iv + 1, 0, 10);
                        ooch.stats.atk_iv = _.clamp(ooch.stats.atk_iv + 1, 0, 10);
                        ooch.stats.def_iv = _.clamp(ooch.stats.def_iv + 1, 0, 10);
                        ooch.stats.spd_iv = _.clamp(ooch.stats.spd_iv + 1, 0, 10);
                    }
                }

                return(`\n${ooch.emote} **${ooch.nickname}** recovered ${ooch.current_hp - prev_hp} HP.`);
            } else if (in_battle == false) {
                ooch.alive = true;
                let prev_hp = ooch.current_hp;
                ooch.current_hp += item_data.potency;
                ooch.current_hp = _.clamp(ooch.current_hp, 0, ooch.stats.hp);
                return ooch;
            } 
            
        } else if (item_data.type == 'prism') {
            let status_bonus = 1;
            let prism_multiplier = item_data.potency;
            let prism_chance = prism_multiplier / (ooch.level) * (ooch.stats.hp / ooch.current_hp) * status_bonus * 2;
            let throw_chance = Math.random();
            let prism_wiggles = (throw_chance - prism_chance > 0.5 ? 0 : (throw_chance - prism_chance > 0.3 ? 1 : 2 ))
    
            if (throw_chance < prism_chance) {
                return [true, 2];
            } else {
                return [false, prism_wiggles];
            }
        } else if (item_data.type == 'status') {
            let return_string = false;
            if (item_data.potency !== 'All') {
                let status_data = db.status_data.get(item_data.potency)
                ooch.status_effects = ooch.status_effects.filter(v => v != item_data.potency);
                return_string = `\n${ooch.emote} **${ooch.nickname}** recovered from its ${status_data.emote} **${status_data.name}**.`
            } else {
                ooch.status_effects = [];
                return_string = `\n${ooch.emote} **${ooch.nickname}** had its status effects removed.`
            }
            return return_string == false ? ooch : return_string;
        } else if (item_data.type == 'repel') {
            db.profile.set(user_id, item_data.potency, 'repel_steps'); 
        } 
        
    },

    hp_chunks_lost : function(hp_max, hp_before, hp_current, chunk_percentage){
        let chunks_lost = 0;
        hp_before /= hp_max;
        hp_current /= hp_max;
        for(let threshold = 1; threshold > 0; threshold -= chunk_percentage/100){
            if(hp_before > threshold && hp_current <= threshold){
                chunks_lost++;
            }
        }
        return chunks_lost;
    },

    use_eot_ability : async function(battle_data, user_index) {

        const { create_ooch } = require('./func_play.js');

        let ability_text = ``;
        let user = battle_data.users[user_index];
        

        let ooch = user.party[user.active_slot];
        let slot_info = user.slot_actions[user.active_slot];
        

        //Used for checking how much HP was lost
        let hp_before = slot_info.hp_starting;
        let hp_current = ooch.current_hp;
        let chunks_lost = 0;

        switch(ooch.ability) {
            case Ability.EscalationProtocol:
                chunks_lost = functions.hp_chunks_lost(ooch.stats.hp, hp_before, hp_current, 20);
                if(chunks_lost > 0 && ooch.current_hp > 0){
                    ability_text += `${ooch.emote} **${ooch.nickname}**\'s **Escalation Protocol**:`
                    ability_text += `\n--- ${functions.modify_stat(ooch, Stats.Attack, chunks_lost)}`;
                    ability_text += `\n--- ${functions.modify_stat(ooch, Stats.Defense, chunks_lost)}`;
                    ability_text += `\n--- ${functions.modify_stat(ooch, Stats.Speed, chunks_lost)}\n`;
                }
            break;
            case Ability.SpreadingSludge:
                chunks_lost = functions.hp_chunks_lost(ooch.stats.hp, hp_before, hp_current, 25);
                if(chunks_lost > 0 && ooch.current_hp > 0){
                    ability_text += `${ooch.emote} **${ooch.nickname}**\'s **Spreading Sludge**:`
                    let user_num = battle_data.users.length
                    //Spawn a Slime Head for each
                    for(let i = 0; i < chunks_lost; i++){
                        ability_text += `\n--- A strange <:c_027:1347440606204399707> **Slime Head** breaks off from the main body...`
                        await functions.new_battle_action_add_user(battle_data, user_num + i, "The split off <:c_027:1347440606204399707> **Slime Head** joins the battle!", 
                            "Slime Head", "c_027", user.team_id, [
                            {   id : -4, level : ooch.level, moveset : [Move.MagicBolt, Move.Glob, Move.Siphon, Move.Mud], 
                                ability : Ability.Icky, hp_iv : 0, atk_iv : 0, def_iv : 0, spd_iv : 0}
                        ])
                    }
                }
            break;
            case Ability.Stealthy:
                if(!slot_info.this_turn_did_damage){
                    ability_text += `${ooch.emote} **${ooch.nickname}**\'s **Stealthy**:`
                    ability_text += `\n--- ${functions.add_status_effect(ooch, Status.Focus)}\n`;
                }
            break;
            case Ability.Fleeting:
                ability_text += `${ooch.emote} **${ooch.nickname}**\'s **Fleeting**:`
                ooch.current_hp = Math.floor(ooch.current_hp / 2);
                ability_text += `\n--- ${ooch.emote} **${ooch.nickname}** had its HP halved!\n`;
            break;
            case Ability.Efficient:
                if (battle_data.turn_counter % 2 === 0) {
                    ability_text += `${ooch.emote} **${ooch.nickname}**\'s **Efficient**:`
                    ability_text += `\n--- ${functions.modify_stat(ooch, Stats.Attack, 1)}\n`;
                }
            break;
            case Ability.Inertia:
                ability_text += `${ooch.emote} **${ooch.nickname}**\'s **Inertia**:`
                ability_text += `\n--- ${functions.modify_stat(ooch, Stats.Speed, 1)}\n`;

            break;
            case Ability.Patient:
                if (battle_data.turn_counter % 2 === 0) {
                    ability_text += `${ooch.emote} **${ooch.nickname}**\'s **Patient**:`
                    ability_text += `\n--- ${functions.modify_stat(ooch, Stats.Defense, 1)}\n`;
                }
            break;
            case Ability.Increment:
                let randomStat = _.sample([Stats.Attack, Stats.Defense, Stats.Speed, Stats.Accuracy, Stats.Evasion]);
                ability_text += `${ooch.emote} **${ooch.nickname}**\'s **Increment**:`
                ability_text += `\n--- ${functions.modify_stat(ooch, randomStat, 1)}\n`;
            break;
            case Ability.Riposte:
                ability_text += `${ooch.emote} **${ooch.nickname}**\'s **Riposte**:`
                ooch.ability = Ability.Parry;
                ability_text += `\n--- ${ooch.emote} **${ooch.nickname}** changed its positioning, and shifted its ability to **Parry**!\n`;
            break;
            case Ability.HoleDweller:
                if (battle_data.turn_counter % 2 === 0) {
                    ability_text += `${ooch.emote} **${ooch.nickname}**\'s **Hole Dweller**:`
                    ability_text += `\n--- ${functions.add_status_effect(ooch, Status.Vanish)}\n`;
                }
            break;
            case Ability.DownwardSpiral:
                ability_text += `${ooch.emote} **${ooch.nickname}**\'s **Downward Spiral**:`
                let randomStatDecrease = _.sample([Stats.Attack, Stats.Defense, Stats.Speed, Stats.Accuracy, Stats.Evasion]);
                ability_text += `\n--- ${functions.modify_stat(ooch, randomStatDecrease, -1)}\n`;
            break;
        }
    
        slot_info.hp_starting = hp_current

        if (!ooch.status_effects.includes(Status.Digitize) && !ooch.status_effects.includes(Status.Petrify)) {
            switch (ooch.ability) {
                case Ability.Spectral:
                    ability_text += `${ooch.emote} **${ooch.nickname}**\'s **Spectral**:`
                    if (ooch.type == ooch.og_type) {
                        ooch.type = [OochType.Magic];
                        ability_text += `\n--- ${ooch.emote} **${ooch.nickname}** changed its type to ${functions.type_to_emote(OochType.Magic)} **Magic**!\n`
                    } else {
                        ooch.type = ooch.og_type;
                        ability_text += `\n--- ${ooch.emote} **${ooch.nickname}** changed its type back to ${functions.type_to_emote(ooch.type)} **${ooch.type.map(v => _.capitalize(v)).join(' | ')}**.\n`
                    }
                break;
                case Ability.Radioactive:
                    ability_text += `${ooch.emote} **${ooch.nickname}**\'s **Radioactive**:`
                    if (ooch.type == ooch.og_type) {
                        ooch.type = [OochType.Flame];
                        ability_text += `\n--- ${ooch.emote} **${ooch.nickname}** changed its type to ${functions.type_to_emote(OochType.Flame)} **Flame**!\n`
                    } else {
                        ooch.type = ooch.og_type;
                        ability_text += `\n--- ${ooch.emote} **${ooch.nickname}** changed its type back to ${functions.type_to_emote(ooch.type)} **${ooch.type.map(v => _.capitalize(v)).join(' | ')}**.\n`
                    }
                break;
            }
        }

        //Weather effects
        switch(battle_data.weather){
            case Weather.Clear: break; //Do Nothing
            case Weather.None: break; //Do Nothing
            case Weather.Heatwave: 
                if(!ooch.type.includes(OochType.Flame)) {
                    let hp_lost = Math.floor(ooch.stats.hp * 0.05);
                    ooch.current_hp = _.clamp(ooch.current_hp - hp_lost, 0, ooch.stats.hp);
                    ability_text += `\n\n☀️ ${ooch.emote} **${ooch.nickname}** is damaged by the intense heat and **loses ${hp_lost} HP!**`;
                }
            break;
            case Weather.Thunderstorm:
                slot_info.counter_thunderstorm++;
                switch(slot_info.counter_thunderstorm){
                    case 1:
                        ability_text += `\n\n⛈️ ${ooch.emote} **${ooch.nickname}** begins to spark...`;
                    break;
                    case 2:
                        ability_text += `\n\n⛈️ ${ooch.emote} **${ooch.nickname}** is being enveloped in electricity...`;
                    break;
                    case 3:
                        let hp_lost = Math.floor(ooch.stats.hp / 2);
                        ability_text += `\n\n⛈️ ${ooch.emote} **${ooch.nickname}** is struck by lightning and **loses ${hp_lost} HP!**`;
                        if(ooch.type.includes(OochType.Tech)){
                            ability_text += `\n⛈️ ${ooch.emote} **${ooch.nickname}** is energized by the lightning!`;
                            ability_text += `\n--- ${functions.modify_stat(ooch, Stats.Attack, 1)}`;
                        }
                        ooch.current_hp = _.clamp(ooch.current_hp - hp_lost, 0, ooch.stats.hp);
                        slot_info.counter_thunderstorm = 0;
                    break;
                }
            break;
        }

        ability_text += "\n";



        return {ooch : ooch, text : ability_text};
    },

    /**
     * Converts a type string to an emote for that type.
     * @param {Array} type_array The type array to turn into a type string
     * @param {Boolean} text_emote Whether you want text emotes or icon emotes for the type
     * @returns The emote string
     */
    type_to_emote: function(type_array, text_emote = false) {
        let return_string = '';

        if (!Array.isArray(type_array)) {
            type_array = [type_array];
        }

        for (let type of type_array) {
            switch(type) {
                case OochType.Flame:   return_string +=  text_emote ? '<:icon_flame_txt:1274936258811920414>'   : '<:icon_flame:1274936249484050472>';   break;
                case OochType.Fungal:  return_string +=  text_emote ? '<:icon_fungal_txt:1274936284497969203>'  : '<:icon_fungal:1274936267884199947>';  break;
                case OochType.Magic:   return_string +=  text_emote ? '<:icon_magic_txt:1274936569790468096>'   : '<:icon_magic:1274936558595866787>';   break;
                case OochType.Stone:   return_string +=  text_emote ? '<:icon_stone_txt:1274936655236563055>'   : '<:icon_stone:1274936641433243781>';   break;
                case OochType.Neutral: return_string +=  text_emote ? '<:icon_neutral_txt:1274936596155863080>' : '<:icon_neutral:1274936582583091210>'; break;
                case OochType.Ooze:    return_string +=  text_emote ? '<:icon_ooze_txt:1274936617320316928>'    : '<:icon_ooze:1274936607136288810>';    break;
                case OochType.Tech:    return_string +=  text_emote ? '<:icon_tech_txt:1274936688589803613>'    : '<:icon_tech:1274936672022298624>';    break;
                case OochType.Void:    return_string +=  text_emote ? '<:icon_void_txt:1274936717383569409>'    : '<:icon_void:1274936702959485011>';    break;
                case OochType.Sound:   return_string +=  text_emote ? '<:icon_void_txt:1274936717383569409>'    : '<:icon_sound:1296312531068911616>';   break;
                case OochType.Crystal: return_string +=  text_emote ? '<:icon_void_txt:1274936717383569409>'    : '<:icon_crystal:1296312529126948894>'; break;
                case OochType.Cloth:   return_string +=  text_emote ? '<:icon_void_txt:1274936717383569409>'    : '<:icon_cloth:1296312526882996234>';   break;
                case OochType.Martial: return_string +=  text_emote ? '<:icon_void_txt:1274936717383569409>'    : '<:icon_martial:1296312529949036575>'; break;
            }
        }

        return return_string;
    },

    /**
     * An algorithm that handles calculating the raw amount of damage a move will do.
     * Takes abilities into account as well here. Mainly used in the attack function.
     * @param {Number} move_damage How much damage the move is doing
     * @param {String} move_type The type of the move
     * @param {Object} ooch_attacker The data of the Oochamon attacking
     * @param {Object} ooch_defender The data of the Oochamon defending
     * @param {Number} turn_count The amount of turns in the battle (used for Gravity ability)
     * @returns The amount of damage the move will do.
     */
    battle_calc_damage: function(move_damage, move_type, ooch_attacker, ooch_defender, turn_count) {

        let attacker_atk_stat = ooch_attacker.stats.atk * functions.get_stat_multiplier(ooch_attacker.stats.atk_mul);
        let defender_def_stat = ooch_defender.stats.def * functions.get_stat_multiplier(ooch_defender.stats.def_mul);

        if (ooch_attacker.ability == Ability.Bipolar) {
            attacker_atk_stat = ooch_attacker.stats.def * functions.get_stat_multiplier(ooch_attacker.stats.def);
        }
        if (ooch_attacker.ability == Ability.Thorned) {
            attacker_atk_stat += ooch_attacker.stats.def * functions.get_stat_multiplier(ooch_attacker.stats.def_mul) / 4;
        }

        let damage = Math.round(Math.ceil((.8 * ooch_attacker.level + 2) // Level Adjustment
        * (move_damage + _.random(-5, 5)) // Damage with random damage variance
        * (ooch_attacker.ability == Ability.Gravity ? (turn_count / 100) + 1 : 1)
        * (ooch_attacker.ability == Ability.Hexiply ? ((Math.floor((ooch_attacker.current_hp / ooch_attacker.stats.hp) * 6) * 6) / 100) + 1 : 1)
        * (ooch_attacker.ability == Ability.Focused && ooch_attacker.status_effects.length == 0 ? 1.1 : 1)
        * (ooch_attacker.ability == Ability.Corrosive ? (_.clamp(defender_def_stat, 0, 300) / 10) + 1 : 1)
        * (ooch_attacker.ability == Ability.Hearty && ooch_attacker.current_hp > ooch_attacker.stats.hp / 2 ? 1.15 : 1)
        * (ooch_attacker.ability == Ability.Riposte ? 1.2 : 1)
        * (ooch_defender.ability == Ability.Parry ? 0.8 : 1)

        * (ooch_attacker.stance == StanceForms.Attack ? 1.5 : 1)
        * (ooch_defender.stance == StanceForms.Attack ? 1.5 : 1)
    
        * (ooch_attacker.stance == StanceForms.Defense ? 0.66 : 1)
        * (ooch_defender.stance == StanceForms.Defense ? 0.66 : 1)
        
        * attacker_atk_stat / defender_def_stat) 
        / 50 + 2);

        switch (move_type) {
            case OochType.Ooze: 
                if (ooch_attacker.ability == Ability.Icky) damage *= 1.2
                if (ooch_attacker.ability == Ability.Crystallize) damage *= 1.3; break;
            case OochType.Fungal:
                if (ooch_attacker.ability == Ability.Icky) damage *= 1.2; break;
            case OochType.Flame:
                if (ooch_attacker.ability == Ability.Warm) damage *= 1.1;
                if (ooch_defender.ability == Ability.Moist) damage *= 0.5;
                if (ooch_attacker.ability == Ability.Crystallize) damage *= 1.3; 
                if (ooch_attacker.ability == Ability.PowerConduit && (ooch_defender.type.includes(OochType.Ooze) || ooch_defender.type.includes(OochType.Tech))) damage *= 1.5; break;
            case OochType.Stone:
                if (ooch_attacker.ability == Ability.Burrower) damage *= 1.1;
                if (ooch_defender.ability == Ability.Armored) damage *= 0.8;
            case OochType.Tech:
                if (ooch_attacker.ability == Ability.LiquidCooled) damage *= 1.25; break;
            case OochType.Sound:
                if (ooch_attacker.ability == Ability.BassBoost) damage *= 1.2; break;
            case OochType.Crystal:
                if (ooch_attacker.ability == Ability.Crystallize) damage *= 1.3; break;
        }

        damage = Math.round(damage);
        damage = _.clamp(damage, 1, ooch_defender.current_hp)
        return damage;
    },

    /**
     * A helper function that handles doing an attack and using a move on
     * another Oochamon in an Oochamon battle.
     * @param {Object} thread The thread Oochamon is being played in.
     * @param {String} user_id The user id of the user playing Oochamon.
     * @param {String} atk_id The ID of the attack being used
     * @param {Object} attacker The Oochamon data of the attacker
     * @param {Object} defender The Oochamon data of the defender
     * @param {String} header The header string displaying whos turn it is in the battle
     * @returns An array of the attacker and defender Oochamon data, after the attacks.
     */
    attack: async function(battle_data, user_index_attacker, user_index_defender, atk_id) {

        let user_attacker = battle_data.users[user_index_attacker];
        let user_defender = battle_data.users[user_index_defender];
        let attacker = user_attacker.party[user_attacker.active_slot];
        let defender = user_defender.party[user_defender.active_slot];
        let slot_attacker = user_attacker.slot_actions[user_attacker.active_slot];
        let slot_defender = user_defender.slot_actions[user_defender.active_slot];
        let attacker_emote = db.monster_data.get(attacker.id, 'emote');
        let defender_emote = db.monster_data.get(defender.id, 'emote');
        let atkOochName = attacker.nickname;
        let defOochName = defender.nickname;
        let string_to_send = ``;

        //Figure out whether we're going first or last for misc values
        let going_first = true;
        let going_last = true;
        for(let user of battle_data.users){
            if(user.slot_actions[user.active_slot].this_turn_did_attack){ going_first = false}
            else { going_last = false}
        }

        

        slot_attacker.this_turn_did_attack = true;
        slot_defender.this_turn_was_attacked = true;

        let move_info = db.move_data.get(atk_id);

        let move_effects =   move_info.effect;
        let ogMoveId = atk_id;
        if (move_effects.some(effect => effect.status === 'random')) {
            let moveList = db.move_data.keyArray();
            // Remove some moves that shouldn't be obtained with random
            moveList = moveList.filter(v => !([40, 92].includes(parseInt(v))))

            atk_id = _.sample(db.move_data.keyArray());
            move_info = db.move_data.get(atk_id);
            move_effects =   move_info.effect;
        }
        let move_name =     move_info.name;
        let move_type =     move_info.type;
        let move_damage =   move_info.damage;
        let move_accuracy = move_info.accuracy;
        let move_guarantee_hit = move_accuracy < 0;
        if (defender.status_effects.includes(Status.Revealed)){ move_guarantee_hit = true; }
        if (move_effects.some(effect => effect.status === 'random')) move_type = _.sample(defender.type);
        let move_type_emote =      functions.type_to_emote(move_type);


        //For interactions that depend on going last/first
        let first_last_failed_text = '' //If the move doesn't have any damage after doing this check we should fail the move
        if(move_effects.some(effect => effect.status === Status.GoingFirstBonus)) {  
            if(going_first){
                move_damage += Math.round((move_effects.find(effect => effect.status === Status.GoingFirstBonus)?.chance || 0))
            }
            else if(move_damage == 0){ 
                first_last_failed_text += `it missed its chance!`
            }
        }
        if(move_effects.some(effect => effect.status === Status.GoingLastBonus)) { 
            if(going_last){
                move_damage += Math.round((move_effects.find(effect => effect.status === Status.GoingLastBonus)?.chance || 0))
            }
            else if(move_damage == 0){ 
                first_last_failed_text += `it moved too quickly!`
            }
        }

        //For moves with a weather-dependant type
        if(move_effects.some(effect => effect.status === Status.WeatherDependent)){
            switch(battle_data.weather){
                case Weather.None: break; //Do nothing
                case Weather.Heatwave: 
                    move_type = OochType.Flame; 
                    string_to_send += `\n${move_name}'s type was changed to ${functions.type_to_emote([OochType.Flame])} **Flame**!`
                    move_effects.push({status : Status.Burn, chance : 30, target : MoveTarget.Enemy})
                    break;
                case Weather.Thunderstorm: 
                    move_type = OochType.Sound; 
                    string_to_send += `\n${move_name}'s type was changed to ${functions.type_to_emote([OochType.Sound])} **Sound**!`
                    move_effects.push({status : Status.Expose, chance : 30, target : MoveTarget.Enemy})
                    break;
            }
        }

        let type_multiplier = move_damage == 0 ? [1, ''] : functions.type_effectiveness(move_type, defender.type); //Returns [multiplier, string] 
        //Weak status reduces the move's power by 10
        if(attacker.status_effects.includes(Status.Weak)){
            move_damage = _.max(move_damage - 10, 5)
        }
        
        let status_blind = (attacker.status_effects.includes(Status.Blind) ? .65 : 1);
        let status_exposed = (defender.status_effects.includes(Status.Expose) ? 2 : 1);
        let recoil_damage = Math.round((move_effects.find(effect => effect.status === "recoil")?.chance / 100 || 0) * attacker.stats.hp);
        let vampire_heal = (move_effects.find(effect => effect.status === "vampire")?.chance / 100 || 0)
        let move_heal = (move_effects.find(effect => effect.status === "heal")?.chance / 100 || 0)
        let reflect_dmg = 0;
        let defender_field_text = ``;
        let ability_dmg_multiplier = 1;
        let selfTarget = (move_damage == 0 && move_effects.some(effect => effect.target === MoveTarget.Self));

        let move_weather = (move_effects.find(effect => effect.status === "weather")?.chance || Weather.None);
        let move_field = (move_effects.find(effect => effect.status === "field")?.chance || FieldEffect.None);

        //Make sure accuracy is a positive value (we might not need to do this anymore)
        move_accuracy = Math.abs(move_accuracy);
        
        //Track recently used moves
        let move_matches_first = slot_attacker.move_used_first === atk_id;
        let move_matches_last = slot_attacker.move_used_last === atk_id;
        if(slot_attacker.move_used_first == false){ slot_attacker.move_used_first = atk_id; }
        slot_attacker.move_used_last = atk_id;

        //Field Effects
        switch(battle_data.field_effect){
            case FieldEffect.EchoChamber:
                if(move_type == OochType.Sound && move_damage > 0){
                    move_effects.push({status : Status.Expose, chance : 100, target : MoveTarget.Enemy})
                }
            break;
        }

        //Abilities that affect damage via misc conditions
        switch(slot_attacker.Ability){
            case Ability.Rogue:
                if(defender.current_hp === defender.stats.hp){
                    ability_dmg_multiplier = 2;
                }
            break;
            case Ability.Pact:
                if(move_matches_first){
                    ability_dmg_multiplier = 1.3;
                }
            break;
            case Ability.DoubleOrNothing:
                ability_dmg_multiplier = check_chance(50) ? 2 : 0;
            break;
            case Ability.Neutralizer:
                if(move_damage > 0){
                    ability_dmg_multiplier = 1.3;
                    move_effects = [];
                }
            break;
        }

        //Check for crits
        let crit_multiplier = (Math.random() > (0.95 - (move_effects.find(effect => effect.status === "critical")?.chance / 100 || 0) - (attacker.ability === Ability.HeightAdvantage ? 0.1 : 0)) ? 2 : 1);
        if (attacker.status_effects.includes(Status.Focus)) {
            crit_multiplier = 2;
            attacker.status_effects = attacker.status_effects.filter(v => v != Status.Focus);
        }
        if(move_damage == 0){ crit_multiplier = 1; }

        //Final damage calc
        let dmg = 0;
        if (move_damage != 0) {
            dmg = functions.battle_calc_damage(move_damage * type_multiplier[0] * status_exposed * ability_dmg_multiplier, 
                                    move_type, attacker, defender, battle_data.turn_counter) * crit_multiplier;
        }

        vampire_heal = Math.ceil(vampire_heal * dmg); //used later
        // Remove Exposed status effect
        if (status_exposed != 1) {
            defender.status_effects = defender.status_effects.filter(v => v != Status.Expose);
            if(attacker.ability == Ability.Exploiter){
                status_exposed = 3;
            }
        }


        // If the defender has Vanish AND the attack is not self targeting, it should fail
        let chance_to_hit = move_accuracy/100 * functions.get_stat_multiplier(attacker.stats.acc_mul - defender.stats.eva_mul, 4) * status_blind
        if (attacker.stance == StanceForms.Speed) chance_to_hit *= 0.75;
        if (attacker.stance == StanceForms.Sniper) chance_to_hit *= 1.5;

        //These modify the chance to hit ORDER MATTERS [0 = 0% chance, 1 = 100% chance]
        if(defender.ability == Ability.Immense){ chance_to_hit = 1; }
        if(defender.status_effects.includes(Status.Vanish)){ chance_to_hit = 0; }
        if(selfTarget == true){ chance_to_hit = 1; }
        
        //Text for if we try to do a thing but fail
        let tried_to_text = `${attacker_emote} **${atkOochName}**\'s tried to use **${move_name}**, but`

        //Hey, chat, are we asleep? Or do we un-sleep'th'st've?
        let do_wakeup = (.3 > Math.random()) && (attacker.status_effects.includes(Status.Sleep));

        //Some failstates and then actually attacking
        if(attacker.status_effects.includes(Status.Drained)){
            string_to_send = `\n${attacker_emote} **${atkOochName}** is 😓 **DRAINED** and must recharge this turn...`;
            attacker.status_effects = attacker.status_effects.filter(v => v != Status.Drained);
        }
        else if(!do_wakeup && attacker.status_effects.includes(Status.Sleep)){ //If we sleep, we sleep, do nothing
            string_to_send = `\n${attacker_emote} **${atkOochName}** is <:status_sleep:1335446202275070034> SLEEPING...`;
        }
        else if(first_last_failed_text != ''){
            string_to_send += `${tried_to_text} ${first_last_failed_text}`;
        }
        else if(defender.ability == Ability.Phantasmal && move_type == OochType.Neutral && move_damage > 0){ //Neutral type moves are ignored by Phantasmal
            string_to_send += `\n${tried_to_text} ${defender_emote} **${defOochName}**\'s **Phantasmal** makes it immune to Neutral-type moves!`;
        }
        else if(defender.ability == Ability.Protector && type_multiplier < 1 && slot_defender.this_turn_switched_in){ //Protector mons are immune to damage types they resist the turn they swap in
            string_to_send += `\n${tried_to_text} ${defender_emote} **${defOochName}**\'s **Protector** makes it immune to moves it resists!`;
        }
        else if(attacker.ability == Ability.DoubleOrNothing && ability_dmg_multiplier < 1 && move_damage > 0){
            string_to_send += `\n${tried_to_text} but its **Double or Nothing** didn't pay off...`;
        }
        else if (chance_to_hit > Math.random() || move_guarantee_hit){ //Does the attack successfully land?
            if(do_wakeup){ //We woke up!
                string_to_send += `\n${attacker_emote} **${atkOochName}** woke up!`;
                attacker.status_effects = attacker.status_effects.filter(v => v != Status.Sleep);
            }


            //True damage added here
            dmg += (move_effects.find(effect => effect.status === Status.TrueDamage)?.chance || 0);

            // Take damage and heal from move effects
            defender.current_hp -= dmg
            defender.current_hp = _.clamp(defender.current_hp, 0, defender.stats.hp);

            attacker.current_hp += Math.round(vampire_heal);
            attacker.current_hp += Math.round(attacker.stats.hp * move_heal * (attacker.ability == 'Vigorous' ? 1.3 : 1));
            attacker.current_hp -= recoil_damage;
            attacker.current_hp = _.clamp(attacker.current_hp, 0, attacker.stats.hp)

            slot_attacker.this_turn_did_damage = true;
            slot_defender.this_turn_was_damaged = true;

            // When the Oochamon attacker hits the defender and we aren't targetting ourself
            if (selfTarget === false && dmg !== 0) {
                switch (attacker.ability) {
                    case Ability.DoubleOrNothing:
                        defender_field_text += `\n--- ${attacker_emote} **${atkOochName}**\'s **Double or Nothing**:`
                        defender_field_text += `\n------ The damage was doubled!\n`
                    break;
                    case Ability.Leech:
                        let hp_prev = attacker.current_hp;
                        attacker.current_hp = _.clamp(attacker.current_hp + Math.ceil(dmg * 0.1), 0, attacker.stats.hp); 

                        if(attacker.current_hp - hp_prev > 0){
                            defender_field_text += `\n--- ${attacker_emote} **${atkOochName}**\'s **Leech**:`
                            defender_field_text += `\n------ ${attacker_emote} **${atkOochName}** gained **${attacker.current_hp - hp_prev} HP**\n`
                        }
                    break;
                    case Ability.Ensnare:
                        if (check_chance(30) && !defender.status_effects.includes(Status.Vanish)) {
                            defender_field_text += `\n--- ${attacker_emote} **${atkOochName}**\'s **Ensnare**:`
                            defender_field_text += `\n--- ${functions.add_status_effect(defender, Status.Snare)}\n`;
                        }
                    break;
                    case Ability.Lacerating:
                        defender_field_text += `\n--- ${attacker_emote} **${atkOochName}**\'s **Lacerating**:`

                        let damage_taken = Math.round(defender.stats.hp * 0.05);
                        defender.current_hp = _.clamp(defender.current_hp - damage_taken, 0, defender.stats.hp);
                        defender_field_text += `\n------ ${defender_emote} **${defOochName}** lost ${damage_taken} HP!\n`;
                    break;
                    case Ability.Frostbite:
                        defender_field_text += `\n--- ${attacker_emote} **${atkOochName}**\'s **Frostbite**:`
                        defender_field_text += `\n------ ${functions.modify_stat(defender, Stats.Speed, -1)}\n`;
                    break;
                    case Ability.StringsAttached:
                        if (check_chance(20)) {
                            defender_field_text += `\n--- ${attacker_emote} **${atkOochName}**\'s **Strings Attached**:`
                            let randomStatus = _.sample([Status.Burn, Status.Blind, Status.Infect, Status.Snare]);
                            defender_field_text += `\n--- ${functions.add_status_effect(defender, randomStatus)}\n`;
                        }
                    break;
                    case Ability.Riposte:
                        defender_field_text += `\n--- ${attacker_emote} **${atkOochName}**\'s **Riposte**:`
                        attacker.ability = Ability.Parry;
                        defender_field_text += `\n--- ${attacker_emote} **${atkOochName}** changed its stance, and shifted its ability to **Parry**!\n`;
                    break;
                    case Ability.Turbine:
                        if(move_type == OochType.Flame){
                            defender_field_text += `\n--- ${attacker_emote} **${atkOochName}**\'s **Turbine**:`
                            defender_field_text += `\n------ ${functions.modify_stat(attacker, Stats.Attack, 1)}\n`;
                        }
                    break;
                }
                
                // When the Oochamon defender gets hit by the attacker
                switch (defender.ability) {
                    case Ability.Constructor:
                        if(move_type === OochType.Stone){
                            defender_field_text += `\n--- ${defender_emote} **${defOochName}**\'s **Constructor**:`
                            defender_field_text += `\n------ ${functions.modify_stat(defender, Stats.Defense, 1)}\n`;
                        }
                    break;
                    case Ability.Reactive:
                        let prev_hp = attacker.current_hp;
                        attacker.current_hp = _.clamp(attacker.current_hp - Math.round(attacker.stats.hp * 0.1), 0, attacker.stats.hp)
                        let reflect_dmg = prev_hp - attacker.current_hp;

                        defender_field_text += `\n--- ${defender_emote} **${defOochName}**\'s **Reactive**:`
                        defender_field_text += `\n------ ${attacker_emote} **${atkOochName}** took **${reflect_dmg}** reflect damage!\n`
                    
                    break;
                    case Ability.Shadow:
                        if (check_chance(20)) {
                            defender_field_text += `\n--- ${defender_emote} **${defOochName}**\'s **Shadow**:`
                            defender_field_text += `\n--- ${functions.add_status_effect(defender, Status.Vanish)}\n`;
                        }
                    break;
                    case Ability.Tangled:
                        defender_field_text += `\n--- ${defender_emote} **${defOochName}**\'s **Tangled**:`
                        defender_field_text += `\n--- ${functions.add_status_effect(defender, Status.Snare)}\n`;
                    break;
                    case Ability.Flammable:
                        if (move_type === OochType.Flame) {
                            defender_field_text += `\n--- ${defender_emote} **${defOochName}**\'s **Flammable**:`
                            defender_field_text += `\n------ ${functions.modify_stat(defender, Stats.Attack, 1)}\n`;
                        }
                    break;
                    case Ability.Parry:
                        defender_field_text += `\n--- ${defender_emote} **${defOochName}**\'s **Parry**:`
                        defender.ability = Ability.Riposte;
                        defender_field_text += `\n------ ${defender_emote} **${defOochName}** changed its positioning, and shifted its ability to **Riposte**!\n`;
                    break;
                    case Ability.Bloodrush:
                        defender_field_text += `\n--- ${defender_emote} **${defOochName}**\'s **Bloodrush**:`
                        defender_field_text += `\n------ ${functions.modify_stat(defender, Stats.Speed, 1)}\n`;
                    break;
                }
            }

            

            if (ogMoveId !== atk_id) {
                string_to_send += `\n🎲 **${db.move_data.get(ogMoveId, 'name')}** changed into **${move_name}**!\n`;
            }

            if (move_effects.some(effect => effect.status === 'typematch')) {
                string_to_send += `\n✨ **${move_name}** changed into the ${defender_emote} **${defOochName}**'s type, **${move_type_emote}** **${_.capitalize(move_type)}**!\n`
            }

            //Add one of the battle description flavor texts if applicable
            let move_battle_desc = db.move_data.get(atk_id, 'battle_desc');
            if(typeof move_battle_desc == "string") {
                move_battle_desc = move_battle_desc.replaceAll("USER", `${attacker_emote} ${atkOochName}`);
                move_battle_desc = move_battle_desc.replaceAll("TARGET", `${defender_emote} ${defOochName}`);

                string_to_send += `\n--- *${move_battle_desc}*`;
            }

            string_to_send += `\n${attacker_emote} **${atkOochName}** ${attacker.ability === Ability.Uncontrolled ? 'is uncontrollable and randomly used' : 'used'} **${move_type_emote}** **${move_name}**!`;
            if (dmg !== 0) string_to_send += `\n--- ${defender_emote} **${defOochName}** took **${dmg} damage**! ${type_multiplier[1]}`;

            //Handle Weather
            if(move_weather != Weather.None){
                if(move_weather == Weather.Clear){
                    battle_data.weather = Weather.None;
                    string_to_send += `\n--- The weather was cleared!`
                }
                else{ battle_data.weather = move_weather; }
            }

            //Handle Field Effects
            if(move_field != FieldEffect.None){
                if(move_field == FieldEffect.Clear){
                    battle_data.field_effect = FieldEffect.None;
                    string_to_send += `\n--- Field effects were cleared!`
                }
                else{ battle_data.field_effect = move_field; }
            }

            //If the target has the Exposed status effect, usually 2, but if the attacker has Exploiter, it is 3
            if(status_exposed != 1 && move_damage > 0) {
                string_to_send += `\n--- **The damage was <:status_exposed:1335433347345813624> ${status_exposed == 2 ? 'doubled' : `tripled by ${attacker_emote} ${atkOochName}'s Exploiter`}!**`
            }

            //If a crit lands
            if (crit_multiplier >= 2) {
                string_to_send += `\n--- 💢 **A critical hit!**`
            }

            //If an attack has vampire
            if (vampire_heal > 0) {
                string_to_send += `\n--- 🩸 ${attacker_emote} **${atkOochName}** leeched **${vampire_heal}** HP from ${defender_emote} **${defOochName}**!`;
            }

            //If an attack has heal
            if (move_heal > 0) {
                
                string_to_send += `\n--- ❤️ ${attacker_emote} **${atkOochName}** healed **${Math.round(attacker.stats.hp * move_heal)}** HP`;
                string_to_send += attacker.ability == 'Vigorous' ? ', boosted by Vigorous!' : '!'

            }

            //If attack has recoil
            if (recoil_damage > 0) {
                string_to_send += `\n--- 💥 ${attacker_emote} **${atkOochName}** lost **${recoil_damage}** HP from recoil!`
            }

            

            if (move_effects.length != 0) {
                for (let eff of move_effects) {
                    let status_target = eff.target == MoveTarget.Self ? attacker : defender;
                    let status_target_emote = eff.target == MoveTarget.Self ? attacker_emote : defender_emote;
                    let statStatus = false;
                    if (isNaN(eff.status)) {
                        statStatus = eff.status.includes('+') || eff.status.includes('-');
                    }

                    if (selfTarget !== false) {
                        // Change move_effect_chance based on abilities
                        switch (attacker.ability) {
                            case Ability.Scorching:
                                if (eff.status == Status.Burn) eff.chance = 100;
                            break;
                            case Ability.LiquidCooled:
                                if (eff.status == Status.Burn) eff.chance = 0;
                            break;
                        }

                        if (statStatus === false) {
                            switch (defender.ability) {
                                case Ability.Mundane:
                                    eff.chance = 0;
                                break;
                            }
                        }
                    }

                    // Apply move effects
                    if (Math.random() < eff.chance/100 && eff.chance > 0) { 
                        let status_split = []
                        if (isNaN(eff.status)) status_split = eff.status.split('_')
                        let status_adds = [eff.status];

                        if (typeof eff.status == "number") {
                            let statusData = db.status_data.get(eff.status);
                            // Setup list of status effects to add
                            switch (status_target.ability) {
                                case Ability.Darkbright:
                                    switch (eff.status) {
                                        case Status.Burn: status_adds.push(Status.Blind);
                                        case Status.Blind: status_adds.push(Status.Burn);
                                    }
                                break;
                                case Ability.Radiant:
                                    switch (eff.status) {
                                        case Status.Infect: status_adds.push(Status.Burn);
                                        case Status.Burn: status_adds.push(Status.Infect);
                                    }
                                break;
                            }

                            // Remove duplicates
                            status_adds = status_adds.filter((item, index) => status_adds.indexOf(item) === index);  
                            if(status_adds.includes(Status.Revealed)){
                                slot_defender.this_turn_revealed = true;
                            }

                            for(let s of status_adds){
                                defender_field_text += `\n--- ${functions.add_status_effect(status_target, s)}`;
                            }
                                 
                        }
                        // +_def_1 is the format
                        else if (status_split[0] == '+' || status_split[0] == '-'){
                            let stage_change = (status_split[0] == '+' ? 1 : -1) * parseInt(status_split[2]);
                            defender_field_text += `\n--- ${functions.modify_stat(status_target, status_split[1], stage_change)}`;
                            
                        } else if (eff.status == 'clear_status') {
                            status_target.status_effects = [];
                            defender_field_text += `\n--- ${status_target.emote} **${status_target.nickname}** had its status effects cleared!`;
                        } else if (eff.status == 'clear_stat_stages') {
                            status_target.stats.atk_mul = 0;
                            status_target.stats.def_mul = 0;
                            status_target.stats.spd_mul = 0;
                            status_target.stats.acc_mul = 0;
                            status_target.stats.eva_mul = 0;
                            defender_field_text += `\n--- ${status_target.emote} **${status_target.nickname}** had its stats set back to normal!`;
                        }
                    }
                }
            }

            //If the target was SLEEPING and took damage, it gets woken up
            if(dmg > 0 && defender.status_effects.includes(Status.Sleep)){
                string_to_send += `\n${defender_emote} **${defOochName}** was jolted awake!`;
                attacker.status_effects = attacker.status_effects.filter(v => v != Status.Sleep);
            }

        // If the attack misses
        } else {
            string_to_send += `\n${attacker_emote} **${atkOochName}** tried to use ${move_name} but it missed!`
        }

        // Check if opposing Oochamon is dead
        if (defender.current_hp <= 0) {
            //defender_field_text += `\n--- 🪦 ${defender_emote} **${defOochName}** fainted!`
            //defender.alive = false;
            
            // Attacker oochamon on kill ability triggers
            switch (attacker.ability) {
                case Ability.Energized:
                    defender_field_text += `\n${attacker_emote} **${atkOochName}**'s **Energized**:`
                    defender_field_text += `\n--- ${functions.modify_stat(attacker, Stats.Attack, 1)}`
                    defender_field_text += `\n--- ${functions.modify_stat(attacker, Stats.Speed, 1)}\n`
                break;
                case Ability.InvalidEntry:
                    // -1 is the ID of i_
                    db.monster_data.set('-1', 1, 'atk');
                    db.monster_data.set('-1', 1, 'def');
                    db.monster_data.set('-1', 1, 'spd');
                    db.monster_data.set('-1', 1, 'hp');
                break;
                case Ability.Ravenous:
                    let hp_prev = attacker.current_hp;
                    attacker.current_hp = _.clamp(_.round(attacker.current_hp + (attacker.stats.hp * 0.2)), 0, attacker.stats.hp);

                    if(attacker.current_hp - hp_prev > 0){
                        defender_field_text += `\n${attacker_emote} **${atkOochName}**'s **Ravenous**:`
                        defender_field_text += `\n--- ${attacker_emote} **${atkOochName}** recovered ${attacker.current_hp - hp_prev}HP!\n`;
                    }
                    
                break;
            }

            // Opposing oochamon death ability triggers
            switch (defender.ability) {
                case Ability.Haunted:
                    defender_field_text += `\n${defender_emote} **${defOochName}**'s **Haunted**:`
                    defender_field_text += `\n--- ${functions.add_status_effect(attacker, Status.Doom)}`
                break;
                case Ability.Sporespray:
                    defender_field_text += `\n${defender_emote} **${defOochName}**'s **Sporespray**:`
                    defender_field_text += `\n--- ${functions.add_status_effect(attacker, Status.Infect)}`
                break;
                case Ability.InvalidEntry:
                    // -1 is the ID of i_
                    db.monster_data.inc('-1', 'atk');
                    db.monster_data.inc('-1', 'def');
                    db.monster_data.inc('-1', 'spd');
                    db.monster_data.inc('-1', 'hp');
                    defender_field_text += `\n--- **Y̴o̴u̶ ̵w̴o̵n̶,̴ ̴b̷u̵t̷ ̸a̶t̵ ̷w̴h̶a̸t̷ ̶c̴o̷s̴t̶?̸**`;
                break;
                case Ability.EasyGo:
                    defender_field_text += `\n${defender_emote} **${defOochName}**'s **Easy Go**:`
                    defender_field_text += `\n--- ${defender_emote} **${defOochName}**'s team recovered **20%** of their HP!\n`;
                break;
                case Ability.Bomber:
                    
                    let hp_prev = attacker.current_hp;
                    attacker.current_hp = _.ceil(attacker.current_hp / 2);

                    if(hp_prev - attacker.current_hp > 0){
                        defender_field_text += `\n${defender_emote} **${defOochName}**'s **Bomber**:`
                        defender_field_text += `\n--- ${attacker_emote} **${atkOochName}** lost **${hp_prev - attacker.current_hp} HP**!\n`;
                    }
                break;
                case Ability.Matryoshka:
                    if(slot_defender.used_ability_matryoshka == false){
                        defender_field_text += `\n${defender_emote} **${defOochName}**'s **Matryoshka**:`
                        defender.current_hp = _.ceil(defender.stats.hp / 2);
                        defender_field_text += `\n${defender_emote} **${defOochName}** fainted, but a small one popped out due to **Matryoshka**!\n`;
                        slot_defender.used_ability_matryoshka = true;
                    }
                break;
            }
        }

        string_to_send = `${string_to_send}${defender_field_text}` 
        return string_to_send;
    },  

    /**
     * Add or subtract a stat to an Oochamon object. NOTE: THIS DOES NOT SET THE MULTIPLIER UNLESS YOU USE THE SET ARGUMENT!
     * @param {Object} ooch The oochamon object to change stat mulitipliers on.
     * @param {String} stat The stat to change (atk, def, spd, acc, or eva)
     * @param {number} stage The stage amount to change it by (-8 to 8)
     * @param {Boolean} [set=false] Set the value instead of add to/subtract from the value.
     * @returns The Oochamon object with stats changed.
     */
    modify_stat: function(ooch, stat, stage, set = false) {
        let min_stage = -8;
        let max_stage = 8;

        let val_name = `${stat}_mul`;
        let val_get = ooch.stats[val_name];
        let val_set = _.clamp((set ? stage : val_get + stage), min_stage, max_stage);
        
        ooch.stats[val_name] = val_set;

        let text = `${ooch.emote} **${ooch.nickname}**'s **${_.toUpper(stat)}**`;
        if(set){
            if(val_get == val_set){
                text += ` is already ${stage}.`;
            }
            else{
                text += ` was set to ${stage}.`;
            }
        }
        else{
            if      (val_get == -8 && stage < 0){ text += " won't go any lower!" }
            else if (val_get ==  8 && stage > 0){ text += " won't go any higher!" }
            else {
                text += ` ${stage < 0 ? "decreased" : "increased"} by **${Math.abs(stage)}**. (**${val_set < 0 ? '-' : '+'}${Math.abs(val_set)}**)`
            }
        }   

        return text;
    },

    generate_round_start_embed(battle_data) {
        let hp_string = ``;
        let user_name, active_ooch;
        for(let user of battle_data.users){
            user_name = user.is_catchable ? 'Wild' : `${user.name}'s`
            active_ooch = user.party[user.active_slot];
            hp_string += `\n\`${user_name} ${active_ooch.nickname} (Lv.${active_ooch.level})\` ${functions.type_to_emote(active_ooch.type)}`;
            hp_string += functions.generate_hp_bar(active_ooch, 'plr');
            hp_string += `\n`;
            hp_string += `\`Stance: ${db.stance_data.get(active_ooch.stance, 'name')}\``
            hp_string += `\n`;
        }

        let embed = functions.battle_embed_create(hp_string)
        return(embed);
    },

    /**
     * Generate a custom emote HP bar for use in Oochamon battles.
     * @param {Object} ooch The oochamon data.
     * @param {String} style The style of the HP bar (plr/enemy)
     * @returns The generated HP emote string for the Oochamon.
     */
    generate_hp_bar: function(ooch, style) {
        let hp_string = ``;
        let hp_sec = (ooch.current_hp / ooch.stats.hp);
        let sections = Math.ceil(hp_sec * 10);
        if(ooch.current_hp != ooch.stats.hp){ sections = Math.min(sections, 9); }
        let piece_type;
    
        hp_string += `\n${db.monster_data.get(ooch.id, 'emote')} `;
    
        if (style == 'plr') {
            piece_type = `<:p_f_hm:1274936333277855775>`
            if (sections <= 5) piece_type = `<:p_m_hm:1274936384779714680>`;
            if (sections <= 2) piece_type = `<:p_l_hm:1274936321890193501>`;
    
            hp_string += `<:p_hs:1274936342677028905>`;
            hp_string += `${piece_type.repeat(sections)}` // Filled slots
            hp_string += `${`<:p_g_hm:1274936302529155115>`.repeat(10 - sections)}` // Empty slots
            hp_string += `<:p_he:1274936313123967016>\n`;
        } else {
            piece_type = `<:e_f_hm:1274935813758521416>`;
            if (sections <= 5) piece_type = `<:e_m_hm:1274936005777948744>`;
            if (sections <= 2) piece_type = `<:e_l_hm:1274935997037154417>`;
    
            hp_string += `<:e_hs:1274935985289039915>`;
            hp_string += `${piece_type.repeat(sections)}` // Filled slots
            hp_string += `${`<:e_g_hm:1274935806301048974>`.repeat(10 - sections)}` // Empty slots
            hp_string += `<:e_he:1274935824173240372>\n`;
        }
    
        hp_string += `\`HP: ${ooch.current_hp}/${ooch.stats.hp}\` `;

        for (let status of ooch.status_effects) {
            hp_string += db.status_data.get(status, 'emote');
        }
    
        return hp_string;
    },

        /**
     * Generate a beginning of battle image based on data passed in
     * @param {Object} battle_data The thread this instance of Oochamon is being played in
     * @param {String} user_index The user ID of the user playing Oochamon
     * @param {Object} battle_bg The player object
     * @returns A png attachment to be sent into a chat.
     */
    generate_battle_image: async function(battle_data, user_index, battle_bg = 'battle_bg_hub') {

        // Define helper functions that are only used here
        function flipDrawImage(ctx, image, x = 0, y = 0, horizontal = false, vertical = false){
            ctx.save();  // save the current canvas state
            ctx.setTransform(
                horizontal ? -1 : 1, 0, // set the direction of x axis
                0, vertical ? -1 : 1,   // set the direction of y axis
                x + (horizontal ? image.width : 0), // set the x origin
                y + (vertical ? image.height : 0)   // set the y origin
            );
            ctx.drawImage(image,0,0);
            ctx.restore(); // restore the state as it was when this function was called
        }

        const fillTextScaled = (text, font, fontSize, cutoff, canvas, fontMod = '') => {
            const context = canvas.getContext('2d');
            do {
                // Assign the font to the context and decrement it so it can be measured again
                context.font = `${fontMod} ${fontSize -= 1}px ${font}`;
                // Compare pixel width of the text to the canvas minus the approximate avatar size
            } while (context.measureText(text).width > cutoff);
        
            // Return the result to use in the actual canvas
            return context.font;
        };

        function deg_to_rad(degrees){
            return degrees * (Math.PI / 180);
        };


        //Sort everyone into their teams
        let teams = {};
        for(let user of battle_data.users){
            let team_id_to_text = `${user.team_id}`
            if(!teams.hasOwnProperty(team_id_to_text)){
                teams[team_id_to_text] = []
            }
            teams[team_id_to_text].push(user);
        }

        let width = 480;
        let height = 270;
        let center_x = width/2;
        let center_y = height/2 + 16; //offsets height to account for sprites
        let radius_oochamon = .325;
        let radius_user = .425;
        let perspective_team_id  = battle_data.users[user_index].team_id;
        let rotation_increments = 360 / Object.keys(teams).length;
        let offset_rotation = 135 + (parseInt(perspective_team_id) * rotation_increments);

        //Get position data for each user
        let sprites = [];
        let platforms = [];
        let shadows = [];
        
        sprites.push({ //VS sign
            x : width / 2,
            y : height / 2,
            origin_x : width / 2,
            origin_y : height / 2,
            sprite : `./Art/BattleArt/battle_bg_VS.png`,
            x_scale : 1,
            y_scale : 1,
            ooch_info : false,
            user_info : false,
            user_index : false,
            horz_check : false,
            vert_check : false
        })


        for(let team_id of Object.keys(teams)){
            let team = teams[team_id];
            for(let [i, user] of Object.entries(team)){

                
                let rotation = deg_to_rad((parseInt(team_id) * rotation_increments) + offset_rotation);
                let avg_x = 0;
                let avg_y = 0;
                let avg_num = 0
                let team_step = 144 * i +  -40;

                let ooch_info = user.party[user.active_slot];
                let ooch_x = (Math.cos(rotation) * radius_oochamon * width) + center_x;
                let ooch_y = (Math.sin(rotation) * radius_oochamon * height) + center_y;
                let user_x = (Math.cos(rotation) * radius_user * width) + center_x;
                let user_y = (Math.sin(rotation) * radius_user * height) + center_y;
                
                team_step = team_step * (ooch_x < center_x ? 1 : -1);
                
                if(user.battle_sprite == false){ //Center's the ooch if it's by itself
                    ooch_x = (ooch_x + user_x) / 2;
                    ooch_y = (ooch_y + user_y) / 2;
                }
                
                let ooch_sprite = { //Oochamon Sprite
                    x : ooch_x + team_step,
                    y : ooch_y,
                    origin_x : 32,
                    origin_y : 64,
                    sprite : `./Art/ResizedArt/${_.lowerCase(ooch_info.name).replaceAll(" ", "_")}.png`,
                    x_scale : ooch_x < center_x ? -1 : 1,
                    y_scale : 1,
                    ooch_info : ooch_info,
                    user_info : false,
                    user_index : user.user_index,
                    horz_check : ooch_x < center_x,
                    vert_check : ooch_y < center_y
                };
                sprites.push(ooch_sprite);
                shadows.push({
                    x : ooch_x + team_step,
                    y : ooch_y,
                    origin_x : 32,
                    origin_y : 16
                })
                avg_x += ooch_x + team_step;
                avg_y += ooch_y;
                avg_num++;
                
                if(user.battle_sprite != false){ //User Sprite
                    let user_sprite = {
                        x : user_x + team_step,
                        y : user_y,
                        origin_x : 16,
                        origin_y : 32,
                        sprite : `./Art/NPCs/${user.battle_sprite}.png`,
                        x_scale : user_x < center_x ? -1 : 1,
                        y_scale : 1,
                        ooch_info : false,
                        user_info : user,
                        user_index : user.user_index,
                        horz_check : ooch_x < center_x,
                        vert_check : ooch_y < center_y
                    }
                    sprites.push(user_sprite);
                    shadows.push({
                        x : user_x + team_step,
                        y : user_y,
                        origin_x : 32,
                        origin_y : 16
                    })

                    avg_x += user_x + team_step;
                    avg_y += user_y;
                    avg_num++;
                }
                
                
                platforms.push({
                    x : avg_x / avg_num,
                    y : avg_y / avg_num,
                    origin_x : 64,
                    origin_y : 32
                })
            }
        }

        

        //Sort sprites by y-value for the illusion of depth on crowded scenes
        sprites.sort((a, b) => {
            a.y - b.y
        })

        let canvas = new Canvas(width, height);
        FontLibrary.use("main_med", ["./fonts/LEMONMILK-Medium.otf"]);
        let ctx = canvas.getContext("2d");
        
        // Draw the background
        // This uses the canvas dimensions to stretch the image onto the entire canvas
        const background = await loadImage(`./Art/BattleArt/${battle_bg}.png`);
        ctx.drawImage(background, 0, 0, width, height);

        //Draw platforms per team
        let platform_image = await loadImage(`./Art/BattleArt/test_platform_128x64.png`);
        for(let platform of platforms){
            ctx.drawImage(platform_image, platform.x - platform.origin_x, platform.y - platform.origin_y);
        }

        //Draw shadows for all sprites
        let shadow_image = await loadImage(`./Art/BattleArt/shadow_64x32.png`);
        for(let shadow of shadows){
            ctx.drawImage(shadow_image, shadow.x - shadow.origin_x, shadow.y - shadow.origin_y);
        }

        //Add drop shadows
        ctx.shadowColor = 'black';
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
        ctx.shadowBlur = 3;

        //Draw the sprites to the image
        for(let sprite of sprites){
            let horz_check = sprite.horz_check;
            let vert_check = sprite.vert_check;
            let image = await loadImage(sprite.sprite);

            if(horz_check){ 
                flipDrawImage(ctx, image, sprite.x - sprite.origin_x, sprite.y - sprite.origin_y, true); 
            }
            else{
                ctx.drawImage(image, sprite.x - sprite.origin_x, sprite.y - sprite.origin_y);
            }
        }

        //Draw UI Elements
        for(let sprite of sprites){
            let horz_check = sprite.horz_check;
            let vert_check = sprite.vert_check;
            let buffer = 8;
            let image = await loadImage(sprite.sprite);

            let ooch_info = sprite.ooch_info;
            if(ooch_info != false){
                let draw_x = horz_check ? sprite.x - 16 : sprite.x + 16;
                let draw_y = sprite.y + buffer;
                
                ctx.fillStyle = 'white';
                ctx.font = `italic bold 10px main_med`;
                ctx.textAlign = horz_check ? 'left' : 'right';
                
                if(sprite.user_index == user_index){
                    ctx.fillText(`Lv. ${ooch_info.level} ${ooch_info.nickname}`, draw_x, draw_y);
                }
                else{ //Uses name instead of nickname to prevent users abusing nicknames
                    ctx.fillText(`Lv. ${ooch_info.level} ${ooch_info.name}`, draw_x, draw_y);
                }

                //This is used for adding types to the image, commented out for now
                // let type_x = horz_check ? draw_x : draw_x - 16;
                // let type_y = draw_y + 4;
                // let step = horz_check ? 18 : -18;
                // let counter_types = 0
                // for(let type of ooch_info.type){
                //     let type_image = await loadImage(`./Art/ArtFiles/icon_${type}.png`)
                //     ctx.drawImage(type_image, type_x + (counter_types * step), type_y, 16, 16);
                //     counter_types++;
                // }
            }

            let user_info = sprite.user_info;
            if(user_info != false){
                let draw_x = sprite.x + (horz_check ? buffer : -buffer);
                let draw_y = sprite.y + (vert_check ?  -image.height - (buffer * 2.5) : (buffer * 3));

                ctx.fillStyle = 'white';
                ctx.font = `italic bold 16px main_med`;
                ctx.textAlign = 'center';


                fillTextScaled(user_info.name, 'main_med', 16, 120, canvas, 'italic bold');
                ctx.fillText(`${user_info.name}`, draw_x, draw_y);

                //Draw prisms if this is a non-wild battle
                if(user_info.user_type != UserType.Wild){
                    let step = 12;
                    let prism_x = horz_check ? (sprite.x - (image.width * 1.5) - buffer) + 24 : (sprite.x + (image.width * .5) + buffer) - 8;
                    let prism_image = await loadImage('./Art/BattleArt/prism_tiny.png');
                    for(let i = (user_info.party.length) - 1; i >= 0; i--){ //iterate backwards to achieve the desired stacking effect
                        ctx.drawImage(prism_image, prism_x, sprite.y - sprite.origin_y + (i * step) - 12);
                    }
                }
            }
        }

        let pngData = canvas.toBufferSync('png');

        return pngData;
    },

    /**
     * Get the stat multiplier from the stat stage system.
     * @param {Number} stage The stat stage
     * @param {Number} [scalar=2] The scalar to work off of
     * @returns The stat multiplier for stat calculations.
     */
    get_stat_multiplier: function(stage, scalar = 2) {
        if (scalar < 1) scalar = 1;
        return (stage >= 0) ? (stage / scalar) + 1 : scalar / (Math.abs(stage) + scalar)
    },

    /**
     * Converts an Oochamon type array to a string.
     * @param {Array} type The Oochamon's types in an array
     * @param {Boolean} do_capitalize If the type should be capitalized
     * @returns The type array, now in the form of a string separated by "/"
     */
    type_to_string: function(type, do_capitalize = true) {
        if (!Array.isArray(type)) type = [type];
        if (do_capitalize) type = type.map(v => _.capitalize(v));
        type = type.join('/');
        return type;
    },

    /**
     * Handle finishing an Oochamon battle and setting back up the playspace.
     * @param {Object} battle_data The battle data for the current battle.
     * @param {String} user_index The user index whose battle to end.
     * @param {Boolean} play_end True if finish_battle came from /play.
     */
    finish_battle: async function(battle_data, user_index, play_end = false) {
        const { event_process } = require('./func_event.js');
        const { botClient } = require("./index.js");
        const { setup_playspace_str } = require('./func_play.js'); 

        let user_info = battle_data.users[user_index];

        let battle_won = !user_info.defeated; // We won if we were not defeated
        let user_id = user_info.user_id;
        let thread = botClient.channels.cache.get(user_info.thread_id);
        let is_online = battle_data.is_online;

        //Clear all messages in the user's thread
        if (battle_data.battle_msg_counter <= 100) {
            await thread.bulkDelete(battle_data.battle_msg_counter).catch(() => {});
        } else {
            let message_count = battle_data.battle_msg_counter;
            do {
                await thread.bulkDelete(100);
                message_count -= 100;
            }
            while(message_count > thread.memberCount);
        }

        if(!battle_data.fake_battle && !play_end) {
            //Reset relevant ooch info and stuff
            for (let ooch of user_info.party){
                ooch.stats.atk_mul = 0;
                ooch.stats.def_mul = 0;
                ooch.stats.spd_mul = 0;
                ooch.stats.acc_mul = 0;
                ooch.stats.eva_mul = 0;
                ooch.ability = ooch.og_ability;
                ooch.type = ooch.og_type;
                ooch.doom_timer = 4;
                ooch.stance = StanceForms.Base;
                ooch.stance_cooldown = 0;
                
                ooch.status_effects = [];
                if (battle_won === false) {
                    ooch.current_hp = ooch.stats.hp;
                    ooch.alive = true;
                }
            }

            //Set the party as needed
            db.profile.set(user_id, user_info.party, `ooch_party`);
            db.profile.set(user_id, user_info.prism_inv, `prism_inv`);
            db.profile.set(user_id, user_info.heal_inv, `heal_inv`);
            db.profile.set(user_id, user_info.other_inv, `other_inv`);
            db.profile.set(user_id, 0, 'ooch_active_slot');

            // If we lost, go back to the teleporter location.
            if (battle_won === false) {
                db.profile.set(user_id, db.profile.get(user_id, 'checkpoint_data'), 'location_data');
                db.profile.set(user_id, [], 'cur_event_array');
                db.profile.set(user_id, 0, 'cur_event_pos')
                db.profile.set(user_id, false, 'cur_battle_id');
            } 
        }

        // Setup playspace
        let playspace_str = await setup_playspace_str(user_id);
        await db.profile.set(user_id, PlayerState.Playspace, 'player_state');

        await thread.send({ content: playspace_str[0], components: playspace_str[1] }).then(msg => {
            db.profile.set(user_id, msg.id, 'display_msg_id');
        });

        // If no players left to wait for end of battle input, delete the battle data completely
        battle_data.users[user_index].is_player = false;
        if (!battle_data.users.some((user) => user.is_player)) {
            db.battle_data.delete(battle_data.battle_id);
        }
        
        if (battle_won === true && is_online == false && play_end == false) {
            // If we won the battle
            let cur_event_array = db.profile.get(user_id, 'cur_event_array');
            let cur_event_pos = parseInt(db.profile.get(user_id, 'cur_event_pos'));

            if (cur_event_array.length != 0) {
                // If we have an NPC event obj, continue the event processing with our held event data info after the battle is done.
                await event_process(user_id, thread, cur_event_array, cur_event_pos);
            }
        }

        if (play_end && is_online) {
            await thread.send({ content: 'A player has quit the battle, so it has been closed.', components: [closeButton] });
        }
    },

    /**
     * Calculates the amount of EXP needed for the next level up for an Oochamon.
     * @param {Number} level The level of the Oochamon
     * @returns The amount of EXP needed for the next level
     */
    exp_to_next_level: function(level) {
        if (level >= 50) return (level ** 3) + 1_000_000_000_000;
        return (level ** 3);
    },

    /**
     * Handle leveling up an Oochamon, including
     * giving it new moves.
     * @param {Object} ooch The oochamon that is leveling up
     * @returns A leveled up oochamon, and the output text, both in an array.
     */
    level_up: function(ooch) {
        let level_counter = 0;
        let starting_level = ooch.level;
        let evoData = false;
        let output = ``;
        let possibleMoves = db.monster_data.get(ooch.id, 'move_list');
    
        if (ooch.level <= 50) {
            while (ooch.current_exp >= functions.exp_to_next_level(ooch.level) && ooch.level < 50) {
                ooch.current_exp -= ooch.next_lvl_exp;
                ooch.level += 1;
    
                ooch.next_lvl_exp = functions.exp_to_next_level(ooch.level);
    
                let new_stats = functions.get_stats(ooch.id, ooch.level, ooch.stats.hp_iv, ooch.stats.atk_iv, ooch.stats.def_iv, ooch.stats.spd_iv);
                let hp_dif = new_stats[0] - ooch.stats.hp //Get the difference between new HP and old HP to be added to the mon
    
                ooch.stats.hp = new_stats[0]
                ooch.stats.atk = new_stats[1]
                ooch.stats.def = new_stats[2]
                ooch.stats.spd = new_stats[3]
                ooch.current_hp += hp_dif
    
                if(ooch.current_hp > 0){
                    ooch.alive = true;
                }
                
                level_counter += 1;
            }
    
            let curOochMoveset = ooch.moveset;
    
            // Determine new moves
            possibleMoves = possibleMoves.filter(v => {
                return _.inRange(v[0], starting_level + 1, ooch.level + 1)
            });
            possibleMoves = possibleMoves.map(v => {
                let moveData = db.move_data.get(v[1]);
                // If the Oochamon can learn the new move and has room, add it automatically.
                if (ooch.moveset.length < 4) ooch.moveset.push(moveData.id);
                return `- ${functions.type_to_emote(moveData.type)} **${moveData.name}**`;
            })
    
            // Determine if it can evolve
            if (ooch.level >= db.monster_data.get(ooch.id, `evo_lvl`) && db.monster_data.get(ooch.id, 'evo_id') != -1) {
                evoData = db.monster_data.get(db.monster_data.get(ooch.id, 'evo_id'));
            }
    
            output =  `\n⬆️ ${db.monster_data.get(ooch.id, 'emote')} **${ooch.nickname}** leveled up **${level_counter}** time${level_counter > 1 ? 's' : ''} and is now **level ${ooch.level}**!` +
            `${(evoData != false) ? `\n⬆️ **${ooch.nickname} is now able to evolve in the party menu!**\n` : ``}` +
            `${(possibleMoves.length != 0) ? `\n**${ooch.nickname}** learned ${possibleMoves.length > 1 ? `some new moves` : `a new move`}!\n${possibleMoves.join('\n')}${curOochMoveset.length <= 4 && ooch.moveset.length > 4 ? `\nYou can teach these moves to your Oochamon in the party menu!` : ``}` : `` }`;
        }
        return [ooch, output];
    },

    /**
     * Supply a status id, returns its emote if applicable
     */
    status_to_emote : function(status) {
        return(db.status_data.get(`${status}`, "emote"));
    },

    /**
     * Get a list of all available stances an Oochamon can use.
     * @param {Object} ooch The Oochamon to get stance data for
     * @returns All available stances.
     */
    get_stance_options : function(ooch) {
        // TODO: This currently allows all stances to be used except for the one
        // that the Oochamon is using. This should be changed to only allow a set
        // that we manually set.
        let stances = db.stance_data.keyArray();
        let available_stances = [];
        for (let stance of stances) {
            if (ooch.stance == stance) continue;
            available_stances.push(db.stance_data.get(stance));
        }

        return available_stances;
    }
}

module.exports = functions;