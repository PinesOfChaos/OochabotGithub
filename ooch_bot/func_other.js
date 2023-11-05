// For functions that don't fit into the other categories
const db = require("./db")
const { EmbedBuilder } = require('discord.js');
const { TypeEmote } = require('./types.js');
const _ = require('lodash');

module.exports = {
    /**
     * Creates and returns an info embed based on the Oochamon you pass in
     * For use with box/oochamon party menu systems, and after you catch an Oochamon.
     * @param {Number} ooch The oochamon to make an info embed for
     */
    ooch_info_embed: function(ooch) {
        const { type_to_emote } = require('./func_battle');
        let ooch_gen_data = db.monster_data.get(ooch.id); // General Oochamon Data

        let ooch_title = `${ooch.nickname}`;
        ooch.nickname != ooch.name ? ooch_title += ` (${ooch.name}) [Lv. ${ooch.level}] ${TypeEmote[_.capitalize(ooch.type)]}` 
            : ooch_title += ` [Lv. ${ooch.level}] ${TypeEmote[_.capitalize(ooch.type)]}`;
        let moveset_str = ``;

        let infoEmbed = new EmbedBuilder()
            .setColor('#808080')
            .setTitle(ooch_title)
            .setThumbnail(ooch_gen_data.image)
            .setDescription(`Ability: **${ooch.ability}**\nType: **${_.capitalize(ooch.type)}**`);

        for (let move_id of ooch.moveset) {
            let move = db.move_data.get(move_id)
            moveset_str += `${type_to_emote(move.type)} **${move.name}**: **${move.damage}** dmg, **${move.accuracy}%** chance to hit\n`;
        }

        infoEmbed.addFields([{ name: 'Moveset', value: moveset_str, inline: true }]);
        infoEmbed.addFields([{ name: 'Stats', value: `HP: **${ooch.stats.hp}**\nATK: **${ooch.stats.atk}**\nDEF: **${ooch.stats.def}**\nSPD: **${ooch.stats.spd}**`, inline: true }]);

        return infoEmbed;
    },
    
    /**
     * Returns true or false based on a percent chance out of 100.
     * @param {Number} percent Percent chance to return true.
     */
    check_chance: function(percent) {
        return Math.random() <= percent / 100;
    }


}