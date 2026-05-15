import { sample, round, shuffle, random } from 'lodash-es';
import { OochType, GenmapTheme, Weather, BattleAi, StanceForms, OochID, OochVariant, Ability, Move, Item } from "./types.js";
import { create_ooch, setup_playspace_str } from './func_play.js';
import { maps, profile, monster_data } from "./db.js";
import { writeFile } from 'fs';
import { TextDisplayBuilder } from 'discord.js';
import { create } from 'domain';

let whitelist_everchange_wild = [
    OochID.Sporbee, OochID.Puppyre, OochID.Roocky, 
    9, 11, 13, 15, 17, 19, 
    22, 24, 26, 29, 32, 35, 37, 39, 
    44, 46, 48, 50, 52, 55, 57, 59, 
    64, 66, 70, 72, 74, 76, 78, 80, 
    81, 83, 85, 87, 89, 91, 93, 99, 
    101, 103, 105, 113, 115, 117, 
    119, 121, 124
]


// eslint-disable-next-line no-unused-vars
let whitelist_everchange_trainer = [21, 62, 109].push(whitelist_everchange_wild)

//These are known npc ids from existing maps so we can update them upon generating the map with the below function
let npc_seer_laurel = "643226616382247130"
let npc_seer_anna = "885717598905588994"
let npc_seer_aira = "264114595846561119"
let npc_updates = [];
export async function genmap_update_outside_npc_dialog(map_name, npc_id, dialog_pre, dialog_post = ""){
    npc_updates.push({
        npc_update_map: `${map_name.toLowerCase()}`,
        npc_update_id: npc_id,
        npc_update_npc_dialog_pre : dialog_pre,
        npc_update_npc_dialog_post : dialog_post
    })
}


export async function genmap_allmaps(client) {
    
    npc_updates = [];

    let everchange_cave_floor_count = 3;
    let everchange_cave_themes = [];
    for(let i = 0; i < everchange_cave_floor_count; i++){
        everchange_cave_themes.push(sample([
            GenmapTheme.ObsidianPath,
            GenmapTheme.FungalCave,
            GenmapTheme.Powerplant
        ]))
    }
    await genmap_dungeon(client, "Everchange Cave", 48, 64, everchange_cave_themes, 40, 50, 'everchange_cave_entrance', -1, -1)

    return npc_updates;
    console.log('Generated daily maps.');
}

export async function genmap_dungeon(client, area_name, start_size, end_size, themes_array = [], level_min, level_max, exit_map, exit_x, exit_y){
    let kickout_list = []; //Used for kicking players back to their last checkpoing if in a generated area
    console.log(`Generating Dungeon: ${area_name}`)

    for(let i = 0; i < themes_array.length; i++){
        let level_name = `${area_name} - Floor ${i+1}`;
        if(themes_array.length == 1) { level_name = area_name}
        let level_lowername = level_name.toLowerCase().replaceAll(' ', '_');
        let level_filename = './Maps/' + level_lowername + '.json'
        

        //
        let em = `${area_name} - Floor ${i+2}`.toLowerCase().replaceAll(' ', '_')
        let ex = -1;
        let ey = -1;
        if(i == themes_array.length - 1){
            em = "everchange_cave_-_final_floor";
        }

        //The deeper in the dungeon we go, the closer the more it steps from start size to end size
        let size = start_size;
        if(themes_array.length > 1){
            let alpha = i / (themes_array.length - 1);
            size = round(start_size + (alpha * (end_size - start_size)));
        }

        let lv_min = level_min;
        let lv_max = level_max;
        if(themes_array.length > 1){
            let alpha1 = (i) / (themes_array.length);
            let alpha2 = (i + 1) / (themes_array.length);
            lv_min = round(level_min + (alpha1 * (level_max - level_min)));
            lv_max = round(level_min + (alpha2 * (level_max - level_min)));
        }
        

        let new_level = await genmap_new(level_name, size, size, genmap_theme(themes_array[i]), lv_min, lv_max, em, ex, ey);
        writeFile(level_filename, JSON.stringify(new_level, null, "\t"), (err) => { if (err) throw err; });
        maps.set(level_lowername, new_level);
        kickout_list.push(level_lowername);

        console.log(`- Generated: ${level_name}`)
    }

    //Add the boss floor to the dungeon
    let level_name = `${area_name} - Final Floor`;
    let level_lowername = level_name.toLowerCase().replaceAll(' ', '_');
    let level_filename = './Maps/' + level_lowername + '.json';
    let new_level = await genmap_final_room(level_name, genmap_theme(GenmapTheme.ObsidianPath), exit_map, exit_x, exit_y)
    writeFile(level_filename, JSON.stringify(new_level, null, "\t"), (err) => { if (err) throw err; });
    maps.set(level_lowername, new_level);
    kickout_list.push(level_lowername);
    console.log(`- Generated: ${level_name}`)


    //Remove all "everchange" flags from players
    let all_users = profile.entries()
    for(let user of all_users) {
        if (user[1].flags == undefined) continue;
        user[1].flags = user[1].flags.filter((flag) => !flag.includes("everchange"));
        profile.set(user[0], user[1].flags, 'flags');
    }

    //Kick players back to their last checkpoint if they're in one of the generated levels
    for (let key of profile.keys()) { 
        let db_profile = profile.get(`${key}`);
        let loc_data = db_profile.location_data;

        for(let level of kickout_list){
            if(loc_data.area == level){
                let checkpoint = db_profile.checkpoint_data;
                profile.set(key, { area : checkpoint.area, x : checkpoint.x, y : checkpoint.y }, 'location_data');
                let playspace_str = await setup_playspace_str(key);
                // Prepend notification to the map content
                const notificationText = "**Notification:** Daily dungeons were reset. You have been moved to your last used save point.\n\n";
                playspace_str.components[0] = new TextDisplayBuilder().setContent(notificationText + playspace_str.mapString);
                let thread = client.channels.cache.get(`${db_profile.play_thread_id}`);
                let msg_to_edit = profile.get(`${key}`, 'display_msg_id');

                if (thread != undefined && thread != false) {
                    await (thread.messages.fetch(msg_to_edit)).then(async (msg) => {
                        await msg.edit({ components: playspace_str.components, flags: playspace_str.flags }).catch(() => {});
                    }).catch(() => {});
                }
            }
        }
    }
}

