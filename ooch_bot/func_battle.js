const db = require("./db")
const wait = require('wait');
const { ActionRowBuilder, ButtonBuilder, StringSelectMenuBuilder, ButtonStyle, ComponentType, EmbedBuilder } = require('discord.js');
const _ = require('lodash');
const { PlayerState, TrainerType, Stats } = require("./types.js");
const { setup_playspace_str } = require("./func_play");
const { ooch_info_embed, check_chance } = require("./func_other");
const { Canvas, loadImage, FontLibrary } = require('skia-canvas');

module.exports = {

/**
 * Generate an Oochamon battle opponent for wild encounters.
 * @param {String} ooch_id The ID of the Oochamon we are generating a battle for
 * @param {Number} ooch_level The level of the Oochamon we're battling
 * @returns The enemy Oochamon data in an object.
 */
generate_wild_battle: function(ooch_id, ooch_level) {

    const { get_stats, ability_stat_change } = require('./func_battle.js');

    // Get wild oochamon stats
    let hp_iv = _.random(0,10)/20+1
    let atk_iv = _.random(0,10)/20+1
    let def_iv = _.random(0,10)/20+1
    let spd_iv = _.random(0,10)/20+1
    let atk_mul = 1;
    let def_mul = 1;
    let spd_mul = 1;
    let acc_mul = 1;
    let eva_mul = 1;

    let stats = get_stats(ooch_id, ooch_level, hp_iv, atk_iv, def_iv, spd_iv) //returns [hp, atk, def, spd]
    let hp = stats[0]
    let atk = stats[1]
    let def = stats[2]
    let spd = stats[3]  

    let learn_list = db.monster_data.get(ooch_id, 'move_list').filter(x => x[0] <= ooch_level && x[0] != -1)
    let move_list = [];

    for (let i = 0; i < learn_list.length; i++) {
        move_list[i] = learn_list[i][1]; //get only the move ID and put it in the move_list
    }

    // Make sure the move_list is 4 moves
    while (move_list.length > 4) {
        let rand_move_pos = _.random(0, move_list.length)
        move_list.splice(rand_move_pos, 1);
    }

    // Pick a random ability
    let ability_list = db.monster_data.get(ooch_id, 'abilities');
    let rand_ability = ability_list[_.random(0, ability_list.length - 1)]

    let ooch_enemy = {
        name: 'Wild Oochamon',
        ooch_active_slot: 0,
        trainer_type: TrainerType.Wild, 
        ooch_party:[{
            id: parseInt(ooch_id),
            name: db.monster_data.get(ooch_id, 'name'),
            nickname: db.monster_data.get(ooch_id, 'name'),
            item: -1,
            level: ooch_level,
            ability: rand_ability,
            moveset: move_list,
            stats: {
                hp: hp,
                atk: atk,
                def: def,
                spd: spd,
                hp_iv: hp_iv,
                atk_iv: atk_iv,
                def_iv: def_iv,
                spd_iv: spd_iv,
                atk_mul: atk_mul,
                def_mul: def_mul,
                spd_mul: spd_mul,
                acc_mul: acc_mul, // Accuracy Multiplier, used for accuracy checks
                eva_mul: eva_mul // Evasion Multiplier, used for accuracy checks
            },
            status_effects: [],
            current_hp: hp,
            evo_stage: db.monster_data.get(ooch_id, 'evo_stage'),
            emote: db.monster_data.get(ooch_id, 'emote'),
            alive: true,
            current_exp: 0,
            next_lvl_exp: ooch_level ** 3,
            type: db.monster_data.get(ooch_id, 'type')
        }]
    }

    // Setup enemy ability stat changes
    ooch_enemy.ooch_party[0] = ability_stat_change(ooch_enemy.ooch_party[0], ooch_enemy.ooch_party);

    return ooch_enemy
},

/**
 * Takes a trainer object and converts it for battle
 * @param {Object} trainer_obj The base trainer object to convert
 */
generate_trainer_battle(trainer_obj){

    const { get_stats, ability_stat_change } = require('./func_battle.js');
    //trainer_obj = trainer_obj[0];

    let party_base = trainer_obj.team;
    let party_generated = [];
    
    //Loop through the party_base and convert to the required format for battles
    for(let i  = 0; i < party_base.length; i++){
        let ooch_base = party_base[i];

        //Pre calculate the stats including IVs
        let stats = get_stats(ooch_base.id, ooch_base.level, ooch_base.stats.hp_iv, ooch_base.stats.atk_iv, ooch_base.stats.def_iv, ooch_base.stats.spd_iv) //returns [hp, atk, def, spd]
        let hp = stats[0]
        let atk = stats[1]
        let def = stats[2]
        let spd = stats[3]  

        let ooch_generated = {
            id: ooch_base.id,
            name: ooch_base.name,
            nickname: ooch_base.nickname,
            current_hp: hp,
            type : db.monster_data.get(ooch_base.id, 'type'),
            item: -1,
            alive : true,
            ability: ooch_base.ability,
            level: ooch_base.level,
            
            moveset: ooch_base.moveset,
            stats: {
                hp: hp,
                atk: atk,
                def: def,
                spd: spd,
                hp_iv: ooch_base.stats.hp_iv,
                atk_iv: ooch_base.stats.atk_iv,
                def_iv: ooch_base.stats.def_iv,
                spd_iv: ooch_base.stats.spd_iv,
                atk_mul: 1,
                def_mul: 1,
                spd_mul: 1,
                acc_mul: 1, // Accuracy Multiplier, used for accuracy checks
                eva_mul: 1 // Evasion Multiplier, used for accuracy checks
            },
            status_effects: [],
            
            evo_stage: db.monster_data.get(ooch_base.id, 'evo_stage'),
            emote: db.monster_data.get(ooch_base.id, 'emote'),
            alive: true,
            current_exp: 0,
            next_lvl_exp: ooch_base.level ** 3,
        }

        party_generated.push(ooch_generated); 
    }
    
    // Create the object to actually be returned
    let trainer_return = {
        name: trainer_obj.name,
        ooch_active_slot: 0,
        trainer_type: TrainerType.NPCTrainer,
        ooch_party: party_generated,
    }

    // Setup enemy ability stat changes
    trainer_return.ooch_party[0] = ability_stat_change(trainer_return.ooch_party[0], trainer_return.ooch_party);

    return trainer_return;

},

/**
 * Sets up an Oochamon battle and begins prompting for input.
 * @param {Object} thread The thread Oochamon is being played in
 * @param {String} user_id The user ID of the user playing Oochamon
 * @param {Object} trainer_obj The enemy trainer object
 * @param {Boolean} is_npc_battle If the battle is a trainer battle or not, defaults to false
 */
setup_battle: async function(thread, user_id, trainer_obj, is_npc_battle = false) {

    const { ability_stat_change, prompt_battle_input, generate_battle_image } = require('./func_battle.js');

    let ooch_party = db.profile.get(user_id, 'ooch_party');

    // Setup stuff for the main players team
    let initial_slot = -1;
    for (let i = 0; i < ooch_party.length; i++) {
        let ooch_data = ooch_party[i];
        ooch_data = ability_stat_change(ooch_data, ooch_party);
        ooch_party[i] = ooch_data;
        if(ooch_data.current_hp > 0 && initial_slot < 0){ initial_slot = i;}
    }

    db.profile.set(user_id, ooch_party, 'ooch_party');
    db.profile.set(user_id, initial_slot, 'ooch_active_slot'); //if this is still somehow -1 the player shouldn't be able to fight right now anyway

    // Delete playspace to enter battle
    let playspace_msg = await thread.messages.fetch(db.profile.get(user_id, 'display_msg_id'));
    await playspace_msg.delete();

    // Generate intro to battle image
    let battle_image = await generate_battle_image(thread, user_id, db.profile.get(user_id), trainer_obj, is_npc_battle);
    await thread.send({ 
        content: is_npc_battle ? `# ${trainer_obj.name} wants to battle!`
                : `# You encounter a wild **${db.monster_data.get(trainer_obj.ooch_party[0].id, 'name')}!**`,
        files: [battle_image]
    });

    // Start battle text for the enemy
    // if (is_npc_battle) {
    //     await thread.send(`**${trainer_obj.name}** wants to battle!\n${npc_prism_visual.join('')}\n\nThey send out a **level ${trainer_obj.ooch_party[0].level} ${db.monster_data.get(trainer_obj.ooch_party[0].id, 'name')}!**`);
    // } else {
    //     await thread.send(`You encounter a wild **level ${trainer_obj.ooch_party[0].level} ${db.monster_data.get(trainer_obj.ooch_party[0].id, 'name')}!**`);
    // }
    // await thread.send(`${db.monster_data.get(trainer_obj.ooch_party[0].id, 'emote')}`);

    // // Start battle text for the player
    // await thread.send(`You send out your **level ${ooch_party[initial_slot].level} ${ooch_party[initial_slot].nickname}!**`)
    // await thread.send(db.monster_data.get(ooch_party[initial_slot].id, 'emote'));

    await db.profile.set(user_id, PlayerState.Combat, 'player_state')
    await db.profile.set(user_id, trainer_obj, 'ooch_enemy')
    await db.profile.set(user_id, 1, 'battle_msg_counter');
    await db.profile.set(user_id, 1, 'battle_turn_counter');

    // Update Oochadex seen info
    for (let i = 0; i < trainer_obj.ooch_party.length; i++) {
        db.profile.math(user_id, '+', 1, `oochadex[${trainer_obj.ooch_party[i].id}].seen`);
    }

    await prompt_battle_input(thread, user_id);
},

/**
 * Handles all battle input and logic. The main battle function.
 * @param {Object} thread The thread that Oochamon is being played in.
 * @param {String} user_id The user id of the user playing Oochamon.
 */
prompt_battle_input: async function(thread, user_id) {

    const { type_to_emote, attack, end_of_round, victory_defeat_check, prompt_battle_input,
    item_use, finish_battle, ability_stat_change } = require('./func_battle.js');

    // Get enemy oochamon data that was previously generated
    let ooch_enemy_profile = db.profile.get(user_id, 'ooch_enemy')
    let ooch_plr_profile = db.profile.get(user_id, 'ooch_party');
    let ooch_enemy = ooch_enemy_profile.ooch_party[ooch_enemy_profile.ooch_active_slot];
    // Get the players oochamon in the first spot of their party
    let active_slot = db.profile.get(user_id, 'ooch_active_slot');
    let ooch_plr = db.profile.get(user_id, `ooch_party[${db.profile.get(user_id, 'ooch_active_slot')}]`);
    let ooch_pos = db.profile.get(user_id, 'ooch_active_slot');
    let move_list = ooch_plr.moveset;
    let move_id, move_name, turn_order; // Battle variables
    let displayEmbed = new EmbedBuilder();

    const row = new ActionRowBuilder()
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
                .setEmoji('<:item_prism:1023031025716179076>')
                .setStyle(ButtonStyle.Success),
        );

    const row2 = new ActionRowBuilder()
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
                .setDisabled(ooch_enemy_profile.trainer_type !== TrainerType.Wild),
        );
    
    const move_buttons = new ActionRowBuilder();
    const switch_buttons_1 = new ActionRowBuilder();
    const switch_buttons_2 = new ActionRowBuilder();
    const bag_buttons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('heal_button')
                .setLabel('Healing')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('<:item_potion_magic:1023031024726327426>'),
        ).addComponents(
            new ButtonBuilder()
                .setCustomId('prism_button')
                .setLabel('Prism')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('<:item_prism:1023031025716179076>')
                .setDisabled(ooch_enemy_profile.trainer_type !== TrainerType.Wild),
        ).addComponents(
            new ButtonBuilder()
                .setCustomId('back')
                .setLabel('Back')
                .setStyle(ButtonStyle.Danger),
        )
        
    // If our current oochamon sent out is dead, we need to get input to switch our oochamon.
    if (ooch_plr.current_hp <= 0) {
        let ooch_check, ooch_emote, ooch_hp, ooch_button_color, ooch_disable;
        let ooch_party = db.profile.get(user_id, 'ooch_party');

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

            ((i <= 2) ? switch_buttons_1_die : switch_buttons_2_die).addComponents(
                new ButtonBuilder()
                    .setCustomId(`${i}`)
                    .setLabel(`${ooch_check.nickname} (${ooch_hp})`)
                    .setStyle(ooch_button_color)
                    .setEmoji(ooch_emote)
                    .setDisabled(ooch_disable),
            )
        }

        await thread.send({ content: `Select the new Oochamon you want to switch in!`, components: (switch_buttons_2_die.components.length != 0) ? [switch_buttons_1_die, switch_buttons_2_die] : [switch_buttons_1_die] })
        db.profile.inc(user_id, 'battle_msg_counter');

        const s_collector_d = thread.createMessageComponentCollector({ max: 1 });

        await s_collector_d.on('collect', async ooch_sel => {
            
            let string_to_send = `You sent out ${db.monster_data.get(ooch_pick.id, 'emote')} **${ooch_pick.nickname}** to battle!`;
            // Check for on switch in abilities
            switch (ooch_enemy.ability) {
                case 'Alert':
                    ooch_enemy = modify_stat(ooch_enemy, Stats.Attack, 0.1);
                    string_to_send += `\n${ooch_enemy.emote} **${ooch_enemy.nickname}**'s ability **Alert** raised its attack by 10% from the new Oochamon switch!`;
                break;
            }

            // Reset stat multipliers for oochamon being swapped
            ooch_plr.atk_mul = 1;
            ooch_plr.def_mul = 1;
            ooch_plr.spd_mul = 1;
            ooch_plr.acc_mul = 1;
            ooch_plr.eva_mul = 1;
            db.profile.set(user_id, ooch_plr, `ooch_party[${active_slot}]`);

            let ooch_pick = db.profile.get(user_id, `ooch_party[${parseInt(ooch_sel.customId)}]`)
            await ooch_sel.update({ content: string_to_send, components: [] })

            let ooch_pos = parseInt(ooch_sel.customId);
            ooch_plr = db.profile.get(user_id, `ooch_party[${ooch_pos}]`);
            db.profile.set(user_id, ooch_pos, 'ooch_active_slot');
            active_slot = ooch_pos;

            // Update on switch in stats
            ooch_plr = ability_stat_change(ooch_plr, ooch_plr_profile.ooch_party);

            await prompt_battle_input(thread, user_id);
        });
        
    } else { // If our currently sent out Oochamon is alive, do input as normal.

    let sel_msg = await thread.send({ content: `### -- Select An Action --`, components: [row, row2] });

    const collector = thread.createMessageComponentCollector({ max: 1 });

    await collector.on('collect', async sel => {
        await sel_msg.delete();
        switch (sel.customId) {
            case 'fight':

                // Get the player's Attack options
                for (let i = 0; i < move_list.length; i++) {
                    
                    move_id = move_list[i];
                    
                    move_name = db.move_data.get(`${move_id}`, 'name')
                    move_type = db.move_data.get(`${move_id}`, 'type')
                    move_accuracy = db.move_data.get(`${move_id}`, 'accuracy')

                    move_buttons.addComponents(
                        new ButtonBuilder()
                            .setCustomId(`${move_id}`)
                            .setLabel(`${move_name}`)
                            .setStyle(ButtonStyle.Primary)
                            .setEmoji(type_to_emote(move_type))
                    )
                }

                //Select the move to use
                let atk_msg = await thread.send({ content: `Select a move to use!`, components: [move_buttons]});
                db.profile.inc(user_id, 'battle_msg_counter');
                const atk_collector = thread.createMessageComponentCollector({ max: 1 });   

                await atk_collector.on('collect', async atk => {
                    await atk_msg.delete();
                    let enemy_snare = ooch_enemy.status_effects.includes('snared');
                    let plr_snare = ooch_plr.status_effects.includes('snared');

                    if ((ooch_enemy.stats.spd * enemy_snare) > (ooch_plr.stats.spd * plr_snare)) { // Enemy goes first
                        turn_order = ['e', 'p']
                    } else { // Player goes first
                        turn_order = ['p', 'e'];
                    }

                    for (let i = 0; i < turn_order.length; i++) {

                        let atk_id = atk.customId;

                        if (turn_order[i] == 'p') {
                            // Player attacks enemy
                            [ooch_plr, ooch_enemy] = await attack(thread, user_id, atk_id, ooch_plr, ooch_enemy, '**------------ Player Turn ------------**');
                        } else {
                            // Enemy attacks player
                            atk_id = ooch_enemy.moveset[_.random(0,ooch_enemy.moveset.length-1)];
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

                });

            break;
            case 'switch':
                //#region SWITCH
                let ooch_inv = db.profile.get(user_id, 'ooch_party')
                let ooch_check, ooch_emote, ooch_name, ooch_hp, ooch_button_color, ooch_prev, ooch_disable;

                // Check if we have only 1 oochamon.
                if (ooch_inv.length == 1) {
                    thread.send('You only have 1 oochamon in your party, so you cannot switch.' +
                    '\nSelect a different action!');
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

                    ((i <= 2) ? switch_buttons_1 : switch_buttons_2).addComponents(
                        new ButtonBuilder()
                            .setCustomId(`${i}`)
                            .setLabel(`${ooch_name} (${ooch_hp})`)
                            .setStyle(ooch_button_color)
                            .setEmoji(ooch_emote)
                            .setDisabled(ooch_disable),
                    )
                }

                thread.send({ content: `**------------ Player Turn ------------**` + 
                `\nSelect the new Oochamon you want to switch in!`, components: (switch_buttons_2.components.length != 0) ? [switch_buttons_1, switch_buttons_2] : [switch_buttons_1] })
                db.profile.inc(user_id, 'battle_msg_counter');

                const s_collector = thread.createMessageComponentCollector({ max: 1 });

                await s_collector.on('collect', async ooch_sel => {

                    let string_to_send = `You switched your active Oochamon from ${db.monster_data.get(ooch_prev.id, 'emote')} **${ooch_prev.nickname}** to ${db.monster_data.get(ooch_pick.id, 'emote')} **${ooch_pick.nickname}**.`;
                    let ooch_pick = db.profile.get(user_id, `ooch_party[${parseInt(ooch_sel.customId)}]`)
                    displayEmbed = new EmbedBuilder()
                    displayEmbed.setColor('#0095ff')
                    displayEmbed.setTitle('↩️ Switch ↩️')

                    // Check for on switch in abilities
                    switch (ooch_enemy.ability) {
                        case 'Alert':
                            ooch_enemy = modify_stat(ooch_enemy, Stats.Attack, 0.1);
                            string_to_send += `${ooch_enemy.emote} **${ooch_enemy.nickname}**'s ability **Alert** raised its attack by 10% from the new Oochamon switch!`;
                        break;
                    }

                    displayEmbed.setDescription(string_to_send)

                    await ooch_sel.update({ content: `**------------ Player Turn ------------**`, embeds: [displayEmbed], components: [] })

                    ooch_pos = parseInt(ooch_sel.customId);
                    ooch_plr = db.profile.get(user_id, `ooch_party[${ooch_pos}]`);
                    db.profile.set(user_id, ooch_pos, 'ooch_active_slot');

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
                //#endregion
            break;
            case 'bag':
                //#region BAG
                let heal_inv = db.profile.get(user_id, 'heal_inv')
                let heal_inv_keys = Object.keys(heal_inv);
                let prism_inv = db.profile.get(user_id, 'prism_inv')
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

                thread.send({ content: `Select the item category you'd like to use an item in!`, components: [bag_buttons]});
                db.profile.inc(user_id, 'battle_msg_counter');

                const b_collector = thread.createMessageComponentCollector({ componentType:  ComponentType.Button });
                let prism_collector;
                let heal_collector;

                await b_collector.on('collect', async i_sel => {

                    if (i_sel.customId == 'back') {
                        b_collector.stop();
                        i_sel.update({ content: `Backed out of bag menu.`, components: [] });
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

                            heal_select_options.push({ 
                                label: `${db.item_data.get(id, 'name')} (${amount})`,
                                description: db.item_data.get(id, 'description'),
                                value: `${id}`,
                                emoji: db.item_data.get(id, 'emote'),
                            })
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

                            item_use(thread, user_id, ooch_plr, item_id)
                            displayEmbed.setColor('#02ff2c');
                            displayEmbed.setTitle(`❤️ Healing ❤️`)
                            displayEmbed.setDescription(`${item_data.emote} Used **${item_data.name}** and healed ${item_data.value * 100}% of ${ooch_plr.name}'s HP!`)
                            item_sel.update({ content: `**------------ Player Turn ------------**`, embeds: [displayEmbed], components: []});
                            
                            db.profile.math(user_id, '-', 1, `heal_inv.${item_id}`)
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

                            prism_select_options.push({ 
                                label: `${db.item_data.get(id, 'name')} (${amount})`,
                                description: db.item_data.get(id, 'description'),
                                value: `${id}`,
                                emoji: db.item_data.get(id, 'emote'),
                            })
                        }

                        bag_select.addComponents(
                            new StringSelectMenuBuilder()
                                .setCustomId('prism_select')
                                .setPlaceholder('Select a prism you\'d like to use!')
                                .addOptions(prism_select_options),
                        );

                        await i_sel.update({ content: `Select the prism you'd like to use!`, components: [bag_select, bag_buttons] })

                        prism_collector = thread.createMessageComponentCollector({ componentType: ComponentType.StringSelect, max: 1 });

                        await prism_collector.on('collect', async item_sel => { 
                            let item_id = item_sel.values[0];
                            let item_data = db.item_data.get(item_id);
                            if (db.profile.get(user_id, `prism_inv.${item_id}`) == undefined) return;

                            let string_to_send = `${item_data.emote} Used a **${item_data.name}** on the ${db.monster_data.get(ooch_enemy.id, 'emote')} **${ooch_enemy.name}**`;
                            
                            db.profile.math(user_id, '-', 1, `prism_inv.${item_id}`)
                            let prism_result = item_use(thread, user_id, ooch_enemy, item_id)
                            b_collector.stop();
                            prism_collector.stop();
                            if (heal_collector != undefined) heal_collector.stop();
                            
                            // Setup embed
                            displayEmbed.setColor('#f2d751');
                            displayEmbed.setTitle(`<:item_prism:1023031025716179076> Prism Throw <:item_prism:1023031025716179076>`)

                            // If we caught the Oochamon successfully
                            if (prism_result == true) { 
                                string_to_send += `\n\n**You successfully caught the wild ${ooch_enemy.name}!**\nIt's been added to your party, or to your PC if your party is full.\n` +
                                `Your playspace will appear momentarily.`;
                                displayEmbed.setDescription(string_to_send)
                                await item_sel.update({ content: `**------------ Player Turn ------------**`, embeds: [displayEmbed], components: []});

                                // Have it check here if you want to send the Oochamon to your party or not
                                if (db.profile.get(user_id, 'ooch_party').length < 4) {
                                    db.profile.push(user_id, ooch_enemy, `ooch_party`);
                                } else {
                                    db.profile.push(user_id, ooch_enemy, `ooch_pc`)
                                }
                                db.profile.math(user_id, '+', 1, `oochadex[${ooch_enemy.id}].caught`)
                                let infoEmbed = ooch_info_embed(ooch_enemy)
                                infoEmbed.setAuthor({ name: 'Here\'s some information about the Oochamon you just caught!' })

                                item_sel.followUp({ embeds: [infoEmbed], ephemeral: true })
                                await finish_battle(thread, user_id);

                                return;
                            } else {
                                string_to_send += `\n\nUnfortunately, your prism catch attempt failed...`;
                                displayEmbed.setDescription(string_to_send);
                                await item_sel.update({ content: `**------------ Player Turn ------------**`, embeds: [displayEmbed], components: []});
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
                //#region RUN
                if ((ooch_plr.stats.spd + ooch_plr.level * 10) / ((ooch_plr.stats.spd + ooch_plr.level * 10) + (ooch_enemy.stats.spd + ooch_enemy.level * 10) ) > Math.random()) {
                    thread.send(`**------------ Player Turn ------------**` +
                    `\nYou successfully ran away!\nYour playspace will appear momentarily.`);
                    db.profile.inc(user_id, 'battle_msg_counter');
                    await finish_battle(thread, user_id);
                    return;
                } else {
                    thread.send(`**------------ Player Turn ------------**` + 
                    `\nYou failed to run away!`)
                    db.profile.inc(user_id, 'battle_msg_counter');

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
                //#endregion
            break;
        }
    });
    }
},

/**
 * An algorithm that handles calculating the raw amount of damage a move will do.
 * Takes abilities into account as well here. Mainly used in the attack function.
 * @param {Number} move_damage How much damage the move is doing
 * @param {String} move_type The type of the move
 * @param {Object} ooch_attacker The data of the Oochamon attacking
 * @param {Object} ooch_defender The data of the Oochamon defending
 * @returns The amount of damage the move will do.
 */
battle_calc_damage: function(move_damage, move_type, ooch_attacker, ooch_defender) {
    let damage = Math.round(Math.ceil((2 * ooch_attacker.level / 5 + 2) // Level Adjustment
    * move_damage // Damage
    * ((Math.floor((ooch_attacker.current_hp / ooch_attacker.stats.hp) * 6) * 6) / 100) + 1 // Hexiply ability
    * ooch_attacker.stats.atk * ooch_attacker.stats.atk_mul / ooch_defender.stats.def * ooch_defender.stats.def_mul) 
    / 50 + 2);

    switch (move_type) {
        case 'Ooze': 
            if (ooch_attacker.ability == 'Icky') Math.round(damage *= 1.1);
            if (ooch_attacker.ability == 'Crystallize') Math.round(damage *= 1.3); break;
        case 'Fungal':
            if (ooch_attacker.ability == 'Icky') Math.round(damage *= 1.1); break;
        case 'Flame':
            if (ooch_attacker.ability == 'Warm') Math.round(damage *= 1.1);
            if (ooch_defender.ability == 'Moist') Math.round(damage *= 0.5);
            if (ooch_attacker.ability == 'Crystallize') Math.round(damage *= 1.3); break;
        case 'Stone':
            if (ooch_attacker.ability == 'Burrower') Math.round(damage *= 1.1);
            if (ooch_defender.ability == 'Armored') Math.round(damage *= 0.80);
            if (ooch_attacker.ability == 'Crystallize') Math.round(damage *= 1.3); break;
    }

    damage = _.clamp(damage, 1, ooch_defender.current_hp)
    return damage;
},

/**
 * Calculates the amount of EXP earned when defeating an Oochamon of a certain level and evolution stage.
 * @param {Number} enemy_level The level of the opposing Oochamon
 * @param {Number} enemy_evo_stage The evolution stage of the opposing Oochamon
 * @returns A number of the amount of EXP earned
 */
battle_calc_exp: function(enemy_level, enemy_evo_stage) {
    return Math.round((1.015 ** enemy_level) * (2 ** enemy_evo_stage) * 5 * enemy_level);
},

/**
 * Calculates the amount of EXP needed for the next level up for an Oochamon.
 * @param {Number} level The level of the Oochamon
 * @returns The amount of EXP needed for the next level
 */
exp_to_next_level: function(level) {
    return (level ** 3);
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
    // TODO: Change the output to an object, not an array
    let hp = Math.floor(db.monster_data.get(species_id, 'hp') * (1.05 ** level) * hp_iv + 10) ;
    let atk = Math.floor(db.monster_data.get(species_id, 'atk') * (1.05 ** level) * atk_iv);
    let def = Math.floor(db.monster_data.get(species_id, 'def') * (1.05 ** level) * def_iv);
    let spd = Math.floor(db.monster_data.get(species_id, 'spd') * (1.05 ** level) * spd_iv);
    return [hp, atk, def, spd];
},

/**
 * Converts a type string to an emote for that type.
 * @param {String} type_string The type to convert an emote
 * @returns The emote string to post on Discord.
 */
type_to_emote: function(type_string) {
    let return_string = '';

    if (!Array.isArray(type_string)) {
        type_string = [type_string];
    }

    for (let type of type_string) {
        switch(type) {
            case 'flame':   return_string +=  '<:icon_flame:1023031001611501648>';   break;
            case 'fungal':  return_string +=  '<:icon_fungal:1023031003381514280>';  break;
            case 'magic':   return_string +=  '<:icon_magic:1023031009966575686>';   break;
            case 'stone':   return_string +=  '<:icon_stone:1023031015830204448>';   break;
            case 'neutral': return_string +=  '<:icon_neutral:1023031011703013376>'; break;
            case 'ooze':    return_string +=  '<:icon_ooze:1023031013355569262>';    break;
            case 'tech':    return_string +=  '<:icon_tech:1023031017730224139>';    break;
            case 'void':    return_string +=  '<:icon_void:1023031019466653738>';    break;
        }
    }

    return return_string;
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
 * A helper function that handles doing an attack and using a move on
 * another Oochamon in an Oochamon battle.
 * @param {Object} thread The thread Oochamon is being played in.
 * @param {String} user_id The user id of the user playing Oochamon.
 * @param {String} atk_id The ID of the attack being used
 * @param {Object} attacker The Oochamon data of the attacker
 * @param {Object} defender The Oochamon data of the defender
 * @param {String} header The header string
 * @returns An array of the attacker and defender Oochamon data, after the attacks.
 */
attack: async function(thread, user_id, atk_id, attacker, defender, header) {
    const { type_effectiveness, battle_calc_damage } = require('./func_battle.js');
    const clamp = (num, min, max) => Math.min(Math.max(num, min), max);
    let move_name =     db.move_data.get(atk_id, 'name');
    let move_type =     db.move_data.get(atk_id, 'type');
    let move_damage =   db.move_data.get(atk_id, 'damage');
    let move_accuracy = db.move_data.get(atk_id, 'accuracy');
    let move_effect =   db.move_data.get(atk_id, 'effect');
    let move_effect_chance =   db.move_data.get(atk_id, 'effect_chance');
    let type_multiplier = type_effectiveness(move_type, defender.type); //Returns [multiplier, string] 
    let crit_multiplier = (Math.random() > (0.95 - (move_effect == 'critical' ? move_effect_chance/100 : 0)) ? 2 : 1);
    let status_blind = (attacker.status_effects.includes('blinded') ? .75 : 1);
    let status_doubled = (defender.status_effects.includes('doubled') ? 2 : 1);
    let recoil_damage = Math.round((move_effect == 'recoil' ? move_effect_chance/100 : 0) * attacker.stats.hp);
    let vampire_heal = (move_effect == 'vampire' ? move_effect_chance/100 : 0);
    let reflect_dmg = 0;
    let attacker_emote = db.monster_data.get(attacker.id, 'emote');
    let defender_emote = db.monster_data.get(defender.id, 'emote');
    let defender_field_text = ``;
    let string_to_send = ``;
    let ability_dmg_multiplier = 1;
    if (attacker.ability == 'Rogue' && defender.current_hp === defender.hp) {
        ability_dmg_multiplier = 2;
    }

    dmg = battle_calc_damage(move_damage * type_multiplier[0] * crit_multiplier * status_doubled * ability_dmg_multiplier, move_type, attacker, defender);
    vampire_heal = Math.round(vampire_heal * dmg); //used later

    if ((move_accuracy/100 * status_blind > Math.random()) || (defender.ability == 'Immense')) {
        defender.current_hp -= dmg
        defender.current_hp = clamp(defender.current_hp, 0, defender.stats.hp);

        attacker.current_hp += _.clamp(vampire_heal * attacker.current_hp, 0, attacker.stats.hp);
        attacker.current_hp -= recoil_damage;

        // Check for on hit abilities
        switch (attacker.ability) {
            case 'Leech':
                attacker.current_hp = _.clamp(attacker.current_hp + Math.round(dmg * 0.1), 0, attacker.stats.hp); 
            break;
            case 'Ensnare':
                if (check_chance(30)) {
                    defender.status_effects.push('snared');
                    defender_field_text += `\nThe oppsing ${defender_emote} **${defender.nickname}** was **SNARED** on hit!`
                }
            break;
            case 'Lacerating':
                defender.current_hp = _.clamp(defender.current_hp + Math.round(dmg * 0.05), 0, defender.stats.hp);
                defender_field_text += `\nThe opposing ${defender_emote} **${defender.nickname}** lost 5% of their HP due to the ability **Lacerating**!`
            break;
        }
        
        switch (defender.ability) {
            case 'Reactive':
                attacker.current_hp = _.clamp(attacker.current_hp - Math.round(dmg * 0.05), 0, attacker.stats.hp)
                reflect_dmg = Math.round(dmg * 0.05);
            break;
            case 'Shadow':
                if (check_chance(25)) {
                    defender_field_text += `\nThe opposing ${defender_emote} **${defender.nickname}** **VANISHED** after being hit!`
                    defender.status_effects.push('vanished');
                }
            break;
            case 'Tangled':
                defender.field_text += `\nThe attacking ${attacker_emote} **${attacker.nickname}** was **SNARED** by the opposing Oochamon's ability **Tangled**!`
        }

        string_to_send += `\n${attacker_emote} **${attacker.nickname}** uses **${move_name}** and deals **${dmg}** damage to the opposing ${defender_emote} **${defender.nickname}**!`
        
        //If a crit lands
        if(crit_multiplier >= 2){
            string_to_send += `\n**A critical hit!**`
        }

        //If a attack has vampire
         if(vampire_heal > 0){
            string_to_send += `\n--- ❤️ Restored **${vampire_heal}** HP from **Vampire**!`
        }

        //If attack has recoil
        if(recoil_damage > 0){
            string_to_send += `\n--- 💥 Lost **${recoil_damage}** HP from recoil!`
        }

        // If attack has reflect damage
        if (reflect_dmg > 0) {
            string_to_send += `\n--- 🪞 Took **${reflect_dmg}** HP from ${defender_emote} **${defender.nickname}**'s ability **Reactive**!`
        }

        //Type effectiveness
        string_to_send += type_multiplier[1];

        // Change move_effect_chance based on abilities
        switch (attacker.ability) {
            case 'Scorching':
                if (move_effect == 'burned') move_effect_chance = 100;
            break;
        }

        switch (defender.ability) {
            case 'Mundane':
                move_effect_chance = 0;
            break;
        }

        if(Math.random() < move_effect_chance/100 && move_effect_chance > 0){ //Apply status effect
            let status_adds = [move_effect];
            // Setup list of status effects to add
            switch (defender.ability) {
                case 'Darkbright':
                    switch (move_effect) {
                        case 'burned': status_adds.push('blinded');
                        case 'blinded': status_adds.push('burned');
                    }
                break;
                case 'Radiant':
                    switch (move_effect) {
                        case 'infected': status_adds.push('burned');
                        case 'burned': status_adds.push('infected');
                    }
                break;
            }

            defender_field_text += `\nThe opposing ${defender_emote} **${defender.nickname}** was **${move_effect.toUpperCase()}!**`
            defender.status_effects.push(status_adds);
            defender.status_effects = defender.status_effects.flat(1);
        } else if(-Math.random() > move_effect_chance/100 && move_effect_chance < 0){
            string_to_send += `\n--- Got **${move_effect.toUpperCase()}!**`
            attacker.status_effects.push(move_effect);
        }
    }
    else {
        string_to_send += `\n${attacker_emote} **${attacker.nickname}** tried to use ${move_name} but it missed!`
    }

    // Check if opposing Oochamon is dead
    if (defender.current_hp <= 0) {
        defender_field_text += `\n🪦 ${defender_emote} **${defender.nickname}** fainted!`
        defender.alive = false;
        
        // Opposing oochamon death ability triggers
        switch (defender.ability) {
            case 'Haunted':
                attacker.status_effects.push('doomed');
                defender_field_text += `\n${attacker_emote} **${attacker.nickname}** was **DOOMED** from ${defender_emote} **${defender.nickname}**'s ability **Haunted**!`;
            break;
            case 'Ravenous':
                attacker.current_hp += _.clamp(attacker.current_hp + attacker.stats.hp * 0.2, 0, attacker.stats.hp);
                defender_field_text += `\n${attacker_emote} **${attacker.nickname}** healed 20% HP back from its ability **Ravenous**!`;
            break;
            case 'Sporespray':
                attacker.status_effects.push('infected');
                defender_field_text += `\n${attacker_emote} **${attacker.nickname}** was **INFECTED** from ${defender_emote} **${defender.nickname}**'s ability **Sporespray**!`;
            break;
        }
    }

    let displayEmbed = new EmbedBuilder()
    .setColor('#ff6f00')
    .setTitle('⚔️ Attack ⚔️')
    .setDescription(`${string_to_send}\n${defender_field_text}`)

    await thread.send({ content: header, embeds: [displayEmbed] });
    db.profile.inc(user_id, 'battle_msg_counter');
    return [attacker, defender];

},

/**
 * A helper function for type effectiveness, takes 2 types and figures out the
 * attack multiplier for the attacking type based on the defending type.
 * @param {String} attack_type The type that is attacking
 * @param {String} target_type The type that is defending
 * @returns An array with structured like [attack_multiplier, attack_string]
 */
type_effectiveness: function(attack_type, target_type) {
    let multiplier = 1;
    let string = '';

    for(let type_defender in target_type){
        switch(attack_type){
            case 'neutral':
                switch(type_defender){
                    case 'magic': multiplier *= .5; break;
                }
            break;
            case 'fungal':
                switch(type_defender){
                    case 'flame':   multiplier *= .5; break;
                    case 'fungal':  multiplier *= .5; break;
                    case 'stone':   multiplier *= 2; break;
                    case 'ooze':    multiplier *= 2; break;
                }
            break;
            case 'flame':
                switch(type_defender){
                    case 'ooze':    multiplier *= .5; break;
                    case 'flame':   multiplier *= .5; break;
                    case 'void':    multiplier *= 2; break;
                    case 'fungal':  multiplier *= 2; break;
                }
            break;
            case 'stone':
                switch(type_defender){
                    case 'ooze':    multiplier *= .5; break;
                    case 'tech':    multiplier *= 2; break;
                    case 'flame':   multiplier *= 2; break;
                }
            break;
            case 'tech':
                switch(type_defender){
                    case 'magic':   multiplier *= .5; break;
                    case 'fungal':  multiplier *= 2; break;
                    case 'ooze':    multiplier *= 2; break;
                }
            break;
            case 'ooze':
                switch(type_defender){
                    case 'ooze':    multiplier *= .5; break;
                    case 'flame':   multiplier *= 2; break;
                    case 'stone':   multiplier *= 2; break;
                }
            break;
            case 'magic':
                switch(type_defender){
                    case 'flame':  multiplier *= .5; break;
                    case 'tech':   multiplier *= 2; break;
                }
            break;
            case 'void':
                multiplier *= 1.5;
            break;
        }
    }
    
    multiplier = Math.min(8, Math.max(.125,multiplier))

    switch(multiplier){
        case(0.125):    string = '\n**It\'s barely effective...**';     break;
        case(0.25):     string = '\n**It\'s very ineffective...**';     break;
        case(0.5):      string = '\n**It\'s not very effective...**';   break;
        case(2):        string = '\n**It\'s super effective!**';        break;
        case(4):        string = '\n**It\'s incredibly effective!**';   break;
        case(8):        string = '\n**It\'s devastatingly effective!**';   break;
    }

    return([multiplier,string])
},

/**
 * Check if we've beaten an enemy Oochamon or lost an Oochamon
 * @param {Object} thread The thread Oochamon is being played in.
 * @param {String} user_id The user id of the user playing Oochamon.
 * @param {Object} ooch_enemy The Oochamon object for the enemy
 * @param {Object} ooch_plr The Oochamon object for the player
 * @returns 
 */
victory_defeat_check: async function(thread, user_id, ooch_enemy, ooch_plr) {

    const { finish_battle, battle_calc_exp, level_up } = require('./func_battle.js');
    let ooch_enemy_party, ooch_party, slot_to_send, oochabux;
    let user_profile = db.profile.get(user_id);

    // Victory/Defeat Check
    if (ooch_enemy.current_hp <= 0) { // Beat the enemy Oochamon
        slot_to_send = -1;
        ooch_enemy_party = db.profile.get(user_id, `ooch_enemy.ooch_party`);
        // Pick the next available ooch enemy party slot for the enemy to send in
        for (let i = 0; i < ooch_enemy_party.length; i++) {
            if (ooch_enemy_party[i].current_hp > 0 && slot_to_send == -1) {
                slot_to_send = i;
            }
        }

        if (slot_to_send == -1) { //if there is no slot to send in
            let string_to_send = ``;
            let displayEmbed = new EmbedBuilder();
            if (db.profile.get(user_id, 'ooch_enemy.trainer_type') == TrainerType.Wild) {
                oochabux = _.random(5, 40);
                string_to_send += `\n💵 You gained **${oochabux}** oochabux!`;
            } else {
                oochabux = 0; // TODO: Replace with oochabux reward for trainers, when we add that
            }

            let ooch_party = user_profile.ooch_party;
            // Distribute XP for a defeated Oochamon
            // The Oochamon in the active slot at the moment of beating the Oochamon gets 1.25x more EXP than the others.
            exp_earned = battle_calc_exp(ooch_enemy.level, db.monster_data.get(ooch_enemy.id, 'evo_stage'));
            string_to_send += `\n${db.monster_data.get(ooch_plr.id, 'emote')} **${ooch_plr.nickname}** earned **${Math.round(exp_earned * 1.25)} exp!**\nThe rest of your team earned **${exp_earned}** exp.`;
            displayEmbed.setColor('#eeff00')
            displayEmbed.setTitle('Rewards')
            displayEmbed.setDescription(string_to_send);

            await thread.send({ content: `**------------ You win! ------------**`, embeds: [displayEmbed] });
            db.profile.inc(user_id, 'battle_msg_counter');
    
            for (let i = 0; i < ooch_party.length; i++) {
                if (i == user_profile.ooch_active_slot) { 
                    db.profile.math(user_id, '+', Math.round(exp_earned * 1.25), `ooch_party[${i}].current_exp`);
                } else { 
                    db.profile.math(user_id, '+', exp_earned, `ooch_party[${i}].current_exp`); 
                }
                
                // Check for level ups
                let ooch_data = db.profile.get(user_id, `ooch_party[${i}]`)
                if (ooch_data.current_exp >= ooch_data.next_lvl_exp) { // If we can level up
                    ooch_data = await level_up(thread, user_id, ooch_data);
                    await db.profile.set(user_id, ooch_data, `ooch_party[${i}]`)
                }
            }

            db.profile.math(user_id, '+', oochabux, 'oochabux');
            db.profile.set(user_id, 0, 'ooch_active_slot');
            await finish_battle(thread, user_id);
            return true;
        };
    } else if (ooch_plr.current_hp <= 0) { // Lost one of our own Oochamon
        slot_to_send = -1;
        ooch_party = db.profile.get(user_id, 'ooch_party');

        // Figure out if we have an Oochamon to send in at this point
        for (let i = 0; i < ooch_party.length; i++) {
            if (ooch_party[i].current_hp > 0 && slot_to_send == -1) {
                slot_to_send = i;
            }
        }

        if (slot_to_send == -1) { //if there is no slot to send in
            oochabux = _.random(5, 10)
            thread.send(`**------------ You lose... ------------**\nYou lose **${oochabux}** Oochabux.`);
            db.profile.inc(user_id, 'battle_msg_counter');
            db.profile.dec(user_id, oochabux, 'oochabux');
            db.profile.set(user_id, 0, 'ooch_active_slot');
            await finish_battle(thread, user_id);
            return true;
        }
    };
},

/**
 * Helper function to handle the end of an Oochamon battle round.
 * (A round ends after each Oochamon has done a move.)
 * @param {Object} thread The thread Oochamon is being played in.
 * @param {String} user_id The user id of the user playing Oochamon
 * @param {Object} ooch_plr The object of the "player" Oochamon
 * @param {Object} ooch_enemy The object of the "enemy" Oochamon
 */
end_of_round: async function(thread, user_id, ooch_plr, ooch_enemy) {
    const { generate_hp_bar, use_eot_ability, battle_calc_exp, level_up, ability_stat_change } = require('./func_battle.js');

    let ooch_list = [ooch_plr, ooch_enemy].filter(o => o.current_hp > 0);
    let ooch_status_emotes = [[], []]; // 0 is ooch_plr, 1 is ooch_enemy
    //let string_to_send = `**------------ End of Round ------------**`;
    let string_to_send = ``;
    let enemy_send_string_to_send = ``;
    let user_profile = db.profile.get(user_id);
    let enemy_profile = db.profile.get(user_id, 'ooch_enemy');

    for (let i = 0; i < ooch_list.length; i++) {
        let ooch = ooch_list[i];
        let opposing_ooch = ooch_list[!i | 0]; // Flip 1 to 0 or 0 to 1 via type casting

        // Handle end of turn abilities
        ooch = use_eot_ability(ooch);

        // Handle status effects
        let ooch_burned = ooch.status_effects.includes('burned');
        let ooch_infected = ooch.status_effects.includes('infected');
    
        for (let j = 0; j < ooch.status_effects.length; j++) {
            switch(ooch.status_effects[j]) {
                case 'burned':      ooch_status_emotes[i].push(`<:status_burned:1023031032083128441>`); break;
                case 'infected':    ooch_status_emotes[i].push(`<:status_infected:1023031033744076930>`); break;
                case 'blinded':     ooch_status_emotes[i].push(`<:status_blinded:1023031030837416057>`); break;
                case 'digitized':   ooch_status_emotes[i].push(`<:status_digitized:1023031032934576178>`); break;
                case 'snared':      ooch_status_emotes[i].push(`<:status_snared:1023031034733940798>`); break;
                case 'vanished' :   ooch_status_emotes[i].push(`<:status_vanish:1023053679328231424>`); break;
                case 'doomed' :     ooch_status_emotes[i].push(`<:status_doomed:1023053678179012648>`); break;
            }
        }

        if (ooch_burned) {
            let burn_val = Math.round(ooch.stats.hp/10);
            ooch.current_hp -= burn_val;
            string_to_send += `\n${ooch.name} was hurt by its burn and loses **${burn_val} HP**.`;
        }
    
        if (ooch_infected) {
            let infect_val = Math.round(ooch.stats.hp/20)
            ooch.current_hp -= infect_val;
            opposing_ooch.current_hp = Math.min(opposing_ooch.current_hp + infect_val, opposing_ooch.stats.hp);
            string_to_send += `\n${ooch.name} has **${infect_val} HP** absorbed by ${opposing_ooch.name}.`;
        }
    }

    // Update the ooch objects at the end of the turn so that it stays across the battle
    db.profile.set(user_id, ooch_enemy, `ooch_enemy.ooch_party[${enemy_profile.ooch_active_slot}]`);
    db.profile.set(user_id, ooch_plr, `ooch_party[${user_profile.ooch_active_slot}]`);

    let plr_hp_string = generate_hp_bar(ooch_plr, 'plr');
    let en_hp_string = generate_hp_bar(ooch_enemy, 'enemy');
    string_to_send += `${plr_hp_string} ${ooch_status_emotes[0].join(' ')}\n${en_hp_string} ${ooch_status_emotes[1].join(' ')}`

    db.profile.inc(user_id, 'battle_turn_counter');

    // Handle deaths and level ups
    if (ooch_enemy.current_hp <= 0) {
        let slot_to_send = -1;
        let ooch_enemy_party = enemy_profile.ooch_party;
        let ooch_party = user_profile.ooch_party;

        // Distribute XP for a defeated Oochamon
        // The Oochamon in the active slot at the moment of beating the Oochamon gets 1.25x more EXP than the others.
        exp_earned = battle_calc_exp(ooch_enemy.level, db.monster_data.get(ooch_enemy.id, 'evo_stage'));
        string_to_send += `\n\n${ooch_plr.emote} **${ooch_plr.nickname}** earned **${Math.round(exp_earned * 1.25)} exp!**\nThe rest of your team earned **${exp_earned} exp** as well.`
        //thread.send({ content: `${ooch_plr.emote} **${ooch_plr.nickname}** earned **${Math.round(exp_earned * 1.25)} exp!**\nThe rest of your team earned **${exp_earned} exp** as well.` })
        //db.profile.inc(user_id, 'battle_msg_counter');

        for (let i = 0; i < ooch_party.length; i++) {
            if (i == user_profile.ooch_active_slot) { 
                db.profile.math(user_id, '+', Math.round(exp_earned * 1.25), `ooch_party[${i}].current_exp`);
            } else { 
                db.profile.math(user_id, '+', exp_earned, `ooch_party[${i}].current_exp`); 
            }
            
            // Check for level ups
            let ooch_data = db.profile.get(user_id, `ooch_party[${i}]`)
            if (ooch_data.current_exp >= ooch_data.next_lvl_exp) { // If we can level up
                ooch_data = await level_up(thread, user_id, ooch_data);
                await db.profile.set(user_id, ooch_data, `ooch_party[${i}]`)
            }
        }

        // Pick the next available ooch enemy party slot for the enemy to send in
        for (let i = 0; i < ooch_enemy_party.length; i++) {
            if (ooch_enemy_party[i].current_hp > 0 && slot_to_send == -1) {
                slot_to_send = i;
            }
        }

        if (slot_to_send != -1) { //if there is a slot to send in
            enemy_send_string_to_send += `**${enemy_profile.name}** sends out ${ooch_enemy_party[slot_to_send].emote} **${ooch_enemy_party[slot_to_send].name}!**`;
            enemy_send_string_to_send += `\n${ooch_enemy_party.map(v => v = v.alive == true ? `<:item_prism:1023031025716179076>` : `❌`).join('')}`;

            // Check for on switch in abilities
            switch (ooch_plr.ability) {
                case 'Alert':
                    ooch_plr = modify_stat(ooch_plr, Stats.Attack, 0.1);
                    string_to_send += `${ooch_plr.emote} **${ooch_plr.nickname}**'s ability **Alert** raised its attack by 10% from the new Oochamon switch!`;
                break;
            }

            // Reset modified stats
            ooch_enemy.atk_mul = 1;
            ooch_enemy.def_mul = 1;
            ooch_enemy.spd_mul = 1;
            ooch_enemy.acc_mul = 1;
            ooch_enemy.eva_mul = 1;
            db.profile.set(user_id, ooch_enemy, `ooch_enemy.ooch_party[${enemy_profile.ooch_active_slot}]`);

            // Switch in stats
            ooch_enemy = ooch_enemy_party[slot_to_send];
            ooch_enemy = ability_stat_change(ooch_enemy, ooch_enemy_party);
            db.profile.set(user_id, ooch_enemy, `ooch_enemy.ooch_party[${slot_to_send}]`);
            db.profile.set(user_id, slot_to_send, `ooch_enemy.ooch_active_slot`);
        };
    }

    let displayEmbed = new EmbedBuilder()
    .setColor('#00ff80')
    .setDescription(`${string_to_send}`);
    await thread.send({ content: `**------------ End of Round ------------**`, embeds: [displayEmbed] });
    db.profile.inc(user_id, 'battle_msg_counter');
    if (enemy_send_string_to_send != '') {
        await thread.send({ content: enemy_send_string_to_send });
        db.profile.inc(user_id, 'battle_msg_counter');
    }

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
    let piece_type;

    hp_string += `\n${db.monster_data.get(ooch.id, 'emote')} `;

    if (style == 'plr') {
        piece_type = `<:p_f_hm:1023031007714226257>`
        if (sections <= 5) piece_type = `<:p_m_hm:1023031029889511424>`;
        if (sections <= 2) piece_type = `<:p_l_hm:1023031006581764106>`;

        hp_string += `<:p_hs:1023031009106722856>`;
        hp_string += `${piece_type.repeat(sections)}` // Filled slots
        hp_string += `${`<:p_g_hm:1023031005029879818>`.repeat(10 - sections)}` // Empty slots
        hp_string += `<:p_he:1023031005797437480>\n`;
    } else {
        piece_type = `<:e_f_hm:1023030997291380746>`;
        if (sections <= 5) piece_type = `<:e_m_hm:1023031000730714212>`;
        if (sections <= 2) piece_type = `<:e_l_hm:1023030999489200199>`;

        hp_string += `<:e_hs:1023030998675496992>`;
        hp_string += `${piece_type.repeat(sections)}` // Filled slots
        hp_string += `${`<:e_g_hm:1023030996192481320>`.repeat(10 - sections)}` // Empty slots
        hp_string += `<:e_he:1023030997899542580>\n`;
    }

    hp_string += `\`HP: ${ooch.current_hp}/${ooch.stats.hp}\`\n**\`Lvl: ${ooch.level}\`**`;

    return hp_string;
},

/**
 * A helper function to handle using an item such as a healing or prism item
 * in an Oochamon battle.
 * @param {Object} thread The thread Oochamon is being played in
 * @param {String} user_id The user id of the user playing Oochamon
 * @param {Object} ooch The oochamon data object
 * @param {String} item_id The item id that is to be used
 * @returns A true or false for prisms if they caught or didn't catch, otherwise nothing.
 */
item_use: function(thread, user_id, ooch, item_id) {
    let item_data = db.item_data.get(item_id);
    let ooch_pos_plr = db.profile.get(user_id, 'ooch_active_slot');
    const clamp = (num, min, max) => Math.min(Math.max(num, min), max);

    if (item_data.type == 'potion') {
        ooch.current_hp += Math.ceil(ooch.stats.hp * item_data.potency);
        ooch.current_hp = clamp(ooch.current_hp, 0, ooch.stats.hp);
        db.profile.set(user_id, ooch, `ooch_party[${ooch_pos_plr}]`);
    } else if (item_data.type == 'prism') {
        let status_bonus = 1;
        let prism_multiplier = item_data.potency;
        let prism_chance = prism_multiplier / ooch.level * (ooch.stats.hp / ooch.current_hp) * status_bonus;

        if (Math.random() < prism_chance) {
            return true;
        } else {
            return false;
        }
    }
    
},

/**
 * Add or subtract a stat to an Oochamon object. NOTE: THIS DOES NOT SET THE MULTIPLIER UNLESS YOU USE THE SET ARGUMENT!
 * @param {Object} ooch The oochamon object to change stat mulitipliers on.
 * @param {String} stat The stat to change (atk, def, spd, acc, or eva)
 * @param {number} mod_percent The amount to change it by (-1 to 1)
 * @param {Boolean} [set=false] Set the value instead of add to/subtract from the value.
 * @returns The Oochamon object with stats changed.
 */
modify_stat: function(ooch, stat, mod_percent, set = false) {
    switch(stat) {
        case 'atk': 
            ooch.stats.atk_mul = (set == true ? mod_percent : ooch.stats.atk_mul + mod_percent); 
            ooch.stats.atk_mul = _.clamp(ooch.stats.atk_mul, 0, 4); 
        break; 
        case 'def': 
            ooch.stats.def_mul = (set == true ? mod_percent : ooch.stats.def_mul + mod_percent);
            ooch.stats.def_mul = _.clamp(ooch.stats.def_mul, 0, 4); 
        break;
        case 'spd': 
            ooch.stats.spd_mul = (set == true ? mod_percent : ooch.stats.spd_mul + mod_percent);
            ooch.stats.spd_mul = _.clamp(ooch.stats.spd_mul, 0, 4); 
        break; 
        case 'acc': 
            ooch.stats.acc_mul = (set == true ? mod_percent : ooch.stats.acc_mul + mod_percent); 
            ooch.stats.acc_mul = _.clamp(ooch.stats.acc_mul, 0, 4); 
        break; 
        case 'eva': 
            ooch.stats.eva_mul = (set == true ? mod_percent : ooch.stats.eva_mul + mod_percent);
            ooch.stats.eva_mul = _.clamp(ooch.stats.eva_mul, 0, 4); 
        break;
    }

    return ooch;
},

/**
 * Have the oochs ability affect its stats, then return the ooch with its stats adjusted accordingly.
 * Read the generate.js to see what each ability does.
 * @param {Object} ooch The oochamon object to have affected by it's ability
 * @param {Array} ooch_inv The oochamon party array for the user
 * @returns The Oochamon object with changed stats..
 */
ability_stat_change: function(ooch, ooch_inv) {
    const { modify_stat } = require('./func_battle.js');
    switch (ooch.ability) {
        case 'Miniscule': 
            ooch = modify_stat(ooch, Stats.Evasion, -0.2); break;
        case 'Burdened': 
            ooch = modify_stat(ooch, Stats.Speed, -0.1);
            ooch = modify_stat(ooch, Stats.Defense, 0.15); break;
        case 'Tough':
            ooch = modify_stat(ooch, Stats.Defense, 0.1); break;
        case 'Gentle':
            ooch = modify_stat(ooch, Stats.Attack, 0.1); break;
        case 'Conflicted':
            ooch = modify_stat(ooch, Stats.Attack, 0.05);
            ooch = modify_stat(ooch, Stats.Defense, 0.05);
            ooch = modify_stat(ooch, Stats.Speed, 0.05);
            ooch = modify_stat(ooch, Stats.Accuracy, 0.05);
            ooch = modify_stat(ooch, Stats.Evasion, 0.05); break;
        case 'Dense':
            ooch = modify_stat(ooch, Stats.Attack, 0.1);
            ooch = modify_stat(ooch, Stats.Speed, -0.1); break;
        case 'Withering':
            ooch = modify_stat(ooch, Stats.Speed, 0.2); break;
        case 'Fleeting':
            ooch = modify_stat(ooch, Stats.Speed, 0.5);
            ooch = modify_stat(ooch, Stats.Attack, 0.5); break;
        case 'Uncontrolled':
            ooch = modify_stat(ooch, Stats.Attack, 0.3); break;
        case 'Immense':
            ooch = modify_stat(ooch, Stats.Defense, 0.3); break;
        case 'Inertia':
            ooch = modify_stat(ooch, Stats.Speed, 0.05); break;
        case 'Broodmother':
            ooch = modify_stat(ooch, Stats.Attack, -0.05); // Because it will include itself in the below for loop
            for (let ooch_i of ooch_inv) {
                if (ooch_i.type == ooch.type) {
                    ooch = modify_stat(ooch, Stats.Attack, 0.05);
                }
            } break;
        case 'Apprentice':
            for (let ooch_i of ooch_inv) {
                if (ooch_i.moveset.some(item => ooch.moveset.includes(item)) && ooch_i.id != ooch.id) {
                    ooch = modify_stat(ooch, Stats.Attack, 0.15);
                    break;
                }
            }
        break;
    }

    return ooch;
}, 

/**
 * Have the ooch object use its end of turn ability.
 * Read the generate.js to see what each ability does.
 * @param {Object} ooch The oochamon object to have affected by it's ability
 * @returns The Oochamon object that has been affected by an ability.
 */
use_eot_ability: function(ooch) {
    const { modify_stat } = require('./func_battle.js');
    switch(ooch.ability) {
        case 'Withering':
            ooch.current_hp -= Math.round(ooch.stats.hp * 0.05); break;
        case 'Fleeting':
            ooch.current_hp = Math.floor(ooch.current_hp / 2); break;
        case 'Efficient':
            ooch = modify_stat(ooch, 'atk', 0.05); break;
        case 'Focused':
            if (ooch.status_effects.length == 0) ooch = modify_stat(ooch, 'atk', 0.075); 
            break;
    }

    return ooch;
},

/**
 * Handle finishing an Oochamon battle and setting back up the playspace.
 * @param {Object} thread The thread Oochamon is being played in.
 * @param {String} user_id The user id of the user playing Oochamon.
 */
finish_battle: async function(thread, user_id) {
    const { event_process } = require('./func_event');

    db.profile.set(user_id, PlayerState.Playspace, 'player_state');
    db.profile.set(user_id, {}, 'ooch_enemy');
    await wait(10000);

    let msgs_to_delete = db.profile.get(user_id, 'battle_msg_counter');
    if (msgs_to_delete <= 100 && db.profile.get(user_id, 'settings.battle_cleanup') == true) {
        await thread.bulkDelete(msgs_to_delete)
    }

    // Reset Oochamon stat multipliers
    for (let i = 0; i < db.profile.get(user_id, 'ooch_party'); i++) {
        let ooch = db.profile.get(user_id, `ooch_party[${i}]`);
        ooch.atk_mul = 1;
        ooch.def_mul = 1;
        ooch.spd_mul = 1;
        ooch.acc_mul = 1;
        ooch.eva_mul = 1;
        db.profile.set(user_id, ooch, `ooch_party[${i}]`);
    }

    // Setup playspace
    let playspace_str = await setup_playspace_str(user_id);
    await db.profile.set(user_id, PlayerState.Playspace, 'player_state');

    await thread.send({ content: playspace_str }).then(msg => {
        db.profile.set(user_id, msg.id, 'display_msg_id');
    });

    let npc_event_data = db.profile.get(user_id, 'npc_event_data');
    let npc_event_pos = parseInt(db.profile.get(user_id, 'npc_event_pos'));
    if (npc_event_data.length != 0) {
        // If we have an NPC event obj, continue the event processing with our held event data info after the battle is done.
        event_process(user_id, thread, npc_event_data, npc_event_pos);
        db.profile.set(user_id, [], 'npc_event_data');
        db.profile.set(user_id, 0, 'npc_event_pos');
    }
},

/**
 * Handle leveling up an Oochamon, including
 * giving it new moves.
 * @param {Object} thread The thread object the game is being played in
 * @param {String} user_id The user id of the user playing
 * @param {Object} ooch The oochamon that is leveling up
 * @returns A modified Oochamon object that has had its stats changed and moves added.
 */
level_up: async function(thread, user_id, ooch) {
    // TODO: Handle getting new moves
    const { exp_to_next_level, get_stats } = require('./func_battle');
    let level_counter = 0;
    if (ooch.level != 50) {
        while (ooch.current_exp >= ooch.next_lvl_exp) {
            let new_exp = exp_to_next_level(ooch.level);
            let new_stats = get_stats(ooch.id, ooch.level, ooch.stats.hp_iv, ooch.stats.atk_iv, ooch.stats.def_iv, ooch.stats.spd_iv);
            ooch.stats.hp = new_stats[0]
            ooch.stats.atk = new_stats[1]
            ooch.stats.def = new_stats[2]
            ooch.stats.spd = new_stats[3]
            ooch.next_lvl_exp = new_exp;
            ooch.level += 1;
            level_counter += 1;
        }

        thread.send({ content: `⬆️ ${db.monster_data.get(ooch.id, 'emote')} **${ooch.nickname}** leveled up **${level_counter}** times!`});
        db.profile.inc(user_id, 'battle_msg_counter')
    }
    return ooch;
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
generate_battle_image: async function(thread, user_id, plr, enemy, is_npc_battle) {

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

    let canvas = new Canvas(480, 270);
    FontLibrary.use("main_med", ["./fonts/LEMONMILK-Medium.otf"]);
    let ctx = canvas.getContext("2d");
    const background = await loadImage('./battle_art/battle_background_temp.png');
    
    // This uses the canvas dimensions to stretch the image onto the entire canvas
    ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
    const plrSprite = await loadImage('./Art/tiles/t054.png')
    const oochPlr = await loadImage(`./resized_art/${plr.ooch_party[plr.ooch_active_slot].name}.png`);
    const enemySprite = await loadImage('./Art/tiles/t057.png')
    const oochEnemy = await loadImage(`./resized_art/${enemy.ooch_party[enemy.ooch_active_slot].name}.png`);
    const prismIcon = await loadImage('./Art/item_prism.png');
    let playerMemberObj = thread.guild.members.cache.get(user_id);
    const playerName = playerMemberObj.displayName;
    
    // Player
    ctx.font = `italic bold 20px main_med`;
    fillTextScaled(playerName, 'main_med', 20, 150, canvas, 'italic bold');
    ctx.fillText(playerName, 30, 120);

    // Player Prisms
    for (let i = 0; i < plr.ooch_party.length; i++) {
        ctx.drawImage(prismIcon, 30 + (30 * i), 125);
    }

    // Player Oochamon and Player Sprite
    flipDrawImage(ctx, plrSprite, 25, 210, true); // horizontal mirror
    flipDrawImage(ctx, oochPlr, 58, 170, true); // horizontal mirror
    ctx.font = `10px main_med`;
    ctx.fillText(`Lv. ${plr.ooch_party[plr.ooch_active_slot].level} ${plr.ooch_party[plr.ooch_active_slot].nickname}`, 65, 245)

    // Enemy
    ctx.font = `italic bold 20px main_med`;
    ctx.textAlign = 'right';
    ctx.fillText(is_npc_battle ? `${enemy.name}` : '', 450, 165);

    if (is_npc_battle) {
        // Enemy Prisms
        for (let i = 0; i < enemy.ooch_party.length; i++) {
            ctx.drawImage(prismIcon, 330 + (30 * i), 110);
        }

        // Enemy Sprite
        ctx.drawImage(enemySprite, 420, 75);
    }
    // Enemy Oochamon
    ctx.drawImage(oochEnemy, 350, 27);
    ctx.font = `10px main_med`;
    ctx.fillText(`Lv. ${enemy.ooch_party[enemy.ooch_active_slot].level} ${enemy.ooch_party[enemy.ooch_active_slot].nickname}`, 410, 100)
    ctx.textAlign = 'left';

    let pngData = await canvas.png;
    return pngData;
}

}