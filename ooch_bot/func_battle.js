const db = require("./db")
const wait = require('wait');
const Discord = require('discord.js');
const _ = require('lodash');

module.exports = {

type_emotes: {
    FLAME: '<:icon_flame:1023031001611501648>',
    FLAME_LABEL: '<:icon_flame_txt:1023031002408439939>',
    FUNGAL: '<:icon_fungal:1023031003381514280>',
    FUNGAL_LABEL: '<:icon_fungal_txt:1023031004220362802>',
    MAGIC: '<:icon_magic:1023031009966575686>',
    MAGIC_LABEL: '<:icon_magic_txt:1023031010818015292>',
    NEUTRAL: '<:icon_neutral:1023031011703013376>',
    NEUTRAL_LABEL: '<:icon_neutral_txt:1023031012495732746>',
    OOZE: '<:icon_ooze:1023031013355569262>',
    OOZE_LABEL: '<:icon_ooze_txt:1023031014735491082>',
    STONE: '<:icon_stone:1023031015830204448>',
    STONE_LABEL: '<:icon_stone_txt:1023031016845217832>',
    TECH: '<:icon_tech:1023031017730224139>',
    TECH_LABEL: '<:icon_tech_txt:1023031018896240640>',
    VOID: '<:icon_void:1023031019466653738>',
    VOID_LABEL: '<:icon_void_txt:1023031020804645005>'
},

generate_battle: function(ooch_inv, ooch_species) {

    const { get_stats, ability_stat_change } = require('./func_battle.js');

    // Get the wild oochamon's level
    let ooch_inv_arr = Object.keys(ooch_inv)
    let lvl = 0;
    let species = ooch_species

    // Setup stuff for the main players team
    for (let i = 0; i < ooch_inv_arr.length; i++) {
        let ooch_data = ooch_inv[ooch_inv_arr[i]];
        ooch_data = ability_stat_change(ooch_data, ooch_inv);

        // Get the highest level of players oochamon team
        if (i == 0) { 
            lvl = ooch_data.level;
            continue;
        } else if (ooch_data > lvl) {
            lvl = ooch_data.level;
        }

        ooch_inv[ooch_inv_arr[i]] = ooch_data;
    }

    const clamp = (num, min, max) => Math.min(Math.max(num, min), max);
    lvl = clamp((Math.floor(Math.random() * lvl * 1.05)), 1, 100); //Formula for level generation

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

prompt_battle_input: async function(thread, message) {

    const { type_to_emote, attack, end_of_round, victory_defeat_check, prompt_battle_input,
    item_use } = require('./func_battle.js');
    const wait = require('wait');
    const Discord = require('discord.js');

    // Get enemy oochamon data that was previously generated
    let ooch_enemy_profile = db.profile.get(message.author.id, 'ooch_enemy')
    let ooch_enemy = ooch_enemy_profile.ooch_party[ooch_enemy_profile.ooch_active_slot];
    // Get the players oochamon in the first spot of their party
    let ooch_plr = db.profile.get(message.author.id, `ooch_party[${db.profile.get(message.author.id, 'ooch_active_slot')}]`);
    let ooch_pos = db.profile.get(message.author.id, 'ooch_active_slot');
    let move_list = ooch_plr.moveset;
    let move_id, move_name, move_damage, move_accuracy, turn_order; // Battle variables

    const row = new Discord.MessageActionRow()
        .addComponents(
            new Discord.MessageButton()
                .setCustomId('fight')
                .setLabel('Fight')
                .setStyle('PRIMARY'),
        ) .addComponents(
            new Discord.MessageButton()
                .setCustomId('switch')
                .setLabel('Switch')
                .setStyle('PRIMARY'),
        );

    const row2 = new Discord.MessageActionRow()
        .addComponents(
            new Discord.MessageButton()
                .setCustomId('bag')
                .setLabel('Bag')
                .setStyle('PRIMARY'),
        ) .addComponents(
            new Discord.MessageButton()
                .setCustomId('run')
                .setLabel('Run')
                .setStyle('PRIMARY'),
        );
    
    const move_buttons = new Discord.MessageActionRow();
    const switch_buttons_1 = new Discord.MessageActionRow();
    const switch_buttons_2 = new Discord.MessageActionRow();
    const bag_buttons = new Discord.MessageActionRow()
        .addComponents(
            new Discord.MessageButton()
                .setCustomId('heal_button')
                .setLabel('Healing')
                .setStyle('PRIMARY')
                .setEmoji('<:item_potion_magic:1023031024726327426>'),
        ).addComponents(
            new Discord.MessageButton()
                .setCustomId('prism_button')
                .setLabel('Prism')
                .setStyle('PRIMARY')
                .setEmoji('<:item_prism:1023031025716179076>'),
        ).addComponents(
            new Discord.MessageButton()
                .setCustomId('back')
                .setLabel('Back')
                .setStyle('DANGER'),
        )

    thread.send({ content: `**---- Select An Action ----**`, components: [row, row2] })

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
                        new Discord.MessageButton()
                            .setCustomId(`${move_id}`)
                            .setLabel(`${move_name}`)
                            .setStyle('PRIMARY')
                            .setEmoji(type_to_emote(move_type))
                    )
                }

                //Select the move to use
                thread.send({ content: `Select a move to use!`, components: [move_buttons]});

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
                            [ooch_plr, ooch_enemy] = await attack(thread, message, atk_id, ooch_plr, ooch_enemy, '**------------ Player Turn ------------**');
                        } else {
                            // Enemy attacks player
                            atk_id = ooch_enemy.moveset[_.random(0,ooch_enemy.moveset.length-1)];
                            [ooch_enemy, ooch_plr] = await attack(thread, message, atk_id, ooch_enemy, ooch_plr, '**------------ Enemy Turn ------------**');
                        }

                        // Victory/Defeat Check
                        let victory_check = await victory_defeat_check(thread, message, ooch_enemy, ooch_plr, false);
                        if (victory_check == true) return;

                    }

                    //Apply Status Effects and other end of turn stuff
                    await end_of_round(thread, message, ooch_plr, ooch_enemy);
                    
                    //Double check for Victory/Defeat after status effects have happened
                    let victory_check = await victory_defeat_check(thread, message, ooch_enemy, ooch_plr, true);
                    if (victory_check == true) return;

                    // Prompt for more input
                    await prompt_battle_input(thread, message);

                });

            break;
            case 'switch':
                //#region SWITCH
                let ooch_inv = db.profile.get(message.author.id, 'ooch_party')
                let ooch_check, ooch_emote, ooch_name, ooch_hp, ooch_button_color, ooch_prev_name, ooch_disable;

                // Check if we have only 1 oochamon.
                if (ooch_inv.length == 1) {
                    thread.send('You only have 1 oochamon in your party, so you cannot switch.' +
                    '\nSelect a different action!');
                    
                    // Prompt for more input
                    await prompt_battle_input(thread, message);
                    return;
                }

                for (let i = 0; i < ooch_inv.length; i++) {
                    ooch_check = ooch_inv[i];
                    ooch_emote = db.monster_data.get([ooch_check.id], 'emote');
                    ooch_name = ((ooch_check.nickname != -1) ? ooch_check.nickname : ooch_check.name);
                    ooch_hp = `${ooch_check.current_hp}/${ooch_check.stats.hp} HP`;
                    ooch_button_color = 'PRIMARY';
                    ooch_disable = false;

                    if (i == db.profile.get(message.author.id, 'ooch_active_slot')) {
                        ooch_button_color = 'SUCCESS';
                        ooch_prev_name = ooch_name;
                        ooch_disable = true;
                    }
                    else if (ooch_check.current_hp <= 0) {
                        ooch_disable = true;
                    }

                    ((i <= 2) ? switch_buttons_1 : switch_buttons_2).addComponents(
                        new Discord.MessageButton()
                            .setCustomId(`${i}`)
                            .setLabel(`${ooch_name} (${ooch_hp})`)
                            .setStyle(ooch_button_color)
                            .setEmoji(ooch_emote)
                            .setDisabled(ooch_disable),
                    )
                }

                thread.send({ content: `**------------ Player Turn ------------**` + 
                `\nSelect the new Oochamon you want to switch in!`, components: (switch_buttons_2.components.length != 0) ? [switch_buttons_1, switch_buttons_2] : [switch_buttons_1] })

                const s_collector = thread.createMessageComponentCollector({ max: 1 });

                await s_collector.on('collect', async ooch_sel => {

                    let ooch_pick = db.profile.get(message.author.id, `ooch_party[${parseInt(ooch_sel.customId)}]`)
                    let ooch_pick_name = ((ooch_pick.nickname != -1) ? ooch_pick.nickname : ooch_pick.name);
                    await ooch_sel.update({ content: `**------------ Player Turn ------------**` + 
                    `\nYou switched your active Oochamon from **${ooch_prev_name}** to **${ooch_pick_name}**.`, components: [] })
                    
                    ooch_pos = parseInt(ooch_sel.customId);
                    ooch_plr = db.profile.get(message.author.id, `ooch_party[${ooch_pos}]`);
                    db.profile.set(message.author.id, ooch_pos, 'ooch_active_slot');

                    // Enemy attacks player
                    let atk_id = ooch_enemy.moveset[_.random(0,ooch_enemy.moveset.length-1)];
                    [ooch_enemy, ooch_plr] = await attack(thread, message, atk_id, ooch_enemy, ooch_plr, '**------------ Enemy Turn ------------**');

                    //Apply Status Effects and other end of turn stuff
                    await end_of_round(thread, message, ooch_plr, ooch_enemy);                        

                    // Victory/Defeat Check
                    let victory_check = await victory_defeat_check(thread, message, ooch_enemy, ooch_plr, true);
                    if (victory_check == true) return;

                    // Prompt for more input
                    await prompt_battle_input(thread, message);

                });
                //#endregion
            break;
            case 'bag':
                //#region BAG
                let heal_inv = db.profile.get(message.author.id, 'heal_inv')
                let heal_inv_keys = Object.keys(heal_inv);
                let prism_inv = db.profile.get(message.author.id, 'prism_inv')
                let prism_inv_keys = Object.keys(prism_inv);
                let bag_select = new Discord.MessageActionRow();
                
                if (heal_inv_keys.length == 0) bag_buttons.components[0].disabled = true;
                if (prism_inv_keys.length == 0) bag_buttons.components[1].disabled = true;
                if (heal_inv_keys.length == 0 && prism_inv_keys.length == 0) {
                    thread.send(`You don't have any items, so you can't use any!` +
                    `\nSelect a different action!`)

                    await prompt_battle_input(thread, message);
                    return;
                }

                thread.send({ content: `Select the item category you'd like to use an item in!`, components: [bag_buttons]});

                const b_collector = thread.createMessageComponentCollector({ componentType: 'BUTTON' });
                let prism_collector;
                let heal_collector;

                await b_collector.on('collect', async i_sel => {

                    if (i_sel.customId == 'back') {
                        b_collector.stop();
                        i_sel.update({ content: `Backed out of bag menu.`, components: [] });
                        await prompt_battle_input(thread, message);
                        return;
                    }

                    if (prism_collector != undefined) prism_collector.stop();
                    if (heal_collector != undefined) heal_collector.stop();

                    if (i_sel.customId == 'heal_button') {
                        bag_select = new Discord.MessageActionRow();
                        let heal_select_options = [];
                        for (let i = 0; i < heal_inv_keys.length; i++) {
                            let id = heal_inv_keys[i];
                            let amount = db.profile.get(message.author.id, `heal_inv.${heal_inv_keys[i]}`)

                            heal_select_options.push({ 
                                label: `${db.item_data.get(id, 'name')} (${amount})`,
                                description: db.item_data.get(id, 'description'),
                                value: `${id}`,
                            })
                        }

                        bag_select.addComponents(
                            new Discord.MessageSelectMenu()
                                .setCustomId('heal_select')
                                .setPlaceholder('Select an item in your heal inventory to use!')
                                .addOptions(heal_select_options),
                        );

                        await i_sel.update({ content: `Select the healing item you'd like to use!`, components: [bag_buttons, bag_select] })

                        heal_collector = thread.createMessageComponentCollector({ componentType: 'SELECT_MENU', max: 1 });

                        await heal_collector.on('collect', async item_sel => {
                            let item_id = item_sel.values[0];
                            let item_data = db.item_data.get(item_id);

                            if (db.profile.get(message.author.id, `heal_inv.${item_id}`) == undefined) return;

                            item_use(thread, message, ooch_plr, item_id)
                            item_sel.update({ content: `**------------ Player Turn ------------**\n` +
                            `${item_data.emote} Used **${item_data.name}** and healed ${item_data.value * 100}% of ${ooch_plr.name}'s HP!\n`, components: []});
                            db.profile.math(message.author.id, '-', 1, `heal_inv.${item_id}`)
                            b_collector.stop();
                            if (prism_collector != undefined) prism_collector.stop();
                            heal_collector.stop();

                            // Enemy attacks player
                            let atk_id = ooch_enemy.moveset[_.random(0,ooch_enemy.moveset.length-1)];
                            [ooch_enemy, ooch_plr] = await attack(thread, message, atk_id, ooch_enemy, ooch_plr, '**------------ Enemy Turn ------------**');

                            //Apply Status Effects and other end of turn stuff
                            await end_of_round(thread, message, ooch_plr, ooch_enemy);                        

                            // Victory/Defeat Check
                            let victory_check = await victory_defeat_check(thread, message, ooch_enemy, ooch_plr, true);
                            if (victory_check == true) return;

                            // Prompt for more input
                            await prompt_battle_input(thread, message);
                        });

                    } else if (i_sel.customId == 'prism_button') {

                        bag_select = new Discord.MessageActionRow();
                        let prism_select_options = [];
                        for (let i = 0; i < prism_inv_keys.length; i++) {
                            let id = prism_inv_keys[i];
                            let amount = db.profile.get(message.author.id, `prism_inv.${prism_inv_keys[i]}`)

                            prism_select_options.push({ 
                                label: `${db.item_data.get(id, 'name')} (${amount})`,
                                description: db.item_data.get(id, 'description'),
                                value: `${id}`,
                            })
                        }

                        bag_select.addComponents(
                            new Discord.MessageSelectMenu()
                                .setCustomId('prism_select')
                                .setPlaceholder('Select a prism you\'d like to use!')
                                .addOptions(prism_select_options),
                        );

                        await i_sel.update({ content: `Select the prism you'd like to use!`, components: [bag_buttons, bag_select] })

                        prism_collector = thread.createMessageComponentCollector({ componentType: 'SELECT_MENU', max: 1 });

                        await prism_collector.on('collect', async item_sel => { 
                            let item_id = item_sel.values[0];
                            let item_data = db.item_data.get(item_id);
                            if (db.profile.get(message.author.id, `prism_inv.${item_id}`) == undefined) return;

                            item_sel.update({ content: `**------------ Player Turn ------------**\n` +
                            `${item_data.emote} Used a **${item_data.name}** on the Enemy ${ooch_enemy.name}\n`, components: []});
                            db.profile.math(message.author.id, '-', 1, `prism_inv.${item_id}`)
                            let prism_result = item_use(thread, message, ooch_enemy, item_id)
                            b_collector.stop();
                            prism_collector.stop();
                            if (heal_collector != undefined) heal_collector.stop();

                            // If we caught the Oochamon successfully
                            if (prism_result == true) { 
                                if (db.profile.get(message.author.id, 'ooch_party').length < 6) {
                                    db.profile.push(message.author.id, ooch_enemy, `ooch_party`);
                                } else {
                                    db.profile.push(message.author.id, ooch_enemy, `ooch_pc`)
                                }

                                db.profile.set(message.author.id, `overworld`, 'player_state')
                                db.profile.set(message.author.id, {}, 'ooch_enemy')
                                db.profile.set(message.author.id, 0, 'ooch_active_slot')
                                db.profile.math(message.author.id, '+', 1, `oochadex[${ooch_enemy.id}].caught`)
                                await wait(20000);
                                await thread.delete();
                                return;
                            }

                            // Enemy attacks player
                            let atk_id = ooch_enemy.moveset[_.random(0,ooch_enemy.moveset.length-1)];
                            [ooch_enemy, ooch_plr] = await attack(thread, message, atk_id, ooch_enemy, ooch_plr, '**------------ Enemy Turn ------------**');

                            //Apply Status Effects and other end of turn stuff
                            await end_of_round(thread, message, ooch_plr, ooch_enemy);                        

                            // Victory/Defeat Check
                            let victory_check = await victory_defeat_check(thread, message, ooch_enemy, ooch_plr, true);
                            if (victory_check == true) return;

                            // Prompt for more input
                            await prompt_battle_input(thread, message);
                        });
                    } 

                });
                //#endregion
            break;
            case 'run':
                //#region RUN
                if ((ooch_plr.stats.spd + ooch_plr.level * 10) / ((ooch_plr.stats.spd + ooch_plr.level * 10) + (ooch_enemy.stats.spd + ooch_enemy.level * 10) ) > Math.random()) {
                    thread.send(`**------------ Player Turn ------------**` +
                    `\nYou successfully ran away!\nHead back to the Hub to continue playing.`)
                    db.profile.set(message.author.id, `overworld`, 'player_state')
                    db.profile.set(message.author.id, {}, 'ooch_enemy')
                    db.profile.set(message.author.id, ooch_plr.stats.hp, `ooch_party[${ooch_pos}].current_hp`)
                    await wait(20000);
                    await thread.delete();
                } else {
                    thread.send(`**------------ Player Turn ------------**` + 
                    `\nYou failed to run away!`)

                    // Enemy attacks player
                    let atk_id = ooch_enemy.moveset[_.random(0,ooch_enemy.moveset.length-1)];
                    [ooch_enemy, ooch_plr] = await attack(thread, message, atk_id, ooch_enemy, ooch_plr, '**------------ Enemy Turn ------------**');

                    //Apply Status Effects and other end of turn stuff
                    await end_of_round(thread, message, ooch_plr, ooch_enemy);

                    // Victory/Defeat Check
                    let victory_check = await victory_defeat_check(thread, message, ooch_enemy, ooch_plr, true);
                    if (victory_check == true) return;

                    // Prompt for more input
                    await prompt_battle_input(thread, message);
                }
                //#endregion
            break;
        }
    });
},