/**
 * Gets a theme to use in generated maps
 * @param {Int} theme GenmapTheme.Theme 
 * @returns a struct of data to feed into genmap_new
 */
export function genmap_theme(theme){
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

                map_naturalness : .7,

                weather_options : [Weather.None],
                battle_bg : "battle_bg_fungal_cave"
            })
        case GenmapTheme.ObsidianPath: //Obsidian Path
            return({
                tile_floor : ["t04_000"],
                tile_wall : ["t04_004"],
                tile_edge : ["t04_003", "t04_003", "t04_003", "t04_003", "t04_003", "t04_003", "t04_003", "t04_003", "t04_003", "t04_022"],
                tile_decor : ["t04_001"],
                tile_grass : ["t04_002"],

                types_primary : [OochType.Flame],
                types_secondary : [OochType.Stone, OochType.Crystal],

                map_naturalness : .5,

                weather_options : [Weather.None, Weather.Heatwave],
                battle_bg : "battle_bg_lava_fields"
            })
        case GenmapTheme.Powerplant: //Powerplant
            return({
                tile_floor : ["t06_000", "t06_000", "t06_000", "t06_000", "t06_000", "t06_008"],
                tile_wall : ["t00_000"],
                tile_edge : ["t06_010", "t06_010", "t06_010", "t06_010", "t06_010", "t06_010", "t06_010", "t06_010", "t06_012", "t06_011"],
                tile_decor : ["t06_026", "t06_030", "t06_031", "t06_032", "t06_001"],
                tile_grass : ["t06_007"],

                types_primary : [OochType.Tech],
                types_secondary : [OochType.Cloth, OochType.Stone],

                map_naturalness : 0.1,

                weather_options : [Weather.None],
                battle_bg : "battle_bg_powerstation"
            })
    }
}

/**
 * Generates a new map and returns its map data
 * @param {String} name Name of the map to generate, this this will be converted to snake_case.json in the level name
 * @param {Theme} theme Use genmap_theme(GenmapTheme.XXXXXX) 
 * @param {String} exit_map Map where the exit of this level should lead to (examples: lava_path, training_facility, tutorial)
 * @param {Int} exit_x Where on the map to place the player use -1 to use failsafe position
 * @param {Int} exit_y Where on the map to place the player use -1 to use failsafe position
 * */
export async function genmap_final_room(name, theme, exit_map, exit_x, exit_y){

    let width = 15;
    let height = 27;

    let base_layout = genmap_layout_final_room(width, height);
    let layout = base_layout.layout;
    let savepoints = [];
    let spawnzones = [];
    let transitions = [];
    let npcs = [];
    let shops = [];
    let tiles = [];
    let weatherzones = [];

    let start_pos = false;
    let end_pos = false;
    let boss_pos = {x : 0, y : 0};
    for(let i = 0; i < width; i++){
        tiles[i] = [];
        for(let j = 0; j < height; j++){
            switch(layout[i][j]){
                case "wall":    tiles[i][j] = sample(theme.tile_wall); break;
                case "floor":   tiles[i][j] = sample(theme.tile_floor); break;
                case "grass":   tiles[i][j] = sample(theme.tile_grass); break;
                case "edge":    tiles[i][j] = sample(theme.tile_edge); break;
                case "decor":   tiles[i][j] = sample(theme.tile_decor); break;
                default: 
                    tiles[i][j] = sample(theme.tile_floor); 
                    switch(layout[i][j]){
                        case "start": 
                            start_pos = {x : i, y : j}; 
                            break;
                        case "end": 
                            end_pos = {x : i, y : j};
                            tiles[i][j] = "t00_012"; break;
                        case "misc": boss_pos = {x : i, y : j}; break;
                    }
                break;
            }
        }
    }

    //Add boss npc
    let npc_boss = await genmap_npc_boss(boss_pos.x, boss_pos.y);
    npc_boss.npc_id += name;//Append the map name to the NPC to be removed later
    npcs.push(npc_boss);

    //Add reward oochamon
    let npc_reward = await genmap_npc_reward_ooch(boss_pos.x, boss_pos.y);
    npc_reward.npc_id += name;//Append the map name to the NPC to be removed later
    npcs.push(npc_reward);

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
        map_weather : weatherzones,

        map_info : {
            map_battleback : theme.battle_bg,
            map_name : name,
            map_generated : true,
            map_failsafe_pos : start_pos,
        }
    }

    return(map_data);
}

