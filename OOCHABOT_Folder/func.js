const db = require("./db")

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
    
        const { random_number } = require('./func.js') 

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
        hp_iv = random_number(0,10)/20+1
        atk_iv = random_number(0,10)/20+1
        def_iv = random_number(0,10)/20+1
        spd_iv = random_number(0,10)/20+1
        hp = Math.floor(db.monster_data.get(ooch_pick, 'hp') * (1.05 ** lvl) + 10)
        atk = Math.floor(db.monster_data.get(ooch_pick, 'atk') * (1.05 ** lvl))
        def = Math.floor(db.monster_data.get(ooch_pick, 'def') * (1.05 ** lvl))
        spd = Math.floor(db.monster_data.get(ooch_pick, 'spd') * (1.05 ** lvl))
        

        move_list = db.monster_data.get(ooch_pick, 'move_list').filter(x => x[0] <= 5 && x[0] != -1)

        // Make sure the move_list is 4 moves
        while (move_list.length > 4) {
            let rand_move_pos = random_number(0, move_list.length)
            move_list.splice(rand_move_pos, 1);
        }

        return {
            id: ooch_pick,
            name: db.monster_data.get(ooch_pick, 'name'),
            level: lvl,
            ability: false,
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
            current_hp: hp,
            evo_stage: stg,
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
    
    battle_enemy: async function(message, ooch_plr, ooch_enemy, ooch_pos) {
        const wait = require('wait');
        const { battle_calc_damage } = require('./func.js');

        let dmg = 0;

        // Enemy attacks player
        dmg = battle_calc_damage(10, ooch_enemy.level, ooch_enemy.stats.atk * ooch_enemy.stats.atk_iv, ooch_plr.stats.def * ooch_plr.stats.def_iv);
        ooch_plr.current_hp -= dmg
        db.profile.set(message.author.id, ooch_plr, `ooch_inventory[${ooch_pos}]`);
        await message.channel.send(`The enemy ${ooch_enemy.name} deals ${dmg} damage to your ${ooch_plr.name}!\nYour ${ooch_plr.name} has ${ooch_plr.current_hp} hp remaining.`);

        // Victory/Defeat Check
        if (ooch_enemy.current_hp <= 0) { // Victory

            message.channel.send(`**You win!**\nHead back to the Hub to continue playing.`)
            db.profile.set(message.author.id, `overworld`, 'player_state')
            db.profile.set(message.author.id, {}, 'ooch_enemy')
            await wait(20000);
            await message.channel.delete();
            return false; // Don't prompt any more input

        } else if (ooch_plr.current_hp <= 0) {

            message.channel.send(`**You lose...**\nYou lose 20 pp.\nHead back to the Hub to continue playing.`)
            db.profile.set(message.author.id, `overworld`, 'player_state')
            db.profile.set(message.author.id, {}, 'ooch_enemy')
            db.profile.set(message.author.id, ooch_plr.stats.hp, `ooch_inventory[${ooch_pos}].current_hp`)
            await wait(20000);
            await message.channel.delete();
            return false; // Don't prompt any more input

        } else {
            return true; // Prompt for more input
        }
    },

    battle_player: async function(message, choice, ooch_plr, ooch_enemy, ooch_pos) {
        const wait = require('wait');
        const { battle_calc_damage, battle_enemy } = require('./func.js');
        const Discord = require('discord.js');
        
        let dmg = 0;

        // Handle player turn
        switch(choice) {
            
            case 'fight':

                // Player attacks enemy
                dmg = battle_calc_damage(10, ooch_plr.level, ooch_plr.stats.atk * ooch_plr.stats.atk_iv, ooch_enemy.stats.def * ooch_plr.stats.def_iv);
                ooch_enemy.current_hp -= dmg
                db.profile.set(message.author.id, ooch_enemy.current_hp, 'ooch_enemy.current_hp');
                await message.channel.send(`Your ${ooch_plr.name} deals ${dmg} damage to the enemy ${ooch_enemy.name}!\nThe enemy ${ooch_enemy.name} has ${ooch_enemy.current_hp} hp remaining.`)

                // Victory/Defeat Check
                if (ooch_enemy.current_hp <= 0) { // Victory

                    message.channel.send(`**You win!**\nHead back to the Hub to continue playing.`)
                    db.profile.set(message.author.id, `overworld`, 'player_state')
                    db.profile.set(message.author.id, {}, 'ooch_enemy')
                    await wait(20000);
                    await message.channel.delete();
                    return false; // Don't prompt any more input

                } else if (ooch_plr.current_hp <= 0) {

                    message.channel.send(`**You lose...**\nYou lose 20 pp.\nHead back to the Hub to continue playing.`)
                    db.profile.set(message.author.id, `overworld`, 'player_state')
                    db.profile.set(message.author.id, {}, 'ooch_enemy')
                    db.profile.set(message.author.id, ooch_plr.stats.hp, `ooch_inventory[${ooch_pos}].current_hp`)
                    await wait(20000);
                    await message.channel.delete();
                    return false; // Don't prompt any more input

                } else {
                    return true; // Prompt for more input
                }
            break;
            case 'bag': 
                // Soon!
            break;
            case 'switch': 

                let ooch_inv = db.profile.get(message.author.id, 'ooch_inventory')
                let ooch_check, ooch_emote, ooch_name, ooch_hp, ooch_button_color, ooch_prev_name;

                const row = new Discord.MessageActionRow();
                const row2 = new Discord.MessageActionRow();

                // Check if we have only 1 oochamon.
                if (ooch_inv.length == 1) {
                    message.channel.send('You only have 1 oochamon in your party, so you cannot switch.' +
                    '\nSelect a different action!');
                    return true;
                }

                for (let i = 0; i < ooch_inv.length; i++) {
                    ooch_check = ooch_inv[i];
                    ooch_emote = db.monster_data.get([ooch_check.id], 'emote');
                    ooch_name = ((ooch_check.nickname != -1) ? ooch_check.nickname : ooch_check.name);
                    ooch_hp = `${ooch_check.current_hp}/${ooch_check.stats.hp} HP`;
                    ooch_button_color = 'PRIMARY';

                    if (i == db.profile.get(message.author.id, 'ooch_active_slot')) {
                        ooch_button_color = 'SUCCESS';
                        ooch_prev_name = ooch_name;
                    }

                    (i <= 2 ? row : row2).addComponents(
                        new Discord.MessageButton()
                            .setCustomId(`${i}`)
                            .setLabel(`${ooch_name} (${ooch_hp})`)
                            .setStyle(ooch_button_color)
                            .setEmoji(ooch_emote),
                    )
                }

                message.channel.send({ content: `Select the new Oochamon you want to switch in!`, components: (row2.components.length != 0) ? [row, row2] : [row]})

                const collector = message.channel.createMessageComponentCollector({ max: 1 });

                await collector.on('collect', async i => {
                    let ooch_pick = db.profile.get(message.author.id, `ooch_inventory[${parseInt(i.customId)}]`)
                    let ooch_pick_name = ((ooch_pick.nickname != -1) ? ooch_pick.nickname : ooch_pick.name);
                    await i.update({ content: `You switched your active Oochamon from **${ooch_prev_name}** to **${ooch_pick_name}**.`, components: [] })
                    db.profile.set(message.author.id, parseInt(i.customId), 'ooch_active_slot');
                    ooch_plr = db.profile.get(message.author.id, `ooch_inventory[${db.profile.get(message.author.id, 'ooch_active_slot')}]`);
                    ooch_pos = db.profile.get(message.author.id, 'ooch_active_slot');

                    message.channel.send(`**------------ Enemy Turn ------------**`)
                    prompt_input = await battle_enemy(message, ooch_plr, ooch_enemy, ooch_pos);
                    message.channel.send(`**----------- Select A Move ----------**\nSelect your next move!\nYour input options are: \`fight\`, \`bag\`, \`switch\`, and \`run\`.`)

                    return true; // This doesn't really do anything to be honest lol
                });

                return false; // Don't prompt for more input

            break;
            case 'run':
                message.channel.send(`You successfully ran away!`)
                db.profile.set(message.author.id, `overworld`, 'player_state')
                db.profile.set(message.author.id, {}, 'ooch_enemy')
                db.profile.set(message.author.id, ooch_plr.stats.hp, `ooch_inventory[${ooch_pos}].current_hp`)
                await wait(20000);
                await message.channel.delete(); 
                return false; // Don't prompt for more input
            break;
        }
    },

    battle: async function(message, choice) {
        const { battle_player, battle_enemy } = require('./func.js');
        
        // Get enemy oochamon data that was previously generated
        let ooch_enemy = db.profile.get(message.author.id, 'ooch_enemy')
        // Get the players oochamon in the first spot of their party
        let ooch_plr = db.profile.get(message.author.id, `ooch_inventory[${db.profile.get(message.author.id, 'ooch_active_slot')}]`);
        let ooch_pos = db.profile.get(message.author.id, 'ooch_active_slot');
        let prompt_input = true;
        let turn_order = ['p', 'e'];

        await message.channel.send(`**You input:** \`${choice}\`\n`);

        // Handle turns
        if (choice == 'fight') {
            if (ooch_enemy.stats.spd > ooch_plr.stats.spd) { // Enemy goes first
                turn_order = ['e', 'p']
            } else { // Player goes first
                turn_order = ['p', 'e'];
            }
        } else if (choice == 'run') {
            if ((ooch_plr.stats.spd + ooch_plr.level * 10) / ((ooch_plr.stats.spd + ooch_plr.level * 10) + (ooch_enemy.stats.spd + ooch_enemy.level * 10) ) > Math.random()) {
                message.channel.send(`**------------ Player Turn ------------**`)
                return battle_player(message, choice, ooch_plr, ooch_enemy, ooch_pos)
            } else {
                message.channel.send(`**------------ Player Turn ------------**`)
                message.channel.send(`You failed to run away!`)
                turn_order = ['e'];
            }
        } else if (choice == 'switch' || choice == 'bag') {
            turn_order = ['p'];
        }

        for (let i = 0; i < turn_order.length; i++) {
            if (turn_order[i] == 'p') { 
                message.channel.send(`**------------ Player Turn ------------**`)
                prompt_input = await battle_player(message, choice, ooch_plr, ooch_enemy, ooch_pos) 
            } else if (turn_order[i] == 'e') {
                message.channel.send(`**------------ Enemy Turn ------------**`)
                prompt_input = await battle_enemy(message, ooch_plr, ooch_enemy, ooch_pos);
            }

            if (i == turn_order.length - 1 && prompt_input == true) {
                message.channel.send(`**----------- Select A Move ----------**\nSelect your next move!\nYour input options are: \`fight\`, \`bag\`, \`switch\`, and \`run\`.`)
            }
        }

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
    }
}