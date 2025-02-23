const { SlashCommandBuilder } = require('discord.js');
const { create_monster, create_move, create_item, create_ability, create_tile, create_status } = require('../func_create');
const fs = require('fs');
const db = require('../db.js');
const { OochType, Move, Ability, Zone, Tile, Status, MoveTag, MoveTarget, Stats, Weather, FieldEffect } = require('../types.js');
const { type_to_string } = require('../func_battle.js');
const { get_emote_string } = require('../func_other.js');
const { refresh_global_variables } = require('../func_global_data.js')

module.exports = {
    data: new SlashCommandBuilder()
        .setName('generate')
        .setDescription('Generates the game data.'),
    async execute(interaction, client) {
        await interaction.deferReply();
        if (interaction.user.id != '122568101995872256' && interaction.user.id != '145342159724347393') {
            return interaction.editReply({ content: 'You can\'t use this!', ephemeral: true });
        }

        let applicationEmojis = await client.application.emojis.fetch();

        // Clear out enmaps before
        await db.monster_data.clear();
        await db.move_data.clear();
        await db.ability_data.clear();
        await db.tile_data.clear();
        await db.item_data.clear();
        await db.status_data.clear();
        await db.maps.clear();
        await db.events_data.clear();

        //#region Tile Data
        // ZONES IDs
        // 00: GLOBAL
        // 01: FUNGAL
        // 02: SANDY
        // 03: CAVE
        // 04: OBSIDIAN
        // 05: TRAINING FACILITY
        // 06: BUILDING INTERIOR
        // 07: LAVA TILE
        // 08: FLOWER FIELD
        // 10: THUNDER PEAK
        // 11: TUNNEL
        // 12: SCAFFOLDS
        // 13: GOO LAKE
        // 14: CRYSTAL CAVE
        // 15: TUTORIAL
        let zG = Zone.Global < 10 ? `0${Zone.Global}` : Zone.Global;
        let zF = Zone.Fungal < 10 ? `0${Zone.Fungal}` : Zone.Fungal;
        let zS = Zone.Sandy < 10 ? `0${Zone.Sandy}` : Zone.Sandy;
        let zC = Zone.Cave < 10 ? `0${Zone.Cave}` : Zone.Cave;
        let zO = Zone.Obsidian < 10 ? `0${Zone.Obsidian}` : Zone.Obsidian;
        let zT = Zone.Training < 10 ? `0${Zone.Training}` : Zone.Training;
        let zB = Zone.BuildingInterior < 10 ? `0${Zone.BuildingInterior}` : Zone.BuildingInterior;
        let zL = Zone.Lava < 10 ? `0${Zone.Lava}` : Zone.Lava;
        let zFF = Zone.FlowerFields < 10 ? `0${Zone.FlowerFields}` : Zone.FlowerFields;
        let zAB = Zone.AncientBridge < 10 ? `0${Zone.AncientBridge}` : Zone.AncientBridge;
        let zTP = Zone.ThunderPeak < 10 ? `0${Zone.ThunderPeak}` : Zone.ThunderPeak;
        let zTn = Zone.Tunnel < 10 ? `0${Zone.Tunnel}` : Zone.Tunnel;
        let zSc = Zone.Scaffolds < 10 ? `0${Zone.Scaffolds}` : Zone.Scaffolds;
        let zGL = Zone.GooLake < 10 ? `0${Zone.GooLake}` : Zone.GooLake;
        let zCC = Zone.CrystalCave < 10 ? `0${Zone.CrystalCave}` : Zone.CrystalCave;
        let zTu = Zone.Tutorial < 10 ? `0${Zone.Tutorial}` : Zone.Tutorial;

        //           ID            Use            applicationEmojis
        // Global
        create_tile(`t${zG}_000`,  Tile.Wall,     applicationEmojis ); //Black 
        create_tile(`t${zG}_001`,  Tile.Floor,    applicationEmojis ); //Teleporter 
        //002 was a chest, but this is an NPC now
        create_tile(`t${zG}_003`,  Tile.Floor,    applicationEmojis ); //Arrow Left
        create_tile(`t${zG}_004`,  Tile.Floor,    applicationEmojis ); //Arrow Up
        create_tile(`t${zG}_005`,  Tile.Floor,    applicationEmojis ); //Arrow Right
        create_tile(`t${zG}_006`,  Tile.Floor,    applicationEmojis ); //Arrow Down
        create_tile(`t${zG}_007`,  Tile.Wall,     applicationEmojis ); //Shop Mini
        create_tile(`t${zG}_008`,  Tile.Wall,     applicationEmojis ); //Shop Upper Left
        create_tile(`t${zG}_009`,  Tile.Wall,     applicationEmojis ); //Shop Upper Right
        create_tile(`t${zG}_010`,  Tile.Shop,     applicationEmojis ); //Shop Lower Left (interactable tile)
        create_tile(`t${zG}_011`,  Tile.Wall,     applicationEmojis ); //Shop Lower Right 
        create_tile(`t${zG}_012`,  Tile.Floor,    applicationEmojis ); //Dungeon Exit Teleporter
        
        // Fungal
        create_tile(`t${zF}_000`,  Tile.Floor,    applicationEmojis ); //Fungal Floor
        create_tile(`t${zF}_001`,  Tile.Wall,     applicationEmojis ); //Fungal Wall
        create_tile(`t${zF}_002`,  Tile.Grass,    applicationEmojis ); //Fungal Grass
        create_tile(`t${zF}_003`,  Tile.Wall,     applicationEmojis ); //Fungal Wall
        create_tile(`t${zF}_004`,  Tile.Floor,    applicationEmojis ); //Fungal Exit
        create_tile(`t${zF}_005`,  Tile.Floor,    applicationEmojis ); //Fungal Floor Entrance
        create_tile(`t${zF}_006`,  Tile.Wall,     applicationEmojis ); //Fungal Inaccessible Area
        
        // Sandy
        create_tile(`t${zS}_000`,  Tile.Floor,    applicationEmojis ); //Sandy Floor
        create_tile(`t${zS}_001`,  Tile.Wall,     applicationEmojis ); //Sandy Wall
        create_tile(`t${zS}_002`,  Tile.Grass,    applicationEmojis ); //Sandy Grass
        create_tile(`t${zS}_003`,  Tile.Wall,     applicationEmojis ); //HUB Wall Top
        create_tile(`t${zS}_004`,  Tile.Wall,     applicationEmojis ); //HUB Wall Middle
        create_tile(`t${zS}_005`,  Tile.Wall,     applicationEmojis ); //Hub Wall Bottom
        create_tile(`t${zS}_006`,  Tile.Wall,     applicationEmojis ); //Hub Gate Top
        create_tile(`t${zS}_007`,  Tile.Wall,     applicationEmojis ); //Hub Gate Bottom
        create_tile(`t${zS}_008`,  Tile.Wall,     applicationEmojis ); //Hub Tent
        create_tile(`t${zS}_010`,  Tile.Wall,     applicationEmojis ); //Hub Dropship Upper Left
        create_tile(`t${zS}_011`,  Tile.Wall,     applicationEmojis ); //Hub Dropship Upper Right
        create_tile(`t${zS}_012`,  Tile.Wall,     applicationEmojis ); //Hub Dropship Lower Left
        create_tile(`t${zS}_013`,  Tile.Wall,     applicationEmojis ); //Hub Dropship Lower Right
        create_tile(`t${zS}_014`,  Tile.Wall,     applicationEmojis ); //Desert Wall Lower
        create_tile(`t${zS}_015`,  Tile.Wall,     applicationEmojis ); //Desert Wall Upper
        create_tile(`t${zS}_016`,  Tile.Floor,    applicationEmojis ); //Desert Exit
        create_tile(`t${zS}_017`,  Tile.Wall,     applicationEmojis ); //Hub Barrel
        create_tile(`t${zS}_018`,  Tile.Board,    applicationEmojis ); //Job Board
        create_tile(`t${zS}_019`,  Tile.Wall,     applicationEmojis ); //Sandy Inaccessible Area
        create_tile(`t${zS}_020`,  Tile.Floor,    applicationEmojis ); //Crater
        create_tile(`t${zS}_021`,  Tile.Floor,    applicationEmojis ); //Crater
        create_tile(`t${zS}_022`,  Tile.Board,    applicationEmojis ); //Crater (Center)
        create_tile(`t${zS}_023`,  Tile.Floor,    applicationEmojis ); //Crater
        

        // Cave
        create_tile(`t${zC}_000`,  Tile.Grass,    applicationEmojis ); //Cave Floor - changed to Tile.Grass type so that enemies can spawn anywhere in caves
        create_tile(`t${zC}_001`,  Tile.Floor,    applicationEmojis ); //Cave Floor Entrance
        create_tile(`t${zC}_002`,  Tile.Wall,     applicationEmojis ); //Cave Wall
        create_tile(`t${zC}_003`,  Tile.Wall,     applicationEmojis ); //Lava
        create_tile(`t${zC}_004`,  Tile.Floor,    applicationEmojis ); //Cave Exit
        create_tile(`t${zC}_005`,  Tile.Wall,     applicationEmojis ); //Cave Stalagtite
        create_tile(`t${zC}_006`,  Tile.Wall,     applicationEmojis ); //Cave Inaccessible Area
        create_tile(`t${zC}_010`,  Tile.Wall,     applicationEmojis ); //Cave Big Machine
        create_tile(`t${zC}_011`,  Tile.Wall,     applicationEmojis ); //Cave Big Machine
        create_tile(`t${zC}_012`,  Tile.Wall,     applicationEmojis ); //Cave Big Machine
        create_tile(`t${zC}_020`,  Tile.Wall,     applicationEmojis ); //Cave Big Machine
        create_tile(`t${zC}_021`,  Tile.Wall,     applicationEmojis ); //Cave Big Machine
        create_tile(`t${zC}_022`,  Tile.Wall,     applicationEmojis ); //Cave Big Machine
        create_tile(`t${zC}_030`,  Tile.Wall,     applicationEmojis ); //Cave Big Machine
        create_tile(`t${zC}_031`,  Tile.Wall,     applicationEmojis ); //Cave Big Machine
        create_tile(`t${zC}_032`,  Tile.Wall,     applicationEmojis ); //Cave Big Machine
        

        // Obsidian
        create_tile(`t${zO}_000`,  Tile.Floor,    applicationEmojis ); //Obsidian Floor
        create_tile(`t${zO}_001`,  Tile.Wall,     applicationEmojis ); //Obsidian Wall
        create_tile(`t${zO}_002`,  Tile.Grass,    applicationEmojis ); //Obsidian Grass
        create_tile(`t${zO}_003`,  Tile.Wall,     applicationEmojis ); //Obsidian Wall
        create_tile(`t${zO}_004`,  Tile.Wall,     applicationEmojis ); //Obsidian Inaccessible Area
        create_tile(`t${zO}_005`,  Tile.Floor,    applicationEmojis ); //Obsidian Cave Entrance
        create_tile(`t${zO}_006`,  Tile.Wall,     applicationEmojis ); //Obsidian Building
        create_tile(`t${zO}_007`,  Tile.Wall,     applicationEmojis ); //Obsidian Building
        create_tile(`t${zO}_008`,  Tile.Wall,     applicationEmojis ); //Obsidian Building
        create_tile(`t${zO}_009`,  Tile.Wall,     applicationEmojis ); //Obsidian Building
        create_tile(`t${zO}_010`,  Tile.Wall,     applicationEmojis ); //Obsidian Building
        create_tile(`t${zO}_011`,  Tile.Wall,     applicationEmojis ); //Obsidian Building
        create_tile(`t${zO}_012`,  Tile.Wall,     applicationEmojis ); //Obsidian Building
        create_tile(`t${zO}_013`,  Tile.Wall,     applicationEmojis ); //Obsidian Building
        create_tile(`t${zO}_014`,  Tile.Wall,     applicationEmojis ); //Obsidian Building
        create_tile(`t${zO}_015`,  Tile.Wall,     applicationEmojis ); //Obsidian Building
        create_tile(`t${zO}_016`,  Tile.Wall,     applicationEmojis ); //Obsidian Building
        create_tile(`t${zO}_017`,  Tile.Wall,     applicationEmojis ); //Obsidian Building
        create_tile(`t${zO}_018`,  Tile.Wall,     applicationEmojis ); //Obsidian Building
        create_tile(`t${zO}_019`,  Tile.Wall,     applicationEmojis ); //Obsidian Building
        create_tile(`t${zO}_020`,  Tile.Floor,    applicationEmojis ); //Obsidian Building Entrance
        create_tile(`t${zO}_021`,  Tile.Wall,     applicationEmojis ); //Obsidian Building
        create_tile(`t${zO}_022`,  Tile.Wall,     applicationEmojis ); //Obsidian Wall Torch

        //Training Facility
        create_tile(`t${zT}_000`,  Tile.Floor,    applicationEmojis ); //Training Floor
        create_tile(`t${zT}_001`,  Tile.Wall,     applicationEmojis ); //Training Wall
        create_tile(`t${zT}_002`,  Tile.Wall,     applicationEmojis ); //Training Inaccessible Area
        create_tile(`t${zT}_003`,  Tile.Wall,     applicationEmojis ); //Training Building
        create_tile(`t${zT}_004`,  Tile.Wall,     applicationEmojis ); //Training Building
        create_tile(`t${zT}_005`,  Tile.Wall,     applicationEmojis ); //Training Building
        create_tile(`t${zT}_006`,  Tile.Wall,     applicationEmojis ); //Training Building
        create_tile(`t${zT}_007`,  Tile.Wall,     applicationEmojis ); //Training Building
        create_tile(`t${zT}_010`,  Tile.Grass,    applicationEmojis ); //Obsidian Grass
        create_tile(`t${zT}_011`,  Tile.Wall,     applicationEmojis ); //Training Wall
        create_tile(`t${zT}_012`,  Tile.Floor,    applicationEmojis ); //Training Cave Entrance
        create_tile(`t${zT}_013`,  Tile.Wall,     applicationEmojis ); //Training Building
        create_tile(`t${zT}_014`,  Tile.Wall,     applicationEmojis ); //Training Building
        create_tile(`t${zT}_015`,  Tile.Wall,     applicationEmojis ); //Training Building
        create_tile(`t${zT}_016`,  Tile.Wall,     applicationEmojis ); //Training Building
        create_tile(`t${zT}_017`,  Tile.Wall,     applicationEmojis ); //Training Building
        create_tile(`t${zT}_020`,  Tile.Wall,     applicationEmojis ); //Training Fence
        create_tile(`t${zT}_021`,  Tile.Wall,     applicationEmojis ); //Training Fence
        create_tile(`t${zT}_022`,  Tile.Wall,     applicationEmojis ); //Training Fence
        create_tile(`t${zT}_023`,  Tile.Wall,     applicationEmojis ); //Training Building
        create_tile(`t${zT}_024`,  Tile.Wall,     applicationEmojis ); //Training Building
        create_tile(`t${zT}_025`,  Tile.Wall,     applicationEmojis ); //Training Building
        create_tile(`t${zT}_026`,  Tile.Wall,     applicationEmojis ); //Training Building
        create_tile(`t${zT}_027`,  Tile.Wall,     applicationEmojis ); //Training Building
        create_tile(`t${zT}_030`,  Tile.Wall,     applicationEmojis ); //Training Fence
        create_tile(`t${zT}_031`,  Tile.Wall,     applicationEmojis ); //Training Fence
        create_tile(`t${zT}_032`,  Tile.Wall,     applicationEmojis ); //Training Fence
        create_tile(`t${zT}_033`,  Tile.Wall,     applicationEmojis ); //Training Building
        create_tile(`t${zT}_034`,  Tile.Wall,     applicationEmojis ); //Training Building
        create_tile(`t${zT}_035`,  Tile.Wall,     applicationEmojis ); //Training Building
        create_tile(`t${zT}_036`,  Tile.Floor,    applicationEmojis ); //Training Building Entrance
        create_tile(`t${zT}_037`,  Tile.Wall,     applicationEmojis ); //Training Building
        create_tile(`t${zT}_040`,  Tile.Wall,     applicationEmojis ); //Training Fence
        create_tile(`t${zT}_041`,  Tile.Wall,     applicationEmojis ); //Training Fence
        create_tile(`t${zT}_042`,  Tile.Wall,     applicationEmojis ); //Training Fence
        create_tile(`t${zT}_043`,  Tile.Wall,     applicationEmojis ); //Training Wall (crate)

        //Building Interior
        create_tile(`t${zB}_000`,  Tile.Floor,    applicationEmojis ); //Interior Floor
        create_tile(`t${zB}_001`,  Tile.Wall,     applicationEmojis ); //Interior Barrel
        create_tile(`t${zB}_002`,  Tile.Floor,    applicationEmojis ); //Interior Entrance (Bottom)
        create_tile(`t${zB}_003`,  Tile.Floor,    applicationEmojis ); //Interior Entrance (Top)
        create_tile(`t${zB}_004`,  Tile.Wall,     applicationEmojis ); //Interior Wall
        create_tile(`t${zB}_005`,  Tile.Wall,     applicationEmojis ); //Interior Wall
        create_tile(`t${zB}_006`,  Tile.Wall,     applicationEmojis ); //Interior Wall
        create_tile(`t${zB}_010`,  Tile.Wall,     applicationEmojis ); //Interior Wall
        create_tile(`t${zB}_011`,  Tile.Wall,     applicationEmojis ); //Interior Wall
        create_tile(`t${zB}_012`,  Tile.Wall,     applicationEmojis ); //Interior Wall
        create_tile(`t${zB}_013`,  Tile.Wall,     applicationEmojis ); //Interior Wall
        create_tile(`t${zB}_014`,  Tile.Wall,     applicationEmojis ); //Interior Wall
        create_tile(`t${zB}_015`,  Tile.Wall,     applicationEmojis ); //Interior Wall
        create_tile(`t${zB}_016`,  Tile.Wall,     applicationEmojis ); //Interior Wall
        create_tile(`t${zB}_020`,  Tile.Floor,    applicationEmojis ); //Interior Stairs Down
        create_tile(`t${zB}_021`,  Tile.Floor,    applicationEmojis ); //Interior Stairs Down
        create_tile(`t${zB}_022`,  Tile.Floor,    applicationEmojis ); //Interior Stairs Down
        create_tile(`t${zB}_023`,  Tile.Wall,     applicationEmojis ); //Interior Wall
        create_tile(`t${zB}_024`,  Tile.Wall,     applicationEmojis ); //Interior Wall
        create_tile(`t${zB}_025`,  Tile.Wall,     applicationEmojis ); //Interior Wall
        create_tile(`t${zB}_026`,  Tile.Wall,     applicationEmojis ); //Interior Wall
        create_tile(`t${zB}_030`,  Tile.Wall,     applicationEmojis ); //Interior Wall
        create_tile(`t${zB}_031`,  Tile.Wall,     applicationEmojis ); //Interior Wall
        create_tile(`t${zB}_032`,  Tile.Floor,    applicationEmojis ); //Interior Floor
        create_tile(`t${zB}_033`,  Tile.Wall,     applicationEmojis ); //Interior Wall
        create_tile(`t${zB}_034`,  Tile.Wall,     applicationEmojis ); //Interior Wall
        create_tile(`t${zB}_035`,  Tile.Wall,     applicationEmojis ); //Interior Wall
        create_tile(`t${zB}_036`,  Tile.Wall,     applicationEmojis ); //Interior Wall

        //Lava
        create_tile(`t${zL}_000`,  Tile.Lava,     applicationEmojis ); //Lava

        //Flower Fields
        create_tile(`t${zFF}_000`,  Tile.Floor,    applicationEmojis ); //Flower Field Floor
        create_tile(`t${zFF}_001`,  Tile.Grass,    applicationEmojis ); //Flower Field Grass
        create_tile(`t${zFF}_002`,  Tile.Grass,    applicationEmojis ); //Flower Field Grass
        create_tile(`t${zFF}_003`,  Tile.Grass,    applicationEmojis ); //Flower Field Grass
        create_tile(`t${zFF}_004`,  Tile.Grass,    applicationEmojis ); //Flower Field Grass
        create_tile(`t${zFF}_010`,  Tile.Wall,     applicationEmojis ); //Flower Field Wall
        create_tile(`t${zFF}_011`,  Tile.Wall,     applicationEmojis ); //Flower Field Wall
        create_tile(`t${zFF}_012`,  Tile.Wall,     applicationEmojis ); //Flower Field Wall
        create_tile(`t${zFF}_013`,  Tile.Wall,     applicationEmojis ); //Flower Field Wall
        create_tile(`t${zFF}_020`,  Tile.Wall,     applicationEmojis ); //Flower Field Inaccessible
        create_tile(`t${zFF}_021`,  Tile.Wall,     applicationEmojis ); //Flower Field Wall
        create_tile(`t${zFF}_023`,  Tile.Wall,     applicationEmojis ); //Flower Field Wall
        create_tile(`t${zFF}_024`,  Tile.Floor,    applicationEmojis ); //Flower Field Wall

        //Ancient Bridge
        create_tile(`t${zAB}_000`,  Tile.Floor,    applicationEmojis ); //Ancient Bridge Floor
        create_tile(`t${zAB}_001`,  Tile.Wall,     applicationEmojis ); //Ancient Bridge Wall
        create_tile(`t${zAB}_002`,  Tile.Wall,     applicationEmojis ); //Ancient Bridge Wall
        create_tile(`t${zAB}_010`,  Tile.Wall,     applicationEmojis ); //Ancient Bridge Wall
        create_tile(`t${zAB}_011`,  Tile.Wall,     applicationEmojis ); //Ancient Bridge Wall
        create_tile(`t${zAB}_012`,  Tile.Wall,     applicationEmojis ); //Ancient Bridge Wall
        create_tile(`t${zAB}_020`,  Tile.Wall,     applicationEmojis ); //Ancient Bridge Wall
        create_tile(`t${zAB}_021`,  Tile.Wall,     applicationEmojis ); //Ancient Bridge Wall
        create_tile(`t${zAB}_030`,  Tile.Wall,     applicationEmojis ); //Ancient Bridge Wall
        create_tile(`t${zAB}_031`,  Tile.Wall,     applicationEmojis ); //Ancient Bridge Wall

        //Thunder Peak
        create_tile(`t${zTP}_000`,  Tile.Floor,    applicationEmojis ); //Thunder Peak Floor
        create_tile(`t${zTP}_001`,  Tile.Wall,     applicationEmojis ); //Thunder Peak Wall
        create_tile(`t${zTP}_002`,  Tile.Wall,     applicationEmojis ); //Thunder Peak Wall
        create_tile(`t${zTP}_003`,  Tile.Wall,     applicationEmojis ); //Thunder Peak Wall (Ice)
        create_tile(`t${zTP}_004`,  Tile.Wall,     applicationEmojis ); //Thunder Peak Wall
        create_tile(`t${zTP}_010`,  Tile.Grass,    applicationEmojis ); //Thunder Peak Grass
        create_tile(`t${zTP}_011`,  Tile.Wall,     applicationEmojis ); //Thunder Peak Wall
        create_tile(`t${zTP}_012`,  Tile.Floor,    applicationEmojis ); //Thunder Peak Floor (Spiky Bits)
        create_tile(`t${zTP}_013`,  Tile.Ice,      applicationEmojis ); //Thunder Peak Ice

        //Tunnel
        create_tile(`t${zTn}_000`,  Tile.Floor,    applicationEmojis ); //Tunnel Floor
        create_tile(`t${zTn}_001`,  Tile.Wall,     applicationEmojis ); //Tunnel Wall
        create_tile(`t${zTn}_002`,  Tile.Wall,     applicationEmojis ); //Tunnel Wall
        create_tile(`t${zTn}_003`,  Tile.Wall,     applicationEmojis ); //Tunnel Wall
        create_tile(`t${zTn}_004`,  Tile.Wall,     applicationEmojis ); //Tunnel Wall
        create_tile(`t${zTn}_005`,  Tile.Floor,    applicationEmojis ); //Tunnel Door Upper
        create_tile(`t${zTn}_006`,  Tile.Wall,     applicationEmojis ); //Tunnel Wall
        create_tile(`t${zTn}_007`,  Tile.Wall,     applicationEmojis ); //Tunnel Wall
        create_tile(`t${zTn}_008`,  Tile.Floor,    applicationEmojis ); //Tunnel Wall
        create_tile(`t${zTn}_009`,  Tile.Wall,     applicationEmojis ); //Tunnel Wall
        create_tile(`t${zTn}_010`,  Tile.Floor,    applicationEmojis ); //Tunnel Floor
        create_tile(`t${zTn}_011`,  Tile.Wall,     applicationEmojis ); //Tunnel Wall
        create_tile(`t${zTn}_012`,  Tile.Wall,     applicationEmojis ); //Tunnel Wall
        create_tile(`t${zTn}_013`,  Tile.Wall,     applicationEmojis ); //Tunnel Wall
        create_tile(`t${zTn}_015`,  Tile.Wall,     applicationEmojis ); //Tunnel Wall
        create_tile(`t${zTn}_016`,  Tile.Wall,     applicationEmojis ); //Tunnel Wall
        create_tile(`t${zTn}_017`,  Tile.Wall,     applicationEmojis ); //Tunnel Wall
        create_tile(`t${zTn}_018`,  Tile.Wall,     applicationEmojis ); //Tunnel Wall
        create_tile(`t${zTn}_019`,  Tile.Wall,     applicationEmojis ); //Tunnel Wall
        create_tile(`t${zTn}_025`,  Tile.Wall,     applicationEmojis ); //Tunnel Wall
        create_tile(`t${zTn}_026`,  Tile.Wall,     applicationEmojis ); //Tunnel Wall
        create_tile(`t${zTn}_027`,  Tile.Wall,     applicationEmojis ); //Tunnel Wall
        create_tile(`t${zTn}_028`,  Tile.Wall,     applicationEmojis ); //Tunnel Wall
        create_tile(`t${zTn}_029`,  Tile.Wall,     applicationEmojis ); //Tunnel Wall

        //Scaffolds
        create_tile(`t${zSc}_000`,  Tile.Floor,    applicationEmojis ); //Scaffolds Floor
        create_tile(`t${zSc}_001`,  Tile.Wall,     applicationEmojis ); //Scaffolds Wall
        create_tile(`t${zSc}_002`,  Tile.Wall,     applicationEmojis ); //Scaffolds Wall
        create_tile(`t${zSc}_003`,  Tile.Wall,     applicationEmojis ); //Scaffolds Wall
        create_tile(`t${zSc}_010`,  Tile.Wall,     applicationEmojis ); //Scaffolds Wall
        create_tile(`t${zSc}_011`,  Tile.Wall,     applicationEmojis ); //Scaffolds Wall
        create_tile(`t${zSc}_012`,  Tile.Wall,     applicationEmojis ); //Scaffolds Wall
        create_tile(`t${zSc}_020`,  Tile.Wall,     applicationEmojis ); //Scaffolds Wall
        create_tile(`t${zSc}_021`,  Tile.Wall,     applicationEmojis ); //Scaffolds Wall
        create_tile(`t${zSc}_022`,  Tile.Wall,     applicationEmojis ); //Scaffolds Wall

        //Goo Lake
        create_tile(`t${zGL}_000`,  Tile.Floor,    applicationEmojis ); //Goo Lake Floor
        create_tile(`t${zGL}_001`,  Tile.Grass,    applicationEmojis ); //Goo Lake Wall
        create_tile(`t${zGL}_010`,  Tile.Wall,     applicationEmojis ); //Goo Lake Wall
        create_tile(`t${zGL}_011`,  Tile.Wall,     applicationEmojis ); //Goo Lake Wall
        create_tile(`t${zGL}_020`,  Tile.Wall,     applicationEmojis ); //Goo Lake Wall
        create_tile(`t${zGL}_030`,  Tile.Wall,     applicationEmojis ); //Goo Lake Wall
        create_tile(`t${zGL}_040`,  Tile.Wall,     applicationEmojis ); //Goo Lake Wall

        //Tutorial
        create_tile(`t${zTu}_000`,  Tile.Floor,    applicationEmojis ); //Tutorial Floor
        create_tile(`t${zTu}_001`,  Tile.Wall,     applicationEmojis ); //Tutorial Wall
        create_tile(`t${zTu}_002`,  Tile.Wall,     applicationEmojis ); //Tutorial Wall
        create_tile(`t${zTu}_003`,  Tile.Wall,     applicationEmojis ); //Tutorial Wall
        create_tile(`t${zTu}_004`,  Tile.Wall,     applicationEmojis ); //Tutorial Wall
        create_tile(`t${zTu}_011`,  Tile.Floor,    applicationEmojis ); //Tutorial Door Open
        create_tile(`t${zTu}_013`,  Tile.Floor,    applicationEmojis ); //Spike Floor Deactivated
        create_tile(`t${zTu}_020`,  Tile.Wall,     applicationEmojis ); //Elevator
        create_tile(`t${zTu}_021`,  Tile.Wall,     applicationEmojis ); //Elevator
        create_tile(`t${zTu}_022`,  Tile.Wall,     applicationEmojis ); //Elevator
        create_tile(`t${zTu}_030`,  Tile.Wall,     applicationEmojis ); //Elevator
        create_tile(`t${zTu}_031`,  Tile.Wall,     applicationEmojis ); //Elevator
        create_tile(`t${zTu}_032`,  Tile.Wall,     applicationEmojis ); //Elevator
        create_tile(`t${zTu}_040`,  Tile.Wall,     applicationEmojis ); //Elevator
        create_tile(`t${zTu}_041`,  Tile.Wall,     applicationEmojis ); //Elevator
        create_tile(`t${zTu}_042`,  Tile.Wall,     applicationEmojis ); //Elevator
        create_tile(`t${zTu}_050`,  Tile.Wall,     applicationEmojis ); //Elevator
        create_tile(`t${zTu}_051`,  Tile.Wall,     applicationEmojis ); //Elevator
        create_tile(`t${zTu}_052`,  Tile.Wall,     applicationEmojis ); //Elevator
        create_tile(`t${zTu}_061`,  Tile.Wall,     applicationEmojis ); //Elevator
        create_tile(`t${zTu}_062`,  Tile.Wall,     applicationEmojis ); //Elevator
        create_tile(`t${zTu}_070`,  Tile.Wall,     applicationEmojis ); //Elevator
        create_tile(`t${zTu}_071`,  Tile.Wall,     applicationEmojis ); //Elevator
        create_tile(`t${zTu}_072`,  Tile.Wall,     applicationEmojis ); //Elevator
        create_tile(`t${zTu}_080`,  Tile.Wall,     applicationEmojis ); //Elevator
        create_tile(`t${zTu}_081`,  Tile.Wall,     applicationEmojis ); //Elevator
        create_tile(`t${zTu}_082`,  Tile.Wall,     applicationEmojis ); //Elevator
        create_tile(`t${zTu}_090`,  Tile.Wall,     applicationEmojis ); //Elevator
        create_tile(`t${zTu}_091`,  Tile.Wall,     applicationEmojis ); //Elevator
        create_tile(`t${zTu}_092`,  Tile.Wall,     applicationEmojis ); //Elevator

        // NPCs
        create_tile(`c_000`,       Tile.Npc,      applicationEmojis ); // Main Character
        create_tile(`c_001`,       Tile.Npc,      applicationEmojis ); // Basic NPC Obsidian
        create_tile(`c_002`,       Tile.Npc,      applicationEmojis ); // Basic NPC Desert Rags
        create_tile(`c_003`,       Tile.Npc,      applicationEmojis ); // Basic NPC Neon Blue
        create_tile(`c_004`,       Tile.Npc,      applicationEmojis ); // Basic NPC Fungal
        create_tile(`c_005`,       Tile.Npc,      applicationEmojis ); // Global Scientist
        create_tile(`c_006`,       Tile.Npc,      applicationEmojis ); // Global Elderly Researcher
        create_tile(`c_007`,       Tile.Npc,      applicationEmojis ); // Global Rival
        create_tile(`c_008`,       Tile.Npc,      applicationEmojis ); // Global Desert Raider
        create_tile(`c_009`,       Tile.Npc,      applicationEmojis ); // Global Department Head
        create_tile(`c_010`,       Tile.Npc,      applicationEmojis ); // Corrupted NPC (Fungal)
        create_tile(`c_011`,       Tile.Npc,      applicationEmojis ); // Shopkeeper
        create_tile(`c_012`,       Tile.Int,      applicationEmojis ); // Crater
        create_tile(`c_013`,       Tile.Int,      applicationEmojis ); // Chest
        create_tile(`c_014`,       Tile.Npc,      applicationEmojis ); // Basic NPC Construction Worker
        create_tile(`c_015`,       Tile.Npc,      applicationEmojis ); // Corrupted NPC (Tech)
        create_tile(`c_016`,       Tile.Npc,      applicationEmojis ); // Global CFO
        create_tile(`c_017`,       Tile.Int,      applicationEmojis ); // Tutorial Door Closed
        create_tile(`c_018`,       Tile.Npc,      applicationEmojis ); // Mr. Nice
        create_tile(`c_019`,       Tile.Int,      applicationEmojis ); // Tutorial Spikes
        create_tile(`c_020`,       Tile.Npc,      applicationEmojis ); // Generic Sign
        create_tile(`c_021`,       Tile.Int,      applicationEmojis ); // Mechanical Wall
        create_tile(`c_022`,       Tile.Int,      applicationEmojis ); // Character on Lavaboard
        create_tile(`c_023`,       Tile.Int,      applicationEmojis ); // Character on Teleporter
        create_tile(`c_024`,       Tile.Int,      applicationEmojis ); // Thunder Peak Thunderball (Amber)
        create_tile(`c_025`,       Tile.Int,      applicationEmojis ); // Thunder Peak Thunderball (Blue)
        create_tile(`c_026`,       Tile.Int,      applicationEmojis ); // Thunder Peak Thunderball (Pink)


        //#endregion

        //#region Item Data
        create_item({
            id : 0, name : 'Potion', emote : '<:item_potion:1274937121370669118>',
            category : 'heal_inv', type : 'potion', price : 40, potency : 20, 
            description : 'A potion filled with a mysterious mix of chemicals. Slightly heals an injured Oochamon.',
            description_short : 'Used to heal an Oochamon for 20 HP.'
        })
        create_item({
            id : 1, name : 'Med-Potion', emote : '<:item_potion_hi:1274937134935052328>',
            category : 'heal_inv', type : 'potion', price : 200, potency : 50, 
            description : 'After further development a slightly stronger potion has been developed. Heals an injured Oochamon.',
            description_short : 'Used to heal an Oochamon for 50 HP.'
        })
        create_item({
            id : 2, name : 'Hi-Potion', emote : '<:item_potion_magic:1274937146423115922>',
            category : 'heal_inv', type : 'potion', price : 800, potency : 200, 
            description : 'A high-tier potion created after several iterations. Greatly restores health to an oochamon.',
            description_short : 'Used to heal an Oochamon for 200 HP.'
        })
        create_item({
            id : 3, name : 'Prism', emote : '<:item_prism:1274937161262698536>',
            category : 'prism_inv', type : 'prism', price : 50, potency : 1, 
            description : 'A device developed using ancient technology found on the planet. It\'s used to capture Oochamon.',
            description_short : 'Has a chance to capture an Oochamon.'
        })
        create_item({
            id : 4, name : 'Greater Prism', emote : '<:item_prism_greater:1274937183710740510>',
            category : 'prism_inv', type : 'prism', price : 150, potency : 1.6, 
            description : 'Developments in prism technology have created this improved prism with a higher capture rate.',
            description_short : 'Has an increased chance to capture an Oochamon.'
        })
        create_item({
            id : 5, name : 'Grand Prism', emote : '<:item_prism_grand:1274937171513442359>',
            category : 'prism_inv', type : 'prism', price : 500, potency : 2.5, 
            description : 'A further modified prism with an even higher capture rate, thought to be the upper limits of capture technology.',
            description_short : 'Has a high chance to capture an Oochamon.'
        })
        create_item({
            id : 6, name : 'Perfect Prism', emote : '<:item_prism_perfect:1274937195970428928>',
            category : 'prism_inv', type : 'prism', price : 10000, potency : 1000, 
            description : 'A prism created in what was certainly an accident, with a black core and shattered casing, nothing escapes its pull.',
            description_short : 'Has a 100% chance to capture an Oochamon.'
        })
        create_item({
            id : 7, name : 'Attack Crystal', emote : '<:item_attack_crystal:1274936834883059774>',
            category : 'other_inv', type : 'move_unlock', price : 2000, potency : 1, 
            description : 'Glimmering crystals from deep within the planets core. They have the potential to unlock a hidden move for an Oochamon by releasing stored power.',
            description_short : 'Unlocks a hidden move for an Oochamon.'
        })
        create_item({
            id : 8, name : 'ID Card', emote : '<:item_id_card:1304609783474552842>',
            category : 'other_inv', type : 'key', price : -1, potency : 1, 
            description : 'Your ID card. You look so fabulous!',
            description_short : 'Grants access to various Oochcorp facilities.'
        })
        create_item({
            id : 9, name : 'Eyedrops', emote : '<:item_eyedrops:1274937019994472459>',
            category : 'heal_inv', type : 'status', price : 80, potency : Status.Blind, 
            description : 'A small vial of very powerful eyedrops. It burns to touch, but seems fine for Oochamon to use.',
            description_short : 'Removes BLIND status effect.'
        })
        create_item({
            id : 10, name : 'Shears', emote : '<:item_shears:1274937209652514838>',
            category : 'heal_inv', type : 'status', price : 80, potency : Status.Snare, 
            description : 'Titanium reinforced shears, they\'ll cut through anything holding your Oochamon down.',
            description_short : 'Removes SNARED status effect.'
        })
        create_item({
            id : 11, name : 'Daylily', emote : '<:item_daylily:1274936962125402143>',
            category : 'heal_inv', type : 'status', price : 80, potency : Status.Doom, 
            description : 'A small white flower said to be found on a plateau above the clouds, it has the ability to change the fate of an Oochamon.',
            description_short : 'Removes DOOMED status effect.'
        })
        create_item({
            id : 12, name : 'Antiparasite', emote : '<:item_antiparasite:1274936818823069789>',
            category : 'heal_inv', type : 'status', price : 80, potency : Status.Infect, 
            description : 'A small, wrigling creature. It enters the host\'s body and hunts down any infestations within an Oochamon.',
            description_short : 'Removes INFECTED status effect.'
        })
        create_item({
            id : 13, name : 'Debug Chip', emote : '<:item_debugchip:1274936992462930001>',
            category : 'heal_inv', type : 'status', price : 80, potency : Status.Digitize, 
            description : 'A small computer chip from an odd machine. It seems to break down any tech that finds itself attached to an Oochamon.',
            description_short : 'Removes DIGITIZED status effect.'
        })
        create_item({
            id : 14, name : 'Cooling Balm', emote : '<:item_coolingbalm:1274936928625758269>',
            category : 'heal_inv', type : 'status', price : 80, potency : Status.Burn, 
            description : 'A container of glowing blue gel found deep below the planet\'s surface. Its supercooling properties will relieve a burn from an Oochamon.',
            description_short : 'Removes BURNED status effect.'
        })
        create_item({
            id : 15, name : 'Nullifying Sphere', emote : '<:item_null_sphere:1274937109995716648>',
            category : 'heal_inv', type : 'status', price : 500, potency : Status.All, 
            description : 'A white crystal sphere with various colours mixed within. All things that may pain an Oochamon are removed by the void inside.',
            description_short : 'Removes all status effects.'
        })
        create_item({
            id : 16, name : 'Green Boostgem', emote : '<:item_iv_hp:1274937089666056294>',
            category : 'other_inv', type : 'iv', price : 25000, potency : Stats.HP, 
            description : 'A viridian crystal from the planet\'s core glowing with vitality. Your Oochamon seem strangely drawn to it.',
            description_short : 'Permanently Raises Health bonus of an Oochamon.'
        })
        create_item({
            id : 17, name : 'Red Boostgem', emote : '<:item_iv_atk:1274937039460237382>',
            category : 'other_inv', type : 'iv', price : 25000, potency : Stats.Attack, 
            description : 'A crimson crystal from the planet\'s core glowing with power. Your Oochamon seem strangely drawn to it.',
            description_short : 'Permanently Raises Attack bonus of an Oochamon.'
        })
        create_item({
            id : 18, name : 'Blue Boostgem', emote : '<:item_iv_def:1274937065317990486>',
            category : 'other_inv', type : 'iv', price : 25000, potency : Stats.Defense, 
            description : 'An azure crystal from the planet\'s core glowing with protection. Your Oochamon seem strangely drawn to it.',
            description_short : 'Permanently Raises Defense bonus of an Oochamon.'
        })
        create_item({
            id : 19, name : 'Yellow Boostgem', emote : '<:item_iv_spd:1274937099984048138>',
            category : 'other_inv', type : 'iv', price : 25000, potency : Stats.Speed, 
            description : 'An amber crystal from the planet\'s core glowing with energy. Your Oochamon seem strangely drawn to it.',
            description_short : 'Permanently Raises Speed bonus of an Oochamon.'
        })
        create_item({
            id : 20, name : 'Spore Feather', emote : '<:item_sporefeather:1304609799245266964>',
            category : 'other_inv', type : 'evolve', price : 8000, potency : [59, 62], 
            description : 'An old feather covered in fungal spores. Oochamon are particulary susceptible to corrupting forces, and it seems like this one was no different.',
            description_short : 'Used to evolve a certain Oochamon.'
        })
        create_item({
            id : 21, name : 'Lavaboard', emote : '<:item_lavaboard:1304609819201900575>',
            category : 'other_inv', type : 'key', price : -1, potency : 1, 
            description : 'A high-tech board that uses extreme heat to to float. It even comes with a cool heat-proof suit.',
            description_short : 'Used to ride over Lava tiles.'
        })
        create_item({
            id : 22, name : 'Repulsor', emote : '<:item_repulsor:1306488213908488212>',
            category : 'other_inv', type : 'repel', price : 150, potency : 75, 
            description : 'A battery-powered repulsion device that keeps Oochamon away.',
            description_short : 'Repels Oochamon for 75 steps.'
        })
        create_item({
            id : 23, name : 'Emergency Teleporter', emote : '<:item_tp_device:1306488228383031296>',
            category : 'other_inv', type : 'teleport', price : 300, potency : 1, 
            description : 'An emergency button that uses unknown systems to relocate the user. It\'s mildly painful to use, but it gets you where you\'re going quick!',
            description_short : 'Brings you to your last used Save Station.'
        })

        //#endregion

        //#region Move Data
        // ADD TO THE TYPES.JS FILE WHEN ADDING NEW ONES
        //          ID, NAME,             TYPE,        DMG,ACCURACY, EFF,EFF_CHANCE,     DESCRIPTION
        create_move({
            id : 0, name : 'Hit', type : OochType.Neutral,
            damage : 10, accuracy: 100,
            effect : [],
            description : 'The user hits the target to deal damage.'
        });
        create_move({
            id : 1, name : 'Bash', type : OochType.Neutral,
            damage : 20, accuracy: 100,
            effect : [],
            description : 'The target is dealt some blunt damage.'
        });
        create_move({
            id : 2, name : 'Spore Shot', type : OochType.Fungal,
            damage : 30, accuracy: 100,
            effect : [],
            description : 'A puff of spore burst from the user\'s body.'
        });
        create_move({
            id : 3, name : 'Pebble Blast', type : OochType.Stone,
            damage : 30, accuracy: 100,
            effect : [],
            description : 'Fires a barrage of small pebbles.'
        });
        create_move({
            id : 4, name : 'Fireball', type : OochType.Flame,
            damage : 30, accuracy: 100,
            effect : [],
            description : 'Shoots a ball of fire at the target.'
        });
        create_move({
            id : 5, name : 'Slash', type : OochType.Neutral,
            damage : 50, accuracy: 95,
            effect : [],
            description : 'The user slashes at the target with sharp appendages.'
        });
        create_move({
            id : 6, name : 'Take Over', type : OochType.Fungal,
            damage : 30, accuracy: 90,
            effect : [{status : Status.Infect, chance : 100, target : MoveTarget.Enemy}],
            description : 'Fungal spores are launched which INFECT the target.'
        });
        create_move({
            id : 7, name : 'Dust Storm', type : OochType.Stone,
            damage : 30, accuracy: 90,
            effect : [{status : Status.Blind, chance : 100, target : MoveTarget.Enemy}],
            description : 'A storm is whipped up which leaves the target BLINDED.'
        });
        create_move({
            id : 8, name : 'Engulf', type : OochType.Flame,
            damage : 30, accuracy: 90,
            effect : [{status : Status.Burn, chance : 100, target : MoveTarget.Enemy}],
            description : 'The target is BURNED by red-hot flames.'
        });
        create_move({
            id : 9, name : 'Impale', type : OochType.Neutral,
            damage : 80, accuracy: 100,
            effect : [],
            description : 'Impales the target with a spike.'
        });
        create_move({
            id : 10, name : 'Bloom', type : OochType.Fungal,
            damage : 70, accuracy: 90,
            effect : [],
            description : 'Explosive spores are launched at the target to deal damage.'
        });
        create_move({
            id : 11, name : 'Boulder Dash', type : OochType.Stone,
            damage : 60, accuracy: 90,
            effect : [{status : 'priority_1', chance : 100, target : MoveTarget.Self}],
            description : 'Flings a boulder at the target before it has a chance to do anything.'
        });
        create_move({
            id : 12, name : 'Torch', type : OochType.Flame,
            damage : 70, accuracy: 90,
            effect : [],
            description : 'The user bashes the target with a firey appendage.'
        });
        create_move({
            id : 13, name : 'Blight', type : OochType.Fungal,
            damage : 60, accuracy: 90,
            effect : [{status : Status.Blind, chance : 50, target : MoveTarget.Enemy}],
            description : 'If the infection takes hold, the target is BLINDED.'
        });
        create_move({
            id : 14, name : 'Lava Lance', type : OochType.Stone,
            damage : 60, accuracy: 90,
            effect : [{status : Status.Burn, chance : 50, target : MoveTarget.Enemy}],
            description : 'Red-hot stone is launched to BURN the target.'
        });
        create_move({
            id : 15, name : 'Tumorize', type : OochType.Flame,
            damage : 60, accuracy: 90,
            effect : [{status : Status.Infect, chance : 50, target : MoveTarget.Enemy}],
            description : 'The user creates radiation in order to INFECT the target.'
        });
        create_move({
            id : 16, name : 'Glimmer', type : OochType.Crystal,
            damage : 20, accuracy: 90,
            effect : [{status : Status.Blind, chance : 100, target : MoveTarget.Enemy}],
            description : 'Refracts light in an attempt to BLIND the target.',
            tags : [MoveTag.Light]
        });
        create_move({
            id : 17, name : 'Gem Bash', type : OochType.Crystal,
            damage : 110, accuracy: 70,
            effect : [],
            description : 'Massive crystals are swung wildly to inflict damage.'
        });
        create_move({
            id : 18, name : 'Caustic Orb', type : OochType.Ooze,
            damage : 60, accuracy: 100,
            effect : [{status : Status.Burn, chance : 75, target : MoveTarget.Enemy}],
            description : 'A ball of caustic goo is launched with a high chance of BURNING.',
        });
        create_move({
            id : 19, name : 'Pulverize', type : OochType.Neutral,
            damage : 150, accuracy: 80,
            effect : [{status : '-_atk_1', chance : 100, target : MoveTarget.Self}],
            description : 'The target is slammed to deal massive damage, but the user exausts itself, losing ATK.',
        });
        create_move({
            id : 20, name : 'Ash Blast', type : OochType.Flame,
            damage : 50, accuracy: 95,
            effect : [{status : Status.Blind, chance : 75, target : MoveTarget.Enemy}],
            description : 'Hot ashes are launched at the target with a high chance to BLIND.',
        });
        create_move({
            id : 21, name : 'Inferno', type : OochType.Flame,
            damage : 100, accuracy: 95,
            effect : [{status : Status.Burn, chance : 100, target : MoveTarget.All}],
            description : 'A blazing inferno afflicts all targets with a BURN.',
        });
        create_move({
            id : 22, name : 'Digitize', type : OochType.Tech,
            damage : 50, accuracy: 100,
            effect : [{status : Status.Digitize, chance : 100, target : MoveTarget.Enemy}],
            description : 'The target becomes DIGITIZED when hit by this strange beam.',
        });
        create_move({
            id : 23, name : 'Clamp Down', type : OochType.Neutral,
            damage : 45, accuracy: 100,
            effect : [{status : Status.Snare, chance : 30, target : MoveTarget.Enemy}],
            description : 'Clamps down tight on the target to deal damage and SNARE them if you get lucky.'
        });
        create_move({
            id : 24, name : 'Magic Bolt', type : OochType.Magic,
            damage : 30, accuracy: 100,
            effect : [],
            description : 'Fires a bolt of magic energy.',
        });
        create_move({
            id : 25, name : 'Sparkler', type : OochType.Flame,
            damage : 40, accuracy: 100,
            effect : [{status : Status.Blind, chance : 30, target : MoveTarget.Enemy}],
            description : 'Shoots bright sparks with the potential to BLIND the target.',
        });
        create_move({
            id : 26, name : 'Arca Strike', type : OochType.Magic,
            damage : 80, accuracy: 100,
            effect : [],
            description : 'Fires a powerful burst of magic.',
        });
        create_move({
            id : 27, name : 'Call Lightning', type : OochType.Magic,
            damage : 80, accuracy: 90,
            effect : [{status : Status.Burn, chance : 30, target : MoveTarget.Enemy}],
            description : 'Causes a great bolt of lightning to crash on the enemy, potentially BURNING them.',
            tags : [MoveTag.Electric]
        });
        create_move({
            id : 28, name : 'Sticky Orb', type : OochType.Ooze,
            damage : 80, accuracy: 90,
            effect : [{status : Status.Snare, chance : 60, target : MoveTarget.Enemy}],
            description : 'Fling a orb of goo that can SNARE the target.',
        });
        create_move({
            id : 29, name : 'Glob', type : OochType.Ooze,
            damage : 30, accuracy: 100,
            effect : [],
            description : 'Pelts the target with a viscous ooze.',
        });
        create_move({
            id : 30, name : 'Blink', type : OochType.Magic,
            damage : 0, accuracy: 100,
            effect : [{status : Status.Expose, chance : 100, target : MoveTarget.Enemy}],
            description : 'Travels to a different time, EXPOSING the target\'s weaknesses.',
            tags : [MoveTag.Time]
        });
        create_move({
            id : 31, name : 'Time Warp', type : OochType.Magic,
            damage : 50, accuracy: 100,
            effect : [{status : Status.Expose, chance : 50, target : MoveTarget.Enemy}],
            description : 'Warps spacetime around the target, with a chance to EXPOSE the target.',
            tags : [MoveTag.Time]
        });
        create_move({
            id : 32, name : 'Mycelium Whip', type : OochType.Fungal,
            damage : 50, accuracy: 100,
            effect : [{status : Status.Snare, chance : 50, target : MoveTarget.Enemy}],
            description : 'Shoots whips made of mycelium in an attempt to SNARE the opponent.',
        });
        create_move({
            id : 33, name : 'Parasitize', type : OochType.Ooze,
            damage : 40, accuracy: 50,
            effect : [{status : Status.Infect, chance : 50, target : MoveTarget.Enemy}],
            description : 'Parasitic bodies are launched at the target potentially INFECTING them.',
        });
        create_move({
            id : 34, name : 'Corrode', type : OochType.Ooze,
            damage : 40, accuracy: 50,
            effect : [{status : '-_def_1', chance : 100, target : MoveTarget.Enemy}],
            description : 'Powerful acids damage the target, lowering its DEF.',
        });
        create_move({
            id : 35, name : 'Grind', type : OochType.Stone,
            damage : 80, accuracy: 90,
            effect : [],
            description : 'Grinds against the opponent with rough, jagged edges.',
        });
        create_move({
            id : 36, name : 'Metal Lance', type : OochType.Tech,
            damage : 70, accuracy: 90,
            effect : [],
            description : 'Stabs the opponent with a metallic object.',
        });
        create_move({
            id : 37, name : 'Iron Hammer', type : OochType.Tech,
            damage : 50, accuracy: 100,
            effect : [],
            description : 'A heavy, metal object is hammered against the target.',
        });
        create_move({
            id : 38, name : 'Laminate', type : OochType.Tech,
            damage : 30, accuracy: 90,
            effect : [{status : Status.Snare, chance : 100, target : MoveTarget.Enemy}],
            description : 'Covers the target in a tough plastic substance to SNARE them.',
        });
        create_move({
            id : 39, name : 'Entomb', type : OochType.Stone,
            damage : 60, accuracy: 80,
            effect : [{status : Status.Snare, chance : 50, target : MoveTarget.Enemy}],
            description : 'Stones fall onto the target, leaving them SNARED if they get trapped.',
        });
        create_move({
            id : 40, name : 'undefined_int', type : OochType.Void,
            damage : 100, accuracy: 100,
            effect : [],
            description : 'TEST MOVE',
        });
        create_move({
            id : 41, name : 'Precision Strike', type : OochType.Neutral,
            damage : 20, accuracy: 100,
            effect : [{status : 'critical', chance : 60, target : MoveTarget.None}],
            description : 'A targeted strike that is likely to land a Critical Hit.',
        });
        create_move({
            id : 42, name : 'Barrage', type : OochType.Neutral,
            damage : 100, accuracy: 80,
            effect : [{status : 'recoil', chance : 30, target : MoveTarget.Self}],
            description : 'Devastating blasts damage the target, the user is hit with Recoil.',
        });
        create_move({
            id : 43, name : 'Eruption', type : OochType.Flame,
            damage : 100, accuracy: 80,
            effect : [{status : 'recoil', chance : 30, target : MoveTarget.Self}],
            description : 'Blazing heat erupts from the user, dealing high damage but also being hit with Recoil.',
        });
        create_move({
            id : 44, name : 'Self Destruct', type : OochType.Tech,
            damage : 250, accuracy: 100,
            effect : [{status : 'recoil', chance : 100, target : MoveTarget.Self}],
            description : 'The user self destructs to inflict massive damage.',
            battle_desc : 'USER detonates violently!'
        });
        create_move({
            id : 45, name : 'Siphon', type : OochType.Fungal,
            damage : 20, accuracy: 100,
            effect : [{status : 'vampire', chance : 10, target : MoveTarget.Self}],
            description : 'The user damages the opponent, slightly Healing itself in the process.',
        });
        create_move({
            id : 46, name : 'Drain Life', type : OochType.Magic,
            damage : 50, accuracy: 50,
            effect : [{status : 'vampire', chance : 50, target : MoveTarget.Self}],
            description : 'A horribly innacurate move with the potential to greatly heal the user.',
        });
        create_move({
            id : 47, name : 'Restruct', type : OochType.Stone,
            damage : 0, accuracy: 100,
            effect : [{status : 'heal', chance : 25, target : MoveTarget.Self}],
            description : 'Stones are reorganized in the user\'s body to restore some HP.',
        });
        create_move({
            id : 48, name : 'Flurry', type : OochType.Tech,
            damage : 75, accuracy: 90,
            effect : [{status : 'critical', chance : 50, target : MoveTarget.None}],
            description : 'A flurry of steel blades shred the target, with a high chance to land a Critical Hit.',
        });
        create_move({
            id : 49, name : 'Crash Landing', type : OochType.Stone,
            damage : 90, accuracy: 90,
            effect : [{status : 'recoil', chance : 20, target : MoveTarget.Self}],
            description : 'The user falls down from the sky inflicting high damage, but injuring itself.',
        });
        create_move({
            id : 50, name : 'Solar Blast', type : OochType.Flame,
            damage : 85, accuracy: 100,
            effect : [{status : Status.Blind, chance : 50, target : MoveTarget.Enemy}],
            description : 'Lob a brilliant ball of flame, potentially BLINDING the target.',
        });
        create_move({
            id : 51, name : 'Tangled Threads', type : OochType.Cloth,
            damage : 70, accuracy: 100,
            effect : [{status : Status.Blind, chance : 30, target : MoveTarget.Enemy}],
            description : 'Threads are shot at the target dealing damage with a chance to SNARE them.',
        });
        create_move({
            id : 52, name : 'Fated Threads', type : OochType.Cloth,
            damage : 70, accuracy: 100,
            effect : [{status : Status.Expose, chance : 50, target : MoveTarget.Enemy}],
            description : 'Crimson threads fly at the target, with a chance to EXPOSE the target.',
        });
        create_move({
            id : 53, name : 'Sync Strike', type : OochType.Neutral,
            damage : 70, accuracy: 100,
            effect : [{status : 'typematch', chance : 100, target : MoveTarget.Self}],
            description : 'Launch a ball of energy synchronized with the user\'s type.',
        });
        create_move({
            id : 54, name : 'Threefold', type : OochType.Tech,
            damage : 90, accuracy: 90,
            effect : [{status : 'critical', chance : 30, target : MoveTarget.None}],
            description : 'The target is struck repeatedly, leaving it open to Critical Hits.',
        });
        create_move({
            id : 55, name : 'Glass Blades', type : OochType.Crystal,
            damage : 80, accuracy: 70,
            effect : [{status : 'critical', chance : 50, target : MoveTarget.None}],
            description : 'Brittle blades are used to strike at the opponent\'s weak spots with a high chance to Crit.',
        });
        create_move({
            id : 56, name : 'Gravitate', type : OochType.Magic,
            damage : 60, accuracy: 100,
            effect : [],
            description : 'The user manipulates gravity to fling itself at the target.',
        });
        create_move({
            id : 57, name : 'Tenderize', type : OochType.Neutral,
            damage : 120, accuracy: 70,
            effect : [{status : 'recoil', chance : 30, target : MoveTarget.Self}],
            description : 'The user slams its body into the opponent, but is hit with recoil.',
        });
        create_move({
            id : 58, name : 'Byte Bite', type : OochType.Tech,
            damage : 30, accuracy: 100,
            effect : [],
            description : 'Form digital jaws that clamp down on the target.',
        });
        create_move({
            id : 59, name : 'Sawblade', type : OochType.Tech,
            damage : 50, accuracy: 95,
            effect : [],
            description : 'The user hits the target with a metal blade.',
        });
        create_move({
            id : 60, name : 'Limber', type : OochType.Ooze,
            damage : 0, accuracy: 100,
            effect : [{status : '+_def_1', chance : 100, target : MoveTarget.Self}],
            description : 'Softens the body making it harder to damage, increasing its DEF.',
        });
        create_move({
            id : 61, name : 'Embolden', type : OochType.Neutral,
            damage : 0, accuracy: 100,
            effect : [{status : '+_atk_1', chance : 100, target : MoveTarget.Self}],
            description : 'Prepares the user to fight with all its strength, increasing its ATK.',
        });
        create_move({
            id : 62, name : 'Hasten', type : OochType.Neutral,
            damage : 0, accuracy: 100,
            effect : [{status : '+_spd_1', chance : 100, target : MoveTarget.Self}],
            description : 'The user readies itself to move quickly, increasing its SPD.',
        });
        create_move({
            id : 63, name : 'Brittle', type : OochType.Stone,
            damage : 0, accuracy: 100,
            effect : [{status : '-_def_1', chance : 100, target : MoveTarget.Enemy}],
            description : 'Makes the opponent\'s body brittle, lowering its DEF.',
        });
        create_move({
            id : 64, name : 'Intimidate', type : OochType.Neutral,
            damage : 0, accuracy: 100,
            effect : [{status : '-_atk_1', chance : 100, target : MoveTarget.Enemy}],
            description : 'Glare at the opponent, lowering its ATK.',
        });
        create_move({
            id : 65, name : 'Mud', type : OochType.Ooze,
            damage : 0, accuracy: 100,
            effect : [{status : '-_spd_1', chance : 100, target : MoveTarget.Enemy}],
            description : 'Throw mud on the opponent, lowering its SPD.',
        });
        create_move({
            id : 66, name : 'Hype-Up', type : OochType.Neutral,
            damage : 0, accuracy: 100,
            effect : [{status : '+_atk_1', chance : 100, target : MoveTarget.Self}, {status : '+_spd_1', chance : 100, target : MoveTarget.Self}],
            description : 'Hypes up the user, increasing its ATK and SPD.',
        });
        create_move({
            id : 67, name : 'Sharpen', type : OochType.Tech,
            damage : 0, accuracy: 100,
            effect : [{status : '+_atk_2', chance : 100, target : MoveTarget.Self}],
            description : 'Sharpens any edges the user has, greatly increasing its ATK.',
        });
        create_move({
            id : 68, name : 'Cursed Eye', type : OochType.Magic,
            damage : 10, accuracy: 100,
            effect : [{status : Status.Blind, chance : 100, target : MoveTarget.Enemy}, {status : Status.Burn, chance : 100, target : MoveTarget.Enemy}],
            description : 'Shoot a beam that curses the opponent, applying BLINDED and BURNED.',
        });
        create_move({
            id : 69, name : 'Suplex', type : OochType.Neutral,
            damage : 60, accuracy: 90,
            effect : [{status : '-_def_1', chance : 100, target : MoveTarget.Enemy}],
            description : 'Suplex the opponent, damaging them and reducing DEF.',
        });
        create_move({
            id : 70, name : 'Enfeebling Spore', type : OochType.Fungal,
            damage : 30, accuracy: 90,
            effect : [{status : '-_atk_1', chance : 100, target : MoveTarget.Enemy}, {status : '-_spd_1', chance : 100, target : MoveTarget.Enemy},],
            description : 'Launch a damaging spore at the opponent which lowers ATK and SPD.'
        });
        create_move({
            id : 71, name : 'Torque', type : OochType.Tech,
            damage : 0, accuracy: 100,
            effect : [{status : '-_spd_1', chance : 100, target : MoveTarget.Self}, {status : '+_atk_2', chance : 100, target : MoveTarget.Self},],
            description : 'Reduce the user\'s SPD to massively increase ATK.',
        });
        create_move({
            id : 72, name : 'Slow Burn', type : OochType.Flame,
            damage : 0, accuracy: 100,
            effect : [{status : '-_spd_1', chance : 100, target : MoveTarget.Self}, {status : '+_def_2', chance : 100, target : MoveTarget.Self},],
            description : 'Reduces the user\'s heat, greatly increasing DEF at the cost of some SPD.',
        });
        create_move({
            id : 73, name : 'Kaleidoscope', type : OochType.Crystal,
            damage : 0, accuracy: 100,
            effect : [{status : Status.Blind, chance : 100, target : MoveTarget.Enemy}, {status : Status.Snare, chance : 100, target : MoveTarget.Enemy}],
            description : 'Disorient the opponent in a room that BLINDS and SNARES.',
            tags : [MoveTag.Light]
        });
        create_move({
            id : 74, name : 'Blinding Beam', type : OochType.Crystal,
            damage : 75, accuracy: 80,
            effect : [{status : Status.Blind, chance : 100, target : MoveTarget.Enemy}],
            description : 'Fire a brilliant beam of light that BLINDS the opponent.',
            tags : [MoveTag.Light]
        });
        create_move({
            id : 75, name : 'Overgrowth', type : OochType.Fungal,
            damage : 0, accuracy: 100,
            effect : [{status : '+_atk_1', chance : 100, target : MoveTarget.Self}, {status : '+_def_1', chance : 100, target : MoveTarget.Self}, {status : '+_spd_1', chance : 100, target : MoveTarget.Self}],
            description : 'Rapid fungal growth Raises ATK, DEF, and SPD.'
        });
        create_move({
            id : 76, name : 'Myco-Burst', type : OochType.Fungal,
            damage : 75, accuracy: 80,
            effect : [{status : Status.Blind, chance : 100, target : MoveTarget.Enemy}],
            description : 'Fire a spore-filled bomb which BLINDS the opponent.',
        });
        create_move({
            id : 77, name : 'Thorn Shot', type : OochType.Fungal,
            damage : 60, accuracy: 90,
            effect : [{status : 'critical', chance : 50, target : MoveTarget.None}],
            description : 'Shoot a condensed fungal thorn with a high critical chance.',
        });
        create_move({
            id : 78, name : 'Slurp Up', type : OochType.Ooze,
            damage : 0, accuracy: 100,
            effect : [{status : 'heal', chance : 50, target : MoveTarget.Self}],
            description : 'The user gathers missing parts of its body to restore half its HP.'
        });
        create_move({
            id : 79, name : 'Digital Gamble', type : OochType.Tech,
            damage : 0, accuracy: 100,
            effect : [{status : 'random', chance : 100, target : MoveTarget.None}],
            description : 'The user randomly uses a move.',
            battle_desc : 'Let\'s go gambling!'
        });
        create_move({
            id : 80, name : 'Sedimentation', type : OochType.Stone,
            damage : 0, accuracy: 100,
            effect : [{status : '+_def_2', chance : 100, target : MoveTarget.Self}],
            description : 'Spend the turn gathering stone to greatly increase DEF.'
        });
        create_move({
            id : 81, name : 'Plasma Cannon', type : OochType.Flame,
            damage : 120, accuracy: 100,
            effect : [{status : '-_spd_1', chance : 100, target : MoveTarget.Self}],
            description : 'A high damage blast of extreme heat, but lowers the user\'s SPD afterward.',
        });
        create_move({
            id : 82, name : 'Phantom Bullet', type : OochType.Magic,
            damage : 30, accuracy: 100,
            effect : [{status : 'critical', chance : 100, target : MoveTarget.None}],
            description : 'Fire a highly accurate ghost bullet that always Crits.',
        });
        create_move({
            id : 83, name : 'Firey Bullet', type : OochType.Flame,
            damage : 70, accuracy: 100,
            effect : [{status : Status.Burn, chance : 50, target : MoveTarget.Enemy}],
            description : 'Attack with blazing horns that have a chance to BURN the target.',
        });
        create_move({
            id : 84, name : 'Radiate', type : OochType.Flame,
            damage : 0, accuracy: 100,
            effect : [{status : '-_atk_1', chance : 100, target : MoveTarget.Enemy}, {status : Status.Burn, chance : 100, target : MoveTarget.Enemy}],
            description : 'Release stored-up radiation to BURN the target and reduce its ATK.',
            tags : [MoveTag.Light]
        });
        create_move({
            id : 85, name : 'Caltrops', type : OochType.Stone,
            damage : 20, accuracy: 100,
            effect : [{status : '-_spd_1', chance : 100, target : MoveTarget.Enemy}],
            description : 'Scatter damaging spikes that damage and reduce the target\'s SPD.',
        });
        create_move({
            id : 86, name : 'Lurk', type : OochType.Magic,
            damage : 0, accuracy: 100,
            effect : [{status : '+_atk_1', chance : 100, target : MoveTarget.Self}, {status : Status.Focus, chance : 100, target : MoveTarget.Self}],
            description : 'Lurk in the shadows boosting ATK and makes the user FOCUSED.'
        });
        create_move({
            id : 87, name : 'Fog', type : OochType.Neutral,
            damage : 0, accuracy: 100,
            effect : [{status : '-_acc_2', chance : 100, target : MoveTarget.Self}, {status : '-_acc_2', chance : 100, target : MoveTarget.Enemy}],
            description : 'Spray thick fog which heavily reduces Accuracy on both sides.',
            battle_desc: 'The air begins to thicken!'
        });
        create_move({
            id : 88, name : 'Purify', type : OochType.Neutral,
            damage : 0, accuracy: 100,
            effect : [{status : 'clear_status', chance : 100, target : MoveTarget.Self}],
            description : 'Removes all status effects from the user.',
        });
        create_move({
            id : 89, name : 'Reset', type : OochType.Neutral,
            damage : 0, accuracy: 100,
            effect : [{status : 'clear_stat_stages', chance : 100, target : MoveTarget.Self}],
            description : 'Clears all stat changes from the user.',
        });
        create_move({
            id : 90, name : 'Debug Bomb', type : OochType.Tech,
            damage : 100, accuracy: 80,
            effect : [{status : 'clear_status', chance : 100, target : MoveTarget.Enemy}],
            description : 'Fire a high-damage bomb that clears any status effects from its target.',
        });
        create_move({
            id : 91, name : 'Entrench', type : OochType.Fungal,
            damage : 0, accuracy: 100,
            effect : [{status : '+_def_3', chance : 100, target : MoveTarget.Self},{status : Status.Snare, chance : 100, target : MoveTarget.Self}],
            description : 'The user roots into the ground, becoming SNARED, but greatly boosting its DEF.',
        });
        create_move({
            id : 92, name : 'Null Sphere', type : OochType.Void,
            damage : 60, accuracy: 100,
            effect : [],
            description : 'Fire a sphere of dark matter.',
        });
        create_move({
            id : 93, name : 'High Impact', type : OochType.Neutral,
            damage : 170, accuracy: 80,
            effect : [{status : Status.Vanish, chance : 100, target : MoveTarget.Enemy}],
            description : 'Hit the opponent so hard they get launched and VANISH.'
        });
        create_move({
            id : 94, name : 'Shards', type : OochType.Crystal,
            damage : 20, accuracy: 100,
            effect : [],
            description : 'Shoot several small shards of crystal at the enemy to deal damage.',
        });
        create_move({
            id : 95, name : 'Rag Whip', type : OochType.Cloth,
            damage : 20, accuracy: 100,
            effect : [],
            description : 'Pummel the opponent with cloth whips.',
        });
        create_move({
            id : 96, name : 'Screech', type : OochType.Sound,
            damage : 20, accuracy: 100,
            effect : [],
            description : 'Emit a high-pitched screech that shatters objects.',
        });
        create_move({
            id : 97, name : 'Lense Flare', type : OochType.Crystal,
            damage : 40, accuracy: 100,
            effect : [{status : '-_acc_1', chance : 40, target : MoveTarget.Enemy}],
            description : 'Fire an incredibly bright gem at the opponenet with a chance to reduce their Accuracy.',
            tags : [MoveTag.Light]
        });
        create_move({
            id : 98, name : 'Bind', type : OochType.Cloth,
            damage : 40, accuracy: 95,
            effect : [{status : '-_spd_1', chance : 100, target : MoveTarget.Enemy}],
            description : 'Tightly wraps the enemy with cloth reducing its SPD.',
        });
        create_move({
            id : 99, name : 'Thunder', type : OochType.Sound,
            damage : 30, accuracy: 100,
            effect : [{status : '-_atk_1', chance : 30, target : MoveTarget.Enemy}],
            description : 'Fire a booming sound which has a chance to reduce the target\'s ATK.',
        });
        create_move({
            id : 100, name : 'Rallying Cry', type : OochType.Sound,
            damage : 0, accuracy: 100,
            effect : [{status : '+_atk_1', chance : 50, target : MoveTarget.Self}, {status : '+_def_1', chance : 50, target : MoveTarget.Self}, {status : '+_spd_1', chance : 50, target : MoveTarget.Self}],
            description : 'Shout into the sky in hope of raising morale, it has a chance to raise ATK, DEF, and SPD.',
        });
        create_move({
            id : 101, name : 'Crystal Ball', type : OochType.Crystal,
            damage : 50, accuracy: 90,
            effect : [{status : Status.Expose, chance : 30, target : MoveTarget.Enemy}],
            description : 'Launch a future-seeing crystal ball at the enemy, it might just forsee a future where the target\'s weakness is EXPOSED.',
        });
        create_move({
            id : 102, name : 'Sonic Boom', type : OochType.Sound,
            damage : 40, accuracy: 100,
            effect : [{status : 'priority_1', chance : 100, target : MoveTarget.Self}],
            description : 'Quickly launch a blast of sound, this move always goes first.',
        });
        create_move({
            id : 103, name : 'Ear Shatter', type : OochType.Sound,
            damage : 80, accuracy: 95,
            effect : [{status : '-_def_1', chance : 30, target : MoveTarget.Enemy}],
            description : 'Shout so loud that it shatters eardrums, has a chance to reduce DEF.',
        });
        create_move({
            id : 104, name : 'Healing Gems', type : OochType.Crystal,
            damage : 0, accuracy: 100,
            effect : [{status : 'heal', chance : 15, target : MoveTarget.Self},{status : '+_def_1', chance : 100, target : MoveTarget.Self}],
            description : 'Heals the user a little while slightly bolstering their DEF.',
        });
        create_move({
            id : 105, name : 'Scary Sheet', type : OochType.Cloth,
            damage : 0, accuracy: 100,
            effect : [{status : '-_def_1', chance : 100, target : MoveTarget.Enemy},{status : '-_spd_1', chance : 100, target : MoveTarget.Enemy}],
            description : 'Catch the emeny off guard with a spooky cloth, dropping their DEF and SPD.',
        });
        create_move({
            id : 106, name : 'Fiber Slicer', type : OochType.Cloth,
            damage : 65, accuracy: 100,
            effect : [{status : Status.CritChance, chance : 30, target : MoveTarget.None}],
            description : 'Slashes the target with highly compressed fibers, has a high chance to Crit.',
        });
        create_move({
            id : 107, name : 'Mummify', type : OochType.Cloth,
            damage : 0, accuracy: 100,
            effect : [{status : Status.Doom, chance : 100, target : MoveTarget.Enemy}],
            description : 'Wraps the target in cursed cloths, DOOMING the target.',
        });
        create_move({ //This move should not be given to any mon, it's here as a small chance for Digital Gamble
            id : 108, name : 'Jackpot', type : OochType.Tech,
            damage : 99999, accuracy: -1,
            effect : [],
            description : 'You hit the jackpot!!!',
            battle_desc : 'USER hit the jackpot!!!'
        });
        create_move({
            id : 109, name : 'Jagged Ground', type : OochType.Stone,
            damage : 0, accuracy: -1,
            effect : [{status : Status.Field, chance : FieldEffect.JaggedGround, target : MoveTarget.None}],
            description : 'Jagged spikes erupt from the ground, any non-Stone-types that switch-in will take some damage.',
            battle_desc : 'Jagged spikes erupt from the ground!'
        });
        create_move({
            id : 110, name : 'Echo Chamber', type : OochType.Sound,
            damage : 0, accuracy: -1,
            effect : [{status : Status.Field, chance : FieldEffect.EchoChamber, target : MoveTarget.None}],
            description : 'Sound-type attacks harshly reverbrate in the area and can apply EXPOSED.',
            battle_desc : 'Sounds begin to echo around the area!'
        });
        create_move({
            id : 111, name : 'Wetlands', type : OochType.Ooze,
            damage : 0, accuracy: -1,
            effect : [{status : Status.Field, chance : FieldEffect.Wetlands, target : MoveTarget.None}],
            description : 'Viscous goo spreads across the area, non-Ooze-types move slower.',
            battle_desc : 'Strage goo floods the battlefield!'
        });
        create_move({
            id : 112, name : 'Twisted Reality', type : OochType.Magic,
            damage : 0, accuracy: -1,
            effect : [{status : Status.Field, chance : FieldEffect.TwistedReality, target : MoveTarget.None}],
            description : 'Reality becomes twisted in the surrounding area, Weaknesses and Resistances are flipped.',
            battle_desc : 'Reality itself twists and contorts!'
        });
        create_move({
            id : 113, name : 'Heatwave', type : OochType.Flame,
            damage : 0, accuracy: -1,
            effect : [{status : Status.Weather, chance : Weather.Heatwave, target : MoveTarget.None}],
            description : 'The atmosphere is superheated! Non-Flame-type Oochamon will take damage at the end of each round.',
            battle_desc : 'The local temperature begins to skyrocket!'
        });
        create_move({
            id : 114, name : 'Thunderstorm', type : OochType.Magic,
            damage : 0, accuracy: -1,
            effect : [{status : Status.Weather, chance : Weather.Thunderstorm, target : MoveTarget.None}],
            description : 'Creates a magical thunderstorm. Oochamon that stay in battle too long will be struck by lightning.',
            battle_desc : 'Dark stormclouds swirl above the battlefield!'
        });
        create_move({
            id : 115, name : 'Sky Clear', type : OochType.Neutral,
            damage : 0, accuracy: -1,
            effect : [{status : Status.Weather, chance : Weather.Clear, target : MoveTarget.None}],
            description : 'Clears any weather affecting the battle.',
            battle_desc : 'The weather begins to clear!'
        });
        create_move({
            id : 116, name : 'Pressure Wave', type : OochType.Neutral,
            damage : 80, accuracy: 100,
            effect : [{status : Status.WeatherDependent, chance : 100, target : MoveTarget.None}],
            description : 'Launches a wave of compressed air at the target. The move\'s type and status effects change depending on the current Weather.'
        });
        create_move({
            id : 117, name : 'Held Strike', type : OochType.Neutral,
            damage : 120, accuracy: 100,
            effect : [{status : 'priority_-1', chance : 100, target : MoveTarget.None}],
            description : 'An incredibly powerful strike that goes second.'
        });
        create_move({
            id : 118, name : 'Lagspike', type : OochType.Tech,
            damage : 0, accuracy: 100,
            effect : [{status : Status.GoingLastBonus, chance : 150, target : MoveTarget.None}, {status : '-_def_2', chance : 100, target : MoveTarget.Enemy}],
            description : 'A high-damage move that fails if the user doesn\'t go last. Has 150 damage and lowers the target\'s DEF 2 stages if it hits.'
        });
        create_move({
            id : 119, name : 'Whiplash', type : OochType.Cloth,
            damage : 50, accuracy: 100,
            effect : [{status : Status.GoingFirstBonus, chance : 50, target : MoveTarget.None}],
            description : 'Rapidly lash out at the target. Deals double damage if it goes first.'
        });
        create_move({
            id : 120, name : 'Guided Spire', type : OochType.Crystal,
            damage : 65, accuracy: -1,
            effect : [],
            description : 'Fires a crystal that relentlessly pursues the target. Guaranteed to hit.'
        });
        create_move({
            id : 121, name : 'Heatseeker', type : OochType.Tech,
            damage : 65, accuracy: -1,
            effect : [],
            description : 'Fires a guieded missile at the target. Guaranteed to hit.'
        });
        create_move({
            id : 122, name : 'Ear Splitter', type : OochType.Sound,
            damage : 0, accuracy: 100,
            effect : [{status : Status.TrueDamage, chance : 30, target : MoveTarget.None}],
            description : 'A painful screech that always deals 30 damage.'
        });
        create_move({
            id : 123, name : 'Micronet', type : OochType.Cloth,
            damage : 0, accuracy: 100,
            effect : [{status : Status.TrueDamage, chance : 50, target : MoveTarget.None}],
            description : 'A particle-splitting net that always deals 50 damage.'
        });
        create_move({
            id : 124, name : 'Asbestos Bomb', type : OochType.Stone,
            damage : 20, accuracy: 100,
            effect : [{status : Status.Infect, chance : 100, target : MoveTarget.None}],
            description : 'A dangerous blast of asbestos that INFECTS the target.'
        });
        create_move({
            id : 125, name : 'True Reflection', type : OochType.Crystal,
            damage : 50, accuracy: 100,
            effect : [{status : Status.TrueDamage, chance : 50, target : MoveTarget.None}],
            description : 'Creates a mirror image of the enemy that viciously attacks them. This move will always deal at least 50 damage.'
        });
        create_move({
            id : 126, name : 'Gorgon Eye', type : OochType.Magic,
            damage : 50, accuracy: 100,
            effect : [{status : Status.Petrify, chance : 30, target : MoveTarget.Enemy}],
            description : 'Blasts the enemy with dark magic. Has a chance to PETRIFY the target.'
        });
        create_move({
            id : 127, name : 'Hawk Eye', type : OochType.Neutral,
            damage : 0, accuracy: 100,
            effect : [{status : Status.Revealed, chance : 100, target : MoveTarget.Enemy}],
            description : 'REVEALS the enemy Oochamon, guaranteeing the next attack against it to hit.'
        });
        create_move({
            id : 128, name : 'Frostbite', type : OochType.Ooze,
            damage : 30, accuracy: 100,
            effect : [{status : Status.Snare, chance : 100, target : MoveTarget.Enemy}],
            description : 'Frosty jaws lunge forward, SNARING the target.',
            tags : [MoveTag.Cold]
        });
        

        //#endregionF

        // ADD TO THE TYPES.JS FILE WHEN ADDING NEW ONES
        //#region Ability Data
        //             ID,  NAME,               Description
        create_ability(0,  'Miniscule',         'Becomes super small and raises evasion against attacks by 1 stage upon entering the battlefield.');
        create_ability(1,  'Icky',              'Boosts the power of OOZE & FUNGAL type attacks by 20%.');
        create_ability(2,  'Burdened',          'A large growth reduces SPD by 1 stage but raises DEF by 1 stage upon entering the battlefield.');
        create_ability(3,  'Broodmother',       'Gains 1 stage of ATK for each Oochamon with the same type in the party.'); 
        create_ability(4,  'Tough',             'A durable body grants a 1 stage increase to DEF upon entering the battlefield.');  
        create_ability(5,  'Shadow',            'Grants a 25% chance to VANISH after being attacked.'); 
        create_ability(6,  'Withering',         'Withers away the opposing Oochamon, lowering it\'s DEF by 1 stage upon entering the battlefield.');  
        create_ability(7,  'Darkbright',        'Attacks that afflict BURN also BLIND and vice-versa.');  
        create_ability(8,  'Gentle',            'A kind heart reduces both your ATK and the enemy ATK by 1 stage.');  
        create_ability(9,  'Warm',              'Raises the damage of FLAME attacks by 10%.');  
        create_ability(10, 'Radiant',           'Dangerous energy causes attacks that BURN also INFECT.'); 
        create_ability(11, 'Conflicted',        'Multiple minds increase ALL stats by 1 stage upon entering the battlefield.'); 
        create_ability(12, 'Burrower',          'Raises the damage of STONE attacks by 10%.'); 
        create_ability(13, 'Reactive',          'When hit by an attack, reflects 10% of the attacker\'s HP as damage.'); 
        create_ability(14, 'Inertia',           'Raises SPD by 1 stage each turn.'); 
        create_ability(15, 'Dense',             'Raises ATK by 1 stage but reduces SPD by 1 stage upon entering the battlefield.');  
        create_ability(16, 'Moist',             'Halves all incoming FLAME damage.'); 
        create_ability(17, 'Alert',             'Raises ATK by 1 stage when an Oochamon switches in.');  
        create_ability(18, 'Fleeting',          'Raises SPD and ATK by 2 stages but also loses half of current HP each turn.'); 
        create_ability(19, 'Efficient',         'Raises ATK by 1 stage every other turn.'); 
        create_ability(20, 'Boisterous',        'Shatters eardrums when it enters the field dealing 10% of the enemy\'s HP.');
        create_ability(21, 'Haunted',           'Applies the DOOMED status to an enemy when the Haunted Oochamon faints.'); 
        create_ability(22, 'Leech',             'Restores HP equal to 10% of damage done to the enemy.'); 
        create_ability(23, 'Ensnare',           'Grants a 30% chance to SNARE an enemy when attacking.');  
        create_ability(24, 'Uncontrolled',      'Raises ATK by 3 stages and reduces DEF by 1 stages upon entering the battlefield, but randomly chooses an attack each turn.');  
        create_ability(25, 'Apprentice',        'Raises ATK by 2 stages if any other party members share a move with it.');  
        create_ability(26, 'Focused',           'Raises damage of attacks by 10% if unaffected by status effects.'); 
        create_ability(27, 'Ravenous',          'Restores 20% of max HP upon defeating an enemy.'); 
        create_ability(28, 'Immense',           'Raises DEF by 2 stages upon entering the battlefield, but also makes opponent\'s moves always hit.');  
        create_ability(29, 'Armored',           'Reduces STONE damage by 20%.');
        create_ability(30, 'Scorching',         'Attacks that can BURN always BURN.'); 
        create_ability(31, 'Tangled',           'Causes enemies that hit it to be SNARED.'); 
        create_ability(32, 'Mundane',           'Makes the Oochamon completely immune to Status Effects.'); 
        create_ability(33, 'Rogue',             'Doubles the damage dealt to full HP enemies.'); 
        create_ability(34, 'Crystallize',       'Boosts the power of Ooze, Flame, and Crystal attacks by 30%.'); 
        create_ability(35, 'Lacerating',        'All attacks do an extra attack to an enemy, dealing 5% of their max HP.'); 
        create_ability(36, 'Gravity',           'Attacks deal 1% more damage per number of turns in this battle.');
        create_ability(37, 'Sporespray',        'INFECTS the enemy when the Sporespray Oochamon faints.'); 
        create_ability(38, 'Frostbite',         'Attacks that strike an enemy reduce their SPD by 1 stage.'); 
        create_ability(39, 'Bipolar',           'Use the DEF stat when dealing damage, rather than the ATK stat.'); 
        create_ability(40, 'Hexiply',           'Attacks deal 6% more damage per sixth of HP remaining.'); 
        create_ability(41, 'Nullify',           'Nullify\'s the opposing Oochamon, changing their ability to Null while out on the field.'); 
        create_ability(42, 'Duplicant',         'Copies the opponent\'s ability.'); 
        create_ability(43, 'Null',              'Does nothing.');
        create_ability(44, 'invalid_entry',     'I̵͑n̵̤̚c̶̥̈r̴͛͜e̵̛̖a̴̺͗s̵̼̑e̶s̵̺̈ a̶͙͗l̶̖͆l̸̠͐ ̸̪̐b̴͎̋a̸̖̅s̶͖̚ë̴̫́ ̵̹̔ş̶̽t̶̟̎a̴̪̾t̴̥̂ş̵̈́ ̵̱̉ū̵͜p̸̗̆ô̶̰ņ̴̓ ̵̳͋d̵̹̑e̵͎̕a̷͔͐t̵͉͋h̷̰̋.̴̫͘ ̶͈́C̸͙̈a̶̰̔ṅ̵̯n̵̬̾o̶̒ͅt̷̪̎ ̵̆͜b̴͎̄ȩ̸͗ ̵̜͛c̴̰̈́o̴̢͒p̸̣͛i̷̗̍ê̸͈d̶̹͌.̵͍̈'); // Increase the global counter for i's stats by 1 upon losing to a player, resets its stats to 1 upon defeating a player
        create_ability(45, 'Immobile',          'Always go last when attacking, but gain a DEF increase upon entering the battlefield.');
        create_ability(46, 'Strings Attached',  'Gains a 20% chance to apply a randomly apply BURN, INFECT, BLIND, or SNARE when attacking.');
        create_ability(47, 'Corrosive',         'Attacks deal more damage to enemies with high DEF.');
        create_ability(48, 'Spectral',          'Changes the Spectral Oochamon\'s type to Magic every other turn.');
        create_ability(49, 'Height Advantage',  'Raises chance to do a critical hit by 10%.');
        create_ability(50, 'Hearty',            'Raises damage done by 15% while above 50% HP.'); 
        create_ability(51, 'Radioactive',       'Changes the Radioactive Oochamon\'s type to Flame every other turn.');
        create_ability(52, 'Energized',         'Raises ATK and SPD by 1 stage on kill.'); 
        create_ability(53, 'Patient',           'Raises DEF by 1 stage every other turn.'); 
        create_ability(54, 'Easy Go',           'Heals the rest of the Oochamon Trainer\'s party by 20% of their max HP when defeated.');
        create_ability(55, 'Bomber',            'The Oochamon explodes upon fainting, dealing half of the opposing Oochamon\'s HP on death.');
        create_ability(56, 'Flammable',         'Gains 1 stage of ATK when hit with a FLAME type move.');
        create_ability(57, 'Hole Dweller',      'Gets the Vanished status at the end of every other turn.');
        create_ability(58, 'Power Conduit',     'Boosts the power of FLAME moves against OOZE and TECH types by 50%.');
        create_ability(59, 'Liquid Cooled',     'Prevents BURN and boosts the power of TECH type moves by 25%.'); 
        create_ability(60, 'Increment',         'Randomly boosts a stat by 1 stage at the end of each turn.');
        create_ability(61, 'Parry',             'Reduces damage taken by 20%. When hit by an attack, this ability becomes Riposte.');
        create_ability(62, 'Riposte',           'Raises damage dealt by 20%. After attacking or when the turn ends, this ability becomes Parry.');
        create_ability(63, 'Swaying',           'Raises DEF by 1 stage upon entering the battlefield, but also lowers accuracy by 1 stage.');
        create_ability(64, 'Thrashing',         'Raises ATK by 1 stage upon entering the battlefield, but also lowers evasion by 1 stage.');
        create_ability(65, 'Union',             'Raises ATK and DEF by 1 stage.');
        create_ability(66, 'Protector',        'The Oochamon gets protected, making it immune to moves it resists during the turn it switches in.');
        create_ability(67, 'Phantasmal',       'The Oochamon is phantasmal, making it immune to Neutral-type moves.');
        create_ability(68, 'Matryoshka',       'The first time the Oochamon would faint, revives and restores its HP to half.');
        create_ability(69, 'Thorned',          'Attacks deal extra damage based on DEF.');
        create_ability(70, 'Downward Spiral',  'Randomly lowers one of its stats 1 stage at the end of each turn.');
        create_ability(71, 'Constructor',      'Raises DEF by 1 stage when hit by a Stone-type move.');
        create_ability(72, 'Neutralizer',      'The special effects of damaging attacks are ignored, but their damage is increased by 30%.');
        create_ability(73, 'Bass Boost',       'Boosts the power of Sound moves by 15%.');
        create_ability(74, 'Stealthy',         'The Oochamon becomes stealthy, gaining the status effect **FOCUSED** if it hasn\'t dealt damage this turn.');
        create_ability(75, 'Pursuer',          'Deals 20% current HP damage to an Oochamon as it switches out.');
        create_ability(76, 'Bloodrush',        'Taking damage raises SPD by 1 stage.');
        create_ability(77, 'Chronomancy',      'Damaging moves get -1 Priority. Other moves get +1 Priority.');
        create_ability(78, 'Martyr',           'If this Oochamon is swapped out with 0 HP, Raises the ATK of the next mon to switch in.');
        create_ability(79, 'Condiment',        'Raises the DEF & SPD of Lasangato in the party 1 stage.');
        create_ability(80, 'Double or Nothing','Attacks damage is either doubled or reduced to 0.');
        create_ability(81, 'Vigorous',         'Raises healing done by moves by 30%.');
        create_ability(82, 'Turbine',          'Raises ATK whenever it uses a Flame-type attack.');
        create_ability(83, 'Pact',             'Raises the damage of the user\'s first move by 30% on repeated uses.');
        create_ability(84, 'Exploiter',        'The EXPOSED status triples damage instead of doubling it.');
        create_ability(85, 'Seer',             'If the Oochamon would be EXPOSED it instead gains +1 SPD.');
        

        //#endregion

        // ADD TO THE TYPES.JS FILE WHEN ADDING NEW ONES
        //#region Status Data
        //            ID,  NAME,        EMOTE                                       DESCRIPTION
        create_status(0,   'Burned',    '<:status_burned:1274938453569830997>',     'Burns the Oochamon at the end of each turn, dealing damage.');
        create_status(1,   'Infected',  '<:status_infected:1274938506225123358>',   'Saps HP from the infected Oochamon, giving it to their opponent.');                                                                   
        create_status(2,   'Blinded',   '<:status_blinded:1274938440940781590>',    'Blinds the Oochamon, reducing its accuracy.');
        create_status(3,   'Digitized', '<:status_digitized:1274938471034654770>',  'Digitizes the Oochamon, changing its type forcefully to Tech while it is Digitized.');
        create_status(4,   'Snared',    '<:status_snared:1274938520821305355>',     'Ensnares the Oochamon, forcing it to go second in battle.');
        create_status(5,   'Vanished',  '<:status_vanish:1274938531864776735>',     'The Oochamon vanishes, making it impossible to hit for a turn, reappearing afterwards.');
        create_status(6,   'Doomed',    '<:status_doomed:1274938483924009062>',     'The Oochamon becomes marked for death, dying after 3 turns in battle unless switched out.');
        create_status(7,   'Exposed',   '<:status_exposed:1335433347345813624>',    'The Oochamon goes into a vulnerable state, taking double damage from the next attack its hit by.');
        create_status(8,   'Focused',   '<:status_focused:1304616656915533855>',    'The Oochamon becomes focused and locked in, guaranteeing a critical strike on the next hit.');
        create_status(9,   'Sleep',     '<:status_sleep:1335446202275070034>',      'The Oochamon is cannot attack and recovers some HP each turn, it may wake up if it\'s hit.');
        create_status(10,  'Petrified', '<:status_petrify:1335446218393784454>',    'Turns part of the Oochamon\'s body to stone, turning it to Stone and reducing its priority.');
        create_status(11,  'Weakened',  '<:status_weak:1335452472881315872>',       'Reduces the power of the Oochamon\'s damaging moves.');
        create_status(12,  'Revealed',  '<:status_reveal:1339448769871220866>',     'The Oochamon is guaranteed to be hit, it is also unable to gain the <:status_vanish:1274938531864776735> VANISHED status.');
        //Poison stackable, weak hp drain status
        
        //#endregion


        //#region Creature Data
        //ID, Emote, Name, Image, 
        //Description, Type, HP, ATK, DEF, SPD,
        //Move List[[Lvl,ID]...],
        //Abilities, Pre-Evolution ID, Evolution ID, Evolution Level, Evolution Stage

        // Sporbee
        create_monster({
            id: 0,
            emote: get_emote_string(applicationEmojis, 'sporbee'),
            name: 'Sporbee',
            oochive_entry: 'An insect that dwells in fungal forests. Every day it risks infection to provide for its hive.', 
            type: [OochType.Fungal],
            hp: 8, atk: 12, def: 8, spd: 12, //total 40
            move_list: [ [1, Move.Bash], [2, Move.Embolden], [3, Move.SporeShot], [7, Move.Slash], [8, Move.Glob], 
             [10, Move.Siphon], [13, Move.TakeOver], [17, Move.Bloom], [20, Move.Whiplash], [24, Move.TangledThreads], 
             [27, Move.ThornShot], [29, Move.MycoBurst], [33, Move.FiberSlicer], [35, Move.PrecisionStrike], 
             [38, Move.Corrode], [41, Move.Blight], [45, Move.RallyingCry], [-1, Move.CausticOrb] ],
            abilities: [ Ability.Miniscule, Ability.Icky ],
            pre_evo_id: -1, evo_id: 1, evo_lvl: 11, evo_stage: 0
        });
        
        // Stingrowth
        create_monster({
            id: 1,
            emote: get_emote_string(applicationEmojis, 'stingrowth'),
            name: 'Stingrowth',
            oochive_entry: 'A strange protrusion is growing on this hive soldier, slowly gaining control over its movements.', 
            type: [OochType.Fungal],
            hp: 15, atk: 20, def: 11, spd: 14, //total 60
            move_list: [ [1, Move.Bash], [2, Move.Embolden], [3, Move.SporeShot], [7, Move.Slash], [8, Move.Glob], 
             [10, Move.Siphon], [13, Move.TakeOver], [17, Move.Bloom], [20, Move.Whiplash], [24, Move.TangledThreads], 
             [27, Move.ThornShot], [29, Move.MycoBurst], [33, Move.FiberSlicer], [35, Move.PrecisionStrike], 
             [38, Move.Corrode], [41, Move.Blight], [45, Move.RallyingCry], [-1, Move.CausticOrb] ],
            abilities: [ Ability.Burdened, Ability.Icky ],
            pre_evo_id: 0, evo_id: 2, evo_lvl: 25, evo_stage: 1
        });
        
        // Queenect
        create_monster({
            id: 2,
            emote: get_emote_string(applicationEmojis, 'queenect'),
            name: 'Queenect',
            oochive_entry: 'A hive queen, completely overtaken by fungus. It continues to produce infected offspring even in this state.', 
            type: [OochType.Fungal],
            hp: 25, atk: 25, def: 16, spd: 14, //total 80
            move_list: [ [1, Move.Bash], [2, Move.Embolden], [3, Move.SporeShot], [7, Move.Slash], [8, Move.Glob], 
             [10, Move.Siphon], [13, Move.TakeOver], [17, Move.Bloom], [20, Move.Whiplash], [24, Move.TangledThreads], 
             [27, Move.ThornShot], [29, Move.MycoBurst], [33, Move.FiberSlicer], [35, Move.PrecisionStrike], 
             [38, Move.Corrode], [41, Move.Blight], [45, Move.RallyingCry], [-1, Move.CausticOrb] ],
            abilities: [ Ability.Burdened, Ability.Broodmother ],
            pre_evo_id: 1, evo_id: -1, evo_lvl: -1, evo_stage: 2
        });
        
        // Roocky
        create_monster({
            id: 3,
            emote: get_emote_string(applicationEmojis, 'roocky'),
            name: 'Roocky',
            oochive_entry: 'A ancient, crumbling pillar. The shadows beneath it are oddly comforting.', 
            type: [OochType.Stone],
            hp: 12, atk: 8, def: 12, spd: 8, //total 40
            move_list: [ [1, Move.Bash], [2, Move.Brittle], [3, Move.PebbleBlast], [8, Move.DustStorm], [9, Move.Screech],
             [11, Move.Sharpen], [14, Move.Impale], [17, Move.Boulderdash], [21, Move.JaggedGround], [24, Move.ArcaStrike], 
             [27, Move.LavaLance],  [30, Move.Thunder], [32, Move.EchoChamber], [34, Move.Gravitate], [36, Move.AsbestosBomb], 
             [39, Move.Lurk], [41, Move.CallThunder], [45, Move.EarShatter], [-1, Move.AshBlast] ],
            abilities: [ Ability.Tough, Ability.Shadow ],
            pre_evo_id: -1, evo_id: 4, evo_lvl: 11, evo_stage: 0
        });
        
        // Graknight
        create_monster({
            id: 4,
            emote: get_emote_string(applicationEmojis, 'graknight'),
            name: 'Graknight',
            oochive_entry: 'The stones have continued deteriorating revealing a gremlin-like form, it wields fragments of its former body as a spear.', 
            type: [OochType.Stone],
            hp: 18, atk: 15, def: 15, spd: 12, //total 60
            move_list: [ [1, Move.Bash], [2, Move.Brittle], [3, Move.PebbleBlast], [8, Move.DustStorm], [9, Move.Screech],
             [11, Move.Sharpen], [14, Move.Impale], [17, Move.Boulderdash], [21, Move.JaggedGround], [24, Move.ArcaStrike], 
             [27, Move.LavaLance],  [30, Move.Thunder], [32, Move.EchoChamber], [34, Move.Gravitate], [36, Move.AsbestosBomb], 
             [39, Move.Lurk], [41, Move.CallThunder], [45, Move.EarShatter], [-1, Move.AshBlast] ],
            abilities: [ Ability.Withering, Ability.Shadow ],
            pre_evo_id: 3, evo_id: 5, evo_lvl: 25, evo_stage: 1
        });
        
        // Kracking
        create_monster({
            id: 5,
            emote: get_emote_string(applicationEmojis, 'kracking'),
            name: 'Kracking',
            oochive_entry: 'Its body continues to wither away, freeing the shadows inside. The diamond eye in its center is its sole source of power.', 
            type: [OochType.Stone, OochType.Magic],
            hp: 22, atk: 18, def: 22, spd: 18, //total 80
            move_list: [ [1, Move.Bash], [2, Move.Brittle], [3, Move.PebbleBlast], [8, Move.DustStorm], [9, Move.Screech],
             [11, Move.Sharpen], [14, Move.Impale], [17, Move.Boulderdash], [21, Move.JaggedGround], [24, Move.ArcaStrike], 
             [27, Move.LavaLance],  [30, Move.Thunder], [32, Move.EchoChamber], [34, Move.Gravitate], [36, Move.AsbestosBomb], 
             [39, Move.Lurk], [41, Move.CallThunder], [45, Move.EarShatter], [-1, Move.AshBlast] ],
            abilities: [ Ability.Withering, Ability.Darkbright ],
            pre_evo_id: 4, evo_id: -1, evo_lvl: -1, evo_stage: 2
        });
        
        // Puppyre
        create_monster({
            id: 6,
            emote: get_emote_string(applicationEmojis, 'puppyre'),
            name: 'Puppyre',
            oochive_entry: 'A very good boy, empowered by the spiraling patterns on its body.', 
            type: [OochType.Flame],
            hp: 10, atk: 12, def: 8, spd: 10, //total 40
            move_list: [ [1, Move.Bash], [2, Move.Intimidate], [3, Move.Fireball], [8, Move.Engulf], [9, Move.ByteBite],
             [11, Move.Torch], [13, Move.Purify], [15, Move.LenseFlare], [17, Move.ClampDown], [20, Move.SlowBurn], 
             [22, Move.HeldStrike], [24, Move.StickyOrb], [27, Move.Tumorize], [30, Move.HypeUp], [34, Move.SlurpUp], 
             [38, Move.Heatwave], [41, Move.PlasmaCannon], [45, Move.LavaLance], [-1, Move.Inferno] ],
            abilities: [ Ability.Gentle, Ability.Warm ],
            pre_evo_id: -1, evo_id: 7, evo_lvl: 11, evo_stage: 0
        });
        
        // Dogglow
        create_monster({
            id: 7,
            emote: get_emote_string(applicationEmojis, 'dogglow'),
            name: 'Dogglow',
            oochive_entry: 'The etchings empowering its body have become corrupted, its flame now glows a sickly yellow.', 
            type: [OochType.Flame],
            hp: 13, atk: 18, def: 14, spd: 15, //total 60
            move_list: [ [1, Move.Bash], [2, Move.Intimidate], [3, Move.Fireball], [8, Move.Engulf], [9, Move.ByteBite],
             [11, Move.Torch], [13, Move.Purify], [15, Move.LenseFlare], [17, Move.ClampDown], [20, Move.SlowBurn], 
             [22, Move.HeldStrike], [24, Move.StickyOrb], [27, Move.Tumorize], [30, Move.HypeUp], [34, Move.SlurpUp], 
             [38, Move.Heatwave], [41, Move.PlasmaCannon], [45, Move.LavaLance], [-1, Move.Inferno] ],
            abilities: [ Ability.Gentle, Ability.Radiant ],
            pre_evo_id: 6, evo_id: 8, evo_lvl: 25, evo_stage: 1
        });
        
        // Hounuke
        create_monster({
            id: 8,
            emote: get_emote_string(applicationEmojis, 'hounuke'),
            name: 'Hounuke',
            oochive_entry: 'Its body now radiates an eerie green, the once-pure etchings now shimmer and contort on its oozing skin.', 
            type: [OochType.Flame],
            hp: 16, atk: 26, def: 18, spd: 20, //total 80
            move_list: [ [1, Move.Bash], [2, Move.Intimidate], [3, Move.Fireball], [8, Move.Engulf], [9, Move.ByteBite],
             [11, Move.Torch], [13, Move.Purify], [15, Move.LenseFlare], [17, Move.ClampDown], [20, Move.SlowBurn], 
             [22, Move.HeldStrike], [24, Move.StickyOrb], [27, Move.Tumorize], [30, Move.HypeUp], [34, Move.SlurpUp], 
             [38, Move.Heatwave], [41, Move.PlasmaCannon], [45, Move.LavaLance], [-1, Move.Inferno] ],
            abilities: [ Ability.Conflicted, Ability.Radiant ],
            pre_evo_id: 7, evo_id: -1, evo_lvl: -1, evo_stage: 2
        });

        // Glither
        create_monster({
            id: 9,
            emote: get_emote_string(applicationEmojis, 'glither'),
            name: 'Glither',
            oochive_entry: 'Its diamond-hard skin protects it from the most brutal of sandstorms.', 
            type: [OochType.Stone],
            hp: 12, atk: 7, def: 12, spd: 9, //total 40
            move_list: [ [1, Move.Bash], [2, Move.Intimidate], [3, Move.PebbleBlast], [6, Move.Caltrops], [8, Move.Slash], 
             [13, Move.DustStorm], [15, Move.Sedimentation], [17, Move.Grind], [19, Move.LenseFlare], [21, Move.Impale], 
             [27, Move.Glimmer], [30, Move.HeldStrike], [32, Move.GorgonEye], [34, Move.Entomb], [38, Move.GuidedSpire],
             [41, Move.PrecisionStrike], [43, Move.GlassBlades], [-1, Move.GemBash] ],
            abilities: [ Ability.Tough, Ability.Hearty ],
            pre_evo_id: -1, evo_id: 10, evo_lvl: 12, evo_stage: 0
        });
        
        // Sparafura
        create_monster({
            id: 10,
            emote: get_emote_string(applicationEmojis, 'sparafura'),
            name: 'Sparafura',
            oochive_entry: 'These dangerous serpents are found beneath the desert sands. Their crushing bite shatters bone with ease.', 
            type: [OochType.Stone],
            hp: 18, atk: 25, def: 16, spd: 11, //total 70
            move_list: [ [1, Move.Bash], [2, Move.Intimidate], [3, Move.PebbleBlast], [6, Move.Caltrops], [8, Move.Slash], 
             [13, Move.DustStorm], [15, Move.Sedimentation], [17, Move.Grind], [19, Move.LenseFlare], [21, Move.Impale], 
             [27, Move.Glimmer], [30, Move.HeldStrike], [32, Move.GorgonEye], [34, Move.Entomb], [38, Move.GuidedSpire],
             [41, Move.PrecisionStrike], [43, Move.Whiplash], [-1, Move.GemBash] ],
            abilities: [ Ability.Burrower, Ability.Reactive ],
            pre_evo_id: 9, evo_id: -1, evo_lvl: -1, evo_stage: 1
        });
        
        // Constone
        create_monster({
            id: 11,
            emote: get_emote_string(applicationEmojis, 'constone'),
            name: 'Constone',
            oochive_entry: 'Found on salt flats, these strange beings move about on a single wheel rather than legs.', 
            type: [OochType.Stone],
            hp: 10, atk: 10, def: 10, spd: 20, //total 50
            move_list: [ [1, Move.Bash], [2, Move.Hasten], [4, Move.PebbleBlast], [7, Move.MagicBolt], [9, Move.Shards],
             [11, Move.Restruct], [13, Move.Brittle], [18, Move.Boulderdash], [20, Move.Suplex], [24, Move.Torque], 
             [26, Move.Grind], [29, Move.Torch], [33, Move.GemBash], [37, Move.HypeUp], [43, Move.Pulverize], 
             [-1, Move.ArcaStrike] ],
            abilities: [ Ability.Inertia, Ability.Dense ],
            pre_evo_id: -1, evo_id: 12, evo_lvl: 15, evo_stage: 0
        });
        
        // Amephyst
        create_monster({
            id: 12,
            emote: get_emote_string(applicationEmojis, 'amephyst'),
            name: 'Amephyst',
            oochive_entry: 'The crystals that make up the core of its body have overtaken its left arm, creating a dangerous weapon.', 
            type: [OochType.Stone, OochType.Crystal],
            hp: 15, atk: 20, def: 15, spd: 30, //total 80
            move_list: [ [1, Move.Bash], [2, Move.Hasten], [4, Move.PebbleBlast], [7, Move.MagicBolt], [9, Move.Shards],
             [11, Move.Restruct], [13, Move.Brittle], [18, Move.Boulderdash], [20, Move.Suplex], [24, Move.Torque], 
             [26, Move.Grind], [29, Move.Torch], [33, Move.GemBash], [37, Move.HypeUp], [40, Move.CrystalBall], 
             [43, Move.Pulverize], [-1, Move.ArcaStrike] ],
            abilities: [ Ability.Inertia, Ability.Dense ],
            pre_evo_id: 11, evo_id: -1, evo_lvl: -1, evo_stage: 1
        });
        
        // Widew
        create_monster({
            id: 13,
            emote: get_emote_string(applicationEmojis, 'widew'),
            name: 'Widew',
            oochive_entry: 'The growth on its back forms a symbiotic relationship with the host, maximizing the amount of nutrients each can absorb.', 
            type: [OochType.Fungal],
            hp: 14, atk: 10, def: 9, spd: 12, //total 35
            move_list: [ [1, Move.Hit], [2, Move.Mud], [3, Move.SporeShot], [6, Move.HawkEye], [7, Move.StickyOrb],
             [11, Move.Slash], [14, Move.Lurk], [17, Move.ThornShot], [21, Move.Impale], [23, Move.MycoBurst], 
             [28, Move.PrecisionStrike], [30, Move.Micronet], [33, Move.Mummify], [36, Move.ThornShot], [39, Move.DrainLife], 
             [41, Move.FiberSlicer], [46, Move.TangledThreads], [-1, Move.Glimmer] ],
            abilities: [ Ability.Moist, Ability.Miniscule ],
            pre_evo_id: -1, evo_id: 14, evo_lvl: 9, evo_stage: 0
        });
        
        // Tarotula
        create_monster({
            id: 14,
            emote: get_emote_string(applicationEmojis, 'tarotula'),
            name: 'Tarotula',
            oochive_entry: 'The fine hairs on its back help it detect nearby movement making ambushing this giant spider surprisingly difficult.', 
            type: [OochType.Fungal],
            hp: 21, atk: 17, def: 12, spd: 15, //total 65
            move_list: [ [1, Move.Hit], [2, Move.Mud], [3, Move.SporeShot], [6, Move.HawkEye], [7, Move.StickyOrb],
             [11, Move.Slash], [14, Move.Lurk], [17, Move.ThornShot], [21, Move.Impale], [23, Move.MycoBurst], 
             [28, Move.PrecisionStrike], [30, Move.Micronet], [33, Move.Mummify], [36, Move.ThornShot], [39, Move.DrainLife], 
             [41, Move.FiberSlicer], [46, Move.TangledThreads], [-1, Move.Glimmer] ],
            abilities: [ Ability.Moist, Ability.Alert ],
            pre_evo_id: 13, evo_id: -1, evo_lvl: -1, evo_stage: 1
        });
        

        //Moldot
        create_monster({
            id: 15,
            emote: get_emote_string(applicationEmojis, 'moldot'),
            name: 'Moldot',
            oochive_entry: 'Novice explorers are often shocked by just how much of this creature is buried beneath the surface.',
            type: [OochType.Fungal, OochType.Magic],
            hp: 5, atk: 5, def: 25, spd: 5, //total 40
            move_list: [
                [1, Move.Bash], [2, Move.Limber], [5, Move.SporeShot], [8, Move.MagicBolt], [12, Move.TakeOver],
                [15, Move.FiberSlicer], [17, Move.ClampDown], [20, Move.SlurpUp], [24, Move.Pulverize], [27, Move.HighImpact], 
                [31, Move.Tenderize], [34, Move.ArcaStrike], [37, Move.Fog], [40, Move.Blight], [45, Move.Corrode],[-1, Move.Entomb]
            ],
            abilities: [ Ability.Gentle, Ability.Burrower ],
            pre_evo_id: -1, evo_id: 16, evo_lvl: 26, evo_stage: 0
        })

        // Moldire
        create_monster({
            id: 16,
            emote: get_emote_string(applicationEmojis, 'moldire'),
            name: 'Moldire',
            oochive_entry: 'Its body is no longer able to fully fit in the crevice it grew up in, forcing its body to grow a defensive maw.',
            type: [OochType.Fungal, OochType.Magic],
            hp: 25, atk: 25, def: 30, spd: 5, //total 85
            move_list: [
                [1, Move.Bash], [2, Move.Limber], [5, Move.SporeShot], [8, Move.MagicBolt], [12, Move.TakeOver],
                [15, Move.FiberSlicer], [17, Move.ClampDown], [20, Move.SlurpUp], [24, Move.Pulverize], [27, Move.HighImpact], 
                [31, Move.Tenderize], [34, Move.ArcaStrike], [37, Move.Fog], [40, Move.Blight], [45, Move.Corrode],[-1, Move.Entomb]
            ],
            abilities: [ Ability.Gentle, Ability.Reactive ],
            pre_evo_id: 15, evo_id: -1, evo_lvl: -1, evo_stage: 1
        })

        // Charlite
        create_monster({
            id: 17,
            emote: get_emote_string(applicationEmojis, 'charlite'),
            name: 'Charlite',
            oochive_entry: 'Its life is tied to whatever it is currently burning, these creatures live a frail, fleeting life.',
            type: [OochType.Flame, OochType.Stone],
            hp: 5, atk: 15, def: 5, spd: 10, //total 35
            move_list: [
                [1, Move.Hit], [2, Move.Embolden], [4, Move.Fireball], [8, Move.Intimidate], [10, Move.DustStorm], 
                [13, Move.Radiate], [16, Move.Sparkler], [19, Move.Heatwave], [22, Move.Engulf], [24, Move.Fog], 
                [27, Move.AshBlast], [37, Move.Torch], [39, Move.LavaLance], [42, Move.LenseFlare], [-1, Move.Inferno]
            ],
            abilities: [ Ability.Fleeting, Ability.Warm ],
            pre_evo_id: -1, evo_id: 18, evo_lvl: 10, evo_stage: 0
        })

        // Darcoal
        create_monster({
            id: 18,
            emote: get_emote_string(applicationEmojis, 'darcoal'),
            name: 'Darcoal',
            oochive_entry: 'This flame has lived a surprisingly long life. It slowly burns its surroundings, covering the area in a thick black smoke.',
            type: [OochType.Flame, OochType.Stone],
            hp: 15, atk: 25, def: 13, spd: 12, //total 65
            move_list: [
                [1, Move.Hit], [2, Move.Embolden], [4, Move.Fireball], [8, Move.Intimidate], [10, Move.DustStorm], 
                [13, Move.Radiate], [16, Move.Sparkler], [19, Move.Heatwave], [22, Move.Engulf], [24, Move.Fog], 
                [27, Move.AshBlast], [37, Move.Torch], [39, Move.LavaLance], [42, Move.LenseFlare], [-1, Move.Inferno]
            ],
            abilities: [ Ability.Efficient, Ability.Warm ],
            pre_evo_id: 17, evo_id: -1, evo_lvl: -1, evo_stage: 1
        })

        // Torchoir
        create_monster({
            id: 19,
            emote: get_emote_string(applicationEmojis, 'torchoir'),
            name: 'Torchoir',
            oochive_entry: 'A sentient torch that hums a haunting tune. Its song fills people with dread.',
            type: [OochType.Flame, OochType.Sound],
            hp: 12, atk: 13, def: 11, spd: 9, //total 45
            move_list: [
                [1, Move.Bash], [3, Move.Fireball], [4, Move.Embolden], [7, Move.Screech], [10, Move.MagicBolt],
                [12, Move.SonicBoom], [15, Move.EchoChamber], [17, Move.Torch], [21, Move.ClampDown], [23, Move.SonicBoom], 
                [27, Move.EarShatter], [31, Move.RallyingCry], [36, Move.Radiate], [40, Move.DrainLife], [44, Move.Eruption], 
                [-1, Move.ArcaStrike]
            ],
            abilities: [ Ability.Boisterous, Ability.Haunted ],
            pre_evo_id: -1, evo_id: 20, evo_lvl: 18, evo_stage: 0
        })


        // Chantern
        create_monster({
            id: 20,
            emote: get_emote_string(applicationEmojis, 'chantern'),
            name: 'Chantern',
            oochive_entry: 'It can mimic the human voice nearly perfectly, though it only speaks in random phrases.', 
            type: [OochType.Flame, OochType.Sound],
            hp: 21, atk: 20, def: 24, spd: 15, //total 80
            move_list: [
                [1, Move.Bash], [3, Move.Fireball], [4, Move.Embolden], [7, Move.Screech], [10, Move.MagicBolt],
                [12, Move.SonicBoom], [15, Move.EchoChamber], [17, Move.Torch], [21, Move.ClampDown], [23, Move.SonicBoom], 
                [27, Move.EarShatter], [31, Move.RallyingCry], [36, Move.Radiate], [40, Move.DrainLife], [44, Move.Eruption], 
                [-1, Move.ArcaStrike]
            ],
            abilities: [Ability.Boisterous, Ability.Haunted],
            pre_evo_id: 19, evo_id: -1, evo_lvl: -1, evo_stage: 1
        })

        // Eluslug
        create_monster({
            id: 21,
            emote: get_emote_string(applicationEmojis, 'eluslug'),
            name: 'Eluslug',
            oochive_entry: 'Oddly malleable despite its metallic body, it feeds on the magnetic wandering stones found in various locations.', 
            type: [OochType.Tech],
            hp: 11, atk: 12, def: 12, spd: 14, //total 50
            move_list: [
                [1, Move.Bash], [2, Move.Limber], [3, Move.ByteBite], [10, Move.Digitize], [12, Move.Torque],
                [16, Move.SyncStrike], [20, Move.Lagspike], [24, Move.BlindingBeam], [28, Move.HighImpact], 
                [34, Move.Bind], [43, Move.PlasmaCannon], [-1, Move.Laminate]
            ],
            abilities: [Ability.Leech, Ability.Icky],
            pre_evo_id: -1, evo_id: -1, evo_lvl: -1, evo_stage: 0
        })

        // Jellime
        create_monster({
            id: 22,
            emote: get_emote_string(applicationEmojis, 'jellime'),
            name: 'Jellime',
            oochive_entry: 'A jellyfish-like creature, its probing tendrils ensnare whatever they touch.', 
            type: [OochType.Ooze],
            hp: 14, atk: 10, def: 16, spd: 10, //total 50
            move_list: [
                [1, Move.Bash], [2, Move.Limber], [3, Move.Glob], [7, Move.MagicBolt], [8, Move.Bind], [11, Move.ClampDown],
                [14, Move.PressureWave], [18, Move.Impale], [21, Move.Suplex], [25, Move.TangledThreads], [27, Move.Wetlands],  
                [29, Move.Blight], [32, Move.ArcaStrike], [36, Move.Gravitate], [39, Move.Whiplash], [42, Move.Overgrowth],
                [-1, Move.Laminate]
            ],
            abilities: [Ability.Leech, Ability.Icky],
            pre_evo_id: -1, evo_id: 23, evo_lvl: 15, evo_stage: 0
        })

        // Meduslime
        create_monster({
            id: 23,
            emote: get_emote_string(applicationEmojis, 'meduslime'),
            name: 'Meduslime',
            oochive_entry: 'With a strangely developed nervous system, this creature is capable of exploting any weaknesses it finds.', 
            type: [OochType.Ooze, OochType.Magic],
            hp: 16, atk: 25, def: 19, spd: 15, //total 75
            move_list: [
                [1, Move.Bash], [2, Move.Limber], [3, Move.Glob], [7, Move.MagicBolt], [8, Move.Bind], [11, Move.ClampDown],
                [14, Move.PressureWave], [18, Move.Impale], [21, Move.Suplex], [25, Move.TangledThreads], [27, Move.Wetlands],  
                [29, Move.Blight], [32, Move.ArcaStrike], [36, Move.Gravitate], [39, Move.Whiplash], [42, Move.Overgrowth],
                [-1, Move.Laminate]
            ],
            abilities: [Ability.Leech, Ability.Icky],
            pre_evo_id: 22, evo_id: -1, evo_lvl: -1, evo_stage: 1
        })

        // Tisparc
        create_monster({
            id: 24,
            emote: get_emote_string(applicationEmojis, 'tisparc'),
            name: 'Tisparc',
            oochive_entry: 'The hat-like crystal on its head grants it a magical energy which it cannot quite control.', 
            type: [OochType.Magic, OochType.Flame],
            hp: 8, atk: 15, def: 7, spd: 10, //total 45
            move_list: [
                [1, Move.Bash], [2, Move.Embolden], [5, Move.MagicBolt], [9, Move.Sparkler], [12, Move.Fireball],
                [14, Move.Gravitate], [16, Move.Kaleidoscope], [19, Move.Thunderstorm], [21, Move.Glimmer], [26, Move.CallThunder],
                [29, Move.EchoChamber], [31, Move.JaggedGround], [33, Move.GemBash], [34, Move.Wetlands], [37, Move.CausticOrb],
                [41, Move.ArcaStrike], [45, Move.TimeWarp], [-1, Move.Torch]
            ],
            abilities: [Ability.Uncontrolled, Ability.Apprentice],
            pre_evo_id: -1, evo_id: 25, evo_lvl: 13, evo_stage: 0
        })

        // Wizzap
        create_monster({
            id: 25,
            emote: get_emote_string(applicationEmojis, 'wizzap'),
            name: 'Wizzap',
            oochive_entry: 'It has mastered control of its crystal and uses it to produce highly dangerous magic arcs.', 
            type: [OochType.Magic, OochType.Flame],
            hp: 13, atk: 23, def: 12, spd: 12, //total 65
            move_list: [
                [1, Move.Bash], [2, Move.Embolden], [5, Move.MagicBolt], [9, Move.Sparkler], [12, Move.Fireball],
                [14, Move.Gravitate], [16, Move.Kaleidoscope], [19, Move.Thunderstorm], [21, Move.Glimmer], [26, Move.CallThunder],
                [29, Move.EchoChamber], [31, Move.JaggedGround], [33, Move.GemBash], [34, Move.Wetlands], [37, Move.CausticOrb],
                [41, Move.ArcaStrike], [45, Move.TimeWarp], [-1, Move.Torch]
            ],
            abilities: [Ability.Focused, Ability.Patient],
            pre_evo_id: 24, evo_id: -1, evo_lvl: -1, evo_stage: 1
        })

        // Blipoint
        create_monster({
            id: 26,
            emote: get_emote_string(applicationEmojis, 'blipoint'),
            name: 'Blipoint',
            oochive_entry: 'An eye peeks through a rift in space-time.', 
            type: [OochType.Magic], 
            hp: 10, atk: 7, def: 6, spd: 7, // total 30
            move_list: [
                [1, Move.Bash], [2, Move.Slash], [5, Move.Blink], [11, Move.HypeUp], 
                [15, Move.Slash], [18, Move.PrecisionStrike], [20, Move.TwistedReality], [25, Move.Impale], 
                [27, Move.PressureWave], [30, Move.HeldStrike], [35, Move.TimeWarp], [40, Move.HighImpact],
                [42, Move.PlasmaCannon], [50, Move.DebugBomb], [-1, Move.Pulverize]
            ],
            abilities: [Ability.Fleeting, Ability.Reactive], 
            pre_evo_id: -1, evo_id: 27, evo_lvl: 20, evo_stage: 0
        });

        // Rerune
        create_monster({
            id: 27,
            emote: get_emote_string(applicationEmojis, 'rerune'),
            name: 'Rerune',
            oochive_entry: 'What seems to be part of a face begins to emerge from the rift, unable to fully reveal itself.', 
            type: [OochType.Magic], 
            hp: 10, atk: 15, def: 15, spd: 15, // total 55
            move_list: [
                [1, Move.Bash], [2, Move.Slash], [5, Move.Blink], [11, Move.HypeUp], 
                [15, Move.Slash], [18, Move.PrecisionStrike], [20, Move.TwistedReality], [25, Move.Impale], 
                [27, Move.PressureWave], [30, Move.HeldStrike], [35, Move.TimeWarp], [40, Move.HighImpact],
                [42, Move.PlasmaCannon], [50, Move.DebugBomb], [-1, Move.Pulverize]
            ],
            abilities: [Ability.Fleeting, Ability.Reactive], 
            pre_evo_id: 26, evo_id: 28, evo_lvl: 40, evo_stage: 1
        });

        // Temporath
        create_monster({
            id: 28,
            emote: get_emote_string(applicationEmojis, 'temporath'),
            name: 'Temporath',
            oochive_entry: 'It was not meant to exist here and now, so it experiences episodes of uncontrollable rage.', 
            type: [OochType.Magic], 
            hp: 20, atk: 20, def: 20, spd: 20, // total 80
            move_list: [
                [1, Move.Bash], [2, Move.Slash], [5, Move.Blink], [11, Move.HypeUp], 
                [15, Move.Slash], [18, Move.PrecisionStrike], [20, Move.TwistedReality], [25, Move.Impale], 
                [27, Move.PressureWave], [30, Move.HeldStrike], [35, Move.TimeWarp], [40, Move.HighImpact],
                [42, Move.PlasmaCannon], [50, Move.DebugBomb], [-1, Move.Pulverize]
            ],
            abilities: [Ability.Uncontrolled, Ability.Withering], 
            pre_evo_id: 27, evo_id: -1, evo_lvl: -1, evo_stage: 2
        });

        // Nucleorb
        create_monster({
            id: 29,
            emote: get_emote_string(applicationEmojis, 'nucleorb'),
            name: 'Nucleorb',
            oochive_entry: 'The nucleus of a cell grown to a massive size, for a cell that is. This rarity is relatively helpless on its own.', 
            type: [OochType.Ooze], 
            hp: 7, atk: 13, def: 9, spd: 11, // total 40
            move_list: [
                [1, Move.Bash], [2, Move.Limber], [5, Move.Glob], [7, Move.Siphon], [11, Move.Parasitize], 
                [14, Move.CursedEye], [16, Move.Wetlands], [18, Move.Corrode], [22, Move.CausticOrb], [24, Move.Pulverize], 
                [27, Move.EarShatter], [30, Move.Suplex], [33, Move.HeldStrike], [35, Move.Barrage], [39, Move.SkyClear], 
                [45, Move.SlurpUp], [-1, Move.Bloom]
            ],
            abilities: [Ability.Miniscule, Ability.Gentle], 
            pre_evo_id: -1, evo_id: 30, evo_lvl: 12, evo_stage: 0
        });

        // Amebite
        create_monster({
            id: 30,
            emote: get_emote_string(applicationEmojis, 'amebite'),
            name: 'Amebite',
            oochive_entry: 'A ravenous macrocell that eats anything in its path, they grow and reproduce quickly enough to overrun entire ecosystems.', 
            type: [OochType.Ooze], 
            hp: 11, atk: 18, def: 12, spd: 14, // total 55
            move_list: [
                [1, Move.Bash], [2, Move.Limber], [5, Move.Glob], [7, Move.Siphon], [11, Move.Parasitize], 
                [14, Move.CursedEye], [16, Move.Wetlands], [18, Move.Corrode], [22, Move.CausticOrb], [24, Move.Pulverize], 
                [27, Move.EarShatter], [30, Move.Suplex], [33, Move.HeldStrike], [35, Move.Barrage], [39, Move.SkyClear], 
                [45, Move.SlurpUp], [-1, Move.Bloom]
            ],
            abilities: [Ability.Tough, Ability.Ravenous], 
            pre_evo_id: 29, evo_id: 31, evo_lvl: 22, evo_stage: 1
        });

        // Amalgrime
        create_monster({
            id: 31,
            emote: get_emote_string(applicationEmojis, 'amalgrime'),
            name: 'Amalgrime',
            oochive_entry: 'When an ecosystem is overrun by Amebite they eventually converge on a single point. The result is a massive, yet oddly gentle being.', 
            type: [OochType.Ooze], 
            hp: 25, atk: 20, def: 20, spd: 20, // total 85
            move_list: [
                [1, Move.Bash], [2, Move.Limber], [5, Move.Glob], [7, Move.Siphon], [11, Move.Parasitize], 
                [14, Move.CursedEye], [16, Move.Wetlands], [18, Move.Corrode], [22, Move.CausticOrb], [24, Move.Pulverize], 
                [27, Move.EarShatter], [30, Move.Suplex], [33, Move.HeldStrike], [35, Move.Barrage], [39, Move.SkyClear], 
                [45, Move.SlurpUp], [-1, Move.Bloom]
            ],
            abilities: [Ability.Immense, Ability.Gentle], 
            pre_evo_id: 30, evo_id: -1, evo_lvl: -1, evo_stage: 2
        });

        // Drilline
        create_monster({
            id: 32,
            emote: get_emote_string(applicationEmojis, 'drilline'),
            name: 'Drilline',
            oochive_entry: 'Despite a simplified system, these robots are prone to going rogue. How they sustain themselves in the wild remains a mystery.', 
            type: [OochType.Tech], 
            hp: 11, atk: 14, def: 15, spd: 5, // total 45
            move_list: [
                 [1, Move.Bash], [2, Move.Embolden], [4, Move.PebbleBlast], [7, Move.IronHammer], [8, Move.Sedimentation],
                 [12, Move.Entomb], [14, Move.JaggedGround], [16, Move.SelfDestruct], [20, Move.MetalLance], [23, Move.Impale],
                 [26, Move.Reset], [29, Move.Grind], [35, Move.Torque], [39, Move.Heatseeker], [44, Move.IronHammer], [-1, Move.Boulderdash]
            ],
            abilities: [Ability.Armored, Ability.Inertia], 
            pre_evo_id: -1, evo_id: 33, evo_lvl: 21, evo_stage: 0
        });

        // Erwrek
        create_monster({
            id: 33,
            emote: get_emote_string(applicationEmojis, 'erwrek'),
            name: 'Erwrek',
            oochive_entry: 'It consumes whatever it can to replace its broken parts, when choices are slim it will even make use of organic material.', 
            type: [OochType.Tech], 
            hp: 15, atk: 19, def: 25, spd: 16, // total 75
            move_list: [
                [1, Move.Bash], [2, Move.Embolden], [4, Move.PebbleBlast], [7, Move.IronHammer], [8, Move.Sedimentation],
                [12, Move.Entomb], [14, Move.JaggedGround], [16, Move.SelfDestruct], [20, Move.MetalLance], [23, Move.Impale],
                [26, Move.Reset], [29, Move.Grind], [35, Move.Torque], [39, Move.Heatseeker], [44, Move.IronHammer], [-1, Move.Boulderdash]
            ],
            abilities: [Ability.Armored, Ability.Leech], 
            pre_evo_id: 32, evo_id: -1, evo_lvl: -1, evo_stage: 1
        });

        // Purif-i
        create_monster({
            id: 34,
            emote: get_emote_string(applicationEmojis, 'purifi'),
            name: 'Purif-i',
            oochive_entry: 'Cleansed of its corruption, this oochamon maintains some aspects of the Void and Stone types.', 
            type: [OochType.Void, OochType.Stone], 
            hp: 10, atk: 10, def: 10, spd: 10, // total 40
            move_list: [
                [1, Move.Bash], [2, Move.PebbleBlast], [5, Move.Brittle], [7, Move.CursedEye], 
                [10, Move.Purify], [15, Move.Blink], [17, Move.NullSphere], [20, Move.DustStorm], 
                [24, Move.Entrench], [31, Move.Boulderdash], [40, Move.GemBash], [-1, Move.Kaleidoscope]
            ],
            abilities: [Ability.Increment], 
            pre_evo_id: -1, evo_id: -1, evo_lvl: -1, evo_stage: 0
        });

        // Cromet
        create_monster({
            id: 35,
            emote: get_emote_string(applicationEmojis, 'cromet'),
            name: 'Cromet',
            oochive_entry: 'Cromet fall from the sky when the distant stars rupture in the night. Thousands can fall at the same time.', 
            type: [OochType.Stone], 
            hp: 12, atk: 13, def: 10, spd: 15, // total 50
            move_list: [
                [1, Move.Bash], [2, Move.Hasten], [4, Move.PebbleBlast], [7, Move.Intimidate], [9, Move.Gravitate], 
                [12, Move.ClampDown], [15, Move.CrashLanding], [18, Move.Boulderdash], [21, Move.JaggedGround], [23, Move.SolarBlast], 
                [27, Move.HawkEye], [31, Move.SonicBoom], [36, Move.DustStorm], [39, Move.HighImpact], [42, Move.PlasmaCannon],  
                [47, Move.LavaLance], [-1, Move.SyncStrike]
            ],
            abilities: [Ability.Inertia, Ability.Scorching], 
            pre_evo_id: -1, evo_id: 36, evo_lvl: 20, evo_stage: 0
        });

        // Lobstar
        create_monster({
            id: 36,
            emote: get_emote_string(applicationEmojis, 'lobstar'),
            name: 'Lobstar',
            oochive_entry: 'From a distance they seem to be stars in the sky, their weighty bodies are lifted by an immense amount of energy.', 
            type: [OochType.Stone, OochType.Flame], 
            hp: 10, atk: 35, def: 20, spd: 10, // total 75
            move_list: [
                [1, Move.Bash], [2, Move.Hasten], [4, Move.PebbleBlast], [7, Move.Intimidate], [9, Move.Gravitate], 
                [12, Move.ClampDown], [15, Move.CrashLanding], [18, Move.Boulderdash], [21, Move.JaggedGround], [23, Move.SolarBlast], 
                [27, Move.HawkEye], [31, Move.SonicBoom], [36, Move.DustStorm], [39, Move.HighImpact], [42, Move.PlasmaCannon],  
                [47, Move.LavaLance], [-1, Move.SyncStrike]
            ],
            abilities: [Ability.Immense, Ability.Scorching], 
            pre_evo_id: 35, evo_id: -1, evo_lvl: -1, evo_stage: 1
        });

        // Spoolette
        create_monster({
            id: 37,
            emote: get_emote_string(applicationEmojis, 'spoolette'),
            name: 'Spoolette',
            oochive_entry: 'While Spoolette itself is magical in nature, the threads it creates are completely mundane.', 
            type: [OochType.Magic, OochType.Cloth], 
            hp: 10, atk: 15, def: 15, spd: 10, // total 50
            move_list: [
                [1, Move.Bash], [2, Move.Hasten], [4, Move.MagicBolt], [7, Move.Lurk], [9, Move.RagWhip], 
                [13, Move.TangledThreads], [17, Move.DrainLife], [19, Move.Impale], [22, Move.Barrage], [28, Move.FatedThreads], 
                [32, Move.Mummify], [35, Move.Whiplash], [38, Move.Impale], [43, Move.FiberSlicer], [48, Move.GuidedSpire], 
                [-1, Move.MetalLance]
            ],
            abilities: [Ability.Tangled, Ability.Leech], 
            pre_evo_id: -1, evo_id: 38, evo_lvl: 13, evo_stage: 0
        });

        // Thimbite
        create_monster({
            id: 38,
            emote: get_emote_string(applicationEmojis, 'thimbite'),
            name: 'Thimbite',
            oochive_entry: 'Thimbite enchant a container when they evolve so that it can never be removed, touching one\'s container causes it to rage.', 
            type: [OochType.Magic, OochType.Cloth], 
            hp: 20, atk: 20, def: 20, spd: 10, // total 70wor
            move_list: [
                [1, Move.Bash], [2, Move.Hasten], [4, Move.MagicBolt], [7, Move.Lurk], [9, Move.RagWhip], 
                [13, Move.TangledThreads], [17, Move.DrainLife], [19, Move.Impale], [22, Move.Barrage], [28, Move.FatedThreads], 
                [32, Move.Mummify], [35, Move.Whiplash], [38, Move.Impale], [43, Move.FiberSlicer], [48, Move.GuidedSpire], 
                [-1, Move.MetalLance]
            ],
            abilities: [Ability.Tangled, Ability.Leech], 
            pre_evo_id: 37, evo_id: -1, evo_lvl: -1, evo_stage: 1
        });

        // Digityke
        create_monster({
            id: 39,
            emote: get_emote_string(applicationEmojis, 'digityke'),
            name: 'Digityke',
            oochive_entry: 'An old-model of machine companion, its feeble body prevents it from being of much use.', 
            type: [OochType.Tech],
            hp: 10, atk: 7, def: 8, spd: 5, // total 30
            move_list: [
                [1, Move.Bash], [2, Move.Slash], [5, Move.ByteBite], [7, Move.DigitalGamble], [10, Move.EarSplitter],
                [12, Move.Suplex], [14, Move.Sparkler], [16, Move.SyncStrike], [20, Move.SelfDestruct], 
                [27, Move.Reset], [32, Move.SyncStrike], [37, Move.CallThunder], [40, Move.Thunder], [48, Move.PlasmaCannon], 
                [-1, Move.BlindingBeam]
            ],
            abilities: [Ability.Gentle, Ability.Efficient],
            pre_evo_id: -1, evo_id: 40, evo_lvl: 21, evo_stage: 0
        });
        
        // Codet
        create_monster({
            id: 40,
            emote: get_emote_string(applicationEmojis, 'codet'),
            name: 'Codet',
            oochive_entry: 'An attempt to modernize the DGTY-k gone wrong. Despite being decommissioned these haunting machines continue to run.', 
            type: [OochType.Tech, OochType.Magic],
            hp: 30, atk: 10, def: 10, spd: 10, // total 60
            move_list: [
                [1, Move.Bash], [2, Move.Slash], [5, Move.ByteBite], [7, Move.DigitalGamble], [10, Move.EarSplitter],
                [12, Move.Suplex], [14, Move.Sparkler], [16, Move.SyncStrike], [20, Move.SelfDestruct], [21, Move.PhantomBullet], [23, Move.Heatseeker], 
                [27, Move.Reset], [32, Move.SyncStrike], [37, Move.CallThunder], [40, Move.Thunder], [48, Move.PlasmaCannon], 
                [-1, Move.BlindingBeam]
            ],
            abilities: [Ability.Alert, Ability.Rogue],
            pre_evo_id: 39, evo_id: -1, evo_lvl: -1, evo_stage: 1
        });
        
        // Heatri
        create_monster({
            id: 41,
            emote: get_emote_string(applicationEmojis, 'heatri'),
            name: 'Heatri',
            oochive_entry: 'A bird-like creature made of an ever-shifting fluid, in this form it becomes superheated.', 
            type: [OochType.Flame],
            hp: 25, atk: 10, def: 10, spd: 20, // total 65
            move_list: [
                [1, Move.Bash], [3, Move.Hasten], [5, Move.Fireball], [10, Move.Threefold],
                [15, Move.Engulf], [25, Move.LavaLance], [30, Move.Eruption], [36, Move.Inferno],
                [40, Move.SolarBlast], [-1, Move.SlowBurn]
            ],
            abilities: [Ability.Crystallize],
            pre_evo_id: 43, evo_id: 42, evo_lvl: 33, evo_stage: 1
        });
        
        // Moistri
        create_monster({
            id: 42,
            emote: get_emote_string(applicationEmojis, 'moistri'),
            name: 'Moistri',
            oochive_entry: 'Researchers studying Moistri tend to fall ill after handling it, despite this some believe it to have some sort of healing properties.', 
            type: [OochType.Ooze],
            hp: 25, atk: 20, def: 10, spd: 10, // total 65
            move_list: [
                [1, Move.Bash], [3, Move.Limber], [5, Move.Glob], [10, Move.Threefold],
                [15, Move.Impale], [25, Move.ThornShot], [30, Move.SlurpUp], [36, Move.Kaleidoscope],
                [40, Move.BlindingBeam], [-1, Move.Blight]
            ],
            abilities: [Ability.Crystallize],
            pre_evo_id: 41, evo_id: 43, evo_lvl: 33, evo_stage: 1
        });
        
        // Crystri
        create_monster({
            id: 43,
            emote: get_emote_string(applicationEmojis, 'crystri'),
            name: 'Crystri',
            oochive_entry: 'While its crystals appear rigid they maintain some sort of fluidity.', 
            type: [OochType.Crystal],
            hp: 25, atk: 10, def: 20, spd: 10, // total 65
            move_list: [
                [1, Move.Bash], [3, Move.MagicBolt], [5, Move.Shards], [10, Move.Threefold],
                [15, Move.Blink], [25, Move.DustStorm], [30, Move.Glimmer], [36, Move.ArcaStrike],
                [40, Move.GemBash], [-1, Move.GlassBlades]
            ],
            abilities: [Ability.Crystallize],
            pre_evo_id: 42, evo_id: 41, evo_lvl: 33, evo_stage: 1
        });
        
        // Solidifyr
        create_monster({
            id: 44,
            emote: get_emote_string(applicationEmojis, 'solidifyr'),
            name: 'Solidifyr',
            oochive_entry: 'Frequently found wandering lava fields. While unflinching in the face of an eruption, they will flee immediately if startled otherwise.', 
            type: [OochType.Flame],
            hp: 17, atk: 13, def: 11, spd: 9, // total 50
            move_list: [
                [1, Move.Bash], [2, Move.Restruct], [4, Move.Fireball], [7, Move.Caltrops], [11, Move.JaggedGround],
                [13, Move.Slash], [17, Move.DustStorm], [20, Move.Entomb], [23, Move.HypeUp], [28, Move.Boulderdash],
                [32, Move.Engulf], [35, Move.Grind], [38, Move.FireyHorn], [41, Move.Sedimentation], [44, Move.Inferno], 
                [-1, Move.BlindingBeam]
            ],
            abilities: [Ability.Warm, Ability.Scorching],
            pre_evo_id: -1, evo_id: 45, evo_lvl: 38, evo_stage: 0
        });
        
        // Obstaggard
        create_monster({
            id: 45,
            emote: get_emote_string(applicationEmojis, 'obstaggard'),
            name: 'Obstaggard',
            oochive_entry: 'While incredibly hard and sharp, their horns are very brittle. Obstaggard are often hunted in order to make precision blades.', 
            type: [OochType.Flame, OochType.Stone],
            hp: 19, atk: 23, def: 17, spd: 11, // total 70
            move_list: [
                [1, Move.GuidedSpire], [1, Move.HealingGems],
                [1, Move.Bash], [2, Move.Restruct], [4, Move.Fireball], [7, Move.Caltrops], [11, Move.JaggedGround],
                [13, Move.Slash], [17, Move.DustStorm], [20, Move.Entomb], [23, Move.HypeUp], [28, Move.Boulderdash],
                [32, Move.Engulf], [35, Move.Grind], [38, Move.FireyHorn], [41, Move.Sedimentation], [44, Move.Inferno], 
                [-1, Move.BlindingBeam]
            ],
            abilities: [Ability.Withering, Ability.Lacerating],
            pre_evo_id: 44, evo_id: -1, evo_lvl: -1, evo_stage: 1
        });        

        // Droplunk
        create_monster({
            id: 46,
            emote: get_emote_string(applicationEmojis, 'droplunk'),
            name: 'Droplunk',
            oochive_entry: 'Oops, don\'t let this one drop on your head!', 
            type: [OochType.Stone],
            hp: 7, atk: 10, def: 8, spd: 15, // total 40
            move_list: [
                [1, Move.Bash], [2, Move.Intimidate], [4, Move.PebbleBlast], [7, Move.Gravitate], [10, Move.MagicBolt],
                [12, Move.Entomb], [13, Move.Mud], [16, Move.Sedimentation], [20, Move.CursedEye], [23, Move.Mummify],
                [27, Move.SyncStrike], [31, Move.Pulverize], [34, Move.TwistedReality], [37, Move.Boulderdash], [42, Move.CrashLanding], 
                [44, Move.AshBlast], [-1, Move.ByteBite]
            ],
            abilities: [Ability.Inertia, Ability.Gravity],
            pre_evo_id: -1, evo_id: 45, evo_lvl: 28, evo_stage: 0
        });
        
        // Brykurse
        create_monster({
            id: 47,
            emote: get_emote_string(applicationEmojis, 'brykurse'),
            name: 'Brykurse',
            oochive_entry: 'Square meatball!', 
            type: [OochType.Stone, OochType.Magic],
            hp: 14, atk: 28, def: 8, spd: 25, // total 75
            move_list: [
                [1, Move.Bash], [2, Move.Intimidate], [4, Move.PebbleBlast], [7, Move.Gravitate], [10, Move.MagicBolt],
                [12, Move.Entomb], [13, Move.Mud], [16, Move.Sedimentation], [20, Move.CursedEye], [23, Move.Mummify],
                [27, Move.SyncStrike], [31, Move.Pulverize], [34, Move.TwistedReality], [37, Move.Boulderdash], [42, Move.CrashLanding], 
                [44, Move.AshBlast], [-1, Move.ByteBite]
            ],
            abilities: [Ability.Inertia, Ability.Gravity],
            pre_evo_id: 46, evo_id: -1, evo_lvl: -1, evo_stage: 1
        });
        
        // Polyplute
        create_monster({
            id: 48,
            emote: get_emote_string(applicationEmojis, 'polyplute'),
            name: 'Polyplute',
            oochive_entry: 'Blooms of Polyplute create beautiful fields, however this phenomenon is incredibly dangerous as they make the environment around them toxic.', 
            type: [OochType.Fungal],
            hp: 12, atk: 13, def: 12, spd: 8, // total 45
            move_list: [
                [1, Move.Bash], [2, Move.Limber], [5, Move.Glob], [7, Move.Corrode], [10, Move.Mud],
                [12, Move.ClampDown], [15, Move.EnfeeblingSpore],  [18, Move.Fog], [22, Move.CausticOrb], [24, Move.Parasitize],
                [28, Move.Bloom], [37, Move.DrainLife], [40, Move.Wetlands], [46, Move.Overgrowth], [-1, Move.Laminate]
            ],
            abilities: [Ability.Sporespray, Ability.Leech],
            pre_evo_id: -1, evo_id: 49, evo_lvl: 29, evo_stage: 0
        });
        
        // Reefest
        create_monster({
            id: 49,
            emote: get_emote_string(applicationEmojis, 'reefest'),
            name: 'Reefest',
            oochive_entry: 'When Polyplute blooms linger in an area, they often congeal into the massive Reefest.', 
            type: [OochType.Fungal],
            hp: 35, atk: 15, def: 15, spd: 5, // total 70
            move_list: [
                [1, Move.Bash], [2, Move.Limber], [5, Move.Glob], [7, Move.Corrode], [10, Move.Mud],
                [12, Move.ClampDown], [15, Move.EnfeeblingSpore],  [18, Move.Fog], [22, Move.CausticOrb], [24, Move.Parasitize],
                [28, Move.Bloom], [37, Move.DrainLife], [40, Move.Wetlands], [46, Move.Overgrowth], [-1, Move.Laminate]
            ],
            abilities: [Ability.Sporespray, Ability.Leech],
            pre_evo_id: 48, evo_id: -1, evo_lvl: -1, evo_stage: 1
        });
        
        // Frigook
        create_monster({
            id: 50,
            emote: get_emote_string(applicationEmojis, 'frigook'),
            name: 'Frigook',
            oochive_entry: 'Frigook maintain a temperature just above the point of freezing and can quickly drop below it to harden their bodies.', 
            type: [OochType.Ooze, OochType.Crystal],
            hp: 15, atk: 5, def: 15, spd: 5, // total 40
            move_list: [
                [1, Move.Hit], [2, Move.Limber], [3, Move.Glob], [6, Move.Fog], [7, Move.Corrode],
                [10, Move.Brittle], [14, Move.Siphon], [20, Move.Impale], [23, Move.Frostbite], [25, Move.CursedEye],
                [28, Move.StickyOrb], [32, Move.ArcaStrike], [36, Move.Suplex], [41, Move.GemBash], [-1, Move.Kaleidoscope]
            ],
            abilities: [Ability.Moist, Ability.Frostbite],
            pre_evo_id: -1, evo_id: 51, evo_lvl: 23, evo_stage: 0
        });
        
        // Boreyuc
        create_monster({
            id: 51,
            emote: get_emote_string(applicationEmojis, 'boreyuc'),
            name: 'Boreyuc',
            oochive_entry: 'These beasts move incredibly slowly unless disturbed, liquefying their body and attacking immediately.', 
            type: [OochType.Ooze, OochType.Crystal],
            hp: 15, atk: 7, def: 30, spd: 3, // total 65
            move_list: [
                [1, Move.Hit], [2, Move.Limber], [3, Move.Glob], [6, Move.Fog], [7, Move.Corrode],
                [10, Move.Brittle], [14, Move.Siphon], [20, Move.Impale], [23, Move.Frostbite], [25, Move.CursedEye],
                [28, Move.StickyOrb], [32, Move.ArcaStrike], [36, Move.Suplex], [41, Move.GemBash], [-1, Move.Kaleidoscope]
            ],
            abilities: [Ability.Bipolar, Ability.Frostbite],
            pre_evo_id: 50, evo_id: -1, evo_lvl: -1, evo_stage: 1
        });
        
        // Vrumbox
        create_monster({
            id: 52,
            emote: get_emote_string(applicationEmojis, 'vrumbox'),
            name: 'Vrumbox',
            oochive_entry: 'Monowheeled automata built for carrying various pieces of equipment.', 
            type: [OochType.Tech],
            hp: 10, atk: 10, def: 10, spd: 15, // total 45
            move_list: [
                [1, Move.Bash], [2, Move.Hasten], [6, Move.Sawblade], [8, Move.Caltrops], [12, Move.Sharpen],
                [15, Move.SlowBurn], [19, Move.Barrage], [23, Move.Torque], [27, Move.Grind], [31, Move.Radiate], 
                [35, Move.DigitalGamble], [37, Move.Flurry], [42, Move.Suplex], [47, Move.Caltrops], [-1, Move.CallThunder]
            ],
            abilities: [Ability.Inertia, Ability.Armored],
            pre_evo_id: -1, evo_id: 53, evo_lvl: 18, evo_stage: 0
        });
        
        // Folduo
        create_monster({
            id: 53,
            emote: get_emote_string(applicationEmojis, 'folduo'),
            name: 'Folduo',
            oochive_entry: 'Folduo\'s body allows it to fit into small spaces. It also can combine with and dock with Vrumbox to create platforms.', 
            type: [OochType.Tech],
            hp: 15, atk: 12, def: 13, spd: 20, // total 60
            move_list: [
                [1, Move.Bash], [2, Move.Hasten], [6, Move.Sawblade], [8, Move.Caltrops], [12, Move.Sharpen],
                [15, Move.SlowBurn], [19, Move.Barrage], [23, Move.Torque], [27, Move.Grind], [31, Move.Radiate], 
                [35, Move.DigitalGamble], [37, Move.Flurry], [42, Move.Suplex], [47, Move.Caltrops], [-1, Move.CallThunder]
            ],
            abilities: [Ability.Inertia, Ability.Armored],
            pre_evo_id: 52, evo_id: 54, evo_lvl: 32, evo_stage: 1
        });        

        // Hexyclone
        create_monster({
            id: 54,
            emote: get_emote_string(applicationEmojis, 'hexyclone'),
            name: 'Hexyclone',
            oochive_entry: 'A Hexcyclone\'s entire body can be folded into the space that acts as its head, allowing it to explore otherwise unenterable areas.',
            type: [OochType.Tech],
            hp: 20, atk: 13, def: 17, spd: 25, // total 75
            move_list: [
                [1, Move.Bash], [2, Move.Hasten], [6, Move.Sawblade], [8, Move.Caltrops], [12, Move.Sharpen],
                [15, Move.SlowBurn], [19, Move.Barrage], [23, Move.Torque], [27, Move.Grind], [31, Move.Radiate], 
                [35, Move.DigitalGamble], [37, Move.Flurry], [42, Move.Suplex], [47, Move.Caltrops], [-1, Move.CallThunder]
            ],
            abilities: [ Ability.Hexiply, Ability.Efficient ],
            pre_evo_id: 53, evo_id: -1, evo_lvl: -1, evo_stage: 2
        })

        // Doubud
        create_monster({
            id: 55,
            emote: get_emote_string(applicationEmojis, 'doubud'),
            name: 'Doubud',
            oochive_entry: 'Discovered when a researcher heard someone screaming. It turned out to be a pair of Doubud shouting back and forth at eachother.',
            type: [OochType.Sound],
            hp: 12, atk: 13, def: 8, spd: 7, // total 40
            move_list: [
                [1, Move.Bash], [3, Move.Screech], [6, Move.Limber], [9, Move.PrecisionStrike], [12, Move.Thunder], 
                [15, Move.EarSplitter], [18, Move.Caltrops], [23, Move.Entrench], [26, Move.SyncStrike], [29, Move.SonicBoom], 
                [34, Move.EarShatter], [37, Move.EchoChamber], [40, Move.Sedimentation], [44, Move.Pulverize], [-1, Move.HighImpact]
            ],
            abilities: [ Ability.BassBoost, Ability.Immobile ],
            pre_evo_id: -1, evo_id: 56, evo_lvl: 17, evo_stage: 0
        })

        // Hedfren
        create_monster({
            id: 56,
            emote: get_emote_string(applicationEmojis, 'hedfren'),
            name: 'Hedfren',
            oochive_entry: 'It\'s still not certain whether Hedfren is a true evolution or if it\'s just Doubud after emerging from the ground.',
            type: [OochType.Sound],
            hp: 23, atk: 21, def: 19, spd: 17, // total 80
            move_list: [
                [1, Move.Bash], [3, Move.Screech], [6, Move.Limber], [9, Move.PrecisionStrike], [12, Move.Thunder], 
                [15, Move.EarSplitter], [18, Move.Caltrops], [23, Move.Entrench], [26, Move.SyncStrike], [29, Move.SonicBoom], 
                [34, Move.EarShatter], [37, Move.EchoChamber], [40, Move.Sedimentation], [44, Move.Pulverize], [-1, Move.HighImpact]
            ],
            abilities: [ Ability.BassBoost, Ability.Ravenous ],
            pre_evo_id: 55, evo_id: -1, evo_lvl: -1, evo_stage: 1
        })

        // Kindeep
        create_monster({
            id: 57,
            emote: get_emote_string(applicationEmojis, 'kindeep'),
            name: 'Kindeep',
            oochive_entry: 'Schools of this fish-like oochamon are often found floating down in the caverns.',
            type: [OochType.Flame],
            hp: 10, atk: 13, def: 12, spd: 20, // total 55
            move_list: [
                [1, Move.Hit], [2, Move.Fireball], [5, Move.MagicBolt], [8, Move.Hasten], [10, Move.LenseFlare],
                [12, Move.Engulf], [16, Move.Lurk], [17, Move.Lurk], [22, Move.Blink], [27, Move.Inferno],
                [28, Move.PressureWave], [33, Move.ArcaStrike], [36, Move.Impale], [40, Move.AshBlast], [45, Move.PhantomBullet],
                [-1, Move.BlindingBeam]
            ],
            abilities: [ Ability.Spectral, Ability.Gentle ],
            pre_evo_id: -1, evo_id: 58, evo_lvl: 30, evo_stage: 0
        })

        // Ablayzz
        create_monster({
            id: 58,
            emote: get_emote_string(applicationEmojis, 'ablayzz'),
            name: 'Ablayzz',
            oochive_entry: 'Its flames act as a beacon for young Kindeep, serving as a vanguard and guiding them.',
            type: [OochType.Flame],
            hp: 20, atk: 18, def: 17, spd: 25, // total 80
            move_list: [
                [1, Move.Hit], [2, Move.Fireball], [5, Move.MagicBolt], [8, Move.Hasten], [10, Move.LenseFlare],
                [12, Move.Engulf], [16, Move.Lurk], [17, Move.Lurk], [22, Move.Blink], [27, Move.Inferno],
                [28, Move.PressureWave], [33, Move.ArcaStrike], [36, Move.Impale], [40, Move.AshBlast], [45, Move.PhantomBullet],
                [-1, Move.BlindingBeam]
            ],
            abilities: [ Ability.Spectral, Ability.Shadow ],
            pre_evo_id: 57, evo_id: -1, evo_lvl: -1, evo_stage: 1
        })

        // Krakle
        create_monster({
            id: 59,
            emote: get_emote_string(applicationEmojis, 'krakle'),
            name: 'Krakle',
            oochive_entry: 'This small \'mon has a superheated shell, don\'t touch it.',
            type: [OochType.Flame],
            hp: 10, atk: 13, def: 12, spd: 20, // total 55
            move_list: [
                [1, Move.Bash], [2, Move.Limber], [5, Move.Fireball], [7, Move.SlowBurn],
                [14, Move.Engulf], [-1, Move.Overgrowth]
            ],
            abilities: [ Ability.Warm, Ability.Miniscule ],
            pre_evo_id: -1, evo_id: 60, evo_lvl: 11, evo_stage: 0
        })

        // Lightuft
        create_monster({
            id: 60,
            emote: get_emote_string(applicationEmojis, 'lightuft'),
            name: 'Lightuft',
            oochive_entry: 'They don\'t quite fly well yet, but they\'re known for dropping on unsuspecting victims, burning them in the process.',
            type: [OochType.Flame],
            hp: 13, atk: 17, def: 13, spd: 22, // total 65
            move_list: [
                [1, Move.Bash], [2, Move.Limber], [5, Move.Fireball], [7, Move.SlowBurn], [11, Move.Screech],
                [14, Move.Engulf], [16, Move.HawkEye], [20, Move.Torch], [23,  Move.SonicBoom], [27, Move.Inferno], 
                [30, Move.SolarBlast], [35, Move.BlindingBeam], [40, Move.Barrage], [43, Move.Radiate], [-1, Move.AshBlast]
            ],
            abilities: [ Ability.Warm, Ability.HeightAdvantage ],
            pre_evo_id: 59, evo_id: 61, evo_lvl: 25, evo_stage: 1
        })

        // Infernowl
        create_monster({
            id: 61,
            emote: get_emote_string(applicationEmojis, 'infernowl'),
            name: 'Infernowl',
            oochive_entry: 'These apex predators will find a single volcano and make its entirety their hunting ground.',
            type: [OochType.Flame],
            hp: 20, atk: 25, def: 17, spd: 18, // total 80
            move_list: [
                [1, Move.Bash], [2, Move.Limber], [5, Move.Fireball], [7, Move.SlowBurn], [11, Move.Screech],
                [14, Move.Engulf], [16, Move.HawkEye], [20, Move.Torch], [23,  Move.SonicBoom], [27, Move.Inferno], 
                [30, Move.SolarBlast], [35, Move.BlindingBeam], [40, Move.Barrage], [43, Move.Radiate], [-1, Move.AshBlast]
            ],
            abilities: [ Ability.Scorching, Ability.HeightAdvantage ],
            pre_evo_id: 60, evo_id: -1, evo_lvl: -1, evo_stage: 2
        })

        // Fluffly
        create_monster({
            id: 62,
            emote: get_emote_string(applicationEmojis, 'fluffly'),
            name: 'Fluffly',
            oochive_entry: 'These spore-infected creatures float gently on the wind. Incredibly soft. Potentially dangerous.',
            type: [OochType.Fungal],
            hp: 13, atk: 13, def: 18, spd: 21, // total 65
            move_list: [
                [1, Move.Bash], [2, Move.Limber], [5, Move.Overgrowth], [5, Move.Fireball],
                [7, Move.Blight], [7, Move.SlowBurn], [12, Move.EnfeeblingSpore], [14, Move.Engulf],
                [19, Move.CursedEye], [23, Move.MycoBurst], [26, Move.AsbestosBomb], [29, Move.CausticOrb], [33, Move.DrainLife], 
                [35, Move.ThornShot], [39, Move.Impale], [44, Move.TakeOver], [-1, Move.Overgrowth]
            ],
            abilities: [ Ability.Icky, Ability.Sporespray ],
            pre_evo_id: 59, evo_id: 63, evo_lvl: 28, evo_stage: 1
        })

        // Decavian
        create_monster({
            id: 63,
            emote: get_emote_string(applicationEmojis, 'decavian'),
            name: 'Decavian',
            oochive_entry: 'A bird-like creature barely holding itself together, the fungus throughout its body is incredibly heat-resistant.',
            type: [OochType.Fungal],
            hp: 18, atk: 20, def: 25, spd: 17, // total 80
            move_list: [
                [1, Move.Bash], [2, Move.Limber], [5, Move.Overgrowth], [5, Move.Fireball],
                [7, Move.Blight], [7, Move.SlowBurn], [12, Move.EnfeeblingSpore], [14, Move.Engulf],
                [19, Move.CursedEye], [23, Move.MycoBurst], [26, Move.AsbestosBomb], [29, Move.CausticOrb], [33, Move.DrainLife], 
                [35, Move.ThornShot], [39, Move.Impale], [44, Move.TakeOver], [-1, Move.Overgrowth]
            ],
            abilities: [ Ability.Radiant, Ability.Sporespray ],
            pre_evo_id: 62, evo_id: -1, evo_lvl: -1, evo_stage: 2
        })

        // Phaegrim
        create_monster({
            id: 64,
            emote: get_emote_string(applicationEmojis, 'phaegrim'),
            name: 'Phaegrim',
            oochive_entry: 'The only truly solid part of its body is the mask-like shell, the rest is several individuals working as one.',
            type: [OochType.Fungal, OochType.Ooze],
            hp: 10, atk: 13, def: 12, spd: 20, // total 55
            move_list: [
                [1, Move.Bash], [2, Move.Glob], [4, Move.Limber], [7, Move.Brittle], [9, Move.CausticOrb],
                [12, Move.TakeOver], [14, Move.EnfeeblingSpore], [17, Move.Lurk], [20, Move.CursedEye], [26, Move.DrainLife],
                [29, Move.Wetlands], [31, Move.Barrage], [36, Move.Blight], [39, Move.Parasitize], [43, Move.Corrode],
                [-1, Move.Tumorize]
            ],
            abilities: [ Ability.Icky, Ability.Haunted ],
            pre_evo_id: -1, evo_id: 65, evo_lvl: 30, evo_stage: 0
        })

        // Plaghast
        create_monster({
            id: 65,
            emote: get_emote_string(applicationEmojis, 'plaghast'),
            name: 'Plaghast',
            oochive_entry: 'Its tendrils can be thinned and stretched over large swathes of land, acting as a widespread nervous system.',
            type: [OochType.Fungal, OochType.Ooze],
            hp: 20, atk: 18, def: 17, spd: 25, // total 80
            move_list: [
                [1, Move.Bash], [2, Move.Glob], [4, Move.Limber], [7, Move.Brittle], [9, Move.CausticOrb],
                [12, Move.TakeOver], [14, Move.EnfeeblingSpore], [17, Move.Lurk], [20, Move.CursedEye], [26, Move.DrainLife],
                [29, Move.Wetlands], [31, Move.Barrage], [36, Move.Blight], [39, Move.Parasitize], [43, Move.Corrode],
                [-1, Move.Tumorize]
            ],
            abilities: [ Ability.Alert, Ability.Leech ],
            pre_evo_id: 64, evo_id: -1, evo_lvl: -1, evo_stage: 1
        })

        // Grubbit
        create_monster({
            id: 66,
            emote: get_emote_string(applicationEmojis, 'grubbit'),
            name: 'Grubbit',
            oochive_entry: 'These small bugs can be found munching on bits of crystal.',
            type: [OochType.Crystal, OochType.Cloth],
            hp: 15, atk: 12, def: 13, spd: 10, // total 50
            move_list: [
                [1, Move.Bash], [2, Move.Brittle], [5, Move.Shards], [7, Move.Caltrops], [9, Move.RagWhip],
                [11, Move.Fog], [15, Move.Glimmer], [18, Move.Sedimentation], [19, Move.Boulderdash], [23, Move.HealingGems],
                [27, Move.FiberSlicer], [29, Move.GuidedSpire], [33, Move.Kaleidoscope], [40, Move.GlassBlades], [43, Move.TangledThreads],
                [-1, Move.BlindingBeam]
            ],
            abilities: [ Ability.Tangled, Ability.Miniscule ],
            pre_evo_id: -1, evo_id: 67, evo_lvl: 8, evo_stage: 0
        })

        // Culcoon
        create_monster({
            id: 67,
            emote: get_emote_string(applicationEmojis, 'culcoon'),
            name: 'Culcoon',
            oochive_entry: 'It encases itself in threads and chunks of crystal, Culcoon\'s shells are incredibly tough.',
            type: [OochType.Crystal, OochType.Cloth],
            hp: 20, atk: 10, def: 30, spd: 5, // total 65
            move_list: [
                [1, Move.Bash], [2, Move.Brittle], [5, Move.Shards], [7, Move.Caltrops], [9, Move.RagWhip],
                [11, Move.Fog], [15, Move.Glimmer], [18, Move.Sedimentation], [19, Move.Boulderdash], [23, Move.HealingGems],
                [27, Move.FiberSlicer], [29, Move.GuidedSpire], [33, Move.Kaleidoscope], [40, Move.GlassBlades], [43, Move.TangledThreads],
                [-1, Move.BlindingBeam]
            ],
            abilities: [ Ability.Dense, Ability.Immobile ],
            pre_evo_id: 66, evo_id: 68, evo_lvl: 20, evo_stage: 1
        })

        // Speculidae
        create_monster({
            id: 68,
            emote: get_emote_string(applicationEmojis, 'speculidae'),
            name: 'Speculidae',
            oochive_entry: 'Their thin bodies and stained glass-like wings belie their incredible rigidity.',
            type: [OochType.Crystal],
            hp: 12, atk: 10, def: 35, spd: 23, // total 80
            move_list: [
                [1, Move.Bash], [2, Move.Brittle], [5, Move.Shards], [7, Move.Caltrops], [9, Move.RagWhip],
                [11, Move.Fog], [15, Move.Glimmer], [18, Move.Sedimentation], [19, Move.Boulderdash], [23, Move.HealingGems],
                [27, Move.FiberSlicer], [29, Move.GuidedSpire], [33, Move.Kaleidoscope], [40, Move.GlassBlades], [43, Move.TangledThreads],
                [-1, Move.BlindingBeam]
            ],
            abilities: [ Ability.Crystallize, Ability.Lacerating ],
            pre_evo_id: 67, evo_id: -1, evo_lvl: -1, evo_stage: 2
        })

        // Nisythe
        create_monster({
            id: 69,
            emote: get_emote_string(applicationEmojis, 'nisythe'),
            name: 'Nisythe',
            oochive_entry: 'A haunting creature wielding a flaming scythe, it is nearly impossible to get a picture of this Oochamon.',
            type: [OochType.Magic, OochType.Flame],
            hp: 17, atk: 25, def: 12, spd: 15, // total 69
            move_list: [
                [1, Move.Bash], [2, Move.Slash], [5, Move.Embolden], [7, Move.CursedEye], 
                [10, Move.Blink], [13, Move.Grind], [15, Move.PrecisionStrike], [17, Move.Lurk], [21, Move.LavaLance],
                [24, Move.Barrage], [29, Move.SolarBlast], [31, Move.Sharpen], [35, Move.DrainLife], [41, Move.CallThunder],
                [50, Move.CrystalBall], [-1, Move.TangledThreads]
            ],
            abilities: [ Ability.EasyGo ],
            pre_evo_id: -1, evo_id: -1, evo_lvl: -1, evo_stage: 0
        })

        // Tidoll
        create_monster({
            id: 70,
            emote: get_emote_string(applicationEmojis, 'tidoll'),
            name: 'Tidoll',
            oochive_entry: 'These creatures are barely more than sacks of liquid with no bones supporting them.',
            type: [OochType.Ooze, OochType.Cloth],
            hp: 15, atk: 10, def: 15, spd: 15, // total 55
            move_list: [
                [1, Move.Bash], [2, Move.MagicBolt], [4, Move.Limber], [5, Move.RagWhip], [7, Move.Glob], [10, Move.Wetlands],
                [12, Move.CausticOrb], [16, Move.SlurpUp], [19, Move.RallyingCry], [23, Move.Bind], [26, Move.TangledThreads],
                [29, Move.SyncStrike], [34, Move.Barrage], [37, Move.ArcaStrike], [43, Move.Bloom], [-1, Move.FatedThreads]
            ],
            abilities: [Ability.Moist, Ability.Hearty],
            pre_evo_id: -1, evo_id: 71, evo_lvl: 24, evo_stage: 0
        });

        // Marinette
        create_monster({
            id: 71,
            emote: get_emote_string(applicationEmojis, 'marinette'),
            name: 'Marinette',
            oochive_entry: 'The golden threads controlling it are the main body, the rest is just ice-cold water.',
            type: [OochType.Ooze, OochType.Cloth],
            hp: 30, atk: 23, def: 17, spd: 10, // total 80
            move_list: [
                [1, Move.Bash], [2, Move.MagicBolt], [4, Move.Limber], [5, Move.RagWhip], [7, Move.Glob], [10, Move.Wetlands],
                [12, Move.CausticOrb], [16, Move.SlurpUp], [19, Move.RallyingCry], [23, Move.Bind], [26, Move.TangledThreads],
                [29, Move.SyncStrike], [34, Move.Barrage], [37, Move.ArcaStrike], [43, Move.Bloom], [-1, Move.FatedThreads]
            ],
            abilities: [Ability.Frostbite, Ability.Hearty],
            pre_evo_id: 70, evo_id: -1, evo_lvl: -1, evo_stage: 1
        });

        // Durble
        create_monster({
            id: 72,
            emote: get_emote_string(applicationEmojis, 'durble'),
            name: 'Durble',
            oochive_entry: 'These small stone-creatures are incredibly friendly, some researchers have taken them in as pets.',
            type: [OochType.Stone],
            hp: 15, atk: 15, def: 15, spd: 10, // total 55
            move_list: [
                [1, Move.Bash], [2, Move.PebbleBlast], [5, Move.Caltrops], [8, Move.PrecisionStrike], [11, Move.JaggedGround],
                [13, Move.Boulderdash], [19, Move.DustStorm], [24, Move.Brittle], [26, Move.HighImpact], [28, Move.MetalLance],
                [30, Move.LavaLance], [34, Move.Barrage], [37, Move.Grind], [40, Move.Sedimentation], [-1, Move.FireyHorn]
            ],
            abilities: [Ability.Gentle, Ability.Tough],
            pre_evo_id: -1, evo_id: 73, evo_lvl: 24, evo_stage: 0
        });

        // Durubull
        create_monster({
            id: 73,
            emote: get_emote_string(applicationEmojis, 'durubull'),
            name: 'Durubull',
            oochive_entry: 'Unlike their previous form, Durubull are incredibly aggressive. Keep a safe distance if you can.',
            type: [OochType.Stone],
            hp: 20, atk: 25, def: 25, spd: 15, // total 85
            move_list: [
                [1, Move.Bash], [2, Move.PebbleBlast], [5, Move.Caltrops], [8, Move.PrecisionStrike], [11, Move.JaggedGround],
                [13, Move.Boulderdash], [19, Move.DustStorm], [24, Move.Brittle], [26, Move.HighImpact], [28, Move.MetalLance],
                [30, Move.LavaLance], [34, Move.Barrage], [37, Move.Grind], [40, Move.Sedimentation], [-1, Move.FireyHorn]
            ],
            abilities: [Ability.Uncontrolled, Ability.Inertia],
            pre_evo_id: 72, evo_id: -1, evo_lvl: -1, evo_stage: 1
        });

        // Rustail
        create_monster({
            id: 74,
            emote: get_emote_string(applicationEmojis, 'rustail'),
            name: 'Rustail',
            oochive_entry: 'These little lizards are made entirely of metal, their rusted tails act as an infectious weapon.',
            type: [OochType.Tech],
            hp: 15, atk: 15, def: 15, spd: 10, // total 55
            move_list: [
                [1, Move.Bash], [3, Move.ByteBite], [5, Move.Embolden], [7, Move.Sawblade], [10, Move.ClampDown],
                [13, Move.PrecisionStrike], [15, Move.Fireball], [18, Move.HypeUp], [23, Move.Grind], [26, Move.Corrode],
                [29, Move.Heatseeker], [34, Move.Flurry], [36, Move.HypeUp], [41, Move.CallThunder], [44, Move.Threefold], 
                [-1, Move.Eruption]
            ],
            abilities: [Ability.Tangled, Ability.Lacerating],
            pre_evo_id: -1, evo_id: 75, evo_lvl: 35, evo_stage: 0
        });

        // Oxydrake
        create_monster({
            id: 75,
            emote: get_emote_string(applicationEmojis, 'oxydrake'),
            name: 'Oxydrake',
            oochive_entry: 'Their heart is like a miniature reactor, how this creature evolved naturally is entirely unknown.',
            type: [OochType.Tech],
            hp: 20, atk: 25, def: 23, spd: 17, // total 85
            move_list: [
                [1, Move.Bash], [3, Move.ByteBite], [5, Move.Embolden], [7, Move.Sawblade], [10, Move.ClampDown],
                [13, Move.PrecisionStrike], [15, Move.Fireball], [18, Move.HypeUp], [23, Move.Grind], [26, Move.Corrode],
                [29, Move.Heatseeker], [34, Move.Flurry], [36, Move.HypeUp], [41, Move.CallThunder], [44, Move.Threefold], 
                [-1, Move.Eruption]
            ],
            abilities: [Ability.Radioactive, Ability.Withering],
            pre_evo_id: 74, evo_id: -1, evo_lvl: -1, evo_stage: 1
        });

        // Chakreye
        create_monster({
            id: 76,
            emote: get_emote_string(applicationEmojis, 'chakreye'),
            name: 'Chakreye',
            oochive_entry: 'Their body is surrounded by a rapidly spinning disc of plasma.',
            type: [OochType.Tech],
            hp: 12, atk: 18, def: 10, spd: 15, // total 55
            move_list: [
                [1, Move.Bash], [5, Move.Embolden], [8, Move.Sawblade], [10, Move.Blink], [13, Move.SlowBurn],
                [17, Move.Barrage], [19, Move.Radiate], [21, Move.Slash], [26, Move.Gravitate], [29, Move.Slash],
                [31, Move.SyncStrike], [34, Move.BlindingBeam], [37, Move.Threefold], [39, Move.SelfDestruct], [42, Move.Engulf],
                [-1, Move.GlassBlades]
            ],
            abilities: [Ability.Energized, Ability.Focused],
            pre_evo_id: -1, evo_id: 77, evo_lvl: 30, evo_stage: 0
        });

        // Sabrink
        create_monster({
            id: 77,
            emote: get_emote_string(applicationEmojis, 'sabrink'),
            name: 'Sabrink',
            oochive_entry: 'A grinning energy blade that relentlessly pursues its enemies.',
            type: [OochType.Tech],
            hp: 18, atk: 30, def: 17, spd: 30, // total 85
            move_list: [
                [1, Move.Bash], [5, Move.Embolden], [8, Move.Sawblade], [10, Move.Blink], [13, Move.SlowBurn],
                [17, Move.Barrage], [19, Move.Radiate], [21, Move.Slash], [26, Move.Gravitate], [29, Move.Slash],
                [31, Move.SyncStrike], [34, Move.BlindingBeam], [37, Move.Threefold], [39, Move.SelfDestruct], [42, Move.Engulf],
                [-1, Move.GlassBlades]
            ],
            abilities: [Ability.Efficient, Ability.Parry],
            pre_evo_id: 76, evo_id: -1, evo_lvl: -1, evo_stage: 1
        });

        // Sapler
        create_monster({
            id: 78,
            emote: get_emote_string(applicationEmojis, 'sapler'),
            name: 'Sapler',
            oochive_entry: 'These little guys are known to infest power stations and cables, slowly draining their energy.',
            type: [OochType.Tech, OochType.Fungal],
            hp: 15, atk: 10, def: 20, spd: 5, // total 50
            move_list: [
                [1, Move.Bash], [2, Move.ByteBite], [4, Move.Fog], [7, Move.Siphon], [10, Move.Embolden],
                [13, Move.Fireball], [16, Move.TangledThreads], [18, Move.Radiate], [23, Move.IronHammer], [26, Move.Impale], 
                [29, Move.Blight], [31, Move.Heatseeker], [36, Move.DebugBomb], [38, Move.MycoBurst], [43, Move.Reset], 
                [-1, Move.CallThunder]
            ],
            abilities: [Ability.Bomber, Ability.Leech],
            pre_evo_id: -1, evo_id: 79, evo_lvl: 20, evo_stage: 0
        });

        // Radient
        create_monster({
            id: 79,
            emote: get_emote_string(applicationEmojis, 'radient'),
            name: 'Radient',
            oochive_entry: 'Radient spread their influence by chopping off their limbs, which eventually form new Saplers.',
            type: [OochType.Tech, OochType.Fungal],
            hp: 25, atk: 20, def: 20, spd: 15, // total 80
            move_list: [
                [1, Move.Bash], [2, Move.ByteBite], [4, Move.Fog], [7, Move.Siphon], [10, Move.Embolden],
                [13, Move.Fireball], [16, Move.TangledThreads], [18, Move.Radiate], [23, Move.IronHammer], [26, Move.Impale], 
                [29, Move.Blight], [31, Move.Heatseeker], [36, Move.DebugBomb], [38, Move.MycoBurst], [43, Move.Reset], 
                [-1, Move.CallThunder]
            ],
            abilities: [Ability.Bomber, Ability.Energized],
            pre_evo_id: 78, evo_id: -1, evo_lvl: -1, evo_stage: 1
        });

        // Lasangato
        create_monster({
            id: 80,
            emote: get_emote_string(applicationEmojis, 'lasangato'),
            name: 'Lasangato',
            oochive_entry: 'A feline-like creature, known to bask for days at a time which causes layers of stone to build upon its back.',
            type: [OochType.Stone],
            hp: 27, atk: 10, def: 23, spd: 10, // total 70
            move_list: [
                [1, Move.Bash], [2, Move.PebbleBlast], [5, Move.Mud], [8, Move.DustStorm], [10, Move.Intimidate],
                [12, Move.ClampDown], [17, Move.HypeUp], [22, Move.Sedimentation], [24, Move.JaggedGround], [27, Move.Gravitate],
                [30, Move.HighImpact], [33, Move.Entomb], [35, Move.SlurpUp], [41, Move.Suplex], [46, Move.CrashLanding], [-1, Move.Inferno]
            ],
            abilities: [Ability.Burdened, Ability.Burrower],
            pre_evo_id: -1, evo_id: -1, evo_lvl: -1, evo_stage: 0
        });

        // Crudoil
        create_monster({
            id: 81,
            emote: get_emote_string(applicationEmojis, 'crudoil'),
            name: 'Crudoil',
            oochive_entry: 'A living mass of an oil-like substance. They\'re always seen carrying a heavy metal ring.',
            type: [OochType.Ooze],
            hp: 7, atk: 12, def: 8, spd: 8, // total 35
            move_list: [
                [1, Move.Bash], [2, Move.Glob], [5, Move.Limber], [7, Move.Fireball], [9, Move.Intimidate],
                [11, Move.StickyOrb], [18, Move.Lurk], [22, Move.SelfDestruct], [26, Move.Engulf], [28, Move.Inferno],
                [31, Move.SlurpUp], [33, Move.Purify], [35, Move.Corrode], [38, Move.ArcaStrike], [43, Move.Suplex], 
                [-1, Move.Tumorize]
            ],
            abilities: [Ability.Flammable, Ability.Warm],
            pre_evo_id: -1, evo_id: 82, evo_lvl: 25, evo_stage: 0
        });

        // Oilantern
        create_monster({
            id: 82,
            emote: get_emote_string(applicationEmojis, 'oilantern'),
            name: 'Oilantern',
            oochive_entry: 'When Oilantern get angry enough the light they fuel gets hot enough to ignite their entire body.',
            type: [OochType.Ooze, OochType.Flame],
            hp: 15, atk: 25, def: 15, spd: 20, // total 75
            move_list: [
                [1, Move.Bash], [2, Move.Glob], [5, Move.Limber], [7, Move.Fireball], [9, Move.Intimidate],
                [11, Move.StickyOrb], [18, Move.Lurk], [22, Move.SelfDestruct], [26, Move.Engulf], [28, Move.Inferno],
                [31, Move.SlurpUp], [33, Move.Purify], [35, Move.Corrode], [38, Move.ArcaStrike], [43, Move.Suplex], 
                [-1, Move.Tumorize]
            ],
            abilities: [Ability.Flammable, Ability.Hearty],
            pre_evo_id: 81, evo_id: -1, evo_lvl: -1, evo_stage: 1
        });

        // Saporite
        create_monster({
            id: 83,
            emote: get_emote_string(applicationEmojis, 'saporite'),
            name: 'Saporite',
            oochive_entry: 'Also called mushroom fairies, these small creatures are very peaceful.',
            type: [OochType.Fungal],
            hp: 7, atk: 5, def: 13, spd: 5, // total 30
            move_list: [
                [1, Move.Bash], [2, Move.SporeShot], [5, Move.Brittle], [7, Move.Fog], [9, Move.MagicBolt],
                [11, Move.MyceliumWhip], [15, Move.StickyOrb], [18, Move.Slash], [21, Move.Entrench], [26, Move.Boulderdash],
                [32, Move.EnfeeblingSpore], [35, Move.HeldStrike], [37, Move.Gravitate], [44, Move.DrainLife], [-1, Move.TangledThreads]
            ],
            abilities: [Ability.Gentle, Ability.Patient],
            pre_evo_id: -1, evo_id: 84, evo_lvl: 32, evo_stage: 0
        });

        // Faering
        create_monster({
            id: 84,
            emote: get_emote_string(applicationEmojis, 'faering'),
            name: 'Faering',
            oochive_entry: 'When Saporite settle into the ground they form a network of mushrooms, granting them control of the ground itself.',
            type: [OochType.Fungal, OochType.Magic],
            hp: 24, atk: 26, def: 16, spd: 9, // total 80
            move_list: [
                [1, Move.Bash], [2, Move.SporeShot], [5, Move.Brittle], [7, Move.Fog], [9, Move.MagicBolt],
                [11, Move.MyceliumWhip], [15, Move.StickyOrb], [18, Move.Slash], [21, Move.Entrench], [26, Move.Boulderdash],
                [32, Move.EnfeeblingSpore], [35, Move.HeldStrike], [37, Move.Gravitate], [44, Move.DrainLife], [-1, Move.TangledThreads]
            ],
            abilities: [Ability.Tangled, Ability.Immense],
            pre_evo_id: 83, evo_id: -1, evo_lvl: -1, evo_stage: 1
        });

        // Kerkobble
        create_monster({
            id: 85,
            emote: get_emote_string(applicationEmojis, 'kercobble'),
            name: 'Kerkobble',
            oochive_entry: 'A small floating stone, researchers are unsure it has enough intelligence to be considered an Oochamon.',
            type: [OochType.Stone, OochType.Tech],
            hp: 9, atk: 8, def: 6, spd: 7, // total 30
            move_list: [
                [1, Move.Bash], [2, Move.Brittle], [5, Move.MagicBolt], [8, Move.PebbleBlast], [9, Move.PrecisionStrike], 
                [12, Move.HypeUp], [15, Move.Caltrops], [18, Move.Gravitate], [21, Move.CursedEye], [26, Move.Boulderdash],
                [29, Move.Kaleidoscope], [33, Move.Restruct], [37, Move.Grind], [40, Move.SelfDestruct], [-1, Move.Barrage]
            ],
            abilities: [Ability.Gentle, Ability.Patient],
            pre_evo_id: -1, evo_id: 86, evo_lvl: 42, evo_stage: 0
        });

        // Korkobble
        create_monster({
            id: 86,
            emote: get_emote_string(applicationEmojis, 'korkobble'),
            name: 'Korkobble',
            oochive_entry: 'If enough Kerkobble gather together, they work together form a neural network of sorts. It still isn\'t very smart though.',
            type: [OochType.Stone, OochType.Tech],
            hp: 31, atk: 19, def: 17, spd: 18, // total 85
            move_list: [
                [1, Move.Bash], [2, Move.Brittle], [5, Move.MagicBolt], [8, Move.PebbleBlast], [9, Move.PrecisionStrike], 
                [12, Move.HypeUp], [15, Move.Caltrops], [18, Move.Gravitate], [21, Move.CursedEye], [26, Move.Boulderdash],
                [29, Move.Kaleidoscope], [33, Move.Restruct], [37, Move.Grind], [40, Move.SelfDestruct], [-1, Move.Barrage]
            ],
            abilities: [Ability.Tangled, Ability.Immense],
            pre_evo_id: 85, evo_id: -1, evo_lvl: -1, evo_stage: 1
        });

        // Ilushand
        create_monster({
            id: 87,
            emote: get_emote_string(applicationEmojis, 'ilushand'),
            name: 'Ilushand',
            oochive_entry: 'Its unknown whether Ilushand\'s main body is the creature in the mirror or the small orb constantly next to it.',
            type: [OochType.Magic, OochType.Crystal],
            hp: 8, atk: 10, def: 9, spd: 8, // total 35
            move_list: [
                [1, Move.Bash], [2, Move.Intimidate], [5, Move.MagicBolt], [7, Move.Slash], [10, Move.Blink],
                [12, Move.Grind], [17, Move.Embolden], [21, Move.SyncStrike], [22, Move.CursedEye], [27, Move.Glimmer],
                [31, Move.TrueReflection], [32, Move.Kaleidoscope], [37, Move.BlindingBeam], [41, Move.TwistedReality], [-1, Move.SolarBlast]
            ],
            abilities: [Ability.Reactive, Ability.Rogue],
            pre_evo_id: -1, evo_id: 88, evo_lvl: 30, evo_stage: 0
        });

        // Miroraj
        create_monster({
            id: 88,
            emote: get_emote_string(applicationEmojis, 'miroraj'),
            name: 'Miroraj',
            oochive_entry: 'It endlessly reflects its inner core making it incredibly difficult to perceive.',
            type: [OochType.Magic, OochType.Crystal],
            hp: 18, atk: 22, def: 19, spd: 21, // total 80
            move_list: [
                [1, Move.Bash], [2, Move.Intimidate], [5, Move.MagicBolt], [7, Move.Slash], [10, Move.Blink],
                [12, Move.Grind], [17, Move.Embolden], [21, Move.SyncStrike], [22, Move.CursedEye], [27, Move.Glimmer],
                [31, Move.TrueReflection], [32, Move.Kaleidoscope], [37, Move.BlindingBeam], [41, Move.TwistedReality], [-1, Move.SolarBlast]
            ],
            abilities: [Ability.Reactive, Ability.Duplicant],
            pre_evo_id: 87, evo_id: -1, evo_lvl: -1, evo_stage: 1
        });

        // Fritarge
        create_monster({
            id: 89,
            emote: get_emote_string(applicationEmojis, 'fritarge'),
            name: 'Fritarge',
            oochive_entry: 'The empty husk of what appears to be a bronze turtle. It rarely moves.',
            type: [OochType.Tech],
            hp: 11, atk: 9, def: 13, spd: 7, // total 40
            move_list: [
                [1, Move.Bash], [2, Move.ByteBite], [5, Move.Intimidate], [8, Move.Fireball], [10, Move.ClampDown],
                [13, Move.Entrench], [16, Move.Caltrops], [18, Move.IronHammer], [21, Move.Thunderstorm], [24, Move.AshBlast],
                [27, Move.Lagspike], [29, Move.Barrage], [33, Move.Eruption], [39, Move.CursedEye], [43, Move.DebugBomb],
                [-1, Move.AshBlast]
            ],
            abilities: [Ability.Immobile, Ability.Armored],
            pre_evo_id: -1, evo_id: 90, evo_lvl: 20, evo_stage: 0
        });

        // Wardred
        create_monster({
            id: 90,
            emote: get_emote_string(applicationEmojis, 'wardred'),
            name: 'Wardred',
            oochive_entry: 'The gaping maw on this creature\'s back echoes metallic whispers.',
            type: [OochType.Tech],
            hp: 20, atk: 19, def: 22, spd: 14, // total 75
            move_list: [
                [1, Move.Bash], [2, Move.ByteBite], [5, Move.Intimidate], [8, Move.Fireball], [10, Move.ClampDown],
                [13, Move.Entrench], [16, Move.Caltrops], [18, Move.IronHammer], [21, Move.Thunderstorm], [24, Move.AshBlast],
                [27, Move.Lagspike], [29, Move.Barrage], [33, Move.Eruption], [39, Move.CursedEye], [43, Move.DebugBomb],
                [-1, Move.AshBlast]
            ],
            abilities: [Ability.Ravenous, Ability.Mundane],
            pre_evo_id: 89, evo_id: -1, evo_lvl: -1, evo_stage: 1
        });

        // Congsume
        create_monster({
            id: 91,
            emote: get_emote_string(applicationEmojis, 'congsume'),
            name: 'Congsume',
            oochive_entry: 'It can\'t stop moving or the flames on its body will eventually catch up.',
            type: [OochType.Flame],
            hp: 8, atk: 12, def: 7, spd: 13, // total 40
            move_list: [
                [1, Move.Bash], [2, Move.Embolden], [5, Move.Fireball], [8, Move.RallyingCry], [9, Move.ClampDown],
                [13, Move.HypeUp], [17, Move.Torch], [20, Move.EarSplitter], [23, Move.Hasten], [28, Move.Engulf],
                [30, Move.Heatwave], [34, Move.Inferno], [37, Move.PressureWave], [40, Move.SelfDestruct], [44, Move.Eruption], 
                [-1, Move.Purify]
            ],
            abilities: [Ability.Ravenous, Ability.EasyGo],
            pre_evo_id: -1, evo_id: 92, evo_lvl: 18, evo_stage: 0
        });

        // Fevour
        create_monster({
            id: 92,
            emote: get_emote_string(applicationEmojis, 'fevour'),
            name: 'Fevour',
            oochive_entry: 'Whatever it eats is immediately burned to keep it alive.',
            type: [OochType.Flame],
            hp: 11, atk: 26, def: 14, spd: 24, // total 75
            move_list: [
                [1, Move.Bash], [2, Move.Embolden], [5, Move.Fireball], [8, Move.RallyingCry], [9, Move.ClampDown],
                [13, Move.HypeUp], [17, Move.Torch], [20, Move.EarSplitter], [23, Move.Hasten], [28, Move.Engulf],
                [30, Move.Heatwave], [34, Move.Inferno], [37, Move.PressureWave], [40, Move.SelfDestruct], [44, Move.Eruption], 
                [-1, Move.Purify]
            ],
            abilities: [Ability.Ravenous, Ability.Withering],
            pre_evo_id: 91, evo_id: -1, evo_lvl: -1, evo_stage: 1
        });

        // Taditty
        create_monster({
            id: 93,
            emote: get_emote_string(applicationEmojis, 'taditty'),
            name: 'Taditty',
            oochive_entry: 'They can often be found clustered in small circles, covered in blankets and humming tunes to eachother.',
            type: [OochType.Sound, OochType.Cloth],
            hp: 8, atk: 11, def: 10, spd: 11, //total 40
            move_list: [
                [1, Move.Bash], [2, Move.Screech], [4, Move.RagWhip], [8, Move.Hasten], [11, Move.PrecisionStrike],
                [13, Move.EarShatter], [15, Move.Bind], [17, Move.RallyingCry], [20, Move.Whiplash], [24, Move.SonicBoom], [26, Move.PressureWave],
                [29, Move.EarSplitter], [33, Move.Thunderstorm], [38, Move.ScarySheet], [40, Move.FiberSlicer], [43, Move.Mummify], 
                [-1, Move.SlurpUp]
            ],
            abilities: [ Ability.Miniscule, Ability.Gentle ],
            pre_evo_id: -1, evo_id: 94, evo_lvl: 18, evo_stage: 0
        })
        
        // Silentoad
        create_monster({
            id: 94,
            emote: get_emote_string(applicationEmojis, 'silentoad'),
            name: 'Silentoad',
            oochive_entry: 'Silentoad are quiet, watchful, and relentlessly protective of the Taditty that rest near them.',
            type: [OochType.Sound, OochType.Cloth],
            hp: 13, atk: 17, def: 12, spd: 18, //total 60
            move_list: [
                [1, Move.Bash], [2, Move.Screech], [4, Move.RagWhip], [8, Move.Hasten], [11, Move.PrecisionStrike],
                [13, Move.EarShatter], [15, Move.Bind], [17, Move.RallyingCry], [20, Move.Whiplash], [24, Move.SonicBoom], [26, Move.PressureWave],
                [29, Move.EarSplitter], [33, Move.Thunderstorm], [38, Move.ScarySheet], [40, Move.FiberSlicer], [43, Move.Mummify], 
                [-1, Move.SlurpUp]
            ],
            abilities: [ Ability.BassBoost, Ability.Stealthy ],
            pre_evo_id: 93, evo_id: 95, evo_lvl: 37, evo_stage: 1
        })

        // Bansheet
        create_monster({
            id: 95,
            emote: get_emote_string(applicationEmojis, 'bansheet'),
            name: 'Bansheet',
            oochive_entry: 'Hidden beneath a tattered cloth, these creatures often catch unwary adventurers off guard with a head-splittingly loud screech.',
            type: [OochType.Sound, OochType.Cloth],
            hp: 23, atk: 25, def: 17, spd: 15, //total 80
            move_list: [
                [1, Move.Bash], [2, Move.Screech], [4, Move.RagWhip], [8, Move.Hasten], [11, Move.PrecisionStrike],
                [13, Move.EarShatter], [15, Move.Bind], [17, Move.RallyingCry], [20, Move.Whiplash], [24, Move.SonicBoom], [26, Move.PressureWave],
                [29, Move.EarSplitter], [33, Move.Thunderstorm], [38, Move.ScarySheet], [40, Move.FiberSlicer], [43, Move.Mummify], 
                [-1, Move.SlurpUp]
            ],
            abilities: [ Ability.BassBoost, Ability.Boisterous ],
            pre_evo_id: 94, evo_id: -1, evo_lvl: -1, evo_stage: 2
        })

        // Tryptid
        create_monster({
            id: 96,
            emote: get_emote_string(applicationEmojis, 'tryptid'),
            name: 'Tryptid',
            oochive_entry: 'It seemingly appeared out of nowhere, creeping up from the darkness, and attaching parts of Oochamon to itself as it went.',
            type: [OochType.Stone, OochType.Fungal],
            hp: 14, atk: 17, def: 23, spd: 15, // total 70
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
            id: 97,
            emote: get_emote_string(applicationEmojis, 'roswier'),
            name: 'Roswier',
            oochive_entry: 'The existence of Roswier leads researchers to believe that all Tech Oochamon are internally controlled by organisms related to Ooze-types.',
            type: [OochType.Tech, OochType.Ooze],
            hp: 26, atk: 24, def: 19, spd: 21, // total 90
            move_list: [
                [1, Move.Bash], [5, Move.Glob], [8, Move.ByteBite], [10, Move.Bind],
                [12, Move.Corrode], [16, Move.Impale], [20, Move.MetalLance], [23, Move.TangledThreads],
                [25, Move.Radiate], [28, Move.Flurry], [34, Move.Entrench], [40, Move.CrashLanding],
                [-1, Move.PhantomBullet]
            ],
            abilities: [Ability.LiquidCooled],
            pre_evo_id: -1, evo_id: -1, evo_lvl: -1, evo_stage: 0
        });

        
        // Chemerai
        create_monster({
            id: 98,
            emote: get_emote_string(applicationEmojis, 'chemerai'),
            name: 'Chemerai',
            oochive_entry: 'The crystal atop this creature acts as a matter-energy converter of sorts, though its inner workings are completely unknown.',
            type: [OochType.Crystal, OochType.Flame],
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

        //#region LEGENDARY HERE
        //#endregion

        // // Rosun
        // create_monster({
        //     id: 100,
        //     emote: get_emote_string(applicationEmojis, 'rosun'),
        //     name: 'Rosun',
        //     oochive_entry: 'It aimlessly drifts to and fro, and yet never seems to collide with anything.',
        //     type: [OochType.Crystal],
        //     hp: 10, atk: 8, def: 12, spd: 10, //total 40
        //     move_list: [
        //         [1, Move.Bash]
        //     ],
        //     abilities: [ Ability.Swaying, Ability.Armored ],
        //     pre_evo_id: -1, evo_id: 98, evo_lvl: 34, evo_stage: 0
        // })

        // // Morgoun
        // create_monster({
        //     id: 101,
        //     emote: get_emote_string(applicationEmojis, 'morgoun'),
        //     name: 'Morgoun',
        //     oochive_entry: 'Morgoun\'s body is composed of several layers of crystal, making it incedibly difficult to damage.',
        //     type: [OochType.Crystal],
        //     hp: 17, atk: 13, def: 26, spd: 14, //total 70
        //     move_list: [
        //         [1, Move.Bash]
        //     ],
        //     abilities: [ Ability.Swaying, Ability.Armored ],
        //     pre_evo_id: 97, evo_id: -1, evo_lvl: -1, evo_stage: 1
        // })

        // // Garnetie
        // create_monster({
        //     id: 102,
        //     emote: get_emote_string(applicationEmojis, 'garnetie'),
        //     name: 'Garnetie',
        //     oochive_entry: 'A strange construct, when angered the green crystals on its body thrash about almost fluidly.',
        //     type: [OochType.Crystal],
        //     hp: 10, atk: 12, def: 8, spd: 10, //total 40
        //     move_list: [
        //         [1, Move.Bash]
        //     ],
        //     abilities: [ Ability.Thrashing, Ability.Withering ],
        //     pre_evo_id: -1, evo_id: 100, evo_lvl: 34, evo_stage: 0
        // })

        // // Aventux
        // create_monster({
        //     id: 103,
        //     emote: get_emote_string(applicationEmojis, 'aventux'),
        //     name: 'Aventux',
        //     oochive_entry: 'The crystals making up its body are incredibly hard, but also very brittle, luckily they seem to regenerate quickly.',
        //     type: [OochType.Crystal],
        //     hp: 14, atk: 26, def: 13, spd: 17, //total 70
        //     move_list: [
        //         [1, Move.Bash]
        //     ],
        //     abilities: [ Ability.Thrashing, Ability.Withering ],
        //     pre_evo_id: 99, evo_id: -1, evo_lvl: -1, evo_stage: 1
        // })

        // // Galagge
        // create_monster({
        //     id: 104,
        //     emote: get_emote_string(applicationEmojis, 'galagge'),
        //     name: 'Galagge',
        //     oochive_entry: 'The ancient ring restored to its former glory allows Morgoun and Aventux to form a complete being, covering eachother\'s weaknesses.',
        //     type: [OochType.Crystal],
        //     hp: 18, atk: 21, def: 21, spd: 15, //total 75
        //     move_list: [
        //         [1, Move.Bash]
        //     ],
        //     abilities: [ Ability.Union ],
        //     pre_evo_id: -1, evo_id: -1, evo_lvl: -1, evo_stage: 2
        // })

        // Nullifly
        create_monster({
            id: 105,
            emote: get_emote_string(applicationEmojis, 'nullifly'),
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

        //#endregion

        //#region Uncatchable Data

        // i_
        create_monster({
            id: -1,
            emote: get_emote_string(applicationEmojis, 'i_'),
            name: 'i',
            oochive_entry: 'ERROR: entry not found',
            type: [OochType.Void],
            hp: 1, atk: 1, def: 1, spd: 1, // total 4
            move_list: [
                [1, Move.UndefinedInt]
            ],
            abilities: [Ability.InvalidEntry],
            pre_evo_id: -1, evo_id: -1, evo_lvl: -1, evo_stage: 0
        });

        // Oochabit
        create_monster({
            id: -2,
            emote: get_emote_string(applicationEmojis, 'oochabit'),
            name: 'Oochabit',
            oochive_entry: 'These little guys\'ll consume space-time and do it with a smile on their faces.',
            type: [OochType.Void],
            hp: 10, atk: 9, def: 5, spd: 6, // total 30
            move_list: [
                [1, Move.Bash]
            ],
            abilities: [ Ability.Nullify ],
            pre_evo_id: -1, evo_id: -3, evo_lvl: 18, evo_stage: 0
        })

        // Oochabound
        create_monster({
            id: -3,
            emote: get_emote_string(applicationEmojis, 'oochabound'),
            name: 'Oochabound',
            oochive_entry: 'No thank you, I\'d really rather not write a description for this one.',
            type: [OochType.Void],
            hp: 25, atk: 23, def: 17, spd: 20, // total 85
            move_list: [
                [1, Move.Bash]
            ],
            abilities: [ Ability.Duplicant ],
            pre_evo_id: -2, evo_id: -1, evo_lvl: -1, evo_stage: 1
        })


        //#endregion


        //#region Check if all Moves are being utilized somehow
        let test_mons = JSON.parse(db.monster_data.export()).keys.map(v => v.value);
        let test_moves = JSON.parse(db.move_data.export()).keys.map(v => v.value);
        let move_info = ''

        for(let tmove1 of test_moves) {
            let move_found = false;
            move_info += `${tmove1.name}|${type_to_string(tmove1.type)}|${tmove1.damage}|${tmove1.accuracy}|${tmove1.description}\n`
            for(let tmon of test_mons){
                for(let tmove2 of tmon.move_list){
                    if(tmove1.id == tmove2[1] || tmove1.id == 108){ //108 Jackpot's ID
                        move_found = true;
                        break;
                    }
                }
                if(move_found){
                    break;
                }
            }
            if(move_found == false){
                console.log(`MOVE UNUSED: id[${tmove1.id}] ${tmove1.name} `)
            }
        }

        //Comment/Uncomment this as needed
        //console.log(move_info);

        //#endregion

        //#region Create Maps
        await db.maps.clear();
        let files = fs.readdirSync('./Maps/');
        for (let file of files) {
            if (!file.includes('.json')) continue;
            let map_name = file.replace('.json', '');

            fs.readFile(`./Maps/${file}`, 'utf8', (err, data) => {
                if (err) {
                    console.log(`Error reading file: ${file}`);
                    return;
                }

                db.maps.set(map_name, JSON.parse(data));
            });
        }
        //#endregion

        // Generate text file for map editor project
        let tiles_output_str = "";
        let npc_output_str = "";

        for (let obj of db.tile_data.array()) {
            if (obj.id.includes('c')) {
                npc_output_str += `${obj.id}|${Object.values(obj.zone_emote_ids).map(v => `${v.emote}`).join('|')}\n`;
            } else {
                tiles_output_str += `${obj.id}|${obj.emote}\n`;
            }
        }

        fs.writeFile('./editor_data/tiles_data.txt', tiles_output_str, (err) => { if (err) throw err; });
        fs.writeFile('./editor_data/npc_data.txt', npc_output_str, (err) => { if (err) throw err; });

        // JSON editor info
        fs.writeFile('./editor_data/ooch_data.json', JSON.stringify(JSON.parse(db.monster_data.export()).keys.map(v => v.value), null, 2), (err) => { if (err) throw err; });
        fs.writeFile('./editor_data/moves_data.json', JSON.stringify(JSON.parse(db.move_data.export()).keys.map(v => v.value), null, 2), (err) => { if (err) throw err; });
        fs.writeFile('./editor_data/items_data.json', JSON.stringify(JSON.parse(db.item_data.export()).keys.map(v => v.value), null, 2), (err) => { if (err) throw err; });
        fs.writeFile('./editor_data/abilities_data.json', JSON.stringify(JSON.parse(db.ability_data.export()).keys.map(v => v.value), null, 2), (err) => { if (err) throw err; });

        // Read users.json file 
        fs.readFile("./global_events.json", function(err, data) { 
            
            // Check for errors 
            if (err) throw err; 

            // Converting to JSON 
            const events = JSON.parse(data); 
            // Generate the global events
            for (let event of Object.entries(events)) {
                event[1].push([
                    2,
                    {
                        "text": event[0]
                    }
                ])
                db.events_data.set(event[0], event[1]);
            }
        }); 

        //Add in any new global variables we've created, this is *not* a hard reset
        await refresh_global_variables(false);
        
        await interaction.editReply('Generated game data.');

        
    },
};
