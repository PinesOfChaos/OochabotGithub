import { profile, maps, tile_data, events_data, player_positions, item_data as _item_data, monster_data } from "./db.js";
import { Flags, PlayerState, Tile, Zone, UserType, Weather, Item, StanceForms } from './types.js';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, AttachmentBuilder, EmbedBuilder } from 'discord.js';
import wait from 'wait';
import { sample, clamp, random } from 'lodash-es';
import { event_process, event_from_npc } from './func_event.js';
import { buildBoxData, ooch_info_embed } from "./func_other.js";

let slot_num, ooch_user_data, box_row;

// Create box action rows
let box_buttons = new ActionRowBuilder()
    .addComponents(
        new ButtonBuilder().setCustomId('box_back_to_save').setLabel('Back').setStyle(ButtonStyle.Danger)
    ).addComponents(
        new ButtonBuilder().setCustomId('box_left').setEmoji('⬅️').setStyle(ButtonStyle.Primary)
    ).addComponents(
        new ButtonBuilder().setCustomId('box_right').setEmoji('➡️').setStyle(ButtonStyle.Primary)
    ).addComponents(
        new ButtonBuilder().setCustomId('box_num_label').setLabel('1').setStyle(ButtonStyle.Primary)
    ).addComponents(
        new ButtonBuilder().setCustomId('box_party_label').setLabel('Party').setStyle(ButtonStyle.Success)
    )

// Create box action rows
let box_battle_buttons = new ActionRowBuilder()
    .addComponents(
        new ButtonBuilder().setCustomId('box_finalize_team').setLabel('Ready').setStyle(ButtonStyle.Success)
    ).addComponents(
        new ButtonBuilder().setCustomId('box_left').setEmoji('⬅️').setStyle(ButtonStyle.Primary)
    ).addComponents(
        new ButtonBuilder().setCustomId('box_right').setEmoji('➡️').setStyle(ButtonStyle.Primary)
    ).addComponents(
        new ButtonBuilder().setCustomId('box_num_label').setLabel('1').setStyle(ButtonStyle.Primary)
    ).addComponents(
        new ButtonBuilder().setCustomId('box_party_label').setLabel('Party').setStyle(ButtonStyle.Success)
    )

let box_sel_buttons = new ActionRowBuilder()
    .addComponents(
        new ButtonBuilder().setCustomId('back_to_box').setLabel('Back').setStyle(ButtonStyle.Danger)
    ).addComponents(
        new ButtonBuilder().setCustomId('box_add_ooch').setLabel('Add To Party').setStyle(ButtonStyle.Success)
    ).addComponents(
        new ButtonBuilder().setCustomId('box_release').setLabel('Release').setStyle(ButtonStyle.Danger)
    )

let box_party_sel_buttons = new ActionRowBuilder()
    .addComponents(
        new ButtonBuilder().setCustomId('back_to_box').setLabel('Back').setStyle(ButtonStyle.Danger)
    ).addComponents(
        new ButtonBuilder().setCustomId('box_add_to_box').setLabel('Add To Box').setStyle(ButtonStyle.Secondary)
    )

let box_confirm_buttons = new ActionRowBuilder()
    .addComponents(
        new ButtonBuilder().setCustomId('box_yes').setLabel('Yes').setStyle(ButtonStyle.Success),
    ).addComponents(
        new ButtonBuilder().setCustomId('box_no').setLabel('No').setStyle(ButtonStyle.Danger),
    );

// let confirm_buttons = new ActionRowBuilder()
//     .addComponents(
//         new ButtonBuilder().setCustomId('yes').setLabel('Yes').setStyle(ButtonStyle.Success),
//     ).addComponents(
//         new ButtonBuilder().setCustomId('no').setLabel('No').setStyle(ButtonStyle.Danger),
//     );

let confirm_buttons_tp = new ActionRowBuilder()
    .addComponents(
        new ButtonBuilder().setCustomId('set_checkpoint').setLabel('Set Checkpoint').setEmoji('🏳️').setStyle(ButtonStyle.Success),
    ).addComponents(
        new ButtonBuilder().setCustomId('box_oochabox').setLabel('Oochabox').setEmoji('🎒').setStyle(ButtonStyle.Primary),
    ).addComponents(
        new ButtonBuilder().setCustomId('back').setLabel('Exit').setStyle(ButtonStyle.Danger)
    )

let teleport_menu = new ActionRowBuilder();    
// let savepoint_options = [confirm_buttons_tp]

let wild_encounter_buttons = new ActionRowBuilder()
    .addComponents(
        new ButtonBuilder().setCustomId('fight').setLabel('Fight').setStyle(ButtonStyle.Success).setEmoji('⚔️'),
    ).addComponents(
        new ButtonBuilder().setCustomId('run').setLabel('Run').setStyle(ButtonStyle.Danger).setEmoji('🏃‍♂️'),
    );

// let wild_encounter_instakill_btn = new ActionRowBuilder()
//     .addComponents(
//         new ButtonBuilder().setCustomId('instakill').setLabel('Autofight').setStyle(ButtonStyle.Primary).setEmoji('🗡️'),
//     )

let back_button = new ActionRowBuilder()
    .addComponents(
        new ButtonBuilder().setCustomId('back').setLabel('Back').setStyle(ButtonStyle.Danger),
    );

let qty_back_button = new ActionRowBuilder()
    .addComponents(
        new ButtonBuilder().setCustomId('quantity_back').setLabel('Cancel Purchase').setStyle(ButtonStyle.Danger),
    );

export function get_map_weather(map_weather, location_data) {
    let weather_options = []
    let px = location_data.x;
    let py = location_data.y;
    for(let w of map_weather) {
        if(px >= w.x && py >= w.y &&
            px <= w.x + w.width && py <= w.y + w.height
        ){
            weather_options.push(w.weather_name);
        }
    }
    
    return weather_options.length > 0 ? sample(weather_options) : Weather.None
}

