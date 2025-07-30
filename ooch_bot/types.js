// This file handles all enums and special types
const PlayerState = {
    Intro: 'intro',
    Playspace: 'playspace',
    Dialogue: 'dialogue',
    Shop: 'shop',
    Menu: 'menu',
    Combat: 'combat',
    Cutscene: 'cutscene',
    Encounter: 'encounter',
    NotPlaying: 'notplaying',
    Trading: 'trading',
    Invited: 'invited',
    CombatOochSelect: 'combat_ooch_select',
    BattleSetup: 'battle_setup'
}

const GenmapTheme = {
    FungalCave : 0,
    ObsidianPath : 1
}

const TypeEmote = {
    Flame:      '<:icon_flame:1274936249484050472>',
    Fungal:     '<:icon_fungal:1274936267884199947>',
    Magic:      '<:icon_magic:1274936558595866787>',
    Neutral:    '<:icon_neutral:1274936582583091210>',
    Ooze:       '<:icon_ooze:1274936607136288810>',
    Stone:      '<:icon_stone:1274936641433243781>',
    Tech:       '<:icon_tech:1274936672022298624>',
    Void:       '<:icon_void:1274936702959485011>',
    Crystal:    '<:icon_crystal:1306340490857418893>',
    Cloth:      '<:icon_cloth:1306340508762771559>',
    Sound:      '<:icon_sound:1306340525376540773>',
    Martial:    '<:icon_martial:1306340540513517588>'
}

const GraphicsMode = {
    Quality: 0,
    Performance: 1
}

const Flags = {
    FinishedIntro: 'intro|',
    NPC: 'npc|',
    Event: 'ev|',
}

const EventMode = {
    Dialogue: 0,
    Battle: 1,
    Flags: 2,
    OochamonPick: 3,
    Transition: 4,
    Objective: 5,
    Options: 6,
    EventFinish: 7,
    Wait: 8,
    AddAlly: 9,
    RemoveAlly: 10,
    BattleGroupStart: 11,
    BattleGroupEnd: 12
}

const DialogueType = {
    PreCombat: 0,
    NPCWin: 1,
    NPCLose: 2
}

// Add special AI types here
const UserType = {
    Player: 0,
    Wild: 1,
    NPCTrainer: 2,
    NPCSmart : 3
}

const Stats = {
    HP: 'hp',
    Attack: 'atk',
    Defense: 'def',
    Speed: 'spd',
    Accuracy: 'acc',
    Evasion: 'eva',
}

const Status = {
    All: 'all',
    Burn: 0,
    Infect: 1,
    Blind: 2,
    Digitize: 3,
    Snare: 4,
    Vanish: 5,
    Doom: 6,
    Expose: 7,
    Focus: 8,
    Sleep: 9,
    Petrify: 10,
    Weak: 11,
    Revealed: 12,
    Drained: 13,

    //Special Status Types that affect how the move itself works
    Weather: 'weather',
    WeatherDependent: 'weather_dependant',
    Field: 'field',
    CritChance: 'critical',
    Heal: 'heal',
    ClearStatus: 'clear_status',
    ClearStatChanges: 'clear_stat_stages',
    GoingFirstBonus: 'going_first',
    GoingLastBonus: 'going_last',
    TrueDamage: 'true_damage',
    SweepDamage: 'sweep_damage'
}

const OochType = {
    Flame: 'flame',
    Fungal: 'fungal',
    Magic: 'magic',
    Neutral: 'neutral',
    Ooze: 'ooze',
    Stone: 'stone',
    Tech: 'tech',
    Void: 'void',
    Sound: 'sound',
    Crystal: 'crystal',
    Cloth: 'cloth',
    Martial: 'martial',
}

const Weather = {
    None : 'none', //No weather
    Clear : 'clear', //Used to clear weather
    Heatwave : 'heatwave',
    Thunderstorm : 'thunderstorm'
}

const TameStatus = {
    Hostile : '😡 Hostile',
    Angry : '😠 Angry',
    Neutral : '😐 Neutral',
    Happy: '😄 Happy',
    Loyal: '🫡 Loyal',
    BestFriend: '😍 Best Friends'
}

const StanceForms = {
    Base: 0,
    Attack: 1,
    Defense: 2,
    Speed: 3,
    Sniper: 4,
    //TODO: stances below this line probably don't work yet if this message is still here
    Corrupt: 5,
    Pure: 6,
    Elemental : 7
}

const FieldEffect = {
    None : 'none', //No field effect
    Clear : 'clear', //Used to clear field
    JaggedGround : 'jagged ground',
    EchoChamber : 'echo chamber',
    Wetlands : 'wetlands',
    TwistedReality : 'twisted reality'
}

