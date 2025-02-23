const _ = require('lodash');
const { OochType, GenmapTheme } = require("./types");
const { create_ooch } = require('./func_play.js');
const db = require("./db.js")

let functions = {
    genmap_theme : function(theme){
        switch(theme){
            case GenmapTheme.FungalCave: //Fungal Cave
                return({
                    tile_floor : ["t01_000"],
                    tile_wall : ["t01_006"],
                    tile_edge : ["t01_003"],
                    tile_decor : ["t01_001"],
                    tile_grass : ["t01_002"],

                    types_primary : [OochType.Fungal],
                    types_secondary : [OochType.Sound, OochType.Ooze],

                    map_naturalness : .7
                })
            break;
            case GenmapTheme.ObsidianPath: //Obsidian Path
                return({
                    tile_floor : ["t04_000"],
                    tile_wall : ["t04_004"],
                    tile_edge : ["t03_003"],
                    tile_decor : ["t04_001"],
                    tile_grass : ["t04_002"],

                    types_primary : [OochType.Flame],
                    types_secondary : [OochType.Stone, OochType.Crystal],

                    map_naturalness : .5
                })
            break;
        }
    },

    genmap_new : function(name, width, height, theme, level_min, level_max, exit_map, exit_x, exit_y, has_savepoints = false, has_shops = false){
        //TODO Filter out flags with the map name from users' flag lists


        let base_layout = functions.genmap_layout(width, height, Math.ceil(width / 16), Math.ceil(height / 16), 3, 5, theme.map_naturalness);
        let layout = base_layout.layout;
        let spawnzones_arr = base_layout.spawnzones;

        let savepoints = [];
        let spawnzones = [];
        let transitions = [];
        let npcs = [];
        let shops = [];
        let tiles = [];

        let start_pos = false;
        let end_pos = false;
        let misc_positions = [];
        for(let i = 0; i < width; i++){
            tiles[i] = [];
            for(let j = 0; j < height; j++){
                switch(layout[i][j]){
                    case "wall":    tiles[i][j] = theme.tile_wall; break;
                    case "floor":   tiles[i][j] = theme.tile_floor; break;
                    case "grass":   tiles[i][j] = theme.tile_grass; break;
                    case "edge":    tiles[i][j] = theme.tile_edge; break;
                    case "decor":   tiles[i][j] = theme.tile_decor; break;
                    default: 
                        tiles[i][j] = theme.tile_floor; 
                        switch(layout[i][j]){
                            case "start": 
                                start_pos = {x : i, y : j}; 
                                break;
                            case "end": 
                                end_pos = {x : i, y : j};
                                tiles[i][j] = "t00_012"; break;
                                break;
                            case "misc": misc_positions.push({x : i, y : j}); break;
                        }
                    break;
                }
            }
        }

        //Place spawnzones
        for(let zone of spawnzones_arr){
            genmap_spawnzone(zone.x, zone.y, zone.w, zone.h, min_level, max_level, theme.types_primary, theme.types_secondary);
        }

        //Place a savepoint at the spawn if the map should have one
        if(has_savepoints){
            tiles[start_pos.x][start_pos.y] = "t00_001";
            savepoints.push({
                is_default : true,
                x : start_pos.x,
                y : start_pos.y
            })
        }

        //Place a shop next to the spawn if the map should have one
        if(has_shops){
            tiles[start_pos.x + 1][start_pos.y] = "t00_007";
            shops.push({
                greeting_dialogue : "Main System Initiating Shopkeep Mode",
                image : "",
                special_items : [],
                type : "default",
                x : start_pos.x + 1,
                y : start_pos.y
            })
        }

        //fill the misc positions with npcs/chests
        misc_positions = _.shuffle(misc_positions);
        let npc_count = Math.floor(misc_positions.length * .8)

        //Add npcs
        for(let i = 0; i < npc_count; i++){
            map_npcs.push(functions.genmap_npc(
                misc_positions[i].x, misc_positions[i].y,
                level_min, level_max
            ))
        }

        //Add chests (picks up where npcs ends)
        for(let i = npc_count; i < misc_positions.length; i++){
            map_npcs.push(functions.genmap_chest(
                misc_positions[i].x, misc_positions[i].y,
                level_min, level_max
            ))
        }
        
        //Add end of floor exit tile
        transitions.push({
            connect_map : exit_map,
            connect_x : exit_x,
            connect_y : exit_y,
            x : end_pos.x,
            y : end_pos.y
        })


        let map_data = {
            map_events : [],
            map_npcs : npcs,
            map_savepoints : savepoints,
            map_shops : shops,
            map_spawn_zones : spawnzones,
            map_transitions : transitions,

            map_tiles : tiles,

            map_info : {
                map_battleback : "battle_bg_hub",
                map_name : name,
                map_generated : true,
                map_failsafe_pos : start_pos,
            }
        }

        return(map_data);
    },

    genmap_empty_npc : function(){
        return({
            aggro_range : 0,
            coin : 0,
            flag_given : "",
            flag_required : "",
            flag_kill : "",
            remove_on_finish : false,
            is_catchable : false,
            items : [],
            name : "",
            npc_id : "",
            
            pre_combat_dialog: "",
            post_combat_dialog: "",
            
            sprite : 0,
            sprite_combat : "",
            sprite_dialog : "",
            sprite_id : "",
            team : [],
            x : x,
            y : y
        })
    },

    genmap_chest : function(x, y, level_min, level_max){
        let chest_level = _.random(level_min, level_max, false);
        let chest_num = _.random(1, 3, false);
        let loot_table = [];
        let chest_loot = [];

        if(chest_level < 30){
            loot_table = loot_table.concat([
                {count : 5, id :  0}, //potion
                {count : 2, id :  1}, //med-potion
                {count : 3, id :  3}, //prism
                {count : 1, id :  4}, //greater prism
                {count : 2, id :  9}, //eyedrops
                {count : 2, id : 10}, //shears
                {count : 2, id : 11}, //daylily
                {count : 2, id : 12}, //antiparasite
                {count : 2, id : 13}, //debug chip
                {count : 2, id : 14}, //cooling balm
                {count : 2, id : 15}, //nullifying sphere
                {count : 1, id : 16}, //green boostgem
                {count : 1, id : 17}, //red boostgem
                {count : 1, id : 18}, //blue boostgem
                {count : 1, id : 19}, //yellow boostgem
                {count : 1, id : 22}, //repulsor
                {count : 1, id : 23}, //emergency teleporter  
            ])
        }
        if(chest_level > 20){
            loot_table = loot_table.concat([
                {count : 5, id :  1}, //med-potion
                {count : 2, id :  2}, //hi-potion
                {count : 3, id :  4}, //greater prism
                {count : 1, id :  5}, //grand prism
                {count : 2, id :  9}, //eyedrops
                {count : 2, id : 10}, //shears
                {count : 2, id : 11}, //daylily
                {count : 2, id : 12}, //antiparasite
                {count : 2, id : 13}, //debug chip
                {count : 2, id : 14}, //cooling balm
                {count : 2, id : 15}, //nullifying sphere
                {count : 2, id : 23}, //emergency teleporter  
            ])
        }
        if(chest_level >= 30){
            loot_table = loot_table.concat([
                {count : 5, id :  1}, //med-potion
                {count : 5, id :  2}, //hi-potion
                {count : 5, id :  4}, //greater prism
                {count : 3, id :  5}, //grand prism
                {count : 1, id :  7}, //attack crystal
            ])
        }
        if(chest_level >= 40){
            loot_table = loot_table.concat([
                {count : 5, id :  2}, //hi-potion
                {count : 5, id :  5}, //grand prism
                {count : 1, id :  6}, //perfect prism
                {count : 1, id :  7}, //attack crystal
            ])
        }

        for(let i = 0; i < chest_num; i++){
            chest_loot.push(_.sample(loot_table));
        }



        let npc = functions.genmap_empty_npc();
        npc.x = x;
        npc.y = y;
        npc.aggro_range = 0;
        npc.items = chest_loot;
        npc.sprite_id = "c_013";
        npc.npc_id = "1234567890";
        npc.name = "Chest";
        npc.pre_combat_dialog = "You opened the chest...";
        npc.post_combat_dialog = "";
        npc.remove_on_finish = true;

        return npc;
    },

    genmap_ooch_list : function(level){
        let ooch_list = db.monster_data.values();
        ooch_list.filter((mon) => 
            mon.evo_stage > 0 && //remove all mons that are evolved (we will evolve them later)
            ![ //remove legendaries and special mons the player shouldnt see
                34, //Purif-i
                -1, //i
                105, //Nullifly,
                96, //Tryptid
                97, //Roswier
                98, //Chemerai
            ].includes(mon.id));
        
        for(let ooch of ooch_list){
            let evo_level = ooch.evo_level;
            if(evo_level <= level){
                let evo = db.monster_data.get(`${ooch.evo_id}`);
                if(evo_level != evo.evo_level){ //Prevent cyclical evolutions from infinitely looping this
                    ooch_list.push(evo);
                }
            }
        }
        
        return(ooch_list);
    },

    genmap_spawnzone : function(x, y, w, h, min_level, max_level, types_primary, types_secondary){
        let spawn_slots = [];
        
        let types = [_.sample(types_primary), _.sample(types_primary), _.sample(types_secondary)]

        for(let i = 0; i < types.length; i++){
            let options = functions.genmap_ooch_list(min_level);
            options.filter((o) => o.type.includes(types[i]));

            spawn_slots.push({
                min_level : min_level,
                max_level : max_level,
                ooch_id : _.sample(options).id
            })
        };
        
        let spawnzone = {
            x : x,
            y : y, 
            height : h,
            width : w,
            spawn_slots : spawn_slots
        }

        return spawnzone;
    },

    genmap_npc : function(x, y, level_min, level_max){
        
        const lerp = (x, y, a) => x * (1 - a) + y * a;

        let teamsize = Math.floor(Math.random() * 3) + 1;
        let avg_level = lerp(level_max, level_min, teamsize/4); //more team, lower avg level

        

        //Add mons to the npc's team
        let team = [];
        let npc_ooch_options = functions.genmap_ooch_list(min_level);
        for(let i = 0; i < teamsize; i++){
            let ooch = _.sample(npc_ooch_options);
            let ooch_level = avg_level + _.random(0, 2, false);

            team.push(create_ooch(ooch.id, ooch_level));
        }

        let npc = functions.genmap_empty_npc()
        npc.x = x;
        npc.y = y;
        npc.aggro_range = 3;
        npc.team = team;
        npc.sprite_id = _.sample([
            "c00_001", "c00_002", "c00_003", "c00_004", "c00_005", "c00_011", "c00_014",
        ]);
        npc.npc_id = "1234567890";
        npc.name = "Wandering Trainer";
        npc.pre_combat_dialog = _.sample([
            "...",
            "???",
            "!!!",
            "We must fight!",
            "It's Oochabattlin' time.\n*starts Oochabattlin' everywhere*",
            "So, you come here often?",
            "Fight me or fight me, the choice is yours!",
            "Hey, so I might be a little lost.",
            "Wanna battle?",
            "It's a me, and I'm your problem now!",
            "Hey, where'd everybody go?",
            "I've been wandering for hours...",
            "You ever get the feeling you've been here before?",
            "I can't find my nose, *you* must have it, thief!",
            "Oh yeah, it's all Oochin' together!",
            "Give me your kneecaps!",
            "*Is too busy consuming fistfuls of sand to say anything*",
            "Wanna battle?",
            "Help, I can't stop winning battles!",
            "Oh how nice, you came all the way here just to lose!",
            "Shh, I'm being sneaky.",
            "Never give up, never surrender!",
            "I know your IP address, I bet it's 192.168.1.1!",
            "Sometimes I like to stand in the middle of empty rooms and contemplate life.",
            "Oh, hi there, fighty fighty time?",
            "Don't think about the lore implications of this area, okay?",
            "I've done it, I finally know how to breathe!",
            "Ok, but don't run away this time!",
            "I refused to read signs for years and the avatar of sign smited me from existence.",
            "You ever meet Mr. Nice? He sure is a very real person that I didn't just make up now!",
            "Hello, yes, I would like to purchase one battle please!",
            "Today's episode is sponsored by the letter 3.",
            "Martial-type? No, I don't think that's a thing.",
            "I have never known defeat!",
            "Every time you run away from a battle I get a little closer.",
            "You ever encounter an inky-black Oochamon that looks like it's glitching? Weird little thing.",
            "Did you know that giraffes are, in fact, real animals?",
            "Why have lunch when we can have battle?",
            "This is *not* what I signed up for.",
            "Elbows are best not thought about...",
            "This isn't even my final form!",
            "If not supposed to eat battery, why battery taste good?"
        ])
        npc.post_combat_dialog = "*The trainer suddenly vanishes...*"
        npc.remove_on_finish = true;

        return npc;
    },

    genmap_layout : function(width, height, room_cols, room_rows, room_size_avg, naturalness){

        const lerp = (x, y, a) => x * (1 - a) + y * a;

        //Empty layout
        let layout = []
        for(let i = 0; i < width; i++){
            layout[i] = [];
            for(let j = 0; j < height; j++){
                layout[i][j] = "wall"
            }
        }

        
        //Randomize x_start/end
        let xrand =  Math.random() > .5;
        let start_x = xrand ? 0 : room_cols - 1;
        let end_x = xrand ? room_cols - 1 : 0;
        
        let yrand =  Math.random() > .5;
        let start_y = yrand ? 0 : room_rows - 1;
        let end_y = yrand ? room_rows - 1 : 0;
        
        let start_pos = {x : 0, y : 0};
        let end_pos = {x : 0, y : 0};
        let optional_spots = [];

        //Decide on rooms
        let rooms = [];
        let room_space_x = width / (room_cols + 1);
        let room_space_y = height / (room_rows + 1);
        for(let i = 0; i < room_cols; i++){
            for(let j = 0; j < room_rows; j++){

                let coord_to = -1;
                if(j > 0){ coord_to = {x : i,      y : j - 1}}
                if(i > 0){ coord_to = {x : i - 1,  y : j}}
                //point left if not leftmost, point up if not upmost, otherwise point nowhere
                //this should connect all nodes by default

                let room_center_x = Math.floor((i * room_space_x) + room_space_x + (Math.random() * 8 * (naturalness + .5)) - 1);
                let room_center_y = Math.floor((j * room_space_y) + room_space_y + (Math.random() * 8 * (naturalness + .5)) - 1)

                rooms.push({
                    roomgridx : i,
                    roomgridy : j,
                    x : room_center_x,
                    y : room_center_y,
                    width : Math.round((room_size_avg/2) + (Math.random() * 2) - 1),
                    height : Math.round((room_size_avg/2) + Math.random() - .5),
                    coord_to : coord_to
                    
                })

                if(i == start_x && j == start_y){
                    start_pos = {x : room_center_x, y : room_center_y}
                }
                else if(i == end_x && j == end_y){
                    end_pos = {x : room_center_x, y : room_center_y}
                }
                else {
                    optional_spots.push({x : room_center_x, y : room_center_y});
                }
            }
        }

        //Decide on hallways 
        let iterations = room_cols * room_rows * 10;
        
        for(let i = 0; i < iterations; i++){
            let room_at = rooms.find((r) => r.coord_to == -1)
            let in_range = false;

            while(!in_range){
                let dir = Math.floor(Math.random()*4)/2 * Math.PI;
                let xto = Math.round(room_at.roomgridx + Math.cos(dir));
                let yto = Math.round(room_at.roomgridy + Math.sin(dir));

                if(xto >= 0 && yto >= 0 && xto < room_cols && yto < room_rows){
                    let room_to = rooms.find((r) => r.roomgridx == xto && r.roomgridy == yto)

                    in_range = true;

                    room_at.coord_to = {x : xto, y : yto};
                    room_to.coord_to = -1;
                }
            }
        }

        console.log("Adding rooms/halls")

        //Add rooms/halls to the layout
        for(let room of rooms){
            //Add rooms
            let xmin = Math.max(2, Math.floor(room.x - room.width/2));
            let ymin = Math.max(1, Math.floor(room.y - room.height/2));
            let xmax = Math.min(width - 4, Math.ceil(room.x + room.width/2));
            let ymax = Math.min(height - 3, Math.ceil(room.y + room.height/2));
            let maxlen = Math.sqrt(
                            Math.pow(room.width, 2) + 
                            Math.pow(room.height, 2));

            for(let i = xmin; i < xmax; i++){
                for(let j = ymin; j < ymax; j++){
                    let len = Math.sqrt(
                                    Math.pow(Math.abs(i - room.x), 2) + 
                                    Math.pow(Math.abs(j - room.y), 2));
                    
                    let lerp_amnt = 1 - len/maxlen;
                    let val = .5 + lerp_amnt - naturalness;
                    if(val > .5){
                        layout[i][j] = "floor";
                    }
                }
            }

            //Add hallways
            if(room.coord_to != -1){
                
                let room_to = rooms.find((r) => 
                    r.roomgridx == room.coord_to.x && 
                    r.roomgridy == room.coord_to.y);

                let corner = Math.random() > .5 ?
                    {x : room.x,    y : room_to.y} :
                    {x : room_to.x, y : room.y};

                let segments = [{x : room.x, y : room.y}, corner, {x : room_to.x, y : room_to.y}]

                let xat = segments[0].x;
                let yat = segments[0].y;
                let xto = segments[1].x;
                let yto = segments[1].y;
                
                let steps_total = Math.abs(room_to.x - room.x) + Math.abs(room_to.y - room.y);
                let steps_done = 0;
                
                console.log(`${room.roomgridx}, ${room.roomgridy} => ${room_to.roomgridx}, ${room_to.roomgridy}, [${steps_total}]`)
                
                for(let i = 0; i < segments.length - 1; i++){
                    xto = segments[i + 1].x;
                    yto = segments[i + 1].y

                    while(xat != xto || yat != yto){
                        xat += Math.sign(xto - xat);
                        yat += Math.sign(yto - yat);
                        steps_done++;
                    
                        let lx = lerp(segments[0].x, segments[2].x, steps_done/steps_total);
                        let ly = lerp(segments[0].y, segments[2].y, steps_done/steps_total);
                        console.log(steps_done/steps_total);
                        let cx = Math.floor(lerp(xat, lx, naturalness * .8));
                        let cy = Math.floor(lerp(yat, ly, naturalness * .8));
                        
                        layout[cx][cy] = "floor";
                        for(let dir = 0; dir < 2 * Math.PI; dir += Math.PI/4){
                            layout[
                                cx + Math.round(Math.cos(dir))
                            ][
                                cy + Math.round(Math.sin(dir))
                            ] = "floor";
                        }

                        console.log[cx, cy];
                    }

                    
                }
            }
            
        }

        //Add wall edges where it makes sense to
        for(let i = 0; i < width; i++){
            for(let j = 1; j < height; j++){
                if(layout[i][j - 1] == "wall" && layout[i][j] == "floor"){
                    layout[i][j - 1] = "edge";
                }
            }
        }

        //Place walls above edge tiles if needed
        for(let i = 0; i < width; i++){
            for(let j = 0; j < height - 1; j++){
                if(layout[i][j] == "floor" && layout[i][j + 1] == "edge"){
                    layout[i][j] = "wall";
                }
            }
        }

        //Place decor around the map
        for(let i = 0; i < width * height / 20; i++){
            let dx = Math.floor(Math.random() * (width - 1));
            let dy = Math.floor(Math.random() * (height - 1));

            if(layout[dx][dy] == "floor"){
                let placeable = true;

                for(let dir = 0; dir < 2 * Math.PI; dir += Math.PI/4){
                    if(layout[ dx + Math.round(Math.cos(dir)) ][ dy + Math.round(Math.sin(dir)) ] == "decor"){
                        placeable = false;
                    }
                }

                if(placeable){ 
                    console.log(dx, dy)
                    layout[dx][dy] = "decor"; 
                }
            }
        }

        //Place grass patches
        let spawnzones = []
        for(let i = 0; i < room_cols * room_rows; i++){
            let grass_done = false;
            while(!grass_done){
                let gx = Math.floor(Math.random() * (width - 1));
                let gy = Math.floor(Math.random() * (height - 1));
                if(layout[gx][gy] != "floor"){ continue; }

                let gw = Math.floor((Math.random() * 2) + 1);
                let gh = Math.floor((Math.random() * 2) + 1);
                for(let j = gx - gw; j < gx + gw; j++){
                    for(let k = gy - gh; k < gy + gh; k++){
                        if(layout[j][k] == "floor"){ layout[j][k] = "grass"; }
                    }
                }
                grass_done = true;
                spawnzones.push({
                    x : gx - gw,
                    y : gy - gh,
                    w : gw * 2,
                    h : gh * 2
                })
            }
        }

        
        //Add start and end points
        layout[start_pos.x][start_pos.y] = "start";
        layout[end_pos.x][end_pos.y] = "end";

        //Add optional content spots
        for(let spot of optional_spots){
            layout[spot.x][spot.y] = "misc";
        }

        if(true){ //This section is for testing purposes, make false if not testing
            var layout_text = '';
            for(let j = 1; j < height; j++){
                for(let i = 0; i < width; i++){
                    switch(layout[i][j]){
                        case "wall":    layout_text += "[]"; break;
                        case "floor":   layout_text += ".."; break;
                        case "grass":   layout_text += "ww"; break;
                        case "edge":    layout_text += "II"; break;
                        case "decor":   layout_text += "oo"; break;
                        
                        case "misc":    layout_text += "XX"; break;
                        case "start":   layout_text += "SS"; break;
                        case "end":     layout_text += "EE"; break;
                    }
                }
                layout_text += "\n"
            }
            console.log("Layout Generated");
            console.log(layout_text);
        }
        return {
            layout : layout,
            spawnzones : spawnzones
        };
    }

}

module.exports = functions;