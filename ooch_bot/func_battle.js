

const db = require("./db.js")
const wait = require('wait');
const { ActionRowBuilder, ButtonBuilder, StringSelectMenuBuilder, ButtonStyle, ComponentType, EmbedBuilder } = require('discord.js');
const _ = require('lodash');
const { PlayerState, UserType, Stats, Ability, OochType, TypeEmote, MoveTag, MoveTarget, BattleState, BattleAction, BattleInput } = require("./types.js");
const { Status } = require('./types.js');
const { ooch_info_embed, check_chance } = require("./func_other.js");
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
     * @param {Number} type Type of Battle UserType(Wild, NPCTrainer, User, OnlineUser)
     * @param {Object} options Additional data, data required varies by type
     * @returns 
     */
    generate_battle_user: async function(type, options) {

        const { create_ooch } = require('./func_play.js');
        const { botClient } = require("./index.js");

        let party = [];
        let battle_sprite = false;
        let team_id = false;
        let oochabux = false;
        let active_slot = 0;
        let is_catchable = false;
        let name = 'Wild Oochamon';
        let is_player = false;
        let display_msg_id = false;
        let thread_id = false;
        let guild_id = false;
        let user_id = false;
        let heal_inv = [], prism_inv = [], other_inv = [];
        
        switch (type) {
            case UserType.Wild:
                let ooch = create_ooch(options.ooch_id, options.ooch_level);
                party = [ooch];
                is_catchable = true;
                team_id = options.team_id;
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
                team_id = options.team_id;
                battle_sprite = options.sprite_combat == false ? options.sprite_id.slice(0, 1) + options.sprite_id.slice(3) : options.sprite_combat;
            break;
            case UserType.Player:
                is_player = true;
                user_id = options.user_id;
                team_id = options.team_id;
                thread_id = options.thread_id;
                guild_id = options.guild_id;

                let profile = db.profile.get(user_id);
                
                let guild = botClient.guilds.cache.get(guild_id);
                let member = await guild.members.fetch(user_id);
                name = member.displayName;
                
                battle_sprite = profile.player_sprite;
                party = profile.ooch_party;
                active_slot = profile.ooch_active_slot;
                display_msg_id = profile.display_msg_id;
                heal_inv = profile.heal_inv;
                prism_inv = profile.prism_inv;
                other_inv = profile.other_inv;
            break;
        }

        return {
            name: name,
            name_possessive: name == 'Wild Oochamon' ? 'Wild' : name + '\'s',
            battle_sprite: battle_sprite,
            user_id: user_id,
            heal_inv: heal_inv,
            prism_inv: prism_inv,
            other_inv: other_inv,
            team_id: team_id,
            user_type: type,
            thread_id: thread_id,
            guild_id: guild_id,
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
    setup_battle: async function(users, weather, oochabux, turn_timer, allow_items, give_rewards, allow_run, fake_battle = false) {
        const { botClient } = require("./index.js");

        // Add index to users
        for (let i = 0; i < users.length; i++) {
            users[i].user_index = i;
        }

        // Setup the battle data
        let battleId = functions.generate_battle_id();

        let battleDataObj = {
            battle_id : battleId,
            battle_msg_counter : 2,
            turn_msg_counter : 0,
            battle_state : BattleState.Start,
            battle_action_queue : [],
            battle_speed : 1000,
            
            end_of_turn_switch_queue : [],

            turn_counter : 0,
            users : users,

            fake_battle : fake_battle,

            turn_timer : turn_timer,
            allow_items : allow_items,
            give_rewards : give_rewards,
            allow_run : allow_run,
            weather : weather,
            oochabux: oochabux,
            amount_of_teams: 2 // TODO: MAKE THIS DYNAMIC, I don't wanna deal with this rn lol -Jeff
        }

        // Handle all the text
        let battleStartText, sendOutText, active_ooch, types_string;
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
                            if (db.profile.get(user.user_id, `oochadex[${active_ooch}].caught`) == 0) {
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

                // Delete playspace to enter battle
                let playspace_msg = await thread.messages.fetch(db.profile.get(user.user_id, 'display_msg_id'));
                await playspace_msg.delete().catch(() => {});

                // Generate intro to battle image
                let battle_image = await functions.generate_battle_image(battleDataObj, user.user_index);
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
        if(switch_in_text != ''){
            await functions.distribute_messages(battleDataObj, { embeds : [functions.battle_embed_create(switch_in_text)]});
        }

        //Send the round start message
        functions.distribute_messages(battleDataObj, { embeds : [functions.generate_round_start_embed(battleDataObj)]});


        db.battle_data.set(battleId, battleDataObj);
        await functions.prompt_battle_actions(battleId);
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
     * @param {Number} slot_to The slot to switch to
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
                move_id = move_intentions[_.random(10) < 6 ? 0 : _.random(move_intentions.length - 1)];
                
                functions.new_battle_action_attack(battle_data, user_obj.user_index, target_user.user_index, move_id);
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
                    functions.new_battle_action_switch(battle_data, user_obj.user_index, party_alive_slots[_.random(party_alive_slots.length - 1)]);
                }
                else if(good_moves.length > 0 || okay_moves.length > 0){
                    move_id = _.random(10) < 7 ? good_moves[0] : okay_moves[0];
                    functions.new_battle_action_attack(battle_data, user_obj.user_index, target_user.user_index, move_id);
                }
                else{
                    move_id = move_intentions[_.random(move_intentions.length - 1)];
                    functions.new_battle_action_attack(battle_data, user_obj.user_index, target_user.user_index, move_id);
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
        moves_sorted = moves_sorted.map(mv => mv.move_id);

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
            let ooch_obj = user.party[user.active_slot];

            //Priority based on action type
            let base_priority = action.action_type;

            //Priority based on Oochamon Speed stat
            let speed = ooch_obj.stats.spd * (ooch_obj.stats.spd_mul + 1);
            if (ooch_obj.status_effects.includes(Status.Snare)) speed /= 100;
            if (ooch_obj.ability == Ability.Immobile) speed /= 100

            //Priority based on whether the move has the "priority" effect
            let move_priority = 0;
            if(action.action_type == BattleAction.Attack){
                let move = db.move_data.get(action.move_id);
                let effects = move.effect;
                for(let effect of effects) {
                    if (typeof effect == String) {
                        let status_split = effect.status.split('_');
                        if(status_split[0] == 'priority'){
                            move_priority += parseInt(status_split[1]) * 10_000;
                        }
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
     * @param {Object} battle_data The battle data
     * @param {Object} message anything that can be sent as a discord message
     */
    distribute_messages : async function(battle_data, message){
        const { botClient } = require("./index.js");

        battle_data.battle_msg_counter += 1;
        
        for(let user of battle_data.users) {
            if(user.is_player){
                let thread = botClient.channels.cache.get(user.thread_id);
                await thread.send(message);
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
                
        let moveButtons = new ActionRowBuilder();
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
        //#endregion

        // Handle users
        await battle_data.users.forEach(async (user) => {
            if (user.user_type != UserType.Player) {
                functions.get_ai_action(user, battle_data);
                user.action_selected = true;

                if(user.is_catchable){
                    bagButtons.components[1].setDisabled(false);
                }

                // Continue on if everyone has selected (which should happen at the end)
                if (battle_data.users.every(u => u.action_selected !== false)) {
                    db.battle_data.set(battle_id, battle_data);
                    await functions.process_battle_actions(battle_id);
                }
            } else {
                let userThread = botClient.channels.cache.get(user.thread_id);
                await userThread.send({ content: `**-- Select An Action --**`, components: [inputRow, inputRow2, inputRow3] });

                const inputCollector = userThread.createMessageComponentCollector();
                
                await inputCollector.on('collect', async i => {
                    let customId = i.customId;
                    let activeOoch = user.party[user.active_slot];

                    if (customId == BattleInput.Back) {
                        await i.update({ content: `**-- Select An Action --**`, embeds: [], components: [inputRow, inputRow2, inputRow3] });
                        
                    } else if (customId == BattleInput.Attack) {
                        let move_id, move_name, move_type, move_damage, move_effective_emote = '',
                            buttonStyle = ButtonStyle.Primary;

                        moveButtons = new ActionRowBuilder()

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
                                    .setEmoji(`${functions.type_to_emote(move_type)}`)
                            )
                        }
        
                        // Switch message to be about using the move input
                        await i.update({ content: `Select a move to use!`, components: [moveButtons, backButton]});
                    } else if (customId.includes('atk_')) {
                        if (battle_data.users.length == 2) {
                            let enemy_user = battle_data.users.filter(u => u.team_id != user.team_id)[0];
                            let move_id = customId.replace('atk_', '');
                            user.action_selected = true;
                            functions.new_battle_action_attack(battle_data, user.user_index, enemy_user.user_index, move_id);
                        } else {
                            // TODO: Handle more than 1 user, this needs a new submenu
                        }

                        // Continue on if everyone has selected (which should happen at the end)
                        if (battle_data.users.every(u => u.action_selected !== false)) {
                            db.battle_data.set(battle_id, battle_data);
                            inputCollector.stop();
                            i.update({ content: `` });
                            i.deleteReply();
                            functions.process_battle_actions(battle_id);
                        } else {
                            i.update({ content: 'Waiting for other players...', components: [], embeds: [] });
                        }

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
                            db.battle_data.set(battle_id, battle_data);
                            inputCollector.stop();
                            i.update({ content: `` });
                            i.deleteReply();
                            functions.process_battle_actions(battle_id);
                        } else {
                            i.update({ content: 'Waiting for other players...', components: [], embeds: [] });
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

                        bag_select.addComponents(
                            new StringSelectMenuBuilder()
                                .setCustomId('heal_item_select')
                                .setPlaceholder('Select an item in your heal inventory to use!')
                                .addOptions(heal_select_options),
                        );

                        await i.update({ content: `Select the healing item you'd like to use!`, components: [bag_select, bagButtons, backButton] })

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
                                .setPlaceholder('Select an item in your pventory to use!')
                                .addOptions(prism_select_options),
                        );

                        await i.update({ content: `Select the prism you'd like to use!`, components: [bag_select, bagButtons, backButton] });
                    } else if (customId.includes('_item_select')) {

                        let user_to_catch;
                        for(let catch_target of battle_data.users){
                            if(catch_target.is_catchable){
                                user_to_catch = catch_target.user_index;
                            }
                        }

                        if (customId == 'prism_item_select') {
                            user.action_selected = functions.new_battle_action_prism(battle_data, user.user_index, i.values[0], user_to_catch);
                        } else {
                            user.action_selected = functions.new_battle_action_heal(battle_data, user.user_index, i.values[0], user.active_slot);
                        }

                        // Continue on if everyone has selected (which should happen at the end)
                        if (battle_data.users.every(u => u.action_selected !== false)) {
                            db.battle_data.set(battle_id, battle_data);
                            inputCollector.stop();
                            i.update({ content: `` });
                            i.deleteReply();
                            functions.process_battle_actions(battle_id);
                        } else {
                            i.update({ content: 'Waiting for other players...', components: [], embeds: [] });
                        }
                        

                    } else if (customId == BattleInput.Run) {
                        user.action_selected = functions.new_battle_action_run(battle_data, user.user_index);

                        // Continue on if everyone has selected (which should happen at the end)
                        if (battle_data.users.every(u => u.action_selected !== false)) {
                            db.battle_data.set(battle_id, battle_data);
                            inputCollector.stop();
                            i.update({ content: `` });
                            i.deleteReply();
                            functions.process_battle_actions(battle_id);
                        } else {
                            i.update({ content: 'Waiting for other players...', components: [], embeds: [] });
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
        let battle_data = db.battle_data.get(battle_id);
        let actions = battle_data.battle_action_queue;
        let finish_battle = false;
        let action, header, text, faint_check;

        await functions.distribute_messages(battle_data, { content: `# ------ Round ${battle_data.turn_counter + 1} ------` });

        while(actions.length > 0 && !finish_battle){
            //Sort the actions before we do anything, this needs to be re-sorted to account for speed/status changes
            functions.sort_action_priority(battle_data);

            action = actions.shift();

            let user = battle_data.users[action.user_index]
            text = ``;

            //Perform the action for the turn
            let turn_data = await functions.action_process(battle_data, action);
            text += turn_data.return_string;
            finish_battle = turn_data.finish_battle;
            
            //Check if anything fainted
            faint_check = await functions.battle_faint_check(battle_data) //.text, .finish_battle
            text += faint_check.text;
            finish_battle = finish_battle || faint_check.finish_battle;

            //Send the text to each of the user's threads
            await functions.distribute_messages(battle_data, { content: `## ------ ${user.name}'s Turn ------`, embeds: [functions.battle_embed_create(text, turn_data.embed_color, turn_data.embed_header)]});

            //Clear any remaining actions if we're meant to finish the battle
            //Also send any final messages for the action

            if(finish_battle == true){
                if(('finish_data' in turn_data) && turn_data.finish_data != false){
                    let finish_data = turn_data.finish_data;
                    switch(finish_data.type){
                        case 'capture':
                            let delay = turn_data.finish_data.delay;
                            let embed = turn_data.finish_data.info_embed;
                            let png = turn_data.finish_data.ooch_png

                            await functions.distribute_messages(battle_data, { content: `## ------ ${user.name}'s Turn ------`, embeds: [embed], files: [png] });
                            await wait(delay);
                        break;
                    }
                }

                battle_data.actions = [];
            }

            await wait(battle_data.battle_speed);
        }

        //End of round stuff
        let end_of_round_header = `## ------ End of Round ------`;
        let end_of_round_text = ``;

        //Apply end of round abilities/effects (burn, stat changes, etc.)
        let ooch, eot_result;
        for(let user of battle_data.users){
            
            ooch = user.party[user.active_slot];
            if(!ooch.alive){ continue; } //Skip this one if it's dead

            //Handle end of turn abilities (use_eot_ability returns the ooch, as well as a string with what the ability did)
            eot_result = functions.use_eot_ability(battle_data, user.user_index); 
            ooch = eot_result.ooch;
            end_of_round_text += eot_result.text;

            //Check if anything fainted from abilities
            faint_check = await functions.battle_faint_check(battle_data) //.text, .finish_battle
            end_of_round_text += faint_check.text;
            finish_battle = finish_battle || faint_check.finish_battle;

            // Handle status effects
            let status_checks = []
            if (ooch.status_effects.includes(Status.Burn)) {status_checks.push(Status.Burn)};
            if (ooch.status_effects.includes(Status.Infect)) {status_checks.push(Status.Infect)};
            if(ooch.status_effects.includes(Status.Doom)) {status_checks.push(Status.Doom)};
            if(ooch.status_effects.includes(Status.Digitize)) {status_checks.push(Status.Digitize)};

            for(let effect of status_checks){
                if(finish_battle){ break; }

                switch(effect){
                    case Status.Burn:
                        let burn_val = Math.round(ooch.stats.hp/10);
                        ooch.current_hp -= burn_val;
                        ooch.current_hp = _.clamp(ooch.current_hp, 0, ooch.stats.hp);
                        end_of_round_text += `\n<:status_burned:1274938453569830997> ${ooch.emote} **${ooch.nickname}** was hurt by its burn and lost **${burn_val} HP**.`;
                    break;
                    case Status.Infect:
                        let infect_val = Math.round(ooch.stats.hp/20)
                        ooch.current_hp -= infect_val;
                        ooch.current_hp = _.clamp(ooch.current_hp, 0, ooch.stats.hp);
                        if (opposing_ooch != undefined) {
                            opposing_ooch.current_hp = Math.min(opposing_ooch.current_hp + infect_val, opposing_ooch.stats.hp);
                            end_of_round_text += `\n<:status_infected:1274938506225123358> ${ooch.emote} **${ooch.nickname}** had **${infect_val} HP** absorbed by ${opposing_ooch.emote} **${opposing_ooch.nickname}** from being **INFECTED!**`;
                        }
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
                }

                //Check if anything fainted from status effects
                faint_check = await functions.battle_faint_check(battle_data) //.text, .finish_battle
                end_of_round_text += faint_check.text;
                finish_battle = finish_battle || faint_check.finish_battle;
            }
        }

        if(end_of_round_text != ''){
            await wait(battle_data.battle_speed);
            await functions.distribute_messages(battle_data.users, { content: end_of_round_header, embeds: [functions.battle_embed_create(end_of_round_text)]});
        }

        //End of round switch-ins
        let faint_switch_header = '## ------ Switching In ------';
        let faint_switch_text = '';
        functions.end_of_round_prompt_switch(battle_data);

        //Send out any new mons or any other actions that have been moved to the end of turn queue
        while(actions.length > 0 && finish_battle == false){
            functions.sort_action_priority(battle_data);
            action = actions.shift();
            turn_data = await functions.action_process(battle_data, action);

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
        db.battle_data.set(battle_id, battle_data);

        //Do stuff depending on whether the battle is finished
        if(!finish_battle){
            
            await wait(battle_data.battle_speed);
            functions.distribute_messages(battle_data, { embeds : [functions.generate_round_start_embed(battle_data)]});
            
            await wait(battle_data.battle_speed);
            functions.prompt_battle_actions(battle_data.battle_id);
        }
        else{
            await functions.finish_battle(battle_data);
            console.log(`BATTLE ID${battle_data.battle_id} FINISHED`)
        }

    },

    /**
     * Creates a simple embed for the battle
     * @param {String} text the text to display in the body of the embed
     * @param {Color} color the color along the edge of the embed
     * @param {String} header the text to display at the top of the embed
     * @returns a simple embed
     */
    battle_embed_create : function(text, color = '#808080', header = false) {
        let embed = new EmbedBuilder()
            .setColor(color)
            .setDescription(text);
        if (header != false) embed.setTitle(header)
            
        return embed;
    },

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
            case BattleAction.Other:
                //TODO
            break;
        }
        return turn_data;
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
            embed_header : '⚔️ Attack ⚔️',
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

        return_string += functions.use_switch_ability(battle_data, action.user_index, user.active_slot, action.slot_target, action.is_switching);

        return {
            finish_battle : finish_battle,
            return_string : return_string,
            embed_header : '↩️ Switch ↩️',
            embed_color : '#0095ff',
        }
    },

    /**
     * Have the oochs ability affect its stats, then return the ooch with its stats adjusted accordingly.
     * Read the generate.js to see what each ability does.
     * @param {Object} ooch The oochamon object to have affected by it's ability
     * @param {Array} ooch_inv The oochamon party array for the user
     * @returns The Oochamon object with changed stats.
     */
    ability_stat_change: function(ooch, ooch_inv) {

        let output_msg = ``;
        let incAmount = 0;
        // Check for digitized status effect
        if (ooch.status_effects.includes(Status.Digitize)) {
            ooch.type = [OochType.Tech];
        }

        switch (ooch.ability) {
            case Ability.Miniscule: 
                ooch = functions.modify_stat(ooch, Stats.Evasion, 1);
                output_msg = `${ooch.emote} **${ooch.nickname}** increased evasion from its ability **Miniscule**!`;
            break;
            case Ability.Burdened: 
                ooch = functions.modify_stat(ooch, Stats.Speed, -1);
                ooch = functions.modify_stat(ooch, Stats.Defense, 1); 
                output_msg = `${ooch.emote} **${ooch.nickname}** decreased its SPD and increased its DEF from its ability **Burdened**!`;
            break;
            case Ability.Tough:
                ooch = functions.modify_stat(ooch, Stats.Defense, 1); 
                output_msg = `${ooch.emote} **${ooch.nickname}** increased its DEF from its ability **Tough**!`;
            break;
            case Ability.Immobile:
                ooch = functions.modify_stat(ooch, Stats.Defense, 1); 
                output_msg = `${ooch.emote} **${ooch.nickname}** increased its DEF from its ability **Immobile**!`;
            break;
            case Ability.Gentle:
                ooch = functions.modify_stat(ooch, Stats.Attack, -1); 
                output_msg = `All Oochamon on the field had their ATK decreased from the ability **Gentle**!`;
            break;
            case Ability.Conflicted:
                ooch = functions.modify_stat(ooch, Stats.Attack, 1);
                ooch = functions.modify_stat(ooch, Stats.Defense, 1);
                ooch = functions.modify_stat(ooch, Stats.Speed, 1);
                ooch = functions.modify_stat(ooch, Stats.Accuracy, 1);
                ooch = functions.modify_stat(ooch, Stats.Evasion, 1); 
                output_msg = `${ooch.emote} **${ooch.nickname}** increased all of its stats from its ability **Conflicted**!`;
            break;
            case Ability.Dense:
                ooch = functions.modify_stat(ooch, Stats.Attack, 1);
                ooch = functions.modify_stat(ooch, Stats.Speed, -1); 
                output_msg = `${ooch.emote} **${ooch.nickname}** decreased its SPD and increased its ATK from its ability **Dense**!`;
            break;
            case Ability.Fleeting:
                ooch = functions.modify_stat(ooch, Stats.Speed, 2);
                ooch = functions.modify_stat(ooch, Stats.Attack, 2); 
                output_msg = `${ooch.emote} **${ooch.nickname}** sharply increased its SPD and ATK from its ability **Fleeting**!`;
            break;
            case Ability.Uncontrolled:
                ooch = functions.modify_stat(ooch, Stats.Attack, 3); 
                ooch = functions.modify_stat(ooch, Stats.Defense, -1);
                output_msg = `${ooch.emote} **${ooch.nickname}** dramatically increased its ATK and reduced its DEF from its ability **Uncontrolled**!`;
            break;
            case Ability.Immense:
                ooch = functions.modify_stat(ooch, Stats.Defense, 2); 
                output_msg = `${ooch.emote} **${ooch.nickname}** sharply increased its DEF from its ability **Immense**!`;
            break;
            case Ability.Swaying:
                ooch = functions.modify_stat(ooch, Stats.Defense, 1);
                ooch = functions.modify_stat(ooch, Stats.Accuracy, -1);
                output_msg = `${ooch.emote} **${ooch.nickname}** increased its DEF and decreased its accuracy from its ability **Swaying**!`;
            break;
            case Ability.Thrashing:
                ooch = functions.modify_stat(ooch, Stats.Attack, 1);
                ooch = functions.modify_stat(ooch, Stats.Evasion, -1);
                output_msg = `${ooch.emote} **${ooch.nickname}** increased its ATK and decreased its evasion from its ability **Thrashing**!`;
            break;
            case Ability.Union:
                ooch = functions.modify_stat(ooch, Stats.Attack, 1);
                ooch = functions.modify_stat(ooch, Stats.Defense, 1);
                output_msg = `${ooch.emote} **${ooch.nickname}** increased its ATK and DEF from its ability **Union**!`;
            break;
            case Ability.Broodmother:
                incAmount = 0;
                for (let ooch_i of ooch_inv) {
                    if (ooch_i.type[0] === ooch.type[0] && ooch_i.id != ooch.id) {
                        ooch = functions.modify_stat(ooch, Stats.Attack, 1);
                        incAmount += 1;
                    }
                } 
                output_msg = `${ooch.emote} **${ooch.nickname}** increased its ATK by **${incAmount} stages** from its ability **Broodmother**!`;
            break;
            case Ability.Apprentice:
                incAmount = 0;
                for (let ooch_i of ooch_inv) {
                    if (ooch_i.moveset.some(item => ooch.moveset.includes(item)) && ooch_i.id != ooch.id) {
                        ooch = functions.modify_stat(ooch, Stats.Attack, 2);
                        output_msg = `${ooch.emote} **${ooch.nickname}** sharply increased its ATK from its ability **Apprentice**!`;
                        break;
                    }
                }
            break;
        }

        return [ooch, output_msg];
    }, 

    use_switch_ability(battle_data, user_index, slot_from, slot_to, is_switching){
        let user = battle_data.users[user_index]
        let ooch_to = user.party[slot_to];
        let ooch_from = user.party[slot_from];
        let string_to_send = '';

        //Check abilities vs other users
        for(let u of battle_data.users){
            if(u.team_id != user.team_id && u.party[u.active_slot].alive){
                let ooch_enemy = u.party[u.active_slot];

                //Enemy users' mons that affect the new mon
                switch (ooch_enemy.ability) {
                    case Ability.Alert: //Increases atk if a new enemy mon switches in
                        ooch_enemy = functions.modify_stat(ooch_enemy, Stats.Attack, 1);
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
                        ooch_enemy = functions.modify_stat(ooch_enemy, Stats.Attack, -1);
                        string_to_send += `\n${ooch_enemy.emote} **${ooch_enemy.nickname}** had its ATK lowered due to ${ooch_to.emote} **${ooch_to.nickname}**'s **Gentle**!`;
                    break;
                    case Ability.Withering: //Lowers enemy DEF 1 stage
                        ooch_enemy = functions.modify_stat(ooch_enemy, Stats.Defense, -1);
                        string_to_send += `\n${ooch_enemy.emote} **${ooch_enemy.nickname}** had its DEF lowered due to ${ooch_to.emote} **${ooch_to.nickname}**'s **Withering**!`;
                    break;
                }
            }
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
                    return_string += `\n${db.monster_data.get(ooch_plr.id, 'emote')} **${ooch_plr.nickname}** earned **${exp_earned_main} exp!**`
                                        //` (EXP: **${_.clamp(ooch_plr.current_exp + exp_earned_main, 0, ooch_plr.next_lvl_exp)}/${ooch_plr.next_lvl_exp})**`
                }
                if (ooch_party.length > 1) {
                    return_string += `\nThe rest of your team earned **${exp_earned}** exp.`;
                }
                if(is_first_catch) return_string += `\n✨ *Gained 2x Experience from catching a New Oochamon!*`;

                for (let i = 0; i < ooch_party.length; i++) {
                    let ooch = ooch_party[i];
                    if (i == user.active_slot) { 
                        ooch.current_exp += Math.round(exp_earned_main);
                    } else { 
                        ooch.current_exp += (ooch.alive === false ? exp_earned : Math.round(exp_earned / 2)); 
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
            embed_header : `<:item_prism:1274937161262698536> Prism Throw <:item_prism:1274937161262698536>`,
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
            embed_header : `❤️ Healing ❤️`,
            embed_color : '#02ff2c',
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
            return_string += `You successfully ran away!\nYour playspace will appear momentarily.`;
            finish_battle = true;
        }
        else{
            return_string += 'Failed to run away!'
        }

        return {
            finish_battle : finish_battle,
            return_string : return_string,
            embed_header : '🏃‍♂️ Run 🏃‍♂️',
            embed_color : '#ff0000'
        }
    },

    /**
     * Checks if any oochamon have been fainted
     * @param {Object} battle_data The current battle_data
     */
    battle_faint_check: async function(battle_data) {
        let string_to_send = '';
        let active_teams = [];
        let finish_battle = false;
        
        // Get the players active oochamon, check if they are alive
        for(let user of battle_data.users){
            let exp_given = 0;
            let active_ooch = user.party[user.active_slot];
            let user_defeated = true;
            let user_next_slot = 999;
            let bonus_multiplier = user.type != UserType.Wild ? 2 : 1;
            
            if(active_ooch.current_hp > 0){
                if(!active_teams.includes(user.team_id)){
                    active_teams.push(user.team_id);
                }
            }
            else if(active_ooch.current_hp <= 0 && active_ooch.alive == true){
                string_to_send += `\n--- 🪦 ${user.name_possessive} ${active_ooch.emote} **${active_ooch.nickname}** fainted!`
                
                if(battle_data.give_rewards){
                    exp_given += Math.round(functions.battle_calc_exp(active_ooch, bonus_multiplier));
                }
                active_ooch.current_hp = 0;
                active_ooch.alive = false;
                
                for(let [i, party_ooch] of user.party.entries()){
                    if(party_ooch.hp > 0){
                        user_defeated = false;
                        user_next_slot = min(user_next_slot, i);
                    }
                }

                if(user_defeated){
                    string_to_send += `\n\n**${user.name}'s party was wiped out!**`
                    user.defeated = true;
                }
                else{
                    battle_data.end_of_turn_switch_queue.push(user.user_index);
                    if(!active_teams.includes(user.team_id)){
                        active_teams.push(user.team_id);
                    }
                }
            }
            

            //Distribute EXP to other users' mons & level them up if possible
            if(exp_given > 0){
                for(let other_user of battle_data.users){
                    if((other_user.user_type == UserType.Player) && (other_user.user_index != user.user_index)){

                        let ooch_party = other_user.party;
                        let other_ooch = ooch_party[other_user.active_slot];
                        let exp_main = Math.floor(exp_given *1.25);
                        let exp_others = Math.floor(exp_given *.5);

                        if (other_ooch.level < 50) { //TODO UPDATE THIS TO A GLOBAL "MAX_LEVEL" VALUE
                            string_to_send += `\n${db.monster_data.get(other_ooch.id, 'emote')} **${other_ooch.nickname}** earned **${exp_main} EXP!**` + 
                                                ` (EXP: **${_.clamp(other_ooch.current_exp + exp_main, 0, other_ooch.next_lvl_exp)}/${other_ooch.next_lvl_exp})**`
                        }
                        if (other_user.party.length > 1) {
                            string_to_send += `\nThe rest of the team earned **${exp_others}** exp.`;
                        }

                        for (let i = 0; i < ooch_party.length; i++) {
                            if (i == other_user.ooch_active_slot) { 
                                ooch_party[i].current_exp += exp_main;
                            } 
                            else { 
                                ooch_party[i].current_exp += exp_others; 
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
        let users = battle_data.users;
        let next_slot = 9999;
        for(let user of users){
            if(!user.party[user.active_slot].alive && !user.defeated){
                switch(user.user_type){
                    case UserType.Player:
                        //TODO: Prompt buttons here

                        //Submit their next slot for combat
                        functions.new_battle_action_switch(battle_data, user.user_index, next_slot, false);
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

        let hp =    Math.floor(((level * ((base_hp *  base_influence1) *  ((hp_iv *  iv_influence) + 1)))/100 + (base_hp *  base_influence2)) + level + 10);
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
        if (ooch.ability == Ability.Mundane || ooch.status_effects.includes(status)) {
            return ooch;
        }
        ooch.status_effects.push(status);
        return ooch;
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
                return(`\n${ooch.emote} **${ooch.nickname}** recovered ${ooch.current_hp - prev_hp} HP.`);
            } else if (in_battle == false) {
                ooch.alive = true;
                let prev_hp = ooch.current_hp;
                ooch.current_hp += item_data.potency;
                ooch.current_hp = _.clamp(ooch.current_hp, 0, ooch.stats.hp);
                return(`\n${ooch.emote} **${ooch.nickname}** recovered ${ooch.current_hp - prev_hp} HP.`);
            } 
            
        } else if (item_data.type == 'prism') {
            let status_bonus = 1;
            let prism_multiplier = item_data.potency;
            let prism_chance = prism_multiplier / (ooch.level) * (ooch.stats.hp / ooch.current_hp) * status_bonus * 2;
            let throw_chance = Math.random();
            let prism_wiggles = (throw_chance - prism_chance > 0.5 ? 0 : (throw_chance - prism_chance > 0.3 ? 1 : 2 ))

            console.log(throw_chance, prism_chance, throw_chance - prism_chance);
    
            if (throw_chance < prism_chance) {
                return [true, 2];
            } else {
                return [false, prism_wiggles];
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

    use_eot_ability : function(battle_data, user_index) {
        let ability_text = ``;
        let user = battle_data.users[user_index];
        let ooch = user.party[user.active_slot];

        switch(ooch.ability) {
            case Ability.Fleeting:
                ooch.current_hp = Math.floor(ooch.current_hp / 2);
                ability_text = `\n${ooch.emote} **${ooch.nickname}** had its HP halved due to its ability **Fleeting**!`;
            break;
            case Ability.Efficient:
                if (battle_data.turn_counter % 2 === 0) {
                    ooch = functions.modify_stat(ooch, Stats.Attack, 1);
                    ability_text = `\n${ooch.emote} **${ooch.nickname}** increased its ATK from its ability **Efficient**!`;
                }
            break;
            case Ability.Inertia:
                ooch = functions.modify_stat(ooch, Stats.Speed, 1); 
                ability_text = `\n${ooch.emote} **${ooch.nickname}** increased its SPD from its ability **Inertia**!`;
            break;
            case Ability.Patient:
                if (battle_data.turn_counter % 2 === 0) {
                    ooch = functions.modify_stat(ooch, Stats.Defense, 1);
                    ability_text = `\n${ooch.emote} **${ooch.nickname}** increased its DEF from its ability **Patient**!`;
                }
            break;
            case Ability.Increment:
                let randomStat = _.sample([Stats.Attack, Stats.Defense, Stats.Speed, Stats.Accuracy, Stats.Evasion]);
                ooch = functions.modify_stat(ooch, randomStat, 1);
                ability_text = `\n${ooch.emote} **${ooch.nickname}** randomly increased its ${_.upperCase(randomStat)} from its ability **Increment**!`;
            break;
            case Ability.Riposte:
                ooch.ability = Ability.Parry;
                ability_text = `\n${ooch.emote} **${ooch.nickname}** changed its stance, and shifted its ability to **Parry**!`;
            break;
            case Ability.HoleDweller:
                if (battle_data.turn_counter % 2 === 0) {
                    ooch = functions.add_status_effect(ooch, Status.Vanish);
                    ability_text = `${ooch.emote} **${ooch.nickname}** <:status_vanish:1274938531864776735> **VANISHED** into a hole with its ability **Hole Dweller**!`;
                }
            break;
        }
    
        if (!ooch.status_effects.includes(Status.Digitize)) {
            switch (ooch.ability) {
                case Ability.Spectral:
                    if (ooch.type == ooch.og_type) {
                        ooch.type = [OochType.Magic];
                        ability_text = `\n${ooch.emote} **${ooch.nickname}** changed its type to ${functions.type_to_emote(OochType.Magic)} **Magic** through its ability **Spectral**!`
                    } else {
                        ooch.type = ooch.og_type;
                        ability_text = `\n${ooch.emote} **${ooch.nickname}** changed its type back to ${functions.type_to_emote(ooch.type)} **${ooch.type.map(v => _.capitalize(v)).join(' | ')}**.`
                    }
                break;
                case Ability.Radioactive:
                    if (ooch.type == ooch.og_type) {
                        ooch.type = [OochType.Flame];
                        ability_text = `\n${ooch.emote} **${ooch.nickname}** changed its type to ${functions.type_to_emote(OochType.Flame)} **Flame** through its ability **Radioactive**!`
                    } else {
                        ooch.type = ooch.og_type;
                        ability_text = `\n${ooch.emote} **${ooch.nickname}** changed its type back to ${functions.type_to_emote(ooch.type)} **${ooch.type.map(v => _.capitalize(v)).join(' | ')}**.`
                    }
                break;
            }
        }
        
    
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

        let attacker_atk_stat = ooch_attacker.stats.atk * functions.get_stat_multiplier(ooch_attacker.stats.atk_mul)
        let defender_def_stat = ooch_defender.stats.def * functions.get_stat_multiplier(ooch_defender.stats.def_mul);

        if (ooch_attacker.ability == Ability.Bipolar) {
            attacker_atk_stat = ooch_attacker.stats.def * functions.get_stat_multiplier(ooch_attacker.stats.def);
        }

        let damage = Math.round(Math.ceil((4 * ooch_attacker.level / 5 + 2) // Level Adjustment
        * (move_damage + _.random(-5, 5)) // Damage with random damage variance
        * (ooch_attacker.ability == Ability.Gravity ? (turn_count / 100) + 1 : 1)
        * (ooch_attacker.ability == Ability.Hexiply ? ((Math.floor((ooch_attacker.current_hp / ooch_attacker.stats.hp) * 6) * 6) / 100) + 1 : 1)
        * (ooch_attacker.ability == Ability.Focused && ooch_attacker.status_effects.length == 0 ? 1.1 : 1)
        * (ooch_attacker.ability == Ability.Corrosive ? (_.clamp(defender_def_stat, 0, 300) / 10) + 1 : 1)
        * (ooch_attacker.ability == Ability.Hearty && ooch_attacker.current_hp > ooch_attacker.stats.hp / 2 ? 1.15 : 1)
        * (ooch_attacker.ability == Ability.Riposte ? 1.2 : 1)
        * (ooch_defender.ability == Ability.Parry ? 0.8 : 1)
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

        let move_effects =   db.move_data.get(atk_id, 'effect');
        let ogMoveId = atk_id;
        if (move_effects.some(effect => effect.status === 'random')) {
            let moveList = db.move_data.keyArray();
            // Remove some moves that shouldn't be obtained with random
            moveList = moveList.filter(v => !([40, 92].includes(parseInt(v))))

            atk_id = _.sample(db.move_data.keyArray());
            move_effects =   db.move_data.get(atk_id, 'effect');
        }
        let move_name =     db.move_data.get(atk_id, 'name');
        let move_type =     db.move_data.get(atk_id, 'type');
        let move_damage =   db.move_data.get(atk_id, 'damage');
        let move_accuracy = db.move_data.get(atk_id, 'accuracy');
        if (move_effects.some(effect => effect.status === 'random')) move_type = _.sample(defender.type);
        let move_type_emote =      functions.type_to_emote(move_type);
        let type_multiplier = move_damage == 0 ? [1, ''] : functions.type_effectiveness(move_type, defender.type); //Returns [multiplier, string] 
        let crit_multiplier = (Math.random() > (0.95 - (move_effects.find(effect => effect.status === "critical")?.chance / 100 || 0) - (attacker.ability === Ability.HeightAdvantage ? 0.1 : 0)) ? 2 : 1);
        if (attacker.status_effects.includes(Status.Focus)) {
            crit_multiplier = 2;
            attacker.status_effects = attacker.status_effects.filter(v => v != Status.Focus);
        }
        
        if (move_damage <= 0) { crit_multiplier = 1; } // Disable the crit text for non-damaging moves
        let status_blind = (attacker.status_effects.includes(Status.Blind) ? .65 : 1);
        let status_doubled = (defender.status_effects.includes(Status.Double) ? 2 : 1);
        let recoil_damage = Math.round((move_effects.find(effect => effect.status === "recoil")?.chance / 100 || 0) * attacker.stats.hp);
        let vampire_heal = (move_effects.find(effect => effect.status === "vampire")?.chance / 100 || 0)
        let move_heal = (move_effects.find(effect => effect.status === "heal")?.chance / 100 || 0)
        let reflect_dmg = 0;
        let attacker_emote = db.monster_data.get(attacker.id, 'emote');
        let defender_emote = db.monster_data.get(defender.id, 'emote');
        let defender_field_text = ``;
        let string_to_send = ``;
        let ability_dmg_multiplier = 1;
        let selfTarget = (move_damage == 0 && move_effects.some(effect => effect.target === MoveTarget.Self));

        let atkOochName = attacker.nickname;
        let defOochName = defender.nickname;

        

        move_accuracy = Math.abs(move_accuracy);
        if (attacker.ability == Ability.Rogue && defender.current_hp === defender.stats.hp) {
            ability_dmg_multiplier = 2;
        }

        let dmg = 0;
        if (move_damage != 0) {
            dmg = functions.battle_calc_damage(move_damage * type_multiplier[0] * status_doubled * ability_dmg_multiplier, 
                                    move_type, attacker, defender, battle_data.turn_counter) * crit_multiplier;
        }
        vampire_heal = Math.ceil(vampire_heal * dmg); //used later
        // Remove doubled status effect
        if (status_doubled != 1) {
            defender.status_effects = defender.status_effects.filter(v => v != Status.Double);
        }

        // If the defender has Vanish AND the attack is not self targeting, it should fail
        let chance_to_hit = move_accuracy/100 * functions.get_stat_multiplier(attacker.stats.acc_mul - defender.stats.eva_mul, 4)
        if ((((chance_to_hit * status_blind > Math.random()) || (defender.ability == 'Immense')) && !(defender.status_effects.includes(Status.Vanish) && selfTarget === false)) || (selfTarget == true)) {
            // Take damage and heal from move effects
            defender.current_hp -= dmg
            defender.current_hp = _.clamp(defender.current_hp, 0, defender.stats.hp);

            attacker.current_hp += Math.round(vampire_heal);
            attacker.current_hp += Math.round(attacker.stats.hp * move_heal);
            attacker.current_hp -= recoil_damage;
            attacker.current_hp = _.clamp(attacker.current_hp, 0, attacker.stats.hp)

            // When the Oochamon attacker hits the defender and we aren't targetting ourself
            if (selfTarget === false && dmg !== 0) {
                switch (attacker.ability) {
                    case Ability.Leech:
                        attacker.current_hp = _.clamp(attacker.current_hp + Math.ceil(dmg * 0.1), 0, attacker.stats.hp); 
                        defender_field_text += `\n--- ${attackcer_emote} **${atkOochName}** gained **${Math.ceil(dmg * 0.1)} HP** from its ability **Leech**!`
                    break;
                    case Ability.Ensnare:
                        if (check_chance(30) && !defender.status_effects.includes(Status.Vanish)) {
                            defender = functions.add_status_effect(defender, Status.Snare);
                            defender_field_text += `\n--- ${defender_emote} **${defOochName}** was <:status_snared:1274938520821305355> **SNARED** on hit from the ability **Ensnare** from ${attacker_emote} **${atkOochName}**!`;
                        }
                    break;
                    case Ability.Lacerating:
                        defender.current_hp = _.clamp(defender.current_hp + Math.round(dmg * 0.05), 0, defender.stats.hp);
                        defender_field_text += `\n--- ${defender_emote} **${defOochName}** lost 5% of their HP from the ability **Lacerating** from ${attacker_emote} **${atkOochName}**!`;
                    break;
                    case Ability.Frostbite:
                        functions.modify_stat(defender, Stats.Speed, -1);
                        defender_field_text += `\n--- ${defender_emote} **${defOochName}** had its SPD lowered from the ability **Frostbite** from ${attacker_emote} **${atkOochName}**!`;
                    break;
                    case Ability.StringsAttached:
                        if (check_chance(20)) {
                            let randomStatus = _.sample([Status.Burn, Status.Blind, Status.Infect, Status.Snare]);
                            defender = functions.add_status_effect(defender, randomStatus);
                            let statusName = db.status_data.get(randomStatus, 'name');
                            defender_field_text += `\n--- ${defender_emote} **${defOochName}** was **${_.upperCase(statusName)}** on hit from the ability **Strings Attached!** from ${attacker_emote} **${atkOochName}**!`;
                        }
                    break;
                    case Ability.Riposte:
                        attacker.ability = Ability.Parry;
                        defender_field_text += `\n--- ${attacker_emote} **${atkOochName}** changed its stance, and shifted its ability to **Parry**!`;
                    break;
                }
                
                // When the Oochamon defender gets hit by the attacker
                switch (defender.ability) {
                    case Ability.Reactive:
                        attacker.current_hp = _.clamp(attacker.current_hp - Math.round(attacker.stats.hp * 0.1), 0, attacker.stats.hp)
                        reflect_dmg = Math.round(attacker.stats.hp * 0.1);
                    break;
                    case Ability.Shadow:
                        if (check_chance(20) && !defender.status_effects.includes(Status.Vanish)) {
                            defender_field_text += `\n--- ${defender_emote} **${defOochName}** <:status_vanish:1274938531864776735> **VANISHED** after being hit using its ability **Shadow**!`;
                            defender = functions.add_status_effect(defender, Status.Vanish);
                        }
                    break;
                    case Ability.Tangled:
                        if (!attacker.status_effects.includes(Status.Snare)) {
                            attacker = functions.add_status_effect(attacker, Status.Snare);
                            defender_field_text += `\n--- ${attacker_emote} **${atkOochName}** was <:status_snared:1274938520821305355> **SNARED** by ${defender_emote} **${defOochName}**'s ability **Tangled**!`;
                        }
                    break;
                    case Ability.Flammable:
                        if (move_type === OochType.Flame) {
                            defender = functions.modify_stat(defender, Stats.Attack, 1);
                            defender_field_text += `\n--- ${defender_emote} **${defOochName}** raised its ATK after being hit using its ability **Flammable**!`; 
                        }
                    break;
                    case Ability.Parry:
                        defender.ability = Ability.Riposte;
                        defender_field_text += `\n--- ${defender_emote} **${defOochName}** changed its stance, and shifted its ability to **Riposte**!`;
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

            //If the target has the Doubled status effect
            if(status_doubled != 1 && move_damage > 0) {
                string_to_send += `\n--- **The damage was <:status_doubled:1274938495953014845> DOUBLED!**`
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
                string_to_send += `\n--- ❤️ ${attacker_emote} **${atkOochName}** healed **${Math.round(attacker.stats.hp * move_heal)}** HP!`;
            }

            //If attack has recoil
            if (recoil_damage > 0) {
                string_to_send += `\n--- 💥 ${attacker_emote} **${atkOochName}** lost **${recoil_damage}** HP from recoil!`
            }

            // If attack has reflect damage
            if (reflect_dmg > 0) {
                string_to_send += `\n--- 🪞 ${attacker_emote} **${atkOochName}** took **${reflect_dmg}** reflect damage from ${defender_emote} **${defOochName}**'s ability **Reactive**!`
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

                        if (db.status_data.keyArray().includes(`${eff.status}`)) {
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

                            defender_field_text += `\n--- ${status_target_emote} **${status_target.nickname}** was **${statusData.name.toUpperCase()}!**`
                            status_target.status_effects.push(status_adds);
                            status_target.status_effects = status_target.status_effects.flat(1);
                            status_target.status_effects = status_target.status_effects.filter((item, index) => status_target.status_effects.indexOf(item) === index);     
                        }
                        // +_def_1 is the format
                        else if (status_split[0] == '+'){
                            let prevStatValue = status_target.stats[`${status_split[1]}_mul`];
                            status_target = functions.modify_stat(status_target, status_split[1], parseInt(status_split[2]));
                            let currentValue = `${_.clamp(prevStatValue + parseInt(status_split[2]), -8, 8)}`;
                            let signValue = currentValue < 0 ? '-' : '+';
                            if (prevStatValue !== status_target.stats[`${status_split[1]}_mul`]) {
                                defender_field_text += `\n--- ${status_target_emote} **${status_target.nickname}** ${parseInt(status_split[2]) > 1 ? 'sharply ' : ''}raised its **${_.upperCase(status_split[1])}** to **${signValue}${Math.abs(currentValue)}**!`;
                            } else {
                                defender_field_text += `\n--- ${status_target_emote} **${status_target.nickname}** cannot have its **${_.upperCase(status_split[1])}** raised any further!`;
                            }
                        }
                        else if (status_split[0] == '-') {
                            let prevStatValue = status_target.stats[`${status_split[1]}_mul`];
                            status_target = functions.modify_stat(status_target, status_split[1], -parseInt(status_split[2]));
                            let currentValue = `${_.clamp(prevStatValue - parseInt(status_split[2]), -8, 8)}`;
                            let signValue = currentValue < 0 ? '-' : '+';
                            if (prevStatValue !== status_target.stats[`${status_split[1]}_mul`]) {
                                defender_field_text += `\n--- ${status_target_emote} **${status_target.nickname}** had its **${_.upperCase(status_split[1])}** ${-parseInt(status_split[2]) < -1 ? 'sharply ' : ''}lowered to **${signValue}${Math.abs(currentValue)}!**`
                            } else {
                                defender_field_text += `\n--- ${status_target_emote} **${status_target.nickname}** cannot have its **${_.upperCase(status_split[1])}** lowered any further!`;
                            }
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
        // If the attack misses
        } else {
            string_to_send += `\n${attacker_emote} **${atkOochName}** tried to use ${move_name} but it missed!`
            if (defender.status_effects.includes(Status.Vanish)) {
                defender.status_effects = defender.status_effects.filter(v => v !== Status.Vanish);
                string_to_send += `\n--- ${defender_emote} **${defOochName}** reappeared and lost its <:status_vanish:1274938531864776735> **VANISHED** status!`
            }
        }

        // Check if opposing Oochamon is dead
        if (defender.current_hp <= 0) {
            //defender_field_text += `\n--- 🪦 ${defender_emote} **${defOochName}** fainted!`
            //defender.alive = false;
            
            // Attacker oochamon on kill ability triggers
            switch (attacker.ability) {
                case Ability.Energized:
                    attacker = functions.modify_stat(attacker, Stats.Attack, 1);
                    attacker = functions.modify_stat(attacker, Stats.Speed, 1);
                    defender_field_text += `\n${attacker_emote} **${atkOochName}** was energized from the kill and gained a boost in attack and speed from its ability **Energized**!`;
                break;
                case Ability.InvalidEntry:
                    // 34 is the ID of i_
                    db.monster_data.set('34', 1, 'atk');
                    db.monster_data.set('34', 1, 'def');
                    db.monster_data.set('34', 1, 'spd');
                    db.monster_data.set('34', 1, 'hp');
                break;
                case Ability.Ravenous:
                    attacker.current_hp = _.clamp(attacker.current_hp + (attacker.stats.hp * 0.2), 0, attacker.stats.hp);
                    defender_field_text += `\n${attacker_emote} **${atkOochName}** healed 20% HP back from its ability **Ravenous**!`;
                break;
            }

            // Opposing oochamon death ability triggers
            switch (defender.ability) {
                case Ability.Haunted:
                    if (!attacker.status_effects.includes(Status.Doom)) {
                        attacker = functions.add_status_effect(attacker, Status.Doom);
                        defender_field_text += `\n${attacker_emote} **${atkOochName}** was <:status_doomed:1274938483924009062> **DOOMED** from ${defender_emote} **${defOochName}**'s ability **Haunted**!`;
                    }
                break;
                case Ability.Sporespray:
                    if (!attacker.status_effects.includes(Status.Infect)) {
                        attacker = functions.add_status_effect(attacker, Status.Infect);
                        defender_field_text += `\n${attacker_emote} **${atkOochName}** was <:status_infected:1274938506225123358> **INFECTED** from ${defender_emote} **${defOochName}**'s ability **Sporespray**!`;
                    }
                break;
                case Ability.InvalidEntry:
                    // 34 is the ID of i_
                    db.monster_data.inc('34', 'atk');
                    db.monster_data.inc('34', 'def');
                    db.monster_data.inc('34', 'spd');
                    db.monster_data.inc('34', 'hp');
                break;
                case Ability.EasyGo:
                    defender_field_text += `\n💖 Healed the rest of ${defender_emote} **${defOochName}**'s team by **20%** due to its ability **Easy Go**!`;
                break;
                case Ability.Bomber:
                    attacker.current_hp = _.ceil(attacker.current_hp / 2);
                    defender_field_text += `\n${attacker_emote} **${atkOochName}** had its current HP halved from ${defender_emote} **${defOochName}**'s ability **Bomber**!`;
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
        switch(stat) {
            case 'atk': 
                ooch.stats.atk_mul = (set == true ? stage : ooch.stats.atk_mul + stage); 
                ooch.stats.atk_mul = _.clamp(ooch.stats.atk_mul, min_stage, max_stage); 
            break; 
            case 'def': 
                ooch.stats.def_mul = (set == true ? stage : ooch.stats.def_mul + stage);
                ooch.stats.def_mul = _.clamp(ooch.stats.def_mul, min_stage, max_stage); 
            break;
            case 'spd': 
                ooch.stats.spd_mul = (set == true ? stage : ooch.stats.spd_mul + stage);
                ooch.stats.spd_mul = _.clamp(ooch.stats.spd_mul, min_stage, max_stage); 
            break; 
            case 'acc': 
                ooch.stats.acc_mul = (set == true ? stage : ooch.stats.acc_mul + stage); 
                ooch.stats.acc_mul = _.clamp(ooch.stats.acc_mul, min_stage, max_stage); 
            break; 
            case 'eva': 
                ooch.stats.eva_mul = (set == true ? stage : ooch.stats.eva_mul + stage);
                ooch.stats.eva_mul = _.clamp(ooch.stats.eva_mul, min_stage, max_stage); 
            break;
        }
    
        return ooch;
    },

    generate_round_start_embed(battle_data) {
        let hp_string = ``;
        let user_name, active_ooch;
        for(let user of battle_data.users){
            user_name = user.is_catchable ? 'Wild' : `${user.name}'s`
            active_ooch = user.party[user.active_slot];
            hp_string += `\n\`${user_name} ${active_ooch.nickname} (Lv.${active_ooch.level})\``;
            hp_string += functions.generate_hp_bar(active_ooch, 'plr');
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
     * @param {Object} thread The thread this instance of Oochamon is being played in
     * @param {String} user_id The user ID of the user playing Oochamon
     * @param {Object} plr The player object
     * @param {Object} enemy The enemy object
     * @param {Boolean} is_npc_battle If this is an NPC battle, or a wild battle.
     * @returns A png attachment to be sent into a chat.
     */
    generate_battle_image: async function(battle_data, user_index) {

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
                    sprite : `./Art/ResizedArt/${_.lowerCase(ooch_info.name)}.png`,
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
        const background = await loadImage(`./Art/BattleArt/battle_bg_hub.png`);
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
    get_stat_multiplier: function(stage, scalar=2) {
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
     */
    finish_battle: async function(battle_data) {
        const { event_process } = require('./func_event.js');
        const { botClient } = require("./index.js");
        const { setup_playspace_str } = require('./func_play.js'); 

        for(let user_info of battle_data.users){
            if(user_info.user_id == false){ continue; } //Skip users that are not players

            let battle_won = !user_info.defeated; //We won if we were not defeated
            let user_id = user_info.user_id;
            let thread = botClient.channels.cache.get(user_info.thread_id);
            
            await wait(1000);
            
            //Clear all messages in the user's thread
            if (battle_data.battle_msg_counter <= 100) {
                await thread.bulkDelete(battle_data.battle_msg_counter);
            } else {
                let message_count = battle_data.battle_msg_counter;
                do {
                    await thread.bulkDelete(100);
                    message_count -= 100;
                }
                while(message_count > thread.memberCount);
            }

            if(!battle_data.fake_battle){
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
                    ooch.status_effects = [];
                    if (battle_won === false) {
                        ooch.current_hp = ooch.stats.hp;
                        ooch.alive = true;
                    }
                }

                //Set the party as needed
                db.profile.set(user_id, user_info.party, `ooch_party`);

                // If we lost, go back to the teleporter location.
                if (battle_won === false) {
                    db.profile.set(user_id, db.profile.get(user_id, 'checkpoint_data'), 'location_data');
                    db.profile.set(user_id, [], 'cur_event_array');
                    db.profile.set(user_id, 0, 'cur_event_pos')
                } 
            }

            // Setup playspace
            let playspace_str = await setup_playspace_str(user_id);
            await db.profile.set(user_id, PlayerState.Playspace, 'player_state');
            await db.profile.delete(user_id, 'rollback_profile');

            await thread.send({ content: playspace_str[0], components: playspace_str[1] }).then(msg => {
                db.profile.set(user_id, msg.id, 'display_msg_id');
            });
            
            if (battle_won === true) {
                // If we won the battle
                let cur_event_array = db.profile.get(user_id, 'cur_event_array');
                let cur_event_pos = parseInt(db.profile.get(user_id, 'cur_event_pos'));

                if (cur_event_array.length != 0) {
                    // If we have an NPC event obj, continue the event processing with our held event data info after the battle is done.
                    await event_process(user_id, thread, cur_event_array, cur_event_pos);
                }
            }
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
    
}

module.exports = functions;