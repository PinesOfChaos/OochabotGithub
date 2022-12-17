const db = require("./db")

module.exports = {

    create_monster: function(id, emote, name, image, oochive_entry, type, hp, atk, def, spd, move_list, abilities, evo_id, evo_lvl) { 
        let key_id = id.toString();
        db.monster_data.set(key_id, id, 'id')
        db.monster_data.set(key_id, emote, 'emote')
        db.monster_data.set(key_id, image, 'image')
        db.monster_data.set(key_id, name, 'name')
        db.monster_data.set(key_id, oochive_entry, 'oochive_entry')
        db.monster_data.set(key_id, type, 'type')
        db.monster_data.set(key_id, hp, 'hp')
        db.monster_data.set(key_id, atk, 'atk')
        db.monster_data.set(key_id, def, 'def')
        db.monster_data.set(key_id, spd, 'spd')
        db.monster_data.set(key_id, move_list, 'move_list')
        db.monster_data.set(key_id, abilities, 'abilities')
        db.monster_data.set(key_id, evo_id, 'evo_id')
        db.monster_data.set(key_id, evo_lvl, 'evo_lvl')
    },

    create_move: function(id, name, type, damage, accuracy, effect, chance, description){
        let key_id = id.toString();
        db.move_data.set(key_id, id, 'id')
        db.move_data.set(key_id, name, 'name')
        db.move_data.set(key_id, type, 'type')
        db.move_data.set(key_id, damage, 'damage')
        db.move_data.set(key_id, accuracy, 'accuracy')
        db.move_data.set(key_id, effect, 'effect')
        db.move_data.set(key_id, chance, 'chance')
        db.move_data.set(key_id, description, 'description')
    },

    create_item: function(id, name, emote, category, type, value, description) {
        let key_id = id.toString();
        db.item_data.set(key_id, id, 'id');
        db.item_data.set(key_id, name, 'name');
        db.item_data.set(key_id, emote, 'emote');
        db.item_data.set(key_id, category, 'category');
        db.item_data.set(key_id, type, 'type');
        db.item_data.set(key_id, value, 'value');
        db.item_data.set(key_id, description, 'description');
    },

    create_ability: function(id, name, description) {
        let key_id = id.toString();
        db.ability_data.set(key_id, id, 'id');
        db.ability_data.set(key_id, name, 'name');
        db.ability_data.set(key_id, description, 'description');
    }

}