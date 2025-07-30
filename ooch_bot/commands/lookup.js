import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import { move_data, ability_data, status_data, item_data, profile } from '../db.js';
import { type_to_emote, status_to_emote } from '../func_battle.js';
import { get_art_file } from '../func_other.js';
import { Status, MoveTarget, Weather, FieldEffect, OochType } from '../types.js';

export const data = new SlashCommandBuilder()
    .setName('lookup')
    .setDescription('Get info on a Move or Ability')
    .addSubcommand(subcommand => subcommand
        .setName('move')
        .setDescription('Get info about a selected move')
        .addStringOption(option => option.setName('move')
            .setDescription('The name of the ability')
            .setAutocomplete(true)
            .setRequired(true)))

    .addSubcommand(subcommand => subcommand
        .setName('type_chart')
        .setDescription('See weaknesses and resistances'))

    .addSubcommand(subcommand => subcommand
        .setName('ability')
        .setDescription('Get info about a selected ability.')
        .addStringOption(option => option.setName('ability')
            .setDescription('The name of the ability')
            .setAutocomplete(true)
            .setRequired(true)))

    .addSubcommand(subcommand => subcommand
        .setName('status')
        .setDescription('Get info about a status effect.')
        .addStringOption(option => option.setName('status')
            .setDescription('The name of the status effect')
            .setAutocomplete(true)
            .setRequired(true)))

    .addSubcommand(subcommand => subcommand
        .setName('item')
        .setDescription('Get info about an item.')
        .addStringOption(option => option.setName('item')
            .setDescription('The name of the item')
            .setAutocomplete(true)
            .setRequired(true)))

    .addSubcommand(subcommand => subcommand
        .setName('controls')
        .setDescription('View the controls!'))

    .addSubcommand(subcommand => subcommand
        .setName('weather')
        .setDescription('Get info about a weather type.')
        .addStringOption(option => option.setName('weather')
            .setDescription('The name of the weather')
            .setAutocomplete(true)
            .setRequired(true)))

    .addSubcommand(subcommand => subcommand
        .setName('field_effect')
        .setDescription('Get info about a field effect.')
        .addStringOption(option => option.setName('field_effect')
            .setDescription('The name of the field effect')
            .setAutocomplete(true)
            .setRequired(true)));
