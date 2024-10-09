const { SlashCommandBuilder } = require('discord.js');
const { create_monster, create_move, create_item, create_ability, create_tile, create_status } = require('../func_create');
const fs = require('fs');
const db = require('../db.js');
const { OochType, Move, Ability, Zone, Tile, TileEmoteGuildsArray, Status, MoveTag } = require('../types.js');
const { get_emote_string } = require('../func_other.js');
const globalEventsJSON = require('../global_events.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('generate')
        .setDescription('Generates the game data.'),
    async execute(interaction, client) {
        await interaction.deferReply();
        if (interaction.user.id != '122568101995872256' && interaction.user.id != '145342159724347393') {
            return interaction.editReply({ content: 'You can\'t use this!', ephemeral: true });
        }
        
        //#region Tile Data
        // ZONES IDs
        // 0: GLOBAL
        // 1: FUNGAL
        // 2: SANDY
        // 3: CAVE
        // 4: OBSIDIAN
        let zG = Zone.Global < 10 ? `0${Zone.Global}` : Zone.Global;
        let zF = Zone.Fungal < 10 ? `0${Zone.Fungal}` : Zone.Fungal;
        let zS = Zone.Sandy < 10 ? `0${Zone.Sandy}` : Zone.Sandy;
        let zC = Zone.Cave < 10 ? `0${Zone.Cave}` : Zone.Cave;
        let zO = Zone.Obsidian < 10 ? `0${Zone.Obsidian}` : Zone.Obsidian;

        let TileGuilds = [];
        for (let guildId of TileEmoteGuildsArray) {
            let guild = await client.guilds.fetch(guildId);
            TileGuilds.push(guild);
        }

        //           ID            Use            Emote Guilds
        // Global
        create_tile(`t${zG}_000`,  Tile.Wall,     TileGuilds ); //Black 
        create_tile(`t${zG}_001`,  Tile.Floor,    TileGuilds ); //Teleporter 
        create_tile(`t${zG}_003`,  Tile.Floor,    TileGuilds ); //Arrow Left
        create_tile(`t${zG}_004`,  Tile.Floor,    TileGuilds ); //Arrow Up
        create_tile(`t${zG}_005`,  Tile.Floor,    TileGuilds ); //Arrow Right
        create_tile(`t${zG}_006`,  Tile.Floor,    TileGuilds ); //Arrow Down
        create_tile(`t${zG}_007`,  Tile.Wall,     TileGuilds ); //Shop Mini
        create_tile(`t${zG}_008`,  Tile.Wall,     TileGuilds ); //Shop Upper Left
        create_tile(`t${zG}_009`,  Tile.Wall,     TileGuilds ); //Shop Upper Right
        create_tile(`t${zG}_010`,  Tile.Shop,     TileGuilds ); //Shop Lower Left (interactable tile)
        create_tile(`t${zG}_011`,  Tile.Wall,     TileGuilds ); //Shop Lower Right 
        
        // Fungal
        create_tile(`t${zF}_000`,  Tile.Floor,    TileGuilds ); //Fungal Floor
        create_tile(`t${zF}_001`,  Tile.Wall,     TileGuilds ); //Fungal Wall
        create_tile(`t${zF}_002`,  Tile.Grass,    TileGuilds ); //Fungal Grass
        create_tile(`t${zF}_003`,  Tile.Wall,     TileGuilds ); //Fungal Wall
        create_tile(`t${zF}_004`,  Tile.Floor,    TileGuilds ); //Fungal Exit
        create_tile(`t${zF}_005`,  Tile.Floor,    TileGuilds ); //Fungal Floor Entrance
        create_tile(`t${zF}_006`,  Tile.Wall,     TileGuilds ); //Fungal Inaccessible Area
        
        // Sandy
        create_tile(`t${zS}_000`,  Tile.Floor,    TileGuilds ); //Sandy Floor
        create_tile(`t${zS}_001`,  Tile.Wall,     TileGuilds ); //Sandy Wall
        create_tile(`t${zS}_002`,  Tile.Grass,    TileGuilds ); //Sandy Grass
        create_tile(`t${zS}_003`,  Tile.Wall,     TileGuilds ); //HUB Wall Top
        create_tile(`t${zS}_004`,  Tile.Wall,     TileGuilds ); //HUB Wall Middle
        create_tile(`t${zS}_005`,  Tile.Wall,     TileGuilds ); //Hub Wall Bottom
        create_tile(`t${zS}_006`,  Tile.Wall,     TileGuilds ); //Hub Gate Top
        create_tile(`t${zS}_007`,  Tile.Wall,     TileGuilds ); //Hub Gate Bottom
        create_tile(`t${zS}_008`,  Tile.Wall,     TileGuilds ); //Hub Tent
        create_tile(`t${zS}_010`,  Tile.Wall,     TileGuilds ); //Hub Dropship Upper Left
        create_tile(`t${zS}_011`,  Tile.Wall,     TileGuilds ); //Hub Dropship Upper Right
        create_tile(`t${zS}_012`,  Tile.Wall,     TileGuilds ); //Hub Dropship Lower Left
        create_tile(`t${zS}_013`,  Tile.Wall,     TileGuilds ); //Hub Dropship Lower Right
        create_tile(`t${zS}_014`,  Tile.Wall,     TileGuilds ); //Desert Wall Lower
        create_tile(`t${zS}_015`,  Tile.Wall,     TileGuilds ); //Desert Wall Upper
        create_tile(`t${zS}_016`,  Tile.Floor,    TileGuilds ); //Desert Exit
        create_tile(`t${zS}_017`,  Tile.Wall,     TileGuilds ); //Hub Barrel
        create_tile(`t${zS}_018`,  Tile.Board,    TileGuilds ); //Job Board
        create_tile(`t${zS}_019`,  Tile.Wall,     TileGuilds ); //Sandy Inaccessible Area

        // Cave
        create_tile(`t${zC}_000`,  Tile.Grass,    TileGuilds ); //Cave Floor - changed to Tile.Grass type so that enemies can spawn anywhere in caves
        create_tile(`t${zC}_001`,  Tile.Floor,    TileGuilds ); //Cave Floor Entrance
        create_tile(`t${zC}_002`,  Tile.Wall,     TileGuilds ); //Cave Wall
        create_tile(`t${zC}_003`,  Tile.Wall,     TileGuilds ); //Lava
        create_tile(`t${zC}_004`,  Tile.Floor,    TileGuilds ); //Cave Exit
        create_tile(`t${zC}_005`,  Tile.Wall,     TileGuilds ); //Cave Stalagtite
        create_tile(`t${zC}_006`,  Tile.Wall,     TileGuilds ); //Cave Inaccessible Area

        // Obsidian
        create_tile(`t${zO}_000`,  Tile.Floor,    TileGuilds ); //Obsidian Floor
        create_tile(`t${zO}_001`,  Tile.Wall,     TileGuilds ); //Obsidian Wall
        create_tile(`t${zO}_002`,  Tile.Grass,    TileGuilds ); //Obsidian Grass
        
        // NPCs
        create_tile(`c_000`,       Tile.Npc,      TileGuilds ); // Main Character
        create_tile(`c_001`,       Tile.Npc,      TileGuilds ); // Basic NPC Obsidian
        create_tile(`c_002`,       Tile.Npc,      TileGuilds ); // Basic NPC Desert Rags
        create_tile(`c_003`,       Tile.Npc,      TileGuilds ); // Basic NPC Neon Blue
        create_tile(`c_004`,       Tile.Npc,      TileGuilds ); // Basic NPC Fungal
        create_tile(`c_005`,       Tile.Npc,      TileGuilds ); // Global Scientist
        create_tile(`c_006`,       Tile.Npc,      TileGuilds ); // Global Elderly Researcher
        create_tile(`c_007`,       Tile.Npc,      TileGuilds ); // Global Rival
        create_tile(`c_008`,       Tile.Npc,      TileGuilds ); // Global Desert Raider
        create_tile(`c_009`,       Tile.Npc,      TileGuilds ); // Global Department Head
        create_tile(`c_010`,       Tile.Npc,      TileGuilds ); // Global Hollowed Scientist
        create_tile(`c_011`,       Tile.Npc,      TileGuilds ); // Shopkeeper
        create_tile(`c_012`,       Tile.Int,      TileGuilds ); // Crater
        create_tile(`c_013`,       Tile.Int,      TileGuilds ); // Chest
        
        //#endregion

        //#region Item Data
        //          ID   Name             Emote                                        Category     Type       Price   Potency  Description
        create_item(0, 'Potion',         '<:item_potion:1023031022566260776>',         'heal_inv',  'potion',  40,     20,      'Used to quickly heal 20 HP')
        create_item(1, 'Med-Potion',     '<:item_potion_hi:1023031023598047284>',      'heal_inv',  'potion',  100,    50,      'An advanced potion which heals 50 HP')
        create_item(2, 'Hi-Potion',      '<:item_potion_magic:1023031024726327426>',   'heal_inv',  'potion',  250,    200,     'A high tier potion which heals 200 HP')
        create_item(3, 'Prism',          '<:item_prism:1023031025716179076>',          'prism_inv', 'prism',   50,     1,       'A device used to capture Oochamon.')
        create_item(4, 'Greater Prism',  '<:item_prism_greater:1023031027775578112>',  'prism_inv', 'prism',   150,    1.5,     'An improved prism with a higher capture rate.')
        create_item(5, 'Grand Prism',    '<:item_prism_grand:1023031026626347028>',    'prism_inv', 'prism',   500,    2,       'A further modified prism with an even higher capture rate.')
        create_item(6, 'Perfect Prism',  '<:item_prism_perfect:1023031028782211173>',  'prism_inv', 'prism',   10000,  1000,    'A prism with a shattered casing, nothing escapes its pull.')
        create_item(7, 'Attack Crystal', '<:item_attack_crystal:1023031021517672540>', 'other_inv', 'misc',    200,    1,       'Unlocks a hidden move for an Oochamon by releasing stored power.')
        create_item(8, 'ID Card',        ':identification_card:',                      'other_inv', 'misc',    -1,     1,       'Your ID card. You look so fabulous!')

        //NEW ITEMS
        create_item(9,  'Eyedrops',      '<:item_eyedrops:1176611226403475506>',       'heal_inv',  'status',  200,   Status.Blind,     'Removes BLIND status effect.')
        create_item(10, 'Shears',        '<:item_shears:1176611593044381707>',         'heal_inv',  'status',  200,   Status.Snare,     'Removes SNARED status effect.')
        create_item(11, 'Daylilly',      '<:item_daylily:1176611228995555417>',        'heal_inv',  'status',  200,   Status.Doom,      'Removes DOOMED status effect.')
        create_item(12, 'Antiparasite',  '<:item_antiparasite:1176611225166172290>',   'heal_inv',  'status',  200,   Status.Infect,    'Removes INFECTED status effect.')
        create_item(13, 'Debug Chip',    '<:item_debugchip:1176611228127342622>',      'heal_inv',  'status',  200,   Status.Digitize,  'Removes DIGITIZED status effect.')
        create_item(14, 'Nullifying Sphere', '<:item_null_sphere:1265063633780473876>','heal_inv',  'status',  1200,  Status.All,       'Removes all status effects.')

        create_item(15, 'Greem Boostgem', '<:item_iv_hp:1265048909600915516>',         'other_inv', 'iv',     25000, 'hp',    'Permanently increases Health of an Oochamon.')
        create_item(16, 'Red Boostgem',   '<:item_iv_atk:1265048907759489079>',        'other_inv', 'iv',     25000, 'atk',   'Permanently increases Attack of an Oochamon.')
        create_item(17, 'Blue Boostgem',  '<:item_iv_def:1265048908728369202>',        'other_inv', 'iv',     25000, 'def',   'Permanently increases Defense of an Oochamon.')
        create_item(18, 'Yellow Boostgem','<:item_iv_spd:1265048907143053455>',        'other_inv', 'iv',     25000, 'spd',   'Permanently increases Speed of an Oochamon.')
        
        //#endregion

        //#region Move Data
        // ADD TO THE TYPES.JS FILE WHEN ADDING NEW ONES
        //          ID, NAME,             TYPE,        DMG,ACCURACY, EFF,EFF_CHANCE,     DESCRIPTION
        create_move(0, 'Hit',             OochType.Neutral,10,100,   -1,0,           'The user hits the target to deal damage.')
        create_move(1, 'Bash',            OochType.Neutral,20,100,   -1,0,           'The target is dealt some blunt damage.')
        create_move(2, 'Spore Shot',      OochType.Fungal,30,100,    -1,0,           'A puff of spore burst from the user\'s body.')
        create_move(3, 'Pebble Blast',    OochType.Stone,30,100,     -1,0,           'Fires a barrage of small pebbles.')
        create_move(4, 'Fireball',        OochType.Flame,30,100,     -1,0,           'Shoots a ball of fire at the target.')
        create_move(5, 'Slash',           OochType.Neutral,50,95,    -1,0,           'The user slashes at the target with sharp appendages.')
        create_move(6, 'Take Over',       OochType.Fungal,35,90,     'infected',100, 'Fungal spores are launched which INFECT the target.')
        create_move(7, 'Dust Storm',      OochType.Stone,30,90,      'blinded',100,  'A storm is whipped up which leaves the target BLINDED.')
        create_move(8, 'Engulf',          OochType.Flame,40,90,      'burned',100,   'The target is BURNED by red-hot flames.')
        create_move(9, 'Impale',          OochType.Neutral,80,100,   -1,0,           'Impales the target with a spike.')
        create_move(10,'Bloom',           OochType.Fungal,70,90,     -1,0,           'Explosive spores are launched at the target to deal damage.')
        create_move(11,'Boulderdash',     OochType.Stone,70,90,      -1,0,           'Flings a massive boulder at the target.')
        create_move(12,'Torch',           OochType.Flame,70,90,      -1,0,           'The user hits the target to deal damage')
        create_move(13,'Blight',          OochType.Fungal,60,90,     'blinded',50,   'If the infection takes hold, the target is BLINDED.')
        create_move(14,'Lava Lance',      OochType.Stone,65,95,      'burned',50,    'Red-hot stone is launched to BURN the target.')
        create_move(15,'Tumorize',        OochType.Flame,50,95,      'infected',50,  'The user creates radiation in order to INFECT the target.')
        create_move(16,'Glimmer',         OochType.Stone,20,90,      'blinded',100,  'Refracts light in an attempt to BLIND the target.')
        create_move(17,'Gem Bash',        OochType.Stone,110,80,     -1,0,           'Crystallized stones are swung wildly to inflict damage.')
        create_move(18,'Caustic Orb',     OochType.Ooze,60,100,      'burned',75,    'A ball of caustic goo is launched with a high chance of BURNING.')
        create_move(19,'Pulverize',       OochType.Neutral,130,80,   -1,0,           'The target is slammed to deal massive damage.')
        create_move(20,'Ash Blast',       OochType.Flame,50,95,      'blinded',75,   'Hot ashes are launched at the target with a high chance to BLIND.')
        create_move(21,'Inferno',         OochType.Flame,100,70,     'burned',100,   'Anything caught by these wild flames is BURNED')
        create_move(22,'Digitize',        OochType.Tech,50,100,      'digitized',100,'The target becomes DIGITIZED when hit by this strange beam.')
        create_move(23,'Clamp Down',      OochType.Neutral,45,100,   'snared',30,    'Clamps down tight on the target to deal damage and SNARE them if you get lucky.')
        create_move(24,'Magic Bolt',      OochType.Magic,30,100,     -1,0,           'Fires a bolt of magic energy.')
        create_move(25,'Sparkler',        OochType.Flame,40,100,     'blinded',30,   'Shoots bright sparks with the potential to BLIND.')
        create_move(26,'Arca Strike',     OochType.Magic,80,90,      -1,0,           'Fires a powerful burst of magic.')
        create_move(27,'Call Thunder',    OochType.Magic,60,90,      'burned',50,    'Causes a great bolt of lightning to crash on the enemy, potentially BURNING them.')
        create_move(28,'Sticky Orb',      OochType.Ooze,80,90,       'snared',60,    'Fling a orb of goo that can SNARE the target.')
        create_move(29,'Glob',            OochType.Ooze,30,100,      -1,0,           'Pelts the target with a viscous ooze.')
        create_move(30,'Blink',           OochType.Magic,10,100,     'doubled',100,  'Travels to a different time to damage the target again, DOUBLING the next damage they take.')
        create_move(31,'Time Warp',       OochType.Magic,50,80,      'doubled',50,   'Attempts to DOUBLE the next damage the opponent takes by damaging them in the future.')
        create_move(32,'Mycelium Whip',   OochType.Fungal,50,90,     'snared',50,    'Shoots whips made of mycelium in an attempt to SNARE the opponent.')
        create_move(33,'Parasitize',      OochType.Ooze,30,100,      'infected',50,  'Parasitic bodies are launched at the target potentially INFECTING them.')
        create_move(34,'Corrode',         OochType.Ooze,70,80,       'doubled',30,   'Powerful acids are weaken the targets defenses, potentially DOUBLING the next damage they take.')
        create_move(35,'Grind',           OochType.Stone,80,90,      -1,0,           'Grinds against the opponent with rough, jagged edges.')
        create_move(36,'Metal Lance',     OochType.Tech,70,90,       -1,0,           'Stabs the opponent with a metallic object.')
        create_move(37,'Iron Hammer',     OochType.Tech,50,100,      -1,0,           'A heavy, metal object is hammered against the target.')
        create_move(38,'Laminate',        OochType.Tech,30,90,       'snared',100,   'Covers the target in a tough plastic substance to SNARE them.')
        create_move(39,'Entomb',          OochType.Stone,60,80,      'snared',50,    'Causes stones to fall onto the target, leaving them SNARED if they get trapped.')
        create_move(40,'undefined_int',   OochType.Void,100,100,     -1,0,           'TEST MOVE')
        
        ////NEW MOVES 
        create_move(41,'Strike',          OochType.Neutral,20,100,  'critical',30,   'A targeted strike that is likely to land a Critical Hit.')
        create_move(42,'Barrage',         OochType.Tech,100,80,     'recoil',30,     'Devastating blasts damage the target, the user is hit with Recoil.')
        create_move(43,'Eruption',        OochType.Flame,70,100,    'recoil',20,     'Blazing heat erupts from the user, damaging itself and the opponent.')
        create_move(44,'Self Destruct',   OochType.Tech,250,100,    'recoil',100,    'The user self destructs to inflict massive damage.')
        create_move(45,'Siphon',          OochType.Fungal,20,100,   'vampire',10,    'The user damages the opponent, slightly Healing itself in the process.')
        create_move(46,'Drain Life',      OochType.Magic,50,50,     'vampire',50,    'A horribly innacurate move with the potential to greatly heal the user.')
        create_move(47,'Restruct',        OochType.Stone,0,-100,    'heal',25,       'Stones are reorganized in the user\'s body to restore some HP.')
        create_move(48,'Flurry',          OochType.Tech,75,90,      'critical',50,   'A flurry of steel blades shred the target, with a high chance to land a Critical Hit.')
        create_move(49,'Crash Landing',   OochType.Stone,90,90,     'recoil',20,     'The user falls down from the sky inflicting high damage, but injuring itself.')
        create_move(50,'Solar Blast',     OochType.Flame,85,100,    'blinded',50,    'Lob a brilliant ball of flame, potentially BLINDING the target.')
        create_move(51,'Tangled Threads', OochType.Neutral,70,100,  'snared',30,     'Threads are shot at the target dealing damage with a chance to SNARE them.')
        create_move(52,'Fated Threads',   OochType.Magic,80,100,    'snared',50,     'Magical threads fly through the air in an attempt to SNARE the target.')
        create_move(53,'Sync Strike',     OochType.Neutral,70,100,  'typematch',100, 'Launch a ball of energy synchronized with the user\'s type')
        create_move(54,'Threefold',       OochType.Neutral,90,90,   'critical',30,   'The target is struck repeatedly, leaving it open to Critical Hits.')
        create_move(55,'Glass Blades',    OochType.Stone,80,70,     'critical',50,   'Brittle blades are used to strike at the opponent\'s weak spots.')
        create_move(56,'Gravitate',       OochType.Magic,60,100,     -1,0,            'The user manipulates gravity to fling itself at the target.')
        create_move(57,'Tenderize',       OochType.Neutral,120,70,  'recoil',30,     'The user slams its body into the opponent, but is hit with recoil.')
        
        ////MORE NEW MOVES
        create_move(58,'Byte Bite',       OochType.Tech,30,100,     -1,0,            'Form digital jaws that clamp down on the target.')
        create_move(59,'Sawblade',        OochType.Tech,50,100,     -1,0,            'The user hits the target with a metal blade.')
        create_move(60,'Soften',          OochType.Ooze,0,-100,     '+_def_25',100,  'Softens the body making it harder to damage, increasing its DEF.')
        create_move(61,'Embolden',        OochType.Neutral,0,-100,  '+_atk_25',100,  'Prepares the user to fight with all its strength, increasing its ATK.')
        create_move(62,'Hasten',          OochType.Neutral,0,-100,  '+_spd_25',100,  'The user readies itself to move quickly, increasing its SPD.')
        create_move(63,'Brittle',         OochType.Stone,0,100,     '-_def_25',100,  'Makes the opponent\'s body brittle, lowering its DEF.')
        create_move(64,'Intimidate',      OochType.Neutral,0,100,   '-_atk_25',100,  'Glare at the opponent, lowering its DEF.')
        create_move(65,'Mud',             OochType.Ooze,0,100,      '-_spd_25',100,  'Throw mud on the opponent, lowering its SPD.')
        create_move(66,'Hype-Up',         OochType.Neutral,0,-100,  '+_atk_25|+_spd_25',100, 'Hypes up the user, increasing its ATK and SPD.')
        create_move(67,'Sharpen',         OochType.Tech,0,-100,     '+_atk_50',-100, 'Sharpens any edges the user has, greatly increasing its ATK.')
        create_move(68,'Cursed Eye',      OochType.Magic,10,100,    'blinded|burned',100, 'Curses the opponent, applying BLINDED and BURNED.')
        create_move(69,'Suplex',          OochType.Neutral,60,100,  '-_def_25',100,  'Suplex the opponent, damaging them and reducing DEF.')
        create_move(70,'Enfeebling Spore',OochType.Fungal,30,100,   '-_atk_25|-_spd_25',100, 'Launch a damaging spore at the opponent which lowers ATK and SPD.')
        create_move(71,'Torque',          OochType.Tech,0,-100,     '-_spd_50|+_atk_100',100, 'Reduce the user\'s SPD to massively increase ATK.')
        create_move(72,'Slow Burn',       OochType.Flame,0,-100,    '-_atk_25|+_def_50',100, 'Cool the user\'s flame, greatly increasing DEF at the cost of some SPD.')
        create_move(73,'Kaleidoscope',    OochType.Magic,50,100,    'blinded|snared',100, 'Disorient the opponent in a room that BLINDS and SNARES', [MoveTag.Light])
        create_move(74,'Blinding Beam',   OochType.Flame,75,80,     'blinded',100,   'Fire a brilliant beam of light that BLINDS the opponent.', [MoveTag.Light])
        create_move(75,'Overgrowth',      OochType.Fungal,0,-100,   '+_atk_25|+_def_25|+_spd_25',100,   'Rapid fungal growth increases ATK, DEF and SPD.')
        create_move(76,'Myco-Burst',      OochType.Fungal,75,80,    'blinded',100,   'Fire a spore-filled bomb which BLINDS the opponent.')
        create_move(77,'Thorn Shot',      OochType.Fungal,60,90,    'critical',50,   'Shoot a condensed fungal thorn with a high crit chance.')
        create_move(78,'Slurp Up',        OochType.Ooze,0,-100,     'heal',50,       'The user gathers missing parts of its body to restore half its HP.')
        create_move(79,'Digital Gamble',  OochType.Tech,0,-100,     'random',100,    'The user randomly uses a move.')
        create_move(80,'Sedimentation',   OochType.Stone,0,-100,    '+_def_50',100,  'Spend the turn gathering stone to greatly increase DEF.')
        create_move(81,'Plasma Cannon',   OochType.Flame,120,70,    -1,0,            'A high damage blast of extreme heat.')
        create_move(82,'Phantom Bullet',  OochType.Magic,30,100,    'critical',100,  'Fire a highly accurate ghost bullet that always crits.')
        create_move(83,'Firey Horn',      OochType.Flame,75,100,    'burned',50,     'Attack with blazing horns that have a chance to BURN the target.')
        create_move(84,'Radiate',         OochType.Flame,0,100,     '-_atk_50|burned',100, 'Release stored-up heat to BURN the target and reduce its ATK.')
        create_move(85,'Caltrops',        OochType.Neutral,20,100,  '-_spd_25',100,  'Scatter damaging spikes that damage and reduce the target\'s SPD')
        create_move(86,'Lurk',            OochType.Neutral,0,-100,  '+_atk_25|+_crit_10', 'Lurk in the shadows boosting ATK and crit chance.')
        create_move(87,'Fog',             OochType.Neutral,0,100,   '-_acc_10',100,  'Spray thick fog which reduces accuracy.')
        create_move(88,'Purify',          OochType.Neutral,0,-100,  'clear_status',100, 'Remove all status effects.')
        create_move(89,'Reset',           OochType.Neutral,0,-100,  'clear_multi',100, 'Reset all stat multipliers to 1.')
        create_move(90,'Debug Bomb',      OochType.Tech,100,80,     'clear_status',100, 'Fire a high-damage bomb that clears any status effects from its target.')
        create_move(91,'Entrench',        OochType.Fungal,0,-100,   '+_def_75|snared',100, 'Becomes SNARED, but greatly boosts DEF.')
        create_move(92,'Null Sphere',     OochType.Void,60,100,     -1,0,            'Fire a sphere of dark matter.')

        //#endregion

        // ADD TO THE TYPES.JS FILE WHEN ADDING NEW ONES
        //#region Ability Data
        //             ID,  NAME,               Description
        create_ability(0,  'Miniscule',         'Becomes super small and increases evasion against attacks by 1 stage.');
        create_ability(1,  'Icky',              'Boosts the power of OOZE & FUNGAL type attacks by 20%.');
        create_ability(2,  'Burdened',          'A large growth reduces SPD by 1 stage but raises DEF by 1 stage');
        create_ability(3,  'Broodmother',       'Gains 1 stage of ATK for each Oochamon with the same type in the party.'); 
        create_ability(4,  'Tough',             'A durable body grants a 1 stage increase to DEF.');  
        create_ability(5,  'Shadow',            'Grants a 25% chance to VANISH after being attacked.'); 
        create_ability(6,  'Withering',         'Loss of the body reduces HP by 5% each turn, but raises SPD by 2 stages.');  
        create_ability(7,  'Darkbright',        'Attacks that afflict BURN also BLIND and vice-versa.');  
        create_ability(8,  'Gentle',            'A kind heart reduces both your ATK and the enemy ATK by 1 stage.');  
        create_ability(9,  'Warm',              'Increases the damage of FLAME attacks by 10%.');  
        create_ability(10, 'Radiant',           'Dangerous energy causes attacks that BURN also INFECT.'); 
        create_ability(11, 'Conflicted',        'Multiple minds increase ALL stats by 1 stage.'); 
        create_ability(12, 'Burrower',          'Increases the damage of STONE attacks by 10%.'); 
        create_ability(13, 'Reactive',          'When hit by an attack, reflects 5% of the attacker\'s HP as damage.'); 
        create_ability(14, 'Inertia',           'Increases SPD by 1 stage each turn.'); 
        create_ability(15, 'Dense',             'Increases ATK by 1 stage but reduces SPD by 1 stage.');  
        create_ability(16, 'Moist',             'Halves all incoming FLAME damage.'); 
        create_ability(17, 'Alert',             'Increases ATK by 1 stage when an Oochamon switches in.');  
        create_ability(18, 'Fleeting',          'Increases SPD and ATK by 4 stages but also loses half of current HP each turn.'); 
        create_ability(19, 'Efficient',         'Increases ATK by 1 stage each turn.'); 
        create_ability(20, 'Boisterous',        'Shatters eardrums when it enters the field dealing 10% of the enemy\'s HP');
        create_ability(21, 'Haunted',           'Applies the DOOMED status to an enemy when the holder of the ability dies.'); 
        create_ability(22, 'Leech',             'Restores HP equal to 10% of damage done to the enemy.'); 
        create_ability(23, 'Ensnare',           'Grants a 30% chance to SNARE an enemy when attacking.');  
        create_ability(24, 'Uncontrolled',      'Increases ATK by 4 stages but randomly chooses an attack each turn');  
        create_ability(25, 'Apprentice',        'Increases ATK by 2 stages if any other party members share a move with it.');  
        create_ability(26, 'Focused',           'Increases damage of attacks by 10% if unaffected by status effects.'); 
        create_ability(27, 'Ravenous',          'Restores 20% of max HP upon defeating an enemy.'); 
        create_ability(28, 'Immense',           'Increases DEF by 2 stages but also makes opponent\'s moves always hit.');  
        create_ability(29, 'Armored',           'Reduces STONE damage by 20%.');
        create_ability(30, 'Scorching',         'Attacks that can BURN always BURN.'); 
        create_ability(31, 'Tangled',           'Causes enemies that hit it to be SNARED.'); 
        create_ability(32, 'Mundane',           'Cannot be affected by Status Effects.'); 
        create_ability(33, 'Rogue',             'DOUBLES the damage dealt to full HP enemies.'); 
        create_ability(34, 'Crystallize',       'Boosts the power of Ooze, Flame, and Stone attacks by 30%.'); 
        create_ability(35, 'Lacerating',        'All attacks do an extra attack to an enemy, dealing 5% of their max HP.'); 
        create_ability(36, 'Gravity',           'Attacks deal 1% more damage per number of turns in this battle.');
        create_ability(37, 'Sporespray',        'INFECTS the enemy when defeated.'); 
        create_ability(38, 'Frostbite',         'Attacks that strike an enemy reduce their SPD by 1 stage.'); 
        create_ability(39, 'Bipolar',           'Use the DEF stat when dealing damage.'); 
        create_ability(40, 'Hexiply',           'Attacks deal 6% more damage per sixth of HP remaining.'); 
        create_ability(41, 'Nullify',           'Change an opponents ability to Null while out on the field.'); 
        create_ability(42, 'Duplicant',         'Copy the opponent\'s ability.'); 
        create_ability(43, 'Null',              'Does nothing.');
        create_ability(44, 'invalid_entry',     'I̵͑n̵̤̚c̶̥̈r̴͛͜e̵̛̖a̴̺͗s̵̼̑e̶s̵̺̈ a̶͙͗l̶̖͆l̸̠͐ ̸̪̐b̴͎̋a̸̖̅s̶͖̚ë̴̫́ ̵̹̔ş̶̽t̶̟̎a̴̪̾t̴̥̂ş̵̈́ ̵̱̉ū̵͜p̸̗̆ô̶̰ņ̴̓ ̵̳͋d̵̹̑e̵͎̕a̷͔͐t̵͉͋h̷̰̋.̴̫͘ ̶͈́C̸͙̈a̶̰̔ṅ̵̯n̵̬̾o̶̒ͅt̷̪̎ ̵̆͜b̴͎̄ȩ̸͗ ̵̜͛c̴̰̈́o̴̢͒p̸̣͛i̷̗̍ê̸͈d̶̹͌.̵͍̈'); // Increase the global counter for i's stats by 1 upon losing to a player, resets its stats to 1 upon defeating a player
        create_ability(45, 'Immobile',          'Always go last when attacking.');
        create_ability(46, 'Strings Attached',  '20% chance to apply a randomly apply BURN, INFECT, BLIND, or SNARE when attacking.');
        create_ability(47, 'Corrosive',         'Attacks deal more damage to enemies with high DEF.');
        create_ability(48, 'Spectral',          'Changes type to Magic every other turn.');
        create_ability(49, 'Height Advantage',  'Increases chance to do a critical hit by 10%.');
        create_ability(50, 'Hearty',            'Increases damage done by 15% while above 50% HP.'); 
        create_ability(51, 'Radioactive',       'Changes type to Flame every other turn.');
        create_ability(52, 'Energized',         'Increases ATK and SPD by 1 stage on kill.'); 
        create_ability(53, 'Patient',           'Increases DEF by 1 stage each turn.'); 
        create_ability(54, 'Easy Go',           'Heals the rest of your party by 20% of their max HP when defeated.');
        create_ability(55, 'Bomber',            'Halves the enemy HP on death.');
        create_ability(56, 'Flammable',         'Gains 1 stage of ATK when hit with a FLAME type move.');
        create_ability(57, 'Hole Dweller',      'Gets the Vanished status at the end of every other turn.');
        create_ability(58, 'Power Conduit',     'Boosts the power of FLAME moves against OOZE and TECH types by 50%.');
        create_ability(59, 'Liquid Cooled',     'Prevents BURN and boosts the power of TECH type moves by 25%.'); 
        create_ability(60, 'Increment',         'Randomly boosts a stat by 1 stage at the end of each turn.');
        create_ability(61, 'Parry',             'Reduces damage taken by 20%. When hit by an attack, this ability becomes Riposte.');
        create_ability(62, 'Riposte',           'Increases damage dealt by 20%. After attacking or the turn ends, this ability becomes Parry.');
        create_ability(63, 'Swaying',           'Increases DEF by 1 stage but lowers accuracy by 1 stage.');
        create_ability(64, 'Thrashing',         'Increases ATK by 1 stage but lowers evasion by 1 stage.');
        create_ability(65, 'Union',             'Increases ATK and DEF by 1 stage.');

        //#endregion

        // ADD TO THE TYPES.JS FILE WHEN ADDING NEW ONES
        //#region Status Data
        //            ID,  NAME,        EMOTE                                       DESCRIPTION
        create_status(0,   'Burned',    '<:status_burned:1023031032083128441>',     'Burns the Oochamon at the end of each turn, dealing damage.');
        create_status(1,   'Infected',  '<:status_infected:1023031033744076930>',   'Saps HP from the infected Oochamon, giving it to their opponent.');                                                                   
        create_status(2,   'Blinded',   '<:status_blinded:1023031030837416057>',    'Blinds the Oochamon, reducing its accuracy.');
        create_status(3,   'Digitized', '<:status_digitized:1023031032934576178>',  'Digitizes the Oochamon, changing its type forcefully to Tech while it is Digitized.');
        create_status(4,   'Snared',    '<:status_snared:1023031034733940798>',     'Ensnares the Oochamon, forcing it to go second in battle.');
        create_status(5,   'Vanished',  '<:status_vanish:1023053679328231424>',     'The Oochamon vanishes, making it impossible to hit for a turn, reappearing afterwards.');
        create_status(6,   'Doomed',    '<:status_doomed:1023053678179012648>',     'The Oochamon becomes marked for death, dying after 3 turns in battle unless switched out.');
        create_status(7,   'Doubled',   '<:status_doubled:1170203311199240302>',    'The Oochamon goes into a vulnerable state, taking double damage from the next attack its hit by.');
        
        //#endregion



        //#region Creature Data
        //ID, Emote, Name, Image, 
        //Description, Type, HP, ATK, DEF, SPD,
        //Move List[[Lvl,ID]...],
        //Abilities, Pre-Evolution ID, Evolution ID, Evolution Level, Evolution Stage

        // Sporbee
        create_monster({
            id: 0,
            emote: get_emote_string(client, 'sporbee'),
            name: 'Sporbee',
            oochive_entry: 'An insect that dwells in fungal forests. Every day it risks infection to provide for its hive.', 
            type: [OochType.Fungal],
            hp: 8, atk: 12, def: 8, spd: 12, //total 40
            move_list: [ [1, Move.Bash], [2, Move.Embolden], [3, Move.SporeShot], [7, Move.Slash], 
             [10, Move.Siphon], [13, Move.TakeOver], [17, Move.Bloom], [27, Move.Blight],
             [-1, Move.CausticOrb] ],
            abilities: [ Ability.Miniscule, Ability.Icky ],
            pre_evo_id: -1, evo_id: 1, evo_lvl: 11, evo_stage: 0
        });
        
        // Stingrowth
        create_monster({
            id: 1,
            emote: get_emote_string(client, 'stingrowth'),
            name: 'Stingrowth',
            oochive_entry: 'A strange protrusion is growing on this hive soldier, slowly gaining control over its movements.', 
            type: [OochType.Fungal],
            hp: 15, atk: 20, def: 11, spd: 14, //total 60
            move_list: [ [1, Move.Bash], [2, Move.Embolden], [3, Move.SporeShot], [7, Move.Slash],
             [10, Move.Siphon], [13, Move.TakeOver], [17, Move.Bloom], [27, Move.Blight], 
             [-1, Move.CausticOrb] ],
            abilities: [ Ability.Burdened, Ability.Icky ],
            pre_evo_id: 0, evo_id: 2, evo_lvl: 25, evo_stage: 1
        });
        
        // Queenect
        create_monster({
            id: 2,
            emote: get_emote_string(client, 'queenect'),
            name: 'Queenect',
            oochive_entry: 'A hive queen, completely overtaken by fungus. It continues to produce infected offspring even in this state.', 
            type: [OochType.Fungal],
            hp: 25, atk: 25, def: 16, spd: 14, //total 80
            move_list: [ [1, Move.Bash], [2, Move.Embolden], [3, Move.SporeShot], [7, Move.Slash], 
             [10, Move.Siphon], [13, Move.TakeOver], [17, Move.Bloom], [27, Move.Blight], 
             [-1, Move.CausticOrb] ],
            abilities: [ Ability.Burdened, Ability.Broodmother ],
            pre_evo_id: 1, evo_id: -1, evo_lvl: -1, evo_stage: 2
        });
        
        // Roocky
        create_monster({
            id: 3,
            emote: get_emote_string(client, 'roocky'),
            name: 'Roocky',
            oochive_entry: 'A ancient, crumbling pillar. The shadows beneath it are oddly comforting.', 
            type: [OochType.Stone],
            hp: 12, atk: 8, def: 12, spd: 8, //total 40
            move_list: [ [1, Move.Bash], [2, Move.Brittle], [3, Move.PebbleBlast], [8, Move.DustStorm],
             [11, Move.Sharpen], [17, Move.Boulderdash], [27, Move.LavaLance], [-1, Move.AshBlast] ],
            abilities: [ Ability.Tough, Ability.Shadow ],
            pre_evo_id: -1, evo_id: 4, evo_lvl: 11, evo_stage: 0
        });
        
        // Graknight
        create_monster({
            id: 4,
            emote: get_emote_string(client, 'graknight'),
            name: 'Graknight',
            oochive_entry: 'The stones have continued deteriorating revealing a gremlin-like form, it wields fragments of its former body as a spear.', 
            type: [OochType.Stone],
            hp: 18, atk: 15, def: 15, spd: 12, //total 60
            move_list: [ [1, Move.Bash], [2, Move.Brittle], [3, Move.PebbleBlast], [8, Move.DustStorm], 
             [11, Move.Sharpen], [17, Move.DustStorm], [27, Move.LavaLance], [-1, Move.AshBlast] ],
            abilities: [ Ability.Withering, Ability.Shadow ],
            pre_evo_id: 3, evo_id: 5, evo_lvl: 25, evo_stage: 1
        });
        
        // Kracking
        create_monster({
            id: 5,
            emote: get_emote_string(client, 'kracking'),
            name: 'Kracking',
            oochive_entry: 'Its body continues to wither away, freeing the shadows inside. The diamond eye in its center is its sole source of power.', 
            type: [OochType.Stone],
            hp: 22, atk: 18, def: 22, spd: 18, //total 80
            move_list: [ [1, Move.Bash], [2, Move.Brittle], [3, Move.PebbleBlast], [8, Move.DustStorm], 
             [11, Move.Sharpen], [17, Move.DustStorm], [27, Move.LavaLance], [-1, Move.AshBlast] ],
            abilities: [ Ability.Withering, Ability.Darkbright ],
            pre_evo_id: 4, evo_id: -1, evo_lvl: -1, evo_stage: 2
        });
        
        // Puppyre
        create_monster({
            id: 6,
            emote: get_emote_string(client, 'puppyre'),
            name: 'Puppyre',
            oochive_entry: 'A very good boy, empowered by the spiraling patterns on its body.', 
            type: [OochType.Flame],
            hp: 10, atk: 12, def: 8, spd: 10, //total 40
            move_list: [ [1, Move.Bash], [2, Move.Intimidate], [3, Move.Fireball], [8, Move.Engulf],
             [11, Move.Torch], [17, Move.ClampDown], [20, Move.SlowBurn], [27, Move.Tumorize], 
             [-1, Move.Inferno] ],
            abilities: [ Ability.Gentle, Ability.Warm ],
            pre_evo_id: -1, evo_id: 7, evo_lvl: 11, evo_stage: 0
        });
        
        // Dogglow
        create_monster({
            id: 7,
            emote: get_emote_string(client, 'dogglow'),
            name: 'Dogglow',
            oochive_entry: 'The etchings empowering its body have become corrupted, its flame now glows a sickly yellow.', 
            type: [OochType.Flame],
            hp: 13, atk: 18, def: 14, spd: 15, //total 60
            move_list: [ [1, Move.Bash], [2, Move.Intimidate], [3, Move.Fireball], [8, Move.Engulf],
             [11, Move.Torch], [17, Move.ClampDown], [20, Move.SlowBurn], [27, Move.Tumorize], 
             [-1, Move.Inferno] ],
            abilities: [ Ability.Gentle, Ability.Radiant ],
            pre_evo_id: 6, evo_id: 8, evo_lvl: 25, evo_stage: 1
        });
        
        // Hounuke
        create_monster({
            id: 8,
            emote: get_emote_string(client, 'hounuke'),
            name: 'Hounuke',
            oochive_entry: 'Its body now radiates an eerie green, the once-pure etchings now shimmer and contort on its oozing skin.', 
            type: [OochType.Flame],
            hp: 16, atk: 26, def: 18, spd: 20, //total 80
            move_list: [ [1, Move.Bash], [2, Move.Intimidate], [3, Move.Fireball], [8, Move.Engulf], 
             [11, Move.Torch], [17, Move.ClampDown], [20, Move.SlowBurn], [27, Move.Tumorize], 
             [-1, Move.Inferno] ],
            abilities: [ Ability.Conflicted, Ability.Radiant ],
            pre_evo_id: 7, evo_id: -1, evo_lvl: -1, evo_stage: 2
        });

        // Glither
        create_monster({
            id: 9,
            emote: get_emote_string(client, 'glither'),
            name: 'Glither',
            oochive_entry: 'Its diamond-hard skin protects it from the most brutal of sandstorms.', 
            type: [OochType.Stone],
            hp: 15, atk: 9, def: 14, spd: 12, //total 50
            move_list: [ [1, Move.Bash], [2, Move.Intimidate], [3, Move.PebbleBlast], [8, Move.Slash], 
             [13, Move.DustStorm], [15, Move.Sedimentation], [21, Move.Impale], [27, Move.Glimmer], 
             [34, Move.Entomb], [-1, Move.GemBash] ],
            abilities: [ Ability.Tough, Ability.Reactive ],
            pre_evo_id: -1, evo_id: 10, evo_lvl: 12, evo_stage: 0
        });
        
        // Sparafura
        create_monster({
            id: 10,
            emote: get_emote_string(client, 'sparafura'),
            name: 'Sparafura',
            oochive_entry: 'These dangerous serpents are found beneath the desert sands. Their crushing bite shatters bone with ease.', 
            type: [OochType.Stone],
            hp: 18, atk: 25, def: 16, spd: 11, //total 70
            move_list: [ [1, Move.Bash], [2, Move.Intimidate], [3, Move.PebbleBlast], [8, Move.Slash],
             [13, Move.DustStorm], [15, Move.Sedimentation], [21, Move.Impale], [27, Move.Glimmer], 
             [34, Move.Entomb], [-1, Move.GemBash] ],
            abilities: [ Ability.Burrower, Ability.Reactive ],
            pre_evo_id: 9, evo_id: -1, evo_lvl: -1, evo_stage: 1
        });
        
        // Constone
        create_monster({
            id: 11,
            emote: get_emote_string(client, 'constone'),
            name: 'Constone',
            oochive_entry: 'Found on salt flats, these strange beings move about on a single wheel rather than legs.', 
            type: [OochType.Stone],
            hp: 10, atk: 10, def: 10, spd: 20, //total 50
            move_list: [ [1, Move.Bash], [2, Move.Hasten], [4, Move.PebbleBlast], [7, Move.MagicBolt], 
             [11, Move.Restruct], [18, Move.Boulderdash], [26, Move.Grind], [-1, Move.ArcaStrike] ],
            abilities: [ Ability.Inertia, Ability.Dense ],
            pre_evo_id: -1, evo_id: 12, evo_lvl: 15, evo_stage: 0
        });
        
        // Amephyst
        create_monster({
            id: 12,
            emote: get_emote_string(client, 'amephyst'),
            name: 'Amephyst',
            oochive_entry: 'The crystals that make up the core of its body have overtaken its left arm, creating a dangerous weapon.', 
            type: [OochType.Stone],
            hp: 15, atk: 20, def: 15, spd: 30, //total 80
            move_list: [ [1, Move.Bash], [2, Move.Hasten], [4, Move.PebbleBlast], [7, Move.MagicBolt], 
             [11, Move.Restruct], [18, Move.Boulderdash], [26, Move.Grind], [33, Move.GemBash], 
             [-1, Move.ArcaStrike] ],
            abilities: [ Ability.Inertia, Ability.Dense ],
            pre_evo_id: 11, evo_id: -1, evo_lvl: -1, evo_stage: 1
        });
        
        // Widew
        create_monster({
            id: 13,
            emote: get_emote_string(client, 'widew'),
            name: 'Widew',
            oochive_entry: 'The growth on its back forms a symbiotic relationship with the host, maximizing the amount of nutrients each can absorb.', 
            type: [OochType.Fungal],
            hp: 14, atk: 10, def: 9, spd: 12, //total 35
            move_list: [ [1, Move.Hit], [2, Move.Mud], [3, Move.SporeShot], [7, Move.Impale],
             [11, Move.StickyOrb], [17, Move.ThornShot], [23, Move.MycoBurst], [-1, Move.Glimmer] ],
            abilities: [ Ability.Moist, Ability.Miniscule ],
            pre_evo_id: -1, evo_id: 14, evo_lvl: 9, evo_stage: 0
        });
        
        // Tarotula
        create_monster({
            id: 14,
            emote: get_emote_string(client, 'tarotula'),
            name: 'Tarotula',
            oochive_entry: 'The fine hairs on its back help it detect nearby movement making ambushing this giant spider surprisingly difficult.', 
            type: [OochType.Fungal],
            hp: 21, atk: 17, def: 12, spd: 15, //total 65
            move_list: [ [1, Move.Hit], [2, Move.Mud], [3, Move.SporeShot], [7, Move.Impale], 
             [11, Move.StickyOrb], [17, Move.TakeOver], [23, Move.MycoBurst], [32, Move.Bloom], 
             [-1, Move.Glimmer] ],
            abilities: [ Ability.Moist, Ability.Alert ],
            pre_evo_id: 13, evo_id: -1, evo_lvl: -1, evo_stage: 1
        });
        

        //Moldot
        create_monster({
            id: 15,
            emote: get_emote_string(client, 'moldot'),
            name: 'Moldot',
            oochive_entry: 'Novice explorers are often shocked by just how much of this creature is buried beneath the surface.',
            type: [OochType.Fungal],
            hp: 5, atk: 5, def: 25, spd: 5, //total 40
            move_list: [
                [1, Move.Bash],[2, Move.Soften],[5, Move.SporeShot],[12, Move.TakeOver],
                [17, Move.ClampDown],[20, Move.SlurpUp],[24, Move.Pulverize],[40, Move.Blight],
                [-1, Move.Entomb]
            ],
            abilities: [ Ability.Gentle, Ability.Burrower ],
            pre_evo_id: -1, evo_id: 16, evo_lvl: 26, evo_stage: 0
        })

        // Moldire
        create_monster({
            id: 16,
            emote: get_emote_string(client, 'moldire'),
            name: 'Moldire',
            oochive_entry: 'Its body is no longer able to fully fit in the crevice it grew up in, forcing its body to grow a defensive maw.',
            type: [OochType.Fungal],
            hp: 25, atk: 25, def: 30, spd: 5, //total 85
            move_list: [
                [1, Move.Bash],[2, Move.Soften],[5, Move.SporeShot],[12, Move.TakeOver],
                [17, Move.ClampDown],[20, Move.SlurpUp],[24, Move.Pulverize],[40, Move.Blight],
                [45, Move.Corrode],[-1, Move.Entomb]
            ],
            abilities: [ Ability.Gentle, Ability.Reactive ],
            pre_evo_id: 15, evo_id: -1, evo_lvl: -1, evo_stage: 1
        })

        // Charlite
        create_monster({
            id: 17,
            emote: get_emote_string(client, 'charlite'),
            name: 'Charlite',
            oochive_entry: 'Its life is tied to whatever it is currently burning, these creatures live a frail, fleeting life.',
            type: [OochType.Flame],
            hp: 5, atk: 15, def: 5, spd: 10, //total 35
            move_list: [
                [1, Move.Hit],[2, Move.Embolden],[4, Move.Fireball],[10, Move.DustStorm],
                [16, Move.Sparkler],[22, Move.Engulf],[27, Move.AshBlast],[37, Move.Torch],
                [-1, Move.Inferno]
            ],
            abilities: [ Ability.Fleeting, Ability.Warm ],
            pre_evo_id: -1, evo_id: 18, evo_lvl: 10, evo_stage: 0
        })

        // Darcoal
        create_monster({
            id: 18,
            emote: get_emote_string(client, 'darcoal'),
            name: 'Darcoal',
            oochive_entry: 'This flame has lived a surprisingly long life. It slowly burns its surroundings, covering the area in a thick black smoke.',
            type: [OochType.Flame],
            hp: 15, atk: 25, def: 13, spd: 12, //total 65
            move_list: [
                [1, Move.Hit],[2, Move.Embolden],[4, Move.Fireball],[10, Move.DustStorm],
                [16, Move.Sparkler],[22, Move.Engulf],[27, Move.AshBlast],[37, Move.Torch],
                [-1, Move.Inferno]
            ],
            abilities: [ Ability.Efficient, Ability.Warm ],
            pre_evo_id: 17, evo_id: -1, evo_lvl: -1, evo_stage: 1
        })

        // Torchoir
        create_monster({
            id: 19,
            emote: get_emote_string(client, 'torchoir'),
            name: 'Torchoir',
            oochive_entry: 'A sentient torch that hums a haunting tune. Its song fills people with dread.',
            type: [OochType.Flame],
            hp: 12, atk: 13, def: 11, spd: 9, //total 45
            move_list: [
                [1, Move.Bash],[3, Move.Fireball],[4, Move.Embolden],[7, Move.Impale],
                [12, Move.MagicBolt],[17, Move.Torch],[21, Move.ClampDown],[27, Move.Blink],
                [-1, Move.ArcaStrike]
            ],
            abilities: [ Ability.Boisterous, Ability.Haunted ],
            pre_evo_id: -1, evo_id: 20, evo_lvl: 18, evo_stage: 0
        })


        // Chantern
        create_monster({
            id: 20,
            emote: get_emote_string(client, 'chantern'),
            name: 'Chantern',
            oochive_entry: 'It can mimic the human voice nearly perfectly, though it only speaks in random phrases.', 
            type: [OochType.Flame],
            hp: 21, atk: 20, def: 24, spd: 15, //total 80
            move_list: [
                [1, Move.Bash], [3, Move.Fireball], [4, Move.Embolden], [7, Move.Impale],
                [12, Move.MagicBolt], [17, Move.Torch], [21, Move.ClampDown], [27, Move.Blink],
                [40, Move.DrainLife], [-1, Move.ArcaStrike]
            ],
            abilities: [Ability.Boisterous, Ability.Haunted],
            pre_evo_id: 19, evo_id: -1, evo_lvl: -1, evo_stage: 1
        })

        // Eluslug
        create_monster({
            id: 21,
            emote: get_emote_string(client, 'eluslug'),
            name: 'Eluslug',
            oochive_entry: 'Oddly malleable despite its metallic body, it feeds on the magnetic wandering stones found in various locations.', 
            type: [OochType.Tech],
            hp: 11, atk: 12, def: 12, spd: 14, //total 50
            move_list: [
                [1, Move.Bash], [2, Move.Soften], [3, Move.ByteBite], [10, Move.Digitize],
                [16, Move.SyncStrike], [24, Move.BlindingBeam], [-1, Move.Laminate]
            ],
            abilities: [Ability.Leech, Ability.Icky],
            pre_evo_id: -1, evo_id: -1, evo_lvl: -1, evo_stage: 0
        })

        // Jellime
        create_monster({
            id: 22,
            emote: get_emote_string(client, 'jellime'),
            name: 'Jellime',
            oochive_entry: 'A jellyfish-like creature, its probing tendrils ensnare whatever they touch.', 
            type: [OochType.Ooze],
            hp: 14, atk: 10, def: 16, spd: 10, //total 50
            move_list: [
                [1, Move.Bash], [2, Move.Soften], [3, Move.Glob], [7, Move.MagicBolt],
                [11, Move.ClampDown], [18, Move.Impale], [25, Move.TangledThreads], [-1, Move.Laminate]
            ],
            abilities: [Ability.Leech, Ability.Icky],
            pre_evo_id: -1, evo_id: 23, evo_lvl: 15, evo_stage: 0
        })

        // Meduslime
        create_monster({
            id: 23,
            emote: get_emote_string(client, 'meduslime'),
            name: 'Meduslime',
            oochive_entry: 'With a strangely developed nervous system, this creature is capable of exploting any weaknesses it finds.', 
            type: [OochType.Ooze],
            hp: 16, atk: 25, def: 19, spd: 15, //total 75
            move_list: [
                [1, Move.Bash], [2, Move.Soften], [3, Move.Glob], [7, Move.MagicBolt],
                [11, Move.ClampDown], [18, Move.Impale], [25, Move.TangledThreads], [-1, Move.Laminate]
            ],
            abilities: [Ability.Leech, Ability.Icky],
            pre_evo_id: 22, evo_id: -1, evo_lvl: -1, evo_stage: 1
        })

        // Tisparc
        create_monster({
            id: 24,
            emote: get_emote_string(client, 'tisparc'),
            name: 'Tisparc',
            oochive_entry: 'The hat-like crystal on its head grants it a magical energy which it cannot quite control.', 
            type: [OochType.Magic],
            hp: 8, atk: 15, def: 7, spd: 10, //total 45
            move_list: [
                [1, Move.Bash], [2, Move.Embolden], [5, Move.MagicBolt], [9, Move.Sparkler],
                [14, Move.ArcaStrike], [16, Move.Kaleidoscope], [21, Move.Glimmer], [26, Move.CallThunder],
                [35, Move.GemBash], [-1, Move.Torch]
            ],
            abilities: [Ability.Uncontrolled, Ability.Apprentice],
            pre_evo_id: -1, evo_id: 25, evo_lvl: 13, evo_stage: 0
        })

        // Wizzap
        create_monster({
            id: 25,
            emote: get_emote_string(client, 'wizzap'),
            name: 'Wizzap',
            oochive_entry: 'It has mastered control of its crystal and uses it to produce highly dangerous magic arcs.', 
            type: [OochType.Magic],
            hp: 13, atk: 23, def: 12, spd: 12, //total 65
            move_list: [
                [1, Move.Bash], [2, Move.Embolden], [5, Move.MagicBolt], [9, Move.Sparkler],
                [14, Move.ArcaStrike], [16, Move.Kaleidoscope], [21, Move.Glimmer], [26, Move.CallThunder],
                [35, Move.GemBash], [-1, Move.Torch]
            ],
            abilities: [Ability.Focused, Ability.Patient],
            pre_evo_id: 24, evo_id: -1, evo_lvl: -1, evo_stage: 1
        })

        // Blipoint
        create_monster({
            id: 26,
            emote: get_emote_string(client, 'blipoint'),
            name: 'Blipoint',
            oochive_entry: 'An eye peeks through a rift in space-time.', 
            type: [OochType.Magic], 
            hp: 10, atk: 7, def: 6, spd: 7, // total 30
            move_list: [
                [1, Move.Bash], [2, Move.Strike], [5, Move.Blink], [11, Move.HypeUp], 
                [15, Move.Slash], [25, Move.Impale], [35, Move.TimeWarp], [-1, Move.Pulverize]
            ],
            abilities: [Ability.Fleeting, Ability.Reactive], 
            pre_evo_id: -1, evo_id: 27, evo_lvl: 20, evo_stage: 0
        });

        // Rerune
        create_monster({
            id: 27,
            emote: get_emote_string(client, 'rerune'),
            name: 'Rerune',
            oochive_entry: 'What seems to be part of a face begins to emerge from the rift, unable to fully reveal itself.', 
            type: [OochType.Magic], 
            hp: 10, atk: 15, def: 15, spd: 15, // total 55
            move_list: [
                [1, Move.Bash], [2, Move.Strike], [5, Move.Blink], [11, Move.HypeUp], 
                [15, Move.Slash], [25, Move.Impale], [35, Move.TimeWarp], [-1, Move.Pulverize]
            ],
            abilities: [Ability.Fleeting, Ability.Reactive], 
            pre_evo_id: 26, evo_id: 28, evo_lvl: 40, evo_stage: 1
        });

        // Temporath
        create_monster({
            id: 28,
            emote: get_emote_string(client, 'temporath'),
            name: 'Temporath',
            oochive_entry: 'It was not meant to exist here and now, so it experiences episodes of uncontrollable rage.', 
            type: [OochType.Magic], 
            hp: 20, atk: 20, def: 20, spd: 20, // total 80
            move_list: [
                [1, Move.Bash], [2, Move.Strike], [5, Move.Blink], [11, Move.HypeUp], 
                [15, Move.Slash], [25, Move.Impale], [35, Move.TimeWarp], [-1, Move.Pulverize]
            ],
            abilities: [Ability.Uncontrolled, Ability.Withering], 
            pre_evo_id: 27, evo_id: -1, evo_lvl: -1, evo_stage: 2
        });

        // Nucleorb
        create_monster({
            id: 29,
            emote: get_emote_string(client, 'nucleorb'),
            name: 'Nucleorb',
            oochive_entry: 'The nucleus of a cell grown to a massive size, for a cell that is. This rarity is relatively helpless on its own.', 
            type: [OochType.Ooze], 
            hp: 7, atk: 13, def: 9, spd: 11, // total 40
            move_list: [
                [1, Move.Bash], [2, Move.Soften], [5, Move.Glob], [11, Move.Parasitize], 
                [14, Move.CursedEye], [18, Move.Corrode], [24, Move.Pulverize], [-1, Move.Bloom]
            ],
            abilities: [Ability.Miniscule, Ability.Gentle], 
            pre_evo_id: -1, evo_id: 30, evo_lvl: 12, evo_stage: 0
        });

        // Amebite
        create_monster({
            id: 30,
            emote: get_emote_string(client, 'amebite'),
            name: 'Amebite',
            oochive_entry: 'A ravenous macrocell that eats anything in its path, they grow and reproduce quickly enough to overrun entire ecosystems.', 
            type: [OochType.Ooze], 
            hp: 11, atk: 18, def: 12, spd: 14, // total 55
            move_list: [
                [1, Move.Bash], [2, Move.Soften], [5, Move.Glob], [11, Move.Parasitize], 
                [14, Move.CursedEye], [18, Move.Corrode], [24, Move.Pulverize], [-1, Move.Bloom]
            ],
            abilities: [Ability.Tough, Ability.Ravenous], 
            pre_evo_id: 29, evo_id: 31, evo_lvl: 22, evo_stage: 1
        });

        // Amalgrime
        create_monster({
            id: 31,
            emote: get_emote_string(client, 'amalgrime'),
            name: 'Amalgrime',
            oochive_entry: 'When an ecosystem is overrun by Amebite they eventually converge on a single point. The result is a massive, yet oddly gentle being.', 
            type: [OochType.Ooze], 
            hp: 25, atk: 20, def: 20, spd: 20, // total 85
            move_list: [
                [1, Move.Bash], [2, Move.Soften], [5, Move.Glob], [11, Move.Parasitize], 
                [14, Move.CursedEye], [18, Move.Corrode], [24, Move.Pulverize], [30, Move.Suplex], [-1, Move.Bloom]
            ],
            abilities: [Ability.Immense, Ability.Gentle], 
            pre_evo_id: 30, evo_id: -1, evo_lvl: -1, evo_stage: 2
        });

        // Drilline
        create_monster({
            id: 32,
            emote: get_emote_string(client, 'drilline'),
            name: 'Drilline',
            oochive_entry: 'Despite a simplified system, these robots are prone to going rogue. How they sustain themselves in the wild remains a mystery.', 
            type: [OochType.Tech], 
            hp: 11, atk: 14, def: 15, spd: 5, // total 45
            move_list: [
                [1, Move.Bash], [2, Move.Embolden], [4, Move.PebbleBlast], [7, Move.IronHammer], 
                [8, Move.Sedimentation], [12, Move.Entomb], [20, Move.MetalLance], [29, Move.Grind], [-1, Move.Boulderdash]
            ],
            abilities: [Ability.Armored, Ability.Inertia], 
            pre_evo_id: -1, evo_id: 33, evo_lvl: 21, evo_stage: 0
        });

        // Erwrek
        create_monster({
            id: 33,
            emote: get_emote_string(client, 'erwrek'),
            name: 'Erwrek',
            oochive_entry: 'It consumes whatever it can to replace its broken parts, when choices are slim it will even make use of organic material.', 
            type: [OochType.Tech], 
            hp: 15, atk: 19, def: 25, spd: 16, // total 75
            move_list: [
                [1, Move.Bash], [2, Move.Embolden], [4, Move.PebbleBlast], [7, Move.IronHammer], 
                [8, Move.Sedimentation], [12, Move.Entomb], [20, Move.MetalLance], [29, Move.Grind], [-1, Move.Boulderdash]
            ],
            abilities: [Ability.Armored, Ability.Leech], 
            pre_evo_id: 32, evo_id: -1, evo_lvl: -1, evo_stage: 1
        });

        // Purif-i
        create_monster({
            id: 34,
            emote: get_emote_string(client, 'purifi'),
            name: 'Purif-i',
            oochive_entry: 'Cleansed of its corruption, this oochamon maintains some aspects of the Void and Stone types.', 
            type: [OochType.Void, OochType.Stone], 
            hp: 10, atk: 10, def: 10, spd: 10, // total 40
            move_list: [
                [1, Move.Bash], [2, Move.PebbleBlast], [5, Move.Brittle], [7, Move.CursedEye], 
                [10, Move.Purify], [15, Move.Blink], [17, Move.NullSphere], [20, Move.DustStorm], 
                [24, Move.Entrench], [30, Move.Boulderdash], [40, Move.GemBash], [-1, Move.Kaleidoscope]
            ],
            abilities: [Ability.Increment], 
            pre_evo_id: -1, evo_id: -1, evo_lvl: -1, evo_stage: 0
        });

        // Cromet
        create_monster({
            id: 35,
            emote: get_emote_string(client, 'cromet'),
            name: 'Cromet',
            oochive_entry: 'Cromet fall from the sky when the distant stars rupture in the night. Thousands can fall at the same time.', 
            type: [OochType.Stone], 
            hp: 12, atk: 13, def: 10, spd: 15, // total 50
            move_list: [
                [1, Move.Bash], [2, Move.Hasten], [4, Move.PebbleBlast], [9, Move.Gravitate], 
                [12, Move.ClampDown], [15, Move.CrashLanding], [18, Move.Boulderdash], [-1, Move.SyncStrike]
            ],
            abilities: [Ability.Inertia, Ability.Scorching], 
            pre_evo_id: -1, evo_id: 36, evo_lvl: 20, evo_stage: 0
        });

        // Lobstar
        create_monster({
            id: 36,
            emote: get_emote_string(client, 'lobstar'),
            name: 'Lobstar',
            oochive_entry: 'From a distance they seem to be stars in the sky, their weighty bodies are lifted by an immense amount of energy.', 
            type: [OochType.Stone], 
            hp: 10, atk: 35, def: 20, spd: 10, // total 75
            move_list: [
                [1, Move.Bash], [2, Move.Hasten], [4, Move.PebbleBlast], [9, Move.Gravitate], 
                [12, Move.ClampDown], [15, Move.CrashLanding], [18, Move.Boulderdash], [23, Move.SolarBlast], 
                [36, Move.DustStorm], [-1, Move.SyncStrike]
            ],
            abilities: [Ability.Immense, Ability.Scorching], 
            pre_evo_id: 35, evo_id: -1, evo_lvl: -1, evo_stage: 1
        });

        // Spoolette
        create_monster({
            id: 37,
            emote: get_emote_string(client, 'spoolette'),
            name: 'Spoolette',
            oochive_entry: 'While Spoolette itself is magical in nature, the threads it creates are completely mundane.', 
            type: [OochType.Magic], 
            hp: 10, atk: 15, def: 15, spd: 10, // total 50
            move_list: [
                [1, Move.Bash], [2, Move.Hasten], [4, Move.MagicBolt], [7, Move.Lurk], 
                [13, Move.TangledThreads], [17, Move.DrainLife], [22, Move.Barrage], 
                [28, Move.FatedThreads], [40, Move.Impale], [-1, Move.MetalLance]
            ],
            abilities: [Ability.Tangled, Ability.Leech], 
            pre_evo_id: -1, evo_id: 38, evo_lvl: 18, evo_stage: 0
        });

        // Thimbite
        create_monster({
            id: 38,
            emote: get_emote_string(client, 'thimbite'),
            name: 'Thimbite',
            oochive_entry: 'Thimbite enchant a container when they evolve so that it can never be removed, touching one\'s container causes it to rage.', 
            type: [OochType.Magic], 
            hp: 20, atk: 20, def: 20, spd: 10, // total 70
            move_list: [
                [1, Move.Bash], [2, Move.Hasten], [4, Move.MagicBolt], [7, Move.Lurk], 
                [13, Move.TangledThreads], [17, Move.DrainLife], [22, Move.Barrage], 
                [28, Move.FatedThreads], [40, Move.Impale], [-1, Move.MetalLance]
            ],
            abilities: [Ability.Tangled, Ability.Leech], 
            pre_evo_id: 37, evo_id: -1, evo_lvl: -1, evo_stage: 1
        });

        // Digityke
        create_monster({
            id: 39,
            emote: get_emote_string(client, 'digityke'),
            name: 'Digityke',
            oochive_entry: 'An old-model of machine companion, its feeble body prevents it from being of much use.', 
            type: [OochType.Tech],
            hp: 10, atk: 7, def: 8, spd: 5, // total 30
            move_list: [
                [1, Move.Bash], [2, Move.Strike], [5, Move.ByteBite], [7, Move.DigitalGamble],
                [12, Move.Suplex], [16, Move.SyncStrike], [20, Move.SelfDestruct], [-1, Move.BlindingBeam]
            ],
            abilities: [Ability.Gentle, Ability.Efficient],
            pre_evo_id: -1, evo_id: 40, evo_lvl: 21, evo_stage: 0
        });
        
        // Codet
        create_monster({
            id: 40,
            emote: get_emote_string(client, 'codet'),
            name: 'Codet',
            oochive_entry: 'An attempt to modernize the DGTY-k gone wrong. Despite being decommissioned these haunting machines continue to run.', 
            type: [OochType.Tech],
            hp: 30, atk: 10, def: 10, spd: 10, // total 60
            move_list: [
                [1, Move.Bash], [2, Move.Strike], [5, Move.ByteBite], [7, Move.DigitalGamble],
                [12, Move.Suplex], [16, Move.SyncStrike], [20, Move.SelfDestruct], [26, Move.PhantomBullet],
                [32, Move.SyncStrike], [35, Move.ThornShot], [-1, Move.BlindingBeam]
            ],
            abilities: [Ability.Alert, Ability.Rogue],
            pre_evo_id: 39, evo_id: -1, evo_lvl: -1, evo_stage: 1
        });
        
        // Heatri
        create_monster({
            id: 41,
            emote: get_emote_string(client, 'heatri'),
            name: 'Heatri',
            oochive_entry: 'A bird-like creature made of an ever-shifting fluid, in this form it becomes superheated.', 
            type: [OochType.Flame],
            hp: 25, atk: 10, def: 10, spd: 20, // total 65
            move_list: [
                [1, Move.Bash], [3, Move.Hasten], [5, Move.Fireball], [10, Move.Threefold],
                [15, Move.Engulf], [25, Move.LavaLance], [30, Move.Eruption], [36, Move.Inferno],
                [-1, Move.SlowBurn]
            ],
            abilities: [Ability.Crystallize],
            pre_evo_id: 43, evo_id: 42, evo_lvl: 33, evo_stage: 1
        });
        
        // Moistri
        create_monster({
            id: 42,
            emote: get_emote_string(client, 'moistri'),
            name: 'Moistri',
            oochive_entry: 'Researchers studying Moistri tend to fall ill after handling it, despite this some believe it to have some sort of healing properties.', 
            type: [OochType.Ooze],
            hp: 25, atk: 20, def: 10, spd: 10, // total 65
            move_list: [
                [1, Move.Bash], [3, Move.Soften], [5, Move.Glob], [10, Move.Threefold],
                [15, Move.Impale], [25, Move.ThornShot], [30, Move.SlurpUp], [36, Move.Kaleidoscope],
                [-1, Move.Blight]
            ],
            abilities: [Ability.Crystallize],
            pre_evo_id: 41, evo_id: 43, evo_lvl: 33, evo_stage: 1
        });
        
        // Crystri
        create_monster({
            id: 43,
            emote: get_emote_string(client, 'crystri'),
            name: 'Crystri',
            oochive_entry: 'While its crystals appear rigid they maintain some sort of fluidity.', 
            type: [OochType.Stone],
            hp: 25, atk: 10, def: 20, spd: 10, // total 65
            move_list: [
                [1, Move.Bash], [3, Move.MagicBolt], [5, Move.PebbleBlast], [10, Move.Threefold],
                [15, Move.Blink], [25, Move.DustStorm], [30, Move.Glimmer], [40, Move.GemBash],
                [-1, Move.GlassBlades]
            ],
            abilities: [Ability.Crystallize],
            pre_evo_id: 42, evo_id: 41, evo_lvl: 33, evo_stage: 1
        });
        
        // Solidifyr
        create_monster({
            id: 44,
            emote: get_emote_string(client, 'solidifyr'),
            name: 'Solidifyr',
            oochive_entry: 'Frequently found wandering lava fields. While unflinching in the face of an eruption, they will flee immediately if startled otherwise.', 
            type: [OochType.Flame],
            hp: 17, atk: 13, def: 11, spd: 9, // total 50
            move_list: [
                [1, Move.Bash], [2, Move.Restruct], [4, Move.Fireball], [7, Move.Entomb],
                [13, Move.Slash], [17, Move.DustStorm], [23, Move.HypeUp], [28, Move.Boulderdash],
                [32, Move.Engulf], [38, Move.FireyHorn], [-1, Move.BlindingBeam]
            ],
            abilities: [Ability.Warm, Ability.Scorching],
            pre_evo_id: -1, evo_id: 45, evo_lvl: 38, evo_stage: 0
        });
        
        // Obstaggard
        create_monster({
            id: 45,
            emote: get_emote_string(client, 'obstaggard'),
            name: 'Obstaggard',
            oochive_entry: 'While incredibly hard and sharp, their horns are very brittle. Obstaggard are often hunted in order to make precision blades.', 
            type: [OochType.Stone],
            hp: 19, atk: 23, def: 17, spd: 11, // total 70
            move_list: [
                [1, Move.Bash], [2, Move.Restruct], [4, Move.Fireball], [7, Move.Entomb],
                [13, Move.Slash], [17, Move.DustStorm], [23, Move.HypeUp], [28, Move.Boulderdash],
                [32, Move.Engulf], [38, Move.FireyHorn], [-1, Move.BlindingBeam]
            ],
            abilities: [Ability.Withering, Ability.Lacerating],
            pre_evo_id: 44, evo_id: -1, evo_lvl: -1, evo_stage: 1
        });        

        // Droplunk
        create_monster({
            id: 46,
            emote: get_emote_string(client, 'droplunk'),
            name: 'Droplunk',
            oochive_entry: 'Oops, don\'t let this one drop on your head!', 
            type: [OochType.Stone],
            hp: 7, atk: 10, def: 8, spd: 15, // total 40
            move_list: [
                [1, Move.Bash], [2, Move.Intimidate], [4, Move.PebbleBlast], [7, Move.Gravitate],
                [12, Move.Entomb], [13, Move.Mud], [20, Move.CursedEye], [27, Move.SyncStrike],
                [37, Move.Boulderdash], [43, Move.AshBlast], [-1, Move.ByteBite]
            ],
            abilities: [Ability.Inertia, Ability.Gravity],
            pre_evo_id: -1, evo_id: 45, evo_lvl: 28, evo_stage: 0
        });
        
        // Brykurse
        create_monster({
            id: 47,
            emote: get_emote_string(client, 'brykurse'),
            name: 'Brykurse',
            oochive_entry: 'Square meatball!', 
            type: [OochType.Magic],
            hp: 14, atk: 28, def: 8, spd: 25, // total 75
            move_list: [
                [1, Move.Bash], [2, Move.Intimidate], [4, Move.PebbleBlast], [7, Move.Gravitate],
                [12, Move.Entomb], [13, Move.Mud], [20, Move.CursedEye], [27, Move.SyncStrike],
                [37, Move.Boulderdash], [43, Move.AshBlast], [-1, Move.ByteBite]
            ],
            abilities: [Ability.Inertia, Ability.Gravity],
            pre_evo_id: 46, evo_id: -1, evo_lvl: -1, evo_stage: 1
        });
        
        // Polyplute
        create_monster({
            id: 48,
            emote: get_emote_string(client, 'polyplute'),
            name: 'Polyplute',
            oochive_entry: 'Blooms of Polyplute create beautiful fields, however this phenomenon is incredibly dangerous as they make the environment around them toxic.', 
            type: [OochType.Fungal],
            hp: 12, atk: 13, def: 12, spd: 8, // total 45
            move_list: [
                [1, Move.Bash], [2, Move.Soften], [5, Move.Glob], [7, Move.Corrode],
                [12, Move.ClampDown], [18, Move.Fog], [22, Move.CausticOrb], [28, Move.Bloom],
                [37, Move.DrainLife], [-1, Move.Laminate]
            ],
            abilities: [Ability.Sporespray, Ability.Leech],
            pre_evo_id: -1, evo_id: 49, evo_lvl: 29, evo_stage: 0
        });
        
        // Reefest
        create_monster({
            id: 49,
            emote: get_emote_string(client, 'reefest'),
            name: 'Reefest',
            oochive_entry: 'When Polyplute blooms linger in an area, they often congeal into the massive Reefest.', 
            type: [OochType.Fungal],
            hp: 35, atk: 15, def: 15, spd: 5, // total 70
            move_list: [
                [1, Move.Bash], [2, Move.Soften], [5, Move.Glob], [7, Move.Corrode],
                [12, Move.ClampDown], [18, Move.Fog], [22, Move.CausticOrb], [28, Move.Bloom],
                [37, Move.DrainLife], [-1, Move.Laminate]
            ],
            abilities: [Ability.Sporespray, Ability.Leech],
            pre_evo_id: 48, evo_id: -1, evo_lvl: -1, evo_stage: 1
        });
        
        // Frigook
        create_monster({
            id: 50,
            emote: get_emote_string(client, 'frigook'),
            name: 'Frigook',
            oochive_entry: 'Frigook maintain a temperature just above the point of freezing and can quickly drop below it to harden their bodies.', 
            type: [OochType.Ooze],
            hp: 15, atk: 5, def: 15, spd: 5, // total 40
            move_list: [
                [1, Move.Hit], [2, Move.Soften], [3, Move.Glob], [6, Move.Fog],
                [9, Move.Brittle], [14, Move.Siphon], [20, Move.Impale], [25, Move.CursedEye],
                [32, Move.ArcaStrike], [41, Move.GemBash], [-1, Move.Kaleidoscope]
            ],
            abilities: [Ability.Moist, Ability.Frostbite],
            pre_evo_id: -1, evo_id: 51, evo_lvl: 23, evo_stage: 0
        });
        
        // Boreyuc
        create_monster({
            id: 51,
            emote: get_emote_string(client, 'boreyuc'),
            name: 'Boreyuc',
            oochive_entry: 'These beasts move incredibly slowly unless disturbed, liquefying their body and attacking immediately.', 
            type: [OochType.Ooze],
            hp: 15, atk: 7, def: 30, spd: 3, // total 65
            move_list: [
                [1, Move.Hit], [2, Move.Soften], [3, Move.Glob], [6, Move.Fog],
                [9, Move.Brittle], [14, Move.Siphon], [20, Move.Impale], [25, Move.CursedEye],
                [32, Move.ArcaStrike], [41, Move.GemBash], [-1, Move.Kaleidoscope]
            ],
            abilities: [Ability.Bipolar, Ability.Frostbite],
            pre_evo_id: 50, evo_id: -1, evo_lvl: -1, evo_stage: 1
        });
        
        // Vrumbox
        create_monster({
            id: 52,
            emote: get_emote_string(client, 'vrumbox'),
            name: 'Vrumbox',
            oochive_entry: 'Monowheeled automata built for carrying various pieces of equipment.', 
            type: [OochType.Tech],
            hp: 10, atk: 10, def: 10, spd: 15, // total 45
            move_list: [
                [1, Move.Bash], [2, Move.Sawblade], [6, Move.Hasten], [12, Move.SelfDestruct],
                [19, Move.Barrage], [27, Move.Grind], [35, Move.DigitalGamble], [-1, Move.CallThunder]
            ],
            abilities: [Ability.Inertia, Ability.Armored],
            pre_evo_id: -1, evo_id: 53, evo_lvl: 18, evo_stage: 0
        });
        
        // Folduo
        create_monster({
            id: 53,
            emote: get_emote_string(client, 'folduo'),
            name: 'Folduo',
            oochive_entry: 'Folduo\'s body allows it to fit into small spaces. It also can combine with and dock with Vrumbox to create platforms.', 
            type: [OochType.Tech],
            hp: 15, atk: 12, def: 13, spd: 20, // total 60
            move_list: [
                [1, Move.Bash], [2, Move.Sawblade], [6, Move.Hasten], [12, Move.SelfDestruct],
                [19, Move.Barrage], [27, Move.Grind], [35, Move.DigitalGamble], [-1, Move.CallThunder]
            ],
            abilities: [Ability.Inertia, Ability.Armored],
            pre_evo_id: 52, evo_id: 54, evo_lvl: 32, evo_stage: 1
        });        

        // Hexyclone
        create_monster({
            id: 54,
            emote: get_emote_string(client, 'hexyclone'),
            name: 'Hexyclone',
            oochive_entry: 'A Hexcyclone\'s entire body can be folded into the space that acts as its head, allowing it to explore otherwise unenterable areas.',
            type: [OochType.Tech],
            hp: 20, atk: 13, def: 17, spd: 25, // total 75
            move_list: [
                [1, Move.Bash], [2, Move.Sawblade], [6, Move.Hasten], [12, Move.SelfDestruct],
                [19, Move.Barrage], [27, Move.Grind], [35, Move.DigitalGamble], [40, Move.Grind],
                [-1, Move.CallThunder]
            ],
            abilities: [ Ability.Hexiply, Ability.Efficient ],
            pre_evo_id: 53, evo_id: -1, evo_lvl: -1, evo_stage: 2
        })

        // Oochabit
        create_monster({
            id: 55,
            emote: get_emote_string(client, 'oochabit'),
            name: 'Oochabit',
            oochive_entry: 'These little guys\'ll consume space-time and do it with a smile on their faces.',
            type: [OochType.Void],
            hp: 10, atk: 9, def: 5, spd: 6, // total 30
            move_list: [
                [1, Move.Bash]
            ],
            abilities: [ Ability.Nullify ],
            pre_evo_id: -1, evo_id: 56, evo_lvl: 18, evo_stage: 0
        })

        // Oochabound
        create_monster({
            id: 56,
            emote: get_emote_string(client, 'oochabound'),
            name: 'Oochabound',
            oochive_entry: 'No thank you, I\'d really rather not write a description for this one.',
            type: [OochType.Void],
            hp: 25, atk: 23, def: 17, spd: 20, // total 85
            move_list: [
                [1, Move.Bash]
            ],
            abilities: [ Ability.Duplicant ],
            pre_evo_id: 55, evo_id: -1, evo_lvl: -1, evo_stage: 1
        })

        // Kindeep
        create_monster({
            id: 57,
            emote: get_emote_string(client, 'kindeep'),
            name: 'Kindeep',
            oochive_entry: 'Schools of this fish-like oochamon are often found floating down in the caverns.',
            type: [OochType.Flame],
            hp: 10, atk: 13, def: 12, spd: 20, // total 55
            move_list: [
                [1, Move.Hit], [2, Move.Fireball], [5, Move.MagicBolt], [8, Move.Hasten],
                [12, Move.Engulf], [16, Move.Lurk], [22, Move.Blink], [27, Move.Inferno],
                [33, Move.ArcaStrike], [40, Move.AshBlast], [-1, Move.BlindingBeam]
            ],
            abilities: [ Ability.Spectral, Ability.Gentle ],
            pre_evo_id: -1, evo_id: 58, evo_lvl: 30, evo_stage: 0
        })

        // Ablayzz
        create_monster({
            id: 58,
            emote: get_emote_string(client, 'ablayzz'),
            name: 'Ablayzz',
            oochive_entry: 'Its flames act as a beacon for young Kindeep, serving as a vanguard and guiding them.',
            type: [OochType.Flame],
            hp: 20, atk: 18, def: 17, spd: 25, // total 80
            move_list: [
                [1, Move.Hit], [2, Move.Fireball], [5, Move.MagicBolt], [8, Move.Hasten],
                [12, Move.Engulf], [16, Move.Lurk], [22, Move.Blink], [27, Move.Inferno],
                [33, Move.ArcaStrike], [40, Move.AshBlast], [-1, Move.BlindingBeam]
            ],
            abilities: [ Ability.Spectral, Ability.Shadow ],
            pre_evo_id: 57, evo_id: -1, evo_lvl: -1, evo_stage: 1
        })

        // Krakle
        create_monster({
            id: 59,
            emote: get_emote_string(client, 'krakle'),
            name: 'Krakle',
            oochive_entry: 'This small \'mon has a superheated shell, don\'t touch it.',
            type: [OochType.Flame],
            hp: 10, atk: 13, def: 12, spd: 20, // total 55
            move_list: [
                [1, Move.Bash], [2, Move.Soften], [5, Move.Fireball], [7, Move.SlowBurn],
                [14, Move.Engulf], [-1, Move.Overgrowth]
            ],
            abilities: [ Ability.Warm, Ability.Miniscule ],
            pre_evo_id: -1, evo_id: 60, evo_lvl: 11, evo_stage: 0
        })

        // Lightuft
        create_monster({
            id: 60,
            emote: get_emote_string(client, 'lightuft'),
            name: 'Lightuft',
            oochive_entry: 'They don\'t quite fly well yet, but they\'re known for dropping on unsuspecting victims, burning them in the process.',
            type: [OochType.Flame],
            hp: 13, atk: 17, def: 13, spd: 22, // total 65
            move_list: [
                [1, Move.Bash], [2, Move.Soften], [5, Move.Fireball], [7, Move.SlowBurn],
                [14, Move.Engulf], [20, Move.Torch], [27, Move.Inferno], [35, Move.BlindingBeam],
                [-1, Move.AshBlast]
            ],
            abilities: [ Ability.Warm, Ability.HeightAdvantage ],
            pre_evo_id: 59, evo_id: 61, evo_lvl: 25, evo_stage: 1
        })

        // Infernowl
        create_monster({
            id: 61,
            emote: get_emote_string(client, 'infernowl'),
            name: 'Infernowl',
            oochive_entry: 'These apex predators will find a single volcano and make its entirety their hunting ground.',
            type: [OochType.Flame],
            hp: 20, atk: 25, def: 17, spd: 18, // total 80
            move_list: [
                [1, Move.Bash], [2, Move.Soften], [5, Move.Fireball], [7, Move.SlowBurn],
                [14, Move.Engulf], [20, Move.Torch], [27, Move.Inferno], [35, Move.BlindingBeam],
                [-1, Move.AshBlast]
            ],
            abilities: [ Ability.Scorching, Ability.HeightAdvantage ],
            pre_evo_id: 60, evo_id: -1, evo_lvl: -1, evo_stage: 2
        })

        // Fluffly
        create_monster({
            id: 62,
            emote: get_emote_string(client, 'fluffly'),
            name: 'Fluffly',
            oochive_entry: 'These spore-infected creatures float gently on the wind. Incredibly soft. Potentially dangerous.',
            type: [OochType.Fungal],
            hp: 13, atk: 13, def: 18, spd: 21, // total 65
            move_list: [
                [1, Move.Bash], [2, Move.Soften], [5, Move.Overgrowth], [5, Move.Fireball],
                [7, Move.Blight], [7, Move.SlowBurn], [12, Move.EnfeeblingSpore], [14, Move.Engulf],
                [19, Move.CursedEye], [23, Move.MycoBurst], [29, Move.CausticOrb], [35, Move.ThornShot],
                [-1, Move.Overgrowth]
            ],
            abilities: [ Ability.Icky, Ability.Sporespray ],
            pre_evo_id: 59, evo_id: 63, evo_lvl: 28, evo_stage: 1
        })

        // Decavian
        create_monster({
            id: 63,
            emote: get_emote_string(client, 'decavian'),
            name: 'Decavian',
            oochive_entry: 'A bird-like creature barely holding itself together, the fungus throughout its body is incredibly heat-resistant.',
            type: [OochType.Fungal],
            hp: 18, atk: 20, def: 25, spd: 17, // total 80
            move_list: [
                [1, Move.Bash], [2, Move.Soften], [5, Move.Overgrowth], [5, Move.Fireball],
                [7, Move.Blight], [7, Move.SlowBurn], [12, Move.EnfeeblingSpore], [14, Move.Engulf],
                [19, Move.CursedEye], [23, Move.MycoBurst], [29, Move.CausticOrb], [35, Move.ThornShot],
                [-1, Move.Overgrowth]
            ],
            abilities: [ Ability.Radiant, Ability.Sporespray ],
            pre_evo_id: 62, evo_id: -1, evo_lvl: -1, evo_stage: 2
        })

        // Phaegrim
        create_monster({
            id: 64,
            emote: get_emote_string(client, 'phaegrim'),
            name: 'Phaegrim',
            oochive_entry: 'The only truly solid part of its body is the mask-like shell, the rest is several individuals working as one.',
            type: [OochType.Fungal],
            hp: 10, atk: 13, def: 12, spd: 20, // total 55
            move_list: [
                [1, Move.Bash], [2, Move.Glob], [4, Move.Soften], [7, Move.Brittle],
                [9, Move.CausticOrb], [14, Move.EnfeeblingSpore], [20, Move.CursedEye], [26, Move.DrainLife],
                [31, Move.Barrage], [36, Move.Blight], [43, Move.Corrode],
                [-1, Move.Tumorize]
            ],
            abilities: [ Ability.Icky, Ability.Haunted ],
            pre_evo_id: -1, evo_id: 65, evo_lvl: 30, evo_stage: 0
        })

        // Plaghast
        create_monster({
            id: 65,
            emote: get_emote_string(client, 'plaghast'),
            name: 'Plaghast',
            oochive_entry: 'Its tendrils can be thinned and stretched over large swathes of land, acting as a widespread nervous system.',
            type: [OochType.Fungal],
            hp: 20, atk: 18, def: 17, spd: 25, // total 80
            move_list: [
                [1, Move.Bash], [2, Move.Glob], [4, Move.Soften], [7, Move.Brittle],
                [9, Move.CausticOrb], [14, Move.EnfeeblingSpore], [20, Move.CursedEye], [26, Move.DrainLife],
                [31, Move.Barrage], [36, Move.Blight], [43, Move.Corrode],
                [-1, Move.Tumorize]
            ],
            abilities: [ Ability.Alert, Ability.Leech ],
            pre_evo_id: 64, evo_id: -1, evo_lvl: -1, evo_stage: 1
        })

        // Grubbit
        create_monster({
            id: 66,
            emote: get_emote_string(client, 'grubbit'),
            name: 'Grubbit',
            oochive_entry: 'These small bugs can be found munching on bits of crystal.',
            type: [OochType.Stone],
            hp: 15, atk: 12, def: 13, spd: 10, // total 50
            move_list: [
                [1, Move.Bash], [2, Move.Brittle], [5, Move.PebbleBlast], [7, Move.Caltrops],
                [11, Move.Fog], [18, Move.Sedimentation], [19, Move.Boulderdash], [23, Move.CausticOrb],
                [27, Move.DustStorm], [33, Move.Kaleidoscope], [40, Move.GlassBlades],
                [-1, Move.BlindingBeam]
            ],
            abilities: [ Ability.Tangled, Ability.Miniscule ],
            pre_evo_id: -1, evo_id: 67, evo_lvl: 8, evo_stage: 0
        })

        // Culcoon
        create_monster({
            id: 67,
            emote: get_emote_string(client, 'culcoon'),
            name: 'Culcoon',
            oochive_entry: 'It encases itself in threads and chunks of crystal, Culcoon\'s shells are incredibly tough.',
            type: [OochType.Stone],
            hp: 20, atk: 10, def: 30, spd: 5, // total 65
            move_list: [
                [1, Move.Bash], [2, Move.Brittle], [5, Move.PebbleBlast], [7, Move.Caltrops],
                [11, Move.Fog], [18, Move.Sedimentation], [19, Move.Boulderdash], [23, Move.CausticOrb],
                [27, Move.DustStorm], [33, Move.Kaleidoscope], [40, Move.GlassBlades],
                [-1, Move.BlindingBeam]
            ],
            abilities: [ Ability.Dense, Ability.Immobile ],
            pre_evo_id: 66, evo_id: 68, evo_lvl: 20, evo_stage: 1
        })

        // Speculidae
        create_monster({
            id: 68,
            emote: get_emote_string(client, 'speculidae'),
            name: 'Speculidae',
            oochive_entry: 'Their thin bodies and stained glass-like wings belie their incredible rigidity.',
            type: [OochType.Stone],
            hp: 12, atk: 10, def: 35, spd: 23, // total 80
            move_list: [
                [1, Move.Bash], [2, Move.Brittle], [5, Move.PebbleBlast], [7, Move.Caltrops],
                [11, Move.Fog], [18, Move.Sedimentation], [19, Move.Boulderdash], [23, Move.CausticOrb],
                [27, Move.DustStorm], [33, Move.Kaleidoscope], [40, Move.GlassBlades],
                [-1, Move.BlindingBeam]
            ],
            abilities: [ Ability.Crystallize, Ability.Lacerating ],
            pre_evo_id: 67, evo_id: -1, evo_lvl: -1, evo_stage: 2
        })

        // Nisythe
        create_monster({
            id: 69,
            emote: get_emote_string(client, 'nisythe'),
            name: 'Nisythe',
            oochive_entry: 'A haunting creature wielding a flaming scythe, it is nearly impossible to get a picture of this Oochamon.',
            type: [OochType.Magic],
            hp: 17, atk: 25, def: 12, spd: 15, // total 69
            move_list: [
                [1, Move.Bash], [2, Move.Slash], [5, Move.Embolden], [7, Move.CursedEye],
                [10, Move.Blink], [13, Move.Grind], [17, Move.Lurk], [21, Move.LavaLance],
                [24, Move.Barrage], [29, Move.MetalLance], [35, Move.Siphon], [41, Move.CallThunder],
                [-1, Move.TangledThreads]
            ],
            abilities: [ Ability.EasyGo ],
            pre_evo_id: -1, evo_id: -1, evo_lvl: -1, evo_stage: 0
        })

        // Tidoll
        create_monster({
            id: 70,
            emote: get_emote_string(client, 'tidoll'),
            name: 'Tidoll',
            oochive_entry: 'These creatures are barely more than sacks of liquid with no bones supporting them.',
            type: [OochType.Ooze],
            hp: 15, atk: 10, def: 15, spd: 15, // total 55
            move_list: [
                [1, Move.Bash], [2, Move.MagicBolt], [4, Move.Soften], [7, Move.Glob],
                [12, Move.CausticOrb], [16, Move.SlurpUp], [23, Move.GemBash], [26, Move.TangledThreads],
                [34, Move.Barrage], [43, Move.Bloom], [-1, Move.FatedThreads]
            ],
            abilities: [Ability.Moist, Ability.Hearty],
            pre_evo_id: -1, evo_id: 71, evo_lvl: 24, evo_stage: 0
        });

        // Marinette
        create_monster({
            id: 71,
            emote: get_emote_string(client, 'marinette'),
            name: 'Marinette',
            oochive_entry: 'The golden threads controlling it are the main body, the rest is just ice-cold water.',
            type: [OochType.Ooze],
            hp: 30, atk: 23, def: 17, spd: 10, // total 80
            move_list: [
                [1, Move.Bash], [2, Move.MagicBolt], [4, Move.Soften], [7, Move.Glob],
                [12, Move.CausticOrb], [16, Move.SlurpUp], [23, Move.GemBash], [26, Move.TangledThreads],
                [34, Move.Barrage], [43, Move.Bloom], [-1, Move.FatedThreads]
            ],
            abilities: [Ability.Frostbite, Ability.Hearty],
            pre_evo_id: 70, evo_id: -1, evo_lvl: -1, evo_stage: 1
        });

        // Durble
        create_monster({
            id: 72,
            emote: get_emote_string(client, 'durble'),
            name: 'Durble',
            oochive_entry: 'These small stone-creatures are incredibly friendly, some researchers have taken them in as pets.',
            type: [OochType.Stone],
            hp: 15, atk: 15, def: 15, spd: 10, // total 55
            move_list: [
                [1, Move.Bash], [2, Move.PebbleBlast], [5, Move.Caltrops], [8, Move.Barrage],
                [13, Move.Boulderdash], [19, Move.DustStorm], [24, Move.Brittle], [28, Move.MetalLance],
                [30, Move.LavaLance], [40, Move.Sedimentation], [-1, Move.FireyHorn]
            ],
            abilities: [Ability.Gentle, Ability.Tough],
            pre_evo_id: -1, evo_id: 73, evo_lvl: 24, evo_stage: 0
        });

        // Durubull
        create_monster({
            id: 73,
            emote: get_emote_string(client, 'durubull'),
            name: 'Durubull',
            oochive_entry: 'Unlike their previous form, Durubull are incredibly aggressive. Keep a safe distance if you can.',
            type: [OochType.Stone],
            hp: 20, atk: 25, def: 25, spd: 15, // total 85
            move_list: [
                [1, Move.Bash], [2, Move.PebbleBlast], [5, Move.Caltrops], [8, Move.Barrage],
                [13, Move.Boulderdash], [19, Move.DustStorm], [24, Move.Brittle], [28, Move.MetalLance],
                [30, Move.LavaLance], [40, Move.Sedimentation], [-1, Move.FireyHorn]
            ],
            abilities: [Ability.Uncontrolled, Ability.Inertia],
            pre_evo_id: 72, evo_id: -1, evo_lvl: -1, evo_stage: 1
        });

        // Rustail
        create_monster({
            id: 74,
            emote: get_emote_string(client, 'rustail'),
            name: 'Rustail',
            oochive_entry: 'These little lizards are made entirely of metal, their rusted tails act as an infectious weapon.',
            type: [OochType.Tech],
            hp: 15, atk: 15, def: 15, spd: 10, // total 55
            move_list: [
                [1, Move.Bash], [3, Move.ByteBite], [5, Move.Embolden], [10, Move.ClampDown],
                [15, Move.Fireball], [18, Move.HypeUp], [23, Move.Grind], [26, Move.Corrode],
                [34, Move.Flurry], [36, Move.HypeUp], [41, Move.CallThunder], [-1, Move.Eruption]
            ],
            abilities: [Ability.Tangled, Ability.Lacerating],
            pre_evo_id: -1, evo_id: 75, evo_lvl: 35, evo_stage: 0
        });

        // Oxydrake
        create_monster({
            id: 75,
            emote: get_emote_string(client, 'oxydrake'),
            name: 'Oxydrake',
            oochive_entry: 'Their heart is like a miniature reactor, how this creature evolved naturally is entirely unknown.',
            type: [OochType.Tech],
            hp: 20, atk: 25, def: 23, spd: 17, // total 85
            move_list: [
                [1, Move.Bash], [3, Move.ByteBite], [5, Move.Embolden], [10, Move.ClampDown],
                [15, Move.Fireball], [18, Move.HypeUp], [23, Move.Grind], [26, Move.Corrode],
                [34, Move.Flurry], [36, Move.HypeUp], [41, Move.CallThunder], [-1, Move.Eruption]
            ],
            abilities: [Ability.Radioactive, Ability.Withering],
            pre_evo_id: 74, evo_id: -1, evo_lvl: -1, evo_stage: 1
        });

        // Chakreye
        create_monster({
            id: 76,
            emote: get_emote_string(client, 'chakreye'),
            name: 'Chakreye',
            oochive_entry: 'Their body is surrounded by a rapidly spinning disc of plasma.',
            type: [OochType.Tech],
            hp: 12, atk: 18, def: 10, spd: 15, // total 55
            move_list: [
                [1, Move.Bash], [5, Move.Embolden], [8, Move.Sawblade], [10, Move.Blink],
                [17, Move.Barrage], [21, Move.Brittle], [26, Move.Gravitate], [29, Move.Slash],
                [34, Move.BlindingBeam], [42, Move.Engulf], [-1, Move.GlassBlades]
            ],
            abilities: [Ability.Energized, Ability.Focused],
            pre_evo_id: -1, evo_id: 77, evo_lvl: 30, evo_stage: 0
        });

        // Sabrink
        create_monster({
            id: 77,
            emote: get_emote_string(client, 'sabrink'),
            name: 'Sabrink',
            oochive_entry: 'A grinning energy blade that relentlessly pursues its enemies.',
            type: [OochType.Tech],
            hp: 18, atk: 30, def: 17, spd: 30, // total 85
            move_list: [
                [1, Move.Bash], [5, Move.Embolden], [8, Move.Sawblade], [10, Move.Blink],
                [17, Move.Barrage], [21, Move.Brittle], [26, Move.Gravitate], [29, Move.Slash],
                [34, Move.BlindingBeam], [42, Move.Engulf], [-1, Move.GlassBlades]
            ],
            abilities: [Ability.Efficient, Ability.Parry],
            pre_evo_id: 76, evo_id: -1, evo_lvl: -1, evo_stage: 1
        });

        // Sapler
        create_monster({
            id: 78,
            emote: get_emote_string(client, 'sapler'),
            name: 'Sapler',
            oochive_entry: 'These little guys are known to infest power stations and cables, slowly draining their energy.',
            type: [OochType.Tech],
            hp: 15, atk: 10, def: 20, spd: 5, // total 50
            move_list: [
                [1, Move.Bash], [2, Move.ByteBite], [4, Move.Fog], [7, Move.Siphon],
                [13, Move.Fireball], [16, Move.TangledThreads], [23, Move.IronHammer], [29, Move.Blight],
                [36, Move.DebugBomb], [43, Move.Reset], [-1, Move.CallThunder]
            ],
            abilities: [Ability.Bomber, Ability.Leech],
            pre_evo_id: -1, evo_id: 79, evo_lvl: 20, evo_stage: 0
        });

        // Radient
        create_monster({
            id: 79,
            emote: get_emote_string(client, 'radient'),
            name: 'Radient',
            oochive_entry: 'Radient spread their influence by chopping off their limbs, which eventually form new Saplers.',
            type: [OochType.Tech],
            hp: 25, atk: 20, def: 20, spd: 15, // total 80
            move_list: [
                [1, Move.Bash], [2, Move.ByteBite], [4, Move.Fog], [7, Move.Siphon],
                [13, Move.Fireball], [16, Move.TangledThreads], [23, Move.IronHammer], [29, Move.Blight],
                [36, Move.DebugBomb], [43, Move.Reset], [-1, Move.CallThunder]
            ],
            abilities: [Ability.Bomber, Ability.Energized],
            pre_evo_id: 78, evo_id: -1, evo_lvl: -1, evo_stage: 1
        });

        // Lasangato
        create_monster({
            id: 80,
            emote: get_emote_string(client, 'lasangato'),
            name: 'Lasangato',
            oochive_entry: 'A feline-like creature, known to bask for days at a time which causes layers of stone to build upon its back.',
            type: [OochType.Stone],
            hp: 27, atk: 10, def: 23, spd: 10, // total 70
            move_list: [
                [1, Move.Bash], [2, Move.PebbleBlast], [5, Move.Mud], [8, Move.DustStorm],
                [12, Move.ClampDown], [17, Move.HypeUp], [22, Move.Sedimentation], [27, Move.Gravitate],
                [35, Move.SlurpUp], [41, Move.Suplex], [-1, Move.Inferno]
            ],
            abilities: [Ability.Burdened, Ability.Burrower],
            pre_evo_id: -1, evo_id: -1, evo_lvl: -1, evo_stage: 0
        });

        // Nullifly
        create_monster({
            id: 81,
            emote: get_emote_string(client, 'nullifly'),
            name: 'Nullifly',
            oochive_entry: 'Strange creatures which begin to swarm where pockets of Void appear.',
            type: [OochType.Void],
            hp: 20, atk: 20, def: 20, spd: 20, // total 80
            move_list: [
                [1, Move.Bash], [2, Move.Embolden], [5, Move.MagicBolt], [7, Move.Intimidate],
                [11, Move.ArcaStrike], [17, Move.NullSphere], [22, Move.Lurk], [27, Move.Corrode],
                [32, Move.DebugBomb], [43, Move.SyncStrike], [-1, Move.PhantomBullet]
            ],
            abilities: [Ability.Nullify],
            pre_evo_id: -1, evo_id: -1, evo_lvl: -1, evo_stage: 0
        });

        // Crudoil
        create_monster({
            id: 82,
            emote: get_emote_string(client, 'crudoil'),
            name: 'Crudoil',
            oochive_entry: 'A living mass of an oil-like substance. They\'re always seen carrying a heavy metal ring.',
            type: [OochType.Ooze],
            hp: 7, atk: 12, def: 8, spd: 8, // total 35
            move_list: [
                [1, Move.Bash], [2, Move.Glob], [5, Move.Soften], [7, Move.Fireball],
                [11, Move.StickyOrb], [18, Move.Lurk], [22, Move.SelfDestruct], [26, Move.Engulf],
                [31, Move.SlurpUp], [35, Move.Corrode], [43, Move.Suplex], [-1, Move.Tumorize]
            ],
            abilities: [Ability.Flammable, Ability.Warm],
            pre_evo_id: -1, evo_id: 83, evo_lvl: 25, evo_stage: 0
        });

        // Oilantern
        create_monster({
            id: 83,
            emote: get_emote_string(client, 'oilantern'),
            name: 'Oilantern',
            oochive_entry: 'When Oilantern get angry enough the light they fuel gets hot enough to ignite their entire body.',
            type: [OochType.Ooze],
            hp: 15, atk: 25, def: 15, spd: 20, // total 75
            move_list: [
                [1, Move.Bash], [2, Move.Glob], [5, Move.Soften], [7, Move.Fireball],
                [11, Move.StickyOrb], [18, Move.Lurk], [22, Move.SelfDestruct], [26, Move.Engulf],
                [31, Move.SlurpUp], [35, Move.Corrode], [43, Move.Suplex], [-1, Move.Tumorize]
            ],
            abilities: [Ability.Flammable, Ability.Hearty],
            pre_evo_id: 82, evo_id: -1, evo_lvl: -1, evo_stage: 1
        });

        // Saporite
        create_monster({
            id: 84,
            emote: get_emote_string(client, 'saporite'),
            name: 'Saporite',
            oochive_entry: 'Also called mushroom fairies, these small creatures are very peaceful.',
            type: [OochType.Fungal],
            hp: 7, atk: 5, def: 13, spd: 5, // total 30
            move_list: [
                [1, Move.Bash], [2, Move.SporeShot], [5, Move.Brittle], [7, Move.Fog],
                [11, Move.MyceliumWhip], [15, Move.StickyOrb], [21, Move.Entrench], [26, Move.Boulderdash],
                [32, Move.EnfeeblingSpore], [37, Move.Gravitate], [44, Move.DrainLife], [-1, Move.TangledThreads]
            ],
            abilities: [Ability.Gentle, Ability.Patient],
            pre_evo_id: -1, evo_id: 85, evo_lvl: 32, evo_stage: 0
        });

        // Faering
        create_monster({
            id: 85,
            emote: get_emote_string(client, 'faering'),
            name: 'Faering',
            oochive_entry: 'When Saporite settle into the ground they form a network of mushrooms, granting them control of the ground itself.',
            type: [OochType.Fungal],
            hp: 24, atk: 26, def: 16, spd: 9, // total 80
            move_list: [
                [1, Move.Bash], [2, Move.SporeShot], [5, Move.Brittle], [7, Move.Fog],
                [11, Move.MyceliumWhip], [15, Move.StickyOrb], [21, Move.Entrench], [26, Move.Boulderdash],
                [32, Move.EnfeeblingSpore], [37, Move.Gravitate], [44, Move.DrainLife], [-1, Move.TangledThreads]
            ],
            abilities: [Ability.Tangled, Ability.Immense],
            pre_evo_id: 84, evo_id: -1, evo_lvl: -1, evo_stage: 1
        });

        // Kerkobble
        create_monster({
            id: 86,
            emote: get_emote_string(client, 'kercobble'),
            name: 'Kerkobble',
            oochive_entry: 'A small floating stone, researchers are unsure it has enough intelligence to be considered an Oochamon.',
            type: [OochType.Stone],
            hp: 9, atk: 8, def: 6, spd: 7, // total 30
            move_list: [
                [1, Move.Bash], [2, Move.Brittle], [5, Move.MagicBolt], [8, Move.PebbleBlast],
                [12, Move.HypeUp], [18, Move.Gravitate], [21, Move.CursedEye], [26, Move.Boulderdash],
                [33, Move.Restruct], [40, Move.SelfDestruct], [-1, Move.Barrage]
            ],
            abilities: [Ability.Gentle, Ability.Patient],
            pre_evo_id: -1, evo_id: 87, evo_lvl: 42, evo_stage: 0
        });

        // Korkobble
        create_monster({
            id: 87,
            emote: get_emote_string(client, 'korkobble'),
            name: 'Korkobble',
            oochive_entry: 'If enough Kerkobble gather together, they work together form a neural network of sorts. It still isn\'t very smart though.',
            type: [OochType.Stone],
            hp: 31, atk: 19, def: 17, spd: 18, // total 85
            move_list: [
                [1, Move.Bash], [2, Move.Brittle], [5, Move.MagicBolt], [8, Move.PebbleBlast],
                [12, Move.HypeUp], [18, Move.Gravitate], [21, Move.CursedEye], [26, Move.Boulderdash],
                [33, Move.Restruct], [40, Move.SelfDestruct], [-1, Move.Barrage]
            ],
            abilities: [Ability.Tangled, Ability.Immense],
            pre_evo_id: 86, evo_id: -1, evo_lvl: -1, evo_stage: 1
        });

        // Ilushand
        create_monster({
            id: 88,
            emote: get_emote_string(client, 'ilushand'),
            name: 'Ilushand',
            oochive_entry: 'Its unknown whether Ilushand\'s main body is the creature in the mirror or the small orb constantly next to it.',
            type: [OochType.Magic],
            hp: 8, atk: 10, def: 9, spd: 8, // total 35
            move_list: [
                [1, Move.Bash], [2, Move.Intimidate], [5, Move.MagicBolt], [10, Move.Blink],
                [12, Move.Grind], [17, Move.Embolden], [22, Move.CursedEye], [27, Move.Glimmer],
                [32, Move.Kaleidoscope], [37, Move.BlindingBeam], [-1, Move.SolarBlast]
            ],
            abilities: [Ability.Reactive, Ability.Rogue],
            pre_evo_id: -1, evo_id: 89, evo_lvl: 20, evo_stage: 0
        });

        // Miroraj
        create_monster({
            id: 89,
            emote: get_emote_string(client, 'miroraj'),
            name: 'Miroraj',
            oochive_entry: 'It endlessly reflects its inner core making it incredibly difficult to perceive.',
            type: [OochType.Magic],
            hp: 18, atk: 22, def: 19, spd: 21, // total 80
            move_list: [
                [1, Move.Bash], [2, Move.Intimidate], [5, Move.MagicBolt], [10, Move.Blink],
                [12, Move.Grind], [17, Move.Embolden], [22, Move.CursedEye], [27, Move.Glimmer],
                [32, Move.Kaleidoscope], [37, Move.BlindingBeam], [-1, Move.SolarBlast]
            ],
            abilities: [Ability.Reactive, Ability.Duplicant],
            pre_evo_id: 88, evo_id: -1, evo_lvl: -1, evo_stage: 1
        });

        // Fritarge
        create_monster({
            id: 90,
            emote: get_emote_string(client, 'fritarge'),
            name: 'Fritarge',
            oochive_entry: 'The empty husk of what appears to be a bronze turtle. It rarely moves.',
            type: [OochType.Tech],
            hp: 11, atk: 9, def: 13, spd: 7, // total 40
            move_list: [
                [1, Move.Bash], [2, Move.ByteBite], [5, Move.Intimidate], [8, Move.Fireball],
                [13, Move.Entrench], [16, Move.Caltrops], [21, Move.ClampDown], [24, Move.AshBlast],
                [29, Move.Barrage], [33, Move.Eruption], [39, Move.CursedEye], [43, Move.IronHammer],
                [-1, Move.AshBlast]
            ],
            abilities: [Ability.Immobile, Ability.Armored],
            pre_evo_id: -1, evo_id: 91, evo_lvl: 18, evo_stage: 0
        });

        // Wardred
        create_monster({
            id: 91,
            emote: get_emote_string(client, 'wardred'),
            name: 'Wardred',
            oochive_entry: 'The gaping maw on this creature\'s back echoes metallic whispers.',
            type: [OochType.Tech],
            hp: 20, atk: 19, def: 22, spd: 14, // total 75
            move_list: [
                [1, Move.Bash], [2, Move.ByteBite], [5, Move.Intimidate], [8, Move.Fireball],
                [13, Move.Entrench], [16, Move.Caltrops], [21, Move.ClampDown], [24, Move.AshBlast],
                [29, Move.Barrage], [33, Move.Eruption], [39, Move.CursedEye], [43, Move.IronHammer],
                [-1, Move.AshBlast]
            ],
            abilities: [Ability.Ravenous, Ability.Mundane],
            pre_evo_id: 90, evo_id: -1, evo_lvl: -1, evo_stage: 1
        });

        // Congsume
        create_monster({
            id: 92,
            emote: get_emote_string(client, 'congsume'),
            name: 'Congsume',
            oochive_entry: 'It can\'t stop moving or the flames on its body will eventually catch up.',
            type: [OochType.Flame],
            hp: 8, atk: 12, def: 7, spd: 13, // total 40
            move_list: [
                [1, Move.Bash], [2, Move.Embolden], [5, Move.Fireball], [9, Move.ClampDown],
                [13, Move.HypeUp], [17, Move.Torch], [23, Move.Hasten], [28, Move.Engulf],
                [34, Move.Inferno], [40, Move.SelfDestruct], [-1, Move.Purify]
            ],
            abilities: [Ability.Ravenous, Ability.EasyGo],
            pre_evo_id: -1, evo_id: 93, evo_lvl: 18, evo_stage: 0
        });

        // Fevour
        create_monster({
            id: 93,
            emote: get_emote_string(client, 'fevour'),
            name: 'Fevour',
            oochive_entry: 'Whatever it eats is immediately burned to keep it alive.',
            type: [OochType.Flame],
            hp: 11, atk: 26, def: 14, spd: 24, // total 75
            move_list: [
                [1, Move.Bash], [2, Move.Embolden], [5, Move.Fireball], [9, Move.ClampDown],
                [13, Move.HypeUp], [17, Move.Torch], [23, Move.Hasten], [28, Move.Engulf],
                [34, Move.Inferno], [40, Move.SelfDestruct], [-1, Move.Purify]
            ],
            abilities: [Ability.Ravenous, Ability.Withering],
            pre_evo_id: 92, evo_id: -1, evo_lvl: -1, evo_stage: 1
        });

        // Tryptid
        create_monster({
            id: 94,
            emote: get_emote_string(client, 'tryptid'),
            name: 'Tryptid',
            oochive_entry: 'It seemingly appeared out of nowhere, creeping up from the darkness, and attaching parts of Oochamon to itself as it went.',
            type: [OochType.Stone, OochType.Fungal],
            hp: 17, atk: 18, def: 24, spd: 16, // total 75
            move_list: [
                [1, Move.Bash], [5, Move.Brittle], [8, Move.SporeShot], [10, Move.PebbleBlast],
                [13, Move.Lurk], [16, Move.Grind], [19, Move.CursedEye], [21, Move.Boulderdash],
                [24, Move.ThornShot], [29, Move.Restruct], [36, Move.DustStorm], [40, Move.ClampDown],
                [-1, Move.Siphon]
            ],
            abilities: [Ability.HoleDweller],
            pre_evo_id: -1, evo_id: -1, evo_lvl: -1, evo_stage: 0
        });

        // Roswier
        create_monster({
            id: 95,
            emote: get_emote_string(client, 'roswier'),
            name: 'Roswier',
            oochive_entry: 'The existence of Roswier leads researchers to believe that all Tech Oochamon are internally controlled by organisms related to Ooze-types.',
            type: [OochType.Tech, OochType.Ooze],
            hp: 26, atk: 24, def: 19, spd: 21, // total 90
            move_list: [
                [1, Move.Bash], [5, Move.Glob], [8, Move.ByteBite], [10, Move.Digitize],
                [12, Move.Corrode], [16, Move.Impale], [20, Move.MetalLance], [23, Move.TangledThreads],
                [25, Move.Radiate], [28, Move.Flurry], [34, Move.Entrench], [40, Move.CrashLanding],
                [-1, Move.PhantomBullet]
            ],
            abilities: [Ability.LiquidCooled],
            pre_evo_id: -1, evo_id: -1, evo_lvl: -1, evo_stage: 0
        });

        // Chemerai
        create_monster({
            id: 96,
            emote: get_emote_string(client, 'chemerai'),
            name: 'Chemerai',
            oochive_entry: 'The crystal atop this creature acts as a matter-energy converter of sorts, though its inner workings are completely unknown.',
            type: [OochType.Magic, OochType.Flame],
            hp: 18, atk: 29, def: 21, spd: 22, // total 90
            move_list: [
                [1, Move.Bash], [3, Move.Fireball], [5, Move.Sparkler], [7, Move.Intimidate],
                [11, Move.HypeUp], [14, Move.DrainLife], [17, Move.ArcaStrike], [22, Move.GemBash],
                [27, Move.Inferno], [33, Move.BlindingBeam], [37, Move.GlassBlades], [43, Move.CallThunder],
                [-1, Move.Kaleidoscope]
            ],
            abilities: [Ability.PowerConduit],
            pre_evo_id: -1, evo_id: -1, evo_lvl: -1, evo_stage: 0
        });

        // Rosun
        create_monster({
            id: 97,
            emote: get_emote_string(client, 'rosun'),
            name: 'Rosun',
            oochive_entry: 'It aimlessly drifts to and fro, and yet never seems to collide with anything.',
            type: [OochType.Stone],
            hp: 10, atk: 8, def: 12, spd: 10, //total 40
            move_list: [
                [1, Move.Bash]
            ],
            abilities: [ Ability.Swaying, Ability.Armored ],
            pre_evo_id: -1, evo_id: 98, evo_lvl: 34, evo_stage: 0
        })

        // Morgoun
        create_monster({
            id: 98,
            emote: get_emote_string(client, 'morgoun'),
            name: 'Morgoun',
            oochive_entry: 'Morgoun\'s body is composed of several layers of crystal, making it incedibly difficult to damage.',
            type: [OochType.Stone],
            hp: 17, atk: 13, def: 26, spd: 14, //total 70
            move_list: [
                [1, Move.Bash]
            ],
            abilities: [ Ability.Swaying, Ability.Armored ],
            pre_evo_id: 97, evo_id: -1, evo_lvl: -1, evo_stage: 1
        })

        // Garnetie
        create_monster({
            id: 99,
            emote: get_emote_string(client, 'garnetie'),
            name: 'Garnetie',
            oochive_entry: 'A strange construct, when angered the green crystals on its body thrash about almost fluidly.',
            type: [OochType.Stone],
            hp: 10, atk: 12, def: 8, spd: 10, //total 40
            move_list: [
                [1, Move.Bash]
            ],
            abilities: [ Ability.Thrashing, Ability.Brittle ],
            pre_evo_id: -1, evo_id: 100, evo_lvl: 34, evo_stage: 0
        })

        // Aventux
        create_monster({
            id: 100,
            emote: get_emote_string(client, 'aventux'),
            name: 'Aventux',
            oochive_entry: 'The crystals making up its body are incredibly hard, but also very brittle, luckily they seem to regenerate quickly.',
            type: [OochType.Stone],
            hp: 14, atk: 26, def: 13, spd: 17, //total 70
            move_list: [
                [1, Move.Bash]
            ],
            abilities: [ Ability.Thrashing, Ability.Brittle ],
            pre_evo_id: 99, evo_id: -1, evo_lvl: -1, evo_stage: 1
        })

        // Galagge
        create_monster({
            id: 101,
            emote: get_emote_string(client, 'galagge'),
            name: 'Galagge',
            oochive_entry: 'The ancient ring restored to its former glory allows Morgoun and Aventux to form a complete being, covering eachother\'s weaknesses.',
            type: [OochType.Stone],
            hp: 18, atk: 21, def: 21, spd: 15, //total 75
            move_list: [
                [1, Move.Bash]
            ],
            abilities: [ Ability.Union ],
            pre_evo_id: -1, evo_id: -1, evo_lvl: -1, evo_stage: 2
        })

        //#endregion

        //#region Uncatchable Data

        // i_
        create_monster({
            id: -1,
            emote: get_emote_string(client, 'i_'),
            name: 'i_',
            oochive_entry: 'ERROR: entry not found',
            type: [OochType.Void],
            hp: 1, atk: 1, def: 1, spd: 1, // total 4
            move_list: [
                [1, Move.UndefinedInt]
            ],
            abilities: [Ability.InvalidEntry],
            pre_evo_id: -1, evo_id: -1, evo_lvl: -1, evo_stage: 0
        });


        //#endregion

        //#region Create Maps
        await db.maps.clear();
        // let files = fs.readdirSync('./maps/');
        // for (let file of files) {
        //     if (!file.includes('.json')) continue;
        //     let map_name = file.replace('.json', '');

        //     fs.readFile(`./maps/${file}`, 'utf8', (err, data) => {
        //         if (err) {
        //             console.log(`Error reading file: ${file}`);
        //             return;
        //         }

        //         db.maps.set(map_name, JSON.parse(data));
        //     });
        // }

        //#region Create Maps
        await db.maps.clear();
        let files = fs.readdirSync('./old_maps/');
        for (let file of files) {
            if (file.includes('.json')) continue;
            let map_name = file.replace('.txt', '');
    
            fs.readFile(`./old_maps/${file}`, 'utf8', (err, data) => {
                let map_data = data.split('\n');
                let data_header = 'err';
                let map_info_step = 0;
                let map_info_name = '';
                let map_info_battleback = '';
                let tile_data = [];
                let npc_data = [];
                let npc_team_data, ooch_data, moveset, spawn_ooch_data;
                let spawn_data = [];
                let savepoint_data = [];
                let transition_data = [];
                let event_data = [];
                let shop_data = [];
    
                for (let line of map_data) {
                    line = line.replace(/\r\n/g, '').replace(/[\r\n]/g, '');
                    if (line[0] == '#') {
                        data_header = `${line.replace('#', '')}`;
                    } else {
                        let line_data = line.split('|');
                        let output;
                        switch (data_header) {
                            case 'map_info':
                                if(map_info_step == 0){ map_info_name = line_data[0]}
                                if(map_info_step == 1){ map_info_battleback = line_data[0]}
                                map_info_step += 1;
                            break;
                            case 'tiles':
                                line_data.pop();
                                tile_data.push(line_data);
                            break;
                            case 'npcs':
                                output = {
                                    name: line_data[0],
                                    x: parseInt(line_data[1]),
                                    y: parseInt(line_data[2]),
                                    emote_name: line_data[3],
                                    sprite_id: line_data[4],
                                    sprite_combat: (line_data[5] == '' ? false : line_data[5]),
                                    sprite_dialogue: (line_data[6] == '' ? false : line_data[6]),
                                    coin: parseInt(line_data[7]),
                                    item_id: parseInt(line_data[8]),
                                    item_count: parseInt(line_data[9]),
                                    flag_required: (line_data[10] == '' ? false : line_data[10]),
                                    flag_given: (line_data[11] == '' ? false : line_data[11]),
                                    flag_kill: (line_data[12] == '' ? false : line_data[12]),
                                    remove_on_finish: Boolean(parseInt(line_data[13])),
                                    pre_combat_dialogue: line_data[14].split('`').filter(v => v != ''),
                                    post_combat_dialogue: line_data[15].split('`').filter(v => v != ''),
                                    team: [],
                                };
    
                                for (let i = 16; i < line_data.length; i++) {
                                    if (line_data[i] == '') continue;
                                    npc_team_data = line_data[i].split('`');
                                    ooch_data = db.monster_data.get(parseInt(npc_team_data[0]));
                                    moveset = [
                                        parseInt(npc_team_data[4]),
                                        parseInt(npc_team_data[5]),
                                        parseInt(npc_team_data[6]),
                                        parseInt(npc_team_data[7]),
                                    ];
                                    moveset = moveset.filter(id => id != -1);
    
                                    output.team.push({
                                        id: parseInt(npc_team_data[0]),
                                        name: ooch_data.name,
                                        nickname: npc_team_data[1],
                                        current_hp: ooch_data.hp,
                                        type: ooch_data.type,
                                        item: -1,
                                        alive: true,
                                        ability: parseInt(npc_team_data[2]),
                                        level: parseInt(npc_team_data[3]),
                                        moveset: moveset,
                                        status_effects: [],
                                        stats: {
                                            acc_mul: 1,
                                            eva_mul: 1,
                                            hp: ooch_data.hp,
                                            hp_iv: parseInt(npc_team_data[8]),
                                            atk: ooch_data.atk,
                                            atk_iv: parseInt(npc_team_data[9]),
                                            atk_mul: 1,
                                            def: ooch_data.def,
                                            def_iv: parseInt(npc_team_data[10]),
                                            def_mul: 1,
                                            spd: ooch_data.spd,
                                            spd_iv: parseInt(npc_team_data[11]),
                                            spd_mul: 1,
                                        }
                                    });
                                }
                                npc_data.push(output);
                            break;
                            case 'spawn_zones':
                                output = {
                                    x: parseInt(line_data[0]),
                                    y: parseInt(line_data[1]),
                                    width: parseInt(line_data[2]),
                                    height: parseInt(line_data[3]),
                                    spawn_slots: [],
                                }
    
                                spawn_ooch_data = line_data[4].split('`')
                                for(let i = 0; i < spawn_ooch_data.length/3 - 1; i++){
    
                                    output.spawn_slots.push({
                                        ooch_id:    parseInt(spawn_ooch_data[i * 3 + 0]),
                                        min_level:  parseInt(spawn_ooch_data[i * 3 + 1]),
                                        max_level:  parseInt(spawn_ooch_data[i * 3 + 2])
                                    })
                                }
    
                                spawn_data.push(output);
                            break;
                            case 'savepoints':
                                output = {
                                    is_default: Boolean(parseInt(line_data[0])),
                                    x: parseInt(line_data[1]),
                                    y: parseInt(line_data[2]),
                                }
                                savepoint_data.push(output);
                            break;
                            case 'shops':
                                output = {
                                    x: parseInt(line_data[0]),
                                    y: parseInt(line_data[1]),
                                    type: line_data[2],
                                    special_items: line_data[3] == '' ? [] : line_data[3].split('`'),
                                    image: line_data[4],
                                    greeting_dialogue: line_data[5],
                                }
                                shop_data.push(output);
                            break;
                            case 'transitions':
                                if (line == '') continue;
                                output = {
                                    x: parseInt(line_data[0]),
                                    y: parseInt(line_data[1]),
                                    connect_map: line_data[2],
                                    connect_x: parseInt(line_data[3]),
                                    connect_y: parseInt(line_data[4]),
                                }
                                transition_data.push(output);
                            break;
                            case 'events':
                                output = {
                                    x: parseInt(line_data[0]),
                                    y: parseInt(line_data[1]),
                                    width:  parseInt(line_data[2]),
                                    height: parseInt(line_data[3]),
                                    event_name: line_data[4],
                                    flag_required: (line_data[5] == '' ? false : line_data[5]),
                                    flag_kill: (line_data[6] == '' ? false : line_data[6]),
                                }
                                event_data.push(output);
                            break;
                        }
                    }
                }
    
                //Set the map's data
                db.maps.set(map_name, {
                    map_title: map_info_name,
                    map_info_battleback : map_info_battleback,
                    tiles: tile_data,
                    npcs: npc_data,
                    spawn_zones: spawn_data,
                    savepoints: savepoint_data,
                    transitions: transition_data,
                    events: event_data,
                    shops: shop_data
                });
            });
        }

        // Generate text file for map editor project
        let ooch_output_str = "";
        let moves_output_str = "";
        let items_output_str = "";
        let abilities_output_str = "";
        let tiles_output_str = "";
        let npc_output_str = "";

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
            if (obj.id.includes('c')) {
                npc_output_str += `${obj.id}|${Object.values(obj.zone_emote_ids).map(v => `${v.emote}`).join('|')}\n`;
            } else {
                tiles_output_str += `${obj.id}|${obj.emote}\n`;
            }
        }

        fs.writeFile('./editor_data/ooch_data.txt', ooch_output_str, (err) => { if (err) throw err; });
        fs.writeFile('./editor_data/moves_data.txt', moves_output_str, (err) => { if (err) throw err; });
        fs.writeFile('./editor_data/items_data.txt', items_output_str, (err) => { if (err) throw err; });
        fs.writeFile('./editor_data/abilities_data.txt', abilities_output_str, (err) => { if (err) throw err; });
        fs.writeFile('./editor_data/tiles_data.txt', tiles_output_str, (err) => { if (err) throw err; });
        fs.writeFile('./editor_data/npc_data.txt', npc_output_str, (err) => { if (err) throw err; });

        // Generate the global events!
        db.events_data.clear();
        for (let event of Object.entries(globalEventsJSON)) {
            db.events_data.set(event[0], event[1]);
        }
        

        await interaction.editReply('Generated game data.');
    },
};
