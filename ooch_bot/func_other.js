// For functions that don't fit into the other categories
const db = require("./db")
const { EmbedBuilder, AttachmentBuilder, Collection } = require('discord.js');
const { TypeEmote, PlayerState, Item } = require('./types.js');
const _ = require('lodash');
const progressbar = require('string-progressbar');

module.exports = {
    /**
     * Creates and returns an info embed based on the Oochamon you pass in
     * For use with box/oochamon party menu systems, and after you catch an Oochamon.
     * @param {Number} ooch The oochamon to make an info embed for
     * @returns The Ooch Embed, as well as the file related to the Oochamon, in an array of the 2.
     */
    ooch_info_embed: function(ooch) {
        const { type_to_emote } = require('./func_battle');
        const { get_ooch_art } = require('./func_other');

        let ooch_title = `${ooch.nickname}`;
        ooch.nickname != ooch.name ? ooch_title += ` (${ooch.name}) [Lv. ${ooch.level}] ${ooch.type.map(v => TypeEmote[_.capitalize(v)]).join('')}` 
            : ooch_title += ` [Lv. ${ooch.level}] ${ooch.type.map(v => TypeEmote[_.capitalize(v)]).join('')}`;
        let moveset_str = ``;

        let expBar = progressbar.filledBar(ooch.next_lvl_exp, ooch.current_exp, 15, '▱', '▰')[0];

        let infoEmbed = new EmbedBuilder()
            .setColor('#808080')
            .setTitle(ooch_title)
            .setThumbnail(`attachment://${_.toLower(ooch.name)}.png`)
            .setDescription(`HP: **${ooch.current_hp}/${ooch.stats.hp}**\nAbility: **${db.ability_data.get(ooch.ability, 'name')}**\nType: **${ooch.type.map(v => _.capitalize(v)).join(' | ')}**`);

        for (let move_id of ooch.moveset) {
            let move = db.move_data.get(move_id)
            move.accuracy = Math.abs(move.accuracy);
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
        infoEmbed.addFields([{ name: 'Moveset', value: moveset_str, inline: true }]);
        infoEmbed.addFields([{ name: 'Stats', value: `HP: **${ooch.stats.hp}** \`(Bonus: ${iv_hp})\`\nATK: **${ooch.stats.atk}** \`(Bonus: ${iv_atk})\`\nDEF: **${ooch.stats.def}** \`(Bonus: ${iv_def})\`\nSPD: **${ooch.stats.spd}** \`(Bonus: ${iv_spd})\``, inline: true }]);
        if (ooch.level == 50) {
            infoEmbed.addFields([{ name: `EXP (${ooch.current_exp}/${ooch.next_lvl_exp}):`, value: `${expBar}` }]);
        }

        let oochData = db.monster_data.get(ooch.id);
        if (oochData.evo_id != -1 && oochData.evo_lvl != -1) {
            infoEmbed.setFooter({ text: `Evolves into ??? at level ${oochData.evo_lvl}` });
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
        let file = new AttachmentBuilder(`./Art/ResizedArt/${_.toLower(ooch_name)}.png`);
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

    reset_oochamon: async function(user_id) {
        // Setup user data
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
        db.profile.set(user_id, false, 'rollback_profile');
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
            db.profile.push(user_id, { id: ooch_id, seen: 0, caught: 0 }, 'oochadex')
        }
    }

}