const db = require("./db")
const { Flags, PlayerState, Tile, Zone, ItemType } = require('./types.js');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, AttachmentBuilder } = require('discord.js');
const wait = require('wait');
const _ = require('lodash');
const { event_process, event_from_npc } = require('./func_event');


module.exports = {

    move: async function(thread, user_id, direction, dist = 1) {
        /*
            db.player_positions.set(interaction.user.id, interaction.member.displayName, 'player_name');
        */

        const { map_emote_string, setup_playspace_str } = require('./func_play.js');
        const { generate_wild_battle, setup_battle, level_up, exp_to_next_level } = require("./func_battle");

        let checkPlrState = db.profile.get(user_id, 'player_state')
        if (checkPlrState !== PlayerState.Playspace) {
            return;
        }

        let xmove = 0;
        let ymove = 0;
        let profile_data = await db.profile.get(user_id);
        let msg_to_edit = profile_data.display_msg_id;
        let profile_arr = db.profile.keyArray();
        let confirm_buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId('yes').setLabel('Yes').setStyle(ButtonStyle.Success),
            ).addComponents(
                new ButtonBuilder().setCustomId('no').setLabel('No').setStyle(ButtonStyle.Danger),
            );
        let confirm_collector;

        let wild_encounter_buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId('fight').setLabel('Fight').setStyle(ButtonStyle.Success).setEmoji('⚔️'),
            ).addComponents(
                new ButtonBuilder().setCustomId('run').setLabel('Run').setStyle(ButtonStyle.Danger).setEmoji('🏃‍♂️'),
            );
        let wild_encounter_collector;

        let back_button = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId('back').setLabel('Back').setStyle(ButtonStyle.Danger),
            );
        let shop_collector;

        let qty_back_button = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId('quantity_back').setLabel('Back').setStyle(ButtonStyle.Danger),
            );
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
        let moveDisable = false;
        let repel_ran_out = false;

        //Get the map array based on the player's current map
        let map_obj =   db.maps.get(map_name.toLowerCase());
        let map_tiles =         map_obj.map_tiles; 
        let map_npcs =          map_obj.map_npcs;
        let map_spawns =        map_obj.map_spawn_zones;
        let map_savepoints =    map_obj.map_savepoints;
        let map_transitions =   map_obj.map_transitions;
        let map_events =        map_obj.map_events;
        let map_shops =         map_obj.map_shops;
        if (map_shops == undefined || map_shops == null) map_shops = [];        
        
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
            let encounter_chance = tile.zone_id == Zone.Cave ? .10 : .40;
            if (profile_data.repel_steps != 0) encounter_chance = 0;

            //Events
            if (!stop_moving) {
                let x1,y1,x2,y2;
                for (let obj of map_events) {
                    x1 = (obj.x) <= playerx;
                    y1 = (obj.y) <= playery;
                    x2 = (obj.x + obj.width) >= playerx;
                    y2 = (obj.y + obj.height) >= playery;
                    if (x1 && y1 && x2 && y2) {
                        if ((obj.flag_required == false || player_flags.includes(obj.flag_required)) && !player_flags.includes(obj.event_name)) {
                            stop_moving = true;
                            await event_process(user_id, thread, db.events_data.get(obj.event_name), 0, obj.event_name);
                        }
                    }
                }
            }

            //NPCs
            if(!stop_moving){
                for(let obj of map_npcs){
                    let npc_flag = `${Flags.NPC}${obj.name}${obj.npc_id}`
                    //Skip NPCs if they meet any of these conditions
                    if( (player_flags.includes(obj.flag_kill)) || //The player has the NPC's kill flag
                        (obj.flag_required != "" && !player_flags.includes(obj.flag_required)) || //The NPC requres a flag, and the player does not have that flag
                        (obj.remove_on_finish && player_flags.includes(npc_flag))){ continue; } //The NPC gets removed on finish, and the player has the NPC's personal flag
                    if(stop_moving){ break; } //Stop searching if the player no-longer should be moving
                    
                    
                    if(obj.x == playerx && obj.y == playery){ //Check if player collides with this NPC's position
                        stop_moving = true;
                        playerx -= xmove;
                        playery -= ymove;
                        
                        event_process(user_id, thread, event_from_npc(obj, user_id));
                    }
                    else if ((obj.team.length > 0) && (!player_flags.includes(npc_flag))) { //Check line-of sight if the NPC has a team and the NPC hasn't been encountered
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
                                    
                                    event_process(user_id, thread, event_from_npc(obj, user_id));
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
                        if (map_shops == undefined || map_shops == null) map_shops = [];        
                    }
                }
            }

            //Save Points
            if(!stop_moving){
                for(let obj of map_savepoints){
                    if(obj.x == playerx && obj.y == playery){
                        //prompt the player 
                        stop_moving = true;
                        moveDisable = true;

                        thread.send({ content: `Would you like to heal your Oochamon and set a checkpoint here?\n*You can access your box here as well by opening the menu and selecting Oochabox.*`, components: [confirm_buttons] }).then(async msg => {
                            db.profile.set(user_id, PlayerState.Encounter, 'player_state');
                            confirm_collector = msg.createMessageComponentCollector({ max: 1 });
                            confirm_collector.on('collect', async sel => {
                                if (sel.customId == 'yes') {
                                    db.profile.set(user_id, { area: map_name, x: obj.x, y: obj.y }, 'checkpoint_data');
                                    for (let i = 0; i < db.profile.get(user_id, 'ooch_party').length; i++) {
                                        db.profile.set(user_id, db.profile.get(user_id, `ooch_party[${i}].stats.hp`), `ooch_party[${i}].current_hp`);
                                        db.profile.set(user_id, true, `ooch_party[${i}].alive`);
                                    }
                                    db.profile.set(user_id, PlayerState.Playspace, 'player_state');
                                    let playspace_str = setup_playspace_str(user_id);
                                    await thread.messages.fetch(msg_to_edit).then((msg) => {
                                        msg.edit({ content: playspace_str[0], components: playspace_str[1] }).catch(() => {});
                                    });
                                    await sel.update({ content: 'Set a checkpoint and healed all your Oochamon.', components: [] });
                                    await wait(5000);
                                    await msg.delete().catch(() => {});
                                } else {
                                    db.profile.set(user_id, PlayerState.Playspace, 'player_state');
                                    msg.delete();
                                    let playspace_str = setup_playspace_str(user_id);
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
                //Check if player collides with this shop's position
                if(obj.x == playerx && obj.y == playery && !stop_moving){
                    stop_moving = true;
                    playerx -= xmove;
                    playery -= ymove;
                    db.profile.set(user_id, PlayerState.Shop, 'player_state');
                    let shopSelectOptions = [];
                    if (obj.type == 'default' || obj.type == null) {
                        shopSelectOptions = db.profile.get(user_id, 'global_shop_items');
                    }
                    if (obj.special_items.length != 0) shopSelectOptions.push(obj.special_items);
                    shopSelectOptions = shopSelectOptions.flat(1);
                    shopSelectOptions = shopSelectOptions.map(id => {
                        return { 
                            label: `${db.item_data.get(id, 'name')} ($${db.item_data.get(id, 'price')})`,
                            description: db.item_data.get(id, 'description_short'),
                            value: `${id}`,
                            emoji: db.item_data.get(id, 'emote'),
                        }
                    });

                    // Setup shop select menu
                    let shopSelectMenu = new ActionRowBuilder()
                    .addComponents(
                        new StringSelectMenuBuilder()
                            .setCustomId('shop_items')
                            .setPlaceholder('Select an item to buy!')
                            .addOptions(shopSelectOptions),
                    );

                    //start shop stuff here
                    let oochabux = db.profile.get(user_id, 'oochabux');

                    let shopImage = new AttachmentBuilder(`./Art/ShopImages/shopPlaceholder.png`);
                    let msg = await thread.send({ content: `${obj.greeting_dialogue}\n**Oochabux: $${oochabux}**`, components: [shopSelectMenu, back_button], files: [shopImage] });
                    
                    // Delete the current playspace
                    let playspace_msg = await thread.messages.fetch(db.profile.get(user_id, 'display_msg_id')).catch(() => {});
                    await playspace_msg.delete();

                    shop_collector = await msg.createMessageComponentCollector({ time: 600000 });
                    shop_collector.on('collect', async sel => {
                        if (sel.customId == 'back') {
                            db.profile.set(user_id, PlayerState.Playspace, 'player_state');
                            let playspace_str = setup_playspace_str(user_id);
                            let play_msg = await thread.send({ content: playspace_str[0], components: playspace_str[1] });
                            db.profile.set(user_id, play_msg.id, 'display_msg_id')
                            db.profile.set(user_id, oochabux, 'oochabux')
                            await msg.delete().catch(() => {});
                            shop_collector.stop();
                            if (item_qty_collector) item_qty_collector.stop();
                            return;
                        } else if (sel.customId == 'quantity_back') {
                            await msg.edit({ content: `${obj.greeting_dialogue}\nOochabux: **$${oochabux}**`, components: [shopSelectMenu, back_button] }).catch(() => {});
                            if (item_qty_collector) item_qty_collector.stop();
                        }
                        
                        let item_id = sel.values[0];
                        let item = db.item_data.get(item_id);
                        let purchaseReqMsg;
                        if (item.price <= oochabux) {
                            const qty_filter = async m => {
                                if (m.author.id != user_id) return false;
                                if (!isNaN(parseInt(m.content))) {
                                    if (oochabux < item.price * parseInt(m.content)) {
                                        sel.followUp({ content: `You do not have enough money to buy ${m.content}x ${item.emote} **${item.name}**.`, ephemeral: true });
                                        m.delete().catch(() => {});
                                        return false;
                                    }
                                    return true;
                                } else {
                                    sel.followUp({ content: `You must type in a number quantity of items you want to buy!`, ephemeral: true });
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
                            msg.edit({ components: [] });
                            let purchaseReqMsg = await sel.reply({ content: `How many of the ${item.emote} **${item.name}** would you like to purchase? Type in the amount below. (Type 0 to not purchase)\n` + 
                                `**You have enough Oochabux to buy ${maxAmt} of this item.**\n**You have ${amtHeld} of this item, and can hold ${maxAmt - amtHeld} more of it.**` });
                            item_qty_collector = thread.createMessageCollector({ filter: qty_filter, max: 1 });

                            item_qty_collector.on('collect', async m => {
                                let new_inv_qty = 0;
                                let buyAmount = Math.abs(parseInt(m.content));
                                if (buyAmount > 50) buyAmount = 50;
                                if (amtHeld >= 50) buyAmount = 0;
                                oochabux -= item.price * buyAmount;
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
                                
                                await purchaseReqMsg.delete().catch(() => {});
                                await m.delete().catch(() => {});
                                let followUpMsg;
                                if (buyAmount != 0) {
                                    followUpMsg = await sel.followUp({ content: `Successfully purchased ${buyAmount}x ${item.emote} **${item.name}** from the shop!\nYou now have **${new_inv_qty} ${item.name}${new_inv_qty > 1 ? 's' : ''}** in your inventory.` });
                                } else {
                                    followUpMsg = await sel.followUp({ content: `Nothing was purchased.` });
                                }
                                await msg.edit({ content: `${obj.greeting_dialogue}\nOochabux: **$${oochabux}**`, components: [shopSelectMenu, back_button] }).catch(() => {});
                                await wait(7000);
                                await followUpMsg.delete().catch(() => {});
                            });
                            
                        } else {
                            if (purchaseReqMsg !== undefined) { 
                                await purchaseReqMsg.delete().catch(() => {});
                                await m.delete().catch(() => {});
                            }
                            let followUpMsg = await sel.reply({ content: `You do not have enough money to purchase a ${item.emote} **${item.name}**.` });
                            msg.edit({ components: [shopSelectMenu, back_button] }).catch(() => {});
                            await wait(5000);
                            await followUpMsg.delete().catch(() => {});
                        }
                    });

                    shop_collector.on('end', async () => {
                        if (db.profile.get(user_id, 'player_state') != PlayerState.Playspace) {
                            db.profile.set(user_id, PlayerState.Playspace, 'player_state');
                            let playspace_str = setup_playspace_str(user_id);
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
                    if ((Math.random() < encounter_chance) && (!stop_moving)) {
                        let spawn_zone, x1,y1,x2,y2;
                        for(let j = 0; j < map_spawns.length; j++){
                            
                            spawn_zone = map_spawns[j];
                            x1 = (spawn_zone.x) <= playerx;
                            y1 = (spawn_zone.y) <= playery;
                            x2 = (spawn_zone.x + spawn_zone.width) > playerx;
                            y2 = (spawn_zone.y + spawn_zone.height) > playery;

                            if(x1 && y1 && x2 && y2){
                                stop_moving = true;
                                let slot_index = Math.floor(_.random(0, spawn_zone.spawn_slots.length - 1));
                                let slot = spawn_zone.spawn_slots[slot_index];
                                if(_.random(0, 10000) > 9999){ //This is the index of _i (the mon that randomly spawns 1/10,000 battles)
                                    let new_slot = {
                                        ooch_id : 34,
                                        min_level : slot.min_level,
                                        max_level : slot.max_level,
                                    }
                                    slot = new_slot;
                                } 
                                let mon_level = _.random(slot.min_level, slot.max_level);
                                let mon_name = db.monster_data.get(slot.ooch_id.toString(), 'name');
                                let mon_emote = db.monster_data.get(slot.ooch_id.toString(), 'emote');
                                //use slot .ooch_id, .min_level, .max_level to setup the encounter
                                await thread.send({ content: `A wild ${mon_emote} ${mon_name} (LV ${mon_level}) appears! Fight or run?`, components: [wild_encounter_buttons]}).then(async msg =>{
                                    await db.profile.set(user_id, PlayerState.Encounter, 'player_state');
                                    wild_encounter_collector = msg.createMessageComponentCollector({max: 1});
                                    wild_encounter_collector.on('collect', async sel => {
                                        let generated_ooch = generate_wild_battle(slot.ooch_id.toString(), mon_level);
                                        if (sel.customId == 'fight') {
                                            await msg.delete();
                                            await setup_battle(thread, user_id, generated_ooch);
                                        }
                                        else {
                                            if (Math.random() > .6) { //60/40 chance to run ignoring the encounter entirely if 'Run' is chosen
                                                await setup_battle(thread, user_id, generated_ooch);
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
;                        }
                    }
                break;
                default:
                    
                break;
            }

            //if the player has run into anything that would cause them to stop moving, make them stop
            if(stop_moving){ break; }
        }

        //Update the player's profile with their new x & y positions
        db.profile.set(user_id, { area: map_name, x: playerx, y: playery }, 'location_data');

        // Update player position
        db.player_positions.set(map_name, { x: playerx, y: playery }, user_id);

        let playspace_str = setup_playspace_str(user_id);
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
        let player_sprite_id = db.profile.get(user_id, 'player_sprite');

        //Plain map tiles
        for (let i = -x_center; i < x_center + 1; i++) {
            emote_map_array[i + x_center] = [];
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
            }
        }

        //NPC tiles
        let player_flags = db.profile.get(user_id, 'flags');
        let map_npcs = map_obj.map_npcs;
        
        for (let obj of map_npcs) {
            let npc_flag = `${Flags.NPC}${obj.name}${obj.npc_id}`
            xx = obj.x - x_pos + x_center;
            yy = obj.y - y_pos + y_center;
            if ((xx >= 0) && (xx <= x_center * 2) && (yy >= 0) && (yy <= y_center * 2)) {
                if (obj.flag_required == '' || obj.flag_required == false || player_flags.includes(obj.flag_required)) {
                    let plr_interacted = player_flags.includes(npc_flag); //check if the player has defeated this npc
                    let plain_tile = emote_map_array[xx][yy];
                    let npcZoneId = parseInt(emote_map_array[xx][yy].split(':')[1].split('_')[0].replace('c', '').replace('t', ''));
                    tile = db.tile_data.get(obj.sprite_id.slice(0, 1) + obj.sprite_id.slice(3));
                    if (tile.use === Tile.Int) npcZoneId = 0;
                    emote_map_array[xx][yy] = tile.zone_emote_ids[npcZoneId].emote;

                    //NPC has been interacted with/beaten by the player and needs to be removed, we'll remove it here
                    if ((plr_interacted && obj.remove_on_finish) || (player_flags.includes(obj.flag_kill))) { 
                        emote_map_array[xx][yy] = plain_tile;
                    }
                }
            }
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
        let player_location = db.profile.get(user_id, 'location_data');
        let biome = player_location.area;
        let playerx = player_location.x;
        let playery = player_location.y;

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
                    .setLabel(`${spdEmotes[db.profile.get(user_id, 'move_speed')-1]}`)
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
        if (ability != false) {
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
            emote: db.monster_data.get(ooch_id, 'emote')
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

    // Builds the action rows and places emotes in for the Oochabox, based on the database.
    // Updates with new database info every time the function is run
    // Needs to be updated in a lot of cases, so easier to put it in a function!
    buildBoxData: function(user, page_num) {
        box_row = [];
        box_row[0] = new ActionRowBuilder();
        box_row[1] = new ActionRowBuilder();
        box_row[2] = new ActionRowBuilder();
        box_row[3] = new ActionRowBuilder();
        let box_idx = 0;
        let oochabox_data = db.profile.get(user.id, 'ooch_pc');
        let party_data = db.profile.get(user.id, 'ooch_party');
        let offset = (16 * page_num)

        for (let i = (0 + offset); i < (16 + offset); i++) {
            if (_.inRange(i, 0+offset, 3+offset)) box_idx = 0; 
            if (_.inRange(i, 4+offset, 7+offset)) box_idx = 1; 
            if (_.inRange(i, 8+offset, 11+offset)) box_idx = 2; 
            if (_.inRange(i, 12+offset, 15+offset)) box_idx = 3; 

            if (oochabox_data[i] == undefined) {
                box_row[box_idx].addComponents(
                    new ButtonBuilder()
                        .setCustomId(`box_emp_${i}`)
                        .setLabel('‎')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(true)
                    )              
            } else {
                let ooch_data = db.monster_data.get(oochabox_data[i].id);
                box_row[box_idx].addComponents(
                    new ButtonBuilder()
                        .setCustomId(`box_ooch_${oochabox_data[i].id}_${i}`)
                        .setEmoji(ooch_data.emote)
                        .setStyle(ButtonStyle.Secondary)
                )
            }          
        }
        
        for (let i = 0; i < 4; i++) {
            if (party_data[i] == undefined) {
                box_row[i].addComponents(
                    new ButtonBuilder()
                        .setCustomId(`box_emp_${i}_party`)
                        .setLabel('‎')
                        .setStyle(ButtonStyle.Success)
                        .setDisabled(true)
                    )              
            } else {
                let ooch_data = db.monster_data.get(party_data[i].id);
                box_row[i].addComponents(
                    new ButtonBuilder()
                        .setCustomId(`box_ooch_${party_data[i].id}_${i}_party`)
                        .setEmoji(ooch_data.emote)
                        .setStyle(ButtonStyle.Success)
                )
            }
        }
        return box_row;
    }

}