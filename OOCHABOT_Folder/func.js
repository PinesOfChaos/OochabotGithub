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

        // Have a chance to make the wild oochamon be the evolved form
        let evo_chance = random_number(0, 1) + random_number(0, 1)
        if (evo_chance == 2 && lvl >= evo2_lvl && evo2_lvl != -1) {
            ooch_pick = evo2_id;
        } else if (evo_chance == 1 && lvl >= evo1_lvl && evo1_lvl != -1) {
            ooch_pick = evo1_id;
        }

        // Get wild oochamon stats
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
                spd: spd
            },
            current_hp: hp,
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

    move: function(user_id, direction) {
        console.log(user_id, direction)
    },
    
    battle: async function(message, choice) {
        const wait = require('wait');
        
        // Get enemy oochamon data that was previously generated
        let ooch_enemy = db.profile.get(message.author.id, 'ooch_enemy')
        // Get the players oochamon in the first spot of their party
        let ooch_plr = db.profile.get(message.author.id, 'ooch_inventory')[0];
        let ooch_pos = 0;
        let dmg = 0;
        let battle_over = false;

        await message.channel.send(`**You input:** \`${choice}\`\n`);

        // Handle player turn
        switch(choice) {
            case 'fight':
                if (ooch_enemy.stats.spd > ooch_plr.stats.spd) { // Enemy goes first

                    message.channel.send(`**------------ Enemy Turn ------------**`)
                    // Enemy attacks player
                    dmg = 1
                    ooch_plr.current_hp -= dmg
                    db.profile.set(message.author.id, ooch_plr, `ooch_inventory[${ooch_pos}]`);
                    await message.channel.send(
                            `The enemy ${ooch_enemy.name} deals ${dmg} damage to your ${ooch_plr.name}!\nYour ${ooch_plr.name} has ${ooch_plr.current_hp} hp remaining.\n` +
                            `**------------ Player Turn ------------**`)

                    // Player attacks enemy
                    dmg = 2
                    ooch_enemy.current_hp -= dmg
                    await message.channel.send(`Your ${ooch_plr.name} deals ${dmg} damage to the enemy ${ooch_enemy.name}!\nThe enemy ${ooch_enemy.name} has ${ooch_enemy.current_hp} hp remaining.`)

                } else if (ooch_enemy.stats.spd <= ooch_plr.stats.spd) { // Player goes first

                    message.channel.send(`**------------ Player Turn ------------**`)
                    // Player attacks enemy
                    dmg = 2
                    ooch_enemy.current_hp -= dmg
                    await message.channel.send(
                        `Your ${ooch_plr.name} deals ${dmg} damage to the enemy ${ooch_enemy.name}!\nThe enemy ${ooch_enemy.name} has ${ooch_enemy.current_hp} hp remaining.\n` +
                        `**------------ Enemy Turn ------------**`)

                    // Enemy attacks player
                    dmg = 1
                    ooch_plr.current_hp -= dmg
                    db.profile.set(message.author.id, ooch_plr, `ooch_inventory[${ooch_pos}]`);
                    await message.channel.send(`The enemy ${ooch_enemy.name} deals ${dmg} damage to your ${ooch_plr.name}!\nYour ${ooch_plr.name} has ${ooch_plr.current_hp} hp remaining.`)

                }

                // Victory/Defeat Check
                if (ooch_enemy.current_hp <= 0) { // Victory

                    message.channel.send(`**You win!**\nHead back to the Hub to continue playing.`)
                    db.profile.set(message.author.id, `overworld`, 'player_state')
                    db.profile.set(message.author.id, {}, 'ooch_enemy')
                    await wait(20000);
                    battle_over = true;
                    await message.channel.delete();

                } else if (ooch_plr.current_hp <= 0) {

                    message.channel.send(`**You lose...**\nYou lose 20 pp.\nHead back to the Hub to continue playing.`)
                    db.profile.set(message.author.id, `overworld`, 'player_state')
                    db.profile.set(message.author.id, {}, 'ooch_enemy')
                    db.profile.set(message.author.id, ooch_plr.stats.hp, `ooch_inventory[${ooch_pos}].current_hp`)
                    await wait(20000);
                    battle_over = true;
                    await message.channel.delete();

                }
            break;
            case 'bag': 
                
            break;
            case 'switch': break;
            case 'run':
                if ((ooch_plr.stats.spd + ooch_plr.level * 10) / ((ooch_plr.stats.spd + ooch_plr.level * 10) + (ooch_enemy.stats.spd + ooch_enemy.level * 10) ) > Math.random()) { // If we succeed
                    message.channel.send(`You successfully ran away!`)
                    db.profile.set(message.author.id, `overworld`, 'player_state')
                    db.profile.set(message.author.id, {}, 'ooch_enemy')
                    db.profile.set(message.author.id, ooch_plr.stats.hp, `ooch_inventory[${ooch_pos}].current_hp`)
                    await wait(20000);
                    battle_over = true;
                    await message.channel.delete(); 
                } else {
                    message.channel.send(`You failed to run away!`)
                    // Enemy attacks player
                    dmg = 1
                    ooch_plr.current_hp -= dmg
                    db.profile.set(message.author.id, ooch_plr, `ooch_inventory[${ooch_pos}]`);
                    await message.channel.send(`The enemy ${ooch_enemy.name} deals ${dmg} damage to your ${ooch_plr.name}!\nYour ${ooch_plr.name} has ${ooch_plr.current_hp} hp remaining.`)
                }
            break;
        }
        
        if (battle_over == false) message.channel.send(`**----------- Select A Move ----------**\nSelect your next move!\nYour input options are: \`fight\`, \`bag\`, \`switch\`, and \`run\`.`)
    },

    gen_map: function(map_size, chests, biome) {
        let map = [];
        let center = Math.floor(map_size/2);
        

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

            //console.log('Chest X/Y')
            //console.log(xpos)
            //console.log(ypos)
        }

        

        //create paths to chests
        for(let i = 0; i < chests; i++){
            xpos = chest_positions[i][0];
            ypos = chest_positions[i][1];

            //console.log('Chest Finder X/Y')
            //console.log(xpos)
            //console.log(ypos)

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

                //console.log('Path X/Y')
                //console.log(xpos)
                //console.log(ypos)

                xpos += Math.round(Math.random()*2)-1;
                ypos += Math.round(Math.random()*2)-1;
                
                //console.log('Path Random Added X/Y')
                //console.log(xpos)
                //console.log(ypos)

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

        //place spawn position
        map[center][center] = 2
        

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

        //0 path
        //1 block
        //2 spawn
        //3 chest

        
        //===========================

        switch(biome){
            case('obsidian'):
                tile_emotes = ['<:tObsd:921225027557412975>', '<:tObsdB:921225027624501268>', '<:tile_player:921492132966060042>', '<:tile_chest:921486599223664640>']
            break;
            
            case('desert'):
                tile_emotes = ['<:tSand:921220712641986572>', '<:tSandB:921220723110977606>', '<:tile_player:921492132966060042>', '<:tile_chest:921486599223664640>']
            break;

            case('fungal'):
                tile_emotes = ['<:tShrm:921230053499617331>', '<:tShrmB:921230053503819777>', '<:tile_player:921492132966060042>', '<:tile_chest:921486599223664640>']
            break;

            default:
                tile_emotes = ['<:tHUB:921240940641939507>', '<:tHUBB:921240940641919056>', '<:tile_player:921492132966060042>', '<:tile_chest:921486599223664640>']
            break;
        }

        let emote_map = [];
        let size = map_array.length;
        let view_size = 2;

        for (let i = -view_size; i < view_size; i++) {
            emote_map[i] = [];
            for (let j = -view_size; j < view_size; j++) {
                if(i+x_pos<0 || j+y_pos<0 || i+x_pos >= size || j+ypos >= size){
                    tile_value = '<:tHUBB:921240940641919056>';
                }
                else{
                    tile_value = map_array[i+x_pos][j+y_pos]
                }
                
                emote_map[i+view_size][j+view_size] = tile_emotes[tile_value]
            }
            emote_map[i] = emote_map[j].join('');
        }
        emote_map = emote_map.join('\n')

        return([emote_map]);
    }
}