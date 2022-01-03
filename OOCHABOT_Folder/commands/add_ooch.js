const { SlashCommandBuilder } = require('@discordjs/builders');
const db = require('../db.js');
const { random_number } = require('../func.js');

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
        let move_list = db.monster_data.get(ooch_id, 'move_list');
        let ability_list = db.monster_data.get(ooch_id, 'abilities');

        // Pick a random ability
        let rand_ability = ability_list[random_number(0, ability_list.length - 1)]

        move_list = move_list.filter(x => x[0] <= 5 && x[0] != -1)

        db.profile.push(interaction.user.id,
            { 
                id: ooch_id,
                name: db.monster_data.get(ooch_id, 'name'), 
                nickname: -1,
                item: -1,
                ability: false,
                level: 5,
                moveset: move_list,
                stats: {
                    hp: db.monster_data.get(ooch_id, 'hp'),
                    atk: db.monster_data.get(ooch_id, 'atk'),
                    def: db.monster_data.get(ooch_id, 'def'),
                    spd: db.monster_data.get(ooch_id, 'spd'),
                    hp_iv: random_number(0,10)/20+1,
                    atk_iv: random_number(0,10)/20+1,
                    def_iv: random_number(0,10)/20+1,
                    spd_iv: random_number(0,10)/20+1,
                },
                current_hp: db.monster_data.get(ooch_id, 'hp'),
                alive: true,
            }, 'ooch_inventory')
        
        return interaction.reply(`Added Oochamon ${db.monster_data.get(ooch_id, 'name')} to your party!`)
    },
};

