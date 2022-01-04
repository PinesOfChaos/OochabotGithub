const { SlashCommandBuilder } = require('@discordjs/builders');
const db = require('../db.js');
const { random_number, get_stats } = require('../func.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('add_ooch')
        .setDescription('Add an oochamon to your party!')
        .addIntegerOption(option => 
            option.setName('id')
                .setDescription('ID of ooch')
                .setRequired(true)),
    async execute(interaction) {

        let ooch_id = interaction.options.getInteger('id');

        // Setup ooch_id data
        let learn_list = db.monster_data.get(ooch_id, 'move_list');
        let ability_list = db.monster_data.get(ooch_id, 'abilities');
        let move_list = [];

        // Pick a random ability
        let rand_ability = ability_list[random_number(0, ability_list.length - 1)]

        //Set the IVs & Level
        let hp_iv = random_number(0,10)/20+1;
        let atk_iv = random_number(0,10)/20+1;
        let def_iv = random_number(0,10)/20+1;
        let spd_iv = random_number(0,10)/20+1;
        let level = 5;

        //Get the stats accounting for the ID, Level, and IVs
        let stats = get_stats(ooch_id, level, hp_iv, atk_iv, def_iv, spd_iv) //Returns [hp, atk, def, spd]

        //Find what moves the starter should initially know
        learn_list = learn_list.filter(x => x[0] <= level && x[0] != -1)
        for(let i = 0; i < learn_list.length; i++){
            move_list[i] = learn_list[i][0];
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
                },
                current_hp: stats[0],
                alive: true,
            }, 'ooch_inventory')
        
        return interaction.reply(`Added Oochamon ${db.monster_data.get(ooch_id, 'name')} to your party!`)
    },
};

