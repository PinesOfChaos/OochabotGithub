const db = require("./db")
const { Flags, PlayerState, Tile, Zone, ItemType, UserType, Weather, Item, StanceForms } = require('./types.js');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, AttachmentBuilder, EmbedBuilder } = require('discord.js');
const wait = require('wait');
const _ = require('lodash');
const { event_process, event_from_npc } = require('./func_event');
const { buildBoxData, ooch_info_embed } = require("./func_other.js");

let pages = 9, slot_num, ooch_user_data, box_row;

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

let confirm_buttons = new ActionRowBuilder()
    .addComponents(
        new ButtonBuilder().setCustomId('yes').setLabel('Yes').setStyle(ButtonStyle.Success),
    ).addComponents(
        new ButtonBuilder().setCustomId('no').setLabel('No').setStyle(ButtonStyle.Danger),
    );

let oochabox_button = new ActionRowBuilder()
    .addComponents(
        new ButtonBuilder().setCustomId('box_oochabox').setLabel('Oochabox').setEmoji('🎒').setStyle(ButtonStyle.Primary),
    )

let wild_encounter_buttons = new ActionRowBuilder()
    .addComponents(
        new ButtonBuilder().setCustomId('fight').setLabel('Fight').setStyle(ButtonStyle.Success).setEmoji('⚔️'),
    ).addComponents(
        new ButtonBuilder().setCustomId('run').setLabel('Run').setStyle(ButtonStyle.Danger).setEmoji('🏃‍♂️'),
    );

let back_button = new ActionRowBuilder()
    .addComponents(
        new ButtonBuilder().setCustomId('back').setLabel('Back').setStyle(ButtonStyle.Danger),
    );

let qty_back_button = new ActionRowBuilder()
    .addComponents(
        new ButtonBuilder().setCustomId('quantity_back').setLabel('Cancel Purchase').setStyle(ButtonStyle.Danger),
    );