export async function move(thread, user_id, direction, dist = 1, encounter_chance = false) {
    /*
        db.player_positions.set(user_id, interaction.member.displayName, 'player_name');
    */
    const {setup_battle, generate_battle_user } = await import("./func_battle.js");

    async function update_position(_uid, _map_name, _x, _y, _prev_positions){
        profile.set(_uid, { area: _map_name, x: _x, y: _y }, 'location_data');
        profile.set(_uid, _prev_positions, 'previous_positions')
        profile_data.location_data = { area: _map_name, x: _x, y: _y };
        profile_data.previous_positions = _prev_positions;
        xmove = 0;
        ymove = 0;
    }

    let checkPlrState = profile.get(`${user_id}`, 'player_state')
    if (checkPlrState !== PlayerState.Playspace) {
        return;
    }

    let profile_data = await profile.get(`${user_id}`);
    let msg_to_edit = profile_data.display_msg_id;
    let confirm_collector;
    let wild_encounter_collector;
    let shop_collector;
    let item_qty_collector;
    
    // Max limit of 4 tiles that you can move at once
    dist = clamp(dist, 0, 4);
    
    //Get the player's location
    let player_location = profile_data.location_data;
    let map_name = player_location.area;
    let playerx = player_location.x;
    let playery = player_location.y;
    let player_flags = profile_data.flags;
    let all_flags = [...player_flags];
    for(let ooch of profile_data.ooch_party){
        all_flags.push(`ooch_id_${ooch.id}`)
    }
    
    let moveDisable = false;
    let repel_ran_out = false;

    let previous_positions = profile_data.previous_positions;

    //Get the map array based on the player's current map
    let map_obj =   maps.get(`${map_name.toLowerCase()}`);
    if (map_obj == undefined) return;
    let map_info =          map_obj.map_info;
    let map_tiles =         map_obj.map_tiles; 
    let map_npcs =          map_obj.map_npcs;
    let map_spawns =        map_obj.map_spawn_zones;
    let map_savepoints =    map_obj.map_savepoints;
    let map_transitions =   map_obj.map_transitions;
    let map_events =        map_obj.map_events;
    let map_shops =         map_obj.map_shops;
    let map_bg =            map_obj.map_info.map_battleback;
    let map_weather =       map_obj.map_weather;
    if (map_shops == undefined || map_shops == null) map_shops = [];   

    let battle_weather = get_map_weather(map_weather, player_location);
    
    //set the vector of player movement
    let xmove = 0;
    let ymove = 0;
    switch(direction.toLowerCase()){
        case('a'):
            xmove = -1;
        break;
        case('d'):
            xmove = 1;
        break;
        case('w'):
            ymove  = -1;
        break;
        case('s'):
            ymove = 1;
        break;
    }

    //0 path, 1 block, 2 spawn, 3 chest
    let stop_moving = false;
    let step = 0;
    while(step < dist){
        
        if(stop_moving){ break; }

        //Move the player forward
        step++;
        let x_start = playerx;
        let y_start = playery;
        playerx += xmove;
        playery += ymove;

        //Track Repulsor steps remaining
        if (profile_data.repel_steps != 0) {
            profile.math(user_id, '-', 1, 'repel_steps');
            profile_data.repel_steps -= 1;
            if (profile_data.repel_steps == 0) repel_ran_out = true;
        } 

        let tile_id = map_tiles[playerx][playery]
        var tile = tile_data.get(`${tile_id.toString()}`);
        // 10% chance on cave, 40% chance on other places
        if (encounter_chance === false) {
            encounter_chance = tile.zone_id == Zone.Cave ? .10 : .40;
            if (profile_data.repel_steps != 0) encounter_chance = 0;
        }
        
        // Disable encounters for same tile movement that isn't through the battle keyword
        if (dist == 1 && encounter_chance === false) {
            encounter_chance = 0;
        }

        //Events
        if (!stop_moving) {
            let x1,y1,x2,y2;
            for (let obj of map_events) {
                if(stop_moving){ break; }

                x1 = (obj.x) <= playerx;
                y1 = (obj.y) <= playery;
                x2 = (obj.x + obj.width) >= playerx;
                y2 = (obj.y + obj.height) >= playery;
                if (x1 && y1 && x2 && y2) {
                    if ((obj.flag_required == false || all_flags.includes(obj.flag_required)) && !all_flags.includes(obj.event_name)) {

                        //Push the player back 1 step if they collide with an NPC to trigger this event
                        if (map_npcs.some((element) => element.x == playerx && element.y == playery)) {
                            playerx -= xmove;
                            playery -= ymove;
                        }

                        stop_moving = true;
                        await update_position(user_id, map_name, playerx, playery, previous_positions);

                        //moveDisable = true; to do we need to update the buttons *during* the event, this doesn't disable them until after it
                        await event_process(user_id, thread, events_data.get(`${obj.event_name}`), 0, obj.event_name);

                        //updat the profile information as it has likely changed since the event_process
                        profile_data = await profile.get(`${user_id}`); 
                        player_location = profile_data.location_data;
                        map_name = player_location.area;
                        playerx = player_location.x;
                        playery = player_location.y;
                    }
                }
            }
            if(stop_moving){ break; }
        }

        //NPCs
        if(!stop_moving){
            for(let obj of map_npcs){
                if(stop_moving){ break; } //Only interact with one NPC at a time (come back to this later maybe)

                let npc_flag = `${Flags.NPC}${obj.name}${obj.npc_id}`;

                //Skip NPCs if they meet any of these conditions
                if( (all_flags.includes(obj.flag_kill)) || //The player has the NPC's kill flag
                    (obj.flag_required != "" && !all_flags.includes(obj.flag_required)) || //The NPC requres a flag, and the player does not have that flag
                    (obj.remove_on_finish && all_flags.includes(npc_flag))){ continue; } //The NPC gets removed on finish, and the player has the NPC's personal flag
                if(stop_moving){ break; } //Stop searching if the player no-longer should be moving
                
                
                if(obj.x == playerx && obj.y == playery){ //Check if player collides with this NPC's position
                    stop_moving = true;
                    playerx -= xmove;
                    playery -= ymove;
                    
                    await update_position(user_id, map_name, playerx, playery, previous_positions);

                    let npc_event_obj = await event_from_npc(obj, user_id);
                    //console.log(npc_event_obj);
                    event_process(user_id, thread, npc_event_obj);
                }
                else if ((obj.team.length > 0) && (!all_flags.includes(npc_flag))) { //Check line-of sight if the NPC has a team and the NPC hasn't been encountered
                    let quarter_circle_radians = 90 * Math.PI / 180;
                    let steps = obj.aggro_range;
                    let stop_check = false;
                    let _vx, _vy, _xx, _yy, _t;
                    for(let i = 0; i < 4; i++){
                        _vx = Math.cos(quarter_circle_radians * i);
                        _vy = Math.sin(quarter_circle_radians * i);
                        if(stop_check){ break; }
                        for(let j = 1; j <= steps; j++){
                            _xx = Math.round(clamp(obj.x + (_vx * j), 0, 99));
                            _yy = Math.round(clamp(obj.y + (_vy * j), 0, 99));
                            _t = tile_data.get(`${map_tiles[_xx][_yy]}`);

                            if(!(_t.use == Tile.Floor || _t.use == Tile.Grass)){ //If the tile type checked is not floor or grass
                                break;
                            }
                            else if(_xx == playerx &&  _yy == playery){ //If this is a tile that the npc can see, stop the player
                                stop_moving = true;
                                stop_check = true;
                                
                                await update_position(user_id, map_name, playerx, playery, previous_positions);
                                let npc_event_obj = await event_from_npc(obj, user_id)
                                event_process(user_id, thread, npc_event_obj);
                                break;
                            }
                        }
                    }
                }
            }
        }

        //Transitions
        if(!stop_moving){
            for(let obj of map_transitions){
                if(stop_moving){ break; }
                if(obj.x == playerx && obj.y == playery){
                    stop_moving = true;
                    playerx = obj.connect_x;
                    playery = obj.connect_y;
                    if (obj.connect_map != '') {
                        map_name = obj.connect_map;
                    }
                    
                    //Get the map array based on the player's current map
                    map_obj =   maps.get(`${map_name.toLowerCase()}`);
                    map_tiles =         map_obj.map_tiles; 
                    map_npcs =          map_obj.map_npcs;
                    map_spawns =        map_obj.map_spawn_zones;
                    map_savepoints =    map_obj.map_savepoints;
                    map_transitions =   map_obj.map_transitions;
                    map_events =        map_obj.map_events;
                    map_shops =         map_obj.map_shops;
                    map_info =          map_obj.map_info;
                    if (map_shops == undefined || map_shops == null) map_shops = []; 
                    previous_positions = [];

                    //If the map has a failsafe pos and the position to is invalid, go to the failsafe pos
                    //This should only occur in generated maps, as their connection positions may change
                    if ((obj.connect_x == -1 || obj.connect_y == -1) && map_info.map_failsafe_pos != undefined){
                        playerx = map_info.map_failsafe_pos.x;
                        playery = map_info.map_failsafe_pos.y;
                    }
                }
            }
        }

        //Save Points
        if(!stop_moving){
            for(let obj of map_savepoints){
                if(stop_moving){ break; }
                if (dist == 1 && direction == '') break;
                if(obj.x == playerx && obj.y == playery){
                    //prompt the player 
                    stop_moving = true;
                    moveDisable = true;

                    await update_position(user_id, map_name, playerx, playery, previous_positions);

                    let page_num = 0;
                    let pages = 9;
                    let savepoint_options = [confirm_buttons_tp];

                    // Setup teleport menu
                    if (profile_data.areas_visited.length > 0 && profile.get(`${user_id}`, 'flags').includes('teleport_enable')) {
                        teleport_menu = new ActionRowBuilder();
                        let teleport_select_options = profile_data.areas_visited.map(name => 
                            {
                                let map_data = maps.get(`${name}`);
                                return { 
                                    label: `${map_data.map_info.map_name}`,
                                    value: `${name}`
                                }
                            });

                        teleport_menu.addComponents(
                            new StringSelectMenuBuilder()
                                .setCustomId('teleport_menu')
                                .setPlaceholder(`Teleport To Visited Area`)
                                .addOptions(teleport_select_options),
                        );
                        
                        savepoint_options.push(teleport_menu);
                    }

                    thread.send({ content: `\n## Checkpoint`, components: savepoint_options }).then(async msg => {
                        profile.set(user_id, PlayerState.Encounter, 'player_state');
                        confirm_collector = msg.createMessageComponentCollector();

                        confirm_collector.on('collect', async selected => {

                            // Page buttons
                            if (selected.customId == 'box_left' || selected.customId == 'box_right') {
                                selected.customId == 'box_left' ? page_num -= 1 : page_num += 1;
                                page_num = (page_num + pages) % pages; // Handle max page overflow
                                
                                box_row = buildBoxData(profile_data, page_num);
                                box_buttons.components[3].setLabel(`${page_num + 1}`);
                                selected.update({ content: `**Oochabox**`, components: [box_row[0], box_row[1], box_row[2], box_row[3], box_buttons], files: [] });
                            }

                            else if (selected.customId.includes('box')) {
                                box_collector_event(user_id, selected, page_num, profile_data)
                            } 

                            else if (selected.customId.includes('teleport_menu')) {
                                let biome_from = profile.get(`${user_id}`, 'location_data.area');
                                let biome_to = selected.values[0];
                                map_name = biome_to;
                                let biome_to_data = maps.get(`${biome_to}`);
                                let map_default = biome_to_data.map_savepoints.filter(v => v.is_default !== false);
                                if (biome_to_data.map_savepoints.filter(v => v.is_default !== false).length == 0) {
                                    map_default = [biome_to_data.map_savepoints[0]];
                                }

                                obj.x = map_default[0].x;
                                obj.y = map_default[0].y;
    
                                //remove the player's info from the old biome and add it to the new one
                                player_positions.set(biome_to, { x: map_default[0].x, y: map_default[0].y }, user_id);
                                player_positions.delete(biome_from, user_id);
                                profile.set(user_id, { area: biome_to, x: map_default[0].x, y: map_default[0].y }, 'location_data')
    
                                for (let i = 0; i < profile.get(`${user_id}`, 'ooch_party').length; i++) {
                                    profile.set(user_id, profile.get(`${user_id}`, `ooch_party[${i}].stats.hp`), `ooch_party[${i}].current_hp`);
                                    profile.set(user_id, true, `ooch_party[${i}].alive`);
                                }
    
                                profile.set(user_id, PlayerState.Playspace, 'player_state');
                                let playspace_str = await setup_playspace_str(user_id);

                                profile_data = profile.get(`${user_id}`);

                                selected.update({ content: `## Checkpoint\n\n**Warped to ${biome_to_data.map_info.map_name}!**`})

                                await thread.messages.fetch(msg_to_edit).then((msg) => {
                                    msg.edit({ content: playspace_str[0] }).catch(() => {});
                                });
                            }
                            
                            else if (selected.customId == 'set_checkpoint') {
                                profile.set(user_id, { area: map_name, x: obj.x, y: obj.y }, 'checkpoint_data');
                                if (!profile.get(`${user_id}`, 'areas_visited').includes(map_name)) {
                                    profile.push(user_id, map_name, 'areas_visited');
                                }

                                for (let i = 0; i < profile.get(`${user_id}`, 'ooch_party').length; i++) {
                                    profile.set(user_id, profile.get(`${user_id}`, `ooch_party[${i}].stats.hp`), `ooch_party[${i}].current_hp`);
                                    profile.set(user_id, true, `ooch_party[${i}].alive`);
                                }
                                profile.set(user_id, PlayerState.Playspace, 'player_state');
                                let playspace_str = await setup_playspace_str(user_id);
                                await thread.messages.fetch(msg_to_edit).then((msg) => {
                                    msg.edit({ content: playspace_str[0], components: playspace_str[1] }).catch(() => {});
                                });
                                await selected.update({ content: 'Set a checkpoint and healed all your Oochamon.', components: [] });
                                await wait(5000);
                                await msg.delete().catch(() => {});
                                await confirm_collector.stop();
                            } else {
                                profile.set(user_id, PlayerState.Playspace, 'player_state');
                                await msg.delete().catch(() => {});
                                await confirm_collector.stop();
                                let playspace_str = await setup_playspace_str(user_id);
                                await thread.messages.fetch(msg_to_edit).then((msg) => {
                                    msg.edit({ content: playspace_str[0], components: playspace_str[1] }).catch(() => {});
                                });
                            }
                        });
                    });
                }
            }
        }
        //Shops
        for(let obj of map_shops){
            if(stop_moving){ break; }
            //Check if player collides with this shop's position
            if(obj.x == playerx && obj.y == playery && !stop_moving){
                stop_moving = true;
                playerx -= xmove;
                playery -= ymove;

                
                await update_position(user_id, map_name, playerx, playery, previous_positions);
                profile.set(user_id, PlayerState.Shop, 'player_state');

                let profile_flags = profile.get(`${user_id}`, 'flags');
                let shopSelectOptions = await shop_list_from_flags(obj, profile_flags)

                shopSelectOptions = shopSelectOptions.flat(1);
                shopSelectOptions = [...new Set(shopSelectOptions)];
                shopSelectOptions = shopSelectOptions.map(id => {
                    let item_data = _item_data.get(`${id}`);
                    let item_amount = profile.get(`${user_id}`, `${item_data.category}.${id}`);
                    if (item_amount == undefined) item_amount = 0;
                    return { 
                        label: `${item_data.name} (${item_amount}/50) [$${item_data.price}]`,
                        description: item_data.description_short,
                        value: `${id}`,
                        emoji: item_data.emote,
                    }
                });

                let oochabux = profile.get(`${user_id}`, 'oochabux');

                // Setup shop select menu
                let shopSelectMenu = new ActionRowBuilder()
                .addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('shop_items')
                        .setPlaceholder(`Select an item to buy! ($${oochabux})`)
                        .addOptions(shopSelectOptions),
                );

                let shopImage = new AttachmentBuilder(`./Art/ShopImages/shopPlaceholder.png`)
                let shopEmbed = new EmbedBuilder()
                    .setColor('#808080')
                    .setTitle('Shop')
                    .setImage(`attachment://shopPlaceholder.png`)
                    .setDescription(obj.greeting_dialogue)

                let msg = await thread.send({ embeds: [shopEmbed], files: [shopImage], components: [shopSelectMenu, back_button] });
                
                // Delete the current playspace
                let playspace_msg = await thread.messages.fetch(profile.get(`${user_id}`, 'display_msg_id')).catch(() => {});
                if (playspace_msg !== undefined) {
                    await playspace_msg.delete().catch(() => {});
                }

                shop_collector = await thread.createMessageComponentCollector({ time: 600000 });
                shop_collector.on('collect', async sel => {
                    let oochabux = profile.get(`${user_id}`, 'oochabux');
                    if (sel.customId == 'back') {
                        profile.set(user_id, PlayerState.Playspace, 'player_state');
                        let playspace_str = await setup_playspace_str(user_id);
                        let play_msg = await thread.send({ content: playspace_str[0], components: playspace_str[1] });
                        profile.set(user_id, play_msg.id, 'display_msg_id')
                        profile.set(user_id, oochabux, 'oochabux')
                        await msg.delete().catch(() => {});
                        shop_collector.stop();
                        if (item_qty_collector) item_qty_collector.stop();
                        return;
                    } else if (sel.customId == 'quantity_back') {
                        await sel.update({ content: null, components: [shopSelectMenu, back_button], embeds: [shopEmbed], files: [shopImage] }).catch(() => {});
                        if (item_qty_collector) item_qty_collector.stop();
                        return;
                    }
                    
                    let item_id = sel.values[0];
                    let item = _item_data.get(`${item_id}`);
                    if (item.price <= oochabux) {
                        const qty_filter = async m => {
                            if (m.author.id != user_id) return false;
                            if (!isNaN(parseInt(m.content))) {
                                if (oochabux < item.price * parseInt(m.content)) {
                                    m.delete().catch(() => {});
                                    return false;
                                }
                                return true;
                            } else {
                                m.delete().catch(() => {});
                                return false;
                            }
                        }

                        profile.ensure(user_id, 0, `${item.category}.${item_id}`);
                        let amtHeld = profile.get(`${user_id}`, `${item.category}.${item_id}`); 
                        if (amtHeld < 0) {
                            profile.set(user_id, 0, `${item.category}.${item_id}`);
                            amtHeld = 0;
                        }

                        let maxAmt = Math.floor(oochabux / item.price);
                        if (maxAmt > 50) maxAmt = 50;
                        if (maxAmt > amtHeld) maxAmt -= amtHeld;

                        if (amtHeld >= 50) {
                            await sel.update({ content: null, components: [shopSelectMenu, back_button], embeds: [shopEmbed], files: [shopImage] }).catch(() => {});
                            return;
                        }
                        await sel.update({ content: `How many of the ${item.emote} **${item.name}** would you like to purchase? Type in the amount below.\n` + 
                            `You have enough Oochabux to buy **${maxAmt}** more of this item.`,
                                embeds: [], files: [], components: [qty_back_button] });
                        item_qty_collector = thread.createMessageCollector({ filter: qty_filter, max: 1 });

                        item_qty_collector.on('collect', async m => {
                            let new_inv_qty = 0;
                            let buyAmount = Math.abs(parseInt(m.content));
                            if (buyAmount > (50 - amtHeld)) buyAmount = (50 - amtHeld);
                            oochabux -= item.price * buyAmount;
                            profile.set(user_id, oochabux, 'oochabux')
                            switch (item.category) {
                                case 'heal_inv': 
                                    profile.ensure(user_id, 0, `heal_inv.${item_id}`)
                                    profile.math(user_id, '+', buyAmount, `heal_inv.${item_id}`);
                                    new_inv_qty = profile.get(`${user_id}`, `heal_inv.${item_id}`);
                                break;
                                case 'prism_inv': 
                                    profile.ensure(user_id, 0, `prism_inv.${item_id}`)
                                    profile.math(user_id, '+', buyAmount, `prism_inv.${item_id}`);
                                    new_inv_qty = profile.get(`${user_id}`, `prism_inv.${item_id}`);
                                break;
                                case 'other_inv': 
                                    profile.ensure(user_id, 0, `other_inv.${item_id}`)
                                    profile.math(user_id, '+', buyAmount, `other_inv.${item_id}`);
                                    new_inv_qty = profile.get(`${user_id}`, `other_inv.${item_id}`);
                                break;
                            }
                            
                            await m.delete().catch(() => {});
                            let followUpMsg;
                                
                            let profile_flags = profile.get(`${user_id}`, 'flags');
                            let shopSelectOptions = await shop_list_from_flags(obj, profile_flags);

                            shopSelectOptions = [...new Set(shopSelectOptions)];

                            shopSelectOptions = shopSelectOptions.map(id => {
                                let item_data = _item_data.get(`${id}`);
                                return { 
                                    label: `${item_data.name} (${profile.get(`${user_id}`, `${item_data.category}.${id}`)}/50) [$${item_data.price}]`,
                                    description: item_data.description_short,
                                    value: `${id}`,
                                    emoji: item_data.emote,
                                }
                            });
        
                            // Setup shop select menu
                            let shopSelectMenu = new ActionRowBuilder()
                            .addComponents(
                                new StringSelectMenuBuilder()
                                    .setCustomId('shop_items')
                                    .setPlaceholder(`Select an item to buy! ($${oochabux})`)
                                    .addOptions(shopSelectOptions),
                            );

                            if (buyAmount != 0) {
                                followUpMsg = await sel.followUp({ content: `Successfully purchased ${buyAmount}x ${item.emote} **${item.name}** from the shop!\nYou now have **${new_inv_qty} ${item.name}${new_inv_qty > 1 ? 's' : ''}** in your inventory.` });
                            } else {
                                followUpMsg = await sel.followUp({ content: `Nothing was purchased.` });
                            }
                            await msg.edit({ content: null, components: [shopSelectMenu, back_button], embeds: [shopEmbed], files: [shopImage] }).catch(() => {});
                            await wait(7000);
                            await followUpMsg.delete().catch(() => {});
                        });
                        
                    } else {
                        let followUpMsg = await sel.reply({ content: `You do not have enough money to purchase a ${item.emote} **${item.name}**.` });
                        msg.edit({ components: [shopSelectMenu, back_button] }).catch(() => {});
                        await wait(5000);
                        await followUpMsg.delete().catch(() => {});
                    }
                });

                shop_collector.on('end', async () => {
                    if (profile.get(`${user_id}`, 'player_state') != PlayerState.Playspace) {
                        profile.set(user_id, PlayerState.Playspace, 'player_state');
                        let playspace_str = await setup_playspace_str(user_id);
                        let play_msg = await thread.send({ content: playspace_str[0], components: playspace_str[1] });
                        profile.set(user_id, play_msg.id, 'display_msg_id')
                        profile.set(user_id, oochabux, 'oochabux')
                        await msg.delete().catch(() => {});
                        shop_collector.stop();
                    }
                });

                return;
            }
        }

        switch (tile.use) {
            case Tile.Board:
                stop_moving = true;
                playerx -= xmove;
                playery -= ymove;
            break;
            case Tile.Wall:
            case Tile.Lava:
                if ((tile.use == Tile.Lava && !player_flags.includes('lavaboard_get')) || tile.use != Tile.Lava) { 
                    stop_moving = true;
                    playerx -= xmove;
                    playery -= ymove;
                }
            break;
            case Tile.Ice:
                if(!stop_moving && (xmove != 0 || ymove != 0)){ //This check prevents infinite loops
                    dist += 1;
                }
            break;
            case Tile.Grass:
                if ((Math.random() <= encounter_chance) && (!stop_moving)) {
                    let spawn_zone, x1,y1,x2,y2;
                    for(let j = 0; j < map_spawns.length; j++){
                        if(stop_moving){ break;}
                        spawn_zone = map_spawns[j];
                        x1 = (spawn_zone.x) <= playerx;
                        y1 = (spawn_zone.y) <= playery;
                        x2 = (spawn_zone.x + spawn_zone.width) + 1 > playerx;
                        y2 = (spawn_zone.y + spawn_zone.height) + 1 > playery;

                        if(x1 && y1 && x2 && y2){
                            stop_moving = true;
                            await update_position(user_id, map_name, playerx, playery, previous_positions);

                            let battle_user_array = []
                            let mons_to_add = [];
                            let mon_count = 1 + profile_data.allies_list.length;
                            for(let m = 0; m < mon_count; m++){
                                let slot_index = Math.floor(random(0, spawn_zone.spawn_slots.length - 1));
                                let slot = spawn_zone.spawn_slots[slot_index];
                                slot.id = slot.ooch_id;
                                slot.level = random(slot.min_level, slot.max_level);

                                if(random(0, 1000) > 999){ //This is the index of _i (the mon that randomly spawns 1/1,000 battles)
                                    let new_slot = {
                                        id : -1,
                                        level : random(slot.min_level, slot.max_level)
                                    }
                                    slot = new_slot;
                                    mons_to_add = [slot]
                                    break;
                                } 
                                else{
                                    mons_to_add.push(slot);
                                }
                            }
                            
                            let mon_level = mons_to_add[0].level;
                            let mon_name = monster_data.get(`${mons_to_add[0].id.toString()}`, 'name');
                            let mon_emote = monster_data.get(`${mons_to_add[0].id.toString()}`, 'emote');

                            // let primary_ooch = profile_data.ooch_party[profile_data.ooch_active_slot];
                            let encounter_buttons = [wild_encounter_buttons];
                            // if (primary_ooch.level >= mon_level + 10) encounter_buttons.push(wild_encounter_instakill_btn);
                            
                            //use mons_to_add .id, .level to setup the encounter
                            await thread.send({ content: `A wild ${mon_emote} ${mon_name} (LV ${mon_level}) appears! Fight or run?`, components: encounter_buttons }).then(async msg =>{
                                await profile.set(user_id, PlayerState.Encounter, 'player_state');
                                wild_encounter_collector = msg.createMessageComponentCollector({max: 1});
                                wild_encounter_collector.on('collect', async sel => {

                                    //Add the user and any allies
                                    for (let ally of profile_data.allies_list) {
                                        ally.team_id = 0;
                                        let user_type = UserType.NPCTrainer;
                                        let trainerObj = await generate_battle_user(user_type, ally);
                                        trainerObj.is_catchable = false;
                                        battle_user_array.push(trainerObj);
                                    }

                                    //Inserts the player first on the list
                                    let userObj = await generate_battle_user(UserType.Player, { user_id: user_id, team_id: 0, thread_id: thread.id, guild_id: thread.guild.id });
                                    battle_user_array.unshift(userObj);
                                    
                                    //Add additional mons
                                    for(let m = 0; m < mons_to_add.length; m++){
                                        let oochObj = await generate_battle_user(UserType.Wild, { id : mons_to_add[m].id.toString(), level : mons_to_add[m].level, team_id : 1})
                                        battle_user_array.push(oochObj)
                                    }

                                    if (sel.customId == 'fight') {
                                        await msg.delete();
                                        await setup_battle(battle_user_array, battle_weather, 0, 0, true, true, true, false, false, map_bg);
                                    } else {
                                        let run_chance = .6;
                                        // If the Oochamon is 10 levels lower or more than our main Oochamon, guarantee run
                                        if (profile_data.ooch_party[profile_data.ooch_active_slot].level >= (mon_level + 10)) run_chance = 1;

                                        if (Math.random() > run_chance) { //40% chance to start the battle if 'Run' is chosen
                                            await setup_battle(battle_user_array, battle_weather, 0, 0, true, true, true, false, false, map_bg);
                                            await msg.delete();
                                        }
                                        else { // If we fail the 60/40, ignore the input*/
                                            profile.set(user_id, PlayerState.Playspace, 'player_state');
                                            await msg.delete();
                                        }
                                    }
                                })
                            })

                        }
                    }
                }
            break;
            default:
                
            break;
        }

        if(x_start != playerx || y_start != playery){
            previous_positions.unshift({x : x_start, y: y_start})
            if(previous_positions.length > 3){ previous_positions.pop(); }
            profile.set(user_id, previous_positions, 'previous_positions')
        }

        //if the player has run into anything that would cause them to stop moving, make them stop
        if(stop_moving){ 
            await update_position(user_id, map_name, playerx, playery, previous_positions);
            break; 
        }
    }


    //Update the player's profile with their new x & y positions
    await update_position(user_id, map_name, playerx, playery, previous_positions);

    // Update player position in the player positions array (don't do this right now)
    //db.player_positions.set(map_name, { x: playerx, y: playery }, user_id);

    let playspace_str = await setup_playspace_str(user_id);
    playspace_str[0] += (repel_ran_out ? `*Your Repulsor ran out of power...*` : ``);
    //Send reply displaying the player's location on the map
    await thread.messages.fetch(msg_to_edit).then((msg) => {
        msg.edit({ content: playspace_str[0], components: playspace_str[1] }).catch((err) => { console.log(`Err: ${err}`)});
    }).catch(async () => {
        await thread.send({ content: playspace_str[0], components: playspace_str[1] }).then(async newMsg => {
            await profile.set(user_id, newMsg.id, 'display_msg_id');
        }).catch((err) => { console.log(`Err 2: ${err}`) });
    });

    if (moveDisable == true) {
        await thread.messages.fetch(msg_to_edit).then(async (msg) => {
            const newComponents = msg.components.map((row) => {
                const newRow = row.toJSON(); 
                newRow.components = newRow.components.map((button) => {
                    button.disabled = true; 
                    return button;
                });
                return newRow;
            });

            await msg.edit({ components: newComponents }).catch(() => {});

        }).catch((err) => { console.log(err) });
    }
}

