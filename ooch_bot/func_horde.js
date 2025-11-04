
import {
    clamp,
    random,
    round,
    sample,
} from 'lodash-es';

import {
    OochID,
} from "./types.js";

/**
 * Creates a simple embed for the battle
 * @param {Int} round the text to display in the body of the embed
 * @param {Array} players the color along the edge of the embed
 * @returns a simple embed
 */
function generate_horde_round(round_number, players){
    let horde_list_basic = [
        OochID.Sporbee, OochID.Stingrowth,
        OochID.Puppyre, OochID.Dogglow,
        OochID.Roocky, OochID.Graknight,
        OochID.Constone, OochID.Amephyst,
        OochID.Glither, OochID.Sparafura,
        OochID.Widew, OochID.Tarotula,
        OochID.Moldot, OochID.Moldire,
        OochID.Torchoir, OochID.Chantern,
        OochID.Charlite, OochID.Darcoal,
        OochID.Eluslug, OochID.Shellamp, OochID.Caracar,
        OochID.Jellime, OochID.Meduslime,
        OochID.Tisparc, OochID.Wizzap,
        OochID.Blipoint, OochID.Rerune,
        OochID.Nucleorb, OochID.Amebite,
        OochID.Drilline, OochID.Erwrek,
        OochID.Cromet, OochID.Lobstar,
        OochID.Spoolette, OochID.Thimbite,
        OochID.Digityke, OochID.Codet,
        OochID.Solidifyr, OochID.Obstaggard,
        OochID.Droplunk, OochID.Brykurse,
        OochID.Polyplute, OochID.Reefest,
        OochID.Frigook, OochID.Boreyuc,
        OochID.Vrumbox, OochID.Folduo,
        OochID.Doubud, OochID.Hedfren,
        OochID.Kindeep, OochID.Ablayzz,
        OochID.Krakle, OochID.Lightuft,
        OochID.Phaegrim, OochID.Plaghast,
        OochID.Grubbit, OochID.Culcoon,
        OochID.Tidoll, OochID.Marinette,
        OochID.Durble, OochID.Durubull,
        OochID.Rustail, OochID.Oxydrake,
        OochID.Chakreye, OochID.Sabrink,
        OochID.Sapler, OochID.Radient,
        OochID.Lasangato, OochID.Parmanyan, OochID.Regulush,
        OochID.Crudoil, OochID.Oilantern, 
        OochID.Saporite, OochID.Faering,
        OochID.Kerkobble, OochID.Korkobble,
        OochID.Ilushand, OochID.Miroraj,
        OochID.Fritarge, OochID.Wardred,
        OochID.Congsume, OochID.Fevour,
        OochID.Taditty, OochID.Silentoad, 
        OochID.Shieldome, OochID.Rietor,
        OochID.Pondorb, OochID.Maglobe,
        OochID.Stakulb, OochID.Matryion,
        OochID.Lacerize, OochID.Rendive,
        OochID.Gnayme, OochID.Mysnome,
        OochID.Larvibe, OochID.Virtuito,
        OochID.Chewdee, OochID.Rhodent,
        OochID.Coimble, OochID.Crabandit,
        OochID.Bismote, OochID.Iridusk,
        OochID.Talto, OochID.Sectrip
    ]

    let horde_list_major = [
        OochID.Queenect, OochID.Hounuke, OochID.Kracking,
        OochID.Temporath, OochID.Amalgrime, OochID.Hexyclone,
        OochID.Drascend, OochID.Priseroth, OochID.Orchestryd,
        OochID.Bansheet, OochID.Speculidae, OochID.Nullifly,
        OochID.Heatri, OochID.Moistri, OochID.Crystri,
        OochID.Infernowl, OochID.Decavian, OochID.Nisythe
    ]

    let horde_list_boss = [
        OochID.Chemerai, OochID.Tryptid, OochID.Roswier,
        OochID.Ophicore, OochID.Heraloom, OochID.Symaat,
    ]

    let num_players = players.length;
    let boss_floor = round_number % 20 == 0;
    let major_floor = (round_number % 10 == 0) && !boss_floor;

    
    let num_wild = round(clamp(num_players + random(-1, round / 10, false)), 1, 3); //Number of wild mons should be similar to the number of players
    if(major_floor && round_number <= 20){ num_wild = 1; }
    if(boss_floor && round_number <= 20){ num_wild = 1; }

    let num_boss = (boss_floor > 0 ? 1 : 0);
    let num_major = clamp((major_floor > 0 ? 1  + Math.floor(round_number / 20) - num_boss : 0), 0, 3);
    let num_basic = clamp(num_wild - num_boss - num_major, 0, 3);
    let enemy_arr = []

    const SLOT_BOSS = 0
    const SLOT_MAJOR = 1
    const SLOT_BASIC = 2
    
    for(let i = 0; i < num_boss; i++){  enemy_arr.push(SLOT_BOSS);  }
    for(let i = 0; i < num_major; i++){ enemy_arr.push(SLOT_MAJOR); }
    for(let i = 0; i < num_basic; i++){ enemy_arr.push(SLOT_BASIC); }

    let iv_points = round((clamp(round_number * 1.25 + (num_players - num_wild) * 5)/40, 0, 10));
    let shiny_chance = Math.max((round_number - 5) / 100, .001);


    let mons_to_add = [];
    let mon_count = num_basic + num_major + num_boss;
    let arr_from
    for(let m = 0; m < mon_count; m++){
        switch(enemy_arr[m]){
            case SLOT_BASIC: arr_from = horde_list_basic; break;
            case SLOT_MAJOR: arr_from = horde_list_major; break;
            case SLOT_BOSS:  arr_from = horde_list_boss;  break;
        }

        let data = {
            id : sample(arr_from),
            form : Math.random() < shiny_chance ? "_prismatic" : "",
            ivs : iv_points
        }

        mons_to_add.push(data);
        
    }
}