/**
 * Generates a new map and returns its map data
 * @param {String} name Name of the map to generate, this this will be converted to snake_case.json in the level name
 * @param {Int} width Tile width (64 recommended for full size level)
 * @param {Int} height Tile height (64 recommended for full size level)
 * @param {Theme} theme Use genmap_theme(GenmapTheme.XXXXXX) 
 * @param {Int} level_min Minimum level of encounters in the level
 * @param {Int} level_max Maximum level of encounters in the level
 * @param {String} exit_map Map where the exit of this level should lead to (examples: lava_path, training_facility, tutorial)
 * @param {Int} exit_x Where on the map to place the player use -1 to use failsafe position
 * @param {Int} exit_y Where on the map to place the player use -1 to use failsafe position
 * @param {Boolean} has_savepoints Whether the generated map should have a savepoint
 * @param {Boolean} has_shops Whether the generated map should have a shop
 * @returns Map data ready to be converted to a .js file
 */
export async function genmap_new(name, width, height, theme, level_min, level_max, exit_map, exit_x, exit_y, has_savepoints = false, has_shops = false){

    let base_layout = genmap_layout(width, height, Math.ceil(width / 16), Math.ceil(height / 16), 10, theme.map_naturalness);
    let layout = base_layout.layout;
    let spawnzones_arr = base_layout.spawnzones;

    let savepoints = [];
    let spawnzones = [];
    let transitions = [];
    let npcs = [];
    let shops = [];
    let tiles = [];
    let weatherzones = [];

    let start_pos = false;
    let end_pos = false;
    let misc_positions = [];
    for(let i = 0; i < width; i++){
        tiles[i] = [];
        for(let j = 0; j < height; j++){
            switch(layout[i][j]){
                case "wall":    tiles[i][j] = sample(theme.tile_wall); break;
                case "floor":   tiles[i][j] = sample(theme.tile_floor); break;
                case "grass":   tiles[i][j] = sample(theme.tile_grass); break;
                case "edge":    tiles[i][j] = sample(theme.tile_edge); break;
                case "decor":   tiles[i][j] = sample(theme.tile_decor); break;
                default: 
                    tiles[i][j] = sample(theme.tile_floor); 
                    switch(layout[i][j]){
                        case "start": 
                            start_pos = {x : i, y : j}; 
                            break;
                        case "end": 
                            end_pos = {x : i, y : j};
                            tiles[i][j] = "t00_012"; break;
                        case "misc": misc_positions.push({x : i, y : j}); break;
                    }
                break;
            }
        }
    }

    //Place spawnzones
    for(let zone of spawnzones_arr){
        spawnzones.push(genmap_spawnzone(zone.x, zone.y, zone.w, zone.h, level_min, level_max, theme.types_primary, theme.types_secondary));
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
            greeting_dialogueue : "Main System Initiating Shopkeep Mode",
            image : "",
            special_items : [],
            type : "default",
            x : start_pos.x + 1,
            y : start_pos.y
        })
    }

    //fill the misc positions with npcs/chests
    misc_positions = shuffle(misc_positions);
    let npc_count = Math.floor(misc_positions.length * .8);

    //Add npcs
    for(let i = 0; i < npc_count; i++){
        let npc = await genmap_npc(misc_positions[i].x, misc_positions[i].y, level_min, level_max);
        npc.npc_id += name;//Append the map name to the NPC to be removed later
        npcs.push(npc);
    }

    //Add chests (picks up where npcs ends)
    for(let i = npc_count; i < misc_positions.length; i++){
        
        let chest = genmap_chest(misc_positions[i].x, misc_positions[i].y, level_min, level_max);
        chest.npc_id += name; //Append the map name to the NPC to be removed later
        npcs.push(chest)
    }
    
    //Add weather depending on the environment
    let weather_type = sample(theme.weather_options);
    if(weather_type != Weather.None){
        weatherzones.push({
            x : 0,
            y : 0, 
            width : width,
            height : height,
            weather_name : weather_type,
            flag_kill : "",
            flag_required : ""
        })
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
        map_weather : weatherzones,

        map_info : {
            map_battleback : theme.battle_bg,
            map_name : name,
            map_generated : true,
            map_failsafe_pos : start_pos,
        }
    }

    return(map_data);
}

