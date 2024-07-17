// For functions that don't fit into the other categories
const db = require("./db")
const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { TypeEmote } = require('./types.js');
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
        ooch.nickname != ooch.name ? ooch_title += ` (${ooch.name}) [Lv. ${ooch.level}] ${TypeEmote[_.capitalize(ooch.type)]}` 
            : ooch_title += ` [Lv. ${ooch.level}] ${TypeEmote[_.capitalize(ooch.type)]}`;
        let moveset_str = ``;

        let expBar = progressbar.filledBar(ooch.next_lvl_exp, ooch.current_exp, 12, '▱', '▰')[0];

        let infoEmbed = new EmbedBuilder()
            .setColor('#808080')
            .setTitle(ooch_title)
            .setThumbnail(`attachment://${_.toLower(ooch.name)}.png`)
            .setDescription(`HP: **${ooch.current_hp}/${ooch.stats.hp}**\nAbility: **${db.ability_data.get(ooch.ability, 'name')}**\nType: **${_.capitalize(ooch.type)}**`);

        for (let move_id of ooch.moveset) {
            let move = db.move_data.get(move_id)
            moveset_str += `${type_to_emote(move.type)} **${move.name}**: **${move.damage}** dmg, **${move.accuracy}%** chance to hit\n`;
        }

        infoEmbed.addFields([{ name: 'Moveset', value: moveset_str, inline: true }]);
        infoEmbed.addFields([{ name: 'Stats', value: `HP: **${ooch.stats.hp}**\nATK: **${ooch.stats.atk}**\nDEF: **${ooch.stats.def}**\nSPD: **${ooch.stats.spd}**`, inline: true }]);
        infoEmbed.addFields([{ name: `EXP (${ooch.current_exp}/${ooch.next_lvl_exp}):`, value: `${expBar}` }]);

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
     * @param {Object} client Discord bot client.
     * @param {String} ooch_name Name of the Oochamon to get emote from.
     */
    get_emote_string: function(client, ooch_name) {
        let emojiList = client.emojis.cache;
        emojiList = emojiList.filter(v => v.name === _.toLower(ooch_name));
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
    }

}