export function map_emote_string(map_name, map_tiles, x_pos, y_pos, user_id) {

    let player_info = profile.get(`${user_id}`);

    // Window size can either be 5x5 or 7x7 or 7x9
    let window_size = profile.get(`${user_id}`, 'settings.zoom');
    let x_window_size = window_size.split('_')[0];
    let y_window_size = window_size.split('_')[1];
    let x_center = Math.floor(parseInt(x_window_size) / 2);
    let y_center = Math.floor(parseInt(y_window_size) / 2);
    let xx, yy, tile;
    let emote_map = ``;
    //if (window_size === 7) emote_map = `**${map_name}**: ${x_pos}, ${y_pos}\n`;
    let map_obj = maps.get(`${map_name}`);
    let emote_map_array = [];
    let emote_map_array_base = [];
    let player_sprite_id = profile.get(`${user_id}`, 'player_sprite');
    let allies_list = player_info.allies_list;
    let previous_positions = player_info.previous_positions;

    //Plain map tiles
    for (let i = -x_center; i < x_center + 1; i++) {
        emote_map_array[i + x_center] = [];
        emote_map_array_base[i + x_center] = [];
        for (let j = -y_center; j < y_center + 1; j++) {
            //add emote based on tile data to position
            xx = i + x_pos;
            yy = j + y_pos;
            if (xx >= 0 && yy >= 0 && xx < map_tiles.length && yy < map_tiles[0].length) {
                tile = tile_data.get(`${map_tiles[xx][yy].toString()}`);
            }
            else {
                tile = tile_data.get(`${'t00_000'}`)//This is the default tile
            }
            emote_map_array[i + x_center][j + y_center] = tile.emote;
            emote_map_array_base[i + x_center][j + y_center] = tile.emote;
        }
    }

    //NPC tiles
    let player_flags = profile.get(`${user_id}`, 'flags');
    let all_flags = [...player_flags];
    for(let ooch of player_info.ooch_party){
        all_flags.push(`ooch_id_${ooch.id}`)
    }

    let map_npcs = map_obj.map_npcs;
    
    for (let obj of map_npcs) {
        let npc_flag = `${Flags.NPC}${obj.name}${obj.npc_id}`
        xx = obj.x - x_pos + x_center;
        yy = obj.y - y_pos + y_center;
        if ((xx >= 0) && (xx <= x_center * 2) && (yy >= 0) && (yy <= y_center * 2)) {
            if (obj.flag_required == '' || obj.flag_required == false || all_flags.includes(obj.flag_required)) {
                let plr_interacted = all_flags.includes(npc_flag); //check if the player has defeated this npc
                let plain_tile = emote_map_array_base[xx][yy];
                let npcZoneId = parseInt(emote_map_array_base[xx][yy].split(':')[1].split('_')[0].replace('c', '').replace('t', ''));
                tile = tile_data.get(`${obj.sprite_id.slice(0, 1) + obj.sprite_id.slice(3)}`);
                if (tile.use === Tile.Int) npcZoneId = 0;
                emote_map_array[xx][yy] = tile.zone_emote_ids[npcZoneId].emote;

                //NPC has been interacted with/beaten by the player and needs to be removed, we'll remove it here
                if ((plr_interacted && obj.remove_on_finish) || (all_flags.includes(obj.flag_kill))) { 
                    emote_map_array[xx][yy] = plain_tile;
                }
            }
        }
    }

    for(let i = 0; i < allies_list.length; i++){
        if(previous_positions.length <= i){ break; }
        
        let ally = allies_list[i];
        xx = previous_positions[i].x - x_pos + x_center;
        yy = previous_positions[i].y - y_pos + y_center;
        if(xx >= 0 && yy >= 0 && xx < x_window_size && yy < y_window_size){
            let npcZoneId = parseInt(emote_map_array_base[xx][yy].split(':')[1].split('_')[0].replace('c', '').replace('t', ''));
            let tile = tile_data.get(`${ally.sprite_id.slice(0, 1)}` + ally.sprite_id.slice(3));
            if (tile.use === Tile.Int) npcZoneId = 0;
            emote_map_array[xx][yy] = tile.zone_emote_ids[npcZoneId].emote;
        }
    }

    //Savepoint tiles
    let map_savepoints = map_obj.map_savepoints;
    for(let obj of map_savepoints){
        xx = obj.x - x_pos + x_center;
        yy = obj.y - y_pos + y_center;
        if((xx >= 0) && (xx <= x_center * 2) && (yy >= 0) && (yy <= y_center * 2)){
            emote_map_array[xx][yy] = tile_data.get(`${'t00_001'}`, 'emote'); //this is the savepoint tile
        }
    }

    //Put player sprite in center and change it based on the zone ID
    let zoneId = parseInt(emote_map_array_base[x_center][y_center].split(':')[1].replace('t', ''));
    switch (zoneId) {
        case Zone.Global: emote_map_array[x_center][y_center] = tile_data.get(`${'c_023'}`, `zone_emote_ids.0.emote`); break;
        case Zone.Lava: emote_map_array[x_center][y_center] = tile_data.get(`${'c_022'}`, `zone_emote_ids.0.emote`); break;
        default:
            if(parseInt(emote_map_array[x_center][y_center].split(':')[1].replace('t', '')) == Zone.Global){ //check if on a teleporter tile
                emote_map_array[x_center][y_center] = tile_data.get(`${'c_023'}`, `zone_emote_ids.0.emote`);
            } 
            else{
                emote_map_array[x_center][y_center] = tile_data.get(`${player_sprite_id}`, `zone_emote_ids.${zoneId}.emote`);
            }
            
    }
    
    //Flips the X/Y axis of the tile data (necessary because of how we read the map data)
    let transpose = [];
    let w = emote_map_array.length;
    let h = emote_map_array[0].length;
    for(let i = 0; i < h; i++){
        transpose[i] = []
        for(let j = 0; j < w; j++){
            transpose[i][j] = emote_map_array[j][i];
        }
    }
    emote_map_array = transpose;
    

    //Generate the combined string
    for(let i = 0; i < emote_map_array.length; i++){
        for(let j = 0; j < emote_map_array[i].length; j++){
            emote_map += emote_map_array[i][j];
        }
        emote_map += "\n";
    }
    return(emote_map);
}

