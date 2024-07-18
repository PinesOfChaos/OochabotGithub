const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../db.js');
const _ = require('lodash');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lookup')
        .setDescription('Get info on a Move or Ability')
        .addSubcommand(subcommand =>
            subcommand
                .setName('move')
                .setDescription('Get info about a selected move')
                .addStringOption(option => 
                    option.setName('move')
                        .setDescription('The name of the ability')
                        .setAutocomplete(true)
                        .setRequired(true)))

        .addSubcommand(subcommand =>
            subcommand
                .setName('ability')
                .setDescription('Get info about a selected ability')
                .addStringOption(option => 
                    option.setName('ability')
                        .setDescription('The name of the ability')
                        .setAutocomplete(true)
                        .setRequired(true))),
    async execute(interaction) {

        let selected_db = interaction.options.getSubcommand();
        let selected_id = selected_db == 'move' ? interaction.options.getString('move') : interaction.options.getString('ability');

        
        
        switch(selected_db){
            case 'move':
                let info_move = db.move_data.get(selected_id);

                let effect_arr = info_move.effect.split('|')
                let effect_str = ``
                for(eff of effect_arr){
                    if(eff.charAt(1) == '+'){
                        let eff_split = eff.split('_')
                        
                    }
                    if(eff.charAt(1) == '-'){
                        
                    }
                }

                let embed_move = new EmbedBuilder()
                    .setColor('#808080')
                    .setTitle(`${type_to_emote(info_move.type)} ${info_move.name}`)
                    .setDescription(info_move.description)
                    .addFields(
                        {name: 'Type:',     value: `${info_move.type}`},
                        {name: 'Power:',    value: `${info_move.damage}`},
                        {name: 'Target',    value: `${(info_move.accuracy > 0) ? 'Enemy' : 'Self'}`},
                        {name: 'Accuracy:', value: `${Math.abs(info_move.accuracy)}%`},
                        {name: 'Effect:',   value: `${info_move.effect}`},
                        {name: 'Chance:',   value: `${info_move.effect_chance}%`},
                    );
                return interaction.reply({
                    embeds: [ embed_move ],
                    ephemeral: true
                })
            break;
            case 'ability':
                let info_ability = db.move_data.get(selected_id);
                let embed_ability = new EmbedBuilder()
                    .setColor('#808080')
                    .setTitle(`${info_ability.name}`)
                    .setDescription(info_ability.description);
                return interaction.reply({
                    embeds: [ embed_ability ],
                    ephemeral: true
                })
            break;
        }

    },
};

