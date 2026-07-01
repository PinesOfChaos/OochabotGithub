// For functions that don't fit into the other categories
import { monster_data, profile, ability_data, move_data, battle_data } from "./db.js";
import { EmbedBuilder, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { PlayerState, TameStatus, TamingAction, ItemCategory, Item } from './types.js';
import { get_blank_profile } from './func_modernize.js';
import { inRange, capitalize, toLower, replace, clamp, sample } from 'lodash-es';
import { filledBar } from 'string-progressbar';
import { Canvas, loadImage } from "skia-canvas";
import { clientEmojis } from "./index.js";
import { genmap_loot_by_level } from "./func_level_gen.js";

// Builds the action rows and places emotes in for the Oochabox, based on the database.
// Updates with new database info every time the function is run
// Needs to be updated in a lot of cases, so easier to put it in a function!
export function buildBoxData(user_id, user_profile, page_num, custom_pre = null) {
    let box_row = []; // Changed to 'let' as 'box_row' was undeclared
    box_row[0] = new ActionRowBuilder();
    box_row[1] = new ActionRowBuilder();
    box_row[2] = new ActionRowBuilder();
    box_row[3] = new ActionRowBuilder();
    let box_idx = 0;
    let oochabox_data = user_profile.ooch_pc;
    let party_data = user_profile.ooch_party;
    let offset = (16 * page_num)

    const pre = custom_pre || `other_${user_id}_`;

    for (let i = (0 + offset); i < (16 + offset); i++) {
        if (inRange(i, 0+offset, 3+offset)) box_idx = 0; 
        if (inRange(i, 4+offset, 7+offset)) box_idx = 1; 
        if (inRange(i, 8+offset, 11+offset)) box_idx = 2; 
        if (inRange(i, 12+offset, 15+offset)) box_idx = 3; 

        if (oochabox_data[i] == undefined) {
            box_row[box_idx].addComponents(
                new ButtonBuilder()
                    .setCustomId(`${pre}box_emp_${i}`)
                    .setLabel('‎')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true)
                )              
        } else {
            let ooch_data = monster_data.get(`${oochabox_data[i].id}`);
            box_row[box_idx].addComponents(
                new ButtonBuilder()
                    .setCustomId(`${pre}box_ooch_${oochabox_data[i].id}_${i}`)
                    .setEmoji(ooch_data.emote)
                    .setStyle(ButtonStyle.Secondary)
            )
        }          
    }
    
    for (let i = 0; i < 4; i++) {
        if (party_data[i] == undefined) {
            box_row[i].addComponents(
                new ButtonBuilder()
                    .setCustomId(`${pre}box_emp_${i}_party`)
                    .setLabel('‎')
                    .setStyle(ButtonStyle.Success)
                    .setDisabled(true)
                )              
        } else {
            let ooch_data = monster_data.get(`${party_data[i].id}`);
            box_row[i].addComponents(
                new ButtonBuilder()
                    .setCustomId(`${pre}box_ooch_${party_data[i].id}_${i}_party`)
                    .setEmoji(ooch_data.emote)
                    .setStyle(ButtonStyle.Success)
            )
        }
    }
    return box_row;
}

/**
 * Creates and returns an info embed based on the Oochamon you pass in
 * For use with box/oochamon party menu systems, and after you catch an Oochamon.
 * @param {Number} ooch The oochamon to make an info embed for
 * @param {String} user_id The user ID who owns the Oochamon
 * @returns The Ooch Embed, as well as the file related to the Oochamon, in an array of the 2.
 */