/**
 * Setup a new playspace window, returns the initial playspace string as well as playspace buttons
 * @param {Number} user_id The user id of the user having a playspace setup.
 */
export async function setup_playspace_str(user_id) {
    const { map_emote_string } = await import('./func_play.js');
    let player_location = profile.get(`${user_id}`, 'location_data');
    let biome = player_location.area;
    let playerx = player_location.x;
    let playery = player_location.y;
    
    if(player_location == false){
        return ["Looks like you never finished the intro, try using `/reset` to start over"];
    }

    //Get the map array based on the player's current biome
    let map_obj = maps.get(`${biome.toLowerCase()}`);
    if (map_obj == undefined) return ['Error, please run /quit', []]
    let map_arr = map_obj.map_tiles; //this should be the actual map array

    // Set player position data into the global multiplayer player position db
    player_positions.set(biome, { x: playerx, y: playery }, user_id);

    let moveBtns = [];
    let spdEmotes = ['<:wlk1:1307858678229110937>', '<:wlk2:1307858664119336982>', '<:wlk3:1307858651297349652>', '<:wlk4:1307858636793577514>'];

    if (profile.get(`${user_id}`, 'settings.discord_move_buttons') === true) {
        const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('play_dist')
                .setEmoji(`${spdEmotes[profile.get(`${user_id}`, 'move_speed')-1]}`)
                .setStyle(ButtonStyle.Secondary),
        ).addComponents(
            new ButtonBuilder()
                .setCustomId('w')
                .setLabel('▲')
                .setStyle(ButtonStyle.Primary),
        ).addComponents(
            new ButtonBuilder()
                .setCustomId('play_menu')
                .setLabel('≡')
                .setStyle(ButtonStyle.Secondary),
        )

        const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('a')
                .setLabel('◀')
                .setStyle(ButtonStyle.Primary),
        ).addComponents(
            new ButtonBuilder()
                .setCustomId('s')
                .setLabel('▼')
                .setStyle(ButtonStyle.Primary),
        ).addComponents(
            new ButtonBuilder()
                .setCustomId('d')
                .setLabel('▶')
                .setStyle(ButtonStyle.Primary),
        )

        moveBtns = [row, row2];
    }

    return [map_emote_string(biome.toLowerCase(), map_arr, playerx, playery, user_id), moveBtns];
}

