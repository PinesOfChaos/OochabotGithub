const db = require("./db")

module.exports = {

    create_monster: function(id, emote, name, image, oochive_entry, type, hp, atk, def, spd, move_list, abilities, evo_id, evo_lvl) { 
        db.monster_data.set(id, parseInt(id), 'id')
        db.monster_data.set(id, emote, 'emote')
        db.monster_data.set(id, image, 'image')
        db.monster_data.set(id, name, 'name')
        db.monster_data.set(id, oochive_entry, 'oochive_entry')
        db.monster_data.set(id, type, 'type')
        db.monster_data.set(id, hp, 'hp')
        db.monster_data.set(id, atk, 'atk')
        db.monster_data.set(id, def, 'def')
        db.monster_data.set(id, spd, 'spd')
        db.monster_data.set(id, move_list, 'move_list')
        db.monster_data.set(id, abilities, 'abilities')
        db.monster_data.set(id, evo_id, 'evo_id')
        db.monster_data.set(id, evo_lvl, 'evo_lvl')
    },

    create_move: function(id, name, type, damage, accuracy, effect, chance, description){
        db.move_data.set(id, name, 'name')
        db.move_data.set(id, type, 'type')
        db.move_data.set(id, damage, 'damage')
        db.move_data.set(id, accuracy, 'accuracy')
        db.move_data.set(id, effect, 'effect')
        db.move_data.set(id, chance, 'chance')
        db.move_data.set(id, description, 'description')
    },

    create_item: function(id, name, emote, category, type, value, description) {
        db.item_data.set(id, name, 'name');
        db.item_data.set(id, emote, 'emote');
        db.item_data.set(id, category, 'category');
        db.item_data.set(id, type, 'type');
        db.item_data.set(id, value, 'value');
        db.item_data.set(id, description, 'description');
    },

    create_ability: function(name, description) {
        db.ability_data.set(name, description, 'description');
    }

}