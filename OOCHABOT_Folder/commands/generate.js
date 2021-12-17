const { SlashCommandBuilder } = require('@discordjs/builders');
const Discord = require('discord.js');
const { create_monster } = require('../func');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('generate')
        .setDescription('Generates the monsters data in the game'),
    async execute(interaction) {

        if (interaction.user.id != '122568101995872256' && interaction.user.id != '145342159724347393') {
            return interaction.reply('This command isn\'t for you!')
        }
        //ID, Emote, Name, Description, Type, HP, ATK, DEF, SPD, Move List, Abilities, Evolution ID
        // Sporbee
        create_monster('0', '<:sporbee:921141752029646938>', 'Sporbee',
        'An insect that dwells in fungal forests. Every day it risks infection to provide for its hive.', 'fungal', 8, 12, 8, 12, //total 40
        [ [0, 'Bash'] ], [ 'Miniscule', 'Icky' ],  1, 16)

        //Stingrowth
        create_monster('1', '<:stingrowth:921147233750110298>', 'Stingrowth',
        'A strange protrusion is growing on this hive soldier, slowly gaining control over its movements.', 'fungal', 15, 20, 11, 14, //total 60
        [ [0, 'Bash'] ], [ 'Burdened', 'Icky' ],  2, 32)

        //Queenect
        create_monster('2', '<:queenect:921150332376076288>', 'Queenect',
        'A hive queen, completely overtaken by fungus. It continues to produce infected offspring even in this state.', 'fungal', 25, 25, 16, 14, //total 80
        [ [0, 'Bash'] ], [ 'Burdened', 'Broodmother' ],  -1, -1)

        // Roocky
        create_monster('3', '<:roocky:921156272512974868>', 'Roocky', 
        'A ancient, crumbling pillar. The shadows beneath it are oddly comforting.', 'stone', 12, 8, 12, 8, //total 40
        [ [0, 'Bash'] ], [ 'Sturdy', 'Shadow' ], 4, 16)

        //Graknight
        create_monster('4', '<:graknight:921158515995848736>', 'Graknight', 
        'The stones have continued deteriorating revealing a gremlin-like form, it weilds fragments of its former body as a spear.', 'stone', 18, 15, 15, 12, //total 60
        [ [0, 'Bash'] ], [ 'Withering', 'Shadow' ], 5, 32)

        //Diamount
         create_monster('5', '<:diamount:921160903230095392>', 'Diamount', 
         'Its body continues to wither away, freeing the shadows inside. The diamond eye in its center is its sole source of power.', 'stone', 22, 18, 22, 18, //total 80
         [ [0, 'Bash'] ], [ 'Withering', 'Darkbright'], -1, -1)

        //Puppyre
        create_monster('6', '<:puppyre:921176686102454282>', 'Puppyre',
        'A very good boy, empowered by the spiraling patterns on its body.', 'flame', 10, 12, 8, 10, //total 40
        [ [0, 'Bash'] ], [ 'Gentle', 'Warm' ], 7, 16)

        //Dogglow
        create_monster('7', '<:dogglow:921179530402603069>', 'Dogglow',
        'The etchings empowering its body have become corrupted, its flame now glows a sickly yellow.', 'flame', 13, 18, 14, 15, //total 60
        [ [0, 'Bash'] ], [ 'Gentle', 'Radiant' ], 8, 32)

        //Hounuke
        create_monster('8', '<:hounuke:921182808804847686>', 'Hounuke',
        'Its body now radiates an eerie green, the once-pure etchings now shimmer and contort on its oozing skin.', 'flame', 15, 22, 13, 20, //total 80
        [ [0, 'Bash'] ], [ 'Conflicted', 'Radiant' ], -1, -1)

        interaction.reply('Generated monster data.');
    },
};