/**
 * Gives a specific amount of an item to a user.
 * @param {String} user_id The user ID of the user who is receiving this item
 * @param {Number} item_id The ID of the item being given
 * @param {Number} item_count The amount of the item to give.
 */
export function give_item(user_id, item_id, item_count) {
    let item = _item_data.get(`${item_id}`);
    if (profile.get(`${user_id}`, `${item.category}.${item_id}`) != undefined) {
        profile.math(user_id, '+', item_count, `${item.category}.${item_id}`);
    } else {
        profile.set(user_id, item_count, `${item.category}.${item_id}`);
    }
}

/**
 * Create an Oochamon object
 * @param {Number | String} ooch_id The ID of the Oochamon
 * @param {Number} level The level of the Oochamon (default: 5)
 * @param {Array} move_list The list of moves to give the oochamon (default: random)
 * @param {String} nickname The nickname for the Oochamon (default: normal ooch name)
 * @param {Number} cur_exp The amount of starting XP to give it (default: 0)
 * @param {String} ability The ability of the oochamon (default: random)
 * @param {Number} hp_iv Hp IV (default, random calculation)
 * @param {Number} atk_iv Attack IV (default: random calculation)
 * @param {Number} def_iv Defense IV (default: random calculation)
 * @param {Number} spd_iv Speed IV (default: random calculation)
 * @param {Number} held_item ID of the Item for the Oochamon to hold (default: no item) [UNUSED]
 * @returns The oochamon object
 */
