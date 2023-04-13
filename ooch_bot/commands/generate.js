const { SlashCommandBuilder } = require('discord.js');
const Discord = require('discord.js');
const { create_monster, create_move, create_item, create_ability, create_tile } = require('../func_create');
const fs = require('fs');
const db = require('../db.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('generate')
        .setDescription('Generates the game data.'),
    async execute(interaction) {

        if (interaction.user.id != '122568101995872256' && interaction.user.id != '145342159724347393') {
            return interaction.reply('This command isn\'t for you!')
        }

        //#region Tile Data
        //          ID  Use         Emote                           Emote_Simple (Optional)
        create_tile(0,  'floor',    '<:t000:1057163944889946173>'  );
        create_tile(1,  'floor',    '<:t001:1057163945900773436>'  );
        create_tile(2,  'npc',      '<:t002:1095915495020044308>'  );
        create_tile(3,  'floor',    '<:t003:1057163947553341492>'  );
        create_tile(4,  'floor',    '<:t004:1057163948585132102>'  );
        create_tile(5,  'floor',    '<:t005:1057163949319127140>'  );
        create_tile(6,  'floor',    '<:t006:1057163950262857780>'  );
        create_tile(7,  'floor',    '<:t100:1057164009335439491>'  );
        create_tile(8,  'wall',     '<:t101:1057164010774069268>'  );
        create_tile(9,  'grass',    '<:t102:1057164012288221234>'  );
        create_tile(10,  'floor',   '<:t200:1057164043426738186>'  );
        create_tile(11,  'wall',    '<:t201:1057164044395626537>'  );
        create_tile(12,  'grass',   '<:t202:1057164045242859571>'  );
        create_tile(13,  'floor',   '<:t300:1057164046320807946>'  );
        create_tile(14,  'wall',    '<:t301:1057164047910436944>'  );
        create_tile(15,  'grass',   '<:t302:1057164048866758776>'  );
        create_tile(16,  'wall',    '<:t203:1057499365574459493>'  );
        create_tile(17,  'wall',    '<:t204:1057499366815977593>'  );
        create_tile(18,  'wall',    '<:t205:1057499367889698866>'  );
        create_tile(19,  'wall',    '<:t206:1057499368997015572>'  );
        create_tile(20,  'wall',    '<:t207:1057499369684861019>'  );
        create_tile(21,  'wall',    '<:t208:1057499694848282654>'  );
        create_tile(22,  'npc',     '<:t050:1095915042165235812>'  );
        create_tile(23,  'npc',     '<:t051:1095915201070637138>'  );
        create_tile(24,  'npc',     '<:t052:1095915028097552494>'  );
        create_tile(25,  'npc',     '<:t053:1095915029745909862>'  );
        create_tile(26,  'npc',     '<:t054:1095915030899347476>'  );
        create_tile(27,  'npc',     '<:t209:1059665037473624104>'  ); //This is the crater
        create_tile(28,  'wall',    '<:t210:1059665038950006855>'  );
        create_tile(29,  'wall',    '<:t211:1059665040002793543>'  );
        create_tile(30,  'wall',    '<:t212:1059665041269469304>'  );
        create_tile(31,  'wall',    '<:t213:1059665036173385748>'  );
        create_tile(32,  'npc',     '<:t055:1095915031734005831>'  );
        create_tile(33,  'npc',     '<:t056:1095915032648355921>'  );
        create_tile(34,  'npc',     '<:t057:1095915033948586076>'  );
        create_tile(35,  'npc',     '<:t058:1095915034783260722>'  );
        create_tile(36,  'npc',     '<:t059:1095915035622129735>'  );
        create_tile(37,  'npc',     '<:t060:1095915320830611476>'  );
        create_tile(38,  'npc',     '<:t061:1095915322218909696>'  );
        create_tile(39, 'wall',     '<:t007:1095915429802811423>'  );
        create_tile(40, 'wall',     '<:t009:1095915431379877928>'  );
        create_tile(41, 'wall',     '<:t010:1095915432331984927>'  );
        create_tile(42, 'wall',     '<:t011:1095915433216983070>'  );
        create_tile(43, 'wall',     '<:t012:1095915434114551888>'  );
        //#endregion

        //#region Item Data
        //          ID   Name             Emote                                       Category     Type      Value   Description
        create_item(0, 'Potion',        '<:item_potion:1023031022566260776>',        'heal_inv',  'potion', 0.25,   'Used to quickly heal 25% of an Oochamon\'s HP')
        create_item(1, 'Hi-Potion',     '<:item_potion_hi:1023031023598047284>',     'heal_inv',  'potion', 0.5,    'An advanced potion which heals 50% of an Oochamon\'s HP')
        create_item(2, 'Max-Potion',    '<:item_potion_magic:1023031024726327426>',  'heal_inv',  'potion', 1,      'The ultimate potion which heals 100% of an Oochamon\'s HP')
        create_item(3, 'Prism',         '<:item_prism:1023031025716179076>',         'prism_inv', 'prism',  1,      'A device used to capture Oochamon.')
        create_item(4, 'Greater Prism', '<:item_prism_greater:1023031027775578112>', 'prism_inv', 'prism',  1.5,    'An improved prism with a higher capture rate.')
        create_item(5, 'Grand Prism',   '<:item_prism_grand:1023031026626347028>',   'prism_inv', 'prism',  2,      'A further modified prism with an even higher capture rate.')
        create_item(6, 'Perfect Prism', '<:item_prism_perfect:1023031028782211173>', 'prism_inv', 'prism',  1000,   'A prism with a shattered casing, nothing escapes its pull.')
        create_item(7, 'Attack Crystal','<:item_attack_crystal:1023031021517672540>','other_inv', 'misc',   1,      'Unlocks a hidden move for an Oochamon by releasing stored power.')
        //#endregion

        //#region Move Data
        //          ID, NAME,            TYPE,  DMG,ACCURACY, EFF,EFF_CHANCE,     DESCRIPTION
        create_move(0, 'Hit',           'neutral',10,100,   -1,0,           'The user hits the target to deal damage.')
        create_move(1, 'Bash',          'neutral',20,100,   -1,0,           'The target is dealt some blunt damage.')
        create_move(2, 'Spore Shot',    'fungal',30,100,    -1,0,           'A puff of spore burst from the user\'s body.')
        create_move(3, 'Pebble Blast',  'stone',30,100,     -1,0,           'Fires a barrage of small pebbles.')
        create_move(4, 'Fireball',      'flame',30,100,     -1,0,           'Shoots a ball of fire at the target.')
        create_move(5, 'Slash',         'neutral',50,95,    -1,0,           'The user slashes at the target with sharp appendages.')
        create_move(6, 'Take Over',     'fungal',35,90,     'infected',100, 'Fungal spores are launched which INFECT the target.')
        create_move(7, 'Dust Storm',    'stone',30,90,      'blinded',100,  'A storm is whipped up which leaves the target BLINDED.')
        create_move(8, 'Engulf',        'flame',40,90,      'burned',100,   'The target is BURNED by red-hot flames.')
        create_move(9, 'Impale',        'neutral',80,100,   -1,0,           'Impales the target with a spike.')
        create_move(10,'Bloom',        'fungal',70,90,     -1,0,           'Explosive spores are launched at the target to deal damage.')
        create_move(11,'Boulderdash',  'stone',70,90,      -1,0,           'Flings a massive boulder at the target.')
        create_move(12,'Torch',        'flame',70,90,      -1,0,           'The user hits the target to deal damage')
        create_move(13,'Blight',       'fungal',60,90,     'blinded',50,   'If the infection takes hold, the target is BLINDED.')
        create_move(14,'Lava Lance',   'stone',65,95,      'burned',50,    'Red-hot stone is launched to BURN the target.')
        create_move(15,'Tumorize',     'fire',50,95,       'infected',50,  'The user creates radiation in order to INFECT the target.')
        create_move(16,'Glimmer',      'stone',20,90,      'blinded',100,  'Refracts light in an attempt to BLIND the target.')
        create_move(17,'Gem Bash',     'stone',110,80,     -1,0,           'Crystallized stones are swung wildly to inflict damage.')
        create_move(18,'Caustic Orb',  'ooze',60,100,      'burned',75,    'A ball of caustic goo is launched with a high chance of BURNING.')
        create_move(19,'Pulverize',    'neutral',130,80,   -1,0,           'The target is slammed to deal massive damage.')
        create_move(20,'Ash Blast',    'flame',50,95,      'blinded',75,   'Hot ashes are launched at the target with a high chance to BLIND.')
        create_move(21,'Inferno',      'flame',100,70,     'burned',100,   'Anything caught by these wild flames is BURNED')
        create_move(22,'Digitize',     'tech',50,100,      'digitized',100,'The target becomes DIGITIZED when hit by this strange beam.')
        create_move(23,'Clamp Down',   'neutral',45,100,   'snared',30,    'Clamps down tight on the target to deal damage and SNARE them if you get lucky.')
        create_move(24,'Magic Bolt',   'magic',30,100,     -1,0,           'Fires a bolt of magic energy.')
        create_move(25,'Sparkler',     'flame',40,100,     'blinded',30,   'Shoots bright sparks with the potential to BLIND.')
        create_move(26,'Arca Strike',  'magic',80,90,      -1,0,           'Fires a powerful burst of magic.')
        create_move(27,'Call Thunder', 'magic',60,90,      'burned',50,    'Causes a great bolt of lightning to crash on the enemy, potentially BURNING them.')
        create_move(28,'Sticky Orb',   'ooze',80,90,       'snared',60,    'Fling a orb of goo that can SNARE the target.')
        create_move(29,'Glob',         'ooze',30,100,      -1,0,           'Pelts the target with a viscous ooze.')
        create_move(30,'Blink',        'magic',10,100,     'doubled',100,  'Travels to a different time to damage the target again, DOUBLING the next damage they take.')
        create_move(31,'Time Warp',    'magic',50,80,      'doubled',50,   'Attempts to DOUBLE the next damage the opponent takes by damaging them in the future.')
        create_move(32,'Mycelium Whip','fungal',50,90,     'snared',50,    'Shoots whips made of mycelium in an attempt to SNARE the opponent.')
        create_move(33,'Parasitize',   'ooze',30,100,      'infected',50,  'Parasitic bodies are launched at the target potentially INFECTING them.')
        create_move(34,'Corrode',      'ooze',70,80,       'doubled',30,   'Powerful acids are weaken the targets defenses, potentially DOUBLING the next damage they take.')
        create_move(35,'Grind',        'stone',80,90,      -1,0,           'Grinds against the opponent with rough, jagged edges.')
        create_move(36,'Metal Lance',  'tech',70,90,       -1,0,           'Stabs the opponent with a metallic object.')
        create_move(37,'Iron Hammer',  'tech',50,100,      -1,0,           'A heavy, metal object is hammered against the target.')
        create_move(38,'Laminate',     'tech',30,90,       'snared',100,   'Covers the target in a tough plastic substance to SNARE them.')
        create_move(39,'Entomb',       'stone',60,80,      'snared',50,    'Causes stones to fall onto the target, leaving them SNARED if they get trapped.')
        create_move(40,'undefined_int','void',100,100,     -1,0,           'TEST MOVE')
        ////NEW MOVES
        create_move(41,'Strike',        'neutral',20,100,  'critical',30,   'A targeted strike that is likely to land a Critical Hit.')
        create_move(42,'Barrage',       'tech',100,80,     'recoil',30,     'Devastating blasts damage the target, the user is hit with Recoil.')
        create_move(43,'Eruption',      'flame',70,100,    'recoil',20,     'Blazing heat erupts from the user, damaging itself and the opponent.')
        create_move(44,'Self Destruct', 'tech',250,100,    'recoil',100,    'The user self destructs to inflict massive damage.')
        create_move(45,'Leech',         'fungal',20,100,   'vampire',10,    'The user damages the opponent, slightly Healing itself in the process.')
        create_move(46,'Drain Life',    'magic',50,50,     'vampire',50,    'A horribly innacurate move with the potential to greatly heal the user.')
        create_move(47,'Restruct',      'stone',0,100,     'heal',25,       'Stones are reorganized in the user\'s body to restore some HP.')
        create_move(48,'Flurry',        'tech',75,90,      'critical',50,   'A flurry of steel blades shred the target, with a high chance to land a Critical Hit.')
        create_move(49,'Crash Landing', 'stone',90,90,     'recoil',20,     'The user falls down from the sky inflicting high damage, but injuring itself.')
        create_move(50,'Solar Blast',   'flame',85,100,    'blinded',50,    'Lob a brilliant ball of flame, potentially BLINDING the target.')
        create_move(51,'Tangled Threds','neutral',70,100,  'snared',30,     'Threads are shot at the target dealing damage with a chance to SNARE them.')
        create_move(52,'Fated Threds',  'magic',80,100,    'snared',50,     'Magical threads fly through the air in an attempt to SNARE the target.')
        create_move(53,'Sync Strike',   'neutral',70,100,  'typematch',100, 'Launch a ball of energy synchronized with the user\'s type')
        create_move(54,'Threefold',     'neutral',90,90,   'critical',30,   'The target is struck repeatedly, leaving it open to Critical Hits.')
        create_move(55,'Glass Blades',  'stone',80,70,     'critical',50,   'Brittle blades are used to strike at the opponent\'s weak spots.')
        create_move(56,'Gravitate',     'magic',60,30,     -1,0,            'The user manipulates gravity to fling itself at the target.')
        create_move(57,'Tenderize',     'neutral',120,70,  'recoil',30,     'The user slams its body into the opponent, but is hit with recoil.')


        //#endregion
        
        //#region Ability Data
        //             ID,  NAME,           Description
        create_ability(0,  'Miniscule',     'So small that it reduces the chance to be hit by 10%.');
        create_ability(1,  'Icky',          'Boosts the power of OOZE & FUNGAL type attacks by 20%');
        create_ability(2,  'Burdened',      'A large growth reduces SPD by 10% but raises DEF by 15%');
        create_ability(3,  'Broodmother',   'Gains 5% ATK for each Oochamon in the same evolution line in the party.');
        create_ability(4,  'Tough',         'A durable body grants a 10% increase to DEF.');
        create_ability(5,  'Shadow',        'Grants a 25% chance to DISAPPEAR after being attacked.');
        create_ability(6,  'Withering',     'Loss of the body reduces HP by 5% each turn, but raises SPD by 20%');
        create_ability(7,  'Darkbright',    'Attacks that afflict BURN also BLIND and vice-versa.');
        create_ability(8,  'Gentle',        'A kind heart reduces both your ATK and the enemy ATK by 10%');
        create_ability(9,  'Warm',          'Increases the damage of FLAME attacks by 10%.');
        create_ability(10, 'Radiant',       'Dangerous energy causes attacks that BURN also INFECT.');
        create_ability(11, 'Conflicted',    'Multiple minds increase ALL stats by 5%.');
        create_ability(12, 'Burrower',      'Increases the damage of STONE attacks by 10%');
        create_ability(13, 'Reactive',      'When hit by an attack, reflects 5% of the attacker\'s HP as damage.');
        create_ability(14, 'Inertia',       'Increases SPD by 5% each turn.');
        create_ability(15, 'Dense',         'Attacks deal an extra 10% damage but reduces SPD by 10%');
        create_ability(16, 'Moist',         'Reduces FLAME damage by 50%.');
        create_ability(17, 'Alert',         'Increases ATK by 20% when an Oochamon switches in.');
        create_ability(18, 'Fleeting',      'Increases SPD and ATK by 50% but also loses 50% of HP each turn.');
        create_ability(19, 'Efficient',     'Increases ATK by 5% each turn.');
        create_ability(20, 'Boisterous',    'Shatters eardrums when it enters the field dealing 5% of the enemy\'s HP');
        create_ability(21, 'Haunted',       'Applies the DOOMED status to an enemy when the holder of the ability dies.');
        create_ability(22, 'Leech',         'Restores HP equal to 10% of damage done to the enemy.');
        create_ability(23, 'Ensnare',       'Grants a 30% chance to SNARE an enemy when attacking.');
        create_ability(24, 'Uncontrolled',  'Increases ATK by 30% but randomly chooses an attack each turn');
        create_ability(25, 'Apprentice',    'Increases an attack\'s damage by 20% if any other party members also know it.');
        create_ability(26, 'Focused',       'Increases ATK by 10% if unaffected by status effects.');
        create_ability(27, 'Ravenous',      'Whenever defeating an enemy, restore 20% HP.');
        create_ability(28, 'Immense',       'Increases DEF by 20% but also makes opponent\'s moves always hit.');
        create_ability(29, 'Armored',       'Reduces STONE damage by 20%.');
        //START OF NEWLY ADDED ABILITIES
        create_ability(30, 'Scorching',     'Attacks that can BURN always BURN.');
        create_ability(31, 'Tangled',       'Causes enemies that hit it to be SNARED.');
        create_ability(32, 'Mundane',       'Cannot be affected by Status Effects.');
        create_ability(33, 'Rogue',         'DOUBLES the damage dealt to full HP enemies.');
        create_ability(34, 'Crystallize',   'Ooze, Flame, and Stone attacks deal 30% more damage.');
        create_ability(35, 'Lacerating',    'The enemy loses 5% of their HP after you attack.');
        create_ability(36, 'Gravity',       'Increase ATK by 1% per number of turns in this battle.');
        create_ability(37, 'Sporespray',    'INFECTS the enemy when defeated.');
        create_ability(38, 'Frostbite',     'Attacks reduce the targets SPD by 5%.');
        create_ability(39, 'Bipolar',       'Use the DEF stat when dealing damage.');
        create_ability(40, 'Hexiply',       'Attacks deal 6% more damage per sixth of HP remaining.');
        create_ability(41, 'Nullify',       "Negate the effects of enemy abilities.");
        create_ability(42, 'Duplicant',     "Copy the opponent's ability.");
        create_ability(43, '0000',          'FALSE'); //Increase the global counter for i's stats by 1 upon defeat
        //#endregion

        //#region Creature Data
        //ID, Emote, Name, Image, Description, Type, HP, ATK, DEF, SPD, Move List[[Lvl,ID]...], Abilities, Evolution ID, Evolution Level, Evolution Stage
        // Sporbee
        create_monster(0, '<:sporbee:921141752029646938>', 'Sporbee', 'https://cdn.discordapp.com/attachments/921949708971294750/921950169560387644/sporbee.png',
        'An insect that dwells in fungal forests. Every day it risks infection to provide for its hive.', ['fungal'], 8, 12, 8, 12, //total 40
        [ [1,1],[3,2],[8,5],[13,6],[17,10],[27,13],[-1,18] ], [ 'Miniscule', 'Icky' ], -1, 1, 16, 0)

        //Stingrowth
        create_monster(1, '<:stingrowth:921147233750110298>', 'Stingrowth', 'https://cdn.discordapp.com/attachments/921949708971294750/921950181845532722/stingrowth.png',
        'A strange protrusion is growing on this hive soldier, slowly gaining control over its movements.', ['fungal'], 15, 20, 11, 14, //total 60
        [ [1,1],[5,2],[9,5],[16,6],[20,10],[33,13],[-1,18] ], [ 'Burdened', 'Icky' ], 0, 2, 32, 1)

        //Queenect
        create_monster(2, '<:queenect:921150332376076288>', 'Queenect', 'https://cdn.discordapp.com/attachments/921949708971294750/921950201080610906/queenect.png',
        'A hive queen, completely overtaken by fungus. It continues to produce infected offspring even in this state.', ['fungal'], 25, 25, 16, 14, //total 80
        [ [1,1],[6,2],[12,5],[20,6],[25,10],[36,13],[-1,18] ], [ 'Burdened', 'Broodmother' ], 1, -1, -1, 2)

        // Roocky
        create_monster(3, '<:roocky:921156272512974868>', 'Roocky', 'https://cdn.discordapp.com/attachments/921949708971294750/921950312300957776/roock.png',
        'A ancient, crumbling pillar. The shadows beneath it are oddly comforting.', ['stone'], 12, 8, 12, 8, //total 40
        [ [1,1],[3,3],[8,7],[17,11],[27,14],[-1,20] ], [ 'Tough', 'Shadow' ], -1, 4, 16, 0)

        //Graknight
        create_monster(4, '<:graknight:921158515995848736>', 'Graknight', 'https://cdn.discordapp.com/attachments/921949708971294750/921950330516807731/graknight.png',
        'The stones have continued deteriorating revealing a gremlin-like form, it weilds fragments of its former body as a spear.', ['stone'], 18, 15, 15, 12, //total 60
        [ [1,1],[5,3],[9,7],[16,7],[20,11],[33,14],[-1,20] ], [ 'Withering', 'Shadow' ], 3, 5, 32, 1)

        //Diamount
        create_monster(5, '<:diamount:921160903230095392>', 'Diamount', 'https://cdn.discordapp.com/attachments/921949708971294750/921950340826407022/diamount.png',
        'Its body continues to wither away, freeing the shadows inside. The diamond eye in its center is its sole source of power.', ['stone'], 22, 18, 22, 18, //total 80
        [ [1,1],[6,3],[12,7],[20,7],[25,11],[36,14],[-1,20] ], [ 'Withering', 'Darkbright'], 4, -1, -1, 2)

        //Puppyre
        create_monster(6, '<:puppyre:921176686102454282>', 'Puppyre', 'https://cdn.discordapp.com/attachments/921949708971294750/921950375316172841/puppyre.png',
        'A very good boy, empowered by the spiraling patterns on its body.', ['flame'], 10, 12, 8, 10, //total 40
        [ [1,1],[3,4],[8,8],[12,12],[17,23],[27,15],[-1,21] ], [ 'Gentle', 'Warm' ], -1, 7, 16, 0)

        //Dogglow
        create_monster(7, '<:dogglow:921179530402603069>', 'Dogglow', 'https://cdn.discordapp.com/attachments/921949708971294750/921950394492518432/dogglow.png',
        'The etchings empowering its body have become corrupted, its flame now glows a sickly yellow.', ['flame'], 13, 18, 14, 15, //total 60
        [ [1,1],[5,4],[9,8],[16,12],[20,23],[33,15],[-1,21] ], [ 'Gentle', 'Radiant' ], 6, 8, 32, 1)

        //Hounuke
        create_monster(8, '<:hounuke:921182808804847686>', 'Hounuke', 'https://cdn.discordapp.com/attachments/921949708971294750/921950404923760700/hounuke.png',
        'Its body now radiates an eerie green, the once-pure etchings now shimmer and contort on its oozing skin.', ['flame'], 16, 26, 18, 20, //total 80
        [ [1,1],[6,4],[12,8],[20,12],[25,23],[36,15],[-1,21] ], [ 'Conflicted', 'Radiant' ], 7, -1, -1, 2)

        //Glither
        create_monster(9, '<:glither:921444285264584814>', 'Glither', 'https://cdn.discordapp.com/attachments/921949708971294750/921950503754141786/glither.png',
        'Its diamond-hard skin protects it from the most brutal of sandstorms.', ['stone'], 15, 9, 14, 12, //total 50
        [ [1,1],[3,3],[8,5],[13,7],[21,9],[27,16],[34,39],[-1,17] ], [ 'Tough', 'Reactive' ], -1, 10, 18, 0)

        //Sparafura
        create_monster(10, '<:sparafura:921444285063258113>', 'Sparafura', 'https://cdn.discordapp.com/attachments/921949708971294750/921950515410112553/sparafuna.png',
        'These dangerous serpents are found beneath the desert sands. Their crushing bite shatters bone with ease.', ['stone'], 18, 25, 16, 11, //total 70
        [ [1,1],[4,3],[12,5],[18,7],[25,9],[31,16],[40,39],[-1,17] ], [ 'Burrower', 'Reactive' ], 9, -1, -1, 1)
        
        //Constone
        create_monster(11, '<:constone:921452962608472084>', 'Constone', 'https://cdn.discordapp.com/attachments/921949708971294750/921950553695715388/constone.png',
        'Found on salt flats, these strange beings move about on a single wheel rather than legs.', ['stone'], 10, 10, 10, 20, //total 50
        [ [1,0],[4,3],[7,24],[18,11],[26,35],[-1,26] ], [ 'Inertia', 'Dense' ], -1, 12, 25, 0)

        //Amephyst
        create_monster(12, '<:amephyst:921452962549735524>', 'Amephyst', 'https://cdn.discordapp.com/attachments/921949708971294750/921950566777757736/amephyst.png',
        'The crystals that make up the core of its body have overtaken its left arm, creating a dangerous weapon.', ['stone'], 15, 20, 15, 30, //total 80
        [ [1,1],[5,3],[8,24],[21,11],[30,35],[33,17],[-1,26] ], [ 'Inertia', 'Dense' ], 11, -1, -1, 1)

        //Widew
        create_monster(13, '<:widew:921460528247894066>', 'Widew', 'https://cdn.discordapp.com/attachments/921949708971294750/921950600042790942/widew.png',
        'The growth on its back forms a symbyotic relationship with the host, maximizing the amount of nutrients each can absorb.', ['fungal'], 14, 10, 9, 12, //total 35
        [ [1,0],[3,2],[7,9],[11,28],[-1,16] ], [ 'Moist', 'Miniscule' ], -1, 14, 12, 0)

        //Tarotula
        create_monster(14, '<:tarotula:921460528306618438>', 'Tarotula', 'https://cdn.discordapp.com/attachments/921949708971294750/921950611686191124/tarotula.png',
        'The fine hairs on its back help it detect nearby movement making ambushing this giant spider surprisingly difficult.', ['fungal'], 21, 17, 12, 15, //total 65
        [ [1,0],[4,2],[8,9],[13,28],[18,6],[24,10],[32,13],[-1,16] ], [ 'Moist', 'Alert' ], 13, -1, -1, 1)

        //Moldot
        create_monster(15, '<:moldot:921464022182797392>', 'Moldot', 'https://cdn.discordapp.com/attachments/921949708971294750/921950639355994172/moldot.png',
        'Novice explorers are often shocked by just how much of this creature is buried beneath the surface.', ['fungal'], 5, 5, 25, 5, //total 40
        [ [1,1],[5,2],[12,6],[17,23],[24,19],[40,13],[-1,39] ], [ 'Gentle', 'Burrower' ], -1, 16, 30, 0)

        //Moldire
        create_monster(16, '<:moldire:921464022115700857>', 'Moldire', 'https://cdn.discordapp.com/attachments/921949708971294750/921950651049734144/moldire.png',
        'Its body is no longer able to fully fit in the crevice it grew up in, forcing its body to grow a defensive maw.', ['fungal'], 25, 25, 30, 5, //total 85
        [ [1,1],[7,2],[14,6],[20,23],[32,19],[40,34],[50,13],[-1,39] ], [ 'Gentle', 'Reactive' ], 15, -1, -1, 1)

        //Charlite
        create_monster(17, '<:charlite:921472869630885938>', 'Charlite', 'https://cdn.discordapp.com/attachments/921949708971294750/921950791105908766/charlite.png',
        'Its life is tied to whatever it is currently burning, these creatures live a frail, fleeting life.', ['flame'], 5, 15, 5, 10, //total 35
        [ [1,0],[4,4],[10,7],[16,25],[22,8],[27,20],[37,12],[-1,21] ], [ 'Fleeting', 'Warm' ], -1, 18, 15, 0)

        //Darcoal
        create_monster(18, '<:darcoal:921472869643456532>', 'Darcoal', 'https://cdn.discordapp.com/attachments/921949708971294750/921950803445579776/darcoal.png',
        'This flame has lived a surprisingly long life. It slowly burns its surroundings, covering the area in a thick black smoke.', ['flame'], 15, 35, 13, 12, //total 75
        [ [1,0],[6,4],[12,7],[18,25],[24,8],[30,20],[40,12],[-1,21] ], [ 'Efficient', 'Warm' ], 17, -1, -1, 1)

        //Torchoir
        create_monster(19, '<:torchoir:921480638178136065>', 'Torchoir', 'https://cdn.discordapp.com/attachments/921949708971294750/921950825977364510/tochoir.png',
        'A sentient torch that hums a haunting tune. Its song fills people with dread.', ['flame'], 12, 13, 11, 9, //total 45
        [ [1,1],[3,4],[7,9],[12,24],[17,12],[21,23],[27,30],[-1,26] ], [ 'Boisterous', 'Haunted' ], -1, 20, 28, 0)

        //Chantern
        create_monster(20, '<:chantern:921480638543036436>', 'Chantern', 'https://cdn.discordapp.com/attachments/921949708971294750/921950839004880896/chantern.png',
        'It can mimic the human voice nearly perfectly, though it only speaks in random phrases.', ['flame'], 21, 20, 24, 15, //total 80
        [ [1,1],[5,4],[8,9],[13,24],[19,12],[25,23],[32,30],[-1,26] ], [ 'Boisterous', 'Haunted' ], 19, -1, -1, 1)

        //Eluslug
        create_monster(21, '<:eluslug:921483721197105162>', 'Eluslug', 'https://cdn.discordapp.com/attachments/921949708971294750/921950857396912138/eluslug.png',
        'Oddly malleable despite its metallic body, it feeds on the magnetic wandering stones found in various locations.', ['tech'], 11, 12, 12, 14, //total 50
        [ [1,1],[10,22],[-1,38] ], [ 'Leech', 'Icky' ], -1, -1, -1, 0)

        //Jellime
        create_monster(22, '<:jellime:921979911382654997>', 'Jelime', 'https://cdn.discordapp.com/attachments/921949708971294750/921987464854401044/jellime.png',
        'A jellyfish-like creature, its probing tendrils ensnare whatever they touch.', ['ooze'], 14, 10, 16, 10, //total 50
        [ [1,1],[3,29],[7,24],[11,23],[18,9],[25,29],[-1,38] ], [ 'Ensnare', 'Icky' ], -1, 23, 26, 0)

        //Meduslime
        create_monster(23, '<:meduslime:921979911634313216>', 'Meduslime', 'https://cdn.discordapp.com/attachments/921949708971294750/921987499214127104/meduslime.png',
        'With a strangely developed nervous system, this creature is capable of exploting any weaknesses it finds.', ['ooze'], 16, 25, 19, 15, //total 75
        [ [1,1],[7,29],[14,24],[17,23],[22,9],[-1,38] ], [ 'Ensnare', 'Icky' ], 22, -1, -1, 1)

        //Tisparc
        create_monster(24, '<:tisparc:921979911604949052>', 'Tisparc', 'https://cdn.discordapp.com/attachments/921949708971294750/921987527676674058/tisparc.png',
        'The hat-like crystal on its head grants it a magical energy which it cannot quite control.', ['magic'], 8, 15, 7, 10, //total 45
        [ [1,1],[5,24],[9,25],[14,26],[21,16],[26,27],[35,17],[-1,12] ], [ 'Uncontrolled', 'Apprentice' ], -1, 25, 18, 0)

        //Wizzap
        create_monster(25, '<:wizzap:921979911802068992>', 'Wizzap', 'https://cdn.discordapp.com/attachments/921949708971294750/921987540641280062/wizzap.png',
        'It has mastered control of its crystal and uses it to produce highly dangerous magic arcs.', ['magic'], 13, 23, 12, 12, //total 65
        [ [1,1],[8,24],[13,25],[22,26],[27,16],[30,27],[44,17],[-1,12] ], [ 'Focused', 'Patient' ], 24, -1, -1, 1)

        //Blipoint
        create_monster(26, '<:blipoint:921986441280634880>', 'Blipoint', 'https://cdn.discordapp.com/attachments/921949708971294750/921987566956347392/blipoint.png',
        'An eye peeks through a rift in space-time.', ['magic'], 10, 7, 6, 7, //total 30
        [ [1,1],[5,30],[15,5],[25,9],[35,31],[-1,19] ], [ 'Fleeting', 'Reactive' ], -1, 27, 20, 0)        

        //Rerune
        create_monster(27, '<:rerune:921986441213526016>', 'Rerune', 'https://cdn.discordapp.com/attachments/921949708971294750/921987598103248927/rerune.png',
        'What seems to be part of a face begins to emerge from the rift, unable to fully reveal itself.', ['magic'], 10, 15, 15, 15, //total 55
        [ [1,1],[10,30],[20,5],[30,9],[40,31],[-1,19] ], [ 'Fleeting', 'Reactive' ], 26, 28, 40, 1)   

        //Temporath
        create_monster(28, '<:temporath:921986441192562761>', 'Temporath', 'https://cdn.discordapp.com/attachments/921949708971294750/921987610262536192/temporath.png',
        'It was not meant to exist here and now, so it experiences episodes of uncontrollable rage.', ['magic'], 20, 20, 20, 20, //total 80
        [ [1,1],[15,30],[25,5],[35,9],[45,31],[-1,19] ], [ 'Uncontrolled', 'Withering' ], 27, -1, -1, 2)

        //Nucleorb
        create_monster(29, '<:nucleorb:922285098550849556>', 'Nucleorb', 'https://cdn.discordapp.com/attachments/921949708971294750/922300388202397726/nucleorb.png',
        'The nucleus of a cell grown to a massive size, for a cell that is. This rarity is relatively helpless on its own.', ['ooze'], 7, 13, 9, 11, //total 40
        [ [1,1],[5,29],[11,33],[18,34],[24,19],[-1,10] ], [ 'Miniscule', 'Gentle' ], -1, 30, 12, 0)

        //Amebite
        create_monster(30, '<:amebite:922285098244669483>', 'Amebite', 'https://cdn.discordapp.com/attachments/921949708971294750/922300401720655923/amebite.png',
        'A ravenous macrocell that eats anything in its path, they grow and reproduce quickly enough to overrun entire ecosystems.', ['ooze'], 11, 18, 12, 14, //total 55
        [ [1,1],[7,29],[18,33],[23,34],[35,19],[-1,10] ], [ 'Tough', 'Ravenous' ], 29, 31, 28, 1)

        //Amalgrime
        create_monster(31, '<:amalgrime:922285098567602176>', 'Amalgrime', 'https://cdn.discordapp.com/attachments/921949708971294750/922300413590519848/amalgrime.png',
        'When an ecosystem is overrun by Amebite they eventually converge on a single point. The result is a massive, yet oddly gentle being.', ['ooze'], 25, 20, 20, 20, //total 85
        [ [1,1],[12,29],[24,33],[29,34],[41,19],[-1,10] ], [ 'Immense', 'Gentle' ], 30, -1, -1, 2)

        //Drilline
        create_monster(32, '<:drilline:922298875677642772>', 'Drilline', 'https://cdn.discordapp.com/attachments/921949708971294750/922300426114715658/drilline.png',
        'Despite a simplified system, these robots are prone to going rogue. How they sustain themselves in the wild remains a mystery.', ['tech'], 11, 14, 15, 5, //total 45
        [ [1,1],[4,3],[7,37],[12,39],[20,36],[29,35],[-1,11] ], [ 'Armored', 'Inertia' ], -1, 33, 21, 0)

        //Erwrek
        create_monster(33, '<:erwrek:922298875644100608>', 'Erwrek', 'https://cdn.discordapp.com/attachments/921949708971294750/922300437690982431/erwrek.png',
        'It consumes whatever it can to replace its broken parts, when choices are slim it will even make use of organic material.', ['tech'], 15, 19, 25, 16, //total 75
        [ [1,1],[9,3],[12,37],[17,39],[27,36],[35,35],[-1,11] ], [ 'Armored', 'Leech' ], 32, -1, -1, 1)

        //i_
        create_monster(34, '<:i_:922299745987346433>', 'i', 'https://cdn.discordapp.com/attachments/921949708971294750/922300450206801950/i.png',
        'ERROR: entry not found', 'void', 1, 1, 1, 1, //total 30
        [ [1,40] ], [ '0000', '0000' ], -1, -1, -1, 0)

        //NEW ONES, MAKE GOOD YES
        //Cromet
        create_monster(35, '<:cromet:926625964677558272>', 'Cromet', 'https://cdn.discordapp.com/attachments/921949708971294750/1023407933968613396/cromet.png',
        'Cromet fall from the sky when the distant stars rupture in the night. Thousands can fall at the same time.', ['stone'], 12, 13, 10, 15, //total 50
        [ [1,1] ], [ 'Inertia', 'Scorching' ], -1, 36, 27, 0);

        //Lobstar
        create_monster(36, '<:lobstar:926625964576890881>', 'Lobstar', 'https://cdn.discordapp.com/attachments/921949708971294750/1023407934367080569/lobstar.png',
        'From a distance they seem to be stars in the sky, their weighty bodies are lifted by an immense amount of energy.', ['stone'], 10, 35, 20, 10, //total 75
        [ [1,1] ], [ 'Immense', 'Scorching' ], 35, -1, -1, 1) 

        //Spoolette
        create_monster(37, '<:spoolette:1023046362801123338>', 'Spoolette', 'https://cdn.discordapp.com/attachments/921949708971294750/982082464824590406/spoolette.png',
        'While Spoolette itself is magical in nature, the threads it creates are completely mundane.', ['magic'], 10, 15, 15, 10, //total 50
        [ [1,1] ], [ 'Tangled', 'Mundane' ], -1, 38, 18, 0);

        //Thimbite
        create_monster(38, '<:thimbite:1023046363769999451>', 'Thimbite', 'https://cdn.discordapp.com/attachments/921949708971294750/982082465067839498/thimbite.png',
        'Thimbite enchant a container when they evolve so that it can never be removed, touching one\'s container causes it to rage.', ['magic'], 20, 20, 20, 10, //total 70
        [ [1,1] ], [ 'Tangled', 'Ensnare' ], 37, -1, -1, 1);

        //Digityke
        create_monster(39, '<:digityke:1023046359898656908>', 'Digityke', 'https://cdn.discordapp.com/attachments/921949708971294750/982082465340461066/digityke.png',
        'An old-model of machine companion, its feeble body prevents it from being of much use.', ['tech'], 10, 7, 8, 5, //total 30
        [ [1,1] ], [ 'Gentle' ], -1, 40, 21, 0);

        //Codet
        create_monster(40, '<:codet:1023046357746995300>', 'Codet', 'https://cdn.discordapp.com/attachments/921949708971294750/982082465579556874/codet.png',
        'An attempt to modernize the DGTY-k gone wrong. Despite being decomissioned these haunting machines continue to run.', ['tech'], 30, 10, 10, 10, //total 60
        [ [1,1] ], [ 'Rogue' ], 39, -1, -1, 1);

        //Heatri
        create_monster(41, '<:heatri:1023046360754307142>', 'Heatri', 'https://cdn.discordapp.com/attachments/921949708971294750/982082465860583424/heatri.png',
        'A bird-like creature made of an ever-shifting fluid, in this form it becomes superheated.', ['flame'], 25, 10, 10, 20, //total 65
        [ [1,1] ], [ 'Crystallize' ], 43, 42, 33, 1);

        //Moistri
        create_monster(42, '<:moistri:1023046361702219887>', 'Heatri', 'https://cdn.discordapp.com/attachments/921949708971294750/982082466082848798/moistri.png',
        'Researchers studying Moistri tend to fall ill after handling it, despite this some believe it to have some sort of healing properties.', ['ooze'], 25, 20, 10, 10, //total 65
        [ [1,1] ], [ 'Crystallize' ], 41, 43, 33, 1);

        //Crystri
        create_monster(43, '<:crystri:1023046358933975140>', 'Crystri', 'https://cdn.discordapp.com/attachments/921949708971294750/982082466317738034/crystri.png',
        'While its crystals appear rigid they maintain some sort of fluidity.', ['stone'], 25, 10, 20, 10, //total 65
        [ [1,1] ], [ 'Crystallize' ], 42, 41, 33, 1);

        //Solidifyr
        create_monster(44, '<:solidifyr:1023046888213192784>', 'Solidifyr', 'https://cdn.discordapp.com/attachments/921949708971294750/982082656760111124/solidifyr.png',
        'Frequently found wandering lava fields. While unflinching in the face of an eruption, they will flee immediately if startled otherwise.', ['flame'], 17, 13, 11, 9, //total 50
        [ [1,1] ], [ 'Warm', 'Scorching' ], -1, 45, 38, 0);

        //Obstaggard
        create_monster(45, '<:obstaggard:1023046882630570035>', 'Obstaggard', 'https://cdn.discordapp.com/attachments/921949708971294750/982082656974037022/obstaggard.png',
        'While incredibly hard and sharp, their horns are very brittle. Obstaggard are often hunted in order to make precision blades.', ['stone'], 19, 23, 17, 11, //total 70
        [ [1,1] ], [ 'Withering', 'Lacerating' ], 44, -1, -1, 1);

        //Droplunk
        create_monster(46, '<:droplunk:1023046877874237542>', 'Droplunk', 'https://cdn.discordapp.com/attachments/921949708971294750/982082657187954748/droplunk.png',
        'Oops, don\'t let this one drop on your head!', ['stone'], 7, 10, 8, 15, //total 40
        [ [1,1] ], [ 'Inertia', 'Gravity' ], -1, 45, 38, 0);

        //Brykurse
        create_monster(47, '<:brykurse:1023046877173792768>', 'Brykurse', 'https://cdn.discordapp.com/attachments/921949708971294750/982082657393463357/brykurse.png',
        'Square meatball!', ['magic'], 14, 28, 8, 25, //total 75
        [ [1,1] ], [ 'Inertia', 'Gravity' ], 46, -1, -1, 1);

        //Polyplute
        create_monster(48, '<:polyplute:1023046886069911643>', 'Polyplute', 'https://cdn.discordapp.com/attachments/921949708971294750/982082657645109269/polyplute.png',
        'Blooms of Polyplute create beatiful fields, however this phenomenon is incredibly dangerous as they make the environment around them toxic.', ['fungal'], 12, 13, 12, 8, //total 45
        [ [1,1] ], [ 'Sporespray', 'Leech' ], -1, 49, 29, 0);

        //Reefest
        create_monster(49, '<:reefest:1023046887177199616>', 'Reefest', 'https://cdn.discordapp.com/attachments/921949708971294750/982082657871593514/reefest.png',
        'When Polyplute blooms linger in an area, they often congeal into the massive Reefest.', ['fungal'], 35, 15, 15, 5, //total 70
        [ [1,1] ], [ 'Sporespray', 'Ensnare' ], 48, -1, -1, 1);

        //Frigook
        create_monster(50, '<:frigook:1023046879900078132>', 'Frigook', 'https://cdn.discordapp.com/attachments/921949708971294750/982082802457640980/frigook.png',
        'Frigook maintain a temperature just above the point of freezing and can quickly drop below it to harden their bodies.', ['ooze'], 15, 5, 15, 5, //total 40
        [ [1,1] ], [ 'Moist', 'Frostbite' ], -1, 51, 23, 0);

        //Boreyuc
        create_monster(51, '<:boreyuc:1023046866738360351>', 'Boreyuc', 'https://cdn.discordapp.com/attachments/921949708971294750/982082802671554712/boreyuc.png',
        'These beasts move incredibly slowly unless disturbed, liquefying their body and attacking immediately.', ['ooze'], 15, 7, 30, 3, //total 65
        [ [1,1] ], [ 'Bipolar', 'Frostbite' ], 50, -1, -1, 1);

        //Vrumbox
        create_monster(52, '<:vrumbox:1023046889236615269>', 'Vrumbox', 'https://cdn.discordapp.com/attachments/921949708971294750/982082803095187466/vrumbox.png',
        'Monowheeled automata built for carrying various pieces of equipment.', ['tech'], 10, 10, 10, 15, //total 45
        [ [1,1] ], [ 'Inertia', 'Armored' ], -1, 53, 18, 0);

        //Folduo
        create_monster(53, '<:folduo:1023046879216402472>', 'Folduo', 'https://cdn.discordapp.com/attachments/921949708971294750/982082803426557962/folduo.png',
        'Folduo\'s body allows it to fit into small spaces. It also can combine with and dock with Vrumbox to create platforms.', ['tech'], 15, 12, 13, 20, //total 60
        [ [1,1] ], [ 'Inertia', 'Armored' ], 52, 54, 32, 1);

        //Hexyclone
        create_monster(54, '<:hexyclone:1023046881221300255>', 'Hexyclone', 'https://cdn.discordapp.com/attachments/921949708971294750/982082803694981160/hexyclone.png',
        'A Hexcyclone\'s entire body can be folded into the space that acts as its head, allowing it to explore otherwise unenterable areas.', ['tech'], 20, 13, 17, 25, //total 75
        [ [1,1] ], [ 'Hexiply', 'Efficient' ], 53, -1, -1, 2);

        //Oochabit
        create_monster(55, '<:oochabit:1023046884148912199>', 'Oochabit', 'https://cdn.discordapp.com/attachments/921949708971294750/982082803950821376/oochabit.png',
        'These little guys\'ll consume space-time and do it with a smile on their faces.', ['void'], 10, 9, 5, 6, //total 30
        [ [1,1] ], [ 'Nullify' ], -1, 56, 18, 0);

        //Oochabound
        create_monster(56, '<:oochabound:1023046884769677313>', 'Oochabound', 'https://cdn.discordapp.com/attachments/921949708971294750/982082804252815410/oochabot.png',
        'No thank you, I\'d really rather not write a description for this one.', ['void'], 25, 23, 17, 20, //total 85
        [ [1,1] ], [ 'Duplicant' ], 55, -1, -1, 1);
        //#endregion

        // Generate text file for GMS2 map editor project
        let ooch_output_str = "";
        let moves_output_str = "";
        let items_output_str = "";
        let abilities_output_str = "";
        let tiles_output_str = "";

        for (let obj of db.monster_data.array()) {
            ooch_output_str += `${obj.id}|${obj.emote}|${obj.image}|${obj.name}|${obj.oochive_entry}|${obj.type}|${obj.hp}|${obj.atk}|${obj.def}|${obj.spd}|` + 
            `${obj.move_list}|${obj.abilities}|${obj.evo_id}|${obj.evo_lvl}\n`;
        }

        for (let obj of db.move_data.array()) {
            moves_output_str += `${obj.id}|${obj.name}|${obj.type}|${obj.damage}|${obj.accuracy}|${obj.effect}|${obj.chance}|${obj.description}\n`;
        }

        for (let obj of db.item_data.array()) {
            items_output_str += `${obj.id}|${obj.name}|${obj.emote}|${obj.category}|${obj.type}|${obj.value}|${obj.description}\n`;
        }

        for (let obj of db.ability_data.array()) {
            abilities_output_str += `${obj.id}|${obj.name}|${obj.description}\n`;
        }

        for (let obj of db.tile_data.array()) {
            tiles_output_str += `${obj.id}|${obj.use}|${obj.emote}|${obj.emote_simple}\n`;
        }

        fs.writeFile('./gms2_data/ooch_data.txt', ooch_output_str, (err) => { if (err) throw err; });
        fs.writeFile('./gms2_data/moves_data.txt', moves_output_str, (err) => { if (err) throw err; });
        fs.writeFile('./gms2_data/items_data.txt', items_output_str, (err) => { if (err) throw err; });
        fs.writeFile('./gms2_data/abilities_data.txt', abilities_output_str, (err) => { if (err) throw err; });
        fs.writeFile('./gms2_data/tiles_data.txt', tiles_output_str, (err) => { if (err) throw err; });

        interaction.reply('Generated game data.');
    },
};

