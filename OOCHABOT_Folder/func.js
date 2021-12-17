const db = require("./db")

module.exports = {

    create_monster: function(id, emote, name, oochive_entry, type, hp, atk, def, spd, move_list, abilities, evo_id, evo_lvl) { 
        db.monster_data.set(id, emote, 'emote')
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

}