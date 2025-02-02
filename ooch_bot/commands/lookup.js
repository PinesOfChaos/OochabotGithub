const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../db.js');
const _ = require('lodash');
const { type_to_emote } = require('../func_battle');
const { get_art_file } = require('../func_other.js');
const { Status, MoveTarget } = require('../types.js');

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
                .setName('item')
                .setDescription('Get info about an item.')
                .addStringOption(option => 
                    option.setName('item')
                        .setDescription('The name of the item')
                        .setAutocomplete(true)
                        .setRequired(true)))

        .addSubcommand(subcommand =>
            subcommand
                .setName('controls')
                .setDescription('View the controls!')),

    async execute(interaction) {

        let selected_db = interaction.options.getSubcommand();
        let selected_id = selected_db == 'move' ? interaction.options.getString('move') : (selected_db == 'status' ? interaction.options.getString('status') : interaction.options.getString('ability'));
        if (selected_db == 'item') selected_id = interaction.options.getString('item');

        if (selected_db === 'move' || selected_db === 'ability' || selected_db == 'status' || selected_db == 'item') {
            if (isNaN(selected_id)) {
                // TODO: Just have this try to find it in the database rather than saying this
                return interaction.reply('Make sure you select from one of the drop down options, don\'t type this in manually!')
            }
        }
        
        switch(selected_db){
            case 'move':
                let info_move = db.move_data.get(selected_id);

                let eff_str = ``
                for(eff of info_move.effect){
                    eff_str += `• ${eff.chance}% `
                    switch (eff.status) {
                        case Status.Blind:          eff_str += `chance to Blind`;  break;
                        case Status.Burn:           eff_str += `chance to Burn`; break;
                        case Status.Digitize:       eff_str += `chance to Digitize`; break;
                        case Status.Doom:           eff_str += `chance to Doom`; break;
                        case Status.Expose:         eff_str += `chance to Expose`; break;
                        case Status.Focus:          eff_str += `chance to Focus`; break;
                        case Status.Infect:         eff_str += `chance to Infect`; break; 
                        case Status.Snare:          eff_str += `chance to Snare`; break; 
                        case Status.Vanish:         eff_str += `chance to Vanish`; break; 
                        case 'critical':            eff_str += `chance to Critically Hit`; break;
                        case 'random':              eff_str += `chance to Select a Random Move`; break;
                        case 'heal':                eff_str += `of Max HP Healing to`; break;
                        case 'typematch':           eff_str += `chance to match types with`; break;
                        case 'recoil':              eff_str += `HP taken as Recoil Damage to`; break;
                        case 'vampire':             eff_str += `of Damage done as Health Stolen`; break;
                        case 'clear_stat_stages':   eff_str += `chance to Remove all Stat Changes from`; break;
                        case 'clear_status':        eff_str += `chance to Remove all Status Effects from`; break;
                        default:
                            let eff_split = eff.status.split('_')
                            switch(eff_split[0]){
                                case '-':
                                case '+':
                                    eff_str += `${eff_split[0]}${eff_split[2]} ${eff_split[1].toUpperCase()} stages to`
                                break;
                                default:
                                    eff_str += `${eff.status}`;
                                break;
                            }

                        break; 
                    }
                    
                    switch(eff.target){
                        case MoveTarget.Self:   eff_str += ` User.`; break;
                        case MoveTarget.Enemy:  eff_str += ` Target.`; break;
                        case MoveTarget.All:    eff_str += ` both Oochamon.`; break;
                        case MoveTarget.None:   eff_str += `.`; break;
                    }
                    
                    eff_str += `\n`
                }


                let embed_move = new EmbedBuilder()
                    .setColor('#808080')
                    .setTitle(`${type_to_emote(info_move.type)} ${info_move.name}`)
                    .setDescription(info_move.description)
                    .addFields(
                        {name: 'Type:',     value: `${info_move.type.charAt(0).toUpperCase() + info_move.type.slice(1)}`, inline: true},
                        {name: 'Power:',    value: `${(info_move.damage == 0) ? '--' : info_move.damage}`, inline: true},
                        {name: 'Accuracy:', value: `${Math.abs(info_move.accuracy)}%`, inline: true},

                        {name: 'Effect(s):',   value: `${(info_move.effect == false) ? '--' : eff_str}`, inline: true}
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
                    files: [ get_art_file('./Art/ArtFiles/type_chart.png') ],
                    ephemeral: true
                })
            break;
            case 'controls':
                let controls_embed = new EmbedBuilder()
                    .setColor('#808080')
                    .setTitle('Controls')
                    .setDescription('To move, type `w` `a` `s` or `d` in the chat (or click the buttons, if using the discord button setting), and send it as a message. You can use a number after the direction, or something like `www` or `ssss` to jump up to 6 tiles in one direction.\n\n' +
                        'If you want to chain together movement actions, you can chain together movement in a variety of ways to do multiple movement directions at once!\n' +  
                        '(As an example, you can do `w2d2` to move up then right, or `wwwaa` to move up 3 then left 2, and you can chain these however you want!)\n\n' +  
                        '**Extra commands:**\n' +
                        '- `/lookup` lets you look up what a move, ability, or status effect does, as well as the type chart\n' + 
                        '- `/teleport` lets you teleport to the hub or your last used teleporter\n' + 
                        '- `/menu` pulls up the menu\n' + 
                        '- `/play` to play the game, `/reset` will reset your game\n' +
                        '- `/quit` to quit and close your thread\n' + 
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
            case 'item':
                let info_item = db.item_data.get(selected_id);
                let amtOwned = db.profile.get(interaction.user.id, `${info_item.category}.${selected_id}`);
                if (amtOwned == undefined) amtOwned = 0;
                let embed_item = new EmbedBuilder()
                    .setColor('#808080')
                    .setTitle(`${info_item.emote} ${info_item.name}`)
                    .setDescription(`*${info_item.description}\n\n${info_item.description_short}*`)
                    .addFields(
                        {name: 'Owned:',     value: `${amtOwned}x`, inline: true},
                        {name: 'Price:',     value: `${info_item.price > 0 ? info_item.price : '--'}`, inline: true}
                    );
                return interaction.reply({
                    embeds: [ embed_item ],
                    ephemeral: true
                })
            break;
        }

    },
};