const Move = {
    Hit: 0,
    Bash: 1,
    SporeShot: 2,
    PebbleBlast: 3,
    Fireball: 4,
    Slash: 5,
    TakeOver: 6,
    DustStorm: 7,
    Engulf: 8,
    Impale: 9,
    Bloom: 10,
    Boulderdash: 11,
    Torch: 12,
    Blight: 13,
    LavaLance: 14,
    Tumorize: 15,
    Glimmer: 16,
    GemBash: 17,
    CausticOrb: 18,
    Pulverize: 19,
    AshBlast: 20,
    Inferno: 21,
    Digitize: 22,
    ClampDown: 23,
    MagicBolt: 24,
    Sparkler: 25,
    ArcaStrike: 26,
    CallThunder: 27,
    StickyOrb: 28,
    Glob: 29,
    Blink: 30,
    TimeWarp: 31,
    MyceliumWhip: 32,
    Parasitize: 33,
    Corrode: 34,
    Grind: 35,
    MetalLance: 36,
    IronHammer: 37,
    Laminate: 38,
    Entomb: 39,
    UndefinedInt: 40,
    PrecisionStrike: 41,
    Barrage: 42,
    Eruption: 43,
    SelfDestruct: 44,
    Siphon: 45,
    DrainLife: 46,
    Restruct: 47,
    Flurry: 48,
    CrashLanding: 49,
    SolarBlast: 50,
    TangledThreads: 51,
    FatedThreads: 52,
    SyncStrike: 53,
    Threefold: 54,
    GlassBlades: 55,
    Gravitate: 56,
    Tenderize: 57,
    ByteBite: 58,
    Sawblade: 59,
    Limber: 60,
    Embolden: 61,
    Hasten: 62,
    Brittle: 63,
    Intimidate: 64,
    Mud: 65,
    HypeUp: 66,
    Sharpen: 67,
    CursedEye: 68,
    Suplex: 69,
    EnfeeblingSpore: 70,
    Torque: 71,
    SlowBurn: 72,
    Kaleidoscope: 73,
    BlindingBeam: 74,
    Overgrowth: 75,
    MycoBurst: 76,
    ThornShot: 77,
    SlurpUp: 78,
    DigitalGamble: 79,
    Sedimentation: 80,
    PlasmaCannon: 81,
    PhantomBullet: 82,
    FireyHorn: 83,
    Radiate: 84,
    Caltrops: 85,
    Lurk: 86,
    Fog: 87,
    Purify: 88,
    Reset: 89,
    DebugBomb: 90,
    Entrench: 91,
    NullSphere: 92,
    HighImpact :93,
    Shards: 94,
    RagWhip: 95,
    Screech: 96,
    LenseFlare:97,
    Bind: 98,
    Thunder: 99,
    RallyingCry: 100,
    CrystalBall: 101,
    SonicBoom: 102,
    EarShatter: 103,
    HealingGems: 104,
    ScarySheet: 105,
    FiberSlicer: 106,
    Mummify: 107,
    Jackpot: 108,
    JaggedGround: 109,
    EchoChamber: 110,
    Wetlands: 111,
    TwistedReality: 112,
    Heatwave: 113,
    Thunderstorm: 114,
    SkyClear: 115,
    PressureWave: 116,
    HeldStrike: 117,
    Lagspike: 118,
    Whiplash: 119,
    GuidedSpire: 120,
    Heatseeker: 121,
    EarSplitter: 122,
    Micronet: 123,
    AsbestosBomb: 124,
    TrueReflection: 125,
    GorgonEye: 126,
    HawkEye: 127,
    Frostbite: 128,
    LaserSweep: 129,
    Annihilate: 130,
    TargetLock: 131
}