functions = {

    get_map_weather: function(map_weather, location_data) {
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
        
        return weather_options.length > 0 ? _.sample(weather_options) : Weather.None
    },

    move: async function(thread, user_id, direction, dist = 1, encounter_chance = false) {
        /*
            db.player_positions.set(user_id, interaction.member.displayName, 'player_name');
        */
        const { generate_wild_battle, setup_battle, level_up, exp_to_next_level, generate_battle_user } = require("./func_battle.js");

        let checkPlrState = db.profile.get(user_id, 'player_state')
        if (checkPlrState !== PlayerState.Playspace) {
            return;
        }

        let xmove = 0;
        let ymove = 0;
        let profile_data = await db.profile.get(user_id);
        let msg_to_edit = profile_data.display_msg_id;
        let profile_arr = db.profile.keyArray();
        let confirm_collector;
        let wild_encounter_collector;
        let shop_collector;
        let item_qty_collector;
            
        profile_arr = profile_arr.filter(val => val != user_id);
        
        // Max limit of 4 tiles that you can move at once
        dist = _.clamp(dist, 0, 4);
        
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

        let allies = profile_data.allies_list;
        let previous_positions = profile_data.previous_positions;


        //Get the map array based on the player's current map
        let map_obj =   db.maps.get(map_name.toLowerCase());
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

        battle_weather = functions.get_map_weather(map_weather, player_location);
        
        //set where the player is going to move
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
        
        for(let i = 0; i < dist; i++){
            let x_start = playerx;
            let y_start = playery;
            
            if(stop_moving){ break; }
            playerx += xmove;
            playery += ymove;
            if (profile_data.repel_steps != 0) {
                db.profile.math(user_id, '-', 1, 'repel_steps');
                profile_data.repel_steps -= 1;
                if (profile_data.repel_steps == 0) repel_ran_out = true;
            } 

            let tile_id = map_tiles[playerx][playery]
            var tile = db.tile_data.get(tile_id.toString());
            // 10% chance on cave, 40% chance on other places
            if (encounter_chance === false) {
                encounter_chance = tile.zone_id == Zone.Cave ? .10 : .40;
                if (profile_data.repel_steps != 0) encounter_chance = 0;
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

                            if (map_npcs.some((element) => element.x == playerx && element.y == playery)) {
                                playerx -= xmove;
                                playery -= ymove;
                            }

                            stop_moving = true;
                            //moveDisable = true; to do we need to update the buttons *during* the event, this doesn't disable them until after it
                            await event_process(user_id, thread, db.events_data.get(obj.event_name), 0, obj.event_name);

                            //updat the profile information as it has likely changed since the event_process
                            profile_data = await db.profile.get(user_id); 
                            player_location = profile_data.location_data;
                            map_name = player_location.area;
                            px = player_location.x;
                            py = player_location.y;
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
                                _xx = Math.round(_.clamp(obj.x + (_vx * j), 0, 99));
                                _yy = Math.round(_.clamp(obj.y + (_vy * j), 0, 99));
                                _t = db.tile_data.get(map_tiles[_xx][_yy]);

                                if(!(_t.use == Tile.Floor || _t.use == Tile.Grass)){ //If the tile type checked is not floor or grass
                                    break;
                                }
                                else if(_xx == playerx &&  _yy == playery){ //If this is a tile that the npc can see, stop the player
                                    stop_moving = true;
                                    stop_check = true;
                                    
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
                        map_obj =   db.maps.get(map_name.toLowerCase());
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
                    if(obj.x == playerx && obj.y == playery){
                        //prompt the player 
                        stop_moving = true;
                        moveDisable = true;
                        let page_num = 0;
                        let pages = 9;

                        thread.send({ content: `Would you like to heal your Oochamon and set a checkpoint here?\n*You can access your box here as well.*`, components: [confirm_buttons, oochabox_button] }).then(async msg => {
                            db.profile.set(user_id, PlayerState.Encounter, 'player_state');
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
                                    functions.box_collector_event(user_id, selected, page_num, profile_data)
                                } 
                                
                                else if (selected.customId == 'yes') {
                                    db.profile.set(user_id, { area: map_name, x: obj.x, y: obj.y }, 'checkpoint_data');
                                    for (let i = 0; i < db.profile.get(user_id, 'ooch_party').length; i++) {
                                        db.profile.set(user_id, db.profile.get(user_id, `ooch_party[${i}].stats.hp`), `ooch_party[${i}].current_hp`);
                                        db.profile.set(user_id, true, `ooch_party[${i}].alive`);
                                    }
                                    db.profile.set(user_id, PlayerState.Playspace, 'player_state');
                                    let playspace_str = functions.setup_playspace_str(user_id);
                                    await thread.messages.fetch(msg_to_edit).then((msg) => {
                                        msg.edit({ content: playspace_str[0], components: playspace_str[1] }).catch(() => {});
                                    });
                                    await selected.update({ content: 'Set a checkpoint and healed all your Oochamon.', components: [] });
                                    await wait(5000);
                                    await msg.delete().catch(() => {});
                                    await confirm_collector.stop();
                                } else {
                                    db.profile.set(user_id, PlayerState.Playspace, 'player_state');
                                    await msg.delete().catch(() => {});
                                    await confirm_collector.stop();
                                    let playspace_str = functions.setup_playspace_str(user_id);
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
                    db.profile.set(user_id, PlayerState.Shop, 'player_state');

                    let profile_flags = db.profile.get(user_id, 'flags');
                    let shopSelectOptions = await functions.shop_list_from_flags(obj, profile_flags)

                    shopSelectOptions = shopSelectOptions.flat(1);
                    shopSelectOptions = [...new Set(shopSelectOptions)];
                    shopSelectOptions = shopSelectOptions.map(id => {
                        let item_data = db.item_data.get(id);
                        let item_amount = db.profile.get(user_id, `${item_data.category}.${id}`);
                        if (item_amount == undefined) item_amount = 0;
                        return { 
                            label: `${item_data.name} (${item_amount}/50) [$${item_data.price}]`,
                            description: item_data.description_short,
                            value: `${id}`,
                            emoji: item_data.emote,
                        }
                    });

                    let oochabux = db.profile.get(user_id, 'oochabux');

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
                    let playspace_msg = await thread.messages.fetch(db.profile.get(user_id, 'display_msg_id')).catch(() => {});
                    if (playspace_msg !== undefined) {
                        await playspace_msg.delete().catch(() => {});
                    }

                    shop_collector = await thread.createMessageComponentCollector({ time: 600000 });
                    shop_collector.on('collect', async sel => {
                        let oochabux = db.profile.get(user_id, 'oochabux');
                        if (sel.customId == 'back') {
                            db.profile.set(user_id, PlayerState.Playspace, 'player_state');
                            let playspace_str = functions.setup_playspace_str(user_id);
                            let play_msg = await thread.send({ content: playspace_str[0], components: playspace_str[1] });
                            db.profile.set(user_id, play_msg.id, 'display_msg_id')
                            db.profile.set(user_id, oochabux, 'oochabux')
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
                        let item = db.item_data.get(item_id);
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

                            db.profile.ensure(user_id, 0, `${item.category}.${item_id}`);
                            let amtHeld = db.profile.get(user_id, `${item.category}.${item_id}`); 
                            if (amtHeld < 0) {
                                db.profile.set(user_id, 0, `${item.category}.${item_id}`);
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
                                db.profile.set(user_id, oochabux, 'oochabux')
                                switch (item.category) {
                                    case 'heal_inv': 
                                        db.profile.ensure(user_id, 0, `heal_inv.${item_id}`)
                                        db.profile.math(user_id, '+', buyAmount, `heal_inv.${item_id}`);
                                        new_inv_qty = db.profile.get(user_id, `heal_inv.${item_id}`);
                                    break;
                                    case 'prism_inv': 
                                        db.profile.ensure(user_id, 0, `prism_inv.${item_id}`)
                                        db.profile.math(user_id, '+', buyAmount, `prism_inv.${item_id}`);
                                        new_inv_qty = db.profile.get(user_id, `prism_inv.${item_id}`);
                                    break;
                                    case 'other_inv': 
                                        db.profile.ensure(user_id, 0, `other_inv.${item_id}`)
                                        db.profile.math(user_id, '+', buyAmount, `other_inv.${item_id}`);
                                        new_inv_qty = db.profile.get(user_id, `other_inv.${item_id}`);
                                    break;
                                }
                                
                                await m.delete().catch(() => {});
                                let followUpMsg;
                                    
                                let profile_flags = db.profile.get(user_id, 'flags');
                                let shopSelectOptions = await functions.shop_list_from_flags(obj, profile_flags);

                                shopSelectOptions = [...new Set(shopSelectOptions)];

                                shopSelectOptions = shopSelectOptions.map(id => {
                                    let item_data = db.item_data.get(id);
                                    return { 
                                        label: `${item_data.name} (${db.profile.get(user_id, `${item_data.category}.${id}`)}/50) [$${item_data.price}]`,
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
                        if (db.profile.get(user_id, 'player_state') != PlayerState.Playspace) {
                            db.profile.set(user_id, PlayerState.Playspace, 'player_state');
                            let playspace_str = functions.setup_playspace_str(user_id);
                            let play_msg = await thread.send({ content: playspace_str[0], components: playspace_str[1] });
                            db.profile.set(user_id, play_msg.id, 'display_msg_id')
                            db.profile.set(user_id, oochabux, 'oochabux')
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
                                
                                let battle_user_array = []
                                let mons_to_add = [];
                                let mon_count = 1 + profile_data.allies_list.length;
                                for(let m = 0; m < mon_count; m++){
                                    let slot_index = Math.floor(_.random(0, spawn_zone.spawn_slots.length - 1));
                                    let slot = spawn_zone.spawn_slots[slot_index];

                                    if(_.random(0, 1000) > 999){ //This is the index of _i (the mon that randomly spawns 1/1,000 battles)
                                        let new_slot = {
                                            ooch_id : -1,
                                            min_level : slot.min_level,
                                            max_level : slot.max_level,
                                        }
                                        slot = new_slot;
                                        mons_to_add = [slot]
                                        break;
                                    } 
                                    else{
                                        mons_to_add.push(slot);
                                    }
                                }
                                
                                let mon_level = _.random(mons_to_add[0].min_level, mons_to_add[0].max_level);
                                let mon_name = db.monster_data.get(mons_to_add[0].ooch_id.toString(), 'name');
                                let mon_emote = db.monster_data.get(mons_to_add[0].ooch_id.toString(), 'emote');
                                
                                //use mons_to_add .ooch_id, .min_level, .max_level to setup the encounter
                                await thread.send({ content: `A wild ${mon_emote} ${mon_name} (LV ${mon_level}) appears! Fight or run?`, components: [wild_encounter_buttons]}).then(async msg =>{
                                    await db.profile.set(user_id, PlayerState.Encounter, 'player_state');
                                    wild_encounter_collector = msg.createMessageComponentCollector({max: 1});
                                    wild_encounter_collector.on('collect', async sel => {

                                        //Add the user and any allies
                                        for (let ally of profile_data.allies_list) {
                                            ally.team_id = 0;
                                            let user_type = UserType.NPCTrainer;
                                            let trainerObj = await generate_battle_user(user_type, ally);
                                            battle_user_array.push(trainerObj);
                                        }

                                        //Inserts the player first on the list
                                        let userObj = await generate_battle_user(UserType.Player, { user_id: user_id, team_id: 0, thread_id: thread.id, guild_id: thread.guild.id });
                                        battle_user_array.unshift(userObj);
                                        
                                        //Add additional mons
                                        for(let m = 0; m < mons_to_add.length; m++){
                                            mon_level = _.random(mons_to_add[m].min_level, mons_to_add[m].max_level);
                                            oochObj = await generate_battle_user(UserType.Wild, {ooch_id : mons_to_add[m].ooch_id.toString(), ooch_level : mon_level, team_id : 1})
                                            battle_user_array.push(oochObj)
                                        }

                                        if (sel.customId == 'fight') {
                                            await msg.delete();
                                            await setup_battle(battle_user_array, battle_weather, 0, 0, true, true, true, false, false, map_bg);
                                        }
                                        else {
                                            let run_chance = .6;
                                            // If the Oochamon is 10 levels lower or more than our main Oochamon, guarantee run
                                            if (profile_data.ooch_party[profile_data.ooch_active_slot].level >= (mon_level + 10)) run_chance = 1;

                                            if (Math.random() > run_chance) { //40% chance to start the battle if 'Run' is chosen
                                                await setup_battle(battle_user_array, battle_weather, 0, 0, true, true, true, false, false, map_bg);
                                                await msg.delete();
                                            }
                                            else { // If we fail the 60/40, ignore the input*/
                                                db.profile.set(user_id, PlayerState.Playspace, 'player_state');
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
                db.profile.set(user_id, previous_positions, 'previous_positions')
            }

            //if the player has run into anything that would cause them to stop moving, make them stop
            if(stop_moving){ break; }
        }

        //Update the player's profile with their new x & y positions
        db.profile.set(user_id, { area: map_name, x: playerx, y: playery }, 'location_data');
        db.profile.set(user_id, previous_positions, 'previous_positions')

        // Update player position
        db.player_positions.set(map_name, { x: playerx, y: playery }, user_id);

        let playspace_str = functions.setup_playspace_str(user_id);
        playspace_str[0] += (repel_ran_out ? `*Your Repulsor ran out of power...*` : ``);
        //Send reply displaying the player's location on the map
        await thread.messages.fetch(msg_to_edit).then((msg) => {
            msg.edit({ content: playspace_str[0], components: playspace_str[1] }).catch((err) => { console.log(`Err: ${err}`)});
        }).catch(async () => {
            await thread.send({ content: playspace_str[0], components: playspace_str[1] }).then(async newMsg => {
                await db.profile.set(user_id, newMsg.id, 'display_msg_id');
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

    },

    map_emote_string: function(map_name, map_tiles, x_pos, y_pos, user_id) {

        let player_info = db.profile.get(user_id);

        // Window size can either be 5x5 or 7x7 or 7x9
        let window_size = db.profile.get(user_id, 'settings.zoom');
        let x_window_size = window_size.split('_')[0];
        let y_window_size = window_size.split('_')[1];
        let x_center = Math.floor(parseInt(x_window_size) / 2);
        let y_center = Math.floor(parseInt(y_window_size) / 2);
        let xx, yy, tile;
        let emote_map = ``;
        //if (window_size === 7) emote_map = `**${map_name}**: ${x_pos}, ${y_pos}\n`;
        let map_obj = db.maps.get(map_name);
        let emote_map_array = [];
        let emote_map_array_base = [];
        let player_sprite_id = db.profile.get(user_id, 'player_sprite');
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
                    tile = db.tile_data.get(map_tiles[xx][yy].toString());
                }
                else {
                    tile = db.tile_data.get('t00_000')//This is the default tile
                }
                emote_map_array[i + x_center][j + y_center] = tile.emote;
                emote_map_array_base[i + x_center][j + y_center] = tile.emote;
            }
        }

        //NPC tiles
        let player_flags = db.profile.get(user_id, 'flags');
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
                    tile = db.tile_data.get(obj.sprite_id.slice(0, 1) + obj.sprite_id.slice(3));
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
            
            let npcZoneId = parseInt(emote_map_array_base[xx][yy].split(':')[1].split('_')[0].replace('c', '').replace('t', ''));
            let tile = db.tile_data.get(ally.sprite_id.slice(0, 1) + ally.sprite_id.slice(3));
            if (tile.use === Tile.Int) npcZoneId = 0;
            emote_map_array[xx][yy] = tile.zone_emote_ids[npcZoneId].emote;
        }

        //Savepoint tiles
        let map_savepoints = map_obj.map_savepoints;
        for(let obj of map_savepoints){
            xx = obj.x - x_pos + x_center;
            yy = obj.y - y_pos + y_center;
            if((xx >= 0) && (xx <= x_center * 2) && (yy >= 0) && (yy <= y_center * 2)){
                emote_map_array[xx][yy] = db.tile_data.get('t00_001', 'emote'); //this is the savepoint tile
            }
        }

        //Put player sprite in center and change it based on the zone ID
        let zoneId = parseInt(emote_map_array[x_center][y_center].split(':')[1].replace('t', ''));
        switch (zoneId) {
            case Zone.Global: emote_map_array[x_center][y_center] = db.tile_data.get('c_023', `zone_emote_ids.0.emote`); break;
            case Zone.Lava: emote_map_array[x_center][y_center] = db.tile_data.get('c_022', `zone_emote_ids.0.emote`); break;
            default: emote_map_array[x_center][y_center] = db.tile_data.get(player_sprite_id, `zone_emote_ids.${zoneId}.emote`);
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
    },

    /**
     * Setup a new playspace window, returns the initial playspace string as well as playspace buttons
     * @param {Number} user_id The user id of the user having a playspace setup.
     */
    setup_playspace_str: function(user_id) {
        const { map_emote_string } = require('./func_play.js');
        let player_info = db.profile.get(user_id)
        let player_location = db.profile.get(user_id, 'location_data');
        let biome = player_location.area;
        let playerx = player_location.x;
        let playery = player_location.y;
        
        if(player_location == false){
            return ["Looks like you never finished the intro, try using `/reset` to start over"];
        }

        //Get the map array based on the player's current biome
        let map_obj = db.maps.get(biome.toLowerCase());
        let map_arr = map_obj.map_tiles; //this should be the actual map array

        // Set player position data into the global multiplayer player position db
        db.player_positions.set(biome, { x: playerx, y: playery }, user_id);

        let moveBtns = [];
        let spdEmotes = ['<:wlk1:1307858678229110937>', '<:wlk2:1307858664119336982>', '<:wlk3:1307858651297349652>', '<:wlk4:1307858636793577514>'];

        if (db.profile.get(user_id, 'settings.discord_move_buttons') === true) {
            const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('play_dist')
                    .setEmoji(`${spdEmotes[db.profile.get(user_id, 'move_speed')-1]}`)
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
    },

    /**
     * Gives a specific amount of an item to a user.
     * @param {String} user_id The user ID of the user who is receiving this item
     * @param {Number} item_id The ID of the item being given
     * @param {Number} item_count The amount of the item to give.
     */
    give_item: function(user_id, item_id, item_count) {
        let item = db.item_data.get(item_id);
        if (db.profile.get(user_id, `${item.category}.${item_id}`) != undefined) {
            db.profile.math(user_id, '+', item_count, `${item.category}.${item_id}`);
        } else {
            db.profile.set(user_id, item_count, `${item.category}.${item_id}`);
        }
    },

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
    create_ooch: function(ooch_id, level = 5, move_list = [], nickname = false, cur_exp = 0, ability = false, hp_iv = _.random(0,10), atk_iv = _.random(0,10),
                            def_iv = _.random(0,10), spd_iv = _.random(0,10), held_item = false) {

        const { get_stats, level_up, exp_to_next_level } = require('./func_battle');
  
        //Fix IV math
        hp_iv = (hp_iv/20) + 1;
        atk_iv = (atk_iv/20) + 1;
        def_iv = (def_iv/20) + 1;
        spd_iv = (spd_iv/20) + 1;

        // Setup ooch_id data
        let learn_list = db.monster_data.get(ooch_id, 'move_list');
        let ability_list = db.monster_data.get(ooch_id, 'abilities');
        if (nickname == false) nickname = db.monster_data.get(ooch_id, 'name');

        // Pick a random ability (unless we specify, then force one)
        let rand_ability = ability_list[_.random(0, ability_list.length - 1)]
        if (ability !== false && ability != 9999) {
            rand_ability = ability;
        }
        
        //Get the stats accounting for the ID, Level, and IVs
        let stats = get_stats(ooch_id, level, hp_iv, atk_iv, def_iv, spd_iv) //Returns [hp, atk, def, spd]

        let ooch_obj = { 
            id: ooch_id,
            name: db.monster_data.get(ooch_id, 'name'), 
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
            current_hp: stats[0],
            alive: true,
            evo_stage: db.monster_data.get(ooch_id, 'evo_stage'),
            type: db.monster_data.get(ooch_id, 'type'),
            og_type: db.monster_data.get(ooch_id, 'type'),
            doom_timer: 4, // Used for the doomed status effect
            emote: db.monster_data.get(ooch_id, 'emote'),

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
                let rand_move_pos = _.random(0, move_list.length)
                move_list.splice(rand_move_pos, 1);
            }
        }

        ooch_obj.moveset = move_list

        return(ooch_obj)
    },

    box_collector_event: async function(user_id, selected, page_num, user_profile, battle_box=false) {
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
            db.profile.set(user_id, user_profile);
            selected.update({ content: `Would you like to heal your Oochamon and set a checkpoint here?\n*You can access your box here as well.*`, components: [confirm_buttons, oochabox_button] });
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

            dexEmbed = ooch_info_embed(ooch_user_data, user_id);
            dexPng = dexEmbed[1];
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
    },

    shop_list_from_flags : async function(shop_obj, profile_flags){
        let shopBuildOptions = [
            //Potions
            [Item.Potion,           false], //Potion
            [Item.HiPotion,         'to_lava_town_begin'], //Med Potion
            [Item.MaxPotion,        'PLACEHOLDER'], //Hi Potion

            //Prisms
            [Item.Prism,            false], //Prism
            [Item.GreaterPrism,     'to_lava_town_begin'], //Greater Prism
            [Item.GrandPrism,       'PLACEHOLDER'], //Grand Prism

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

}

module.exports = functions;