const db = require("./db")
const wait = require('wait');
const Discord = require('discord.js');

module.exports = {

    move: function(message, direction) {
        /*
            db.player_positions.set(interaction.user.id, interaction.member.displayName, 'player_name');
        */

        const { map_emote_string } = require('./func_play.js');

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
                    (message.channel.messages.fetch(other_map_display)).then(async (msg) => {
                        await msg.edit({ content: map_emote_string(other_biome, other_map_arr, other_x, other_y) }).catch(() => {});
                    }).catch(() => {});
                }
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
    }

}