const Ability = {
    Miniscule: 0,
    Icky: 1,
    Burdened: 2,
    Broodmother: 3,
    Tough: 4,
    Shadow: 5,
    Withering: 6,
    Darkbright: 7,
    Gentle: 8,
    Warm: 9,
    Radiant: 10,
    Conflicted: 11,
    Burrower: 12,
    Reactive: 13,
    Inertia: 14,
    Dense: 15,
    Moist: 16,
    Alert: 17,
    Fleeting: 18,
    Efficient: 19,
    Boisterous: 20,
    Haunted: 21,
    Leech: 22,
    Ensnare: 23,
    Uncontrolled: 24,
    Apprentice: 25,
    Focused: 26,
    Ravenous: 27,
    Immense: 28,
    Armored: 29,
    Scorching: 30,
    Tangled: 31,
    Mundane: 32,
    Rogue: 33,
    Crystallize: 34,
    Lacerating: 35,
    Gravity: 36,
    Sporespray: 37,
    Frostbite: 38,
    Bipolar: 39,
    Hexiply: 40,
    Nullify: 41,
    Duplicant: 42,
    Null: 43,
    InvalidEntry: 44,
    Immobile: 45,
    StringsAttached: 46,
    Corrosive: 47,
    Spectral: 48,
    HeightAdvantage: 49,
    Hearty: 50,
    Radioactive: 51,
    Energized: 52,
    Patient: 53,
    EasyGo: 54,
    Bomber: 55,
    Flammable: 56,
    HoleDweller: 57,
    PowerConduit: 58,
    LiquidCooled: 59,
    Increment: 60,
    Parry: 61,
    Riposte: 62,
    Swaying: 63,
    Thrashing: 64,
    Union: 65,
    Protector: 66,
    Phantasmal: 67,
    Matryoshka: 68,
    Thorned: 69,
    DownwardSpiral: 70,
    Constructor: 71,
    Neutralizer: 72,
    BassBoost: 73,
    Stealthy: 74,
    Pursuer: 75,
    Bloodrush: 76,
    Chronomancy: 77,
    Martyr: 78,
    Condiment: 79,
    DoubleOrNothing: 80,
    Vigorous: 81,
    Turbine: 82,
    Pact: 83,
    Exploiter: 84,
    Seer: 85,
    EscalationProtocol: 86,
    SpreadingSludge: 87,
    AncientPlating: 88,
    AncientWard: 89,
    Usurper: 90,
    PureCore: 91,
    Lullaby: 92
}

const Item = {
    Potion: 0,
    HiPotion: 1,
    MaxPotion: 2,
    Prism: 3,
    GreaterPrism: 4,
    GrandPrism: 5,
    PerfectPrism: 6,
    AttackCrystal: 7,
    IDCard: 8,
    Eyedrops: 9,
    Shears: 10,
    Daylily: 11,
    Antiparasite: 12,
    DebugChip: 13,
    CoolingBalm: 14,
    NullSphere: 15,
    GreenBoostgem: 16,
    RedBoostgem: 17,
    BlueBoostgem: 18,
    YellowBoostgem: 19,
    SporeFeather: 20,
    Lavaboard: 21,
    Repulsor: 22,
    Teleporter: 23,

    EssenceMonolith: 42,
    EssenceFragment: 43,
    EssenceShard: 44,
    EssenceChunk: 45
}

const ItemType = {
    Heal: 0,
    Prism: 1,
    Misc: 2,
}

const BattleState = {
    Start : 0,
    AwaitInput : 1,
    SetTurnOrder : 2,
    TurnsProcess : 3,
    EndOfRound : 4,
    EndOfBattle : 5
}

const BattleInput = {
    Attack: 'fight',
    Run : 'run',
    Switch : 'switch',
    Bag : 'bag',
    Info : 'info',
    Back : 'back',

    BagPrism: 'prism',
    BagHeal: 'heal',
    BagOther: 'other'
}

const BattleAction = { //These double as the base priority values for actions
    UserJoin :   -2_000_000,
    EndOfRound : -1_000_000,

    Attack :    0,

    Run :       2_000_000,
    Switch :    3_000_000,
    
    Prism :     4_000_000,
    Heal :      5_000_000,
    Other :     6_000_000,

    StanceChange :  1_000_000,
    
}

const Tile = {
    Floor: 0,
    Npc: 1,
    Wall: 2,
    Grass: 3,
    Shop: 4,
    Int: 5, // Interactible
    Board: 6,
    Ice: 7,
    Lava: 8
}

const Zone = {
    Global: 0,
    Fungal: 1,
    Sandy: 2,
    Cave: 3,
    Obsidian: 4,
    Training: 5,
    BuildingInterior: 6,
    Lava: 7,
    FlowerFields: 8,
    AncientBridge: 9,
    ThunderPeak: 10,
    Tunnel: 11,
    Scaffolds: 12,
    GooLake: 13,
    CrystalCave: 14,
    Tutorial: 15,
}

const MoveTag = {
    Light: 0,
    Electric: 1,
    Time : 2,
    Cold : 3
}

const MoveTarget = {
    Self :  0,
    Enemy : 1,
    All :   2,
    None :  3
}

const BattleAi = {
    Basic : 0,
    Smart : 1
}

export {
    PlayerState, TypeEmote, GraphicsMode, Flags, 
    EventMode, DialogueType, UserType, 
    Stats, Status, OochType, Move, Ability, Item,
    ItemType, Tile, Zone, MoveTag, BattleAi,
    MoveTarget, Weather, TameStatus, StanceForms, BattleState,
    BattleAction, BattleInput, FieldEffect, GenmapTheme
};