export async function create_ooch(ooch_id, level = 5, move_list = [], nickname = false, cur_exp = 0, ability = false, hp_iv = random(0,10), atk_iv = random(0,10),
                        def_iv = random(0,10), spd_iv = random(0,10), held_item = false) {

    const { get_stats, level_up, exp_to_next_level } = await import('./func_battle.js');

    //Fix IV math
    hp_iv = (hp_iv/20) + 1;
    atk_iv = (atk_iv/20) + 1;
    def_iv = (def_iv/20) + 1;
    spd_iv = (spd_iv/20) + 1;

    // Setup ooch_id data
    console.log(`OOCH ID: ` + ooch_id)
    let learn_list = monster_data.get(`${ooch_id}`, 'move_list');
    let ability_list = monster_data.get(`${ooch_id}`, 'abilities');
    if (nickname == false) nickname = monster_data.get(`${ooch_id}`, 'name');

    // Pick a random ability (unless we specify, then force one)
    let rand_ability = ability_list[random(0, ability_list.length - 1)]
    if (ability !== false && ability != 9999) {
        rand_ability = ability;
    }
    
    //Get the stats accounting for the ID, Level, and IVs
    let stats = get_stats(ooch_id, level, hp_iv, atk_iv, def_iv, spd_iv) //Returns [hp, atk, def, spd]

    let ooch_obj = { 
        id: ooch_id,
        name: monster_data.get(`${ooch_id}`, 'name'), 
        nickname: nickname,
        item: held_item,
        ability: rand_ability,
        og_ability: rand_ability,
        level: 0,
        moveset: [],
        stats: {
            hp: stats[0],
            atk: stats[1],
            def: stats[2],
            spd: stats[3],
            hp_iv: hp_iv,
            atk_iv: atk_iv,
            def_iv: def_iv,
            spd_iv: spd_iv,
            atk_mul: 0,
            def_mul: 0,
            spd_mul: 0,
            acc_mul: 0, // Accuracy Multiplier, used for accuracy checks
            eva_mul: 0 // Evasion Multiplier, used for accuracy checks
        },
        status_effects: [],
        current_hp: stats[0],
        current_exp: cur_exp,
        next_lvl_exp: exp_to_next_level(0),
        alive: true,
        evo_stage: monster_data.get(`${ooch_id}`, 'evo_stage'),
        type: monster_data.get(`${ooch_id}`, 'type'),
        og_type: monster_data.get(`${ooch_id}`, 'type'),
        doom_timer: 4, // Used for the doomed status effect
        emote: monster_data.get(`${ooch_id}`, 'emote'),
        og_emote: monster_data.get(`${ooch_id}`, 'emote'),

        stance: StanceForms.Base,
        stance_cooldown: 0,
        
        tame_value: 0,
        tame_treat_cooldown: 0,
        tame_pet_cooldown: 0,
        tame_walk_cooldown: 0,
        tame_play_cooldown: 0
        
    }

    //Level up the ooch until its at the appropriate level
    while(ooch_obj.level < level){
        ooch_obj.current_exp = exp_to_next_level(ooch_obj.level);
        let leveled_ooch = level_up(ooch_obj);
        ooch_obj = leveled_ooch[0];
    }

    //Find what moves the mon should know
    if (move_list.length == 0) {
        learn_list = learn_list.filter(x => x[0] <= level && x[0] != -1)
        for(let i = 0; i < learn_list.length; i++){
            move_list[i] = learn_list[i][1];
        }

        // Make sure the move_list is 4 moves
        while (move_list.length > 4) {
            let rand_move_pos = random(0, move_list.length)
            move_list.splice(rand_move_pos, 1);
        }
    }

    ooch_obj.moveset = move_list

    return(ooch_obj)
}

