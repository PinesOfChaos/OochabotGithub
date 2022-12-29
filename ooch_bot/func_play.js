const db = require("./db")
const { Flags } = require('../types.js');

module.exports = {

    move: function(message, direction, dist = 1) {
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
        let map_name = player_location.area;
        let playerx = player_location.x;
        let playery = player_location.y;
        let player_flags = db.profile.get(target,'flags');

        //Get the map array based on the player's current map
        let map_obj = db.maps.get(map_name.toLowerCase());
        let map_tiles =         map_obj.tiles; 
        let map_npcs =          map_obj.npcs;
        let map_spawns =        map_obj.spawns;
        let map_savepoints =    map_obj.savepoints;
        let map_transitions =   map_obj.transitions;
        let map_events =        map_obj.events;
        //let map_shops =        map_obj.shops; //to be added later
        
        
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
                    if(Math.random() < .25){
                        stop_moving = true;
                        let spawn_zone, x1,y1,x2,y2;
                        for(let j = 0; j < map_spawns.length; j++){
                            spawn_zone = map_spawns[j];
                            x1 = (spawn_zone.x) <= playerx;
                            y1 = (spawn_zone.y) <= playery;
                            x2 = (x1 + spawn_zone.width) < playerx;
                            y2 = (y1 + spawn_zone.height) < playery;
                            if(x1 && y1 && x2 && y2){
                                let slot_index = Math.floor(Math.random() * spawn_zone.spawn_slots.length());
                                let slot = spawn_zone.spawn_slots[slot_index];
                                //use slot .ooch_id, .min_level, .max_level to setup the encounter
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
                    //set player respawn position
                }
            }

            //Events
            let x1,y1,x2,y2;
            for(let obj of map_events){
                x1 = (obj.x) <= playerx;
                y1 = (obj.y) <= playery;
                x2 = (x1 + obj.width) < playerx;
                y2 = (y1 + obj.height) < playery;
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
                                for(let text of obj.player_won_dialogue){
                                    console.log(text);
                                }
                            }
                        }
                        else{ //NPC has not been beaten in any way
                            stop_moving = true;
                            playerx -= xmove;
                            playery -= ymove;

                            //Dialogue Stuff goes here
                            for(let text of obj.pre_combat_dialogue){
                                console.log(text);
                            }
                            if(obj.team.length > 0){ //Start a battle if the npc has mons to battle with
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
        db.profile.set(target, { area: biome, x: playerx, y: playery }, 'location_data');

        // Update player position
        db.player_positions.set(biome, { x: playerx, y: playery }, target);

        //Send reply displaying the player's location on the map
        (message.channel.messages.fetch(msg_to_edit)).then((msg) => {
            msg.edit({ content: map_emote_string(biome, map_arr, playerx, playery) });
        });

    },

    map_emote_string: function(map_name, map_array, x_pos, y_pos) {

        let view_size = 2;
        
        let xx, yy, tile;
        let emote_map = "";
        let map_data = db.maps.get(map_name);
        let map_tiles = map_data.tiles;
        for (let i = -view_size; i < view_size + 1; i++) {
            for (let j = -view_size; j < view_size + 1; j++) {
                //add emote based on tile data to position
                xx = i + x_pos;
                yy = j + y_pos;
                tile = db.tile_data.get(map_tiles[xx][yy]);
                emote_map += tile.emote;
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
        let map_arr = map_obj[1]; //this should be the actual map array

        // Set player position data into the global multiplayer player position db
        db.player_positions.set(biome, { x: playerx, y: playery }, user_id);

        return map_emote_string(biome.toLowerCase(), map_arr, playerx, playery);
    }

}