export async function execute(interaction) {

    let selected_db = interaction.options.getSubcommand();
    let selected_id = selected_db == 'move' ? interaction.options.getString('move') : (selected_db == 'status' ? interaction.options.getString('status') : interaction.options.getString('ability'));
    if (selected_db == 'item') selected_id = interaction.options.getString('item');

    if (['move', 'ability', 'status', 'item'].includes(selected_db)) {
        if (isNaN(selected_id)) {
            // TODO: Just have this try to find it in the database rather than saying this
            return interaction.reply('Make sure you select from one of the drop down options, don\'t type this in manually!');
        }
    }

    let info_move, eff_str, eff_split, embed_move,
    info_ability, embed_ability, embed_type_chart, controls_embed,
    info_status, amtOwned, embed_status, info_item, embed_item,
    weather_desc, embed_weather, field_desc, embed_field;

    switch (selected_db) {
        case 'move':
            info_move = move_data.get(`${selected_id}`);

            eff_str = ``;
            for (let eff of info_move.effect) {
                let eff_line = `\n• ${eff.chance}% `;

                switch (eff.status) {
                    case Status.Blind: eff_line += `chance to ${status_to_emote(eff.status)} Blind`; break;
                    case Status.Burn: eff_line += `chance to ${status_to_emote(eff.status)} Burn`; break;
                    case Status.Digitize: eff_line += `chance to ${status_to_emote(eff.status)} Digitize`; break;
                    case Status.Doom: eff_line += `chance to ${status_to_emote(eff.status)} Doom`; break;
                    case Status.Expose: eff_line += `chance to ${status_to_emote(eff.status)} Expose`; break;
                    case Status.Focus: eff_line += `chance to ${status_to_emote(eff.status)} Focus`; break;
                    case Status.Infect: eff_line += `chance to ${status_to_emote(eff.status)} Infect`; break;
                    case Status.Snare: eff_line += `chance to ${status_to_emote(eff.status)} Snare`; break;
                    case Status.Vanish: eff_line += `chance to ${status_to_emote(eff.status)} Vanish`; break;
                    case Status.Sleep: eff_line += `chance to ${status_to_emote(eff.status)} Sleep`; break;
                    case Status.Petrify: eff_line += `chance to ${status_to_emote(eff.status)} Petrify`; break;
                    case Status.Weak: eff_line += `chance to ${status_to_emote(eff.status)} Weaken`; break;
                    case Status.Revealed: eff_line += `chance to ${status_to_emote(eff.status)} Reveal`; break;

                    case 'critical': eff_line += `chance to Critically Hit`; break;
                    case 'random': eff_line += `chance to Select a Random Move`; break;
                    case 'heal': eff_line += `of Max HP Healing to`; break;
                    case 'typematch': eff_line += `chance to match types with`; break;
                    case 'recoil': eff_line += `HP taken as Recoil Damage to`; break;
                    case 'vampire': eff_line += `of Damage done as Health Stolen`; break;
                    case 'clear_stat_stages': eff_line += `chance to Remove all Stat Changes from`; break;
                    case 'clear_status': eff_line += `chance to Remove all Status Effects from`; break;

                    case Status.TrueDamage: eff_line = `• Always deals ${eff.chance} true damage.`; continue;
                    case Status.GoingFirstBonus: eff_line = `• Increases power by ${eff.chance} if going first.`; continue;
                    case Status.GoingLastBonus: eff_line = `• Increases power by ${eff.chance} if going last.`; continue;
                    case Status.WeatherDependent:
                        eff_line = (
                            `• Changes type and effects depending on the weather: ` +
                            `\n\`\`Heatwave:     ${type_to_emote(OochType.Flame)} FLAME, 30% chance to ${status_to_emote(Status.Burn)} Burn.\`\`` +
                            `\n\`\`Thunderstorm: ${type_to_emote(OochType.Sound)} SOUND, 30% chance to ${status_to_emote(Status.Expose)} Expose.\`\``
                        );
                        continue;

                    case 'weather': eff_line = `• Sets the weather to `;
                        switch (eff.chance) {
                            case Weather.Clear: eff_line += 'None.'; break;
                            case Weather.Heatwave: eff_line += 'Heatwave.'; break;
                            case Weather.Thunderstorm: eff_line += 'Thunderstorm.'; break;
                        }
                        eff_str += eff_line;
                        continue;
                    case 'field': eff_line = `• Sets the field effect to `;
                        switch (eff.chance) {
                            case FieldEffect.Clear: eff_line += 'None.'; break;
                            case FieldEffect.EchoChamber: eff_line += 'Echo Chamber.'; break;
                            case FieldEffect.JaggedGround: eff_line += 'Jagged Ground.'; break;
                            case FieldEffect.TwistedReality: eff_line += 'Twisted Reality.'; break;
                            case FieldEffect.Wetlands: eff_line += 'Wetlands.'; break;
                        }
                        eff_str += eff_line;
                        continue;

                    default:
                        eff_split = eff.status.split('_');
                        switch (eff_split[0]) {
                            case '-':
                            case '+':
                                eff_line += `${eff_split[0]}${eff_split[2]} ${eff_split[1].toUpperCase()} stages to`;
                                break;
                            case 'priority':
                                eff_line = `• ${eff_split[1]} Priority.`;
                                break;
                            default:
                                eff_line += `${eff.status}`;
                                break;
                        }

                        break;
                }

                switch (eff.target) {
                    case MoveTarget.Self: eff_line += ` the User.`; break;
                    case MoveTarget.Enemy: eff_line += ` the Target.`; break;
                    case MoveTarget.All: eff_line += ` all Oochamon.`; break;
                    case MoveTarget.None: eff_line += `.`; break;
                }

                eff_str += eff_line;
            }

            embed_move = new EmbedBuilder()
                .setColor('#808080')
                .setTitle(`${type_to_emote(info_move.type)} ${info_move.name}`)
                .setDescription(info_move.description)
                .addFields(
                    { name: 'Type:', value: `${info_move.type.charAt(0).toUpperCase() + info_move.type.slice(1)}`, inline: true },
                    { name: 'Power:', value: `${(info_move.damage == 0) ? '--' : info_move.damage}`, inline: true },
                    { name: 'Accuracy:', value: info_move.accuracy > 0 ? `${info_move.accuracy}%` : `--`, inline: true },

                    { name: 'Effect(s):', value: `${(info_move.effect == false) ? '--' : eff_str}`, inline: true }
                );

            return interaction.reply({
                embeds: [embed_move],
                flags: MessageFlags.Ephemeral
            });

        case 'ability':
            info_ability = ability_data.get(`${selected_id}`);
            embed_ability = new EmbedBuilder()
                .setColor('#808080')
                .setTitle(`${info_ability.name}`)
                .setDescription(info_ability.description);
            return interaction.reply({
                embeds: [embed_ability],
                flags: MessageFlags.Ephemeral
            });
        case 'type_chart':
            embed_type_chart = new EmbedBuilder()
                .setColor('#808080')
                .setTitle('Type Chart')
                .setImage('attachment://type_chart.png');
            return interaction.reply({
                embeds: [embed_type_chart],
                files: [get_art_file('./Art/ArtFiles/type_chart.png')],
                flags: MessageFlags.Ephemeral
            });
        case 'controls':
            controls_embed = new EmbedBuilder()
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
                    'If you using the discord buttons, the top left button changes your jump speed, and the top right button opens the menu.');
            return interaction.reply({
                embeds: [controls_embed],
                flags: MessageFlags.Ephemeral
            });
        case 'status':
            info_status = status_data.get(`${selected_id}`);
            embed_status = new EmbedBuilder()
                .setColor('#808080')
                .setTitle(`${info_status.name} ${info_status.emote}`)
                .setDescription(info_status.description);
            return interaction.reply({
                embeds: [embed_status],
                flags: MessageFlags.Ephemeral
            });
        case 'item':
            info_item = item_data.get(`${selected_id}`);
            amtOwned = profile.get(`${interaction.user.id}`, `${info_item.category}.${selected_id}`);
            if (amtOwned == undefined) amtOwned = 0;
            embed_item = new EmbedBuilder()
                .setColor('#808080')
                .setTitle(`${info_item.emote} ${info_item.name}`)
                .setDescription(`*${info_item.description}\n\n${info_item.description_short}*`)
                .addFields(
                    { name: 'Owned:', value: `${amtOwned}x`, inline: true },
                    { name: 'Price:', value: `${info_item.price > 0 ? info_item.price : '--'}`, inline: true }
                );
            return interaction.reply({
                embeds: [embed_item],
                flags: MessageFlags.Ephemeral
            });
        case 'weather':
            weather_desc = '';
            switch (selected_id) {
                case Weather.Heatwave:
                    weather_desc =
                        `- Blazing heat damages each Oochamon in the battle for 10% HP at the end of the turn. \n
                                - ${type_to_emote(OochType.Flame)} FLAME-type Oochamon are immune to this effect.`;
                    break;
                case Weather.Thunderstorm:
                    weather_desc =
                        `- Each round Oochamon on the field build a static charge. \n
                                - If an Oochamon stays in the battle for 3 turns, they are struck by lightning, taking 50% HP damage and resetting their charge.
                                - ${type_to_emote(OochType.Tech)} TECH-type Oochamon will also have their ATK increased when struck by lightning.`;
                    break;
            }
            embed_weather = new EmbedBuilder()
                .setColor('#808080')
                .setTitle(selected_id)
                .setDescription(weather_desc);
            return interaction.reply({
                embeds: [embed_weather],
                flags: MessageFlags.Ephemeral
            });
        case 'field_effect':
            field_desc = '';
            switch (selected_id) {
                case FieldEffect.JaggedGround:
                    field_desc =
                        `- Sharp rocks damage Oochamon that switch in for 10% HP. \n
                                - This damage will not KO an oochamon. \n
                                - ${type_to_emote(OochType.Tech)} STONE-type Oochamon are immune to this effect.`;
                    break;
                case FieldEffect.EchoChamber:
                    field_desc =
                        `- ${type_to_emote(OochType.Sound)} SOUND-type moves that deal damage also apply the ${status_to_emote(Status.Expose)} EXPOSED status.`;
                    break;
                case FieldEffect.Wetlands:
                    field_desc =
                        `- ${type_to_emote(OochType.Ooze)} OOZE-type Oochamon get +1 Priority.`;
                    break;
                case FieldEffect.TwistedReality:
                    field_desc =
                        `- Distortions reverse the move order! \n
                                - Slower Oochamon go earlier, faster Oochamon move later.
                                - Priority's effects are reversed.`;
                    break;
            }
            embed_field = new EmbedBuilder()
                .setColor('#808080')
                .setTitle(selected_id)
                .setDescription(field_desc);
            return interaction.reply({
                embeds: [embed_field],
                flags: MessageFlags.Ephemeral
            });
    }

}