/**
 * Converts a battle oochamon into one ready for use in a map file
 * @param {Object} ooch_data data of the oochamon to be converted
 * @returns A map-ready oochamon for use in an NPC's party
 */
export function genmap_ooch_convert(ooch_data) {
    let new_ooch = {
        id : ooch_data.id,
        level : ooch_data.level,
        nickname : ooch_data.nickname,
        ability : ooch_data.ability,
        moveset : ooch_data.moveset,
        hp_iv :  (20 * ooch_data.stats.hp_iv) - 20,
        atk_iv : (20 * ooch_data.stats.atk_iv) - 20,
        def_iv : (20 * ooch_data.stats.def_iv) - 20,
        spd_iv : (20 * ooch_data.stats.spd_iv) - 20,
        slot_enabled : true,
        item : -1, 
        variant : ooch_data.variant ?? ""
    }

    return(new_ooch)
}


/**
 * Creates a blank slate NPC for use in level gen
 * @returns NPC object with all default values blank, empty, or 0
 */
export function genmap_empty_npc() {
    let pt1 = (`000000${random(0, 999999)}`).slice(-6);
    let pt2 = (`000000${random(0, 999999)}`).slice(-6);
    let pt3 = (`000000${random(0, 999999)}`).slice(-6);
    let npc_id = `${pt1}${pt2}${pt3}`;

    let empty_npc = {
        aggro_range : 0,
        battle_ai : BattleAi.Basic,
        coin : 0,
        flag_given : "",
        flag_required : "",
        flag_kill : "",
        remove_on_finish : false,
        is_catchable : false,
        items : [],
        name : "",
        npc_id : npc_id,
        
        pre_combat_dialogue: "",
        post_combat_dialogue: "",
        
        sprite : 0,
        sprite_combat : "",
        sprite_dialog : "",
        dialogue_portrait : "",
        sprite_id : "",
        stance_list : [StanceForms.Base],
        team : [],
        x : 0,
        y : 0
    }


    return(empty_npc)
}

/**
 * Gets a random piece of loot based on the level provided
 * @param {Int} level Level of the item to return
 * @returns an item {count, id}
 */
export function genmap_loot_by_level(level){
    let loot_table = [];

    if(level < 30){
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
            {count : 4, id : 43}, //essence fragment
            {count : 2, id : 44}, //essence shard
            {count : 1, id : 44}, //essence shard
            
        ])
    }
    if(level > 20){
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
            {count : 5, id : 44}, //essence shard
            
        ])
    }
    if(level >= 30){
        loot_table = loot_table.concat([
            {count : 5, id :  1}, //med-potion
            {count : 5, id :  2}, //hi-potion
            {count : 5, id :  4}, //greater prism
            {count : 3, id :  5}, //grand prism
            {count : 1, id :  7}, //attack crystal
            {count : 2, id : 16}, //green boostgem
            {count : 2, id : 17}, //red boostgem
            {count : 2, id : 18}, //blue boostgem
            {count : 2, id : 19}, //yellow boostgem
            {count : 1, id : 45}, //essence chunk
            {count : 1, id : 42}, //essence monolith
            
        ])
    }
    if(level >= 40){
        loot_table = loot_table.concat([
            {count : 5, id :  2}, //hi-potion
            {count : 5, id :  5}, //grand prism
            {count : 1, id :  6}, //perfect prism
            {count : 1, id :  7}, //attack crystal
            {count : 2, id : 42}, //essence monolith
            {count : 2, id : 45}, //essence chunk
        ])
    }

    return(sample(loot_table))
}

/**
 * Creates a chest NPC with a filled with loot depending on the level of the chest
 * @param {Int} x Position of the chest
 * @param {Int} y Position of the chest
 * @param {Int} level_min Minimum level for the chest to generate at
 * @param {Int} level_max Maximum level for the chest to generate at
 * @returns NPC object that comes with all the usual chest values
 */
export function genmap_chest(x, y, level_min, level_max) {
    let chest_level = random(level_min, level_max, false);
    let chest_num = random(1, 3, false);
    let chest_loot = [];

    for(let i = 0; i < chest_num; i++){
        chest_loot.push(genmap_loot_by_level(chest_level));
    }

    let npc = genmap_empty_npc();
    npc.x = x;
    npc.y = y;
    npc.aggro_range = 0;
    npc.items = chest_loot;
    npc.sprite_id = "c00_013";
    npc.name = "Chest";
    npc.pre_combat_dialogue = "You opened the chest...";
    npc.post_combat_dialogue = "";
    npc.remove_on_finish = true;

    return npc;
}

/**
 * Generates a list of oochamon appropriate for a certain level range
 * @param {Int} level 
 * @returns List of oochamon data
 */
