const { Collection } = require("discord.js");
const db = require("./db");
const { Zone } = require('./types');
const fs = require("fs");

module.exports = {
    /**
     * Creates a tile data object and adds it to the database.
     * @param {Number} id The ID of the tile
     * @param {String} use The use of the tile
     * @param {Collection} emojis The emojis collection to use.
     */
    create_tile: function(id, use, emojis) {

        // This line IDs the ID so I can set the ID
        db.tile_data.set(id, id, 'id');
        db.tile_data.set(id, use, 'use');
        
        // Set specific IDs
        if (id.includes('c')) {
            db.tile_data.set(id, false, 'zone_id');
        } else {
            db.tile_data.set(id, parseInt(id.split('_')[0].replace('t', '')), 'zone_id')
        }
        db.tile_data.set(id, parseInt(id.split('_')[1]), 'tile_id');

        let splitId = id.split('_');
        let zoneEmoteIds = {};
        if (id.includes('c')) {
            for (let zoneId of Object.values(Zone)) {
                zoneId = zoneId < 10 ? `0${zoneId}` : zoneId; 
                let emoji = emojis.find(emoji => emoji.name === `c${zoneId}_${splitId[1]}`)
                if (emoji != undefined) {
                    zoneEmoteIds[parseInt(zoneId)] = { emote_id: emoji.id, emote: `<:c${zoneId}_${splitId[1]}:${emoji.id}>`, file: `c${zoneId}_${splitId[1]}.png` };
                }
            }
        } else {
            let emoji = emojis.find(emoji => emoji.name === id)
            if (emoji != undefined) {
                db.tile_data.set(id, emoji.id, 'emote_id');
                db.tile_data.set(id, `<:${id}:${emoji.id}>`, 'emote');
                db.tile_data.set(id, `${id}.png`, 'file');
            }
        } 

        if (id.includes('c')) {
            db.tile_data.set(id, false, 'emote_id');
            db.tile_data.set(id, false, 'emote');
            db.tile_data.set(id, `c00_${splitId[1]}.png`, 'file');
            db.tile_data.set(id, zoneEmoteIds, 'zone_emote_ids');
        } else {
            db.tile_data.set(id, {}, 'zone_emote_ids');
        }
        
    },

    /**
     * Creates an Oochamon and adds it to the database.
     * @param {Number} id The ID of the Oochamon
     * @param {String} emote The emote of the Oochamon
     * @param {String} name The name of the Oochamon
     * @param {String} oochive_entry The Oochive Entry
     * @param {String} type The type of the Oochamon
     * @param {Number} hp The base HP stat
     * @param {Number} atk Base ATK stat
     * @param {Number} def Base DEF stat
     * @param {Number} spd Base SPD stat
     * @param {Array} move_list Move list for the Oochamon
     * @param {Array} abilities Ability list for the Oochamon
     * @param {Number} pre_evo_id The ID of the Oochamon's pre-evolution.
     * @param {Number} evo_id ID of the Oochamon's evolution
     * @param {Number} evo_lvl What level the Oochamon evolves at
     * @param {Number} evo_stage What stage the Oochamon is at evolution wise
     */
    create_monster: function(monster) {

        // ADD OOCHAMON THAT SHOULDN'T HAVE THEIR MOVES CHECKED HERE BY ID!
        const oochMoveErrorExceptionList = [59]

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
            if (!monster.hasOwnProperty(attr)) {
                console.log(`DATA ERROR: Missing required attribute: ${attr} for ${monster.name}`);
                return;
            }
        }
    
        // Set the monster data in the enmap database
        let key_id = monster.id.toString();
        db.monster_data.set(key_id, monster);
    
        // Check if the artwork exists
        fs.access(`./Art/ResizedArt/${monster.name.toLowerCase()}.png`, (err) => {
            if (err) {
                console.log(`ART ERROR: ${monster.name}`);
            }
        });

        if (!oochMoveErrorExceptionList.includes(monster.id) && monster.id >= 0) {
            //Check if the mon's movelist is short
            if(monster.move_list.length < 10){ console.log(`MOVE NOTE: ${monster.name} only has ${monster.move_list.length} learnable moves.`); }

            //Check if the mon has a hidden move it can learn
            let has_hidden_move = false
            for (let test_move of monster.move_list) {
                
                if(test_move[0] == -1){
                    has_hidden_move = true;
                }
                if(test_move[1] == null){
                    console.log(`MOVE ERROR: ${monster.name} has invalid Move`);
                }
            }
            if(has_hidden_move == false){ console.log(`MOVE ERROR: ${monster.name} does not have a Hidden Move`); }
        }
    },
    

    /**
     * Creates a move data object and adds it to the database.
     * @param {Number} move The object for the move
     */
    create_move: function(move){
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
    
        // Check if all required attributes are present
        for (let attr of requiredAttributes) {
            if (!move.hasOwnProperty(attr)) {
                console.log(`DATA ERROR: Missing required attribute: ${attr} for ${move.name}`);
                return;
            }
        }
    
        // Set the move data in the enmap database
        let key_id = move.id.toString();
        db.move_data.set(key_id, move);
    },

    /**
     * Creates a item data object and adds it to the database.
     * @param {Number} item The object for the item
     */
    create_item: function(item) {
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
            if (!item.hasOwnProperty(attr)) {
                console.log(`DATA ERROR: Missing required attribute: ${attr} for ${item.name}`);
                return;
            }
        }
    
        // Set the move data in the enmap database
        let key_id = item.id.toString();
        db.item_data.set(key_id, item);
    },

    /**
     * Create an ability data object and add it to the database.
     * @param {Number} id The ID of the ability
     * @param {String} name The name of the ability
     * @param {String} description The description of the ability
     */
    create_ability: function(id, name, description) {
        let key_id = id.toString();
        db.ability_data.set(key_id, id, 'id');
        db.ability_data.set(key_id, name, 'name');
        db.ability_data.set(key_id, description, 'description');
    },

    /**
     * Create a status data object and add it to the database.
     * @param {Number} id The ID of the status effect
     * @param {String} name The name of the status effect
     * @param {String} emote The emote of the status effect
     * @param {String} description The description of the status effect
     */
    create_status: function(id, name, emote, description) {
        let key_id = id.toString();
        db.status_data.set(key_id, id, 'id');
        db.status_data.set(key_id, name, 'name');
        db.status_data.set(key_id, emote, 'emote');
        db.status_data.set(key_id, description, 'description');
        db.status_data.set(key_id, emote != '', 'visible'); //whether the status effect is displayed when making the healthbars
    }
}