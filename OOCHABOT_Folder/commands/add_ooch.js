const { SlashCommandBuilder } = require('@discordjs/builders');
const db = require('../db.js');
const { get_stats } = require('../func_battle.js');
const _ = require('lodash');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('add_ooch')
        .setDescription('Add an oochamon to your party!')
        .addIntegerOption(option => 
            option.setName('id')
                .setDescription('ID of ooch')
                .setRequired(true))
        .addIntegerOption(option => 
            option.setName('lv')
                .setDescription('Level of ooch')
                .setRequired(true)),
    async execute(interaction) {

        let ooch_id = interaction.options.getInteger('id');
        let level = interaction.options.getInteger('lv');

        // Setup ooch_id data
        let learn_list = db.monster_data.get(ooch_id, 'move_list');
        let ability_list = db.monster_data.get(ooch_id, 'abilities');
        let move_list = [];

        // Pick a random ability
        let rand_ability = ability_list[_.random(0, ability_list.length - 1)]

        //Set the IVs & Level
        let hp_iv = _.random(0,10)/20+1;
        let atk_iv = _.random(0,10)/20+1;
        let def_iv = _.random(0,10)/20+1;
        let spd_iv = _.random(0,10)/20+1;
        

        //Get the stats accounting for the ID, Level, and IVs
        let stats = get_stats(ooch_id, level, hp_iv, atk_iv, def_iv, spd_iv) //Returns [hp, atk, def, spd]

        //Find what moves the starter should initially know
        learn_list = learn_list.filter(x => x[0] <= level && x[0] != -1)
        for(let i = 0; i < learn_list.length; i++){
            move_list[i] = learn_list[i][0];
        }

        // Make sure the move_list is 4 moves
        while (move_list.length > 4) {
            let rand_move_pos = _.random(0, move_list.length)
            move_list.splice(rand_move_pos, 1);
        }

        db.profile.push(interaction.user.id,
            { 
                id: ooch_id,
                name: db.monster_data.get(ooch_id, 'name'), 
                nickname: -1,
                item: -1,
                ability: rand_ability,
                level: level,
                moveset: move_list,
                stats: {
                    hp: stats[0],
                    atk: stats[1],
                    def: stats[2],
                    spd: stats[3],
                    hp_iv: hp_iv,
                    atk_iv: atk_iv,
                    def_iv: def_iv,
                    spd_iv: spd_iv,
                    hp_mul: 1,
                    atk_mul: 1,
                    def_mul: 1,
                    spd_mul: 1,
                    acc_mul: 1, // Accuracy Multiplier, used for accuracy checks
                    eva_mul: 1 // Evasion Multiplier, used for accuracy checks
                },
                status_effects: [],
                current_hp: stats[0],
                current_exp: 0,
                next_lvl_exp: level ** 3,
                status_effects: [],
                current_hp: stats[0],
                alive: true,
                type: db.monster_data.get(ooch_id, 'type')
            }, 'ooch_inventory')
        
        return interaction.reply(`Added Oochamon ${db.monster_data.get(ooch_id, 'name')} to your party!`)
    },
};