export async function ooch_info_embed(ooch, user_id=false, caught_embed=false) {
    const { type_to_emote } = await import('./func_battle.js');
    const { get_ooch_art } = await import('./func_other.js'); 

    let ooch_title = `${ooch.nickname}`;
    ooch.nickname != ooch.name ? ooch_title += ` (${ooch.name}) [Lv. ${ooch.level}] ${type_to_emote(ooch.type)}}` 
        : ooch_title += ` [Lv. ${ooch.level}] ${type_to_emote(ooch.type)}`;
    let moveset_str = ``;
    let ooch_data = monster_data.get(`${ooch.id}`);
    // let user_data = false;
    // if (user_id) {
    //     user_data = profile.get(`${user_id}`);
    // }

    let expBar = filledBar(ooch.next_lvl_exp, ooch.current_exp, 15, '▱', '▰')[0];

    let infoEmbed = new EmbedBuilder()
        .setColor('#808080')
        .setTitle(ooch_title)
        .setThumbnail(`attachment://${ooch_data.name.toLowerCase()}${ooch.variant}.png`)
        .setDescription(`HP: **${ooch.current_hp}/${ooch.stats.hp}**\nAbility: **${ability_data.get(`${ooch.ability}`, 'name')}**\nType: **${ooch.type.map(v => capitalize(v)).join(' | ')}**`);

    for (let move_id of ooch.moveset) {
        let move = move_data.get(`${move_id}`)
        if (!move) continue;
        move.accuracy = Math.abs(move.accuracy);
        if (move.accuracy == 1) move.accuracy = 100;
        if (move.damage !== 0) {
            moveset_str += `${type_to_emote(move.type)} **${move.name}**: **${move.damage}** power, **${move.accuracy}%** accuracy\n`;
        } else {
            moveset_str += `${type_to_emote(move.type)} **${move.name}**: **${move.accuracy}%** accuracy\n`;
        }
    }

    let iv_hp = Math.round((ooch.stats.hp_iv - 1) * 20)
    let iv_atk = Math.round((ooch.stats.atk_iv - 1) * 20)
    let iv_def = Math.round((ooch.stats.def_iv - 1) * 20)
    let iv_spd = Math.round((ooch.stats.spd_iv - 1) * 20)

    let tame_status = get_tame_string(ooch.tame_value);  

    infoEmbed.addFields([{ name: 'Moveset', value: moveset_str, inline: true }]);
    infoEmbed.addFields([{ name: 'Stats', value: `HP: **${ooch.stats.hp}** (${get_iv_stars(iv_hp)})` + 
        `\nATK: **${ooch.stats.atk}** (${get_iv_stars(iv_atk)})\nDEF: **${ooch.stats.def}** (${get_iv_stars(iv_def)})` + 
        `\nSPD: **${ooch.stats.spd}** (${get_iv_stars(iv_spd)})`, inline: true }]);
    if (ooch.level != 50 && caught_embed == false) {
        infoEmbed.addFields([{ name: `EXP (${ooch.current_exp}/${ooch.next_lvl_exp}):`, value: `${expBar}` }]);
    }

    if (caught_embed == false) {
        infoEmbed.addFields([{ name: `Taming Status:`, value: `${tame_status}` }]);
    }
    
    if (ooch_data.evo_id != -1 && ooch_data.evo_lvl != -1 && user_id != false) {
        let oochadex_check = profile.get(`${user_id}`, `oochadex[${ooch_data.evo_id}]`); // Changed to 'let'
        if (oochadex_check == undefined) {
            oochadex_check = { caught: 0 }
        } 
        infoEmbed.setFooter({ text: `Evolves into ${oochadex_check.caught != 0 ? monster_data.get(`${ooch_data.evo_id}`, 'name') : `???`} at level${ooch_data.evo_lvl}${ooch_data.special_evo ? ' after a special condition is fulfilled' : ''}`, iconURL: monster_data.get(`${ooch_data.evo_id}`, 'image') });
    }

    return [infoEmbed, get_ooch_art(ooch_data.name, ooch.variant)];
}

/**
 * Creates and returns an info container (Components v2) based on the Oochamon you pass in
 * For use with menu systems using Components v2.
 * @param {Object} ooch The oochamon to make an info container for
 * @param {String} user_id The user ID who owns the Oochamon
 * @returns Object with { section, file, footerText }
 */
