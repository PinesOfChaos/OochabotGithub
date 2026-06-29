import { SlashCommandBuilder, EmbedBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import { move_data, ability_data, status_data, item_data, profile, monster_data } from '../db.js';
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
    const selected_id_map = { move: 'move', ability: 'ability', status: 'status', item: 'item', weather: 'weather', field_effect: 'field_effect' };
    let selected_id = selected_id_map[selected_db] ? interaction.options.getString(selected_id_map[selected_db]) : null;

    if (['move', 'ability', 'status', 'item'].includes(selected_db)) {
        if (isNaN(selected_id)) {
            const db_map = { move: move_data, ability: ability_data, status: status_data, item: item_data };
            const db = db_map[selected_db];
            const query = selected_id.toLowerCase().trim();
            const entries = db.values();
            // Prefer exact name match, then startsWith, then contains
            const exact = entries.find(e => e.name.toLowerCase() === query);
            const starts = !exact && entries.find(e => e.name.toLowerCase().startsWith(query));
            const contains = !exact && !starts && entries.find(e => e.name.toLowerCase().includes(query));
            const match = exact || starts || contains;
            if (!match) {
                return interaction.reply({ content: `Couldn't find a ${selected_db} matching "${selected_id}". Try selecting from the dropdown!`, flags: MessageFlags.Ephemeral });
            }
            selected_id = `${match.id}`;
        }
    }

    let info_move, eff_str, eff_split,
    info_ability, embed_ability, embed_type_chart, controls_embed,
    info_status, amtOwned, embed_status, info_item, embed_item,
    weather_desc, embed_weather, field_desc, embed_field, ooch_ability_list,
    ooch_move_list, items_per_page = 15;

    const prevButton = new ButtonBuilder()
        .setCustomId('prev_page')
        .setLabel(get_emote_string('arrow_L'))
        .setStyle(ButtonStyle.Primary)
        .setDisabled(true);

    const nextButton = new ButtonBuilder()
        .setCustomId('next_page')
        .setLabel(get_emote_string('arrow_R'))
        .setStyle(ButtonStyle.Primary)

    switch (selected_db) {
        case 'move': {
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

            // Get all Oochamon that learn this move
            ooch_move_list = monster_data.values();
            ooch_move_list = ooch_move_list.filter(ooch => (ooch.move_list.filter(move => move[1] == parseInt(selected_id)).length > 0 && ooch.id > 0));
            ooch_move_list = ooch_move_list.map(ooch => {
                if (profile.has(interaction.user.id)) {
                    if (profile.get(interaction.user.id, `oochadex[${ooch.id}]`).caught > 0) {
                        return `${ooch.emote} ${ooch.name} [Lv. ${ooch.move_list.filter(move => move[1] == parseInt(selected_id))[0][0]}]`;
                    } else {
                        return `<???>`;
                    }
                } else {
                    return `<???>`;
                }
            })

            const totalPages = Math.max(1, Math.ceil(ooch_move_list.length / items_per_page));

            const makeEmbedForPage = (page) => {
                const start = (page - 1) * items_per_page;
                const pageItems = ooch_move_list.slice(start, start + items_per_page);

                const embed = new EmbedBuilder()
                    .setColor('#808080')
                    .setTitle(`${type_to_emote(info_move.type)} ${info_move.name}`)
                    .setDescription(info_move.description)
                    .addFields(
                        { name: 'Type:', value: `${info_move.type.charAt(0).toUpperCase() + info_move.type.slice(1)}`, inline: true },
                        { name: 'Power:', value: `${(info_move.damage == 0) ? '--' : info_move.damage}`, inline: true },
                        { name: 'Accuracy:', value: info_move.accuracy > 0 ? `${info_move.accuracy}%` : `--`, inline: true },
                        { name: 'Effect(s):', value: `${(info_move.effect == false) ? '--' : eff_str}`, inline: true }
                    );

                if (ooch_move_list.length > 0) embed.addFields({ name: `Oochamon Who Learn ${info_move.name}`, value: pageItems.length > 0 ? pageItems.join('\n') : '--' });

                if (totalPages > 1) embed.setFooter({ text: `Page ${page}/${totalPages}` });
                return embed;
            };

            if (totalPages <= 1) {
                await interaction.reply({
                    embeds: [makeEmbedForPage(1)],
                    flags: MessageFlags.Ephemeral,
                    fetchReply: true
                });
            } else {
                let currentPage = 1;
                if (totalPages <= 1) prevButton.setDisabled(true);

                const row = new ActionRowBuilder().addComponents(prevButton, nextButton);

                const msg = await interaction.reply({
                    embeds: [makeEmbedForPage(currentPage)],
                    components: [row],
                    flags: MessageFlags.Ephemeral,
                });

                const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

                collector.on('collect', async (i) => {
                    if (i.customId === 'prev_page' && currentPage > 1) currentPage--;
                    if (i.customId === 'next_page' && currentPage < totalPages) currentPage++;

                    prevButton.setDisabled(currentPage <= 1);
                    nextButton.setDisabled(currentPage >= totalPages);

                    await i.update({ embeds: [makeEmbedForPage(currentPage)], components: [new ActionRowBuilder().addComponents(prevButton, nextButton)] });
                });

                collector.on('end', async () => {
                    prevButton.setDisabled(true);
                    nextButton.setDisabled(true);
                    await msg.edit({ components: [new ActionRowBuilder().addComponents(prevButton, nextButton)] }).catch(() => {});
                });
            }

            break;
        }

        case 'ability':
            info_ability = ability_data.get(`${selected_id}`);
            ooch_ability_list = monster_data.values();
            ooch_ability_list = ooch_ability_list.filter(ooch => (ooch.abilities.includes(parseInt(selected_id)) && ooch.id > 0));
            ooch_ability_list = ooch_ability_list.map(ooch => {
                if (profile.has(interaction.user.id)) {
                    if (profile.get(interaction.user.id, `oochadex[${ooch.id}]`).caught > 0) {
                        return `${ooch.emote} ${ooch.name}`;
                    } else {
                        return `<???>`;
                    }
                } else {
                    return `<???>`;
                }
            })
            embed_ability = new EmbedBuilder()
                .setColor('#808080')
                .setTitle(`${info_ability.name}`)
                .setDescription(info_ability.description);
            
            if (ooch_ability_list.length > 0) embed_ability.addFields({ name: `Oochamon With ${info_ability.name}`, value: ooch_ability_list.join('\n')});
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

