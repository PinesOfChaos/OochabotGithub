const db = require("./db")
const { Flags } = require('./types.js');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const wait = require('wait');
const _ = require('lodash');
const { event_process, event_from_dialogue } = require('./func_event');

module.exports = {

    move: function(message, direction, dist = 1) {
        /*
            db.player_positions.set(interaction.user.id, interaction.member.displayName, 'player_name');
        */

        const { map_emote_string } = require('./func_play.js');
        const { generate_wild_battle, setup_battle } = require("./func_battle");

        let user_id = message.author.id;
        let xmove = 0;
        let ymove = 0;
        let profile_data = db.profile.get(user_id);
        let msg_to_edit = profile_data.display_msg_id;
        let profile_arr = db.profile.keyArray();
        let confirm_buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId('yes').setLabel('Yes').setStyle(ButtonStyle.Success),
            ).addComponents(
                new ButtonBuilder().setCustomId('no').setLabel('No').setStyle(ButtonStyle.Danger),
            );
        let confirm_collector;
        profile_arr = profile_arr.filter(val => val != message.author.id);
        
        
        //Get the player's location
        let player_location = profile_data.location_data;
        let map_name = player_location.area;
        let playerx = player_location.x;
        let playery = player_location.y;
        let player_flags = profile_data.flags;

        //Get the map array based on the player's current map
        let map_obj =   db.maps.get(map_name.toLowerCase());
        let map_tiles =         map_obj.tiles; 
        let map_npcs =          map_obj.npcs;
        let map_spawns =        map_obj.spawns;
        let map_savepoints =    map_obj.savepoints;
        let map_transitions =   map_obj.transitions;
        let map_events =        map_obj.events;
        //let map_shops =        map_obj.shops; //to be added later
        
        
        //set where the player is going to move
        switch(direction){
            case('a'):
                xmove = -1;
            break;
            case('d'):
                xmove = 1;
            break;
            case('w'):
                ymove  = -1;
            break;
            case('s'):
                ymove = 1;
            break;
        }
        
        //0 path, 1 block, 2 spawn, 3 chest
        let stop_moving = false;
        for(let i = 0; i < dist; i++){
            let tile_id = map_tiles[playerx + xmove][playery + ymove]
            var tile = db.tile_data.get(tile_id.toString()); 
            switch(tile.use){
                case 'wall':
                    stop_moving = true;
                break;
                case 'grass':
                    playerx += xmove;
                    playery += ymove;
                    console.log('Grass Tile')
                    if(Math.random() < .25){
                        console.log('Mon Enountered!')
                        stop_moving = true;
                        let spawn_zone, x1,y1,x2,y2;
                        for(let j = 0; j < map_spawns.length; j++){
                            
                            spawn_zone = map_spawns[j];
                            x1 = (spawn_zone.x) <= playerx;
                            y1 = (spawn_zone.y) <= playery;
                            x2 = (spawn_zone.x + spawn_zone.width) > playerx;
                            y2 = (spawn_zone.y + spawn_zone.height) > playery;

                            if(x1 && y1 && x2 && y2){
                                let slot_index = _.random(0, spawn_zone.spawn_slots.length - 1);
                                let slot = spawn_zone.spawn_slots[slot_index];
                                let mon_level = _.random(slot.min_level, slot.max_level);
                                let mon_name = db.monster_data.get(slot.ooch_id.toString(), 'name');
                                let mon_emote = db.monster_data.get(slot.ooch_id.toString(), 'emote');
                                //use slot .ooch_id, .min_level, .max_level to setup the encounter
                                message.channel.send({ content: `Start battle with wild ${mon_emote} ${mon_name} (LV ${mon_level})?`, components: [confirm_buttons]}).then(async msg =>{
                                    confirm_collector = msg.createMessageComponentCollector({max: 1});
                                    confirm_collector.on('collect', async sel => {
                                        let generated_ooch = generate_wild_battle(slot.ooch_id.toString(), mon_level);
                                        console.log(generated_ooch);
                                        if (sel.customId == 'yes') {
                                            await setup_battle(message.channel, message.author.id, generated_ooch);
                                            await msg.delete();
                                        }
                                        else {
                                            if (Math.random() > .5) { //50/50 chance to run ignoring the encounter entirely if 'No' is chosen
                                                await setup_battle(message.channel, message.author.id, generated_ooch);
                                                await msg.delete();
                                            }
                                            else { // If we fail the 50/50, ignore the input
                                                await msg.delete();
                                            }
                                        }
                                    })
                                })
                            }
;                        }
                    }
                break;
                default:
                    playerx += xmove;
                    playery += ymove;
                break;
            }

            //Save Points
            for(let obj of map_savepoints){
                if(obj.x == playerx && obj.y == playery){
                    //prompt the player 
                    message.channel.send({ content: 'Do you want to set your respawn point here?', components: [confirm_buttons] }).then(async msg => {
                        confirm_collector = msg.createMessageComponentCollector({ max: 1 });
                        confirm_collector.on('collect', async sel => {
                            if (sel.customId == 'yes') {
                                db.profile.set(user_id, { area: 'map_name', x: obj.x, y: obj.y }, 'savepoint_data');
                                await sel.update({ content: 'Checkpoint set.', components: [] });
                                await wait(5000);
                                await msg.delete();
                            } else {
                                msg.delete();
                            }
                        });
                    });
                }
            }

            //Events
            let x1,y1,x2,y2;
            for(let obj of map_events){
                x1 = (obj.x) <= playerx;
                y1 = (obj.y) <= playery;
                x2 = (x1 + obj.width) > playerx;
                y2 = (y1 + obj.height) > playery;
                if(x1 && y1 && x2 && y2){
                    //trigger this event if the player hasn't triggered it already
                }
            }

            //NPCs
            for(let obj of map_npcs){
                //Check if player collides with this NPC's position
                if(obj.x == playerx && obj.y == playery){
                    //Check if this NPC requires a flag to spawn, and if it does check if the player has it
                    if(obj.flag_required == '' || player_flags.includes(obj.flag_required)){
                        let npc_flag = `${Flags.NPC}${obj.name}${obj.x}${obj.y}`; //Flag generated for this npc at this position
                        let player_has_beaten = player_flags.includes(npc_flag); //check if the player has defeated this npc

                        if(obj.beaten || player_has_beaten){ //NPC has been beaten either by default or by the player
                            if(!obj.remove_on_finish){ //NPC should continue to persist after being beaten
                                stop_moving = true;
                                playerx -= xmove;
                                playery -= ymove;

                                //Dialogue Stuff goes here
                                event_process(message, event_from_dialogue(obj.name, obj.player_won_dialogue));
                            }
                        }
                        else{ //NPC has not been beaten in any way
                            console.log('NPC Not Beaten.')
                            stop_moving = true;
                            playerx -= xmove;
                            playery -= ymove;

                            //Dialogue Stuff goes here
                            event_process(message, event_from_dialogue(obj.name, obj.pre_combat_dialogue));

                            if(obj.team.length > 0){ //Start a battle if the npc has mons to battle with
                                console.log('NPC Start Battle.')
                                //Start battle using this NPC's team

                            }
                            else{ //NPC has dialogue/rewards to be given before going to their default state
                                //Give Rewards

                                //Add to list of beaten npcs, also add any flag this npc should give to the player
                                player_flags.push(npc_flag);
                                if(obj.flag_given != ''){
                                    player_flags.push(obj.flag_given); 
                                }
                            }
                        }
                    }
                }
            }

            //Transitions
            for(let obj of map_transitions){
                if(obj.x == playerx && obj.y == playery){
                    stop_moving = true;
                    playerx = obj.connect_x;
                    playery = obj.connect_y;
                    biome = obj.connect_map;
                }
            }

            //if the player has run into anything that would cause them to stop moving, make them stop
            if(stop_moving){ break; }
        }

        //Update the player's profile with their new x & y positions
        db.profile.set(user_id, { area: map_name, x: playerx, y: playery }, 'location_data');

        // Update player position
        db.player_positions.set(map_name, { x: playerx, y: playery }, user_id);

        //Send reply displaying the player's location on the map
        (message.channel.messages.fetch(msg_to_edit)).then((msg) => {
            msg.edit({ content: map_emote_string(map_name, map_tiles, playerx, playery, user_id) });
        });

    },

    map_emote_string: function(map_name, map_tiles, x_pos, y_pos, target_player) {

        let view_size = 3;
        let xx, yy, tile;
        let emote_map = "";
        let map_obj = db.maps.get(map_name);
        let emote_map_array = []

        //Plain map tiles
        for (let i = -view_size; i < view_size + 1; i++) {
            emote_map_array[i + view_size] = [];
            for (let j = -view_size; j < view_size + 1; j++) {
                //add emote based on tile data to position
                xx = i + x_pos;
                yy = j + y_pos;
                if(xx >= 0 && yy >= 0 && xx < map_tiles.length && yy < map_tiles[0].length){
                    tile = db.tile_data.get(map_tiles[xx][yy].toString());
                }
                else {
                    tile = db.tile_data.get('0')//This is the default tile
                }
                emote_map_array[i + view_size][j + view_size] = tile.emote;
            }
        }

        //NPC tiles
        let player_flags = db.profile.get(target_player, 'flags');
        let map_npcs = map_obj.npcs;
        
        for(let obj of map_npcs){
            let npc_flag = `${Flags.NPC}${obj.name}${obj.x}${obj.y}`
            xx = obj.x - x_pos + view_size;
            yy = obj.y - y_pos + view_size;
            if((xx >= 0) && (xx <= view_size * 2) && (yy >= 0) && (yy <= view_size * 2)){
                if(obj.flag_required == '' || player_flags.includes(obj.flag_required)){
                    let player_has_beaten = player_flags.includes(npc_flag); //check if the player has defeated this npc

                    if(obj.beaten || player_has_beaten){ //NPC has been beaten either by default or by the player
                        if(!obj.remove_on_finish){ //NPC should continue to persist after being beaten

                            tile = db.tile_data.get(obj.sprite_id.toString());
                            emote_map_array[xx][yy] = tile.emote;
                        }
                    }
                }
            }
        }

        //Savepoint tiles
        let map_savepoints = map_obj.savepoints;
        for(let obj of map_savepoints){
            xx = obj.x - x_pos + view_size;
            yy = obj.y - y_pos + view_size;
            if((xx >= 0) && (xx <= view_size * 2) && (yy >= 0) && (yy <= view_size * 2)){
                emote_map_array[xx][yy] = '<:t001:1057163945900773436>'; //this is the savepoint tile
            }
        }

        //Put player sprite in center
        emote_map_array[view_size][view_size] = '<:t050:1057164003710877756>'; //this is the default player skin, change later i guess
        
        //Flips the X/Y axis of the tile data (necessary because of how we read the map data)
        let transpose = [];
        let w = emote_map_array.length;
        let h = emote_map_array[0].length;
        for(let i = 0; i < w; i++){
            transpose[i] = []
            for(let j = 0; j < h; j++){
                transpose[i][j] = emote_map_array[j][i];
            }
        }
        emote_map_array = transpose;
        

        //Generate the combined string
        for(let i = 0; i < emote_map_array.length; i++){
            for(let j = 0; j < emote_map_array[i].length; j++){
                emote_map += emote_map_array[i][j];
            }
            emote_map += "\n";
        }
        return(emote_map);
    },

    /**
     * Setup a new playspace window, returns the initial playspace string.
     * @param {Number} user_id The user id of the user having a playspace setup.
     */
    setup_playspace_str: function(user_id) {
        const { map_emote_string } = require('./func_play.js');
        let player_location = db.profile.get(user_id, 'location_data');
        let biome = player_location.area;
        let playerx = player_location.x;
        let playery = player_location.y;

        //Get the map array based on the player's current biome
        let map_obj = db.maps.get(biome.toLowerCase());
        let map_arr = map_obj.tiles; //this should be the actual map array

        // Set player position data into the global multiplayer player position db
        db.player_positions.set(biome, { x: playerx, y: playery }, user_id);

        return map_emote_string(biome.toLowerCase(), map_arr, playerx, playery, user_id);
    }

}