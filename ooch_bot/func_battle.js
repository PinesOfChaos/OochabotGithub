const db = require("./db")
const wait = require('wait');
const { ActionRowBuilder, ButtonBuilder, StringSelectMenuBuilder, ButtonStyle } = require('discord.js');
const _ = require('lodash');
const { TypeEmote, PlayerState } = require("./types.js");
const { setup_playspace_str } = require("./func_play");

module.exports = {

/**
 * Generate an Oochamon battle opponent for wild encounters.
 * @param {Array} ooch_inv The array of Oochamon in the party
 * @param {String} ooch_species I have no idea what this is
 * @param {Number} ooch_level The level of your primary oochamon?, defaults to 0
 * @returns The enemy Oochamon data in an object.
 */
generate_battle: function(ooch_inv, ooch_species, ooch_level = 0) {i

    const { get_stats, ability_stat_change } = require('./func_battle.js');

    let lvl = 0;
    let species = ooch_species

    // Setup stuff for the main players team
    for (let i = 0; i < ooch_inv.length; i++) {
        let ooch_data = ooch_inv[i];
        ooch_data = ability_stat_change(ooch_data, ooch_inv);

        // Get the highest level of players oochamon team
        if (i == 0) { 
            lvl = ooch_data.level;
            continue;
        } else if (ooch_data > lvl) {
            lvl = ooch_data.level;
        }

        ooch_inv[i] = ooch_data;
    }

    const clamp = (num, min, max) => Math.min(Math.max(num, min), max);
    lvl = ooch_level == 0 ? clamp((Math.floor(Math.random() * lvl * 1.05)), 1, 100) : ooch_level; //Formula for level generation

    // Get the evolution data
    let ooch_pick = species[_.random(0, species.length - 1)]
    let evo1_id = db.monster_data.get(ooch_pick, 'evo_id')
    let evo1_lvl = db.monster_data.get(ooch_pick, 'evo_lvl')
    let evo2_id = db.monster_data.get(evo1_id, 'evo_id')
    let evo2_lvl = db.monster_data.get(evo2_id, 'evo_lvl')
    let stage = 0;

    // Have a chance to make the wild oochamon be the evolved form
    let evo_chance = _.random(0, 1) + _.random(0, 1)
    if (evo_chance == 2 && lvl >= evo2_lvl && evo2_lvl != -1) {
        ooch_pick = evo2_id;
        stage = 2;
    } else if (evo_chance == 1 && lvl >= evo1_lvl && evo1_lvl != -1) {
        ooch_pick = evo1_id;
        stage = 1;
    }

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

    let stats = get_stats(ooch_pick, lvl, hp_iv, atk_iv, def_iv, spd_iv) //returns [hp, atk, def, spd]
    let hp = stats[0]
    let atk = stats[1]
    let def = stats[2]
    let spd = stats[3]  

    let learn_list = db.monster_data.get(ooch_pick, 'move_list').filter(x => x[0] <= lvl && x[0] != -1)
    let move_list =[];

    for(let i = 0; i < learn_list.length; i++){
        move_list[i] = learn_list[i][1]; //get only the move ID and put it in the move_list
    }

    // Make sure the move_list is 4 moves
    while (move_list.length > 4) {
        let rand_move_pos = _.random(0, move_list.length)
        move_list.splice(rand_move_pos, 1);
    }

    // Pick a random ability
    let ability_list = db.monster_data.get(ooch_pick, 'abilities');
    let rand_ability = ability_list[_.random(0, ability_list.length - 1)]

    let ooch_enemy = {
        name: 'Enemy',
        ooch_active_slot: 0,
        ooch_party:[{
            id: ooch_pick,
            name: db.monster_data.get(ooch_pick, 'name'),
            nickname: db.monster_data.get(ooch_pick, 'name'),
            item: -1,
            level: lvl,
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
            evo_stage: stage,
            alive: true,
            current_exp: 0,
            next_lvl_exp: lvl ** 3,
            type: db.monster_data.get(ooch_pick, 'type')
        }]
    }

    // Setup enemy ability stat changes
    ooch_enemy.ooch_party[0] = ability_stat_change(ooch_enemy.ooch_party[0], ooch_enemy.ooch_party);

    return ooch_enemy
},

/**
 * Handles all battle input and logic. The main battle function.
 * @param {Object} thread The thread that Oochamon is being played in.
 * @param {String} user_id The user id of the user playing Oochamon.
 */
prompt_battle_input: async function(thread, user_id) {

    const { type_to_emote, attack, end_of_round, victory_defeat_check, prompt_battle_input,
    item_use, finish_battle } = require('./func_battle.js');
    const wait = require('wait');

    // Get enemy oochamon data that was previously generated
    let ooch_enemy_profile = db.profile.get(user_id, 'ooch_enemy')
    let ooch_enemy = ooch_enemy_profile.ooch_party[ooch_enemy_profile.ooch_active_slot];
    // Get the players oochamon in the first spot of their party
    let ooch_plr = db.profile.get(user_id, `ooch_party[${db.profile.get(user_id, 'ooch_active_slot')}]`);
    let ooch_pos = db.profile.get(user_id, 'ooch_active_slot');
    let move_list = ooch_plr.moveset;
    let move_id, move_name, move_damage, move_accuracy, turn_order; // Battle variables

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('fight')
                .setLabel('Fight')
                .setStyle(ButtonStyle.Primary),
        ) .addComponents(
            new ButtonBuilder()
                .setCustomId('switch')
                .setLabel('Switch')
                .setStyle(ButtonStyle.Primary),
        );

    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('bag')
                .setLabel('Bag')
                .setStyle(ButtonStyle.Primary),
        ) .addComponents(
            new ButtonBuilder()
                .setCustomId('run')
                .setLabel('Run')
                .setStyle(ButtonStyle.Primary),
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
                .setEmoji('<:item_prism:1023031025716179076>'),
        ).addComponents(
            new ButtonBuilder()
                .setCustomId('back')
                .setLabel('Back')
                .setStyle(ButtonStyle.Danger),
        )

    thread.send({ content: `**---- Select An Action ----**`, components: [row, row2] })
    db.profile.inc(user_id, 'battle_msg_counter');

    const collector = thread.createMessageComponentCollector({ max: 1 });

    await collector.on('collect', async sel => {

        sel.update({ content: `Selected \`${sel.customId}\``, components: [] });

        switch (sel.customId) {
            case 'fight':

                // Get the player's Attack options
                for (let i = 0; i < move_list.length; i++) {
                    
                    move_id = move_list[i];
                    
                    move_name = db.move_data.get(`${move_id}`, 'name')
                    move_type = db.move_data.get(`${move_id}`, 'type')
                    move_damage = db.move_data.get(`${move_id}`, 'damage')
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
                thread.send({ content: `Select a move to use!`, components: [move_buttons]});
                db.profile.inc(user_id, 'battle_msg_counter');

                const atk_collector = thread.createMessageComponentCollector({ max: 1 });   

                await atk_collector.on('collect', async atk => {
                    await atk.update({ content: `Selected \`${db.move_data.get(atk.customId, 'name')}\``, components: [] });
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

                        // Victory/Defeat Check
                        let victory_check = await victory_defeat_check(thread, user_id, ooch_enemy, ooch_plr, false);
                        if (victory_check == true) return;

                    }

                    //Apply Status Effects and other end of turn stuff
                    await end_of_round(thread, user_id, ooch_plr, ooch_enemy);
                    
                    //Double check for Victory/Defeat after status effects have happened
                    let victory_check = await victory_defeat_check(thread, user_id, ooch_enemy, ooch_plr, true);
                    if (victory_check == true) return;

                    // Prompt for more input
                    await prompt_battle_input(thread, user_id);

                });

            break;
            case 'switch':
                //#region SWITCH
                let ooch_inv = db.profile.get(user_id, 'ooch_party')
                let ooch_check, ooch_emote, ooch_name, ooch_hp, ooch_button_color, ooch_prev_name, ooch_disable;

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
                    ooch_name = ((ooch_check.nickname != -1) ? ooch_check.nickname : ooch_check.name);
                    ooch_hp = `${ooch_check.current_hp}/${ooch_check.stats.hp} HP`;
                    ooch_button_color = ButtonStyle.Primary;
                    ooch_disable = false;

                    if (i == db.profile.get(user_id, 'ooch_active_slot')) {
                        ooch_button_color = ButtonStyle.Success;
                        ooch_prev_name = ooch_name;
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

                    let ooch_pick = db.profile.get(user_id, `ooch_party[${parseInt(ooch_sel.customId)}]`)
                    let ooch_pick_name = ((ooch_pick.nickname != -1) ? ooch_pick.nickname : ooch_pick.name);
                    await ooch_sel.update({ content: `**------------ Player Turn ------------**` + 
                    `\nYou switched your active Oochamon from **${ooch_prev_name}** to **${ooch_pick_name}**.`, components: [] })
                    
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
                
                if (heal_inv_keys.length == 0) bag_buttons.components[0].disabled = true;
                if (prism_inv_keys.length == 0) bag_buttons.components[1].disabled = true;
                if (heal_inv_keys.length == 0 && prism_inv_keys.length == 0) {
                    thread.send(`You don't have any items, so you can't use any!` +
                    `\nSelect a different action!`)
                    db.profile.inc(user_id, 'battle_msg_counter');

                    await prompt_battle_input(thread, user_id);
                    return;
                }

                thread.send({ content: `Select the item category you'd like to use an item in!`, components: [bag_buttons]});
                db.profile.inc(user_id, 'battle_msg_counter');

                const b_collector = thread.createMessageComponentCollector({ componentType: 'BUTTON' });
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
                            })
                        }

                        bag_select.addComponents(
                            new StringSelectMenuBuilder()
                                .setCustomId('heal_select')
                                .setPlaceholder('Select an item in your heal inventory to use!')
                                .addOptions(heal_select_options),
                        );

                        await i_sel.update({ content: `Select the healing item you'd like to use!`, components: [bag_buttons, bag_select] })

                        heal_collector = thread.createMessageComponentCollector({ componentType: 'SELECT_MENU', max: 1 });

                        await heal_collector.on('collect', async item_sel => {
                            let item_id = item_sel.values[0];
                            let item_data = db.item_data.get(item_id);

                            if (db.profile.get(user_id, `heal_inv.${item_id}`) == undefined) return;

                            item_use(thread, user_id, ooch_plr, item_id)
                            item_sel.update({ content: `**------------ Player Turn ------------**\n` +
                            `${item_data.emote} Used **${item_data.name}** and healed ${item_data.value * 100}% of ${ooch_plr.name}'s HP!\n`, components: []});
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
                            })
                        }

                        bag_select.addComponents(
                            new StringSelectMenuBuilder()
                                .setCustomId('prism_select')
                                .setPlaceholder('Select a prism you\'d like to use!')
                                .addOptions(prism_select_options),
                        );

                        await i_sel.update({ content: `Select the prism you'd like to use!`, components: [bag_buttons, bag_select] })

                        prism_collector = thread.createMessageComponentCollector({ componentType: 'SELECT_MENU', max: 1 });

                        await prism_collector.on('collect', async item_sel => { 
                            let item_id = item_sel.values[0];
                            let item_data = db.item_data.get(item_id);
                            if (db.profile.get(user_id, `prism_inv.${item_id}`) == undefined) return;

                            item_sel.update({ content: `**------------ Player Turn ------------**\n` +
                            `${item_data.emote} Used a **${item_data.name}** on the Enemy ${ooch_enemy.name}\n`, components: []});
                            db.profile.math(user_id, '-', 1, `prism_inv.${item_id}`)
                            let prism_result = item_use(thread, user_id, ooch_enemy, item_id)
                            b_collector.stop();
                            prism_collector.stop();
                            if (heal_collector != undefined) heal_collector.stop();

                            // If we caught the Oochamon successfully
                            if (prism_result == true) { 
                                if (db.profile.get(user_id, 'ooch_party').length < 6) {
                                    db.profile.push(user_id, ooch_enemy, `ooch_party`);
                                } else {
                                    db.profile.push(user_id, ooch_enemy, `ooch_pc`)
                                }
                                db.profile.math(user_id, '+', 1, `oochadex[${ooch_enemy.id}].caught`)
                                await finish_battle(thread, user_id);
                                return;
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
    let damage = Math.round(Math.ceil((2 * ooch_attacker.level / 5 + 2) * move_damage * ooch_attacker.stats.atk * ooch_attacker.stats.atk_mul / ooch_defender.stats.def * ooch_defender.stats.def_mul) / 50 + 2);
    const clamp = (num, min, max) => Math.min(Math.max(num, min), max);
    
    switch (move_type) {
        case 'Ooze': 
            if (ooch_attacker.ability == 'Icky') Math.round(damage *= 1.1); break;
        case 'Fungal':
            if (ooch_attacker.ability == 'Icky') Math.round(damage *= 1.1); break;
        case 'Flame':
            if (ooch_attacker.ability == 'Warm') Math.round(damage *= 1.1);
            if (ooch_defender.ability == 'Moist') Math.round(damage *= 0.5); break;
        case 'Stone':
            if (ooch_attacker.ability == 'Burrower') Math.round(damage *= 1.1);
            if (ooch_defender.ability == 'Armored') Math.round(damage *= 0.80); break;
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

    for (let type in type_string) {
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
 * @param {String} string_to_send The string to send to the battle message
 * @returns An array of the attacker and defender Oochamon data, after the attacks.
 */
attack: async function(thread, user_id, atk_id, attacker, defender, string_to_send) {
    const { type_effectiveness, battle_calc_damage } = require('./func_battle.js');

    const clamp = (num, min, max) => Math.min(Math.max(num, min), max);
    let move_name =     db.move_data.get(atk_id, 'name');
    let move_type =     db.move_data.get(atk_id, 'type');
    let move_damage =   db.move_data.get(atk_id, 'damage');
    let move_accuracy = db.move_data.get(atk_id, 'accuracy');
    let move_effect =   db.move_data.get(atk_id, 'effect');
    let move_chance =   db.move_data.get(atk_id, 'chance');
    let type_multiplier = type_effectiveness(move_type, defender.type); //Returns [multiplier, string] 
    let crit_multiplier = (Math.random() > (0.95 - (move_effect == 'critical' ? move_chance/10 : 0)) ? 2 : 1);
    let status_blind = (attacker.status_effects.includes('blinded') ? .75 : 1);
    let status_doubled = (defender.status_effects.includes('doubled') ? 2 : 1);
    let recoil_damage = Math.round((move_effect == 'recoil' ? 0 : move_chance/100) * attacker.stats.hp);
    let vampire_heal = (move_effect == 'vampire' ? 0 : move_chance/100);

    dmg = battle_calc_damage(move_damage * type_multiplier[0] * crit_multiplier * status_doubled, move_type, attacker, defender);
    vampire_heal = Math.round(vampire_heal * dmg); //used later

    if ((move_accuracy/100 * status_blind > Math.random()) || (defender.ability == 'Immense')) {
        defender.current_hp -= dmg
        defender.current_hp = clamp(defender.current_hp, 0, defender.stats.hp);

        attacker.hp += _.clamp(vampire_heal + attacker.hp, 0, attacker.stats.hp);
        attacker.current_hp -= recoil_damage;
        

        // Check for on hit abilities
        switch (attacker.ability) {
            case 'Leech':
                attacker.current_hp = _.clamp(attacker.current_hp + Math.round(dmg * 0.1), 0, attacker.stats.hp); break;
        }

        string_to_send +=  `\n${attacker.name} uses ${move_name} and deals **${dmg} damage** to the opposing ${defender.name}!`
        
        //If a crit lands
        if(crit_multiplier >= 2){
            string_to_send += `\n**A critical hit!**`
        }

        //If a attack has vampire
         if(vampire_heal > 0){
            string_to_send += `\n**${attacker.name} restored some HP!**`
        }

        //If attack has recoil
        if(recoil_damage > 0){
            string_to_send += `\n**${attacker.name} lost HP due to recoil!**`
        }

       

        //Type effectiveness
        string_to_send += type_multiplier[1];

        if(Math.random() < move_chance/100 && move_chance > 0){ //Apply status effect
            string_to_send += `\nThe opposing ${defender.name} was **${move_effect.toUpperCase()}!**`
            defender.status_effects.push(move_effect);
        }
        else if(-Math.random() > move_chance/100 && move_chance < 0){
            string_to_send += `\n${attacker.name} was **${move_effect.toUpperCase()}!**`
            attacker.status_effects.push(move_effect);
        }
    }
    else {
        string_to_send +=  `\n${attacker.name} used ${move_name} but it missed!`
    }

    await thread.send(string_to_send)
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
    
    multiplier = min(8,max(.125,multiplier))

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
 * Check if we've won the battle or lost the battle.
 * @param {Object} thread The thread Oochamon is being played in.
 * @param {String} user_id The user id of the user playing Oochamon.
 * @param {Object} ooch_enemy The Oochamon object for the enemy
 * @param {Object} ooch_plr The Oochamon object for the player
 * @param {Boolean} is_turn_end If it's the end of a turn
 * @returns 
 */
victory_defeat_check: async function(thread, user_id, ooch_enemy, ooch_plr, is_turn_end) {

    const { prompt_battle_input, finish_battle } = require('./func_battle.js');
    let ooch_arr, slot_to_send, enemy_profile, oochabux;

    const switch_buttons_1_die = new ActionRowBuilder();
    const switch_buttons_2_die = new ActionRowBuilder();

    // Victory/Defeat Check
    if (ooch_enemy.current_hp <= 0) { // Victory
        slot_to_send = -1;
        enemy_profile = db.profile.get(user_id, 'ooch_enemy');
        ooch_arr = enemy_profile.ooch_party;
        oochabux = _.random(5, 40)

        for (let i = 0; i < ooch_arr.length; i++) {
            if (ooch_arr[i].current_hp > 0 && slot_to_send == -1) {
                slot_to_send = i;
            }
        }

        if (slot_to_send == -1) { //if there is no slot to send in
            thread.send(`**You win!**\nYou gain ${oochabux} Oochabux!\nYour playspace will re-appear momentarily.`);
            db.profile.inc(user_id, 'battle_msg_counter');
            db.profile.inc(user_id, oochabux, 'oochabux');
            db.profile.set(user_id, 0, 'ooch_active_slot');
            await finish_battle(thread, user_id);
            return true;
        } else if (slot_to_send == -1) {
            thread.send(`${enemy_profile.name} sends out ${ooch_arr[slot_to_send].name}!`);
            db.profile.inc(user_id, 'battle_msg_counter');
            db.profile.set(user_id, slot_to_send, `ooch_enemy.ooch_active_slot`);
        }
    } else if (ooch_plr.current_hp <= 0) { // Defeat
        slot_to_send = -1;
        ooch_arr = db.profile.get(user_id, 'ooch_party');
        oochabux = _.random(5, 10)

        for (let i = 0; i < ooch_arr.length; i++) {
            if (ooch_arr[i].current_hp > 0 && slot_to_send == -1) {
                slot_to_send = i;
            }
        }

        if (slot_to_send == -1) { //if there is no slot to send in
            thread.send(`**You lose...**\nYou lose ${oochabux} Oochabux.\nYour playspace will re-appear momentarily.`);
            db.profile.inc(user_id, 'battle_msg_counter');
            db.profile.dec(user_id, oochabux, 'oochabux');
            db.profile.set(user_id, 0, 'ooch_active_slot');
            await finish_battle(thread, user_id);
            return true;
        } else if (is_turn_end) {
            let ooch_inv = db.profile.get(user_id, 'ooch_party');
            let ooch_check, ooch_emote, ooch_name, ooch_hp, ooch_button_color, ooch_prev_name, ooch_disable;

            for (let i = 0; i < ooch_inv.length; i++) {
                ooch_check = ooch_inv[i];
                ooch_emote = db.monster_data.get([ooch_check.id], 'emote');
                ooch_name = ((ooch_check.nickname != -1) ? ooch_check.nickname : ooch_check.name);
                ooch_hp = `${ooch_check.current_hp}/${ooch_check.stats.hp} HP`;
                ooch_button_color = ButtonStyle.Primary;
                ooch_disable = false;

                if (i == db.profile.get(user_id, 'ooch_active_slot')) {
                    ooch_button_color = ButtonStyle.Success;
                    ooch_prev_name = ooch_name;
                    ooch_disable = true;
                } else if (ooch_check.current_hp <= 0) {
                    ooch_button_color = ButtonStyle.Primary;
                    ooch_disable = true;
                }

                ((i <= 2) ? switch_buttons_1_die : switch_buttons_2_die).addComponents(
                    new ButtonBuilder()
                        .setCustomId(`${i}`)
                        .setLabel(`${ooch_name} (${ooch_hp})`)
                        .setStyle(ooch_button_color)
                        .setEmoji(ooch_emote)
                        .setDisabled(ooch_disable),
                )
            }

            await thread.send({ content: `Select the new Oochamon you want to switch in!`, components: (switch_buttons_2_die.components.length != 0) ? [switch_buttons_1_die, switch_buttons_2_die] : [switch_buttons_1_die] })
            db.profile.inc(user_id, 'battle_msg_counter');

            const s_collector_d = thread.createMessageComponentCollector({ max: 1 });

            await s_collector_d.on('collect', async ooch_sel => {
                let ooch_pick = db.profile.get(user_id, `ooch_party[${parseInt(ooch_sel.customId)}]`)
                let ooch_pick_name = ((ooch_pick.nickname != -1) ? ooch_pick.nickname : ooch_pick.name);
                await ooch_sel.update({ content: `**------------ Player Turn ------------**` + 
                `\nCome on out **${ooch_pick_name}**!`, components: [] })

                let ooch_pos = parseInt(ooch_sel.customId);
                ooch_plr = db.profile.get(user_id, `ooch_party[${ooch_pos}]`);
                db.profile.set(user_id, ooch_pos, 'ooch_active_slot');

                prompt_battle_input(thread, user_id);
            });

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
    const { generate_hp_bar, use_eot_ability } = require('./func_battle.js');

    let ooch_list = [ooch_plr, ooch_enemy];
    let ooch_status_emotes = [[], []]; // 0 is ooch_plr, 1 is ooch_enemy
    let string_to_send = `**------------ End of Round ------------**`;

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
                case 'burned': ooch_status_emotes[i].push(`<:status_burned:1023031032083128441>`); break;
                case 'infected': ooch_status_emotes[i].push(`<:status_infected:1023031033744076930>`); break;
                case 'blinded': ooch_status_emotes[i].push(`<:status_blinded:1023031030837416057>`); break;
                case 'digitized': ooch_status_emotes[i].push(`<:status_digitized:1023031032934576178>`); break;
                case 'snared': ooch_status_emotes[i].push(`<:status_snared:1023031034733940798>`); break;
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

    let ooch_pos_plr = db.profile.get(user_id, 'ooch_active_slot');
    let ooch_pos_enemy = db.profile.get(user_id, 'ooch_enemy.ooch_active_slot');

    // Update the ooch objects at the end of the turn so that it stays across the battle
    db.profile.set(user_id, ooch_enemy, `ooch_enemy.ooch_party[${ooch_pos_enemy}]`);
    db.profile.set(user_id, ooch_plr, `ooch_party[${ooch_pos_plr}]`);

    let plr_hp_string = generate_hp_bar(ooch_plr, 'plr');
    let en_hp_string = generate_hp_bar(ooch_enemy, 'enemy');
    string_to_send += `${plr_hp_string} ${ooch_status_emotes[0].join(' ')}\n${en_hp_string} ${ooch_status_emotes[1].join(' ')}`

    db.profile.inc(user_id, 'battle_turn_counter');
    
    await thread.send(string_to_send)
    db.profile.inc(user_id, 'battle_msg_counter');
    
},

/**
 * Generate a custom emote HP bar for use in Oochamon battles.
 * @param {Object} ooch The oochamon data.
 * @param {String} style The style of the HP bar (plr/enemy)
 * @returns The generated HP emote string for the Oochamon.
 */
generate_hp_bar: function(ooch, style) {
    let hp_string = ``;
    let hp_sec = (ooch.stats.hp / 10);
    let hp = ooch.current_hp;
    let sections = (hp / hp_sec > 0 ? Math.ceil(hp / hp_sec) : 0);
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

    hp_string += `\`HP: ${hp}/${ooch.stats.hp}\`\n**\`Lvl: ${ooch.level}\`**`;

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
    let item_data = db.item_data.get(item);
    let ooch_pos_plr = db.profile.get(user_id, 'ooch_active_slot');
    const clamp = (num, min, max) => Math.min(Math.max(num, min), max);

    if (item_data.type == 'potion') {
        ooch.current_hp += Math.ceil(ooch.stats.hp * item_data.value);
        ooch.current_hp = clamp(ooch.current_hp, 0, ooch.stats.hp);
        db.profile.set(user_id, ooch, `ooch_party[${ooch_pos_plr}]`);
    } else if (item_data.type == 'prism') {
        let status_bonus = 1;
        let prism_multiplier = item_data.value;
        let prism_chance = prism_multiplier / ooch.level * (ooch.stats.hp / ooch.current_hp) * status_bonus;

        if (Math.random() < prism_chance) {
            thread.send(`**You successfully caught the wild ${ooch.name}!**\nIt's been added to your party, or to your PC if your party is full.\n` +
            `Your playspace should appear momentarily.`);
            db.profile.inc(user_id, 'battle_msg_counter');
            return true;
        } else {
            thread.send(`Unfortunately, your prism catch attempt failed...`);
            db.profile.inc(user_id, 'battle_msg_counter');
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
            ooch = modify_stat(ooch, 'eva', -0.2); break;
        case 'Burdened': 
            ooch = modify_stat(ooch, 'spd', -0.1);
            ooch = modify_stat(ooch, 'def', 0.15); break;
        case 'Tough':
            ooch = modify_stat(ooch, 'def', 0.1); break;
        case 'Gentle':
            ooch = modify_stat(ooch, 'atk', 0.1); break;
        case 'Conflicted':
            ooch = modify_stat(ooch, 'atk', 0.05);
            ooch = modify_stat(ooch, 'def', 0.05);
            ooch = modify_stat(ooch, 'spd', 0.05);
            ooch = modify_stat(ooch, 'acc', 0.05);
            ooch = modify_stat(ooch, 'eva', 0.05); break;
        case 'Dense':
            ooch = modify_stat(ooch, 'atk', 0.1);
            ooch = modify_stat(ooch, 'spd', -0.1); break;
        case 'Withering':
            ooch = modify_stat(ooch, 'spd', 0.2); break;
        case 'Fleeting':
            ooch = modify_stat(ooch, 'spd', 0.5);
            ooch = modify_stat(ooch, 'atk', 0.5); break;
        case 'Uncontrolled':
            ooch = modify_stat(ooch, 'atk', 0.3); break;
        case 'Immense':
            ooch = modify_stat(ooch, 'def', 0.3); break;
        case 'Broodmother':
            ooch = modify_stat(ooch, 'atk', -0.05); // Because it will include itself in the below for loop
            for (let ooch_i of ooch_inv) {
                if (ooch_i.name == 'Sporbee' || ooch_i.name == 'Stingrowth' || ooch_i.name == 'Queenect') {
                    ooch = modify_stat(ooch, 'atk', 0.05);
                }
            } break;
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
    db.profile.set(user_id, PlayerState.Playspace, 'player_state');
    db.profile.set(user_id, {}, 'ooch_enemy');
    await wait(5000);

    let msgs_to_delete = db.profile.get(user_id, 'battle_msg_counter');
    if (msgs_to_delete <= 100) {
        thread.bulkDelete(msgs_to_delete)
    }

    // Setup playspace
    let playspace_str = await setup_playspace_str(user_id);
    await db.profile.set(user_id, PlayerState.Playspace, 'player_state');

    await thread.send({ content: playspace_str }).then(msg => {
        db.profile.set(user_id, msg.id, 'display_msg_id');
    });
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
    const { exp_to_next_level } = require('./func_battle');
    let new_exp = exp_to_next_level(ooch.level);
    ooch.next_lvl_exp = new_exp;
    ooch.level += 1;
    return ooch;
}
}