battle_choose_species: function(spawn_arr) {
    let sum_val = 0;
    let target_val = 0;
    let i = 0;

    for(i = 0; i < spawn_arr.length; i++) {
        sum_val += spawn_arr[i][1];
    }

    sum_val *= Math.random();

    for(i = 0; i < spawn_arr.length; i++) {
        target_val += spawn_arr[i][1];
        if(target_val >= sum_val){
            break;
        }
    }

    return(spawn_arr[i][0]);
},

battle_calc_damage: function(move_damage, move_type, ooch_attacker, ooch_defender) {
    let damage = Math.round(Math.ceil((2 * ooch_attacker.level / 5 + 2) * move_damage * ooch_attacker.stats.atk * ooch_attacker.stats.atk_mul / ooch_defender.stats.def * ooch_defender.stats.def_mul) / 50 + 2);
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
    return damage;
},

battle_calc_exp: function(enemy_level, enemy_evo_stage) {
    return Math.round((1.015 ** enemy_level) * (2 ** enemy_evo_stage) * 5 * enemy_level);
},

exp_to_next_level: function(exp, level) {
    return (level ** 3) - exp;
},

get_stats: function(species_id, level, hp_iv, atk_iv, def_iv, spd_iv) {
    let hp = Math.floor(db.monster_data.get(species_id, 'hp') * (1.05 ** level) * hp_iv + 10) ;
    let atk = Math.floor(db.monster_data.get(species_id, 'atk') * (1.05 ** level) * atk_iv);
    let def = Math.floor(db.monster_data.get(species_id, 'def') * (1.05 ** level) * def_iv);
    let spd = Math.floor(db.monster_data.get(species_id, 'spd') * (1.05 ** level) * spd_iv);
    return [hp, atk, def, spd];
},

