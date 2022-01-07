const db = require("./db")
const wait = require('wait');
const Discord = require('discord.js');

module.exports = {

    random_number: function(min, max) {
        return Math.round(Math.random() * (max - min) + min);
    },

    capitalize: function(string) {
        string = string.split(' ');
        string = string.map(a => a.charAt(0).toUpperCase() + a.slice(1));
        string = string.join(' ');

        return string;
    },

    generate_battle: function(plr_ooch, ooch_species) {
    
        const { random_number } = require('./func.js'); 
        const { get_stats } = require('./func.js');

        // Get the wild oochamon's level
        let ooch_inv_arr = Object.keys(plr_ooch)
        let lvl = 0;
        let species = ooch_species

        // Get the highest level of players oochamon team
        for (let i = 0; i < ooch_inv_arr.length; i++) {
            if (i == 0) { 
                lvl = plr_ooch[ooch_inv_arr[i]]['level']; 
                continue;
            } else if (plr_ooch[ooch_inv_arr[i]] > lvl) {
                lvl = plr_ooch[ooch_inv_arr[i]]['level']
            }
        }

        console.log(`Level: ${lvl}`)

        const clamp = (num, min, max) => Math.min(Math.max(num, min), max);
        lvl = clamp((Math.floor(Math.random() * lvl * 1.05)), 1, 100); //Formula for level generation
    
        // Get the evolution data
        let ooch_pick = species[random_number(0, species.length - 1)]
        let evo1_id = db.monster_data.get(ooch_pick, 'evo_id')
        let evo1_lvl = db.monster_data.get(ooch_pick, 'evo_lvl')
        let evo2_id = db.monster_data.get(evo1_id, 'evo_id')
        let evo2_lvl = db.monster_data.get(evo2_id, 'evo_lvl')
        let stg = 0;
        // Have a chance to make the wild oochamon be the evolved form
        let evo_chance = random_number(0, 1) + random_number(0, 1)
        if (evo_chance == 2 && lvl >= evo2_lvl && evo2_lvl != -1) {
            ooch_pick = evo2_id;
            stg = 2;
        } else if (evo_chance == 1 && lvl >= evo1_lvl && evo1_lvl != -1) {
            ooch_pick = evo1_id;
            stg = 1;
        }

        // Get wild oochamon stats
        let hp_iv = random_number(0,10)/20+1
        let atk_iv = random_number(0,10)/20+1
        let def_iv = random_number(0,10)/20+1
        let spd_iv = random_number(0,10)/20+1

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
            let rand_move_pos = random_number(0, move_list.length)
            move_list.splice(rand_move_pos, 1);
        }

        // Pick a random ability
        let ability_list = db.monster_data.get(ooch_pick, 'abilities');
        let rand_ability = ability_list[random_number(0, ability_list.length - 1)]

        return {
            name: 'Enemy',
            ooch_active_slot: 0,
            party:[{
                id: ooch_pick,
                name: db.monster_data.get(ooch_pick, 'name'),
                nickname: -1,
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
                },
                status_effects: [],
                current_hp: hp,
                evo_stage: stg,
                alive: true,
                type: db.monster_data.get(ooch_pick, 'type')
            }]
        }
    },

    create_monster: function(id, emote, name, image, oochive_entry, type, hp, atk, def, spd, move_list, abilities, evo_id, evo_lvl) { 
        db.monster_data.set(id, emote, 'emote')
        db.monster_data.set(id, image, 'image')
        db.monster_data.set(id, name, 'name')
        db.monster_data.set(id, oochive_entry, 'oochive_entry')
        db.monster_data.set(id, type, 'type')
        db.monster_data.set(id, hp, 'hp')
        db.monster_data.set(id, atk, 'atk')
        db.monster_data.set(id, def, 'def')
        db.monster_data.set(id, spd, 'spd')
        db.monster_data.set(id, move_list, 'move_list')
        db.monster_data.set(id, abilities, 'abilities')
        db.monster_data.set(id, evo_id, 'evo_id')
        db.monster_data.set(id, evo_lvl, 'evo_lvl')
    },

    create_move: function(id, name, type, damage, accuracy, effect, chance, description){
        db.move_data.set(id, name, 'name')
        db.move_data.set(id, type, 'type')
        db.move_data.set(id, damage, 'damage')
        db.move_data.set(id, accuracy, 'accuracy')
        db.move_data.set(id, effect, 'effect')
        db.move_data.set(id, chance, 'chance')
        db.move_data.set(id, description, 'description')
    },

    create_item: function(id, name, emote, category, type, value, description) {
        db.item_data.set(id, name, 'name');
        db.item_data.set(id, emote, 'emote');
        db.item_data.set(id, category, 'category');
        db.item_data.set(id, type, 'type');
        db.item_data.set(id, value, 'value');
        db.item_data.set(id, description, 'description');
    },

    create_ability: function(name, description) {
        db.item_data.set(name, description, 'description');
    },

    move: function(message, direction) {
        /*
            db.player_positions.set(interaction.user.id, interaction.member.displayName, 'player_name');
        */

        const { map_emote_string } = require('./func.js');

        let target = message.author.id;
        let xmove = 0;
        let ymove = 0;
        let msg_to_edit = db.profile.get(message.author.id, 'display_msg_id');
        let profile_arr = db.profile.keyArray();
        profile_arr = profile_arr.filter(val => val != message.author.id);
        
        //Get the player's location
        let player_location = db.profile.get(target, 'location_data');
        let biome = player_location.area;
        let playerx = player_location.x;
        let playery = player_location.y;

        //Get the map array based on the player's current biome
        let map_obj = db.maps.get(biome.toLowerCase());
        let map_arr = map_obj[1]; //this should be the actual map array?

        //set where the player is going to move
        switch(direction){
            case('w'):
                xmove = -1;
            break;
            case('s'):
                xmove = 1;
            break;
            case('a'):
                ymove  = -1;
            break;
            case('d'):
                ymove = 1;
            break;
        }
        
        //0 path, 1 block, 2 spawn, 3 chest

        if(map_arr[playerx + xmove][playery + ymove] != 1){//if the space the player wants to move to is NOT a blocked space
            playerx += xmove;
            playery += ymove;
        }

        //Update the player's profile with their new x & y positions
        db.profile.set(target, { area: biome, x: playerx, y: playery }, 'location_data');

        // Update player position
        db.player_positions.set(biome, { x: playerx, y: playery }, target);

        //Send reply displaying the player's location on the map
        (message.channel.messages.fetch(msg_to_edit)).then((msg) => {
            msg.edit({ content: map_emote_string(biome, map_arr, playerx, playery) });
        });

        for (let i = 0; i < profile_arr.length; i++) {
            //Get the player's location
            let other_player_location = db.profile.get(profile_arr[i], 'location_data');
            let other_biome = other_player_location.area;
            if (other_biome == biome) {
                let other_x = other_player_location.x;
                let other_y = other_player_location.y;

                //Get the map array based on the player's current biome
                let other_map_obj = db.maps.get(biome);
                let other_map_arr = other_map_obj[1]; //this should be the actual map array
                let other_map_display = db.profile.get(profile_arr[i], 'display_msg_id');

                if (other_map_display != false) {
                    (message.channel.messages.fetch(db.profile.get(profile_arr[i], 'display_msg_id'))).then(async (msg) => {
                        await msg.edit({ content: map_emote_string(other_biome, other_map_arr, other_x, other_y) });
                    });
                }
            }
        }

    },

    prompt_battle_input: async function(thread, message) {

        const { type_to_emote, enemy_attack, player_attack, end_of_turn, victory_defeat_check, prompt_battle_input, status_effect_check } = require('./func.js');
        const wait = require('wait');
        const Discord = require('discord.js');

        // Get enemy oochamon data that was previously generated
        let ooch_enemy_profile = db.profile.get(message.author.id, 'ooch_enemy')
        let ooch_enemy = ooch_enemy_profile.party[ooch_enemy_profile.ooch_active_slot];
        // Get the players oochamon in the first spot of their party
        let ooch_plr = db.profile.get(message.author.id, `ooch_inventory[${db.profile.get(message.author.id, 'ooch_active_slot')}]`);
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
                    .setEmoji('<:item_potion_magic:926592681407303700>'),
            ) .addComponents(
                new Discord.MessageButton()
                    .setCustomId('prism_button')
                    .setLabel('Prism')
                    .setStyle('PRIMARY')
                    .setEmoji('<:item_prism:921502013634777149>'),
            );
        let heal_collector;
        let prism_collector;

        thread.send({ content: `**---- Select A Move ----**`, components: [row, row2] })

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

                        console.log(`ID ${move_id} \n NAME ${move_name} \n TYPE ${move_type}`)

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

                        await atk.update({ content: `Selected \`${atk.customId}\``, components: [] });
                        let enemy_snare = status_effect_check('snared', ooch_enemy.status_effects);
                        let plr_snare = status_effect_check('snared', ooch_plr.status_effects);

                        if ((ooch_enemy.stats.spd * enemy_snare) > (ooch_plr.stats.spd * plr_snare)) { // Enemy goes first
                            turn_order = ['e', 'p']
                        } else { // Player goes first
                            turn_order = ['p', 'e'];
                        }

                        for (let i = 0; i < turn_order.length; i++) {

                            let atk_id = atk.customId;

                            if (turn_order[i] == 'p') {
                                // Player attacks enemy
                                await player_attack(thread, message, atk_id, ooch_plr, ooch_enemy);
                            } else {
                                // Enemy attacks player
                                await enemy_attack(thread, message, ooch_plr, ooch_enemy);
                            }

                            // Victory/Defeat Check
                            let victory_check = await victory_defeat_check(thread, message, ooch_enemy, ooch_plr, false);
                            if (victory_check == true) return;

                        }

                        //Apply Status Effects and other end of turn stuff
                        await end_of_turn(thread, message, ooch_plr, ooch_enemy);
                        
                        //Double check for Victory/Defeat after status effects have happened
                        let victory_check = await victory_defeat_check(thread, message, ooch_enemy, ooch_plr, true);
                        if (victory_check == true) return;

                        // Prompt for more input
                        await prompt_battle_input(thread, message);

                    });

                break;
                case 'switch':
                    //#region SWITCH
                    let ooch_inv = db.profile.get(message.author.id, 'ooch_inventory')
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
                        console.log(ooch_check);
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
                        else if (ooch_check.current_hp <= 0){
                            ooch_disable = true;
                        }
    
                        (i <= 2 ? switch_buttons_1 : switch_buttons_2).addComponents(
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

                        let ooch_pick = db.profile.get(message.author.id, `ooch_inventory[${parseInt(ooch_sel.customId)}]`)
                        let ooch_pick_name = ((ooch_pick.nickname != -1) ? ooch_pick.nickname : ooch_pick.name);
                        await ooch_sel.update({ content: `**------------ Player Turn ------------**` + 
                        `\nYou switched your active Oochamon from **${ooch_prev_name}** to **${ooch_pick_name}**.`, components: [] })
                        
                        ooch_pos = parseInt(ooch_sel.customId);
                        ooch_plr = db.profile.get(message.author.id, `ooch_inventory[${ooch_pos}]`);
                        db.profile.set(message.author.id, ooch_pos, 'ooch_active_slot');
    
                        // Enemy attacks player
                        await enemy_attack(thread, message, ooch_plr, ooch_enemy);

                        //Apply Status Effects and other end of turn stuff
                        await end_of_turn(thread, message, ooch_plr, ooch_enemy);                        

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

                    thread.send({ content: `Select the item category you'd like to use an item in!`, components: [bag_buttons]});

                    const b_collector = thread.createMessageComponentCollector();

                    await b_collector.on('collect', async i_sel => {

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

                            const heal_collector = thread.createMessageComponentCollector({ max: 1 });

                            await heal_collector.on('collect', async item_sel => { 
                                item_sel.update({ content: `Used a **${db.item_data.get(item_sel.values[0], 'name')}**!`, components: []});
                                db.profile.math(message.author.id, '-', 1, `heal_inv.${item_sel.values[0]}`)
                                b_collector.stop();
                                if (prism_collector != undefined) prism_collector.stop();
                                heal_collector.stop();

                                // Enemy attacks player
                                await enemy_attack(thread, message, ooch_plr, ooch_enemy);

                                //Apply Status Effects and other end of turn stuff
                                await end_of_turn(thread, message, ooch_plr, ooch_enemy);                        

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

                            console.log(prism_select_options);
    
                            bag_select.addComponents(
                                new Discord.MessageSelectMenu()
                                    .setCustomId('prism_select')
                                    .setPlaceholder('Select a prism you\'d like to use!')
                                    .addOptions(prism_select_options),
                            );

                            await i_sel.update({ content: `Select the prism you'd like to use!`, components: [bag_buttons, bag_select] })

                            const prism_collector = thread.createMessageComponentCollector({ max: 1 });

                            await prism_collector.on('collect', async item_sel => { 
                                item_sel.update({ content: `Used a **${db.item_data.get(item_sel.values[0], 'name')}**!`, components: []});
                                db.profile.math(message.author.id, '-', 1, `prism_inv.${item_sel.values[0]}`)
                                b_collector.stop();
                                prism_collector.stop();
                                if (heal_collector != undefined) heal_collector.stop();

                                // Enemy attacks player
                                await enemy_attack(thread, message, ooch_plr, ooch_enemy);

                                //Apply Status Effects and other end of turn stuff
                                await end_of_turn(thread, message, ooch_plr, ooch_enemy);                        

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
                        `\nYou successfully ran away!`)
                        db.profile.set(message.author.id, `overworld`, 'player_state')
                        db.profile.set(message.author.id, {}, 'ooch_enemy')
                        db.profile.set(message.author.id, ooch_plr.stats.hp, `ooch_inventory[${ooch_pos}].current_hp`)
                        await wait(20000);
                        await thread.delete();
                    } else {
                        thread.send(`**------------ Player Turn ------------**` + 
                        `\nYou failed to run away!`)

                        // Enemy attacks player
                        await enemy_attack(thread, message, ooch_plr, ooch_enemy);

                        //Apply Status Effects and other end of turn stuff
                        await end_of_turn(thread, message, ooch_plr, ooch_enemy);

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

    gen_map: function(map_size, chests, biome) {
        let map = [];
        let center = Math.floor(map_size/2);
        
        db.player_positions.set(biome, {});

        if(biome == 'hub'){
            map = [[1,1,1,1,1],[1,0,0,0,1],[1,0,4,0,1],[1,0,0,0,1],[1,1,1,1,1]];
            return([biome, map, []]);
        }

        //fill map with blocked spaces
        for(let i = 0; i < map_size; i++){
            map[i] = [];
            for(let j = 0; j < map_size; j++){	
                map[i][j] = 1;	
            }
        }

        //setup some reuseable variables
        let rand_dir = 0;
        let rand_len = 0;
        let xpos = 0;
        let ypos = 0;
        let chest_positions = [];

        //generate chests
        for(let i = 0; i < chests; i++){
            rand_dir = Math.random()*360;
            rand_len = Math.random()*map_size/8+map_size/4;
            xpos = Math.floor(center+(Math.cos(rand_dir)*rand_len))
            ypos = Math.floor(center+(Math.sin(rand_dir)*rand_len))
            chest_positions[i] = [xpos,ypos]

        }

        //create paths to chests
        for(let i = 0; i < chests; i++){
            xpos = chest_positions[i][0];
            ypos = chest_positions[i][1];

            while(Math.abs(xpos-center)+Math.abs(ypos-center) > 1){
                if(xpos > center){
                    xpos -=1;
                }
                else if(xpos < center){
                    xpos +=1;
                }
                else if(ypos > center){
                    ypos -=1;
                }
                else if(ypos < center){
                    ypos +=1;
                }

                xpos += Math.round(Math.random()*2)-1;
                ypos += Math.round(Math.random()*2)-1;

                for(let j = -1; j < 2; j++){
                    for(let k = -1; k < 2; k++){
                        map[xpos+j][ypos+k] = 0
                    }
                }
            }
        }

        //place chests
        for(let i = 0; i < chests; i++){
            map[chest_positions[i][0]][chest_positions[i][1]] = 3
        }

        map[center][center] = 4;

        //Create the list of creatures that can spawn in a given biome
        //Gives each a base chance and an additional chance value 
        let spawns = [];
        switch(biome){
            case 'obsidian':
                //ID,Chance
                spawns[0] = [6,  5+Math.round(Math.random()*10)] //Puppyre
                spawns[1] = [17,40+Math.round(Math.random()*10)] //Charlite
                spawns[2] = [19,40+Math.round(Math.random()*10)] //Torchoir
                spawns[3] = [24,20+Math.round(Math.random()*10)] //Tisparc
                spawns[4] = [32,15+Math.round(Math.random()*10)] //Drilline
            break;
            case 'desert':
                //ID,Chance
                spawns[0] = [3,  5+Math.round(Math.random()*10)] //Roocky
                spawns[1] = [9, 40+Math.round(Math.random()*10)] //Glither
                spawns[2] = [11,40+Math.round(Math.random()*10)] //Constone
                spawns[3] = [21,10+Math.round(Math.random()*10)] //Eluslug
                spawns[4] = [26,10+Math.round(Math.random()*10)] //Blipoint
            break;
            case 'fungal':
                //ID,Chance
                spawns[0] = [0,  5+Math.round(Math.random()*10)] //Sporbee
                spawns[1] = [13,30+Math.round(Math.random()*10)] //Widew
                spawns[2] = [15,30+Math.round(Math.random()*10)] //Moldot
                spawns[3] = [22,30+Math.round(Math.random()*10)] //Jellime
                spawns[4] = [29,10+Math.round(Math.random()*10)] //Nucleorb
            break;
        }

        return([biome, map, spawns]);

    },

    map_emote_string: function(biome, map_array, x_pos, y_pos) {
        //biome can be obsidian, desert or fungal, anything else will default to the HUB tileset
        let tile_emotes = [];
        

        //===========================
        //HEY READ THIS DUMMI
        //0 path, 1 block, 2 player, 3 chest, 4 spawn
        //===========================

        switch(biome){
            case('obsidian'):
                tile_emotes = ['<:tObsd:921225027557412975>', '<:tObsdB:921225027624501268>', '<:tile_player:921492132966060042>', '<:tile_chest:921486599223664640>', '<:tHUB:921240940641939507>']
            break;
            
            case('desert'):
                tile_emotes = ['<:tSand:921220712641986572>', '<:tSandB:921220723110977606>', '<:tile_player:921492132966060042>', '<:tile_chest:921486599223664640>', '<:tHUB:921240940641939507>']
            break;

            case('fungal'):
                tile_emotes = ['<:tShrm:921230053499617331>', '<:tShrmB:921230053503819777>', '<:tile_player:921492132966060042>', '<:tile_chest:921486599223664640>', '<:tHUB:921240940641939507>']
            break;

            default:
                tile_emotes = ['<:tHUB:921240940641939507>', '<:tHUBB:921240940641919056>', '<:tile_player:921492132966060042>', '<:tile_chest:921486599223664640>', '<:tHUB:921240940641939507>']
            break;
        }

        let emote_map = [];
        let size = map_array.length;
        let view_size = 2;

        //finds positions of all players and applies them to the map array
        let other_players_pos_list = Object.keys(db.player_positions.get(biome));
        let pos_find = -1;

        for (let i = 0; i < other_players_pos_list.length; i++) {
            pos_find = db.player_positions.get(biome, other_players_pos_list[i]);
            map_array[pos_find.x][pos_find.y] = 2;
        }

        for (let i = -view_size; i < view_size + 1; i++) {
            emote_map.push([]);
            for (let j = -view_size; j < view_size + 1; j++) {
                if (i + x_pos < 0 || j + y_pos < 0 || i + x_pos >= size || j + y_pos >= size) {
                    tile_value = 1;
                } else if (i == 0 && j == 0) {
                    tile_value = 2;
                } else {
                    tile_value = map_array[i + x_pos][j + y_pos]
                }

                emote_map[i + view_size][j + view_size] = tile_emotes[tile_value]
            }
            emote_map[i + view_size] = emote_map[i + view_size].join('')
        }
        emote_map = emote_map.join('\n')

        return(emote_map);
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

    battle_calc_damage: function(attack_damage, attacker_level, attacker_atk, defender_def) { //takes the attack's damage value, the attacker object, and defender object
        let damage = Math.round(Math.ceil((2 * attacker_level / 5 + 2) * attack_damage * attacker_atk / defender_def) / 50 + 2);
        return damage;
    },

    battle_calc_exp: function(enemy_level, enemy_evo_stage) { //takes enemy object
        let exp = Math.round((1.015 ** enemy_level) * (2 ** enemy_evo_stage) * 5 * enemy_level);
        return exp;
    },
    
    exp_to_next_level: function(exp, level) {
        let exp_needed = (level ** 3) - exp;
        return exp_needed;
    },

    get_stats: function(species_id,level,hp_iv,atk_iv,def_iv,spd_iv){
        
        let hp = Math.floor(db.monster_data.get(species_id, 'hp') * (1.05 ** level) * hp_iv + 10) ;
        let atk = Math.floor(db.monster_data.get(species_id, 'atk') * (1.05 ** level) * atk_iv);
        let def = Math.floor(db.monster_data.get(species_id, 'def') * (1.05 ** level) * def_iv);
        let spd = Math.floor(db.monster_data.get(species_id, 'spd') * (1.05 ** level) * spd_iv);

        return [hp, atk, def, spd];

    },

    type_to_emote: function(type_string){
        let emote_return = '<:icon_void:923049669699969054>';
        switch(type_string){
            case 'flame':
                emote_return = '<:icon_flame:923049669674803231>';
            break;
            case 'fungal':
                emote_return = '<:icon_fungal:923049669746122782>';
            break;
            case 'magic':
                emote_return = '<:icon_magic:923049669716750406>';
            break;
            case 'stone':
                emote_return = '<:icon_stone:923049669733523487>';
            break;
            case 'neutral':
                emote_return = '<:icon_neutral:927695999261089872>';
            break;
            case 'ooze':
                emote_return = '<:icon_ooze:923049669708378172>';
            break;
            case 'tech':
                emote_return = '<:icon_tech:923049669741916190>';
            break;
        }
        return emote_return;
    },

    player_attack: async function(thread, message, atk_id,ooch_plr,ooch_enemy){
        const { type_effectiveness, battle_calc_damage, status_effect_check } = require('./func.js');
        const Discord = require('discord.js');

        let move_name =     db.move_data.get(`${atk_id}`, 'name');
        let move_type =     db.move_data.get(`${atk_id}`, 'type');
        let move_damage =   db.move_data.get(`${atk_id}`, 'damage');
        let move_accuracy = db.move_data.get(`${atk_id}`, 'accuracy');
        let move_effect =   db.move_data.get(`${atk_id}`, 'effect');
        let move_chance =   db.move_data.get(`${atk_id}`, 'chance');
        let type_multiplier = type_effectiveness(move_type, ooch_enemy.type); //Returns [multiplier, string] 
        let crit_multiplier = (Math.random() > 0.95 ? 2 : 1)
        let enemy_status_effects = ooch_enemy.status_effects;
        let plr_status_effects = ooch_plr.status_effects;
        let status_blind = (status_effect_check('blinded', plr_status_effects) ? .75 : 1);
        let status_doubled = (status_effect_check('doubled', enemy_status_effects) ? 2 : 1);
        let string_to_send = `**------------ Player Turn ------------**`;


        dmg = battle_calc_damage(move_damage * type_multiplier[0] * crit_multiplier * status_doubled, ooch_plr.level, ooch_plr.stats.atk, ooch_enemy.stats.def);
        
        db.profile.set(message.author.id, ooch_enemy.current_hp, `ooch_enemy.party[${db.profile.get(message.author.id, 'ooch_enemy.ooch_active_slot')}].current_hp`);

        if(move_accuracy/100 * status_blind > Math.random()){
            ooch_enemy.current_hp -= dmg
            string_to_send +=  `\nYour ${ooch_plr.name} uses ${move_name} and deals **${dmg} damage** to the enemy ${ooch_enemy.name}! `
            
            //If a crit lands
            if(crit_multiplier >= 2){
                string_to_send += `\n**A critical hit!**`
            }

            //Type effectiveness
            string_to_send += type_multiplier[1];

            if(Math.random() > move_chance/100 && move_chance > 0){ //Apply status effect
                string_to_send += `\nThe enemy ${ooch_enemy.name} was ${move_effect.toUpperCase()}!`
            }
            else if(-Math.random() < move_chance/100 && move_chance < 0){
                string_to_send += `\nYour ${ooch_plr.name} was ${move_effect.toUpperCase()}!`
            }
        }
        else{
            string_to_send +=  `\nYour ${ooch_plr.name} used ${move_name} but it missed!`
        }
        
        let ooch_pos_plr = db.profile.get(message.author.id, 'ooch_active_slot');
        let ooch_pos_enemy = db.profile.get(message.author.id, 'ooch_enemy.ooch_active_slot');

        db.profile.set(message.author.id, ooch_enemy.current_hp, `ooch_enemy.party[${ooch_pos_enemy}].current_hp`);
        db.profile.set(message.author.id, ooch_plr.current_hp, `ooch_inventory[${ooch_pos_plr}].current_hp`);

        string_to_send += `\n*Enemy ${ooch_enemy.name}'s HP (${ooch_enemy.current_hp}/${ooch_enemy.stats.hp})*`

        await thread.send(string_to_send)

    },

    enemy_attack: async function(thread, message, ooch_plr, ooch_enemy){    
        const { type_effectiveness, battle_calc_damage, status_effect_check, random_number } = require('./func.js');
        const Discord = require('discord.js');

        console.log(ooch_plr)

        let moves = ooch_enemy.moveset;
        let atk_id = moves[random_number(0,moves.length-1)];
                        
        let move_name =     db.move_data.get(`${atk_id}`, 'name');
        let move_type =     db.move_data.get(`${atk_id}`, 'type');
        let move_damage =   db.move_data.get(`${atk_id}`, 'damage');
        let move_accuracy = db.move_data.get(`${atk_id}`, 'accuracy');
        let move_effect =   db.move_data.get(`${atk_id}`, 'effect');
        let move_chance =   db.move_data.get(`${atk_id}`, 'chance');
        let type_multiplier = type_effectiveness(move_type, ooch_plr.type); //Returns [multiplier, string] 
        let crit_multiplier = (Math.random() > 0.95 ? 2 : 1)
        let enemy_status_effects = ooch_enemy.status_effects;
        let plr_status_effects = ooch_plr.status_effects;
        let status_blind = (status_effect_check('blinded', enemy_status_effects) ? .75 : 1);
        let status_doubled = (status_effect_check('doubled', plr_status_effects) ? 2 : 1);
        let string_to_send = `**------------ Enemy Turn ------------**`;



        dmg = battle_calc_damage(move_damage * type_multiplier[0] * crit_multiplier * status_doubled, ooch_enemy.level, ooch_enemy.stats.atk, ooch_plr.stats.def);
        
        db.profile.set(message.author.id, ooch_enemy.current_hp, `ooch_enemy.party[${db.profile.get(message.author.id, 'ooch_enemy.ooch_active_slot')}].current_hp`);

        if(move_accuracy/100 * status_blind > Math.random()){
            ooch_plr.current_hp -= dmg
            string_to_send +=  `\nThe enemy ${ooch_enemy.name} uses ${move_name} and deals **${dmg} damage** to your ${ooch_plr.name}! `
            
            //If a crit lands
            if(crit_multiplier >= 2){
                string_to_send += `\n**A critical hit!**`
            }
            //Type effectiveness
            string_to_send += type_multiplier[1];

            //Apply status effects
            if(Math.random() > move_chance/100 && move_chance > 0){ //Apply status effect
                string_to_send += `\nYour ${ooch_plr.name} was ${move_effect.toUpperCase()}!`
            }
            else if(-Math.random() < move_chance/100 && move_chance < 0){
                string_to_send += `\nThe enemy ${ooch_enemy.name} was ${move_effect.toUpperCase()}!`
            }
        }
        else{
            string_to_send +=  `\nThe enemy ${ooch_enemy.name} used ${move_name} but it missed!`
        }
        
        let ooch_pos_plr = db.profile.get(message.author.id, 'ooch_active_slot');
        let ooch_pos_enemy = db.profile.get(message.author.id, 'ooch_enemy.ooch_active_slot');

        db.profile.set(message.author.id, ooch_enemy.current_hp, `ooch_enemy.party[${ooch_pos_enemy}].current_hp`);
        db.profile.set(message.author.id, ooch_plr.current_hp, `ooch_inventory[${ooch_pos_plr}].current_hp`);

        string_to_send += `\n*Your ${ooch_plr.name}'s HP (${ooch_plr.current_hp}/${ooch_plr.stats.hp})*`

        await thread.send(string_to_send)
    },

    type_effectiveness: function(attack_type, target_type){
        let multiplier = 1;
        let string = '';

        console.log(attack_type, target_type);

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
                multiplier = 1.5; break;
            break;
        }
        
        if(multiplier > 1){
            string = '\n**It\'s super effective!**'
        }
        else if(multiplier < 1){
            string = '\n**It\'s not very effective...**'
        }

        console.log([multiplier,string]);

        return([multiplier,string])
    },

    status_effect_check: function(status, status_array){
        for(let i = 0; i < status_array.length; i++){
            if(status_array[i] == status){
                return true;
            }
        }
        return false;
    },

    victory_defeat_check: async function(thread, message, ooch_enemy, ooch_plr, is_turn_end){

        const { prompt_battle_input } = require('./func.js');
        const Discord = require('discord.js');
        let ooch_pos = db.profile.get(message.author.id, 'ooch_active_slot');
        let ooch_arr, slot_to_send, enemy_profile;

        const switch_buttons_1_die = new Discord.MessageActionRow();
        const switch_buttons_2_die = new Discord.MessageActionRow();

         // Victory/Defeat Check
         if (ooch_enemy.current_hp <= 0) { // Victory
            slot_to_send = -1;
            enemy_profile = db.profile.get(message.author.id, 'ooch_enemy');
            ooch_arr = enemy_profile.party;

            for(let i = 0; i < ooch_arr.length; i++){
                console.log(ooch_arr[i]);
                if(ooch_arr[i].current_hp > 0 && slot_to_send == -1){
                    console.log(`i = ${i}`)
                    slot_to_send = i;
                }
            }
            if(slot_to_send == -1){ //if there is no slot to send in
                thread.send(`**You win!**\nHead back to the Hub to continue playing.`)
                db.profile.set(message.author.id, `overworld`, 'player_state')
                db.profile.set(message.author.id, {}, 'ooch_enemy')
                db.profile.set(message.author.id, 0, 'ooch_active_slot')
                await wait(20000);
                await thread.delete();
                return true;
            }else if (slot_to_send == -1){
                thread.send(`${enemy_profile.name} sends out ${ooch_arr[slot_to_send].name}!`)
                db.profile.set(message.author.id, slot_to_send, `ooch_enemy.ooch_active_slot`)
            }
        }
        else if (ooch_plr.current_hp <= 0) { // Defeat
            slot_to_send = -1;
            ooch_arr = db.profile.get(message.author.id, 'ooch_inventory');
            for(let i = 0; i < ooch_arr.length; i++){
                if(ooch_arr[i].current_hp > 0 && slot_to_send == -1){
                    slot_to_send = i;
                }
            }
            if(slot_to_send == -1){ //if there is no slot to send in
                thread.send(`**You lose...**\nYou lose 20 pp.\nHead back to the Hub to continue playing.`)
                db.profile.set(message.author.id, `overworld`, 'player_state')
                db.profile.set(message.author.id, {}, 'ooch_enemy')
                db.profile.set(message.author.id, 0, 'ooch_active_slot')
                await wait(20000);
                await thread.delete();
                return true;
            }
            else if(is_turn_end){
                
                let ooch_inv = db.profile.get(message.author.id, 'ooch_inventory')
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
                    }
                    else if (ooch_check.current_hp <= 0){
                        ooch_button_color = 'PRIMARY';
                        ooch_disable = true;
                    }

                    (i <= 2 ? switch_buttons_1_die : switch_buttons_2_die).addComponents(
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

                    let ooch_pick = db.profile.get(message.author.id, `ooch_inventory[${parseInt(ooch_sel.customId)}]`)
                    let ooch_pick_name = ((ooch_pick.nickname != -1) ? ooch_pick.nickname : ooch_pick.name);
                    await ooch_sel.update({ content: `**------------ Player Turn ------------**` + 
                    `\nCome on out **${ooch_pick_name}**!`, components: [] })

                    let ooch_pos = parseInt(ooch_sel.customId);
                    ooch_plr = db.profile.get(message.author.id, `ooch_inventory[${ooch_pos}]`);
                    db.profile.set(message.author.id, ooch_pos, 'ooch_active_slot');

                    prompt_battle_input(thread, message);
                });
                return true;
            }  
        };
    },

    end_of_turn: async function(thread, message, ooch_plr, ooch_enemy){
        const { status_effect_check } = require('./func.js');

        let plr_burned = status_effect_check('burned', ooch_plr.status_effects);
        let plr_infected = status_effect_check('infected', ooch_plr.status_effects);
        
        let enemy_burned = status_effect_check('burned', ooch_enemy.status_effects);
        let enemy_infected = status_effect_check('infected', ooch_enemy.status_effects);

        let string_to_send = `**------------ End of Round ------------**`;

        if(plr_burned){
            ooch_plr.current_hp -= Math.round(ooch_plr.stats.hp/10);
            string_to_send += `\n${ooch_plr.name} was hurt by its burn.`
        }
        if(enemy_burned){
            ooch_enemy.current_hp -= Math.round(ooch_enemy.stats.hp/10)
            string_to_send += `\nThe enemy ${ooch_enemy.name} was hurt by its burn.`
        }

        if(plr_infected){
            let infect_val = ooch_plr.stats.hp/20;
            ooch_plr.current_hp -= infect_val;
            ooch_enemy.current_hp = Math.min(ooch_enemy.current_hp + infect_val, ooch_enemy.stats.hp);
            string_to_send += `\n${ooch_plr.name} has its HP absorbed by the enemy ${ooch_enemy.name}.`
        }
        if(enemy_infected){
            let infect_val = ooch_enemy.stats.hp/20;
            ooch_enemy.current_hp -= infect_val;
            ooch_plr.current_hp = Math.min(ooch_plr.current_hp + infect_val, ooch_plr.stats.hp);
            string_to_send += `\n${ooch_plr.name} has its HP absorbed by the enemy ${ooch_enemy.name}.`
        }


        let ooch_pos_plr = db.profile.get(message.author.id, 'ooch_active_slot');
        let ooch_pos_enemy = db.profile.get(message.author.id, 'ooch_enemy.ooch_active_slot');

        db.profile.set(message.author.id, ooch_enemy.current_hp, `ooch_enemy.party[${ooch_pos_plr}].current_hp`);
        db.profile.set(message.author.id, ooch_plr.current_hp, `ooch_inventory[${ooch_pos_enemy}].current_hp`);

        string_to_send += (`\n*Your ${ooch_plr.name} HP: (${ooch_plr.current_hp}/${ooch_plr.stats.hp})*`+
                            `\n*Enemy ${ooch_enemy.name} HP: (${ooch_enemy.current_hp}/${ooch_enemy.stats.hp})*`)
        await thread.send(string_to_send)
        
    },

    generate_challenge: function(challenged_id) {
    
        // Get the wild oochamon's level
        let chal_name = db.profile.get(challenged_id, 'name');
        let chal_mons = db.profile.get(challenged_id, 'ooch_inventory');
        let chal_party = [];
        let ooch_slot;
        
        ooch_slot = chal_mons[0]

        for(let i = 0; i < chal_mons.length; i++){
            ooch_slot = chal_mons[i];
            ooch_slot.evo_stage = 0;
            ooch_slot.current_hp = ooch_slot.stats.hp;
            chal_party.push(ooch_slot);
        }
    
        return {
            name: chal_name,
            ooch_active_slot: 0,
            party: chal_party
        }
    
    },
}