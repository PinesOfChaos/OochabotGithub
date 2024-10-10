const db = require("./db");
const { Zone } = require('./types');
const fs = require("fs");

module.exports = {
    /**
     * Creates a tile data object and adds it to the database.
     * @param {Number} id The ID of the tile
     * @param {String} use The use of the tile
     * @param {Array} guilds All the emote guilds to put the emotes in
     */
    create_tile: function(id, use, guilds) {

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
        for (let guild of guilds) {
            if (id.includes('c')) {
                for (let zoneId of Object.values(Zone)) {
                    zoneId = zoneId < 10 ? `0${zoneId}` : zoneId; 
                    let emoji = guild.emojis.cache.find(emoji => emoji.name === `c${zoneId}_${splitId[1]}`)
                    if (emoji != undefined) {
                        zoneEmoteIds[parseInt(zoneId)] = { emote_id: emoji.id, emote_guild_id: guild.id, emote: `<:c${zoneId}_${splitId[1]}:${emoji.id}>`, file: `c${zoneId}_${splitId[1]}.png` };
                    }
                }
            } else {
                let emoji = guild.emojis.cache.find(emoji => emoji.name === id)
                if (emoji != undefined) {
                    db.tile_data.set(id, emoji.id, 'emote_id');
                    db.tile_data.set(id, `<:${id}:${emoji.id}>`, 'emote');
                    db.tile_data.set(id, guild.id, 'emote_guild_id');
                    db.tile_data.set(id, `${id}.png`, 'file');
                    break;
                } else {
                    continue;
                }
            } 
        }

        if (id.includes('c')) {
            db.tile_data.set(id, false, 'emote_id');
            db.tile_data.set(id, false, 'emote_guild_id');
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
        fs.access(`./art/ResizedArt/${monster.name.toLowerCase()}.png`, (err) => {
            if (err) {
                console.log(`ART ERROR: ${monster.name}`);
            }
        });

    },
    

    /**
     * Creates a move data object and adds it to the database.
     * @param {Number} id The ID of the move
     * @param {String} name The name of the move
     * @param {String} type The type of the move
     * @param {Number} damage How much damage the move does
     * @param {Number} accuracy The moves accuracy
     * @param {String} effect The effect of the move
     * @param {Number} effect_chance The % chance for the move to hit
     * @param {String} description The moves description
     * @param {String} tags Tags related to a move
     */
    create_move: function(id, name, type, damage, accuracy, effect, effect_chance, description, tags = []){
        let key_id = id.toString();
        db.move_data.set(key_id, id, 'id')
        db.move_data.set(key_id, name, 'name')
        db.move_data.set(key_id, type, 'type')
        db.move_data.set(key_id, damage, 'damage')
        db.move_data.set(key_id, accuracy, 'accuracy')
        db.move_data.set(key_id, effect, 'effect')
        db.move_data.set(key_id, effect_chance, 'effect_chance')
        db.move_data.set(key_id, description, 'description')
        db.move_data.set(key_id, tags, 'tags')
    },

    /**
     * Creates an item and puts it into the database.
     * @param {Number} id The ID of the item
     * @param {String} name The name of the item
     * @param {String} emote The emote of the item (in Discord)
     * @param {String} category The inventory category this item goes into (heal_inv, prism_inv, other_inv)
     * @param {String} type The type of the item (potion, prism, misc)
     * @param {String} price The price of the item
     * @param {Number} potency The amountss of whatever the items effect is (like amount of HP healed, or chance to catch with prism)
     * @param {String} description A description of the item
     */
    create_item: function(id, name, emote, category, type, price, potency, description) {
        let key_id = id.toString();
        db.item_data.set(key_id, id, 'id');
        db.item_data.set(key_id, name, 'name');
        db.item_data.set(key_id, emote, 'emote');
        db.item_data.set(key_id, category, 'category');
        db.item_data.set(key_id, type, 'type');
        db.item_data.set(key_id, price, 'price');
        db.item_data.set(key_id, potency, 'potency');
        db.item_data.set(key_id, description, 'description');
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
    }
}