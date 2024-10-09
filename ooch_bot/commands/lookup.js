const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../db.js');
const _ = require('lodash');
const { type_to_emote, get_status_emote } = require('../func_battle');
const { get_art_file } = require('../func_other.js');

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
                .setName('type_chart')
                .setDescription('See weaknesses and resistances'))

        .addSubcommand(subcommand =>
            subcommand
                .setName('ability')
                .setDescription('Get info about a selected ability.')
                .addStringOption(option => 
                    option.setName('ability')
                        .setDescription('The name of the ability')
                        .setAutocomplete(true)
                        .setRequired(true)))

        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Get info about a status effect.')
                .addStringOption(option => 
                    option.setName('status')
                        .setDescription('The name of the status effect')
                        .setAutocomplete(true)
                        .setRequired(true)))

        .addSubcommand(subcommand =>
            subcommand
                .setName('controls')
                .setDescription('View the controls!')),

    async execute(interaction) {

        let selected_db = interaction.options.getSubcommand();
        let selected_id = selected_db == 'move' ? interaction.options.getString('move') : (selected_db == 'status' ? interaction.options.getString('status') : interaction.options.getString('ability'));

        if (selected_db === 'move' || selected_db === 'ability' || selected_db == 'status') {
            if (isNaN(selected_id)) {
                // TODO: Just have this try to find it in the database rather than saying this
                return interaction.reply('Make sure you select from one of the drop down options, don\'t type this in manually!')
            }
        }
        
        switch(selected_db){
            case 'move':
                let info_move = db.move_data.get(selected_id);

                let eff_str = ``
                if(info_move.effect != -1){
                    let effect_arr = info_move.effect.split('|')
                    for(let i = 0; i < effect_arr.length; i++){
                        let eff = effect_arr[i]
                        if(eff.charAt(0) == '+'){
                            let eff_split = eff.split('_')
                            eff_str += `+${eff_split[2]}% ${eff_split[1].toUpperCase()}`
                        }
                        else if(eff.charAt(0) == '-'){
                            let eff_split = eff.split('_')
                            eff_str += `-${eff_split[2]}% ${eff_split[1].toUpperCase()}`
                        }
                        else{
                            eff_str += `${eff.charAt(0).toUpperCase() + eff.slice(1)}`
                        }
                        
                        if(i < effect_arr.length - 1){
                            eff_str += `, `
                        }
                    }
                }

                let embed_move = new EmbedBuilder()
                    .setColor('#808080')
                    .setTitle(`${type_to_emote(info_move.type)} ${info_move.name}`)
                    .setDescription(info_move.description)
                    .addFields(
                        {name: 'Type:',     value: `${info_move.type.charAt(0).toUpperCase() + info_move.type.slice(1)}`, inline: true},
                        {name: 'Power:',    value: `${(info_move.damage == 0) ? '-' : info_move.damage}`, inline: true},
                        {name: 'Effect:',   value: `${(info_move.effect == -1) ? '-' : eff_str}`, inline: true},

                        {name: 'Target',    value: `${(info_move.accuracy > 0) ? 'Enemy' : 'Self'}`, inline: true},
                        {name: 'Accuracy:', value: `${Math.abs(info_move.accuracy)}%`, inline: true},
                        {name: 'Chance:',   value: `${(info_move.effect == -1) ? '-' : `${info_move.effect_chance}%`}`, inline: true},
                    );

                return interaction.reply({
                    embeds: [ embed_move ],
                    ephemeral: true
                })
                
            break;
            case 'ability':
                let info_ability = db.ability_data.get(selected_id);
                let embed_ability = new EmbedBuilder()
                    .setColor('#808080')
                    .setTitle(`${info_ability.name}`)
                    .setDescription(info_ability.description);
                return interaction.reply({
                    embeds: [ embed_ability ],
                    ephemeral: true
                })
            break;
            case 'type_chart':
                let embed_type_chart = new EmbedBuilder()
                    .setColor('#808080')
                    .setTitle('Type Chart')
                    .setImage('attachment://type_chart.png')
                return interaction.reply({
                    embeds: [ embed_type_chart ],
                    files: [ get_art_file('./art/ArtFiles/type_chart.png') ],
                    ephemeral: true
                })
            break;
            case 'controls':
                let controls_embed = new EmbedBuilder()
                    .setColor('#808080')
                    .setTitle('Controls')
                    .setDescription('To move, type `w` `a` `s` or `d` in the chat (or click the buttons, if using the discord button setting), and send it as a message. You can use a number after the direction, or something like `www` or `ssss` to jump up to 6 tiles in one direction.\n' +
                        'If you want to chain together movement actions, you can do movement actions split by a comma (example: `w4,d4,s2`) to do multiple movement directions at once!\n' +  
                        '`/lookup` lets you look up what a move, ability, or status effect does, as well as the type chart\n' + 
                        '`/teleport` lets you teleport to the hub or your last used teleporter\n' + 
                        '`/menu` pulls up the menu\n' + 
                        '`/play` to play the game\n' +
                        '`/quit` to quit and close your thread\n' + 
                        'If you using the discord buttons, the top left button changes your jump speed, and the top right button opens the menu.')
                return interaction.reply({
                    embeds: [controls_embed],
                    ephemeral: true
                })
            break;
            case 'status':
                let info_status = db.status_data.get(selected_id);
                let embed_status = new EmbedBuilder()
                    .setColor('#808080')
                    .setTitle(`${info_status.name} ${info_status.emote}`)
                    .setDescription(info_status.description);
                return interaction.reply({
                    embeds: [ embed_status ],
                    ephemeral: true
                })
            break;
        }

    },
};

