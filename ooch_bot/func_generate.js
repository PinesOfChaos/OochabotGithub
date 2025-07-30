import { tile_data, monster_data, move_data, item_data, ability_data, status_data, stance_data } from "./db.js";
import { Zone } from './types.js';
import { access } from "fs";

export function create_tile(id, use, emojis, is_GIF = false) {

    // This line IDs the ID so I can set the ID
    tile_data.set(id, id, 'id');
    tile_data.set(id, use, 'use');



    // Set specific IDs
    if (id.includes('c')) {
        tile_data.set(id, false, 'zone_id');
    } else {
        tile_data.set(id, parseInt(id.split('_')[0].replace('t', '')), 'zone_id');
    }
    tile_data.set(id, parseInt(id.split('_')[1]), 'tile_id');

    let splitId = id.split('_');
    let zoneEmoteIds = {};
    if (id.includes('c')) {
        for (let zoneId of Object.values(Zone)) {
            let gif_str = is_GIF ? 'a' : '';
            zoneId = zoneId < 10 ? `0${zoneId}` : zoneId;
            let emoji = emojis.find(emoji => emoji.name === `c${zoneId}_${splitId[1]}`);
            if (emoji != undefined) {
                zoneEmoteIds[parseInt(zoneId)] = { emote_id: emoji.id, emote: `<${gif_str}:c${zoneId}_${splitId[1]}:${emoji.id}>`, file: `c${zoneId}_${splitId[1]}.png` };
            }
        }
    } else {
        let emoji = emojis.find(emoji => emoji.name === id);
        if (emoji != undefined) {
            let gif_str = emoji.animated ? 'a' : '';
            tile_data.set(id, emoji.id, 'emote_id');
            tile_data.set(id, `<${gif_str}:${id}:${emoji.id}>`, 'emote');
            tile_data.set(id, `${id}.png`, 'file');
        }
    }

    if (id.includes('c')) {
        tile_data.set(id, false, 'emote_id');
        tile_data.set(id, false, 'emote');
        tile_data.set(id, `c00_${splitId[1]}.png`, 'file');
        tile_data.set(id, zoneEmoteIds, 'zone_emote_ids');
    } else {
        tile_data.set(id, {}, 'zone_emote_ids');
    }

}
export function create_monster(monster) {

    // ADD OOCHAMON THAT SHOULDN'T HAVE THEIR MOVES CHECKED HERE BY ID!
    const oochMoveErrorExceptionList = [59];

    // Required attributes
    const requiredAttributes = [
        "id",
        "emote",
        "name",
        "oochive_entry",
        "type",
        "hp",
        "atk",
        "def",
        "spd",
        "move_list",
        "abilities",
        "pre_evo_id",
        "evo_id",
        "evo_lvl",
        "evo_stage"
    ];

    // Check if all required attributes are present
    for (let attr of requiredAttributes) {
        if (!Object.prototype.hasOwnProperty.call(monster, attr)) {
            console.log(`DATA ERROR: Missing required attribute: ${attr} for ${monster.name}`);
            return;
        }
    }

    // Set the monster data in the enmap database
    let key_id = monster.id.toString();
    monster_data.set(key_id, monster);

    // Check if the artwork exists
    access(`./Art/ResizedArt/${monster.name.toLowerCase()}.png`, (err) => {
        if (err) {
            console.log(`ART ERROR: ${monster.name}`);
        }
    });

    if (!oochMoveErrorExceptionList.includes(monster.id) && monster.id >= 0) {
        //Check if the mon's movelist is short
        if (monster.move_list.length < 10) { console.log(`MOVE NOTE: ${monster.name} only has ${monster.move_list.length} learnable moves.`); }

        //Check if the mon has a hidden move it can learn
        let has_hidden_move = false;
        for (let test_move of monster.move_list) {

            if (test_move[0] == -1) {
                has_hidden_move = true;
            }
            if (test_move[1] == null) {
                console.log(`MOVE ERROR: ${monster.name} has invalid Move`);
            }
        }
        if (has_hidden_move == false) { console.log(`MOVE ERROR: ${monster.name} does not have a Hidden Move`); }
    }
}
export function create_move(move) {
    // Required attributes
    const requiredAttributes = [
        "id",
        "name",
        "type",
        "damage",
        "accuracy",
        "effect",
        "description"
    ];

    if (move.tags === undefined) move.tags = [];
    if (move.self_target === undefined) move.self_target = false;

    // Check if all required attributes are present
    for (let attr of requiredAttributes) {
        if (!Object.prototype.hasOwnProperty.call(move, attr)) {
            console.log(`DATA ERROR: Missing required attribute: ${attr} for ${move.name}`);
            return;
        }
    }

    // Set the move data in the enmap database
    let key_id = move.id.toString();
    move_data.set(key_id, move);
}
export function create_item(item) {
    // Required attributes
    const requiredAttributes = [
        "id",
        "name",
        "emote",
        "category",
        "type",
        "price",
        "potency",
        "description",
        "description_short"
    ];

    if (item.tags === undefined) item.tags = [];

    // Check if all required attributes are present
    for (let attr of requiredAttributes) {
        if (!Object.prototype.hasOwnProperty.call(item, attr)) {
            console.log(`DATA ERROR: Missing required attribute: ${attr} for ${item.name}`);
            return;
        }
    }

    // Set the move data in the enmap database
    let key_id = item.id.toString();
    item_data.set(key_id, item);
}
export function create_ability(id, name, description) {
    let key_id = id.toString();
    ability_data.set(key_id, id, 'id');
    ability_data.set(key_id, name, 'name');
    ability_data.set(key_id, description, 'description');
}
export function create_status(id, name, emote, description) {
    let key_id = id.toString();
    status_data.set(key_id, id, 'id');
    status_data.set(key_id, name, 'name');
    status_data.set(key_id, emote, 'emote');
    status_data.set(key_id, description, 'description');
    status_data.set(key_id, emote != '', 'visible'); //whether the status effect is displayed when making the healthbars
}
export function create_stance(id, name, description, description_short) {
    let key_id = id.toString();
    stance_data.set(key_id, id, 'id');
    stance_data.set(key_id, name, 'name');
    stance_data.set(key_id, description, 'description');
    stance_data.set(key_id, description_short, 'description_short');
}