export async function box_collector_event(user_id, selected, page_num, user_profile, battle_box=false) {
    let bottom_buttons = battle_box ? box_battle_buttons : box_buttons;

    if (selected.customId == 'box_oochabox') {  
        box_row = buildBoxData(user_profile, page_num);
        selected.update({ content: `**Oochabox:**`,  components: [box_row[0], box_row[1], box_row[2], box_row[3], bottom_buttons], files: [] });
    } else if (selected.customId == 'back_to_box') {
        box_row = buildBoxData(user_profile, page_num);
        selected.update({ content: `**Oochabox**`, embeds: [], files: [], components: [box_row[0], box_row[1], box_row[2], box_row[3], bottom_buttons] });
    } 
    
    // Back to save (exit)
    else if (selected.customId == 'box_back_to_save') {
        profile.set(user_id, user_profile);
        let options = [confirm_buttons_tp];

        if (user_profile.areas_visited.length > 0 && user_profile.flags.includes('teleport_enable')) { 
        teleport_menu = new ActionRowBuilder();
            let teleport_select_options = user_profile.areas_visited.map(name => 
                {
                    let map_data = maps.get(`${name}`);
                    return { 
                        label: `${map_data.map_info.map_name}`,
                        value: `${name}`
                    }
                });

            teleport_menu.addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('teleport_menu')
                    .setPlaceholder(`Teleport To Visited Area`)
                    .addOptions(teleport_select_options),
            );

            options.push(teleport_menu);
        }

        selected.update({ content: `## Checkpoint`, components: options });
    } 

    // Finalize team for box in pvp
    else if (selected.customId == 'box_finalize_team') {
        return true;
    } 

    // Label buttons
    else if (selected.customId.includes('box_emp') || selected.customId.includes('box_label')) {
        selected.update({ content: `**Oochabox**`, files: [] });
    }

    // Oochamon in Box View
    else if (selected.customId.includes('box_ooch')) {
        let slot_data = selected.customId.split('_');
        slot_num = slot_data[3];
        let party_slot = false;
        if (selected.customId.includes('_party')) party_slot = true;

        if (party_slot == false) {
            ooch_user_data = user_profile.ooch_pc[slot_num]; // Personal Oochamon Data in Oochabox
        } else {
            ooch_user_data = user_profile.ooch_party[slot_num]; // Personal Oochamon Data in Party
        }

        // Disable the "add to box" button if we only have one party member.
        box_party_sel_buttons.components[1].setDisabled((user_profile.ooch_party.length == 1))
        // Disable the "add to party" button if we have 4 party members.
        box_sel_buttons.components[1].setDisabled((user_profile.ooch_party.length == 4))

        let dexEmbed = await ooch_info_embed(ooch_user_data, user_id);
        let dexPng = dexEmbed[1];
        dexEmbed = dexEmbed[0];

        selected.update({ content: null, embeds: [dexEmbed], files: [dexPng], components: [party_slot == false ? box_sel_buttons : box_party_sel_buttons] });
    }
    // Add Oochamon to Box
    else if (selected.customId == 'box_add_to_box') {
        bottom_buttons.components[3].setLabel(`${page_num+1}`);

        // Put the specified oochamon into the box.
        user_profile.ooch_pc.push(ooch_user_data);
        user_profile.ooch_party.splice(slot_num, 1);
        // Build new PC button rows
        box_row = buildBoxData(user_profile, page_num);
        // Kick back to PC screen
        selected.update({ content: `**Oochabox**`, embeds: [],  components: [box_row[0], box_row[1], box_row[2], box_row[3], bottom_buttons], files: [] });
    } 
    // Add Oochamon to team
    else if (selected.customId == 'box_add_ooch') {
        bottom_buttons.components[3].setLabel(`${page_num+1}`);

        // Put the specified oochamon into our team
        user_profile.ooch_party.push(ooch_user_data);
        user_profile.ooch_pc.splice(slot_num, 1);
        // Build new PC button rows
        box_row = buildBoxData(user_profile, page_num);
        // Kick back to PC screen
        selected.update({ content: `**Oochabox**`, embeds: [],  components: [box_row[0], box_row[1], box_row[2], box_row[3], bottom_buttons], files: [] });
    
    }
    // Release an Oochamon
    else if (selected.customId == 'box_release') {
        await selected.update({ content: `**Are you sure you want to release this Oochamon?**`, embeds: [],  components: [box_confirm_buttons], files: [] });
    }
    // Confirm to release an Oochamon
    else if (selected.customId == 'box_yes') {
        bottom_buttons.components[3].setLabel(`${page_num+1}`);

        user_profile.ooch_pc.splice(slot_num, 1);
        // Build new PC button rows
        box_row = buildBoxData(user_profile, page_num);
        // Kick back to PC screen
        selected.update({ content: `**Oochabox**`, embeds: [],  components: [box_row[0], box_row[1], box_row[2], box_row[3], bottom_buttons], files: [] });
    }
    // Confirm to not release an Oochamon
    else if (selected.customId == 'box_no') {
        bottom_buttons.components[3].setLabel(`${page_num+1}`);

        selected.update({ content: `**Oochabox**`, embeds: [],  components: [box_row[0], box_row[1], box_row[2], box_row[3], bottom_buttons], files: [] });
    }
    
    return false;
}