export function genmap_ooch_list(level) {
    let ooch_list = monster_data.values();
    ooch_list = ooch_list.filter((mon) => (
        (mon.evo_stage == 0) && //remove all mons that are evolved (we will evolve them later)
        (mon.id >= 0) && //remove uncatchable mons
        !([ //remove special mons the player shouldnt see
            OochID.Sporbee, 
            OochID.Roocky, 
            OochID.Puppyre, 
            OochID.Nisythe, 
            OochID.Purif_i, 
            OochID.Nullifly, 
            OochID.Tryptid, 
            OochID.Roswier, 
            OochID.Chemerai, 
            OochID.Symaat,
            OochID.Heraloom,
            OochID.Ophicore
        ].includes(mon.id))));
    
    for(let ooch of ooch_list){
        let evo_level = ooch.evo_lvl;
        if(evo_level <= level){
            let evo = monster_data.get(`${ooch.evo_id}`);
            if(evo_level != evo.evo_lvl){ //Prevent cyclical evolutions from infinitely looping this
                ooch_list.push(evo);
            }
        }
    }
    
    return(ooch_list);
}

/**
 * Creates a spawnzone object
 * @param {Int} x Leftmost position of the zone
 * @param {Int} y Topmost position of the zone
 * @param {Int} w Width
 * @param {Int} h Height
 * @param {Int} min_level Minimum level of oochamon that appear here
 * @param {Int} max_level Maximum level of oochamon that appear here
 * @param {Array} types_primary an array of [Oochtype], this is the main type that will appear
 * @param {Array} types_secondary an array of [Oochtype], this type will occaisionally appear
 * @returns Spawnzone object
 */