type_to_emote: function(type_string) {
    switch(type_string) {
        case 'flame': return '<:icon_flame:1023031001611501648>';
        case 'fungal': return '<:icon_fungal:1023031003381514280>';
        case 'magic': return '<:icon_magic:1023031009966575686>';
        case 'stone': return '<:icon_stone:1023031015830204448>';
        case 'neutral': return '<:icon_neutral:1023031011703013376>';
        case 'ooze': return '<:icon_ooze:1023031013355569262>';
        case 'tech': return '<:icon_tech:1023031017730224139>';
        default: return '<:icon_void:1023031019466653738>';
    }
},

attack: async function(thread, message, atk_id, attacker, defender, string_to_send) {
    const { type_effectiveness, battle_calc_damage } = require('./func_battle.js');

    const clamp = (num, min, max) => Math.min(Math.max(num, min), max);
    let move_name =     db.move_data.get(atk_id, 'name');
    let move_type =     db.move_data.get(atk_id, 'type');
    let move_damage =   db.move_data.get(atk_id, 'damage');
    let move_accuracy = db.move_data.get(atk_id, 'accuracy');
    let move_effect =   db.move_data.get(atk_id, 'effect');
    let move_chance =   db.move_data.get(atk_id, 'chance');
    let type_multiplier = type_effectiveness(move_type, defender.type); //Returns [multiplier, string] 
    let crit_multiplier = (Math.random() > 0.95 ? 2 : 1)
    let status_blind = (attacker.status_effects.includes('blinded') ? .75 : 1);
    let status_doubled = (defender.status_effects.includes('doubled') ? 2 : 1);

    dmg = battle_calc_damage(move_damage * type_multiplier[0] * crit_multiplier * status_doubled, move_type, attacker, defender);

    if ((move_accuracy/100 * status_blind > Math.random()) || (defender.ability == 'Immense')) {
        defender.current_hp -= dmg
        defender.current_hp = clamp(defender.current_hp, 0, defender.stats.hp);

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
    return [attacker, defender];

},

type_effectiveness: function(attack_type, target_type) {
    let multiplier = 1;
    let string = '';

    switch(attack_type){
        case 'neutral':
            switch(target_type){
                case 'magic': multiplier = .75; break;
            }
        break;
        case 'fungal':
            switch(target_type){
                case 'flame':   multiplier = .75; break;
                case 'fungal':  multiplier = .75; break;
                case 'stone':   multiplier = 1.5; break;
                case 'ooze':    multiplier = 1.5; break;
            }
        break;
        case 'flame':
            switch(target_type){
                case 'ooze':    multiplier = .75; break;
                case 'flame':   multiplier = .75; break;
                case 'void':    multiplier = 1.5; break;
                case 'fungal':  multiplier = 1.5; break;
            }
        break;
        case 'stone':
            switch(target_type){
                case 'ooze':    multiplier = .75; break;
                case 'tech':    multiplier = 1.5; break;
                case 'flame':   multiplier = 1.5; break;
            }
        break;
        case 'tech':
            switch(target_type){
                case 'magic':   multiplier = .75; break;
                case 'fungal':  multiplier = 1.5; break;
                case 'ooze':    multiplier = 1.5; break;
            }
        break;
        case 'ooze':
            switch(target_type){
                case 'ooze':    multiplier = .75; break;
                case 'flame':   multiplier = 1.5; break;
                case 'stone':   multiplier = 1.5; break;
            }
        break;
        case 'magic':
            switch(target_type){
                case 'flame':  multiplier = .75; break;
                case 'tech':   multiplier = 1.5; break;
            }
        break;
        case 'void':
            multiplier = 1.5;
        break;
    }
    
    if(multiplier > 1){
        string = '\n**It\'s super effective!**'
    }
    else if(multiplier < 1){
        string = '\n**It\'s not very effective...**'
    }

    return([multiplier,string])
},

victory_defeat_check: async function(thread, message, ooch_enemy, ooch_plr, is_turn_end) {

    const { prompt_battle_input } = require('./func_battle.js');
    const Discord = require('discord.js');
    let ooch_arr, slot_to_send, enemy_profile;

    const switch_buttons_1_die = new Discord.MessageActionRow();
    const switch_buttons_2_die = new Discord.MessageActionRow();

    // Victory/Defeat Check
    if (ooch_enemy.current_hp <= 0) { // Victory
        slot_to_send = -1;
        enemy_profile = db.profile.get(message.author.id, 'ooch_enemy');
        ooch_arr = enemy_profile.ooch_party;

        for (let i = 0; i < ooch_arr.length; i++) {
            if (ooch_arr[i].current_hp > 0 && slot_to_send == -1) {
                slot_to_send = i;
            }
        }

        if (slot_to_send == -1) { //if there is no slot to send in
            thread.send(`**You win!**\nHead back to the Hub to continue playing.`)
            db.profile.set(message.author.id, `overworld`, 'player_state')
            db.profile.set(message.author.id, {}, 'ooch_enemy')
            db.profile.set(message.author.id, 0, 'ooch_active_slot')

            await wait(20000);
            await thread.delete();
            return true;
        } else if (slot_to_send == -1) {
            thread.send(`${enemy_profile.name} sends out ${ooch_arr[slot_to_send].name}!`)
            db.profile.set(message.author.id, slot_to_send, `ooch_enemy.ooch_active_slot`)
        }
    } else if (ooch_plr.current_hp <= 0) { // Defeat
        slot_to_send = -1;
        ooch_arr = db.profile.get(message.author.id, 'ooch_party');

        for (let i = 0; i < ooch_arr.length; i++) {
            if (ooch_arr[i].current_hp > 0 && slot_to_send == -1) {
                slot_to_send = i;
            }
        }

        if (slot_to_send == -1) { //if there is no slot to send in
            thread.send(`**You lose...**\nYou lose 20 pp.\nHead back to the Hub to continue playing.`)
            db.profile.set(message.author.id, `overworld`, 'player_state')
            db.profile.set(message.author.id, {}, 'ooch_enemy')
            db.profile.set(message.author.id, 0, 'ooch_active_slot')
            
            await wait(20000);
            await thread.delete();
            return true;
        } else if (is_turn_end) {
            let ooch_inv = db.profile.get(message.author.id, 'ooch_party')
            let ooch_check, ooch_emote, ooch_name, ooch_hp, ooch_button_color, ooch_prev_name, ooch_disable;

            for (let i = 0; i < ooch_inv.length; i++) {
                ooch_check = ooch_inv[i];
                ooch_emote = db.monster_data.get([ooch_check.id], 'emote');
                ooch_name = ((ooch_check.nickname != -1) ? ooch_check.nickname : ooch_check.name);
                ooch_hp = `${ooch_check.current_hp}/${ooch_check.stats.hp} HP`;
                ooch_button_color = 'PRIMARY';
                ooch_disable = false;

                if (i == db.profile.get(message.author.id, 'ooch_active_slot')) {
                    ooch_button_color = 'SUCCESS';
                    ooch_prev_name = ooch_name;
                    ooch_disable = true;
                } else if (ooch_check.current_hp <= 0) {
                    ooch_button_color = 'PRIMARY';
                    ooch_disable = true;
                }

                ((i <= 2) ? switch_buttons_1_die : switch_buttons_2_die).addComponents(
                    new Discord.MessageButton()
                        .setCustomId(`${i}`)
                        .setLabel(`${ooch_name} (${ooch_hp})`)
                        .setStyle(ooch_button_color)
                        .setEmoji(ooch_emote)
                        .setDisabled(ooch_disable),
                )
            }

            await thread.send({ content: `Select the new Oochamon you want to switch in!`, components: (switch_buttons_2_die.components.length != 0) ? [switch_buttons_1_die, switch_buttons_2_die] : [switch_buttons_1_die] })

            const s_collector_d = thread.createMessageComponentCollector({ max: 1 });

            await s_collector_d.on('collect', async ooch_sel => {
                let ooch_pick = db.profile.get(message.author.id, `ooch_party[${parseInt(ooch_sel.customId)}]`)
                let ooch_pick_name = ((ooch_pick.nickname != -1) ? ooch_pick.nickname : ooch_pick.name);
                await ooch_sel.update({ content: `**------------ Player Turn ------------**` + 
                `\nCome on out **${ooch_pick_name}**!`, components: [] })

                let ooch_pos = parseInt(ooch_sel.customId);
                ooch_plr = db.profile.get(message.author.id, `ooch_party[${ooch_pos}]`);
                db.profile.set(message.author.id, ooch_pos, 'ooch_active_slot');

                prompt_battle_input(thread, message);
            });

            return true;
        }  
    };
},

end_of_round: async function(thread, message, ooch_plr, ooch_enemy){
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

    let ooch_pos_plr = db.profile.get(message.author.id, 'ooch_active_slot');
    let ooch_pos_enemy = db.profile.get(message.author.id, 'ooch_enemy.ooch_active_slot');

    // Update the ooch objects at the end of the turn so that it stays across the battle
    db.profile.set(message.author.id, ooch_enemy, `ooch_enemy.ooch_party[${ooch_pos_enemy}]`);
    db.profile.set(message.author.id, ooch_plr, `ooch_party[${ooch_pos_plr}]`);

    let plr_hp_string = generate_hp_bar(ooch_plr, 'plr');
    let en_hp_string = generate_hp_bar(ooch_enemy, 'enemy');
    string_to_send += `${plr_hp_string} ${ooch_status_emotes[0].join(' ')}\n${en_hp_string} ${ooch_status_emotes[1].join(' ')}`
    
    await thread.send(string_to_send)
    
},

generate_challenge: function(challenged_id) {
    // Get the wild oochamon's level
    let chal_name = db.profile.get(challenged_id, 'name');
    let chal_mons = db.profile.get(challenged_id, 'ooch_party');
    let chal_party = [];
    let ooch_slot;
    
    ooch_slot = chal_mons[0]

    for (let i = 0; i < chal_mons.length; i++) {
        ooch_slot = chal_mons[i];
        ooch_slot.evo_stage = 0;
        ooch_slot.current_hp = ooch_slot.stats.hp;
        chal_party.push(ooch_slot);
    }

    return {
        name: chal_name,
        ooch_active_slot: 0,
        ooch_party: chal_party
    }
},

generate_hp_bar: function(ooch, side) {
    let hp_string = ``;
    let hp_sec = (ooch.stats.hp / 10);
    let hp = ooch.current_hp;
    let sections = (hp / hp_sec > 0 ? Math.ceil(hp / hp_sec) : 0);
    let piece_type;

    hp_string += `\n${db.monster_data.get(ooch.id, 'emote')} `;

    if (side == 'plr') {
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

item_use: function(thread, message, ooch, item) {
    let item_data = db.item_data.get(item);
    let ooch_pos_plr = db.profile.get(message.author.id, 'ooch_active_slot');
    const clamp = (num, min, max) => Math.min(Math.max(num, min), max);

    if (item_data.type == 'potion') {
        ooch.current_hp += Math.ceil(ooch.stats.hp * item_data.value);
        ooch.current_hp = clamp(ooch.current_hp, 0, ooch.stats.hp);
        db.profile.set(message.author.id, ooch, `ooch_party[${ooch_pos_plr}]`);
    } else if (item_data.type == 'prism') {
        let status_bonus = 1;
        let prism_multiplier = item_data.value;
        let prism_chance = prism_multiplier / ooch.level * (ooch.stats.hp / ooch.current_hp) * status_bonus;

        if (Math.random() < prism_chance) {
            thread.send(`**You successfully caught the wild ${ooch.name}!**\nIt's been added to your party, or to your PC if your party is full.\n` +
            `Normal gameplay will resume in about 20 seconds.`);
            return true;
        } else {
            thread.send(`Unfortunately, your prism catch attempt failed...`)
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
}
}