export async function ooch_info_container(ooch, user_id = false) {
    const { type_to_emote } = await import('./func_battle.js');
    const { get_ooch_art } = await import('./func_other.js');

    let ooch_title = `# ${ooch.nickname}`;
    ooch.nickname != ooch.name ? ooch_title += ` (${ooch.name}) [Lv. ${ooch.level}] ${type_to_emote(ooch.type)}`
        : ooch_title += ` [Lv. ${ooch.level}] ${type_to_emote(ooch.type)}`;

    let ooch_data = monster_data.get(`${ooch.id}`);
    let expBar = filledBar(ooch.next_lvl_exp, ooch.current_exp, 15, '▱', '▰')[0];

    // Build moveset string
    let moveset_str = ``;
    for (let move_id of ooch.moveset) {
        let move = move_data.get(`${move_id}`);
        if (!move) continue;
        let accuracy = Math.abs(move.accuracy);
        if (accuracy == 1) accuracy = 100;
        if (move.damage !== 0) {
            moveset_str += `${type_to_emote(move.type)} **${move.name}**: **${move.damage}** power, **${accuracy}%** accuracy\n`;
        } else {
            moveset_str += `${type_to_emote(move.type)} **${move.name}**: **${accuracy}%** accuracy\n`;
        }
    }

    let iv_hp = Math.round((ooch.stats.hp_iv - 1) * 20);
    let iv_atk = Math.round((ooch.stats.atk_iv - 1) * 20);
    let iv_def = Math.round((ooch.stats.def_iv - 1) * 20);
    let iv_spd = Math.round((ooch.stats.spd_iv - 1) * 20);

    let tame_status = get_tame_string(ooch.tame_value);

    // Build the info text for the section
    let infoText = `${ooch_title}\n`;
    infoText += `HP: **${ooch.current_hp}/${ooch.stats.hp}**\n`;
    infoText += `Ability: **${ability_data.get(`${ooch.ability}`, 'name')}**\n`;
    infoText += `Type: **${ooch.type.map(v => capitalize(v)).join(' | ')}**\n`;

    infoText += `## Moveset: \n${moveset_str}`;

    infoText += `## Stats:\n`;
    infoText += `HP: **${ooch.stats.hp}** (${get_iv_stars(iv_hp)})\n`;
    infoText += `ATK: **${ooch.stats.atk}** (${get_iv_stars(iv_atk)})\n`;
    infoText += `DEF: **${ooch.stats.def}** (${get_iv_stars(iv_def)})\n`;
    infoText += `SPD: **${ooch.stats.spd}** (${get_iv_stars(iv_spd)})\n`;

    if (ooch.level != 50) {
        infoText += `\n**EXP (${ooch.current_exp}/${ooch.next_lvl_exp}):**\n${expBar}\n`;
    }

    infoText += `\n**Taming Status:** ${tame_status}`;

    // Build footer text for evolution info
    let footerText = '';
    if (ooch_data.evo_id != -1 && ooch_data.evo_lvl != -1 && user_id != false) {
        let oochadex_check = profile.get(`${user_id}`, `oochadex[${ooch_data.evo_id}]`);
        if (oochadex_check == undefined) {
            oochadex_check = { caught: 0 };
        }
        footerText = `Evolves into ${oochadex_check.caught != 0 ? monster_data.get(`${ooch_data.evo_id}`, 'name') : `???`} at level ${ooch_data.evo_lvl}${ooch_data.special_evo ? ' after a special condition is fulfilled' : ''}`;
    }

    return {
        infoText: infoText,
        file: get_ooch_art(ooch_data.name, ooch.variant),
        fileName: `${ooch_data.name.toLowerCase()}${ooch.variant}.png`,
        footerText: footerText
    };
}

/**
 * Returns true or false based on a percent chance out of 100.
 * @param {Number} percent Percent chance to return true.
 */
export function check_chance(percent) {
    return Math.random() <= percent / 100;
}

/**
 * Returns the emote text for a specified attribute
 * @param {String} emote_name Name to get emote from.
 */
export function get_emote_string(name) {
    let emojiList = clientEmojis.filter(v => v.name.toLowerCase() === toLower(name));
    emojiList = Array.from(emojiList.values());
    if (emojiList.length === 0) {

        console.log(`EMOJI ERROR: ${name} not found.`);

        emojiList = clientEmojis.filter(v => v.name === 'error');
        emojiList = Array.from(emojiList.values());
    }

    if (emojiList == undefined || emojiList.length == 0) {
        return '❌';
    }

    return `<:${emojiList[0].name}:${emojiList[0].id}>`;
}

/**
 * Returns the bigger sized art of the Oochamon from its name.
 * @param {String} ooch_name Name of the Oochamon to get emote from.
 * @returns The attachment file object.
 */
export function get_ooch_art(ooch_name, variant = ``) {
    let file_name = `./Art/ResizedArt/${replace(ooch_name.toLowerCase().replace('\'', '-'), RegExp(" ", "g"), "_")}${variant}.png`
    let file = new AttachmentBuilder(file_name);
    
    return file;
}

/**
 * Creates and returns an attachment file object for a file path.
 * @param {String} path File path for the art
 * @returns The attachment file object.
 */
export function get_art_file(path) {
    let file = new AttachmentBuilder(path);
    return file;
}

/**
 * Creates and returns a bonus star emote string for IVs.
 * @param {Number} iv The IV number to turn into stars
 * @returns The star emote string.
 */
