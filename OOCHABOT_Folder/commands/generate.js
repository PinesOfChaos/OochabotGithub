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
        'Its body now radiates an eerie green, the once-pure etchings now shimmer and contort on its oozing skin.', 'flame', 16, 26, 18, 20, //total 80
        [ [0, 'Bash'] ], [ 'Conflicted', 'Radiant' ], -1, -1)

        //Glither
        create_monster('9', '<:glither:921444285264584814>', 'Glither',
        'Its diamond-hard skin protects it from the most brutal of sandstorms.', 'stone', 15, 9, 14, 12, //total 50
        [ [0, 'Bash'] ], [ 'Tough', 'Reactive' ], 10, 18)

        //Sparafura
        create_monster('10', '<:sparafura:921444285063258113>', 'Sparafura',
        'These dangerous serpents are found beneath the desert sands. Their crushing bite shatters bone with ease.', 'stone', 18, 25, 16, 11, //total 70
        [ [0, 'Bash'] ], [ 'Burrower', 'Reactive' ], -1, -1)
        
        //Constone
        create_monster('11', '<:constone:921452962608472084>', 'Constone',
        'Found on salt flats, these strange beings move about on a single wheel rather than legs.', 'stone', 10, 10, 10, 20, //total 50
        [ [0, 'Bash'] ], [ 'Inertia', 'Dense' ], 12, 25)

        //Amephyst
        create_monster('12', '<:amephyst:921452962549735524>', 'Amephyst',
        'The crystals that make up the core of its body have overtaken its left arm, creating a dangerous weapon.', 'stone', 15, 20, 15, 30, //total 80
        [ [0, 'Bash'] ], [ 'Inertia', 'Dense' ], -1, -1)

        //Widew
        create_monster('13', '<:widew:921460528247894066>', 'Widew',
        'The growth on its back forms a symbyotic relationship with the host, maximizing the amount of nutrients each can absorb.', 'fungal', 14, 10, 9, 12, //total 35
        [ [0, 'Bash'] ], [ 'Moist', 'Miniscule' ], 14, 12)

        //Tarotula
        create_monster('14', '<:tarotula:921460528306618438>', 'Tarotula',
        'The fine hairs on its back help it detect nearby movement making ambushing this giant spider surprisingly difficult.', 'fungal', 21, 17, 12, 15, //total 65
        [ [0, 'Bash'] ], [ 'Moist', 'Alert' ], -1, -1)

        //Moldot
        create_monster('15', '<:moldot:921464022182797392>', 'Moldot',
        'Novice explorers are often shocked by just how much of this creature is buried beneath the surface.', 'fungal', 5, 5, 25, 5, //total 40
        [ [0, 'Bash'] ], [ 'Gentle', 'Burrower' ], 16, 30)

        //Moldire
        create_monster('16', '<:moldire:921464022115700857>', 'Moldire',
        'Its body is no longer able to fully fit in the crevice it grew up in, forcing its body to grow a defensive maw.', 'fungal', 25, 25, 30, 5, //total 85
        [ [0, 'Bash'] ], [ 'Gentle', 'Reactive' ], -1, -1)

        //Charlite
        create_monster('17', '<:charlite:921472869630885938>', 'Charlite',
        'Its life is tied to whatever it is currently burning, these creatures live a frail, fleeting life.', 'flame', 5, 15, 5, 10, //total 35
        [ [0, 'Bash'] ], [ 'Fleeting', 'Warm' ], 18, 15)

        //Darcoal
        create_monster('18', '<:darcoal:921472869643456532>', 'Darcoal',
        'This flame has lived a surprisingly long life. It slowly burns its surroundings, covering the area in a thick black smoke.', 'flame', 15, 35, 13, 12, //total 75
        [ [0, 'Bash'] ], [ 'Efficient', 'Warm' ], -1, -1)

        //Torchoir
        create_monster('19', '<:torchoir:921480638178136065>', 'Torchoir',
        'A sentient torch that hums a haunting tune. Its song fills people with dread.', 'flame', 12, 13, 11, 9, //total 45
        [ [0, 'Bash'] ], [ 'Boisterous', 'Choir' ], 20, 28)

        //Chantern
        create_monster('19', '<:chantern:921480638543036436>', 'Chantern',
        'It can mimic the human voice nearly perfectly, though it only speaks in random phrases.', 'flame', 21, 20, 24, 15, //total 80
        [ [0, 'Bash'] ], [ 'Boisterous', 'Haunted' ], -1, -1)

        //Eluslug
        create_monster('19', '<:eluslug:921483721197105162>', 'Eluslug',
        'Oddly malleable despite its metallic body, it feeds on the magnetic wandering stones found in various locations.', 'tech', 11, 12, 12, 14, //total 50
        [ [0, 'Bash'] ], [ 'Leech', 'Icky' ], -1, -1)

        interaction.reply('Generated monster data.');
    },
};

