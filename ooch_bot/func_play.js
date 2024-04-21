const db = require("./db")
const { Flags, PlayerState } = require('./types.js');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const wait = require('wait');
const _ = require('lodash');
const { event_process, event_from_npc } = require('./func_event');

module.exports = {

    move: async function(message, direction, dist = 1) {
        /*
            db.player_positions.set(interaction.user.id, interaction.member.displayName, 'player_name');
        */

        const { map_emote_string, setup_playspace_str } = require('./func_play.js');
        const { generate_wild_battle, setup_battle } = require("./func_battle");

        let user_id = message.author.id;
        let xmove = 0;
        let ymove = 0;
        let profile_data = db.profile.get(user_id);
        let msg_to_edit = profile_data.display_msg_id;
        let profile_arr = db.profile.keyArray();
        let confirm_buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId('yes').setLabel('Yes').setStyle(ButtonStyle.Success),
            ).addComponents(
                new ButtonBuilder().setCustomId('no').setLabel('No').setStyle(ButtonStyle.Danger),
            );
        let confirm_collector;

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
            
        profile_arr = profile_arr.filter(val => val != message.author.id);
        
        // Max limit of 4 tiles that you can move at once
        dist = _.clamp(dist, 0, 4);
        
        //Get the player's location
        let player_location = profile_data.location_data;
        let map_name = player_location.area;
        let playerx = player_location.x;
        let playery = player_location.y;
        let player_flags = profile_data.flags;

        //Get the map array based on the player's current map
        let map_obj =   db.maps.get(map_name.toLowerCase());
        let map_tiles =         map_obj.tiles; 
        let map_npcs =          map_obj.npcs;
        let map_spawns =        map_obj.spawns;
        let map_savepoints =    map_obj.savepoints;
        let map_transitions =   map_obj.transitions;
        let map_events =        map_obj.events;
        let map_shops =         map_obj.shops;
        if (map_shops == undefined || map_shops == null) map_shops = [];
        
        
        //set where the player is going to move
        switch(direction){
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
            let tile_id = map_tiles[playerx + xmove][playery + ymove]
            var tile = db.tile_data.get(tile_id.toString());
            switch(tile.use){

                case 'board':
                    stop_moving = true;
                break;
                case 'wall':
                    stop_moving = true;
                break;
                case 'grass':
                    playerx += xmove;
                    playery += ymove;
                    if (0 < .25) {//if(Math.random() < .25){
                        console.log('Mon Enountered!')
                        stop_moving = true;
                        let spawn_zone, x1,y1,x2,y2;
                        for(let j = 0; j < map_spawns.length; j++){
                            
                            spawn_zone = map_spawns[j];
                            x1 = (spawn_zone.x) <= playerx;
                            y1 = (spawn_zone.y) <= playery;
                            x2 = (spawn_zone.x + spawn_zone.width) > playerx;
                            y2 = (spawn_zone.y + spawn_zone.height) > playery;

                            if(x1 && y1 && x2 && y2){
                                let slot_index = _.random(0, spawn_zone.spawn_slots.length - 1);
                                let slot = spawn_zone.spawn_slots[slot_index];
                                let mon_level = _.random(slot.min_level, slot.max_level);
                                let mon_name = db.monster_data.get(slot.ooch_id.toString(), 'name');
                                let mon_emote = db.monster_data.get(slot.ooch_id.toString(), 'emote');
                                //use slot .ooch_id, .min_level, .max_level to setup the encounter
                                message.channel.send({ content: `Start battle with wild ${mon_emote} ${mon_name} (LV ${mon_level})?`, components: [confirm_buttons]}).then(async msg =>{
                                    confirm_collector = msg.createMessageComponentCollector({max: 1});
                                    confirm_collector.on('collect', async sel => {
                                        let generated_ooch = generate_wild_battle(slot.ooch_id.toString(), mon_level);
                                        if (sel.customId == 'yes') {
                                            await msg.delete();
                                            await setup_battle(message.channel, message.author.id, generated_ooch);
                                        }
                                        else {
                                            /*if (Math.random() > .5) { //50/50 chance to run ignoring the encounter entirely if 'No' is chosen
                                                await setup_battle(message.channel, message.author.id, generated_ooch);
                                                await msg.delete();
                                            }
                                            else { // If we fail the 50/50, ignore the input*/
                                                await msg.delete();
                                            //}
                                        }
                                    })
                                })
                            }
;                        }
                    }
                break;
                default:
                    playerx += xmove;
                    playery += ymove;
                break;
            }

            //Save Points
            for(let obj of map_savepoints){
                if(obj.x == playerx && obj.y == playery){
                    //prompt the player 
                    message.channel.send({ content: obj.greeting_dialogue, components: [confirm_buttons] }).then(async msg => {
                        confirm_collector = msg.createMessageComponentCollector({ max: 1 });
                        confirm_collector.on('collect', async sel => {
                            if (sel.customId == 'yes') {
                                db.profile.set(user_id, { area: 'map_name', x: obj.x, y: obj.y }, 'savepoint_data');
                                await sel.update({ content: 'Checkpoint set.', components: [] });
                                await wait(5000);
                                await msg.delete();
                            } else {
                                msg.delete();
                            }
                        });
                    });
                }
            }

            //Events
            let x1,y1,x2,y2;
            for(let obj of map_events){
                x1 = (obj.x) <= playerx;
                y1 = (obj.y) <= playery;
                x2 = (x1 + obj.width) > playerx;
                y2 = (y1 + obj.height) > playery;
                if(x1 && y1 && x2 && y2){
                    //trigger this event if the player hasn't triggered it already
                }
            }

            //NPCs
            for(let obj of map_npcs){
                //Check if player collides with this NPC's position
                let npc_flag = `${Flags.NPC}${obj.name}${obj.x}${obj.y}`
                if(obj.x == playerx && obj.y == playery){
                    //Check if this NPC requires a flag to spawn, and if it does check if the player has it
                    if(obj.flag_required == false || player_flags.includes(obj.flag_required)){
                        if (!obj.remove_on_finish || !player_flags.includes(npc_flag)) { //NPC should continue to persist after being beaten
                            stop_moving = true;
                            playerx -= xmove;
                            playery -= ymove;

                            //Dialogue Stuff goes here
                            event_process(message.author.id, message.channel, event_from_npc(obj, message.author.id));
                        }
                    }
                }
            }

            //Shops
            for(let obj of map_shops){
                //Check if player collides with this shop's position
                if(obj.x == playerx && obj.y == playery){
                    stop_moving = true;
                    playerx -= xmove;
                    playery -= ymove;
                    db.profile.set(message.author.id, PlayerState.Shop, 'player_state');
                    let shopSelectOptions = [];
                    if (obj.type == 'default' || obj.type == null) {
                        shopSelectOptions = db.profile.get(message.author.id, 'global_shop_items');
                    }
                    shopSelectOptions.push(obj.special_items);
                    shopSelectOptions = shopSelectOptions.flat(1);
                    shopSelectOptions = shopSelectOptions.map(id => {
                        return { 
                            label: `${db.item_data.get(id, 'name')} ($${db.item_data.get(id, 'price')})`,
                            description: db.item_data.get(id, 'description'),
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
                    let oochabux = db.profile.get(message.author.id, 'oochabux');
                    if (obj.image == '') obj.image = 'https://cdn.discordapp.com/attachments/1149873572291035298/1149873767351332976/image.png';
                    let image_msg = await message.channel.send({ content: obj.image });
                    let msg = await message.channel.send({ content: `${obj.greeting_dialogue}\n**Oochabux: $${oochabux}**`, components: [shopSelectMenu, back_button] });
                    
                    // Delete the current playspace
                    let playspace_msg = await message.channel.messages.fetch(db.profile.get(message.author.id, 'display_msg_id'));
                    await playspace_msg.delete();

                    shop_collector = await msg.createMessageComponentCollector({ time: 600000 });
                    shop_collector.on('collect', async sel => {
                        if (sel.customId == 'back') {
                            db.profile.set(message.author.id, PlayerState.Playspace, 'player_state');
                            let playspace_str = setup_playspace_str(message.author.id);
                            let play_msg = await message.channel.send(playspace_str);
                            db.profile.set(message.author.id, play_msg.id, 'display_msg_id')
                            db.profile.set(message.author.id, oochabux, 'oochabux')
                            msg.delete();
                            image_msg.delete();
                            shop_collector.stop();
                            if (item_qty_collector) item_qty_collector.stop();
                            return;
                        } else if (sel.customId == 'quantity_back') {
                            await msg.edit({ content: `${obj.greeting_dialogue}\nOochabux: **$${oochabux}**`, components: [shopSelectMenu, back_button] });
                            if (item_qty_collector) item_qty_collector.stop();
                        }
                        
                        let item_id = sel.values[0];
                        let item = db.item_data.get(item_id);
                        if (item.price <= oochabux) {
                            const qty_filter = m => {
                                if (m.author.id != message.author.id) return false;
                                if (!isNaN(parseInt(m.content))) {
                                    if (parseInt(m.content) != 0) {
                                        if (oochabux < item.price * parseInt(m.content)) {
                                            sel.followUp({ content: `You do not have enough money to buy ${m.content}x ${item.emote} **${item.name}**.`, ephemeral: true });
                                            m.delete();
                                            return false;
                                        }
                                        return true;
                                    } else {
                                        sel.followUp({ content: `You cannot buy 0 of an item.`, ephemeral: true });
                                        m.delete();
                                        return false;
                                    }
                                } else {
                                    sel.followUp({ content: `You must type in a number quantity of items you want to buy!`, ephemeral: true });
                                    m.delete();
                                    return false;
                                }
                            }

                            await sel.reply({ content: `How many of the ${item.emote} **${item.name}** would you like to purchase? Type in the amount below.`, ephemeral: true })
                            item_qty_collector = message.channel.createMessageCollector({ filter: qty_filter, max: 1 });

                            item_qty_collector.on('collect', async m => {
                                let new_inv_qty = 0;
                                let buyAmount = parseInt(m.content);
                                oochabux -= item.price * buyAmount;
                                switch (item.type) {
                                    case 'potion': 
                                        db.profile.ensure(message.author.id, 0, `heal_inv.${item_id}`)
                                        db.profile.math(message.author.id, '+', buyAmount, `heal_inv.${item_id}`);
                                        new_inv_qty = db.profile.get(message.author.id, `heal_inv.${item_id}`);
                                    break;
                                    case 'prism': 
                                        db.profile.ensure(message.author.id, 0, `prism_inv.${item_id}`)
                                        db.profile.math(message.author.id, '+', buyAmount, `prism_inv.${item_id}`);
                                        new_inv_qty = db.profile.get(message.author.id, `prism_inv.${item_id}`);
                                    break;
                                }
                                
                                sel.followUp({ content: `Successfully purchased ${buyAmount}x ${item.emote} **${item.name}** from the shop!\nYou now have **${new_inv_qty} ${item.name}${new_inv_qty > 1 ? 's' : ''}** in your inventory.`, ephemeral: true });
                                msg.edit({ content: `${obj.greeting_dialogue}\nOochabux: **$${oochabux}**`, components: [shopSelectMenu, back_button] });
                            });
                            
                        } else {
                            sel.reply({ content: `You do not have enough money to purchase a ${item.emote} **${item.name}**.`, ephemeral: true });
                            msg.edit({ components: [shopSelectMenu, back_button] });
                        }
                    });

                    shop_collector.on('end', async () => {
                        if (db.profile.get(message.author.id, 'player_state') != PlayerState.Playspace) {
                            db.profile.set(message.author.id, PlayerState.Playspace, 'player_state');
                            let playspace_str = setup_playspace_str(message.author.id);
                            let play_msg = await message.channel.send(playspace_str);
                            db.profile.set(message.author.id, play_msg.id, 'display_msg_id')
                            db.profile.set(message.author.id, oochabux, 'oochabux')
                            msg.delete();
                            image_msg.delete();
                            shop_collector.stop();
                        }
                    });

                    return;
                }
            }

            //Transitions
            for(let obj of map_transitions){
                if(obj.x == playerx && obj.y == playery){
                    stop_moving = true;
                    playerx = obj.connect_x;
                    playery = obj.connect_y;
                    biome = obj.connect_map;
                }
            }

            //if the player has run into anything that would cause them to stop moving, make them stop
            if(stop_moving){ break; }
        }

        //Update the player's profile with their new x & y positions
        db.profile.set(user_id, { area: map_name, x: playerx, y: playery }, 'location_data');

        // Update player position
        db.player_positions.set(map_name, { x: playerx, y: playery }, user_id);

        //Send reply displaying the player's location on the map
        message.channel.messages.fetch(msg_to_edit).then((msg) => {
            msg.edit({ content: map_emote_string(map_name, map_tiles, playerx, playery, user_id) });
        })

    },

    map_emote_string: function(map_name, map_tiles, x_pos, y_pos, user_id) {

        // Window size can either be 5x5 or 7x7
        let window_size = db.profile.get(user_id, 'settings.zoom');
        let view_size = Math.floor(window_size / 2);
        let xx, yy, tile;
        let emote_map = ``;
        if (window_size === 7) emote_map = `**${map_name}**: ${x_pos}, ${y_pos}\n`;
        let map_obj = db.maps.get(map_name);
        let emote_map_array = [];
        let player_sprite = db.profile.get(user_id, 'player_sprite');

        //Plain map tiles
        for (let i = -view_size; i < view_size + 1; i++) {
            emote_map_array[i + view_size] = [];
            for (let j = -view_size; j < view_size + 1; j++) {
                //add emote based on tile data to position
                xx = i + x_pos;
                yy = j + y_pos;
                if(xx >= 0 && yy >= 0 && xx < map_tiles.length && yy < map_tiles[0].length){
                    tile = db.tile_data.get(map_tiles[xx][yy].toString());
                }
                else {
                    tile = db.tile_data.get('0')//This is the default tile
                }
                emote_map_array[i + view_size][j + view_size] = tile.emote;
            }
        }

        //NPC tiles
        let player_flags = db.profile.get(user_id, 'flags');
        let map_npcs = map_obj.npcs;
        
        for (let obj of map_npcs) {
            let npc_flag = `${Flags.NPC}${obj.name}${obj.x}${obj.y}`
            xx = obj.x - x_pos + view_size;
            yy = obj.y - y_pos + view_size;
            if ((xx >= 0) && (xx <= view_size * 2) && (yy >= 0) && (yy <= view_size * 2)) {
                if (obj.flag_required == '' || player_flags.includes(obj.flag_required)) {
                    let plr_interacted = player_flags.includes(npc_flag); //check if the player has defeated this npc
                    let plain_tile = emote_map_array[xx][yy];
                    tile = db.tile_data.get(obj.sprite_id.toString());
                    emote_map_array[xx][yy] = tile.emote;

                    //NPC has been interacted with/beaten by the player and needs to be removed, we'll remove it here
                    if ((plr_interacted && obj.remove_on_finish) || (player_flags.includes(obj.flag_kill))) { 
                        emote_map_array[xx][yy] = plain_tile;
                    }
                }
            }
        }

        //Savepoint tiles
        let map_savepoints = map_obj.savepoints;
        for(let obj of map_savepoints){
            xx = obj.x - x_pos + view_size;
            yy = obj.y - y_pos + view_size;
            if((xx >= 0) && (xx <= view_size * 2) && (yy >= 0) && (yy <= view_size * 2)){
                emote_map_array[xx][yy] = '<:t001:1057163945900773436>'; //this is the savepoint tile
            }
        }

        //Put player sprite in center
        emote_map_array[view_size][view_size] = player_sprite;
        
        //Flips the X/Y axis of the tile data (necessary because of how we read the map data)
        let transpose = [];
        let w = emote_map_array.length;
        let h = emote_map_array[0].length;
        for(let i = 0; i < w; i++){
            transpose[i] = []
            for(let j = 0; j < h; j++){
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
     * Setup a new playspace window, returns the initial playspace string.
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
        let map_arr = map_obj.tiles; //this should be the actual map array

        // Set player position data into the global multiplayer player position db
        db.player_positions.set(biome, { x: playerx, y: playery }, user_id);

        return map_emote_string(biome.toLowerCase(), map_arr, playerx, playery, user_id);
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
    create_ooch: function(ooch_id, level = 5, move_list = [], nickname = false, cur_exp = 0, ability = false, hp_iv = _.random(0,10)/20+1, atk_iv = _.random(0,10)/20+1,
                            def_iv = _.random(0,10)/20+1, spd_iv = _.random(0,10)/20+1, held_item = -1) {

        const { get_stats } = require('./func_battle');
                            
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

        //Find what moves the starter should initially know
        if (move_list.length == 0) {
            learn_list = learn_list.filter(x => x[0] <= level && x[0] != -1)
            for(let i = 0; i < learn_list.length; i++){
                move_list[i] = learn_list[i][0];
            }

            // Make sure the move_list is 4 moves
            while (move_list.length > 4) {
                let rand_move_pos = _.random(0, move_list.length)
                move_list.splice(rand_move_pos, 1);
            }
        }

        return { 
            id: ooch_id,
            name: db.monster_data.get(ooch_id, 'name'), 
            nickname: nickname,
            item: held_item,
            ability: rand_ability,
            og_ability: rand_ability,
            level: level,
            moveset: move_list,
            stats: {
                hp: stats[0],
                atk: stats[1],
                def: stats[2],
                spd: stats[3],
                hp_iv: hp_iv,
                atk_iv: atk_iv,
                def_iv: def_iv,
                spd_iv: spd_iv,
                atk_mul: 1,
                def_mul: 1,
                spd_mul: 1,
                acc_mul: 1, // Accuracy Multiplier, used for accuracy checks
                eva_mul: 1 // Evasion Multiplier, used for accuracy checks
            },
            status_effects: [],
            current_hp: stats[0],
            current_exp: cur_exp,
            next_lvl_exp: level ** 3,
            current_hp: stats[0],
            alive: true,
            evo_stage: db.monster_data.get(ooch_id, 'evo_stage'),
            type: db.monster_data.get(ooch_id, 'type'),
            og_type: db.monster_data.get(ooch_id, 'type'),
            doom_timer: 3, // Used for the doomed status effect
            emote: db.monster_data.get(ooch_id, 'emote')
        }
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