export async function shop_list_from_flags(shop_obj, profile_flags){
    let shopBuildOptions = [
        //Potions
        [Item.Potion,           false], //Potion
        [Item.HiPotion,         'to_lava_town_begin'], //Med Potion
        [Item.MaxPotion,        'PLACEHOLDER'], //Hi Potion

        //Prisms
        [Item.Prism,            false], //Prism
        [Item.GreaterPrism,     'to_lava_town_begin'], //Greater Prism
        [Item.GrandPrism,       'PLACEHOLDER'], //Grand Prism

        //Other
        [Item.Repulsor,         'to_lava_town_begin'], // Repulsor
        [Item.Teleporter,       'to_lava_town_begin'], // Emergency Teleporter


        //Status Clear
        [Item.Eyedrops,         'cromet_quest_end'], //Eyedrops
        [Item.Shears,           'cromet_quest_end'], //Shears
        [Item.Daylily,          'cromet_quest_end'], //Daylily
        [Item.Antiparasite,     'cromet_quest_end'], //Antiparasite
        [Item.DebugChip,        'cromet_quest_end'], //Debug Chip
        [Item.CoolingBalm,      'cromet_quest_end'], //Cooling Balm

        //Evolution Items
        [Item.SporeFeather,     'obtained_sporefeather'],
    ];
        
    let shopSelectOptions = [];
    if (shop_obj.special_items.length != 0) shopSelectOptions.push(shop_obj.special_items);
    if (shop_obj.type == 'default' || shop_obj.type == null) {
        for(let shopOption of shopBuildOptions){
            if(profile_flags.includes(shopOption[1]) || shopOption[1] === false){
                shopSelectOptions.push(shopOption[0]);
            }
        }
    }

    shopSelectOptions = shopSelectOptions.flat(1)

    return(shopSelectOptions);
}