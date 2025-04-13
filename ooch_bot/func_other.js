// For functions that don't fit into the other categories
const db = require("./db")
const { EmbedBuilder, AttachmentBuilder, Collection, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { TypeEmote, PlayerState, Item, TameStatus } = require('./types.js');
const { get_blank_profile } = require('./func_modernize.js');
const _ = require('lodash');
const progressbar = require('string-progressbar');

let functions = {

    // Builds the action rows and places emotes in for the Oochabox, based on the database.
    // Updates with new database info every time the function is run
    // Needs to be updated in a lot of cases, so easier to put it in a function!
    buildBoxData: function(user_profile, page_num) {
        box_row = [];
        box_row[0] = new ActionRowBuilder();
        box_row[1] = new ActionRowBuilder();
        box_row[2] = new ActionRowBuilder();
        box_row[3] = new ActionRowBuilder();
        let box_idx = 0;
        let oochabox_data = user_profile.ooch_pc;
        let party_data = user_profile.ooch_party;
        let offset = (16 * page_num)

        for (let i = (0 + offset); i < (16 + offset); i++) {
            if (_.inRange(i, 0+offset, 3+offset)) box_idx = 0; 
            if (_.inRange(i, 4+offset, 7+offset)) box_idx = 1; 
            if (_.inRange(i, 8+offset, 11+offset)) box_idx = 2; 
            if (_.inRange(i, 12+offset, 15+offset)) box_idx = 3; 

            if (oochabox_data[i] == undefined) {
                box_row[box_idx].addComponents(
                    new ButtonBuilder()
                        .setCustomId(`box_emp_${i}`)
                        .setLabel('‎')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(true)
                    )              
            } else {
                let ooch_data = db.monster_data.get(oochabox_data[i].id);
                box_row[box_idx].addComponents(
                    new ButtonBuilder()
                        .setCustomId(`box_ooch_${oochabox_data[i].id}_${i}`)
                        .setEmoji(ooch_data.emote)
                        .setStyle(ButtonStyle.Secondary)
                )
            }          
        }
        
        for (let i = 0; i < 4; i++) {
            if (party_data[i] == undefined) {
                box_row[i].addComponents(
                    new ButtonBuilder()
                        .setCustomId(`box_emp_${i}_party`)
                        .setLabel('‎')
                        .setStyle(ButtonStyle.Success)
                        .setDisabled(true)
                    )              
            } else {
                let ooch_data = db.monster_data.get(party_data[i].id);
                box_row[i].addComponents(
                    new ButtonBuilder()
                        .setCustomId(`box_ooch_${party_data[i].id}_${i}_party`)
                        .setEmoji(ooch_data.emote)
                        .setStyle(ButtonStyle.Success)
                )
            }
        }
        return box_row;
    },

    /**
     * Creates and returns an info embed based on the Oochamon you pass in
     * For use with box/oochamon party menu systems, and after you catch an Oochamon.
     * @param {Number} ooch The oochamon to make an info embed for
     * @param {String} user_id The user ID who owns the Oochamon
     * @returns The Ooch Embed, as well as the file related to the Oochamon, in an array of the 2.
     */
    ooch_info_embed: function(ooch, user_id=false) {
        const { type_to_emote } = require('./func_battle');
        const { get_ooch_art } = require('./func_other');

        let ooch_title = `${ooch.nickname}`;
        ooch.nickname != ooch.name ? ooch_title += ` (${ooch.name}) [Lv. ${ooch.level}] ${ooch.type.map(v => TypeEmote[_.capitalize(v)]).join('')}` 
            : ooch_title += ` [Lv. ${ooch.level}] ${ooch.type.map(v => TypeEmote[_.capitalize(v)]).join('')}`;
        let moveset_str = ``;
        let ooch_data = db.monster_data.get(ooch.id);
        let user_data = false;
        if (user_id) {
            user_data = db.profile.get(user_id);
        }

        let expBar = progressbar.filledBar(ooch.next_lvl_exp, ooch.current_exp, 15, '▱', '▰')[0];

        let infoEmbed = new EmbedBuilder()
            .setColor('#808080')
            .setTitle(ooch_title)
            .setThumbnail(`attachment://${_.toLower(ooch.name)}.png`)
            .setDescription(`HP: **${ooch.current_hp}/${ooch.stats.hp}**\nAbility: **${db.ability_data.get(ooch.ability, 'name')}**\nType: **${ooch.type.map(v => _.capitalize(v)).join(' | ')}**`);

        for (let move_id of ooch.moveset) {
            let move = db.move_data.get(move_id)
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

        let tame_status = ooch.tame_value;
        if (_.inRange(tame_status, 0, 40)){
            tame_status = TameStatus.Hostile;
        } else if (_.inRange(tame_status, 41, 80)) {
            tame_status = TameStatus.Angry;
        } else if (_.inRange(tame_status, 81, 120)) {
            tame_status = TameStatus.Neutral;
        } else if (_.inRange(tame_status, 121, 160)) {
            tame_status = TameStatus.Happy;
        } else if (_.inRange(tame_status, 161, 199)) {
            tame_status = TameStatus.Loyal;
        } else if (ooch.tame_value >= 200) {
            tame_status = TameStatus.BestFriend;
        }

        infoEmbed.addFields([{ name: 'Moveset', value: moveset_str, inline: true }]);
        infoEmbed.addFields([{ name: 'Stats', value: `HP: **${ooch.stats.hp}** (${functions.get_iv_stars(iv_hp)})` + 
            `\nATK: **${ooch.stats.atk}** (${functions.get_iv_stars(iv_atk)})\nDEF: **${ooch.stats.def}** (${functions.get_iv_stars(iv_def)})` + 
            `\nSPD: **${ooch.stats.spd}** (${functions.get_iv_stars(iv_spd)})`, inline: true }]);
        if (ooch.level != 50) {
            infoEmbed.addFields([{ name: `EXP (${ooch.current_exp}/${ooch.next_lvl_exp}):`, value: `${expBar}` }]);
        }

        infoEmbed.addFields([{ name: `Taming Status:`, value: `${tame_status}` }]);

        if (ooch_data.evo_id != -1 && ooch_data.evo_lvl != -1 && user_id != false) {
            oochadex_check = db.profile.get(interaction.user.id, `oochadex[${i}]`);
            if (oochadex_check == undefined){
                oochadex_check = { caught: 0 }
            } 
            infoEmbed.setFooter({ text: `Evolves into ${oochadex_check.caught != 0 ? db.monster_data.get(ooch_data.evo_id, 'name') : `???`} at level ${ooch_data.evo_lvl}`, iconURL: db.monster_data.get(ooch_data.evo_id, 'image') });
        }

        return [infoEmbed, get_ooch_art(ooch.name)];
    },
    
    /**
     * Returns true or false based on a percent chance out of 100.
     * @param {Number} percent Percent chance to return true.
     */
    check_chance: function(percent) {
        return Math.random() <= percent / 100;
    },

    /**
     * Returns the emote text for a specified Oochamon.
     * @param {Collection} applicationEmojis The collection of emojis
     * @param {String} ooch_name Name of the Oochamon to get emote from.
     */
    get_emote_string: function(applicationEmojis, ooch_name) {
        emojiList = applicationEmojis.filter(v => v.name === _.toLower(ooch_name));
        emojiList = Array.from(emojiList.values());
        if (emojiList.length === 0) throw Error(`Unable to find Oochamon emote for the name ${ooch_name}!`);
        return `<:${emojiList[0].name}:${emojiList[0].id}>`;
    },

    /**
     * Returns the bigger sized art of the Oochamon from its name.
     * @param {String} ooch_name Name of the Oochamon to get emote from.
     * @returns The attachment file object.
     */
    get_ooch_art: function(ooch_name) {
        let file_name = `./Art/ResizedArt/${_.replace(_.toLower(ooch_name), RegExp(" ", "g"), "_")}.png`
        let file = new AttachmentBuilder(file_name);
        
        return file;
    },

    /**
     * Creates and returns an attachment file object for a file path.
     * @param {String} path File path for the art
     * @returns The attachment file object.
     */
    get_art_file: function(path) {
        let file = new AttachmentBuilder(path);
        return file;
    },

    /**
     * Creates and returns a bonus star emote string for IVs.
     * @param {Number} iv The IV number to turn into stars
     * @returns The star emote string.
     */
    get_iv_stars: function(iv) {
        const star_empty = "<:star_empty:1346318267324825651>";
        const star_half = "<:star_half:1346318282562605086>";
        const star_full = "<:star_full:1346318298660343990>";
    
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
    },

    /**
     * Change an Oochamon's tame value
     * @param {Object} ooch 
     * @param {Number} tame_value 
     * @returns The oochamon being edited
     */
    update_tame_value: async function(ooch, tame_value) {
        if (ooch.tame_value < 200) {
            ooch.tame_value = _.clamp(ooch.tame_value + tame_value, 0, 200);
            if (ooch.tame_value == 200) {
                ooch.stats.hp_iv = _.clamp(ooch.stats.hp_iv + 1, 0, 10);
                ooch.stats.atk_iv = _.clamp(ooch.stats.atk_iv + 1, 0, 10);
                ooch.stats.def_iv = _.clamp(ooch.stats.def_iv + 1, 0, 10);
                ooch.stats.spd_iv = _.clamp(ooch.stats.spd_iv + 1, 0, 10);
            }
        }
        return ooch;
    },

    formatStatBar: function(stat) {
        return `${stat > 0 ? '▲' : '▼'}`.repeat(Math.abs(stat)) + '○'.repeat(8 - Math.abs(stat));
    },

    reset_oochamon: async function(user_id) {
        // Setup user data
        let profile = get_blank_profile();
        db.profile.set(user_id, profile);
        //TO DO, once we confirm this works, replace the below db.profile.set lines

        db.profile.set(user_id, 'c_000', 'player_sprite');
        db.profile.set(user_id, [], 'ooch_pc')
        db.profile.set(user_id, 0, 'ooch_active_slot')
        db.profile.set(user_id, {}, 'other_inv')
        db.profile.set(user_id, {}, 'prism_inv')
        db.profile.set(user_id, {}, 'heal_inv')
        db.profile.set(user_id, 0, 'oochabux')
        db.profile.set(user_id, 0, 'repel_steps')
        await db.profile.set(user_id, PlayerState.Intro, 'player_state')
        db.profile.set(user_id, {}, 'ooch_enemy')
        db.profile.set(user_id, false, 'location_data')
        db.profile.set(user_id, false, 'checkpoint_data');
        db.profile.set(user_id, false, 'display_msg_id');
        db.profile.set(user_id, false, 'play_thread_id');
        db.profile.set(user_id, false, 'play_guild_id');
        db.profile.set(user_id, 0, 'battle_msg_counter');
        db.profile.set(user_id, 0, 'battle_turn_counter');
        db.profile.set(user_id, 0, 'turn_msg_counter');
        db.profile.set(user_id, [], 'oochadex');
        db.profile.set(user_id, [], 'flags');
        db.profile.set(user_id, [], 'ooch_party');
        db.profile.set(user_id, [Item.Potion, Item.Prism], 'global_shop_items');
        db.profile.set(user_id, [], 'friends_list');
        db.profile.set(user_id, 1, 'move_speed');
        db.profile.set(user_id, 'Talk to the professor.', 'objective');
        db.profile.set(user_id, false, 'cur_event_name');
        
        // These values are used because when we enter a battle, we have to drop the event loop to handle the battle.
        // With these values, we can keep track of our event data position, and the event data related to the NPC that is being battled.
        db.profile.set(user_id, [], 'cur_event_array'); 
        db.profile.set(user_id, 0, 'cur_event_pos');
        db.profile.set(user_id, false, 'cur_battle_id');
        
        // Settings
        db.profile.set(user_id, {
            controls_msg: false,
            battle_cleanup: true,
            zoom: '9_7',
            battle_speed: 2500,
            discord_move_buttons: true,
            objective: true,
        }, 'settings');

        

        // Setup Oochadex template
        for (ooch_id in db.monster_data.keyArray()) {
            db.profile.push(user_id, { id: ooch_id, caught: 0 }, 'oochadex')
        }
    },

    quit_oochamon: async function(thread, user_id, client) {

        const { finish_battle } = require('./func_battle.js');

        let curBattleId = db.profile.get(user_id, 'cur_battle_id');
        if (curBattleId != false && curBattleId != undefined && curBattleId != null && db.battle_data.has(curBattleId)) {
            
            let battleData = db.battle_data.get(curBattleId);
            await db.battle_data.delete(`${curBattleId}`);

            for (let user of battleData.users) {
                db.profile.set(user.user_id, 0, 'cur_event_pos');
                db.profile.set(user.user_id, false, 'cur_battle_id');
                let userThread = client.channels.cache.get(user.thread_id);

                if (user.is_player) {
                    await finish_battle(battleData, user.user_index, true);
                    await move(userThread, user.user_id, '', 1);
                }
            } 
        } 

        await thread.bulkDelete(5);
        await thread.members.remove(user_id);
        await thread.leave();
        await thread.setLocked(true);
        await thread.setArchived(true);
        await db.profile.set(user_id, PlayerState.NotPlaying, 'player_state');
    }

}

module.exports = functions;