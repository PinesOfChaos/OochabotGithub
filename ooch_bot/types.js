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
}

const TypeEmote = {
    Flame: '<:icon_flame:1023031001611501648>',
    FlameLabel: '<:icon_flame_txt:1023031002408439939>',
    Fungal:  '<:icon_fungal:1023031003381514280>',
    FungalLabel: '<:icon_fungal_txt:1023031004220362802>',
    Magic: '<:icon_magic:1023031009966575686>',
    MagicLabel: '<:icon_magic_txt:1023031010818015292>',
    Neutral: '<:icon_neutral:1023031011703013376>',
    NeutralLabel: '<:icon_neutral_txt:1023031012495732746>',
    Ooze: '<:icon_ooze:1023031013355569262>',
    OozeLabel: '<:icon_ooze_txt:1023031014735491082>',
    Stone: '<:icon_stone:1023031015830204448>',
    StoneLabel: '<:icon_stone_txt:1023031016845217832>',
    Tech: '<:icon_tech:1023031017730224139>',
    TechLabel: '<:icon_tech_txt:1023031018896240640>',
    Void: '<:icon_void:1023031019466653738>',
    VoidLabel: '<:icon_void_txt:1023031020804645005>'
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
    BattleTrainer: 1,
    BattleWild: 2,
    Flags: 3,
    OochamonPick: 4,
    BeginGame: 5,
}

const DialogueType = {
    PreCombat: 0,
    NPCWin: 1,
    NPCLose: 2
}

const TrainerType = {
    Wild: 0,
    NPCTrainer: 1,
    OnlineUser: 2
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
    Burn: 'burned',
    BurnEmote: '<:status_burned:1023031032083128441>',
    Infect: 'infected',
    InfectEmote: '<:status_infected:1023031033744076930>',
    Blind: 'blinded',
    BlindEmote: '<:status_blinded:1023031030837416057>',
    Digitize: 'digitized',
    DigitizeEmote: '<:status_digitized:1023031032934576178>',
    Snare: 'snared',
    SnareEmote: '<:status_snared:1023031034733940798>',
    Vanish: 'vanished',
    VanishEmote: '<:status_vanish:1023053679328231424>',
    Doom: 'doomed',
    DoomEmote: '<:status_doomed:1023053678179012648>',
    Double: 'doubled',
    DoubleEmote: '<:status_doubled:1170203311199240302>',
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
    Strike: 41,
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
    Soften: 60,
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
    PhantomBullet: 81,
    FireyHorn: 83,
    Radiate: 84,
    Caltrops: 85,
    Lurk: 86,
    Fog: 87,
    Purify: 88,
    Reset: 89,
    DebugBomb: 90
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
    Bomber: 55
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
}

const ItemType = {
    Heal: 0,
    Prism: 1,
    Misc: 2,
}

const Tile = {
    Floor: 0,
    Npc: 1,
    Wall: 2,
    Grass: 3,
    Shop: 4,
    Int: 5, // Interactible
    Board: 6,
}

const Zone = {
    Global: 0,
    Fungal: 1,
    Sandy: 2,
    Cave: 3,
    Obsidian: 4
}

const TileEmoteGuildsArray = [
    '1023031950878965812',
    '1096230798149025825',
    '1251726480652632114',
    '1256328235122167949'
]

module.exports = { 
    PlayerState, TypeEmote, GraphicsMode, Flags, 
    EventMode, DialogueType, TrainerType, 
    Stats, Status, OochType, Move, Ability, Item,
    ItemType, Tile, Zone, TileEmoteGuildsArray
};