export function get_iv_stars(iv) {
    const star_empty = get_emote_string('star_empty');
    const star_half = get_emote_string('star_half');
    const star_full = get_emote_string('star_full');

    let stars = [];
    for (let i = 0; i < 5; i++) {
        if (iv >= 2) {
            stars.push(star_full);
            iv -= 2;
        } else if (iv == 1) {
            stars.push(star_half);
            iv -= 1;
        } else {
            stars.push(star_empty);
        }
    }

    return stars.join("");
}

/**
 * Change an Oochamon's tame value
 * @param {Object} ooch 
 * @param {Number} tame_value 
 * @returns The oochamon being edited
 */
export function update_tame_value(ooch, tame_value) {
    if (ooch.tame_value < 200) {
        ooch.tame_value = clamp(ooch.tame_value + tame_value, 0, 200);
        if (ooch.tame_value == 200) {
            ooch.stats.hp_iv = clamp(ooch.stats.hp_iv + 1, 0, 10);
            ooch.stats.atk_iv = clamp(ooch.stats.atk_iv + 1, 0, 10);
            ooch.stats.def_iv = clamp(ooch.stats.def_iv + 1, 0, 10);
            ooch.stats.spd_iv = clamp(ooch.stats.spd_iv + 1, 0, 10);
        }
    }
    return ooch;
}

export function formatStatBar(stat) {
    return `${stat > 0 ? '▲' : '▼'}`.repeat(Math.abs(stat)) + '○'.repeat(8 - Math.abs(stat));
}

export async function reset_oochamon(user_id) {
    // Setup user data
    let db_profile = get_blank_profile();
    profile.set(user_id, db_profile);
    
    // Settings
    profile.set(user_id, {
        controls_msg: false,
        battle_cleanup: true,
        zoom: '9_9',
        battle_speed: 2500,
        discord_move_buttons: true,
        objective: true,
    }, 'settings');

    // Setup Oochadex template
    for (const ooch_id in monster_data.keys()) { // Changed to 'const'
        profile.push(user_id, { id: ooch_id, caught: 0 }, 'oochadex')
    }

    // Grant special starting skins to specific players
    const starting_skins = {
        '277577216240517121': Item.SkinTamagoochiGirl,   // maus
        '166037289229746177': Item.SkinEngineer,         // marci
        '124339025153622016': Item.SkinTerarabe,         // codraven
        '156859982778859520': Item.SkinForsythe,         // jack
        '323856749280886784': Item.SkinJEKYLLPOWERSTANCE, // kitty
        '1077358457184845864': Item.SkinNeo,             // neo
        '122568101995872256': Item.SkinJeffdev,          // jeff
        '145342159724347393': Item.SkinEvergreenCultist, // pines
    };

    if (starting_skins[user_id] !== undefined) {
        profile.push(user_id, { id: starting_skins[user_id], quantity: 1 }, `inventory.${ItemCategory.Skin}`);
    }
}

export async function quit_oochamon(thread, user_id, client) {

    const { finish_battle } = await import('./func_battle.js');
    const { move } = await import('./func_play.js');

    let curBattleId = profile.get(`${user_id}`, 'cur_battle_id');
    if (curBattleId != false && curBattleId != undefined && curBattleId != null && battle_data.has(curBattleId)) {
        
        let battleData = battle_data.get(`${curBattleId}`);
        await battle_data.delete(`${curBattleId}`);

        for (let user of battleData.users) {
            profile.set(user.user_id, 0, 'cur_event_pos');
            profile.set(user.user_id, false, 'cur_battle_id');
            let userThread = client.channels.cache.get(`${user.thread_id}`);

            if (user.is_player) {
                await finish_battle(battleData, user.user_index, true);
                await move(userThread, user.user_id, '', 1);
            }
        } 
    } 

    // await thread.bulkDelete(5);
    await thread.members.remove(user_id);
    await thread.leave();
    await thread.setLocked(true);
    await thread.setArchived(true);
    await profile.set(user_id, PlayerState.NotPlaying, 'player_state');
}

/**
 * Get the tame value string
 * @param {number} tame_value the tame value to check
 * @returns The tame string
 */
