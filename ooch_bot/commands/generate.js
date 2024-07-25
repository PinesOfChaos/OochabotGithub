const { SlashCommandBuilder } = require('discord.js');
const { create_monster, create_move, create_item, create_ability, create_tile } = require('../func_create');
const fs = require('fs');
const db = require('../db.js');
const { OochType, Move, Ability, Zone, Tile, TileEmoteGuildsArray, Status } = require('../types.js');
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
        create_item(0, 'Potion',         '<:item_potion:1023031022566260776>',         'heal_inv',  'potion',  50,     0.25,    'Used to quickly heal 25% of an Oochamon\'s HP')
        create_item(1, 'Hi-Potion',      '<:item_potion_hi:1023031023598047284>',      'heal_inv',  'potion',  150,    0.5,     'An advanced potion which heals 50% of an Oochamon\'s HP')
        create_item(2, 'Max-Potion',     '<:item_potion_magic:1023031024726327426>',   'heal_inv',  'potion',  500,    1,       'The ultimate potion which heals 100% of an Oochamon\'s HP')
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
        create_move(73,'Kaleidoscope',    OochType.Magic,50,100,    'blinded|snared',100, 'Disorient the opponent in a room that BLINDS and SNARES')
        create_move(74,'Blinding Beam',   OochType.Flame,75,80,     'blinded',100,   'Fire a brilliant beam of light that BLINDS the opponent.')
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

        //#endregion

        // ADD TO THE TYPES.JS FILE WHEN ADDING NEW ONES
        //#region Ability Data
        //             ID,  NAME,               Description
        create_ability(0,  'Miniscule',         'So small that it reduces the chance to be hit by 10%.');
        create_ability(1,  'Icky',              'Boosts the power of OOZE & FUNGAL type attacks by 20%');
        create_ability(2,  'Burdened',          'A large growth reduces SPD by 10% but raises DEF by 15%'); 
        create_ability(3,  'Broodmother',       'Gains 5% ATK for each Oochamon with the same type in the party.'); 
        create_ability(4,  'Tough',             'A durable body grants a 10% increase to DEF.'); 
        create_ability(5,  'Shadow',            'Grants a 25% chance to VANISH after being attacked.'); 
        create_ability(6,  'Withering',         'Loss of the body reduces HP by 5% each turn, but raises SPD by 20%'); 
        create_ability(7,  'Darkbright',        'Attacks that afflict BURN also BLIND and vice-versa.'); 
        create_ability(8,  'Gentle',            'A kind heart reduces both your ATK and the enemy ATK by 10%'); 
        create_ability(9,  'Warm',              'Increases the damage of FLAME attacks by 10%.'); 
        create_ability(10, 'Radiant',           'Dangerous energy causes attacks that BURN also INFECT.'); 
        create_ability(11, 'Conflicted',        'Multiple minds increase ALL stats by 5%.'); 
        create_ability(12, 'Burrower',          'Increases the damage of STONE attacks by 10%'); 
        create_ability(13, 'Reactive',          'When hit by an attack, reflects 5% of the attacker\'s HP as damage.'); 
        create_ability(14, 'Inertia',           'Increases SPD by 5% each turn.'); 
        create_ability(15, 'Dense',             'Increases ATK by 10% but reduces SPD by 10%'); 
        create_ability(16, 'Moist',             'Reduces FLAME damage by 50%.'); 
        create_ability(17, 'Alert',             'Increases ATK by 10% when an Oochamon switches in.'); 
        create_ability(18, 'Fleeting',          'Increases SPD and ATK by 50% but also loses 50% of HP each turn.'); 
        create_ability(19, 'Efficient',         'Increases ATK by 5% each turn.'); 
        create_ability(20, 'Boisterous',        'Shatters eardrums when it enters the field dealing 5% of the enemy\'s HP'); 
        create_ability(21, 'Haunted',           'Applies the DOOMED status to an enemy when the holder of the ability dies.'); 
        create_ability(22, 'Leech',             'Restores HP equal to 10% of damage done to the enemy.'); 
        create_ability(23, 'Ensnare',           'Grants a 30% chance to SNARE an enemy when attacking.'); 
        create_ability(24, 'Uncontrolled',      'Increases ATK by 50% but randomly chooses an attack each turn'); 
        create_ability(25, 'Apprentice',        'Increases ATK by 15% if any other party members share a move with it.'); 
        create_ability(26, 'Focused',           'Increases damage by 10% if unaffected by status effects.'); 
        create_ability(27, 'Ravenous',          'Whenever defeating an enemy, restore 20% HP.'); 
        create_ability(28, 'Immense',           'Increases DEF by 20% but also makes opponent\'s moves always hit.'); 
        create_ability(29, 'Armored',           'Reduces STONE damage by 20%.'); 
        create_ability(30, 'Scorching',         'Attacks that can BURN always BURN.'); 
        create_ability(31, 'Tangled',           'Causes enemies that hit it to be SNARED.'); 
        create_ability(32, 'Mundane',           'Cannot be affected by Status Effects.'); 
        create_ability(33, 'Rogue',             'DOUBLES the damage dealt to full HP enemies.'); 
        create_ability(34, 'Crystallize',       'Ooze, Flame, and Stone attacks deal 30% more damage.'); 
        create_ability(35, 'Lacerating',        'The enemy loses 5% of their HP after you attack.'); 
        create_ability(36, 'Gravity',           'Attacks deal 1% more damage per number of turns in this battle.'); 
        create_ability(37, 'Sporespray',        'INFECTS the enemy when defeated.'); 
        create_ability(38, 'Frostbite',         'Attacks reduce the targets SPD by 5%.'); 
        create_ability(39, 'Bipolar',           'Use the DEF stat when dealing damage.'); 
        create_ability(40, 'Hexiply',           'Attacks deal 6% more damage per sixth of HP remaining.'); 
        create_ability(41, 'Nullify',           'Change an opponents ability to Null while out on the field.'); 
        create_ability(42, 'Duplicant',         'Copy the opponent\'s ability.'); 
        create_ability(43, 'Null',              'Does nothing.');
        create_ability(44, 'invalid_entry',     'FALSE'); // Increase the global counter for i's stats by 1 upon losing to a player, resets its stats to 1 upon defeating a player
        create_ability(45, 'Immobile',          'Always goes second.');
        create_ability(46, 'Strings Attached',  '20% chance to apply a random status effect when attacking.'); // Statuses: Burn, Infect, Blind, Snare
        create_ability(47, 'Corrosive',         'Attacks deal more damage to enemies with high DEF.');
        create_ability(48, 'Spectral',          'Changes type to Magic every other turn.');
        create_ability(49, 'Height Advantage',  'Increases chance to Crit by 10%.');
        create_ability(50, 'Hearty',            'Increases damage done by 15% while above 50% HP.'); 
        create_ability(51, 'Radioactive',       'Changes type to Flame every other turn.');
        create_ability(52, 'Energized',         'Increases ATK and SPD by 10% on kill.');
        create_ability(53, 'Patient',           'Increases DEF by 5% each turn.');
        create_ability(54, 'Easy Go',           'Heals the rest of your party by 10% when defeated.');
        create_ability(55, 'Bomber',            'Halves the enemy HP on death.') 
        
        
        // TODO: Add these
        create_ability(56, 'Flammable',         'Gains ATK when hit with a FLAME type move.') 
        create_ability(57, 'Hole Dweller',      'Gets the Vanished status at the end of every other turn.') 
        create_ability(58, 'Power Conduit',     'Boosts the power of FLAME moves against OOZE and TECH types by 50%.') 
        create_ability(59, 'Liquid Cooled',     'Prevents BURN and boosts the power of TECH type moves by 25%.') 
        

        //#endregion

        //#region Creature Data
        //ID, Emote, Name, Image, 
        //Description, Type, HP, ATK, DEF, SPD,
        //Move List[[Lvl,ID]...],
        //Abilities, Pre-Evolution ID, Evolution ID, Evolution Level, Evolution Stage

        // Sporbee
        create_monster(0, get_emote_string(client, 'sporbee'), 'Sporbee',
        'An insect that dwells in fungal forests. Every day it risks infection to provide for its hive.', [OochType.Fungal], 8, 12, 8, 12, //total 40
        [ [1, Move.Bash],[2, Move.Embolden],[3, Move.SporeShot],[7, Move.Slash],[10, Move.Siphon], [13, Move.TakeOver],[17, Move.Bloom],[27, Move.Blight],[-1, Move.CausticOrb] ],
        [ Ability.Miniscule, Ability.Icky ], -1, 1, 12, 0)

        //Stingrowth
        create_monster(1, get_emote_string(client, 'stingrowth'), 'Stingrowth',
        'A strange protrusion is growing on this hive soldier, slowly gaining control over its movements.', [OochType.Fungal], 15, 20, 11, 14, //total 60
        [ [1, Move.Bash],[2, Move.Embolden],[3, Move.SporeShot],[7, Move.Slash],[10, Move.Siphon],[13, Move.TakeOver],[17, Move.Bloom],[27, Move.Blight],[-1, Move.CausticOrb] ], 
        [ Ability.Burdened, Ability.Icky ], 0, 2, 25, 1)

        //Queenect
        create_monster(2, get_emote_string(client, 'queenect'), 'Queenect',
        'A hive queen, completely overtaken by fungus. It continues to produce infected offspring even in this state.', [OochType.Fungal], 25, 25, 16, 14, //total 80
        [ [1, Move.Bash],[2, Move.Embolden],[3,Move.SporeShot],[7, Move.Slash],[10, Move.Siphon],[13, Move.TakeOver],[17, Move.Bloom],[27, Move.Blight],[-1, Move.CausticOrb] ],
        [ Ability.Burdened, Ability.Broodmother ], 1, -1, -1, 2)

        // Roocky
        create_monster(3, get_emote_string(client, 'roocky'), 'Roocky',
        'A ancient, crumbling pillar. The shadows beneath it are oddly comforting.', [OochType.Stone], 12, 8, 12, 8, //total 40
        [ [1, Move.Bash],[2, Move.Brittle],[3, Move.PebbleBlast],[8, Move.DustStorm],[11, Move.Sharpen],[17, Move.Boulderdash],[27, Move.LavaLance],[-1, Move.AshBlast] ],
        [ Ability.Tough, Ability.Shadow ], -1, 4, 12, 0)

        //Graknight
        create_monster(4, get_emote_string(client, 'graknight'), 'Graknight',
        'The stones have continued deteriorating revealing a gremlin-like form, it weilds fragments of its former body as a spear.', [OochType.Stone], 18, 15, 15, 12, //total 60
        [ [1, Move.Bash],[2, Move.Brittle],[3, Move.PebbleBlast],[8, Move.DustStorm],[11, Move.Sharpen],[17, Move.DustStorm],[27, Move.LavaLance],[-1, Move.AshBlast] ],
        [ Ability.Withering, Ability.Shadow ], 3, 5, 25, 1)

        //Kracking
        create_monster(5, get_emote_string(client, 'kracking'), 'Kracking',
        'Its body continues to wither away, freeing the shadows inside. The diamond eye in its center is its sole source of power.', [OochType.Stone], 22, 18, 22, 18, //total 80
        [ [1, Move.Bash],[2, Move.Brittle],[3, Move.PebbleBlast],[8, Move.DustStorm],[11, Move.Sharpen],[17, Move.DustStorm],[27, Move.LavaLance],[-1, Move.AshBlast] ], 
        [ Ability.Withering, Ability.Darkbright], 4, -1, -1, 2)

        //Puppyre
        create_monster(6, get_emote_string(client, 'puppyre'), 'Puppyre',
        'A very good boy, empowered by the spiraling patterns on its body.', [OochType.Flame], 10, 12, 8, 10, //total 40
        [ [1, Move.Bash],[2, Move.Intimidate],[3, Move.Fireball],[8, Move.Engulf],[11, Move.Torch],[17, Move.ClampDown],[20, Move.SlowBurn],[27, Move.Tumorize],[-1, Move.Inferno] ],
        [ Ability.Gentle, Ability.Warm ], -1, 7, 12, 0)

        //Dogglow
        create_monster(7, get_emote_string(client, 'dogglow'), 'Dogglow',
        'The etchings empowering its body have become corrupted, its flame now glows a sickly yellow.', [OochType.Flame], 13, 18, 14, 15, //total 60
        [ [1, Move.Bash],[2, Move.Intimidate],[3, Move.Fireball],[8, Move.Engulf],[11, Move.Torch],[17, Move.ClampDown],[20, Move.SlowBurn],[27, Move.Tumorize],[-1, Move.Inferno] ],
        [ Ability.Gentle, Ability.Radiant ], 6, 8, 25, 1)

        //Hounuke
        create_monster(8, get_emote_string(client, 'hounuke'), 'Hounuke',
        'Its body now radiates an eerie green, the once-pure etchings now shimmer and contort on its oozing skin.', [OochType.Flame], 16, 26, 18, 20, //total 80
        [ [1, Move.Bash],[2, Move.Intimidate],[3, Move.Fireball],[8, Move.Engulf],[11, Move.Torch],[17, Move.ClampDown],[20, Move.SlowBurn],[27, Move.Tumorize],[-1, Move.Inferno] ],
        [ Ability.Conflicted, Ability.Radiant ], 7, -1, -1, 2)

        //Glither
        create_monster(9, get_emote_string(client, 'glither'), 'Glither',
        'Its diamond-hard skin protects it from the most brutal of sandstorms.', [OochType.Stone], 15, 9, 14, 12, //total 50
        [ [1, Move.Bash],[2, Move.Intimidate],[3, Move.PebbleBlast],[8, Move.Slash],[13, Move.DustStorm],[15, Move.Sedimentation],[21, Move.Impale],[27, Move.Glimmer],[34, Move.Entomb],[-1, Move.GemBash] ],
        [ Ability.Tough, Ability.Reactive ], -1, 10, 12, 0)

        //Sparafura
        create_monster(10, get_emote_string(client, 'sparafura'), 'Sparafura',
        'These dangerous serpents are found beneath the desert sands. Their crushing bite shatters bone with ease.', [OochType.Stone], 18, 25, 16, 11, //total 70
        [ [1, Move.Bash],[2, Move.Intimidate],[3, Move.PebbleBlast],[8, Move.Slash],[13, Move.DustStorm],[15, Move.Sedimentation],[21, Move.Impale],[27, Move.Glimmer],[34, Move.Entomb],[-1, Move.GemBash] ],
        [ Ability.Burrower, Ability.Reactive ], 9, -1, -1, 1)
        
        //Constone
        create_monster(11, get_emote_string(client, 'constone'), 'Constone',
        'Found on salt flats, these strange beings move about on a single wheel rather than legs.', [OochType.Stone], 10, 10, 10, 20, //total 50
        [ [1, Move.Bash],[2, Move.Hasten],[4, Move.PebbleBlast],[7, Move.MagicBolt],[11, Move.Restruct],[18, Move.Boulderdash],[26, Move.Grind],[-1, Move.ArcaStrike] ],
        [ Ability.Inertia, Ability.Dense ], -1, 12, 15, 0)

        //Amephyst
        create_monster(12, get_emote_string(client, 'amephyst'), 'Amephyst',
        'The crystals that make up the core of its body have overtaken its left arm, creating a dangerous weapon.', [OochType.Stone], 15, 20, 15, 30, //total 80
        [ [1, Move.Bash],[2, Move.Hasten],[4, Move.PebbleBlast],[7, Move.MagicBolt],[11, Move.Restruct],[18, Move.Boulderdash],[26, Move.Grind],[33, Move.GemBash],[-1, Move.ArcaStrike] ],
        [ Ability.Inertia, Ability.Dense ], 11, -1, -1, 1)

        //Widew
        create_monster(13, get_emote_string(client, 'widew'), 'Widew',
        'The growth on its back forms a symbyotic relationship with the host, maximizing the amount of nutrients each can absorb.', [OochType.Fungal], 14, 10, 9, 12, //total 35
        [ [1, Move.Hit],[2, Move.Mud],[3, Move.SporeShot],[7, Move.Impale],[11, Move.StickyOrb],[17, Move.ThornShot],[23, Move.MycoBurst],[-1, Move.Glimmer] ],
        [ Ability.Moist, Ability.Miniscule ], -1, 14, 9, 0)

        //Tarotula
        create_monster(14, get_emote_string(client, 'tarotula'), 'Tarotula',
        'The fine hairs on its back help it detect nearby movement making ambushing this giant spider surprisingly difficult.', [OochType.Fungal], 21, 17, 12, 15, //total 65
        [ [1, Move.Hit],[2, Move.Mud],[3, Move.SporeShot],[7, Move.Impale],[11, Move.StickyOrb],[17, Move.TakeOver],[23, Move.MycoBurst],[32, Move.Bloom],[-1, Move.Glimmer] ], 
        [ Ability.Moist, Ability.Alert ], 13, -1, -1, 1)

        //Moldot
        create_monster(15, get_emote_string(client, 'moldot'), 'Moldot',
        'Novice explorers are often shocked by just how much of this creature is buried beneath the surface.', [OochType.Fungal], 5, 5, 25, 5, //total 40
        [ [1, Move.Bash],[2, Move.Soften],[5, Move.SporeShot],[12, Move.TakeOver],[17, Move.ClampDown],[20, Move.SlurpUp],[24, Move.Pulverize],[40, Move.Blight],[-1, Move.Entomb] ],
        [ Ability.Gentle, Ability.Burrower ], -1, 16, 26, 0)

        //Moldire
        create_monster(16, get_emote_string(client, 'moldire'), 'Moldire',
        'Its body is no longer able to fully fit in the crevice it grew up in, forcing its body to grow a defensive maw.', [OochType.Fungal], 25, 25, 30, 5, //total 85
        [ [1, Move.Bash],[2, Move.Soften],[5, Move.SporeShot],[12, Move.TakeOver],[17, Move.ClampDown],[20, Move.SlurpUp],[24, Move.Pulverize],[40, Move.Blight],[45, Move.Corrode],[-1, Move.Entomb] ],
        [ Ability.Gentle, Ability.Reactive ], 15, -1, -1, 1)

        //Charlite
        create_monster(17, get_emote_string(client, 'charlite'), 'Charlite',
        'Its life is tied to whatever it is currently burning, these creatures live a frail, fleeting life.', [OochType.Flame], 5, 15, 5, 10, //total 35
        [ [1, Move.Hit],[2, Move.Embolden],[4, Move.Fireball],[10, Move.DustStorm],[16, Move.Sparkler],[22, Move.Engulf],[27, Move.AshBlast],[37, Move.Torch],[-1, Move.Inferno] ],
        [ Ability.Fleeting, Ability.Warm ], -1, 18, 10, 0)

        //Darcoal
        create_monster(18, get_emote_string(client, 'darcoal'), 'Darcoal',
        'This flame has lived a surprisingly long life. It slowly burns its surroundings, covering the area in a thick black smoke.', [OochType.Flame], 15, 25, 13, 12, //total 65
        [ [1, Move.Hit],[2, Move.Embolden],[4, Move.Fireball],[10, Move.DustStorm],[16, Move.Sparkler],[22, Move.Engulf],[27, Move.AshBlast],[37, Move.Torch],[-1, Move.Inferno] ],
        [ Ability.Efficient, Ability.Warm ], 17, -1, -1, 1)

        //Torchoir
        create_monster(19, get_emote_string(client, 'torchoir'), 'Torchoir',
        'A sentient torch that hums a haunting tune. Its song fills people with dread.', [OochType.Flame], 12, 13, 11, 9, //total 45
        [ [1, Move.Bash],[3, Move.Fireball],[4, Move.Embolden],[7, Move.Impale],[12, Move.MagicBolt],[17, Move.Torch],[21, Move.ClampDown],[27, Move.Blink],[-1, Move.ArcaStrike] ],
        [ Ability.Boisterous, Ability.Haunted ], -1, 20, 18, 0)

        //Chantern
        create_monster(20, get_emote_string(client, 'chantern'), 'Chantern',
        'It can mimic the human voice nearly perfectly, though it only speaks in random phrases.', [OochType.Flame], 21, 20, 24, 15, //total 80
        [ [1, Move.Bash],[3, Move.Fireball],[4, Move.Embolden],[7, Move.Impale],[12, Move.MagicBolt],[17, Move.Torch],[21, Move.ClampDown],[27, Move.Blink],[40, Move.DrainLife], [-1, Move.ArcaStrike] ],
        [ Ability.Boisterous, Ability.Haunted ], 19, -1, -1, 1)

        //Eluslug
        create_monster(21, get_emote_string(client, 'eluslug'), 'Eluslug',
        'Oddly malleable despite its metallic body, it feeds on the magnetic wandering stones found in various locations.', [OochType.Tech], 11, 12, 12, 14, //total 50
        [ [1, Move.Bash],[2, Move.Soften], [3, Move.ByteBite],[10, Move.Digitize],[16, Move.SyncStrike],[24, Move.BlindingBeam],[-1, Move.Laminate] ],
        [ Ability.Leech, Ability.Icky ], -1, -1, -1, 0)

        //Jellime
        create_monster(22, get_emote_string(client, 'jellime'), 'Jellime',
        'A jellyfish-like creature, its probing tendrils ensnare whatever they touch.', [OochType.Ooze], 14, 10, 16, 10, //total 50
        [ [1, Move.Bash],[2, Move.Soften],[3, Move.Glob],[7, Move.MagicBolt],[11, Move.ClampDown],[18, Move.Impale],[25, Move.TangledThreads],[-1, Move.Laminate] ],
        [ Ability.Leech, Ability.Icky ], -1, 23, 15, 0)

        //Meduslime
        create_monster(23, get_emote_string(client, 'meduslime'), 'Meduslime',
        'With a strangely developed nervous system, this creature is capable of exploting any weaknesses it finds.', [OochType.Ooze], 16, 25, 19, 15, //total 75
        [ [1, Move.Bash],[2, Move.Soften],[3, Move.Glob],[7, Move.MagicBolt],[11, Move.ClampDown],[18, Move.Impale],[25, Move.TangledThreads],[-1, Move.Laminate] ],
        [ Ability.Leech, Ability.Icky ], 22, -1, -1, 1)

        //Tisparc
        create_monster(24, get_emote_string(client, 'tisparc'), 'Tisparc',
        'The hat-like crystal on its head grants it a magical energy which it cannot quite control.', [OochType.Magic], 8, 15, 7, 10, //total 45
        [ [1, Move.Bash],[2, Move.Embolden],[5, Move.MagicBolt],[9, Move.Sparkler],[14, Move.ArcaStrike],[16, Move.Kaleidoscope],[21, Move.Glimmer],[26, Move.CallThunder],[35, Move.GemBash],[-1, Move.Torch] ],
        [ Ability.Uncontrolled, Ability.Apprentice ], -1, 25, 13, 0)

        //Wizzap
        create_monster(25, get_emote_string(client, 'wizzap'), 'Wizzap',
        'It has mastered control of its crystal and uses it to produce highly dangerous magic arcs.', [OochType.Magic], 13, 23, 12, 12, //total 65
        [ [1, Move.Bash],[2, Move.Embolden],[5, Move.MagicBolt],[9, Move.Sparkler],[14, Move.ArcaStrike],[16, Move.Kaleidoscope],[21, Move.Glimmer],[26, Move.CallThunder],[35, Move.GemBash],[-1, Move.Torch] ],
        [ Ability.Focused, Ability.Patient ], 24, -1, -1, 1)

        //Blipoint
        create_monster(26, get_emote_string(client, 'blipoint'), 'Blipoint',
        'An eye peeks through a rift in space-time.', [OochType.Magic], 10, 7, 6, 7, //total 30
        [ [1, Move.Bash], [2, Move.Strike], [5, Move.Blink],[11, Move.HypeUp],[15, Move.Slash],[25, Move.Impale],[35, Move.TimeWarp],[-1, Move.Pulverize] ],
        [ Ability.Fleeting, Ability.Reactive ], -1, 27, 20, 0)        

        //Rerune
        create_monster(27, get_emote_string(client, 'rerune'), 'Rerune',
        'What seems to be part of a face begins to emerge from the rift, unable to fully reveal itself.', [OochType.Magic], 10, 15, 15, 15, //total 55
        [ [1, Move.Bash], [2, Move.Strike], [5, Move.Blink],[11, Move.HypeUp],[15, Move.Slash],[25, Move.Impale],[35, Move.TimeWarp],[-1, Move.Pulverize] ],
        [ Ability.Fleeting, Ability.Reactive ], 26, 28, 40, 1)   

        //Temporath
        create_monster(28, get_emote_string(client, 'temporath'), 'Temporath',
        'It was not meant to exist here and now, so it experiences episodes of uncontrollable rage.', [OochType.Magic], 20, 20, 20, 20, //total 80
        [ [1, Move.Bash], [2, Move.Strike], [5, Move.Blink],[11, Move.HypeUp],[15, Move.Slash],[25, Move.Impale],[35, Move.TimeWarp],[-1, Move.Pulverize] ],
        [ Ability.Uncontrolled, Ability.Withering ], 27, -1, -1, 2)

        //Nucleorb
        create_monster(29, get_emote_string(client, 'nucleorb'), 'Nucleorb',
        'The nucleus of a cell grown to a massive size, for a cell that is. This rarity is relatively helpless on its own.', [OochType.Ooze], 7, 13, 9, 11, //total 40
        [ [1, Move.Bash],[2, Move.Soften],[5, Move.Glob],[11, Move.Parasitize],[14, Move.CursedEye],[18, Move.Corrode],[24, Move.Pulverize],[-1, Move.Bloom] ],
        [ Ability.Miniscule, Ability.Gentle ], -1, 30, 12, 0)

        //Amebite
        create_monster(30, get_emote_string(client, 'amebite'), 'Amebite',
        'A ravenous macrocell that eats anything in its path, they grow and reproduce quickly enough to overrun entire ecosystems.', [OochType.Ooze], 11, 18, 12, 14, //total 55
        [ [1, Move.Bash],[2, Move.Soften],[5, Move.Glob],[11, Move.Parasitize],[14, Move.CursedEye],[18, Move.Corrode],[24, Move.Pulverize],[-1, Move.Bloom] ],
        [ Ability.Tough, Ability.Ravenous ], 29, 31, 22, 1)

        //Amalgrime
        create_monster(31, get_emote_string(client, 'amalgrime'), 'Amalgrime',
        'When an ecosystem is overrun by Amebite they eventually converge on a single point. The result is a massive, yet oddly gentle being.', [OochType.Ooze], 25, 20, 20, 20, //total 85
        [ [1, Move.Bash],[2, Move.Soften],[5, Move.Glob],[11, Move.Parasitize],[14, Move.CursedEye],[18, Move.Corrode],[24, Move.Pulverize],[30, Move.Suplex],[-1, Move.Bloom] ],
        [ Ability.Immense, Ability.Gentle ], 30, -1, -1, 2)

        //Drilline
        create_monster(32, get_emote_string(client, 'drilline'), 'Drilline',
        'Despite a simplified system, these robots are prone to going rogue. How they sustain themselves in the wild remains a mystery.', [OochType.Tech], 11, 14, 15, 5, //total 45
        [ [1, Move.Bash],[2, Move.Embolden],[4, Move.PebbleBlast],[7, Move.IronHammer],[8, Move.Sedimentation],[12, Move.Entomb],[20, Move.MetalLance],[29, Move.Grind],[-1, Move.Boulderdash] ],
        [ Ability.Armored, Ability.Inertia ], -1, 33, 21, 0)

        //Erwrek
        create_monster(33, get_emote_string(client, 'erwrek'), 'Erwrek',
        'It consumes whatever it can to replace its broken parts, when choices are slim it will even make use of organic material.', [OochType.Tech], 15, 19, 25, 16, //total 75
        [ [1, Move.Bash],[2, Move.Embolden],[4, Move.PebbleBlast],[7, Move.IronHammer],[8, Move.Sedimentation],[12, Move.Entomb],[20, Move.MetalLance],[29, Move.Grind],[-1, Move.Boulderdash] ],
        [ Ability.Armored, Ability.Leech ], 32, -1, -1, 1)

        //i_
        create_monster(34, get_emote_string(client, 'i_'), 'i_',
        'ERROR: entry not found', [OochType.Void], 1, 1, 1, 1, //total 30
        [ [1, Move.UndefinedInt] ], 
        [ Ability.InvalidEntry ], -1, -1, -1, 0)

        //NEW ONES, MAKE GOOD YES
        //Cromet
        create_monster(35, get_emote_string(client, 'cromet'), 'Cromet',
        'Cromet fall from the sky when the distant stars rupture in the night. Thousands can fall at the same time.', [OochType.Stone], 12, 13, 10, 15, //total 50
        [ [1, Move.Bash], [2, Move.Hasten], [4, Move.PebbleBlast], [9, Move.Gravitate], [12, Move.ClampDown], [15, Move.CrashLanding], [18, Move.Boulderdash], [-1, Move. SyncStrike] ],
        [ Ability.Inertia, Ability.Scorching ], -1, 36, 20, 0);

        //Lobstar
        create_monster(36, get_emote_string(client, 'lobstar'), 'Lobstar',
        'From a distance they seem to be stars in the sky, their weighty bodies are lifted by an immense amount of energy.', [OochType.Stone], 10, 35, 20, 10, //total 75
        [ [1, Move.Bash], [2, Move.Hasten], [4, Move.PebbleBlast], [9, Move.Gravitate], [12, Move.ClampDown], [15, Move.CrashLanding], [18, Move.Boulderdash], [23, Move.SolarBlast], [36, Move.DustStorm], [-1, Move. SyncStrike] ],
        [ Ability.Immense, Ability.Scorching ], 35, -1, -1, 1) 

        //Spoolette
        create_monster(37, get_emote_string(client, 'spoolette'), 'Spoolette',
        'While Spoolette itself is magical in nature, the threads it creates are completely mundane.', [OochType.Magic], 10, 15, 15, 10, //total 50
        [ [1, Move.Bash] ],
        [ Ability.Tangled, Ability.Tangled ], -1, 38, 18, 0);

        //Thimbite
        create_monster(38, get_emote_string(client, 'thimbite'), 'Thimbite',
        'Thimbite enchant a container when they evolve so that it can never be removed, touching one\'s container causes it to rage.', [OochType.Magic], 20, 20, 20, 10, //total 70
        [ [1, Move.Bash] ],
        [ Ability.Tangled, Ability.Leech ], 37, -1, -1, 1);

        //Digityke
        create_monster(39, get_emote_string(client, 'digityke'), 'Digityke',
        'An old-model of machine companion, its feeble body prevents it from being of much use.', [OochType.Tech], 10, 7, 8, 5, //total 30
        [ [1, Move.Bash], [2, Move.Strike], [5, Move.ByteBite], [7, Move.DigitalGamble], [12, Move.Suplex], [16, Move.SyncStrike], [20, Move.SelfDestruct], [-1, Move.BlindingBeam] ],
        [ Ability.Gentle, Ability.Efficient ], -1, 40, 21, 0);

        //Codet
        create_monster(40, get_emote_string(client, 'codet'), 'Codet',
        'An attempt to modernize the DGTY-k gone wrong. Despite being decomissioned these haunting machines continue to run.', [OochType.Tech], 30, 10, 10, 10, //total 60
        [ [1, Move.Bash], [2, Move.Strike], [5, Move.ByteBite], [7, Move.DigitalGamble], [12, Move.Suplex], [16, Move.SyncStrike], [20, Move.SelfDestruct], [26, Move.PhantomBullet], [32, Move.SyncStrike], [35, Move.ThornShot], [-1, Move.BlindingBeam]  ],
        [ Ability.Alert, Ability.Rogue ], 39, -1, -1, 1);

        //Heatri
        create_monster(41, get_emote_string(client, 'heatri'), 'Heatri',
        'A bird-like creature made of an ever-shifting fluid, in this form it becomes superheated.', [OochType.Flame], 25, 10, 10, 20, //total 65
        [ [1, Move.Bash], [3, Move.Hasten], [5, Move.Fireball], [10, Move.Threefold], [15, Move.Engulf], [25, Move.LavaLance], [30, Move.Eruption], [36, Move.Inferno], [-1, Move.SlowBurn] ],
        [ Ability.Crystallize ], 43, 42, 33, 1);

        //Moistri
        create_monster(42, get_emote_string(client, 'moistri'), 'Moistri',
        'Researchers studying Moistri tend to fall ill after handling it, despite this some believe it to have some sort of healing properties.', [OochType.Ooze], 25, 20, 10, 10, //total 65
        [ [1, Move.Bash], [3, Move.Soften], [5, Move.Glob], [10, Move.Threefold], [15, Move. Impale], [25, Move.ThornShot], [30, Move.SlurpUp], [36, Move.Kaleidoscope], [-1, Move.Blight]],
        [ Ability.Crystallize ], 41, 43, 33, 1);

        //Crystri
        create_monster(43, get_emote_string(client, 'crystri'), 'Crystri',
        'While its crystals appear rigid they maintain some sort of fluidity.', [OochType.Stone], 25, 10, 20, 10, //total 65
        [ [1, Move.Bash], [3, Move.MagicBolt], [5, Move.PebbleBlast], [10, Move.Threefold], [15, Move.Blink], [25, Move.DustStorm], [30, Move.Glimmer], [40, Move.GemBash], [-1, Move.GlassBlades] ],
        [ Ability.Crystallize ], 42, 41, 33, 1);

        //Solidifyr
        create_monster(44, get_emote_string(client, 'solidifyr'), 'Solidifyr',
        'Frequently found wandering lava fields. While unflinching in the face of an eruption, they will flee immediately if startled otherwise.', [OochType.Flame], 17, 13, 11, 9, //total 50
        [ [1, Move.Bash] ],
        [ Ability.Warm, Ability.Scorching ], -1, 45, 38, 0);

        //Obstaggard
        create_monster(45, get_emote_string(client, 'obstaggard'), 'Obstaggard',
        'While incredibly hard and sharp, their horns are very brittle. Obstaggard are often hunted in order to make precision blades.', [OochType.Stone], 19, 23, 17, 11, //total 70
        [ [1, Move.Bash] ],
        [ Ability.Withering, Ability.Lacerating ], 44, -1, -1, 1);

        //Droplunk
        create_monster(46, get_emote_string(client, 'droplunk'), 'Droplunk',
        'Oops, don\'t let this one drop on your head!', [OochType.Stone], 7, 10, 8, 15, //total 40
        [ [1, Move.Bash], [2, Move.Intimidate], [4, Move.PebbleBlast], [7, Move.Gravitate], [12, Move.Entomb], [13, Move.Mud], [20, Move.CursedEye], [27, Move.SyncStrike], [37, Move.Boulderdash], [43, Move.AshBlast], [-1, Move.ByteBite] ],
        [ Ability.Inertia, Ability.Gravity ], -1, 45, 28, 0);

        //Brykurse
        create_monster(47, get_emote_string(client, 'brykurse'), 'Brykurse',
        'Square meatball!', [OochType.Magic], 14, 28, 8, 25, //total 75
        [ [1, Move.Bash], [2, Move.Intimidate], [4, Move.PebbleBlast], [7, Move.Gravitate], [12, Move.Entomb], [13, Move.Mud], [20, Move.CursedEye], [27, Move.SyncStrike], [37, Move.Boulderdash], [43, Move.AshBlast], [-1, Move.ByteBite] ],
        [ Ability.Inertia, Ability.Gravity ], 46, -1, -1, 1);

        //Polyplute
        create_monster(48, get_emote_string(client, 'polyplute'), 'Polyplute',
        'Blooms of Polyplute create beatiful fields, however this phenomenon is incredibly dangerous as they make the environment around them toxic.', [OochType.Fungal], 12, 13, 12, 8, //total 45
        [ [1, Move.Bash] ],
        [ Ability.Sporespray, Ability.Leech ], -1, 49, 29, 0);

        //Reefest
        create_monster(49, get_emote_string(client, 'reefest'), 'Reefest',
        'When Polyplute blooms linger in an area, they often congeal into the massive Reefest.', [OochType.Fungal], 35, 15, 15, 5, //total 70
        [ [1, Move.Bash] ],
        [ Ability.Sporespray, Ability.Leech ], 48, -1, -1, 1);

        //Frigook
        create_monster(50, get_emote_string(client, 'frigook'), 'Frigook',
        'Frigook maintain a temperature just above the point of freezing and can quickly drop below it to harden their bodies.', [OochType.Ooze], 15, 5, 15, 5, //total 40
        [ [1, Move.Bash] ],
        [ Ability.Moist, Ability.Frostbite ], -1, 51, 23, 0);

        //Boreyuc
        create_monster(51, get_emote_string(client, 'boreyuc'), 'Boreyuc',
        'These beasts move incredibly slowly unless disturbed, liquefying their body and attacking immediately.', [OochType.Ooze], 15, 7, 30, 3, //total 65
        [ [1, Move.Bash] ],
        [ Ability.Bipolar, Ability.Frostbite ], 50, -1, -1, 1);

        //Vrumbox
        create_monster(52, get_emote_string(client, 'vrumbox'), 'Vrumbox',
        'Monowheeled automata built for carrying various pieces of equipment.', [ OochType.Tech ], 10, 10, 10, 15, //total 45
        [ [1, Move.Bash], [2, Move.Sawblade], [6, Move.Hasten], [12, Move.SelfDestruct], [19, Move.Barrage], [27, Move.Grind], [35, Move.DigitalGamble], [-1, Move.CallThunder] ],
        [ Ability.Inertia, Ability.Armored ], -1, 53, 18, 0);

        //Folduo
        create_monster(53, get_emote_string(client, 'folduo'), 'Folduo',
        'Folduo\'s body allows it to fit into small spaces. It also can combine with and dock with Vrumbox to create platforms.', [OochType.Tech], 15, 12, 13, 20, //total 60
        [ [1, Move.Bash], [2, Move.Sawblade], [6, Move.Hasten], [12, Move.SelfDestruct], [19, Move.Barrage], [27, Move.Grind], [35, Move.DigitalGamble], [-1, Move.CallThunder] ],
        [ Ability.Inertia, Ability.Armored ], 52, 54, 32, 1);

        //Hexyclone
        create_monster(54, get_emote_string(client, 'hexyclone'), 'Hexyclone',
        'A Hexcyclone\'s entire body can be folded into the space that acts as its head, allowing it to explore otherwise unenterable areas.', [OochType.Tech], 20, 13, 17, 25, //total 75
        [ [1, Move.Bash], [2, Move.Sawblade], [6, Move.Hasten], [12, Move.SelfDestruct], [19, Move.Barrage], [27, Move.Grind], [35, Move.DigitalGamble], [40, Move.Grind], [-1, Move.CallThunder] ],
        [ Ability.Hexiply, Ability.Efficient ], 53, -1, -1, 2);

        //Oochabit
        create_monster(55, get_emote_string(client, 'oochabit'), 'Oochabit',
        'These little guys\'ll consume space-time and do it with a smile on their faces.', [OochType.Void], 10, 9, 5, 6, //total 30
        [ [1, Move.Bash] ],
        [ Ability.Nullify ], -1, 56, 18, 0);

        //Oochabound
        create_monster(56, get_emote_string(client, 'oochabound'), 'Oochabound',
        'No thank you, I\'d really rather not write a description for this one.', [OochType.Void], 25, 23, 17, 20, //total 85
        [ [1, Move.Bash] ],
        [ Ability.Duplicant ], 55, -1, -1, 1);

        //NEW MONS START HERE

        //Kindeep
        create_monster(57, get_emote_string(client, 'kindeep'), 'Kindeep',
        'Schools of this fish-like oochamon are often found floating down in the caverns.', [OochType.Flame], 10, 13, 12, 20, //total 55
        [ [1, Move.Bash] ],
        [ Ability.Spectral, Ability.Gentle ], -1, 58, 30, 0);

        //Ablayzz
        create_monster(58, get_emote_string(client, 'ablayzz'), 'Ablayzz',
        'Its flames act as a beacon for young Kindeep, serving as a vanguard and guiding them.', [OochType.Flame], 20, 18, 17, 25, //total 80
        [ [1, Move.Bash] ],
        [ Ability.Spectral, Ability.Shadow ], 57, -1, -1, 1);

        //Krakle
        create_monster(59, get_emote_string(client, 'krakle'), 'Krakle',
        'This small \'mon has a superheated shell, don\'t touch it.', [OochType.Flame], 10, 13, 12, 20, //total 55
        [ [1, Move.Bash], [2, Move.Soften], [5, Move.Fireball], [7, Move.SlowBurn], [14, Move.Engulf], [-1, Move.Overgrowth]],
        [ Ability.Warm, Ability.Miniscule ], -1, 60, 11, 0);

        //Lightuft
        create_monster(60, get_emote_string(client, 'lightuft'), 'Lightuft',
        'They don\'t quite fly well yet, but they\'re known for dropping on unsuspecting victims, burning them in the process.', [OochType.Flame], 10, 13, 12, 20, //total 55
        [ [1, Move.Bash], [2, Move.Soften], [5, Move.Fireball], [7, Move.SlowBurn], [14, Move.Engulf], [20, Move.Torch], [27, Move.Inferno], [35, Move.BlindingBeam], [-1, Move.AshBlast] ],
        [ Ability.Warm, Ability.HeightAdvantage ], 59, 61, 25, 1);

        //Infernowl
        create_monster(61, get_emote_string(client, 'infernowl'), 'Infernowl',
        'These apex predators will find a single volcano and make its entirety their hunting ground.', [OochType.Flame], 10, 13, 12, 20, //total 55
        [ [1, Move.Bash], [2, Move.Soften], [5, Move.Fireball], [7, Move.SlowBurn], [14, Move.Engulf], [20, Move.Torch], [27, Move.Inferno], [35, Move.BlindingBeam], [-1, Move.AshBlast] ],
        [ Ability.Scorching, Ability.HeightAdvantage ], 60, -1, -1, 2);

        //Fluffly
        create_monster(62, get_emote_string(client, 'fluffly'), 'Fluffly',
        'These spore-infected creatures float gently on the wind. Incredibly soft. Potentially dangerous.', [OochType.Fungal], 10, 13, 12, 20, //total 55
        [ [1, Move.Bash], [2, Move.Soften], [5, Move.Overgrowth], [5, Move.Fireball], [7, Move.Blight], [7, Move.SlowBurn], [12, Move.EnfeeblingSpore], [14, Move.Engulf], [19, Move.CursedEye], [23, Move.MycoBurst], [29, Move.CausticOrb], [35, Move.ThornShot], [-1, Move.Overgrowth] ],
        [ Ability.Icky, Ability.Sporespray ], 59, 63, 28, 1);

        //Decavian
        create_monster(63, get_emote_string(client, 'decavian'), 'Decavian',
        'A bird-like creature barely holding itself together, the fungus throughout its body is incredibly heat-resistant.', [OochType.Fungal], 10, 13, 12, 20, //total 55
        [ [1, Move.Bash], [2, Move.Soften], [5, Move.Overgrowth], [5, Move.Fireball], [7, Move.Blight], [7, Move.SlowBurn], [12, Move.EnfeeblingSpore], [14, Move.Engulf], [19, Move.CursedEye], [23, Move.MycoBurst], [29, Move.CausticOrb], [35, Move.ThornShot], [-1, Move.Overgrowth] ],
        [ Ability.Radiant, Ability.Sporespray ], 62, -1, -1, 2);

        //Phaegrim
        create_monster(64, get_emote_string(client, 'phaegrim'), 'Phaegrim',
        'The only truly solid part of its body is the mask-like shell, the rest is several individuals working as one.', [OochType.Fungal], 10, 13, 12, 20, //total 55
        [ [1, Move.Bash] ],
        [ Ability.Icky, Ability.Haunted ], -1, 65, 30, 0);

        //Plaghast
        create_monster(65, get_emote_string(client, 'plaghast'), 'Plaghast',
        'Its tendrils be thinned and stretched over large swathes of land, acting as a widespread nervous system.', [OochType.Fungal], 20, 18, 17, 25, //total 80
        [ [1, Move.Bash] ],
        [ Ability.Alert, Ability.Leech ], 64, -1, -1, 1);

        //Grubbit
        create_monster(66, get_emote_string(client, 'grubbit'), 'Grubbit',
        'These small bugs can be found munching on bits of crystal.', [OochType.Stone], 15, 12, 13, 10, //total 50
        [ [1, Move.Bash] ],
        [ Ability.Tangled, Ability.Miniscule ], -1, 67, 8, 0);

        //Culcoon
        create_monster(67, get_emote_string(client, 'culcoon'), 'Culcoon',
        'It encases itself in threads and chunks of crystal, Culcoon\'s shells are incredibly tough.', [OochType.Stone], 20, 10, 30, 5, //total 65
        [ [1, Move.Bash] ],
        [ Ability.Dense, Ability.Immobile ], 66, 68, 20, 1);

        //Speculidae
        create_monster(68, get_emote_string(client, 'speculidae'), 'Speculidae',
        'Their thin bodies and stained glass-like wings belie their incredible rigidity.', [OochType.Stone], 12, 10, 35, 23, //total 80
        [ [1, Move.Bash] ],
        [ Ability.Crystallize, Ability.Lacerating ], 67, -1, -1, 2);

        //Nisythe
        create_monster(69, get_emote_string(client, 'nisythe'), 'Nisythe',
        'A haunting creature wielding a flaming scythe, it is nearly impossible to get a picture of this Oochamon.', [OochType.Magic], 17, 25, 12, 15, //total 69
        [ [1, Move.Bash] ],
        [ Ability.EasyGo ], -1, -1, -1, 0);

        //Tidoll
        create_monster(70, get_emote_string(client, 'tidoll'), 'Tidoll',
        'These creatures are barely more than sacks of liquid with no bones supporting them.', [OochType.Ooze], 15, 10, 15, 15, //total 55
        [ [1, Move.Bash] ],
        [ Ability.Moist, Ability.Hearty ], -1, 71, 24, 0);

        //Marinette
        create_monster(71, get_emote_string(client, 'marinette'), 'Marinette',
        'The golden threads controlling it are the main body, the rest is just ice-cold water.', [OochType.Ooze], 30, 23, 17, 10, //total 80
        [ [1, Move.Bash] ],
        [ Ability.Frostbite, Ability.Hearty ], 70, -1, -1, 1);

        //Durble
        create_monster(72, get_emote_string(client, 'durble'), 'Durble',
        'These small stone-creatures are incredibly friendly, some researchers have taken them in as pets.', [OochType.Stone], 15, 15, 15, 10, //total 55
        [ [1, Move.Bash] ],
        [ Ability.Gentle, Ability.Tough ], -1, 73, 24, 0);

        //Durubull
        create_monster(73, get_emote_string(client, 'durubull'), 'Durubull',
        'Unlike their previous form, Durubull are incredibly aggressive. Keep a safe distance if you can.', [OochType.Stone], 20, 25, 25, 15, //total 85
        [ [1, Move.Bash] ],
        [ Ability.Uncontrolled, Ability.Inertia ], 72, -1, -1, 1);

        //Rustail
        create_monster(74, get_emote_string(client, 'rustail'), 'Rustail',
        'These little lizards are made entirely of metal, their rusted tails act as an infectious weapon.', [OochType.Tech], 15, 15, 15, 10, //total 55
        [ [1, Move.Bash] ],
        [ Ability.Tangled, Ability.Lacerating ], -1, 75, 35, 0);

        //Oxydrake
        create_monster(75, get_emote_string(client, 'oxydrake'), 'Oxydrake',
        'Their heart is like a miniature reactor, how this creature evolved naturally is entirely unknown.', [OochType.Tech], 20, 25, 25, 15, //total 85
        [ [1, Move.Bash] ],
        [ Ability.Radioactive, Ability.Withering ], 74, -1, -1, 1);

        //Chakreye
        create_monster(76, get_emote_string(client, 'chakreye'), 'Chakreye',
        'Their body is surrounded by a rapidly spinning disc of plasma.', [OochType.Tech], 12, 18, 10, 15, //total 55
        [ [1, Move.Bash] ],
        [ Ability.Energized, Ability.Focused ], -1, 77, 30, 0);

        //Sabrink
        create_monster(77, get_emote_string(client, 'sabrink'), 'Sabrink',
        'A grinning energy blade that relentlessly pursues its enemies. ', [OochType.Tech], 18, 30, 17, 30, //total 85
        [ [1, Move.Bash] ],
        [ Ability.Efficient, Ability.Inertia ], 76, -1, -1, 1);

        //Sapler
        create_monster(78, get_emote_string(client, 'sapler'), 'Sapler',
        'These little guys are known to infest power stations and cables, slowly draining their energy.', [OochType.Tech], 15, 10, 20, 5, //total 50
        [ [1, Move.Bash] ],
        [ Ability.Bomber, Ability.Leech ], -1, 79, 20, 0);

        //Radient
        create_monster(79, get_emote_string(client, 'radient'), 'Radient',
        'Radient spread their influence by chopping off their limbs, which eventually form new Saplers.', [OochType.Tech], 25, 20, 20, 15, //total 80
        [ [1, Move.Bash] ],
        [ Ability.Bomber, Ability.Energized ], 78, -1, -1, 1);

        //Lasangato
        create_monster(80, get_emote_string(client, 'lasangato'), 'Lasangato',
        'A feline-like creature, known to bask for days at a time which causes layers of stone to build upon its back.', [OochType.Stone], 27, 10, 23, 10, //total 70
        [ [1, Move.Bash] ],
        [ Ability.Burdened, Ability.Burrower ], -1, -1, -1, 0);

        //Nullifly
        create_monster(81, get_emote_string(client, 'nullifly'), 'Nullifly',
        'Strange creatures which begin to swarm where pockets of Void appear.', [OochType.Void], 20, 20, 20, 20, //total 80
        [ [1, Move.Bash] ],
        [ Ability.Nullify ], -1, -1, -1, 0);

        //Crudoil
        create_monster(82, get_emote_string(client, 'crudoil'), 'Crudoil',
        'A living mass of an oil-like substance. They\'re always seen carrying a heavy metal ring.', [OochType.Ooze], 20, 20, 20, 20, //total 80
        [ [1, Move.Bash] ],
        [ Ability.Flammable, Ability.Warm ], -1, 83, 25, 0);

        //Oilantern
        create_monster(83, get_emote_string(client, 'oilantern'), 'Oilanten',
        'When Oilantern get angry enough the light they fuel gets hot enough to ignite their entire body.', [OochType.Ooze], 20, 20, 20, 20, //total 80
        [ [1, Move.Bash] ],
        [ Ability.Flammable, Ability.Hearty ], 82, -1, -1, 1);

        //Saporite
        create_monster(84, get_emote_string(client, 'saporite'), 'Saporite',
        'Also called mushroom fairies, these small creatures are very peaceful.', [OochType.Fungal], 20, 20, 20, 20, //total 80
        [ [1, Move.Bash] ],
        [ Ability.Gentle, Ability.Patient ], -1, 85, 32, 0);

        //Faering
        create_monster(85, get_emote_string(client, 'faering'), 'Faering',
        'When Saporite settle into the ground they form a network of mushrooms, granting them control of the ground itself.', [OochType.Fungal], 20, 20, 20, 20, //total 80
        [ [1, Move.Bash] ],
        [ Ability.Tangled, Ability.Immense ], 84, -1, -1, 1);

        //Kercobble
        create_monster(86, get_emote_string(client, 'kercobble'), 'Kerkobble',
        'A small floating stone, researchers are unsure it has enough intelligence to be considered an Oochamon.', [OochType.Stone], 20, 20, 20, 20, //total 80
        [ [1, Move.Bash] ],
        [ Ability.Gentle, Ability.Patient ], -1, 87, 42, 0);

        //Korkobble
        create_monster(87, get_emote_string(client, 'korkobble'), 'Korkobble',
        'If enough Kerkobble gather together, they work together form a neural network of sorts. It still isn\'n very smart though.', [OochType.Stone], 20, 20, 20, 20, //total 80
        [ [1, Move.Bash] ],
        [ Ability.Tangled, Ability.Immense ], 86, -1, -1, 1);

        //Ilushand
        create_monster(88, get_emote_string(client, 'ilushand'), 'Ilushand',
        'Its unknown whether Ilushand\'s main body is the creature in the mirror or the small orb constantly next to it.', [OochType.Magic], 20, 20, 20, 20, //total 80
        [ [1, Move.Bash] ],
        [ Ability.Reactive, Ability.Focused ], -1, 89, 20, 0);

        //Miroraj
        create_monster(89, get_emote_string(client, 'miroraj'), 'Miroraj',
        'It endlessly reflects its inner core making it incredibly difficult to percieve.', [OochType.Magic], 20, 20, 20, 20, //total 80
        [ [1, Move.Bash] ],
        [ Ability.Reactive, Ability.Rogue ], 88, -1, -1, 1);

        //Fritarge
        create_monster(90, get_emote_string(client, 'fritarge'), 'Fritarge',
        'The empty hust of what appears to be a bronze turtle. It rarely moves.', [OochType.Tech], 20, 20, 20, 20, //total 80
        [ [1, Move.Bash] ],
        [ Ability.Immobile, Ability.Armored ], -1, 91, 18, 0);

        //Wardred
        create_monster(91, get_emote_string(client, 'wardred'), 'Wardred',
        'The gaping maw on this creature\'s back echoes metallic whispers.', [OochType.Tech], 20, 20, 20, 20, //total 80
        [ [1, Move.Bash] ],
        [ Ability.Ravenous, Ability.Mundane ], 90, -1, -1, 1);

        //Congsume
        create_monster(92, get_emote_string(client, 'congsume'), 'Congsume',
        'It can\'t stop moving or the flames on its body will eventually catch up.', [OochType.Flame], 20, 20, 20, 20, //total 80
        [ [1, Move.Bash] ],
        [ Ability.Ravenous, Ability.EasyGo ], -1, 93, 18, 0);

        //Fevour
        create_monster(93, get_emote_string(client, 'fevour'), 'Fevour',
        'Whatever it eats is immediately burned to keep it alive.', [OochType.Flame], 20, 20, 20, 20, //total 80
        [ [1, Move.Bash] ],
        [ Ability.Ravenous, Ability.Withering ], 92, -1, -1, 1);

        //Tryptid
        create_monster(94, get_emote_string(client, 'tryptid'), 'Tryptid',
        'It seemingly appeared out of nowhere, creeping up from the darkness, and attaching parts of Oochamon to itself as it went.', [OochType.Stone, OochType.Fungal], 20, 20, 20, 20, //total 80
        [ [1, Move.Bash] ],
        [ Ability.HoleDweller ], -1, -1, -1, 0);

        //Roswier
        create_monster(95, get_emote_string(client, 'roswier'), 'Roswier',
        'The existence of Roswier leads researchers to believe that all Tech Oochamon are internally controled by organisms related to Ooze-types.', [OochType.Tech, OochType.Ooze], 20, 20, 20, 20, //total 80
        [ [1, Move.Bash] ],
        [ Ability.LiquidCooled ], -1, -1, -1, 0);

        //Chemerai
        create_monster(96, get_emote_string(client, 'chemerai'), 'Chemerai',
        'The crystal atop acts as an matter-energy converter of sorts, though its inner workings are completely unknown.', [OochType.Magic, OochType.Flame], 20, 20, 20, 20, //total 80
        [ [1, Move.Bash] ],
        [ Ability.PowerConduit ], -1, -1, -1, 0);

        //#endregion

        //#region Create Maps
        await db.maps.clear();
        let files = fs.readdirSync('./Maps/');
        for (let file of files) {
            if (file.includes('.json')) continue;
            let map_name = file.replace('.txt', '');

            fs.readFile(`./Maps/${file}`, 'utf8', (err, data) => {
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

