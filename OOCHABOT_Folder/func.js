const db = require("./db")

module.exports = {

    random_number: function(min, max) {
        return Math.round(Math.random() * (max - min) + min);
    },

    capitalize: function(string) {
        string = string.split(' ');
        string = string.map(a => a.charAt(0).toUpperCase() + a.slice(1));
        string = string.join(' ');

        return string;
    },

    generate_battle: function(plr_ooch, ooch_species) {
    
        const { random_number } = require('./func.js') 

        // Get the wild oochamon's level
        let ooch_inv_arr = Object.keys(plr_ooch)
        let lvl = 0;
        let species = ooch_species

        // Get the highest level of players oochamon team
        for (let i = 0; i < ooch_inv_arr.length; i++) {
            if (i == 0) { 
                lvl = plr_ooch[ooch_inv_arr[i]]['level']; 
                continue;
            } else if (plr_ooch[ooch_inv_arr[i]] > lvl) {
                lvl = plr_ooch[ooch_inv_arr[i]]['level']
            }
        }

        console.log(`Level: ${lvl}`)

        const clamp = (num, min, max) => Math.min(Math.max(num, min), max);
        lvl = clamp((Math.floor(Math.random() * lvl * 1.05)), 1, 100); //Formula for level generation
    
        // Get the evolution data
        let ooch_pick = species[random_number(0, species.length - 1)]
        let evo1_id = db.monster_data.get(ooch_pick, 'evo_id')
        let evo1_lvl = db.monster_data.get(ooch_pick, 'evo_lvl')
        let evo2_id = db.monster_data.get(evo1_id, 'evo_id')
        let evo2_lvl = db.monster_data.get(evo2_id, 'evo_lvl')

        // Have a chance to make the wild oochamon be the evolved form
        let evo_chance = random_number(0, 1) + random_number(0, 1)
        if (evo_chance == 2 && lvl >= evo2_lvl && evo2_lvl != -1) {
            ooch_pick = evo2_id;
        } else if (evo_chance == 1 && lvl >= evo1_lvl && evo1_lvl != -1) {
            ooch_pick = evo1_id;
        }

        // Get wild oochamon stats
        hp = Math.floor(db.monster_data.get(ooch_pick, 'hp') * (1.05^lvl) + 10)
        atk = Math.floor(db.monster_data.get(ooch_pick, 'atk') * (1.05^lvl))
        def = Math.floor(db.monster_data.get(ooch_pick, 'def') * (1.05^lvl))
        spd = Math.floor(db.monster_data.get(ooch_pick, 'spd') * (1.05^lvl))
        move_list = db.monster_data.get(ooch_pick, 'move_list').filter(x => x[0] <= 5 && x[0] != -1)

        // Make sure the move_list is 4 moves
        while (move_list.length > 4) {
            let rand_move_pos = random_number(0, move_list.length)
            move_list.splice(rand_move_pos, 1);
        }

        return {
            id: ooch_pick,
            level: lvl,
            ability: false,
            moveset: move_list,
            stats: {
                hp: hp,
                atk: atk,
                def: def,
                spd: spd
            }
        }

    },

    create_monster: function(id, emote, name, image, oochive_entry, type, hp, atk, def, spd, move_list, abilities, evo_id, evo_lvl) { 
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

    create_move: function(id, name, type, damage, accuracy, effect, chance, descrition){
        db.move_data.set(id, name, 'name')
        db.move_data.set(id, type, 'type')
        db.move_data.set(id, damage, 'damage')
        db.move_data.set(id, accuracy, 'accuracy')
        db.move_data.set(id, effect, 'effect')
        db.move_data.set(id, chance, 'chance')
        db.move_data.set(id, descrition, 'description')
    },

    move: function(user_id, direction) {
        console.log(user_id, direction)
    },
    
    battle: function(message, choice) {
        message.channel.send('Test');
        console.log(message.author.id, choice)
    }
}