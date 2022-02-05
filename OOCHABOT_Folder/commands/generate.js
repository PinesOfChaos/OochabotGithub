const { SlashCommandBuilder } = require('@discordjs/builders');
const Discord = require('discord.js');
const { create_monster, create_move, create_item, create_ability } = require('../func_create');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('generate')
        .setDescription('Generates the game data.'),
    async execute(interaction) {

        if (interaction.user.id != '122568101995872256' && interaction.user.id != '145342159724347393') {
            return interaction.reply('This command isn\'t for you!')
        }

        //#region Item Data

        //          ID   Name             Emote                                       Category     Type      Value   Description
        create_item('0', 'Potion',        '<:item_potion:926592477631221790>',        'heal_inv',  'potion', 0.25,   'Used to quickly heal 25% of an Oochamon\'s HP')
        create_item('1', 'Hi-Potion',     '<:item_potion_hi:926592477698326538>',     'heal_inv',  'potion', 0.5,    'An advanced potion which heals 50% of an Oochamon\'s HP')
        create_item('2', 'Max-Potion',    '<:item_potion_magic:926592681407303700>',  'heal_inv',  'potion', 1,      'The ultimate potion which heals 100% of an Oochamon\'s HP')
        create_item('3', 'Prism',         '<:item_prism:921502013634777149>',         'prism_inv', 'prism',  1,      'A device used to capture Oochamon.')
        create_item('4', 'Greater Prism', '<:item_prism_greater:926582245333032960>', 'prism_inv', 'prism',  1.5,    'An improved prism with a higher capture rate.')
        create_item('5', 'Grand Prism',   '<:item_prism_grand:926582245051990019>',   'prism_inv', 'prism',  2,      'A further modified prism with an even higher capture rate.')
        create_item('6', 'Perfect Prism', '<:item_prism_perfect:926582245060378695>', 'prism_inv', 'prism',  1000,   'A prism with a shattered casing, nothing escapes its pull.')
        create_item('7', 'Attack Crystal','<:item_attack_crystal:926596503802372186>','other_inv', 'misc',   1,      'Unlocks a hidden move for an Oochamon by releasing stored power.')
        

        //#endregion

        //#region Move Data

        //          ID, NAME,            TYPE,  DMG,ACCURACY, EFF,EFF_CHANCE,     DESCRIPTION
        create_move('0','Hit',           'neutral',10,100,   -1,0,           'The user hits the target to deal damage.')
        create_move('1','Bash',          'neutral',20,100,   -1,0,           'The target is dealt some blunt damage.')
        create_move('2','Spore Shot',    'fungal',30,100,    -1,0,           'A puff of spore burst from the user\'s body.')
        create_move('3','Pebble Blast',  'stone',30,100,     -1,0,           'Fires a barrage of small pebbles.')
        create_move('4','Fireball',      'flame',30,100,     -1,0,           'Shoots a ball of fire at the target.')
        create_move('5','Slash',         'neutral',50,95,    -1,0,           'The user slashes at the target with sharp appendages.')
        create_move('6','Take Over',     'fungal',35,90,     'infected',100, 'Fungal spores are launched which INFECT the target.')
        create_move('7','Dust Storm',    'stone',30,90,      'blinded',100,  'A storm is whipped up which leaves the target BLINDED.')
        create_move('8','Engulf',        'flame',40,90,      'burned',100,   'The target is BURNED by red-hot flames.')
        create_move('9','Impale',        'neutral',80,100,   -1,0,           'Impales the target with a spike.')
        create_move('10','Bloom',        'fungal',70,90,     -1,0,           'Explosive spores are launched at the target to deal damage.')
        create_move('11','Boulderdash',  'stone',70,90,      -1,0,           'Flings a massive boulder at the target.')
        create_move('12','Torch',        'flame',70,90,      -1,0,           'The user hits the target to deal damage')
        create_move('13','Blight',       'fungal',60,90,     'blinded',50,   'If the infection takes hold, the target is BLINDED.')
        create_move('14','Lava Lance',   'stone',65,95,      'burned',50,    'Red-hot stone is launched to BURN the target.')
        create_move('15','Tumorize',     'fire',50,95,       'infected',50,  'The user creates radiation in order to INFECT the target.')
        create_move('16','Glimmer',      'stone',20,90,      'blinded',100,  'Refracts light in an attempt to BLIND the target.')
        create_move('17','Gem Bash',     'stone',110,80,     -1,0,           'Crystallized stones are swung wildly to inflict damage.')
        create_move('18','Caustic Orb',  'ooze',60,100,      'burned',75,    'A ball of caustic goo is launched with a high chance of BURNING.')
        create_move('19','Pulverize',    'neutral',130,80,   -1,0,           'The target is slammed to deal massive damage.')
        create_move('20','Ash Blast',    'flame',50,95,      'blinded',75,   'Hot ashes are launched at the target with a high chance to BLIND.')
        create_move('21','Inferno',      'flame',100,70,     'burned',100,   'Anything caught by these wild flames is BURNED')
        create_move('22','Digitize',     'tech',50,100,      'digitized',100,'The target becomes DIGITIZED when hit by this strange beam.')
        create_move('23','Clamp Down',   'neutral',45,100,   'snared',30,    'Clamps down tight on the target to deal damage and SNARE them if you get lucky.')
        create_move('24','Magic Bolt',   'magic',30,100,     -1,0,           'Fires a bolt of magic energy.')
        create_move('25','Sparkler',     'flame',40,100,     'blinded',30,   'Shoots bright sparks with the potential to BLIND.')
        create_move('26','Arca Strike',  'magic',80,90,      -1,0,           'Fires a powerful burst of magic.')
        create_move('27','Call Thunder', 'magic',60,90,      'burned',50,    'Causes a great bolt of lightning to crash on the enemy, potentially BURNING them.')
        create_move('28','Sticky Orb',   'ooze',80,90,       'snared',60,    'Fling a orb of goo that can SNARE the target.')
        create_move('29','Glob',         'ooze',30,100,      -1,0,           'Pelts the target with a viscous ooze.')
        create_move('30','Blink',        'magic',10,100,     'doubled',100,  'Travels to a different time to damage the target again, DOUBLING the next damage they take.')
        create_move('31','Time Warp',    'magic',50,80,      'doubled',50,   'Attempts to DOUBLE the next damage the opponent takes by damaging them in the future.')
        create_move('32','Mycelium Whip','fungal',50,90,     'snared',50,    'Shoots whips made of mycelium in an attempt to SNARE the opponent.')
        create_move('33','Parasitize',   'ooze',30,100,      'infected',50,  'Parasitic bodies are launched at the target potentially INFECTING them.')
        create_move('34','Corrode',      'ooze',70,80,       'doubled',30,   'Powerful acids are weaken the targets defenses, potentially DOUBLING the next damage they take.')
        create_move('35','Grind',        'stone',80,90,      -1,0,           'Grinds against the opponent with rough, jagged edges.')
        create_move('36','Metal Lance',  'tech',70,90,       -1,0,           'Stabs the opponent with a metallic object.')
        create_move('37','Iron Hammer',  'tech',50,100,      -1,0,           'A heavy, metal object is hammered against the target.')
        create_move('38','Laminate',     'tech',30,90,       'snared',100,   'Covers the target in a tough plastic substance to SNARE them.')
        create_move('39','Entomb',       'stone',60,80,      'snared',50,    'Causes stones to fall onto the target, leaving them SNARED if they get trapped.')
        create_move('40','undefined_int','void',100,100,     -1,0,           'TEST MOVE')

        //#endregion


        //#region Ability Data

        //              NAME,           Description
        create_ability('Miniscule',     'So small that it reduces the chance to be hit by 10%.');
        create_ability('Icky',          'Boosts the power of OOZE & FUNGAL type attacks by 20%');
        create_ability('Burdened',      'A large growth reduces SPD by 10% but raises DEF by 15%');
        create_ability('Broodmother',   'Gains 5% ATK for each Oochamon in the same evolution line in the party.');
        create_ability('Tough',         'A durable body grants a 10% increase to DEF.');
        create_ability('Shadow',        'Grants a 25% chance to DISAPPEAR after being attacked.');
        create_ability('Withering',     'Loss of the body reduces HP by 5% each turn, but raises SPD by 20%');
        create_ability('Darkbright',    'Attacks that afflict BURN also BLIND and vice-versa.');
        create_ability('Gentle',        'A kind heart reduces both your ATK and the enemy ATK by 10%');
        create_ability('Warm',          'Increases the damage of FLAME attacks by 10%.');
        create_ability('Radiant',       'Dangerous energy causes attacks that BURN also INFECT.');
        create_ability('Conflicted',    'Multiple minds increase ALL stats by 5%.');
        create_ability('Burrower',      'Increases the damage of STONE attacks by 10%');
        create_ability('Reactive',      'When hit by an attack, reflects 5% of the attacker\'s HP as damage.');
        create_ability('Inertia',       'Increases SPD by 5% each turn.');
        create_ability('Dense',         'Attacks deal an extra 10% damage but reduces SPD by 10%');
        create_ability('Moist',         'Reduces FLAME damage by 50%.');
        create_ability('Alert',         'Increases ATK by 20% when an Oochamon switches in.');
        create_ability('Fleeting',      'Increases SPD and ATK by 50% but also loses 50% of HP each turn.');
        create_ability('Efficient',     'Increases ATK by 5% each turn.');
        create_ability('Boisterous',    'Shatters eardrums when it enters the field dealing 5% of the enemy\'s HP');
        create_ability('Haunted',       'Applies the DOOMED status to an enemy when the holder of the ability dies.');
        create_ability('Leech',         'Restores HP equal to 10% of damage done to the enemy.');
        create_ability('Ensnare',       'Grants a 30% chance to SNARE an enemy when attacking.');
        create_ability('Uncontrolled',  'Increases ATK by 30% but randomly chooses an attack each turn');
        create_ability('Apprentice',    'Increases an attack\'s damage by 20% if any other party members also know it.');
        create_ability('Focused',       'Increases ATK by 10% if unaffected by status effects.');
        create_ability('Ravenous',      'Whenever defeating an enemy, restore 20% HP.');
        create_ability('Immense',       'Increases DEF by 20% but also makes opponent\'s moves always hit.');
        create_ability('Armored',       'Reduces STONE damage by 20%.');
        create_ability('0000',          'FALSE'); //Increase the global counter for i's stats by 1 upon defeat

        //#endregion

        //#region Creature Data
        //ID, Emote, Name, Image, Description, Type, HP, ATK, DEF, SPD, Move List[[Lvl,ID]...], Abilities, Evolution ID, Evolution Level
        // Sporbee
        create_monster('0', '<:sporbee:921141752029646938>', 'Sporbee', 'https://cdn.discordapp.com/attachments/921949708971294750/921950169560387644/sporbee.png',
        'An insect that dwells in fungal forests. Every day it risks infection to provide for its hive.', 'fungal', 8, 12, 8, 12, //total 40
        [ [1,1],[3,2],[8,5],[13,6],[17,10],[27,13],[-1,18] ], [ 'Miniscule', 'Icky' ],  1, 16)

        //Stingrowth
        create_monster('1', '<:stingrowth:921147233750110298>', 'Stingrowth', 'https://cdn.discordapp.com/attachments/921949708971294750/921950181845532722/stingrowth.png',
        'A strange protrusion is growing on this hive soldier, slowly gaining control over its movements.', 'fungal', 15, 20, 11, 14, //total 60
        [ [1,1],[5,2],[9,5],[16,6],[20,10],[33,13],[-1,18] ], [ 'Burdened', 'Icky' ],  2, 32)

        //Queenect
        create_monster('2', '<:queenect:921150332376076288>', 'Queenect', 'https://cdn.discordapp.com/attachments/921949708971294750/921950201080610906/queenect.png',
        'A hive queen, completely overtaken by fungus. It continues to produce infected offspring even in this state.', 'fungal', 25, 25, 16, 14, //total 80
        [ [1,1],[6,2],[12,5],[20,6],[25,10],[36,13],[-1,18] ], [ 'Burdened', 'Broodmother' ],  -1, -1)

        // Roocky
        create_monster('3', '<:roocky:921156272512974868>', 'Roocky', 'https://cdn.discordapp.com/attachments/921949708971294750/921950312300957776/roock.png',
        'A ancient, crumbling pillar. The shadows beneath it are oddly comforting.', 'stone', 12, 8, 12, 8, //total 40
        [ [1,1],[3,3],[8,7],[13,7],[17,11],[27,14],[-1,20] ], [ 'Tough', 'Shadow' ], 4, 16)

        //Graknight
        create_monster('4', '<:graknight:921158515995848736>', 'Graknight', 'https://cdn.discordapp.com/attachments/921949708971294750/921950330516807731/graknight.png',
        'The stones have continued deteriorating revealing a gremlin-like form, it weilds fragments of its former body as a spear.', 'stone', 18, 15, 15, 12, //total 60
        [ [1,1],[5,3],[9,7],[16,7],[20,11],[33,14],[-1,20] ], [ 'Withering', 'Shadow' ], 5, 32)

        //Diamount
        create_monster('5', '<:diamount:921160903230095392>', 'Diamount', 'https://cdn.discordapp.com/attachments/921949708971294750/921950340826407022/diamount.png',
        'Its body continues to wither away, freeing the shadows inside. The diamond eye in its center is its sole source of power.', 'stone', 22, 18, 22, 18, //total 80
        [ [1,1],[6,3],[12,7],[20,7],[25,11],[36,14],[-1,20] ], [ 'Withering', 'Darkbright'], -1, -1)

        //Puppyre
        create_monster('6', '<:puppyre:921176686102454282>', 'Puppyre', 'https://cdn.discordapp.com/attachments/921949708971294750/921950375316172841/puppyre.png',
        'A very good boy, empowered by the spiraling patterns on its body.', 'flame', 10, 12, 8, 10, //total 40
        [ [1,1],[3,4],[8,8],[12,12],[17,23],[27,15],[-1,21] ], [ 'Gentle', 'Warm' ], 7, 16)

        //Dogglow
        create_monster('7', '<:dogglow:921179530402603069>', 'Dogglow', 'https://cdn.discordapp.com/attachments/921949708971294750/921950394492518432/dogglow.png',
        'The etchings empowering its body have become corrupted, its flame now glows a sickly yellow.', 'flame', 13, 18, 14, 15, //total 60
        [ [1,1],[5,4],[9,8],[16,12],[20,23],[33,15],[-1,21] ], [ 'Gentle', 'Radiant' ], 8, 32)

        //Hounuke
        create_monster('8', '<:hounuke:921182808804847686>', 'Hounuke', 'https://cdn.discordapp.com/attachments/921949708971294750/921950404923760700/hounuke.png',
        'Its body now radiates an eerie green, the once-pure etchings now shimmer and contort on its oozing skin.', 'flame', 16, 26, 18, 20, //total 80
        [ [1,1],[6,4],[12,8],[20,12],[25,23],[36,15],[-1,21] ], [ 'Conflicted', 'Radiant' ], -1, -1)

        //Glither
        create_monster('9', '<:glither:921444285264584814>', 'Glither', 'https://cdn.discordapp.com/attachments/921949708971294750/921950503754141786/glither.png',
        'Its diamond-hard skin protects it from the most brutal of sandstorms.', 'stone', 15, 9, 14, 12, //total 50
        [ [1,1],[3,3],[8,5],[13,7],[21,9],[27,16],[34,39],[-1,17] ], [ 'Tough', 'Reactive' ], 10, 18)

        //Sparafura
        create_monster('10', '<:sparafura:921444285063258113>', 'Sparafura', 'https://cdn.discordapp.com/attachments/921949708971294750/921950515410112553/sparafuna.png',
        'These dangerous serpents are found beneath the desert sands. Their crushing bite shatters bone with ease.', 'stone', 18, 25, 16, 11, //total 70
        [ [1,1],[4,3],[12,5],[18,7],[25,9],[31,16],[40,39],[-1,17] ], [ 'Burrower', 'Reactive' ], -1, -1)
        
        //Constone
        create_monster('11', '<:constone:921452962608472084>', 'Constone', 'https://cdn.discordapp.com/attachments/921949708971294750/921950553695715388/constone.png',
        'Found on salt flats, these strange beings move about on a single wheel rather than legs.', 'stone', 10, 10, 10, 20, //total 50
        [ [1,0],[4,3],[7,24],[18,11],[26,35],[-1,26] ], [ 'Inertia', 'Dense' ], 12, 25)

        //Amephyst
        create_monster('12', '<:amephyst:921452962549735524>', 'Amephyst', 'https://cdn.discordapp.com/attachments/921949708971294750/921950566777757736/amephyst.png',
        'The crystals that make up the core of its body have overtaken its left arm, creating a dangerous weapon.', 'stone', 15, 20, 15, 30, //total 80
        [ [1,1],[5,3],[8,24],[21,11],[30,35],[33,17],[-1,26] ], [ 'Inertia', 'Dense' ], -1, -1)

        //Widew
        create_monster('13', '<:widew:921460528247894066>', 'Widew', 'https://cdn.discordapp.com/attachments/921949708971294750/921950600042790942/widew.png',
        'The growth on its back forms a symbyotic relationship with the host, maximizing the amount of nutrients each can absorb.', 'fungal', 14, 10, 9, 12, //total 35
        [ [1,0],[3,2],[7,9],[11,28],[-1,16] ], [ 'Moist', 'Miniscule' ], 14, 12)

        //Tarotula
        create_monster('14', '<:tarotula:921460528306618438>', 'Tarotula', 'https://cdn.discordapp.com/attachments/921949708971294750/921950611686191124/tarotula.png',
        'The fine hairs on its back help it detect nearby movement making ambushing this giant spider surprisingly difficult.', 'fungal', 21, 17, 12, 15, //total 65
        [ [1,0],[4,2],[8,9],[13,28],[18,6],[24,10],[32,13],[-1,16] ], [ 'Moist', 'Alert' ], -1, -1)

        //Moldot
        create_monster('15', '<:moldot:921464022182797392>', 'Moldot', 'https://cdn.discordapp.com/attachments/921949708971294750/921950639355994172/moldot.png',
        'Novice explorers are often shocked by just how much of this creature is buried beneath the surface.', 'fungal', 5, 5, 25, 5, //total 40
        [ [1,1],[5,2],[12,6],[17,23],[24,19],[40,13],[-1,39] ], [ 'Gentle', 'Burrower' ], 16, 30)

        //Moldire
        create_monster('16', '<:moldire:921464022115700857>', 'Moldire', 'https://cdn.discordapp.com/attachments/921949708971294750/921950651049734144/moldire.png',
        'Its body is no longer able to fully fit in the crevice it grew up in, forcing its body to grow a defensive maw.', 'fungal', 25, 25, 30, 5, //total 85
        [ [1,1],[7,2],[14,6],[20,23],[32,19],[40,34],[50,13],[-1,39] ], [ 'Gentle', 'Reactive' ], -1, -1)

        //Charlite
        create_monster('17', '<:charlite:921472869630885938>', 'Charlite', 'https://cdn.discordapp.com/attachments/921949708971294750/921950791105908766/charlite.png',
        'Its life is tied to whatever it is currently burning, these creatures live a frail, fleeting life.', 'flame', 5, 15, 5, 10, //total 35
        [ [1,0],[4,4],[10,7],[16,25],[22,8],[27,20],[37,12],[-1,21] ], [ 'Fleeting', 'Warm' ], 18, 15)

        //Darcoal
        create_monster('18', '<:darcoal:921472869643456532>', 'Darcoal', 'https://cdn.discordapp.com/attachments/921949708971294750/921950803445579776/darcoal.png',
        'This flame has lived a surprisingly long life. It slowly burns its surroundings, covering the area in a thick black smoke.', 'flame', 15, 35, 13, 12, //total 75
        [ [1,0],[6,4],[12,7],[18,25],[24,8],[30,20],[40,12],[-1,21] ], [ 'Efficient', 'Warm' ], -1, -1)

        //Torchoir
        create_monster('19', '<:torchoir:921480638178136065>', 'Torchoir', 'https://cdn.discordapp.com/attachments/921949708971294750/921950825977364510/tochoir.png',
        'A sentient torch that hums a haunting tune. Its song fills people with dread.', 'flame', 12, 13, 11, 9, //total 45
        [ [1,1],[3,4],[7,9],[12,24],[17,12],[21,23],[27,30],[-1,26] ], [ 'Boisterous', 'Haunted' ], 20, 28)

        //Chantern
        create_monster('20', '<:chantern:921480638543036436>', 'Chantern', 'https://cdn.discordapp.com/attachments/921949708971294750/921950839004880896/chantern.png',
        'It can mimic the human voice nearly perfectly, though it only speaks in random phrases.', 'flame', 21, 20, 24, 15, //total 80
        [ [1,1],[5,4],[8,9],[13,24],[19,12],[25,23],[32,30],[-1,26] ], [ 'Boisterous', 'Haunted' ], -1, -1)

        //Eluslug
        create_monster('21', '<:eluslug:921483721197105162>', 'Eluslug', 'https://cdn.discordapp.com/attachments/921949708971294750/921950857396912138/eluslug.png',
        'Oddly malleable despite its metallic body, it feeds on the magnetic wandering stones found in various locations.', 'tech', 11, 12, 12, 14, //total 50
        [ [1,1],[10,22],[-1,38] ], [ 'Leech', 'Icky' ], -1, -1)

        //Jellime
        create_monster('22', '<:jellime:921979911382654997>', 'Jelime', 'https://cdn.discordapp.com/attachments/921949708971294750/921987464854401044/jellime.png',
        'A jellyfish-like creature, its probing tendrils ensnare whatever they touch.', 'ooze', 14, 10, 16, 10, //total 50
        [ [1,1],[3,29],[7,24],[11,23],[18,9],[25,29],[-1,38] ], [ 'Ensnare', 'Icky' ], 23, 26)

        //Meduslime
        create_monster('23', '<:meduslime:921979911634313216>', 'Meduslime', 'https://cdn.discordapp.com/attachments/921949708971294750/921987499214127104/meduslime.png',
        'With a strangely developed nervous system, this creature is capable of exploting any weaknesses it finds.', 'ooze', 16, 25, 19, 15, //total 75
        [ [1,1],[7,29],[14,24],[17,23],[22,9],[30,29],[-1,38] ], [ 'Ensnare', 'Icky' ], -1, -1)

        //Tisparc
        create_monster('24', '<:tisparc:921979911604949052>', 'Tisparc', 'https://cdn.discordapp.com/attachments/921949708971294750/921987527676674058/tisparc.png',
        'The hat-like crystal on its head grants it a magical energy which it cannot quite control.', 'magic', 8, 15, 7, 10, //total 45
        [ [1,1],[5,24],[9,25],[14,26],[21,16],[26,27],[35,17],[-1,12] ], [ 'Uncontrolled', 'Apprentice' ], 25, 18)

        //Wizzap
        create_monster('25', '<:wizzap:921979911802068992>', 'Wizzap', 'https://cdn.discordapp.com/attachments/921949708971294750/921987540641280062/wizzap.png',
        'It has mastered control of its crystal and uses it to produce highly dangerous magic arcs.', 'magic', 13, 23, 12, 12, //total 65
        [ [1,1],[8,24],[13,25],[22,26],[27,16],[30,27],[44,17],[-1,12] ], [ 'Focused', 'Patient' ], -1, -1)

        //Blipoint
        create_monster('26', '<:blipoint:921986441280634880>', 'Blipoint', 'https://cdn.discordapp.com/attachments/921949708971294750/921987566956347392/blipoint.png',
        'An eye peeks through a rift in space-time.', 'magic', 10, 7, 6, 7, //total 30
        [ [1,1],[5,30],[15,5],[25,9],[35,31],[-1,19] ], [ 'Fleeting', 'Reactive' ], 27, 20)        

        //Rerune
        create_monster('27', '<:rerune:921986441213526016>', 'Rerune', 'https://cdn.discordapp.com/attachments/921949708971294750/921987598103248927/rerune.png',
        'What seems to be part of a face begins to emerge from the rift, unable to fully reveal itself.', 'magic', 10, 15, 15, 15, //total 55
        [ [1,1],[10,30],[20,5],[30,9],[40,31],[-1,19] ], [ 'Fleeting', 'Reactive' ], 28, 40)   

        //Temporath
        create_monster('28', '<:temporath:921986441192562761>', 'Temporath', 'https://cdn.discordapp.com/attachments/921949708971294750/921987610262536192/temporath.png',
        'It was not meant to exist here and now, so it experiences episodes of uncontrollable rage.', 'magic', 20, 20, 20, 20, //total 80
        [ [1,1],[15,30],[25,5],[35,9],[45,31],[-1,19] ], [ 'Uncontrolled', 'Withering' ], -1, -1)

        //Nucleorb
        create_monster('29', '<:nucleorb:922285098550849556>', 'Nucleorb', 'https://cdn.discordapp.com/attachments/921949708971294750/922300388202397726/nucleorb.png',
        'The nucleus of a cell grown to a massive size, for a cell that is. This rarity is relatively helpless on its own.', 'ooze', 7, 13, 9, 11, //total 40
        [ [1,1],[5,29],[11,33],[18,34],[24,19],[-1,10] ], [ 'Miniscule', 'Gentle' ], 30, 12)

        //Amebite
        create_monster('30', '<:amebite:922285098244669483>', 'Amebite', 'https://cdn.discordapp.com/attachments/921949708971294750/922300401720655923/amebite.png',
        'A ravenous macrocell that eats anything in its path, they grow and reproduce quickly enough to overrun entire ecosystems.', 'ooze', 11, 18, 12, 14, //total 55
        [ [1,1],[7,29],[18,33],[23,34],[35,19],[-1,10] ], [ 'Tough', 'Ravenous' ], 31, 28)

        //Amalgrime
        create_monster('31', '<:amalgrime:922285098567602176>', 'Amalgrime', 'https://cdn.discordapp.com/attachments/921949708971294750/922300413590519848/amalgrime.png',
        'When an ecosystem is overrun by Amebite they eventually converge on a single point. The result is a massive, yet oddly gentle being.', 'ooze', 25, 20, 20, 20, //total 85
        [ [1,1],[12,29],[24,33],[29,34],[41,19],[-1,10] ], [ 'Immense', 'Gentle' ], -1, -1)

        //Drilline
        create_monster('32', '<:drilline:922298875677642772>', 'Drilline', 'https://cdn.discordapp.com/attachments/921949708971294750/922300426114715658/drilline.png',
        'Despite a simplified system, these robots are prone to going rogue. How they sustain themselves in the wild remains a mystery.', 'tech', 11, 14, 15, 5, //total 45
        [ [1,1],[4,3],[7,37],[12,39],[20,36],[29,35],[-1,11] ], [ 'Armored', 'Inertia' ], 33, 21)

        //Erwrek
        create_monster('33', '<:erwrek:922298875644100608>', 'Erwrek', 'https://cdn.discordapp.com/attachments/921949708971294750/922300437690982431/erwrek.png',
        'It consumes whatever it can to replace its broken parts, when choices are slim it will even make use of organic material.', 'tech', 15, 19, 25, 16, //total 75
        [ [1,1],[9,3],[12,37],[17,39],[27,36],[35,35],[-1,11] ], [ 'Armored', 'Leech' ], -1, -1)

        //i_
        create_monster('34', '<:i_:922299745987346433>', 'i', 'https://cdn.discordapp.com/attachments/921949708971294750/922300450206801950/i.png',
        'ERROR: entry not found', 'void', 1, 1, 1, 1, //total 30
        [ [1,40] ], [ '0000', '0000' ], -1, -1)

        //#endregion

        interaction.reply('Generated game data.');
    },
};