export function get_tame_string(tame_value) {
    let tame_status = TameStatus.Hostile;

    if (inRange(tame_value, 41, 80)) {
        tame_status = TameStatus.Angry;
    } else if (inRange(tame_value, 81, 120)) {
        tame_status = TameStatus.Neutral;
    } else if (inRange(tame_value, 121, 160)) {
        tame_status = TameStatus.Happy;
    } else if (inRange(tame_value, 161, 199)) {
        tame_status = TameStatus.Loyal;
    } else if (tame_value >= 200) {
        tame_status = TameStatus.BestFriend;
    }

    return tame_status;

}

/**
 * Setup the oochamon taming picture
 * @param {Object} ooch The oochamon to add to the taming background
 * @param {Object} action The taming action happening
 * @returns The taming picture
 */
export async function setup_taming_picture(ooch, action = TamingAction.Default) {
    let canvas = new Canvas(250, 250);
    let ctx = canvas.getContext("2d");
    
    // Draw the background
    const background = await loadImage(`./Art/ArtFiles/taming_background.png`);
    ctx.drawImage(background, 0, 0, 250, 250);

    ctx.imageSmoothingEnabled = false;
    const ooch_image = await loadImage(`./Art/ResizedArt/${ooch.name.toLowerCase()}${ooch.variant}.png`)
    const shadow_image = await loadImage(`./Art/BattleArt/shadow_64x32.png`);

    let shadow = {
        x : (canvas.width / 2) - (shadow_image.width),
        y : (canvas.height * .75) - (shadow_image.height)
    }

    ctx.drawImage(shadow_image, shadow.x, shadow.y, shadow_image.width * 2, shadow_image.height * 2);
    ctx.drawImage(ooch_image, (canvas.width / 2) - (ooch_image.width), (canvas.height * .75) - (ooch_image.height * 2), ooch_image.width * 2, ooch_image.height * 2)

    switch (action) {
        case TamingAction.Feed:

        break;
        case TamingAction.Pet:
            ctx.font = '48px Arial';
            ctx.fillText('🫳', 80, 80);
            ctx.font = '30px Arial';
            ctx.fillText('❤️', 160, 80);
        break;
        case TamingAction.Walk:

        break;
    }

    let pngData = canvas.toBufferSync('png');
    return pngData;
}

export function pet_text(name, tame_value){
    let tame_status = get_tame_string(tame_value)
    switch(tame_status){
        case TameStatus.Hostile:
            return `${name} wants to break your kneecaps, run off, kill you, stab you, kill you again, stab you a little more, then piss on your dead body.`
        case TameStatus.Angry:
            return `${name} is going to piss on your grave, respectfully.`
        case TameStatus.Neutral:
            return (sample([
                `${name} looks at you curiously.`,
                `${name} trots off to a corner.`,
                `${name} is staring off into the distance.`,
                `${name} looks like it wants something to eat.`,
            ]))
        case TameStatus.Happy:
            return (sample([
                `${name} happily accepts the pets.`,
                `${name} leans into your hand.`,
                `${name} stares into your eyes.`,
                `${name} spins in a circle.`,
            ]))
        case TameStatus.Loyal:
            return (sample([
                `${name} gladly accepts the pets.`,
                `${name} begins to purr.`,
                `${name} leans into your hand.`,
                `${name} stretches.`,
            ]))
        case TameStatus.BestFriend:
            return (sample([
                `${name} eagerly accepts the pets.`,
                `${name} wants even more pets.`,
                `${name} does a sick flip.`,
                `${name} shows off some of its moves.`,
            ]))
    }

}

export function feed_text(name, result){
    if (result) {
        return (sample([
            `${name} eats the treat.`,
            `${name} eagerly devours the treat.`,
            `${name} doesn't leave a single crumb.`,
            `${name} looks like it wants another.`,
        ]))
    } else {
        return (sample([
            `${name} eats it begrudingly. It doesn't look very happy about it.`,
            `${name} gives you a death glare while it eats the treat.`,
            `${name} looks at you with a look of betrayal. How could you do this?`,
            `${name} is sad. It doesn't seem to want another one of those.`
        ]))
    }
}

export function walk_get_rewards(name, tame_value, level){
    let modified_level = Math.ceil((tame_value/200) * level); //This scales the mon's level based on its affection

    //Makes an array of 5 items {count, id}
    let loot = [];
    for(let i = 0; i < 5; i++){
        loot.push(genmap_loot_by_level(modified_level));
    }

    let walk_text = sample([
        `${name} and you go on a walk.`,
        `${name} and you have a relaxing stroll.`,
        `${name} wanders off on your walk but finds its way back to you.`,
    ]);

    return ({
        walk_text : walk_text,
        loot : loot
    })
}