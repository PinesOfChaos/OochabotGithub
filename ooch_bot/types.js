// This file handles all enums and special types
module.exports = {
    PlayerState: {
        Intro: 'intro',
        Playspace: 'playspace',
        Dialogue: 'dialogue',
        Shop: 'shop',
        Menu: 'menu',
        Combat: 'combat',
        Cutscene: 'cutscene',
        NotPlaying: 'notplaying',
    },

    TypeEmote: {
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
    },

    GraphicsMode: {
        Quality: 0,
        Performance: 1
    },

    Flags: {
        FinishedIntro: 'intro|',
        NPC: 'npc|',
        Event: 'ev|',
    },

    EventMode:{
        Text:   0,
        Image:  1,
        Video:  2,
        BattleTrainer: 3,
        BattleWild: 4,
        Flags: 5
    }
}