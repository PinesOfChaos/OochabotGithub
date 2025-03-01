const { SlashCommandBuilder } = require('discord.js');
const { genmap_theme, genmap_layout, genmap_new } = require("../func_level_gen.js");
const { GenmapTheme } = require("../types.js");
const fs = require('fs');

module.exports = {
    data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Pong!'),
    async execute(interaction) {
        let level_name = "Everchange Cave";
        let level_filename = './Maps/' + level_name.toLowerCase().replaceAll(' ', '_') + '.json'
        let new_level = genmap_new(level_name, 64, 64, genmap_theme(GenmapTheme.ObsidianPath), 15, 20, 'lava_path', 3, 52);
        fs.writeFile(level_filename, JSON.stringify(new_level, null, "\t"), (err) => { if (err) throw err; });
        
        interaction.reply(`**Map ${level_name} created at:** ${level_filename}`);

        
    },
};
