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