export function genmap_spawnzone(x, y, w, h, min_level, max_level, types_primary, types_secondary){
    let spawn_slots = [];
    
    let types = [sample(types_primary), sample(types_primary), sample(types_secondary)]

    for(let i = 0; i < types.length; i++){
        let options = genmap_ooch_list(min_level);
        options.filter((o) => o.type.includes(types[i]));

        spawn_slots.push({
            min_level : min_level,
            max_level : max_level,
            ooch_id : sample(options).id
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
}



/**
 * Creates an NPC object with a randomized team and intro quote
 * @param {*} x Position of the npc
 * @param {*} y Position of the npc
 * @param {*} level_min Lowest level that can appear on the team
 * @param {*} level_max Highest level that can appear on the team
 * @returns NPC object with a random team
 */
export async function genmap_npc(x, y, level_min, level_max){
    
    const lerp = (x, y, a) => x * (1 - a) + y * a;

    let teamsize = Math.floor(Math.random() * 3) + 1;
    let avg_level = lerp(level_max, level_min, teamsize/4); //more team, lower avg level


    //Add mons to the npc's team
    let team = [];
    let npc_ooch_options = genmap_ooch_list(level_min);
    for(let i = 0; i < teamsize; i++){
        let ooch = sample(npc_ooch_options);
        let ooch_level = Math.min(avg_level + random(0, 2, false), 50);
        let ooch_new = await create_ooch(ooch.id, {level: ooch_level})
        team.push(genmap_ooch_convert(ooch_new));
    }

    let npc = genmap_empty_npc()
    npc.x = x;
    npc.y = y;
    npc.aggro_range = 3;
    npc.team = team;
    npc.sprite_id = sample([
        "c00_001", "c00_002", "c00_003", "c00_004", "c00_005", "c00_011", "c00_014"
    ]);
    npc.name = "Wandering Trainer";
    npc.pre_combat_dialogue = sample([
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
        "Sometimes I like to stand in the middle of empty rooms and contemplate life.",
        "Oh, hi there, fighty fighty time?",
        "Don't think about the lore implications of this area, okay?",
        "I've done it, I finally know how to breathe!",
        "Ok, but don't run away this time!",
        "Hello, yes, I would like to purchase one battle please!",
        "Today's episode is sponsored by the letter 3.",
        "Martial-type? No, I don't think that's a thing.",
        "I have never known defeat!",
        "Every time you run away from a battle I get a little closer.",
        "Did you know that giraffes are, in fact, real animals?",
        "Why have lunch when we can have battle?",
        "This is *not* what I signed up for.",
        "Elbows are best not thought about...",
        "This isn't even my final form!",
        "If not supposed to eat battery, why battery taste good?",
        "Is playing the triangle supposed to be this hard!?",
        sample([ //Rare quotes, these appear incredibly rarely
            "You ever encounter an inky-black Oochamon that looks like it's glitching? Weird little thing.",
            "I know your IP address, I bet it's 192.168.1.1!",
            "You ever meet Mr. Nice? He sure is a very real person that I didn't just make up now!",
            "I refused to read signs for years and the avatar of sign smited me from existence.",
            "Tamagoochi 👌"
        ])
    ])
    npc.post_combat_dialogue = "*The trainer suddenly vanishes...*"
    npc.remove_on_finish = true;

    return npc;
}

async function genmap_ooch_specific(ooch_id, level, iv_hp, iv_atk, iv_def, iv_spd, ability, moves = [], variant = OochVariant.Default){

    let ooch_new = await create_ooch(ooch_id, {level : level});
    ooch_new.ability = ability;
    ooch_new.moveset = moves;
    ooch_new.variant = variant;

    ooch_new.hp_iv =  iv_hp;
    ooch_new.atk_iv = iv_atk;
    ooch_new.def_iv = iv_def;
    ooch_new.spd_iv = iv_spd;
    
    return ooch_new;
}

async function genmap_npc_reward_ooch(x, y){
    let npc = genmap_empty_npc();
    npc.x = x;
    npc.y = y;
    npc.name = "Mysterious Chest";
    npc.pre_combat_dialogue = "You reach out to open the mysterious chest, but a wild Oochamon appears!!";
    npc.post_combat_dialogue = "The chest vanishes, leaving your reward...";
    npc.sprite_id = "c00_013" //chest
    npc.is_catchable = true;

    npc.aggro_range = 0;
    npc.flag_required = "everchange_npc_boss_defeated";
    npc.flag_given = "everchange_reward_finished";
    npc.flag_kill = "everchange_reward_finished";
    npc.coin = 10000;

    let unique = sample([true, false]);
    let prismatic = unique ? sample(true, false, false, false) : true;
    let variant = prismatic ? OochVariant.Prismatic : OochVariant.Default;
    let iv_hp = random(5, 10, false);
    let iv_atk = random(5, 10, false);
    let iv_def = random(5, 10, false);
    let iv_spd = random(5, 10, false);

    //Anna tells us if it's something prismatic
    if(prismatic){
        await genmap_update_outside_npc_dialog("everchange_cave_entrance", npc_seer_anna, "I foresee something sparkly.")
    }
    else{
        await genmap_update_outside_npc_dialog("everchange_cave_entrance", npc_seer_anna, "I foresee something plain.")
    }

    //Aira tells us if it's a unique mon or something commonly catchable
    let ooch_id = sample(genmap_ooch_list(50)).id;
    if(unique){
        await genmap_update_outside_npc_dialog("everchange_cave_entrance", npc_seer_aira, "I foresee something unique.")
        ooch_id = sample([
            OochID.Roswier, OochID.Chemerai, OochID.Tryptid, //pre endgame unique mons
            OochID.Ophicore, OochID.Symaat, OochID.Heraloom, //post endgame unique mons
            OochID.Nullifly //other single-chance mons
            ])
    }
    else{
        await genmap_update_outside_npc_dialog("everchange_cave_entrance", npc_seer_aira, "I foresee something common.")
    }
    
    let learn_list = monster_data.get(`${ooch_id}`, 'move_list');
    let ability_list = monster_data.get(`${ooch_id}`, 'abilities');

    let rand_ability = ability_list[random(0, ability_list.length - 1)]

    var rand_moves = []
    learn_list = learn_list.filter(x => x[0] <= 50)
    for(let i = 0; i < 4; i++){
        let n = random(0, learn_list.length - 1)

        rand_moves.push(learn_list[n][1]);
        learn_list.splice(n, 1);
    }

    let ooch_new = await genmap_ooch_specific(ooch_id, 50, iv_hp, iv_atk, iv_def, iv_spd, rand_ability, rand_moves, variant)
    npc.team = [ooch_new]

    var variant_text = "";
    switch(variant){
        case OochVariant.Prismatic: variant_text = " [Prismatic]"; break;
    }

    //Laurel tells us the type
    switch(ooch_new.og_type[0]){
        case OochType.Flame:    await genmap_update_outside_npc_dialog("everchange_cave_entrance", npc_seer_laurel, "I foresee something set ablaze."); break;
        case OochType.Fungal:   await genmap_update_outside_npc_dialog("everchange_cave_entrance", npc_seer_laurel, "I foresee something covered in spores."); break;
        case OochType.Stone:    await genmap_update_outside_npc_dialog("everchange_cave_entrance", npc_seer_laurel, "I foresee something tough and rugged."); break;
        case OochType.Magic:    await genmap_update_outside_npc_dialog("everchange_cave_entrance", npc_seer_laurel, "I foresee something mystically attuned."); break;
        case OochType.Tech:     await genmap_update_outside_npc_dialog("everchange_cave_entrance", npc_seer_laurel, "I foresee something made of wires and cogs."); break;
        case OochType.Ooze:     await genmap_update_outside_npc_dialog("everchange_cave_entrance", npc_seer_laurel, "I foresee something slimy."); break;
        case OochType.Sound:    await genmap_update_outside_npc_dialog("everchange_cave_entrance", npc_seer_laurel, "I foresee something causing an uproar."); break;
        case OochType.Crystal:  await genmap_update_outside_npc_dialog("everchange_cave_entrance", npc_seer_laurel, "I foresee something as brittle as glass"); break;
        case OochType.Void:     await genmap_update_outside_npc_dialog("everchange_cave_entrance", npc_seer_laurel, "I foresee something that doesn't belong."); break;
        case OochType.Neutral:  await genmap_update_outside_npc_dialog("everchange_cave_entrance", npc_seer_laurel, "I foresee something perfectly balanced."); break;
        case OochType.Martial:  await genmap_update_outside_npc_dialog("everchange_cave_entrance", npc_seer_laurel, "I foresee something ready to fight."); break;
    }

    console.log(`This week's Everchange Cave Oochamon: ${ooch_new.nickname}${variant_text}`)
    
    return npc;
}

async function genmap_npc_boss(x, y, force_id = -1){
    let npc_id = force_id == -1 ? sample([0, 1, 2, 3]) : force_id;
    let npc = genmap_empty_npc()
    npc.x = x;
    npc.y = y;
    npc.aggro_range = 3;
    npc.flag_given = "everchange_npc_boss_defeated";
    npc.flag_kill = "everchange_npc_boss_defeated";
    npc.items = [
        {count : 1, id: sample([Item.PerfectPrism, Item.AbilitySphere])},
        {count : 2, id: sample([Item.RedBoostgem, Item.BlueBoostgem, Item.YellowBoostgem, Item.GreenBoostgem])}
    ]
    npc.coin = 8000;

    switch (npc_id) {
        case 0: //Pines (dev i guess)
            npc.name = "Evergreen Cultist";
            npc.pre_combat_dialogue = "That's it, you're going to jail! Why? *Tree*son of course!";
            npc.post_combat_dialogue = "That's it, I'm *logging* out.";
            npc.sprite_id = "c00_055";
            npc.items.push({count: 1, id : Item.SkinEvergreenCultist});
           
            npc.team = [
                await genmap_ooch_specific(OochID.Moldire, 50, 9, 5, 9, 9, Ability.Reactive, 
                    [Move.SlurpUp, Move.ArcaStrike, Move.FiberSlicer, Move.TakeOver], OochVariant.Prismatic),

                await genmap_ooch_specific(OochID.Sparafura, 50, 9, 9, 9, 1, Ability.Reactive, 
                    [Move.GuidedSpire, Move.HeldStrike, Move.GorgonEye, Move.Grind], OochVariant.Prismatic),

                await genmap_ooch_specific(OochID.Faering, 50, 9, 7, 9, 5, Ability.Immense, 
                    [Move.HeldStrike, Move.TangledThreads, Move.Boulderdash, Move.Entrench], OochVariant.Default),

                await genmap_ooch_specific(OochID.Drascend, 50, 9, 9, 9, 9, Ability.Flux, 
                    [Move.FiberSlicer, Move.Silkstorm, Move.PressureWave, Move.Flurry], OochVariant.Prismatic)
            ];
        break;
        case 1: //Maus (tester)
            npc.name = "Tamagoochi™ 👌 Girl";
            npc.pre_combat_dialogue = "This battle is gonna be so Tamagoochi™ 👌!";
            npc.post_combat_dialogue = "I walk the lonely Rhodent, the only Rhodent I have ever known...";
            npc.sprite_id = "c00_058";
            npc.items.push({count: 1, id : Item.SkinTamagoochiGirl});
           
            npc.team = [
                await genmap_ooch_specific(OochID.Rhodent, 50, 7, 10, 8, 3, Ability.Shadow, 
                    [Move.PlasmaCannon, Move.Sawblade, Move.Lagspike, Move.Lurk], OochVariant.Default),

                await genmap_ooch_specific(OochID.Chewdee, 50, 5, 10, 10, 10, Ability.Phantasmal, 
                    [Move.BlindingBeam, Move.Micronet, Move.TwistedReality, Move.Wub], OochVariant.Default),

                await genmap_ooch_specific(OochID.Purif_i, 50, 7, 10, 9, 4, Ability.Purification, 
                    [Move.NullSphere, Move.PebbleBlast, Move.Kaleidoscope, Move.CursedEye], OochVariant.Prismatic),

                await genmap_ooch_specific(OochID.Rhodent, 50, 8, 10, 10, 4, Ability.Phantasmal, 
                    [Move.CallThunder, Move.PrecisionStrike, Move.Lurk, Move.Sawblade], OochVariant.Prismatic)
            ];
        break;
        case 2: //Jekyll/Kitty/FalseProphet (tester)
            npc.name = "FALSE PROPHET";
            npc.pre_combat_dialogue = "No, it's not an outfit, I really am a shark, I swear!";
            npc.post_combat_dialogue = "*dabs sadly*";
            npc.sprite_id = "c00_061";
            npc.items.push({count: 1, id : Item.SkinJEKYLLPOWERSTANCE});
           
            npc.team = [
                await genmap_ooch_specific(OochID.Kracking, 50, 9, 9, 9, 9, Ability.Darkbright, 
                    [Move.CallThunder, Move.EarShatter, Move.AsbestosBomb, Move.AshBlast], OochVariant.Default),

                await genmap_ooch_specific(OochID.Hounuke, 50, 9, 9, 9, 9, Ability.Conflicted, 
                    [Move.StickyOrb, Move.PlasmaCannon, Move.SlurpUp, Move.HypeUp], OochVariant.Prismatic),

                await genmap_ooch_specific(OochID.Temporath, 50, 9, 9, 9, 9, Ability.Uncontrolled, 
                    [Move.DebugBomb, Move.TimeWarp, Move.Pulverize, Move.TwistedReality], OochVariant.Prismatic),

                await genmap_ooch_specific(OochID.Tryptid, 50, 9, 9, 9, 9, Ability.HoleDweller, 
                    [Move.ClampDown, Move.DustStorm, Move.ThornShot, Move.Restruct], OochVariant.Default)
            ];
        break;
        case 3: //CodRaven (tester)
            npc.name = "Terarabe";
            npc.pre_combat_dialogue = "It is I, the great and Terarable!";
            npc.post_combat_dialogue = "Oh, you wanted Terraria? That's a totally different game!";
            npc.sprite_id = "c00_060";
            npc.items.push({count: 1, id : Item.SkinTerarabe});
           
            npc.team = [
                await genmap_ooch_specific(OochID.Priseroth, 50, 10, 10, 10, 10, Ability.TwilightHour, 
                    [Move.Calamity], OochVariant.Prismatic),

                await genmap_ooch_specific(OochID.Matryion, 50, 10, 10, 10, 10, Ability.Matryoshka, 
                    [Move.SlurpUp, Move.Overgrowth, Move.DrainLife, Move.EnfeeblingSpore], OochVariant.StickyOrb),

                await genmap_ooch_specific(OochID.Plaghast, 50, 10, 10, 10, 10, Ability.Leech, 
                    [Move.DrainLife, Move.EnfeeblingSpore, Move.Tumorize, Move.CursedEye], OochVariant.Prismatic),

                await genmap_ooch_specific(OochID.Roswier, 50, 10, 10, 10, 10, Ability.LiquidCooled, 
                    [Move.Flurry, Move.Radiate, Move.Threefold], OochVariant.Prismatic)
            ];
        break;
    }


    return npc;
}

export function genmap_layout_final_room(width, height){
    //Empty room layout
    let layout = [];
    let wall_dist = 5;
    for(let i = 0; i < width; i++){
        layout[i] = [];
        for(let j = 0; j < height; j++){
                layout[i][j] = "wall";
        }
    }

    //Add floor tiles
    for(let i = wall_dist; i < width - wall_dist; i++){
        for(let j = wall_dist - 1; j < height - wall_dist; j++){
            if(j == wall_dist - 1){
                layout[i][j] = "edge";
            }
            else{
                layout[i][j] = "floor";
            }
            
        }
    }

    var center_x = Math.floor(width / 2);
    var center_y = Math.floor(height / 2);

    layout[center_x][center_y] = "misc";
    layout[center_x][height - wall_dist - 2] = "start";
    layout[center_x][wall_dist + 2] = "end";

    return ({
        layout : layout,
        spawnzones : []
    })
}

/**
 * Creates a layout for a generated map
 * @param {*} width Width of the map
 * @param {*} height Height of the map
 * @param {*} room_cols How many columns of rooms to generate
 * @param {*} room_rows How many rows of rooms to generate
 * @param {*} room_size_avg Average size of rooms (10 is recommended)
 * @param {*} naturalness How natural to make the environment feel 0 is rigid, 1 is curvy (0.0 - 0.7 is recommended)
 * @returns Struct of {layout : array2d, spawnzones : array}
 */
export function genmap_layout(width, height, room_cols, room_rows, room_size_avg, naturalness){

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
            
            //console.log(`${room.roomgridx}, ${room.roomgridy} => ${room_to.roomgridx}, ${room_to.roomgridy}, [${steps_total}]`)
            
            for(let i = 0; i < segments.length - 1; i++){
                xto = segments[i + 1].x;
                yto = segments[i + 1].y

                while(xat != xto || yat != yto){
                    xat += Math.sign(xto - xat);
                    yat += Math.sign(yto - yat);
                    steps_done++;
                
                    let lx = lerp(segments[0].x, segments[2].x, steps_done/steps_total);
                    let ly = lerp(segments[0].y, segments[2].y, steps_done/steps_total);

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
            for(let j = gx - gw; j < gx + gw + 1; j++){
                for(let k = gy - gh; k < gy + gh + 1; k++){
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

    // let layout_text = '';
    // for(let j = 1; j < height; j++){
    //     for(let i = 0; i < width; i++){
    //         switch(layout[i][j]){
    //             case "wall":    layout_text += "[]"; break;
    //             case "floor":   layout_text += ".."; break;
    //             case "grass":   layout_text += "ww"; break;
    //             case "edge":    layout_text += "II"; break;
    //             case "decor":   layout_text += "oo"; break;
                
    //             case "misc":    layout_text += "XX"; break;
    //             case "start":   layout_text += "SS"; break;
    //             case "end":     layout_text += "EE"; break;
    //         }
    //     }
    //     layout_text += "\n"
    // }

    return {
        layout : layout,
        spawnzones : spawnzones
    };
}