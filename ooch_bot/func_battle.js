const db = require("./db")
const wait = require('wait');
const { ActionRowBuilder, ButtonBuilder, StringSelectMenuBuilder, ButtonStyle, ComponentType, EmbedBuilder } = require('discord.js');
const _ = require('lodash');
const { PlayerState, TrainerType, Stats, Ability, OochType, TypeEmote } = require("./types");
const { Status } = require('./types.js');
const { ooch_info_embed, check_chance } = require("./func_other");
const { Canvas, loadImage, FontLibrary } = require('skia-canvas');
const { create_ooch, setup_playspace_str } = require('./func_play');

module.exports = {

/**
 * Generate an Oochamon battle opponent for wild encounters.
 * @param {String} ooch_id The ID of the Oochamon we are generating a battle for
 * @param {Number} ooch_level The level of the Oochamon we're battling
 * @returns The enemy Oochamon data in an object.
 */
generate_wild_battle: function(ooch_id, ooch_level) {
    let ooch = create_ooch(ooch_id, ooch_level);
    let ooch_enemy = {
        name: 'Wild Oochamon',
        ooch_active_slot: 0,
        trainer_type: TrainerType.Wild, 
        ooch_party:[ooch]
    }
    return ooch_enemy
},

/**
 * Takes a trainer object and converts it for battle
 * @param {Object} trainer_obj The base trainer object to convert
 */
generate_trainer_battle(trainer_obj){

    let party_base = trainer_obj.team;
    let party_generated = [];
    
    //Loop through the party_base and convert to the required format for battles
    for(let i  = 0; i < party_base.length; i++){
        let ooch_base = party_base[i];
        let ooch = create_ooch(ooch_base.id, ooch_base.level, ooch_base.moveset, ooch_base.nickname, 0, ooch_base.ability,
                               ooch_base.stats.hp_iv, ooch_base.stats.atk_iv, ooch_base.stats.def_iv, ooch_base.stats.spd_iv);
        party_generated.push(ooch); 
    }
    
    // Create the object to actually be returned
    let trainer_return = {
        name: trainer_obj.name,
        ooch_active_slot: 0,
        trainer_type: TrainerType.NPCTrainer,
        oochabux: trainer_obj.coin,
        ooch_party: party_generated,
        trainer_battle_sprite: trainer_obj.sprite_combat === false ? trainer_obj.sprite_id : trainer_obj.sprite_combat,
    }
    return trainer_return;
},

/**
 * Sets up an Oochamon battle and begins prompting for input.
 * @param {Object} thread The thread Oochamon is being played in
 * @param {String} user_id The user ID of the user playing Oochamon
 * @param {Object} trainer_obj The enemy trainer object
 * @param {Boolean} is_npc_battle If the battle is a trainer battle or not, defaults to false
 */
setup_battle: async function(thread, user_id, trainer_obj, is_npc_battle = false) {

    const { ability_stat_change, prompt_battle_input, generate_battle_image, modify_stat } = require('./func_battle.js');

    let ooch_party = db.profile.get(user_id, 'ooch_party');
    let abilityMsg = '';

    // Setup stuff for the main players team
    let initial_slot = -1;
    for (let i = 0; i < ooch_party.length; i++) {
        let ooch_data = ooch_party[i];
        if(ooch_data.current_hp > 0 && initial_slot < 0){ initial_slot = i;}
    }

    let plrOochName = ooch_party[initial_slot].nickname;
    let plrOochEmote = ooch_party[initial_slot].emote;
    let enemyOochName = trainer_obj.ooch_party[0].nickname;
    let enemyOochEmote = trainer_obj.ooch_party[0].emote;

    // Adjust things for abilities
    ooch_party[initial_slot] = ability_stat_change(ooch_party[initial_slot], ooch_party);
    abilityMsg += `\n${ooch_party[initial_slot][1]}`;
    ooch_party[initial_slot] = ooch_party[initial_slot][0];
    switch (ooch_party[initial_slot].ability) {
        case Ability.Duplicant:
            if (trainer_obj.ooch_party[0].ability !== Ability.InvalidEntry) {
                ooch_party[initial_slot].ability = trainer_obj.ooch_party[0].ability;
                abilityMsg += `\n${plrOochEmote} **${plrOochName}**'s copied its ability to **${_.startCase(db.ability_data.get(trainer_obj.ooch_party[0].ability, 'name'))}** through it's **Duplicant** ability!`;
            }
        break;
        case Ability.Nullify:
            trainer_obj.ooch_party[0].ability = Ability.Null;
            abilityMsg += `\n${enemyOochEmote} **${enemyOochName}**'s ability changed to **Null** from the ability **Nullify** from ${plrOochEmote} **${plrOochName}**!`
        break;
        case Ability.Gentle: // Affects enemy oochamon
            modify_stat(trainer_obj.ooch_party[0], Stats.Attack, -1);
        break;
    }

    // Adjust for enemy abilities
    trainer_obj.ooch_party[0] = ability_stat_change(trainer_obj.ooch_party[0], trainer_obj.ooch_party);
    abilityMsg += `\n${trainer_obj.ooch_party[0][1]}`;
    trainer_obj.ooch_party[0] = trainer_obj.ooch_party[0][0];
    switch (trainer_obj.ooch_party[0].ability) {
        case Ability.Duplicant:
            if (ooch_party[initial_slot].ability !== Ability.InvalidEntry) {
                trainer_obj.ooch_party[0].ability = ooch_party[initial_slot].ability;
                abilityMsg += `\n${enemyOochEmote} **${enemyOochName}**'s copied its ability to **${_.startCase(db.ability_data.get(ooch_party[initial_slot].ability, 'name'))}** through it's **Duplicant** ability!`;
            }
        break;
        case Ability.Nullify:
            ooch_party[initial_slot].ability = Ability.Null;
            abilityMsg += `\n${plrOochEmote} **${plrOochName}**'s ability changed to **Null** from the ability **Nullify** from ${enemyOochEmote} **${enemyOochEmote}**!`
        break;
        case Ability.Gentle: // Affects player oochamon
            modify_stat(ooch_party[initial_slot], Stats.Attack, -1);
        break;
    }

    db.profile.set(user_id, ooch_party, 'ooch_party');
    db.profile.set(user_id, initial_slot, 'ooch_active_slot'); //if this is still somehow -1 the player shouldn't be able to fight right now anyway

    // Delete playspace to enter battle
    let playspace_msg = await thread.messages.fetch(db.profile.get(user_id, 'display_msg_id'));
    await playspace_msg.delete();

    // Generate intro to battle image
    let battle_image = await generate_battle_image(thread, user_id, db.profile.get(user_id), trainer_obj, is_npc_battle);
    thread.send({ 
        content: is_npc_battle ? `# ${trainer_obj.name} wants to battle!`
                : `# You encounter a wild **${db.monster_data.get(trainer_obj.ooch_party[0].id, 'name')}!**`,
        files: [battle_image]
    });

    await db.profile.set(user_id, PlayerState.Combat, 'player_state')
    await db.profile.set(user_id, trainer_obj, 'ooch_enemy')
    await db.profile.set(user_id, 1, 'battle_msg_counter');
    await db.profile.set(user_id, 0, 'turn_msg_counter');
    await db.profile.set(user_id, 1, 'battle_turn_counter');

    if (abilityMsg.replaceAll('\n','') != '') {
        console.log(`Sent Ability Message: ${abilityMsg}`)
        await thread.send(abilityMsg);
        db.profile.math(user_id, '+', 1, 'battle_msg_counter');
    }

    // Update Oochadex seen info
    for (let i = 0; i < trainer_obj.ooch_party.length; i++) {
        db.profile.math(user_id, '+', 1, `oochadex[${trainer_obj.ooch_party[i].id}].seen`);
    }

    await prompt_battle_input(thread, user_id);
},

/**
 * Handles all battle input and logic. The main battle function.
 * @param {Object} thread The thread that Oochamon is being played in.
 * @param {String} user_id The user id of the user playing Oochamon.
 */
prompt_battle_input: async function(thread, user_id) {

    const { type_to_emote, attack, end_of_round, victory_defeat_check, prompt_battle_input,
    item_use, finish_battle, ability_stat_change, modify_stat, battle_calc_exp,
    level_up, type_effectiveness } = require('./func_battle.js');

    // Get enemy oochamon data that was previously generated
    let ooch_enemy_profile = db.profile.get(user_id, 'ooch_enemy')
    let ooch_plr_profile = db.profile.get(user_id);
    let ooch_enemy = ooch_enemy_profile.ooch_party[ooch_enemy_profile.ooch_active_slot];
    // Get the players oochamon in the first spot of their party
    let active_slot = ooch_plr_profile.ooch_active_slot;
    let ooch_plr = ooch_plr_profile.ooch_party[active_slot];
    let ooch_pos = active_slot;
    let move_list = ooch_plr.moveset;
    let move_id, move_name, move_damage, move_accuracy, turn_order; // Battle variables
    let displayEmbed = new EmbedBuilder();
    let battleSpeed = ooch_plr_profile.settings.battle_speed;

    //#region Setup buttons and select menus
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('fight')
                .setLabel('Fight')
                .setEmoji('⚔️')
                .setStyle(ButtonStyle.Primary),
        ) .addComponents(
            new ButtonBuilder()
                .setCustomId('switch')
                .setLabel('Switch')
                .setEmoji('<:item_prism:1274937161262698536>')
                .setStyle(ButtonStyle.Success),
        );

    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('bag')
                .setLabel('Item')
                .setEmoji('🎒')
                .setStyle(ButtonStyle.Danger),
        ) .addComponents(
            new ButtonBuilder()
                .setCustomId('run')
                .setLabel('Run')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🏃‍♂️')
                .setDisabled(ooch_enemy_profile.trainer_type !== TrainerType.Wild),
        );

    const row3 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('info')
                    .setLabel('View Battle Info')
                    .setEmoji('📒')
                    .setStyle(ButtonStyle.Secondary),
            )
    
    const move_buttons = new ActionRowBuilder();
    const switch_buttons_1 = new ActionRowBuilder();
    const switch_buttons_2 = new ActionRowBuilder();
    const bag_buttons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('heal_button')
                .setLabel('Healing')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('<:item_potion_magic:1274937146423115922>'),
        ).addComponents(
            new ButtonBuilder()
                .setCustomId('prism_button')
                .setLabel('Prism')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('<:item_prism:1274937161262698536>')
                .setDisabled(ooch_enemy_profile.trainer_type !== TrainerType.Wild),
        ).addComponents(
            new ButtonBuilder()
                .setCustomId('back')
                .setLabel('Back')
                .setStyle(ButtonStyle.Danger),
        )

    const back_button = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('back')
                .setLabel('Back')
                .setStyle(ButtonStyle.Danger),
        )
    //#endregion

    // Store current battle state to roll back to if needed
    db.profile.delete(user_id, 'rollback_profile');
    db.profile.set(user_id, JSON.stringify(db.profile.get(user_id)), 'rollback_profile');
    db.profile.set(user_id, 0, 'turn_msg_counter');
        
    // If our current oochamon sent out is dead, we need to get input to switch our oochamon.
    if (ooch_plr.current_hp <= 0) {
        let ooch_check, ooch_emote, ooch_hp, ooch_button_color, ooch_disable;
        let ooch_party = db.profile.get(user_id, 'ooch_party');

        // On death ability that affects the entire party:
        if (ooch_plr.ability === Ability.EasyGo) {
            for (let i = 0; i < ooch_party.length; i++) {
                let plr = ooch_party[i];
                if (plr.id != ooch_plr.id && plr.current_hp != 0) {
                    plr.current_hp = _.clamp(Math.round(plr.current_hp + (plr.stats.hp / 10)), 0, plr.stats.hp)
                    ooch_party[i] = plr;
                }
            }
            db.profile.set(user_id, ooch_party, 'ooch_party');
        }

        const switch_buttons_1_die = new ActionRowBuilder();
        const switch_buttons_2_die = new ActionRowBuilder();

        //Go through the party and create buttons of mons to switch to
        for (let i = 0; i < ooch_party.length; i++) {
            ooch_check = ooch_party[i];
            ooch_emote = db.monster_data.get([ooch_check.id], 'emote');
            ooch_hp = `${ooch_check.current_hp}/${ooch_check.stats.hp} HP`;
            ooch_button_color = ButtonStyle.Primary;
            ooch_disable = false;

            //Check if the slot we're checking is the currently active mon (dead) or another dead party member, and if so, disable the button
            if (i == db.profile.get(user_id, 'ooch_active_slot')) {
                ooch_button_color = ButtonStyle.Success;
                ooch_disable = true;
            } else if (ooch_check.current_hp <= 0) {
                ooch_button_color = ButtonStyle.Primary;
                ooch_disable = true;
            }

            ((i <= 2) ? switch_buttons_1_die : switch_buttons_2_die).addComponents(
                new ButtonBuilder()
                    .setCustomId(`${i}`)
                    .setLabel(`${ooch_check.nickname} (${ooch_hp})`)
                    .setStyle(ooch_button_color)
                    .setEmoji(ooch_emote)
                    .setDisabled(ooch_disable),
            )
        }

        await thread.send({ content: `Select the new Oochamon you want to switch in!`, components: (switch_buttons_2_die.components.length != 0) ? [switch_buttons_1_die, switch_buttons_2_die] : [switch_buttons_1_die] })
        db.profile.inc(user_id, 'turn_msg_counter');
        db.profile.inc(user_id, 'battle_msg_counter');

        const s_collector_d = thread.createMessageComponentCollector({ max: 1 });

        await s_collector_d.on('collect', async ooch_sel => {
            let ooch_pick = db.profile.get(user_id, `ooch_party[${parseInt(ooch_sel.customId)}]`)
            let string_to_send = `You sent out ${db.monster_data.get(ooch_pick.id, 'emote')} **${ooch_pick.nickname}** to battle!`;

            // Reset stat multipliers for dead Oochamon
            ooch_plr.stats.atk_mul = 0;
            ooch_plr.stats.def_mul = 0;
            ooch_plr.stats.spd_mul = 0;
            ooch_plr.stats.acc_mul = 0;
            ooch_plr.stats.eva_mul = 0;
            ooch_plr.ability = ooch_plr.og_ability;
            ooch_plr.type = ooch_plr.og_type;
            ooch_plr.status_effects = [];
            ooch_plr.doom_timer = 3;
            db.profile.set(user_id, ooch_plr, `ooch_party[${active_slot}]`);

            // Check for on switch in abilities, player switching in, enemy ability activated
            switch (ooch_enemy.ability) {
                case Ability.Alert:
                    ooch_enemy = modify_stat(ooch_enemy, Stats.Attack, 1);
                    string_to_send += `\n${ooch_enemy.emote} **${ooch_enemy.nickname}**'s ability **Alert** raised its ATK from the new Oochamon switch!`;
                break;
                case Ability.Duplicant:
                    if (ooch_pick.ability !== Ability.InvalidEntry) {
                        ooch_enemy.ability = ooch_pick.ability;
                        string_to_send += `\n${ooch_enemy.emote} **${ooch_enemy.nickname}**'s copied its ability to **${_.startCase(db.ability_data.get(ooch_pick.ability, 'name'))}** through it's **Duplicant** ability!`;
                    }
                break;
                case Ability.Nullify:
                    ooch_pick.ability = Ability.Null;
                    string_to_send += `\n${ooch_pick.emote} **${ooch_pick.nickname}**'s ability changed to **Null** from the ability **Nullify** from ${ooch_enemy.emote} **${ooch_enemy.nickname}**!`
                break;
            }

            // Check for on switch in abilities, player switching in, player ability activated
            switch (ooch_pick.ability) {
                case Ability.Boisterous:
                    ooch_enemy.current_hp = _.clamp(Math.floor(ooch_enemy.current_hp - ooch_enemy.stats.hp * 0.1), 1, ooch_enemy.stats.hp);
                    string_to_send += `\n${ooch_enemy.emote} **${ooch_enemy.nickname}** lost 10% of it's hp from the switch in ability **Boisterous**!`;
                break;
                case Ability.Gentle:
                    ooch_enemy = modify_stat(ooch_enemy, Stats.Attack, -1);
                break;
            }

            let ooch_pos = parseInt(ooch_sel.customId);
            ooch_plr = ooch_pick;
            db.profile.set(user_id, ooch_pos, 'ooch_active_slot');
            active_slot = ooch_pos;

            // Update on switch in stats
            ooch_plr = ability_stat_change(ooch_plr, ooch_plr_profile.ooch_party);
            string_to_send += `\n${ooch_plr[1]}`;
            ooch_plr = ooch_plr[0];
            
            await ooch_sel.update({ content: string_to_send, components: [] })
            await prompt_battle_input(thread, user_id);
        });
        
    } else { // If our currently sent out Oochamon is alive, do input as normal.

    let sel_msg = await thread.send({ content: `### -- Select An Action --`, components: [row, row2, row3] });
    db.profile.inc(user_id, 'turn_msg_counter');
    db.profile.inc(user_id, 'battle_msg_counter');
    const collector = thread.createMessageComponentCollector({ max: 1 });

    await collector.on('collect', async sel => {
        await sel_msg.delete().catch(() => {});
        db.profile.dec(user_id, 'turn_msg_counter');
        db.profile.dec(user_id, 'battle_msg_counter');
        switch (sel.customId) {
            case 'fight':

                // Get the player's Attack options
                for (let i = 0; i < move_list.length; i++) {
                    
                    move_id = move_list[i];
                    move_name = db.move_data.get(`${move_id}`, 'name')
                    move_type = db.move_data.get(`${move_id}`, 'type')
                    move_effective_emote = type_effectiveness(move_type, ooch_enemy.type);
                    if (move_effective_emote[0] > 1) {
                        move_effective_emote = ' ⏫';
                    } else if (move_effective_emote[0] < 1) {
                        move_effective_emote = ' ⏬';
                    } else {
                        move_effective_emote = '';
                    }

                    move_buttons.addComponents(
                        new ButtonBuilder()
                            .setCustomId(`${move_id}`)
                            .setLabel(`${move_name}${move_effective_emote}`)
                            .setStyle(ButtonStyle.Primary)
                            .setEmoji(type_to_emote(move_type))
                    )
                }

                //Select the move to use
                let atk_msg = await thread.send({ content: `Select a move to use!`, components: [move_buttons, back_button]});
                db.profile.inc(user_id, 'turn_msg_counter');
                db.profile.inc(user_id, 'battle_msg_counter');
                const atk_collector = thread.createMessageComponentCollector({ max: 1 });   

                await atk_collector.on('collect', async atk => {

                    if (atk.customId == 'back') {
                        atk_collector.stop();
                        await atk_msg.delete();
                        db.profile.dec(user_id, 'turn_msg_counter');
                        db.profile.dec(user_id, 'battle_msg_counter');
                        await prompt_battle_input(thread, user_id);
                        return;
                    }

                    await atk_msg.delete();
                    db.profile.dec(user_id, 'turn_msg_counter');
                    db.profile.dec(user_id, 'battle_msg_counter');
                    let enemy_snare = !ooch_enemy.status_effects.includes(Status.Snare);
                    let enemy_speed = enemy_snare ? ooch_enemy.stats.spd / 100 : ooch_enemy.stats.spd;

                    let plr_snare = !ooch_plr.status_effects.includes(Status.Snare);
                    let plr_speed = plr_snare ? ooch_plr.stats.spd / 100 : ooch_plr.stats.spd;

                    if (ooch_plr.ability == Ability.Immobile) {
                        turn_order = ['e', 'p'];
                    } else if (ooch_enemy.ability == Ability.Immobile) {
                        turn_order = ['p', 'e'];
                    } else if (enemy_speed > plr_speed) { // Enemy goes first
                        turn_order = ['e', 'p']
                    } else { // Player goes first
                        turn_order = ['p', 'e'];
                    }

                    await thread.send(`# Turn ${db.profile.get(user_id, 'battle_turn_counter')}`);
                    db.profile.inc(user_id, 'turn_msg_counter');
                    db.profile.inc(user_id, 'battle_msg_counter');

                    for (let i = 0; i < turn_order.length; i++) {

                        let atk_id = atk.customId;
                        if (ooch_plr.ability === Ability.Uncontrolled) atk_id = _.sample(move_list);

                        if (turn_order[i] == 'p') {
                            // Player attacks enemy
                            [ooch_plr, ooch_enemy] = await attack(thread, user_id, atk_id, ooch_plr, ooch_enemy, '**------------ Player Turn ------------**');
                        } else {
                            // Enemy attacks player
                            atk_id = _.sample(ooch_enemy.moveset);
                            if (ooch_enemy.ability === Ability.Uncontrolled) atk_id = _.sample(ooch_enemy.moveset);
                            [ooch_enemy, ooch_plr] = await attack(thread, user_id, atk_id, ooch_enemy, ooch_plr, '**------------ Enemy Turn ------------**');
                        }

                        // Update ooch_enemy and ooch_plr in the database.
                        db.profile.set(user_id, ooch_plr, `ooch_party[${ooch_plr_profile.ooch_active_slot}]`);
                        db.profile.set(user_id, ooch_enemy, `ooch_enemy.ooch_party[${ooch_enemy_profile.ooch_active_slot}]`);

                        // Victory/Defeat Check
                        let victory_check = await victory_defeat_check(thread, user_id, ooch_enemy, ooch_plr);
                        if (victory_check == true) return;
                        
                        // The next user doesn't get a turn if we defeat their Oochamon
                        if (i == 0 && ((turn_order[i] == 'p' && ooch_enemy.current_hp <= 0) || (turn_order[i] == 'e' && ooch_plr.current_hp <= 0))) {
                            break;
                        }

                    }

                    //Apply Status Effects and other end of turn stuff
                    await end_of_round(thread, user_id, ooch_plr, ooch_enemy);
                    
                    //Double check for Victory/Defeat after status effects have happened
                    let victory_check = await victory_defeat_check(thread, user_id, ooch_enemy, ooch_plr);
                    if (victory_check == true) return;

                    // Prompt for more input
                    await prompt_battle_input(thread, user_id);

                });

            break;
            case 'switch':
                let ooch_inv = db.profile.get(user_id, 'ooch_party')
                let ooch_check, ooch_emote, ooch_name, ooch_hp, ooch_button_color, ooch_prev, ooch_disable;

                // Check if we have only 1 oochamon.
                if (ooch_inv.length == 1) {
                    thread.send('You only have 1 oochamon in your party, so you cannot switch.' +
                    '\nSelect a different action!');
                    db.profile.inc(user_id, 'turn_msg_counter');
                    db.profile.inc(user_id, 'battle_msg_counter');
                    
                    // Prompt for more input
                    await prompt_battle_input(thread, user_id);
                    return;
                }

                for (let i = 0; i < ooch_inv.length; i++) {
                    ooch_check = ooch_inv[i];
                    ooch_emote = db.monster_data.get([ooch_check.id], 'emote');
                    ooch_name = ooch_check.nickname;``
                    ooch_hp = `${ooch_check.current_hp}/${ooch_check.stats.hp} HP`;
                    ooch_button_color = ButtonStyle.Primary;
                    ooch_disable = false;

                    if (i == db.profile.get(user_id, 'ooch_active_slot')) {
                        ooch_button_color = ButtonStyle.Success;
                        ooch_prev = ooch_check;
                        ooch_disable = true;
                    }
                    else if (ooch_check.current_hp <= 0) {
                        ooch_disable = true;
                    }

                    ((i <= 1) ? switch_buttons_1 : switch_buttons_2).addComponents(
                        new ButtonBuilder()
                            .setCustomId(`${i}`)
                            .setLabel(`${ooch_name} (${ooch_hp})`)
                            .setStyle(ooch_button_color)
                            .setEmoji(ooch_emote)
                            .setDisabled(ooch_disable),
                    )
                }

                let switch_msg = await thread.send({ content: `**------------ Player Turn ------------**` + 
                `\nSelect the new Oochamon you want to switch in!`, components: (switch_buttons_2.components.length != 0) ? [switch_buttons_1, switch_buttons_2, back_button] : [switch_buttons_1, back_button] })
                db.profile.inc(user_id, 'turn_msg_counter');
                db.profile.inc(user_id, 'battle_msg_counter');

                const s_collector = thread.createMessageComponentCollector({ max: 1 });

                await s_collector.on('collect', async ooch_sel => {

                    if (ooch_sel.customId == 'back') {
                        s_collector.stop();
                        await switch_msg.delete();
                        db.profile.dec(user_id, 'turn_msg_counter');
                        db.profile.dec(user_id, 'battle_msg_counter');
                        await prompt_battle_input(thread, user_id);
                        return;
                    }
                        
                    await thread.send(`# Turn ${db.profile.get(user_id, 'battle_turn_counter')}`);
                    db.profile.inc(user_id, 'turn_msg_counter');
                    db.profile.inc(user_id, 'battle_msg_counter');

                    let ooch_pick = db.profile.get(user_id, `ooch_party[${parseInt(ooch_sel.customId)}]`)
                    let string_to_send = `You switched your active Oochamon from ${db.monster_data.get(ooch_prev.id, 'emote')} **${ooch_prev.nickname}** to ${db.monster_data.get(ooch_pick.id, 'emote')} **${ooch_pick.nickname}**.`;
                    displayEmbed = new EmbedBuilder()
                    displayEmbed.setColor('#0095ff')
                    displayEmbed.setTitle('↩️ Switch ↩️')

                    // Reset stat multipliers for oochamon being swapped
                    ooch_prev.stats.atk_mul = 0;
                    ooch_prev.stats.def_mul = 0;
                    ooch_prev.stats.spd_mul = 0;
                    ooch_prev.stats.acc_mul = 0;
                    ooch_prev.stats.eva_mul = 0;
                    ooch_prev.ability = ooch_prev.og_ability;
                    ooch_prev.type = ooch_prev.og_type;
                    ooch_prev.doom_timer = 3;
                    db.profile.set(user_id, ooch_prev, `ooch_party[${active_slot}]`);

                    // Check for on switch in abilities, player switching in, enemy ability activated
                    switch (ooch_enemy.ability) {
                        case Ability.Alert:
                            ooch_enemy = modify_stat(ooch_enemy, Stats.Attack, 1);
                            string_to_send += `\n${ooch_enemy.emote} **${ooch_enemy.nickname}**'s ability **Alert** raised its ATK from the new Oochamon switch!`;
                        break;
                        case Ability.Duplicant:
                            if (ooch_pick.ability !== Ability.InvalidEntry) {
                                ooch_enemy.ability = ooch_pick.ability;
                                string_to_send += `\n${ooch_enemy.emote} **${ooch_enemy.nickname}**'s copied its ability to **${_.startCase(db.ability_data.get(ooch_pick.ability, 'name'))}** through it's **Duplicant** ability!`;
                            }
                        break;
                        case Ability.Nullify:
                            ooch_pick.ability = Ability.Null;
                            string_to_send += `\n${ooch_pick.emote} **${ooch_pick.nickname}**'s ability changed to **Null** from the ability **Nullify** from ${ooch_enemy.emote} **${ooch_enemy.nickname}**!`
                        break;
                    }

                    // Check for on switch in abilities, player switching in, player ability activated
                    switch (ooch_pick.ability) {
                        case Ability.Boisterous:
                            ooch_enemy.current_hp = _.clamp(Math.floor(ooch_enemy.current_hp - ooch_enemy.stats.hp * 0.1), 1, ooch_enemy.stats.hp);
                            string_to_send += `\n${ooch_enemy.emote} **${ooch_enemy.nickname}** lost 10% of it's hp from the switch in ability **Boisterous**!`;
                        break;
                        case Ability.Gentle:
                            ooch_enemy = modify_stat(ooch_enemy, Stats.Attack, -1);
                        break;
                    }
                
                    ooch_pos = parseInt(ooch_sel.customId);
                    ooch_plr = ooch_pick;
                    db.profile.set(user_id, ooch_pos, 'ooch_active_slot');
                    // Update on switch in stats
                    ooch_plr = ability_stat_change(ooch_plr, ooch_plr_profile.ooch_party);
                    string_to_send += `\n${ooch_plr[1]}`;
                    ooch_plr = ooch_plr[0];

                    displayEmbed.setDescription(string_to_send)
                    await ooch_sel.update({ content: `**------------ Player Turn ------------**`, embeds: [displayEmbed], components: [] })

                    db.profile.set(user_id, ooch_plr, `ooch_party[${ooch_pos}]`);

                    // Enemy attacks player
                    let atk_id = ooch_enemy.moveset[_.random(0,ooch_enemy.moveset.length-1)];
                    [ooch_enemy, ooch_plr] = await attack(thread, user_id, atk_id, ooch_enemy, ooch_plr, '**------------ Enemy Turn ------------**');

                    //Apply Status Effects and other end of turn stuff
                    await end_of_round(thread, user_id, ooch_plr, ooch_enemy);                        

                    // Victory/Defeat Check
                    let victory_check = await victory_defeat_check(thread, user_id, ooch_enemy, ooch_plr, true);
                    if (victory_check == true) return;

                    // Prompt for more input
                    await prompt_battle_input(thread, user_id);

                });
            break;
            case 'bag':
                //#region
                let heal_inv = db.profile.get(user_id, 'heal_inv')
                let heal_inv_keys = Object.keys(heal_inv);
                let prism_inv = db.profile.get(user_id, 'prism_inv')
                let prism_inv_keys = Object.keys(prism_inv);
                let bag_select = new ActionRowBuilder();
                displayEmbed = new EmbedBuilder();
                
                if (heal_inv_keys.length == 0) bag_buttons.components[0].disabled = true;
                if (prism_inv_keys.length == 0) bag_buttons.components[1].disabled = true;
                if (heal_inv_keys.length == 0 && prism_inv_keys.length == 0) {
                    thread.send(`You don't have any items, so you can't use any!` +
                    `\nSelect a different action!`)

                    await prompt_battle_input(thread, user_id);
                    return;
                }

                let bag_msg = await thread.send({ content: `Select the item category you'd like to use an item in!`, components: [bag_buttons]});
                db.profile.inc(user_id, 'turn_msg_counter');
                db.profile.inc(user_id, 'battle_msg_counter');

                const b_collector = thread.createMessageComponentCollector({ componentType:  ComponentType.Button });
                let prism_collector;
                let heal_collector;

                await b_collector.on('collect', async i_sel => {

                    if (i_sel.customId == 'back') {
                        b_collector.stop();
                        await bag_msg.delete();
                        db.profile.dec(user_id, 'turn_msg_counter');
                        db.profile.dec(user_id, 'battle_msg_counter');
                        await prompt_battle_input(thread, user_id);
                        return;
                    }

                    if (prism_collector != undefined) prism_collector.stop();
                    if (heal_collector != undefined) heal_collector.stop();

                    if (i_sel.customId == 'heal_button') {
                        bag_select = new ActionRowBuilder();
                        let heal_select_options = [];
                        for (let i = 0; i < heal_inv_keys.length; i++) {
                            let id = heal_inv_keys[i];
                            let amount = db.profile.get(user_id, `heal_inv.${heal_inv_keys[i]}`)

                            heal_select_options.push({ 
                                label: `${db.item_data.get(id, 'name')} (${amount})`,
                                description: db.item_data.get(id, 'description'),
                                value: `${id}`,
                                emoji: db.item_data.get(id, 'emote'),
                            })
                        }

                        bag_select.addComponents(
                            new StringSelectMenuBuilder()
                                .setCustomId('heal_select')
                                .setPlaceholder('Select an item in your heal inventory to use!')
                                .addOptions(heal_select_options),
                        );

                        await i_sel.update({ content: `Select the healing item you'd like to use!`, components: [bag_select, bag_buttons] })

                        heal_collector = thread.createMessageComponentCollector({ componentType: ComponentType.StringSelect, max: 1 });

                        await heal_collector.on('collect', async item_sel => {
                            let item_id = item_sel.values[0];
                            let item_data = db.item_data.get(item_id);

                            if (db.profile.get(user_id, `heal_inv.${item_id}`) == undefined) return;

                            
                            ooch_plr = item_use(ooch_plr, item_id)
                            db.profile.set(user_id, ooch_plr, `ooch_party[${active_slot}]`);
                            displayEmbed.setColor('#02ff2c');
                            displayEmbed.setTitle(`❤️ Healing ❤️`)
                            displayEmbed.setDescription(`${item_data.emote} Used **${item_data.name}** and healed **${Math.ceil(ooch_plr.stats.hp * item_data.potency)}** HP!`)
                            item_sel.update({ content: `**------------ Player Turn ------------**`, embeds: [displayEmbed], components: []});
                            
                            db.profile.math(user_id, '-', 1, `heal_inv.${item_id}`)
                            if(db.profile.get(user_id, `heal_inv.${item_id}`) <= 0){
                                db.profile.delete(user_id, `heal_inv.${item_id}`);
                            }

                            b_collector.stop();
                            if (prism_collector != undefined) prism_collector.stop();
                            heal_collector.stop();

                            // Enemy attacks player
                            let atk_id = ooch_enemy.moveset[_.random(0,ooch_enemy.moveset.length-1)];
                            [ooch_enemy, ooch_plr] = await attack(thread, user_id, atk_id, ooch_enemy, ooch_plr, '**------------ Enemy Turn ------------**');

                            //Apply Status Effects and other end of turn stuff
                            await end_of_round(thread, user_id, ooch_plr, ooch_enemy);                        

                            // Victory/Defeat Check
                            let victory_check = await victory_defeat_check(thread, user_id, ooch_enemy, ooch_plr, true);
                            if (victory_check == true) return;

                            // Prompt for more input
                            await prompt_battle_input(thread, user_id);
                        });

                    } else if (i_sel.customId == 'prism_button') {

                        bag_select = new ActionRowBuilder();
                        let prism_select_options = [];
                        for (let i = 0; i < prism_inv_keys.length; i++) {
                            let id = prism_inv_keys[i];
                            let amount = db.profile.get(user_id, `prism_inv.${prism_inv_keys[i]}`)

                            prism_select_options.push({ 
                                label: `${db.item_data.get(id, 'name')} (${amount})`,
                                description: db.item_data.get(id, 'description').slice(0,25),
                                value: `${id}`,
                                emoji: db.item_data.get(id, 'emote'),
                            })
                        }

                        bag_select.addComponents(
                            new StringSelectMenuBuilder()
                                .setCustomId('prism_select')
                                .setPlaceholder('Select a prism you\'d like to use!')
                                .addOptions(prism_select_options),
                        );

                        await i_sel.update({ content: `Select a prism to use!`, components: [bag_select, bag_buttons] })

                        prism_collector = thread.createMessageComponentCollector({ componentType: ComponentType.StringSelect, max: 1 });

                        await prism_collector.on('collect', async item_sel => { 
                            let item_id = item_sel.values[0];
                            let item_data = db.item_data.get(item_id);
                            if (db.profile.get(user_id, `prism_inv.${item_id}`) == undefined) return;

                            let string_to_send = `${item_data.emote} Used a **${item_data.name}** on the ${db.monster_data.get(ooch_enemy.id, 'emote')} **${ooch_enemy.nickname}**`;
                            
                            db.profile.math(user_id, '-', 1, `prism_inv.${item_id}`)

                            if(db.profile.get(user_id, `prism_inv.${item_id}`) <= 0){
                                db.profile.delete(user_id, `prism_inv.${item_id}`);
                            }

                            let prism_result = item_use(ooch_enemy, item_id)
                            b_collector.stop();
                            prism_collector.stop();
                            if (heal_collector != undefined) heal_collector.stop();
                            
                            // Setup embed
                            displayEmbed.setColor('#f2d751');
                            displayEmbed.setTitle(`<:item_prism:1274937161262698536> Prism Throw <:item_prism:1274937161262698536>`)

                            // If we caught the Oochamon successfully
                            if (prism_result == true) { 
                                string_to_send += `\n\n**You successfully caught the wild ${ooch_enemy.nickname}!**`;

                                if (db.profile.get(user_id, 'ooch_party').length < 4) {
                                    string_to_send += `\nIt's been added to your party!\nYour playspace will appear momentarily.`;
                                } else {
                                    string_to_send += `\nIt's been added to your box.\nYour playspace will appear momentarily.`;
                                }

                                let user_profile = db.profile.get(user_id);
                                let ooch_party = user_profile.ooch_party;
                                // Distribute XP for a caught Oochamon
                                // The Oochamon in the active slot at the moment of beating the Oochamon gets 1.25x more EXP than the others.
                                exp_earned = battle_calc_exp(ooch_enemy.level, db.monster_data.get(ooch_enemy.id, 'evo_stage'), 1); //catching mons will always give 1x EXP
                                let exp_earned_main = Math.round(exp_earned * 1.25);
                                if (ooch_plr.level != 50) {
                                    string_to_send += `\n${db.monster_data.get(ooch_plr.id, 'emote')} **${ooch_plr.nickname}** earned **${Math.round(exp_earned * 1.25)} exp!**` + 
                                                        ` (EXP: **${_.clamp(ooch_plr.current_exp + exp_earned_main, 0, ooch_plr.next_lvl_exp)}/${ooch_plr.next_lvl_exp})**`
                                }
                                if (ooch_party.length !== 0) {
                                    string_to_send += `\nThe rest of your team earned **${exp_earned}** exp.`;
                                }

                                for (let i = 0; i < ooch_party.length; i++) {
                                    if (i == user_profile.ooch_active_slot) { 
                                        db.profile.math(user_id, '+', Math.round(exp_earned * 1.25), `ooch_party[${i}].current_exp`);
                                    } else { 
                                        db.profile.math(user_id, '+', (ooch_party[i].alive === false ? exp_earned : Math.round(exp_earned / 2)), `ooch_party[${i}].current_exp`); 
                                    }
                                    
                                    // Check for level ups
                                    let ooch_data = db.profile.get(user_id, `ooch_party[${i}]`)
                                    if (ooch_data.current_exp >= ooch_data.next_lvl_exp) { // If we can level up
                                        ooch_data = level_up(ooch_data);
                                        string_to_send += `\n${ooch_data[1]}`;
                                        await 1(user_id, ooch_data[0], `ooch_party[${i}]`)
                                    }
                                }

                                displayEmbed.setDescription(string_to_send)
                                await item_sel.update({ content: `**------------ Player Turn ------------**`, embeds: [displayEmbed], components: []});

                                // Heal the caught Oochamon when you catch it.
                                ooch_enemy.current_hp = ooch_enemy.stats.hp;

                                // Have it check here if you want to send the Oochamon to your party or not
                                if (db.profile.get(user_id, 'ooch_party').length < 4) {
                                    db.profile.push(user_id, ooch_enemy, `ooch_party`);
                                } else {
                                    db.profile.push(user_id, ooch_enemy, `ooch_pc`)
                                }
                                db.profile.math(user_id, '+', 1, `oochadex[${ooch_enemy.id}].caught`)
                                let infoEmbed = ooch_info_embed(ooch_enemy)
                                let oochPng = infoEmbed[1];
                                infoEmbed = infoEmbed[0];
                                infoEmbed.setAuthor({ name: 'Here\'s some information about the Oochamon you just caught!' })

                                // Wait a bit after finishing a battle to allow viewing info about Oochamon
                                await wait(10000);
                                await thread.send({ embeds: [infoEmbed], files: [oochPng] });
                                await db.profile.inc(user_id, 'turn_msg_counter');
                                await db.profile.inc(user_id, 'battle_msg_counter');
                                await finish_battle(thread, user_id);

                                return;
                            } else {
                                string_to_send += `\n\nUnfortunately, your prism catch attempt failed...`;
                                displayEmbed.setDescription(string_to_send);
                                await item_sel.update({ content: `**------------ Player Turn ------------**`, embeds: [displayEmbed], components: []}).catch(() => {});
                            }

                            // Enemy attacks player
                            let atk_id = ooch_enemy.moveset[_.random(0,ooch_enemy.moveset.length-1)];
                            [ooch_enemy, ooch_plr] = await attack(thread, user_id, atk_id, ooch_enemy, ooch_plr, '**------------ Enemy Turn ------------**');

                            //Apply Status Effects and other end of turn stuff
                            await end_of_round(thread, user_id, ooch_plr, ooch_enemy);                        

                            // Victory/Defeat Check
                            let victory_check = await victory_defeat_check(thread, user_id, ooch_enemy, ooch_plr, true);
                            if (victory_check == true) return;

                            // Prompt for more input
                            await prompt_battle_input(thread, user_id);
                        });
                    } 

                });
                //#endregion
            break;
            case 'run':
                if ((ooch_plr.stats.spd + ooch_plr.level * 15) / ((ooch_plr.stats.spd + ooch_plr.level * 10) + (ooch_enemy.stats.spd + ooch_enemy.level * 10) ) > Math.random()) {
                    await wait(battleSpeed);
                    await thread.send(`**------------ Player Turn ------------**` +
                    `\nYou successfully ran away!\nYour playspace will appear momentarily.`);
                    await db.profile.inc(user_id, 'turn_msg_counter');
                    await db.profile.inc(user_id, 'battle_msg_counter');
                    await finish_battle(thread, user_id);
                    return;
                } else {
                    await wait(battleSpeed);
                    await thread.send(`**------------ Player Turn ------------**` + 
                    `\nYou failed to run away!`)
                    await db.profile.inc(user_id, 'turn_msg_counter');
                    await db.profile.inc(user_id, 'battle_msg_counter');

                    // Enemy attacks player
                    let atk_id = ooch_enemy.moveset[_.random(0,ooch_enemy.moveset.length-1)];
                    [ooch_enemy, ooch_plr] = await attack(thread, user_id, atk_id, ooch_enemy, ooch_plr, '**------------ Enemy Turn ------------**');

                    //Apply Status Effects and other end of turn stuff
                    await end_of_round(thread, user_id, ooch_plr, ooch_enemy);

                    // Victory/Defeat Check
                    let victory_check = await victory_defeat_check(thread, user_id, ooch_enemy, ooch_plr, true);
                    if (victory_check == true) return;

                    // Prompt for more input
                    await prompt_battle_input(thread, user_id);
                }
            break;
            case 'info':
                let plrOochPrisms = '';
                for (let ooch of ooch_plr_profile.ooch_party) {
                    plrOochPrisms += ooch.alive ? '<:item_prism:1274937161262698536>' : `❌`;
                }

                let enemyOochPrisms = '';
                for (let ooch of ooch_enemy_profile.ooch_party) {
                    enemyOochPrisms += ooch.alive ? '<:item_prism:1274937161262698536>' : `❌`;
                }

                let oochInfoFields = [];
                const formatStatBar = (stat) => {
                    return `${stat > 0 ? '▲' : '▼'}`.repeat(stat) + '○'.repeat(8 - stat);
                };

                // Setup field info for the embed about both oochamon
                for (let ooch of [ooch_plr, ooch_enemy]) {
                    let oochStatusEffects = ooch.status_effects.map(v => db.status_data.get(v, 'emote'));
                    
                    let infoStr = `**Oochamon Left:** ${oochInfoFields.length == 0 ? plrOochPrisms : enemyOochPrisms}\n` +
                                `**Type:** ${type_to_emote(ooch.type)} **${ooch.type.map(v => _.capitalize(v)).join(' | ')}**\n` +
                                `**Ability:** ${db.ability_data.get(ooch.ability, 'name')}\n` +
                                `**Status Effects:** ${oochStatusEffects.length != 0 ? `${oochStatusEffects.join('')}` : `None`}\n\n` +
                                `**Stat Changes:**\n` +
                                `Atk: ${formatStatBar(ooch.stats.atk_mul)}\n` +
                                `Def: ${formatStatBar(ooch.stats.def_mul)}\n` +
                                `Spd: ${formatStatBar(ooch.stats.spd_mul)}\n` +
                                `Eva: ${formatStatBar(ooch.stats.eva_mul)}\n` +
                                `Acc: ${formatStatBar(ooch.stats.acc_mul)}\n`;

                    if (ooch != ooch_enemy) {
                        let moveset_str = ``;
                        for (let move_id of ooch.moveset) {
                            let move = db.move_data.get(move_id);
                            move.accuracy = Math.abs(move.accuracy);
                            if (move.damage !== 0) {
                                moveset_str += `${type_to_emote(move.type)} **${move.name}**: **${move.damage}** power, **${move.accuracy}%** accuracy\n`;
                            } else {
                                moveset_str += `${type_to_emote(move.type)} **${move.name}**: **${move.accuracy}%** accuracy\n`;
                            }
                        }
                        infoStr += `\n**${ooch.emote} ${ooch.nickname}'s Moveset:**\n${moveset_str}`;
                    }

                    oochInfoFields.push({
                        name: `${ooch == ooch_plr ? 'Player' : 'Enemy'} (Lv. ${ooch.level} ${ooch.emote} ${ooch.nickname})`,
                        value: infoStr,
                        inline: true,
                    });
                }


                let battleInfoEmbed = new EmbedBuilder()
                    .setTitle('Battle Information 📒')
                    .setDescription(`**Turn #${ooch_plr_profile.battle_turn_counter}**\n`)
                    .addFields(oochInfoFields)
                let info_msg = await thread.send({ content: null, embeds: [battleInfoEmbed], components: [back_button]});

                const info_collector = thread.createMessageComponentCollector({ componentType:  ComponentType.Button });
                await info_collector.on('collect', async i_sel => {
                    switch (i_sel.customId) {
                        case 'back':
                            info_collector.stop();
                            await info_msg.delete();
                            await prompt_battle_input(thread, user_id);
                        break;
                    }
                });
            break;
        }
    });
    }
},

/**
 * An algorithm that handles calculating the raw amount of damage a move will do.
 * Takes abilities into account as well here. Mainly used in the attack function.
 * @param {Number} move_damage How much damage the move is doing
 * @param {String} move_type The type of the move
 * @param {Object} ooch_attacker The data of the Oochamon attacking
 * @param {Object} ooch_defender The data of the Oochamon defending
 * @param {Number} turn_count The amount of turns in the battle (used for Gravity ability)
 * @returns The amount of damage the move will do.
 */
battle_calc_damage: function(move_damage, move_type, ooch_attacker, ooch_defender, turn_count) {
    const { get_stat_multiplier } = require('./func_battle.js');

    let attacker_atk_stat = ooch_attacker.stats.atk * get_stat_multiplier(ooch_attacker.stats.atk_mul)
    let defender_def_stat = ooch_defender.stats.def * get_stat_multiplier(ooch_defender.stats.def_mul);

    if (ooch_attacker.ability == Ability.Bipolar) {
        attacker_atk_stat = ooch_attacker.stats.def * get_stat_multiplier(ooch_attacker.stats.def);
    }

    let damage = Math.round(Math.ceil((4 * ooch_attacker.level / 5 + 2) // Level Adjustment
    * (move_damage + _.random(-5, 5)) // Damage with random damage variance
    * (ooch_attacker.ability == Ability.Gravity ? (turn_count / 100) + 1 : 1)
    * (ooch_attacker.ability == Ability.Hexiply ? ((Math.floor((ooch_attacker.current_hp / ooch_attacker.stats.hp) * 6) * 6) / 100) + 1 : 1)
    * (ooch_attacker.ability == Ability.Focused && ooch_attacker.status_effects.length == 0 ? 1.1 : 1)
    * (ooch_attacker.ability == Ability.Corrosive ? (_.clamp(defender_def_stat, 0, 300) / 10) + 1 : 1)
    * (ooch_attacker.ability == Ability.Hearty && ooch_attacker.current_hp > ooch_attacker.stats.hp / 2 ? 1.15 : 1)
    * (ooch_attacker.ability == Ability.Riposte ? 1.2 : 1)
    * (ooch_defender.ability == Ability.Parry ? 0.8 : 1)
    * attacker_atk_stat / defender_def_stat) 
    / 50 + 2);

    switch (move_type) {
        case OochType.Ooze: 
            if (ooch_attacker.ability == Ability.Icky) damage *= 1.2
            if (ooch_attacker.ability == Ability.Crystallize) damage *= 1.3; break;
        case OochType.Fungal:
            if (ooch_attacker.ability == Ability.Icky) damage *= 1.2; break;
        case OochType.Flame:
            if (ooch_attacker.ability == Ability.Warm) damage *= 1.1;
            if (ooch_defender.ability == Ability.Moist) damage *= 0.5;
            if (ooch_attacker.ability == Ability.Crystallize) damage *= 1.3; 
            if (ooch_attacker.ability == Ability.PowerConduit && (ooch_defender.type.includes(OochType.Ooze) || ooch_defender.type.includes(OochType.Tech))) damage *= 1.5; break;
        case OochType.Stone:
            if (ooch_attacker.ability == Ability.Burrower) damage *= 1.1;
            if (ooch_defender.ability == Ability.Armored) damage *= 0.8;
            if (ooch_attacker.ability == Ability.Crystallize) damage *= 1.3; break;
        case OochType.Tech:
            if (ooch_attacker.ability == Ability.LiquidCooled) damage *= 1.25; break;
    }

    damage = Math.round(damage);
    damage = _.clamp(damage, 1, ooch_defender.current_hp)
    return damage;
},

/**
 * Calculates the amount of EXP earned when defeating an Oochamon of a certain level and evolution stage.
 * @param {Number} enemy_level The level of the opposing Oochamon
 * @param {Number} enemy_evo_stage The evolution stage of the opposing Oochamon
 * @returns A number of the amount of EXP earned
 */
battle_calc_exp: function(enemy_level, enemy_evo_stage, bonus_multiplier = 1) {
    return Math.round((bonus_multiplier * (1.015 ** enemy_level) * (2 ** enemy_evo_stage) * 8 * enemy_level * (_.random(90, 100)/100)) + 5);
},

/**
 * Calculates the amount of EXP needed for the next level up for an Oochamon.
 * @param {Number} level The level of the Oochamon
 * @returns The amount of EXP needed for the next level
 */
exp_to_next_level: function(level) {
    if (level >= 50) return (level ** 3) + 1_000_000_000_000;
    return (level ** 3);
},

/**
 * Gives a set of stats for an Oochamon, adjusted by level and specific IVs.
 * @param {String} species_id The ID of the Oochamon
 * @param {Number} level The level of the Oochamon
 * @param {Number} hp_iv The HP IV of the Oochamon 
 * @param {Number} atk_iv The Attack IV of the Oochamon
 * @param {Number} def_iv The Defense IV of the Oochamon
 * @param {Number} spd_iv The Speed IV of the Oochamon
 * @returns An array for each stat, adjusted by level and IVs.
 */
get_stats: function(species_id, level, hp_iv, atk_iv, def_iv, spd_iv) {
    let base_hp = db.monster_data.get(species_id, Stats.HP)
    let base_atk = db.monster_data.get(species_id, Stats.Attack)
    let base_def = db.monster_data.get(species_id, Stats.Defense)
    let base_spd = db.monster_data.get(species_id, Stats.Speed)
    let iv_influence = .025
    let base_influence1 = 12
    let base_influence2 = .5

    let hp =    Math.floor(((level * ((base_hp *  base_influence1) *  ((hp_iv *  iv_influence) + 1)))/100 + (base_hp *  base_influence2)) + level + 10);
    let atk =   Math.floor(((level * ((base_atk * base_influence1) *  ((atk_iv * iv_influence + 1))))/100 + (base_atk * base_influence2)) + level + 5);
    let def =   Math.floor(((level * ((base_def * base_influence1) *  ((def_iv * iv_influence + 1))))/100 + (base_def * base_influence2)) + level + 5);
    let spd =   Math.floor(((level * ((base_spd * base_influence1) *  ((spd_iv * iv_influence + 1))))/100 + (base_spd * base_influence2)) + level + 5);
    return [hp, atk, def, spd];
},

/**
 * Converts a type string to an emote for that type.
 * @param {Array} type_array The type array to turn into a type string
 * @param {Boolean} text_emote Whether you want text emotes or icon emotes for the type
 * @returns The emote string
 */
type_to_emote: function(type_array, text_emote = false) {
    let return_string = '';

    if (!Array.isArray(type_array)) {
        type_array = [type_array];
    }

    for (let type of type_array) {
        switch(type) {
            case OochType.Flame:   return_string +=  text_emote ? '<:icon_flame_txt:1274936258811920414>'   : '<:icon_flame:1274936249484050472>';   break;
            case OochType.Fungal:  return_string +=  text_emote ? '<:icon_fungal_txt:1274936284497969203>'  : '<:icon_fungal:1274936267884199947>';  break;
            case OochType.Magic:   return_string +=  text_emote ? '<:icon_magic_txt:1274936569790468096>'   : '<:icon_magic:1274936558595866787>';   break;
            case OochType.Stone:   return_string +=  text_emote ? '<:icon_stone_txt:1274936655236563055>'   : '<:icon_stone:1274936641433243781>';   break;
            case OochType.Neutral: return_string +=  text_emote ? '<:icon_neutral_txt:1274936596155863080>' : '<:icon_neutral:1274936582583091210>'; break;
            case OochType.Ooze:    return_string +=  text_emote ? '<:icon_ooze_txt:1274936617320316928>'    : '<:icon_ooze:1274936607136288810>';    break;
            case OochType.Tech:    return_string +=  text_emote ? '<:icon_tech_txt:1274936688589803613>'    : '<:icon_tech:1274936672022298624>';    break;
            case OochType.Void:    return_string +=  text_emote ? '<:icon_void_txt:1274936717383569409>'    : '<:icon_void:1274936702959485011>';    break;
        }
    }

    return return_string;
},

/**
 * Converts an Oochamon type array to a string.
 * @param {Array} type The Oochamon's types in an array
 * @param {Boolean} do_capitalize If the type should be capitalized
 * @returns The type array, now in the form of a string separated by "/"
 */
type_to_string: function(type, do_capitalize = true) {
    if (!Array.isArray(type)) type = [type];
    if (do_capitalize) type = type.map(v => _.capitalize(v));
    type = type.join('/');
    return type;
},

/**
 * A helper function that handles doing an attack and using a move on
 * another Oochamon in an Oochamon battle.
 * @param {Object} thread The thread Oochamon is being played in.
 * @param {String} user_id The user id of the user playing Oochamon.
 * @param {String} atk_id The ID of the attack being used
 * @param {Object} attacker The Oochamon data of the attacker
 * @param {Object} defender The Oochamon data of the defender
 * @param {String} header The header string displaying whos turn it is in the battle
 * @returns An array of the attacker and defender Oochamon data, after the attacks.
 */
attack: async function(thread, user_id, atk_id, attacker, defender, header) {
    const { type_effectiveness, battle_calc_damage, modify_stat, add_status_effect, type_to_emote, get_stat_multiplier } = require('./func_battle.js');
    let move_effect =   db.move_data.get(atk_id, 'effect');
    let ogMoveId = atk_id;
    if (move_effect == 'random') {
        atk_id = _.sample(db.move_data.keyArray());
        move_effect =   db.move_data.get(atk_id, 'effect');
    }
    let move_name =     db.move_data.get(atk_id, 'name');
    let move_type =     db.move_data.get(atk_id, 'type');
    let move_damage =   db.move_data.get(atk_id, 'damage');
    let move_accuracy = db.move_data.get(atk_id, 'accuracy');
    let move_effect_chance =   db.move_data.get(atk_id, 'effect_chance');
    if (move_effect == 'typematch') move_type = _.sample(defender.type);
    let move_type_emote =      type_to_emote(move_type);
    let type_multiplier = move_damage == 0 ? [1, ''] : type_effectiveness(move_type, defender.type); //Returns [multiplier, string] 
    let crit_multiplier = (Math.random() > (0.95 - (move_effect == 'critical' ? move_effect_chance/100 : 0) - (attacker.ability === Ability.HeightAdvantage ? 0.1 : 0)) ? 2 : 1);
    if (move_damage <= 0) { crit_multiplier = 1; } // Disable the crit text for non-damaging moves
    let status_blind = (attacker.status_effects.includes(Status.Blind) ? .65 : 1);
    let status_doubled = (defender.status_effects.includes(Status.Double) ? 2 : 1);
    let recoil_damage = Math.round((move_effect == 'recoil' ? move_effect_chance/100 : 0) * attacker.stats.hp);
    let vampire_heal = (move_effect == 'vampire' ? move_effect_chance/100 : 0);
    let move_heal = (move_effect == 'heal' ? move_effect_chance / 100 : 0);
    let reflect_dmg = 0;
    let attacker_emote = db.monster_data.get(attacker.id, 'emote');
    let defender_emote = db.monster_data.get(defender.id, 'emote');
    let defender_field_text = ``;
    let string_to_send = ``;
    let ability_dmg_multiplier = 1;
    let battleSpeed = db.profile.get(user_id, 'settings.battle_speed')
    let selfTarget = move_accuracy < 0;

    // If 2 Oochamon are the same, then pre-pend Player and Enemy to differentiate them
    let atkOochName = attacker.nickname;
    let defOochName = defender.nickname;
    if (atkOochName == defOochName) {
        if (header.includes('Player')) {
            atkOochName = `Player's ${attacker.nickname}`;
            defOochName = `Enemy's ${defender.nickname}`;
        } else {
            atkOochName = `Enemy's ${attacker.nickname}`;
            defOochName = `Player's ${defender.nickname}`;
        }
    }

    move_accuracy = Math.abs(move_accuracy);
    if (attacker.ability == Ability.Rogue && defender.current_hp === defender.stats.hp) {
        ability_dmg_multiplier = 2;
    }

    let displayEmbed = new EmbedBuilder()
    .setColor(header.includes('Player') ? '#00ff80' : '#ffaa00')
    .setTitle(`⚔️ Attack ⚔️`)

    let dmg = 0;
    if (move_damage != 0) {
        dmg = battle_calc_damage(move_damage * type_multiplier[0] * status_doubled * ability_dmg_multiplier, 
                                move_type, attacker, defender, db.profile.get(user_id, 'battle_turn_counter')) * crit_multiplier;
    }
    vampire_heal = Math.round(vampire_heal * dmg); //used later
    
    // Remove doubled status effect
    if (status_doubled != 1) {
        defender.status_effects = defender.status_effects.filter(v => v !== Status.Double);
    }

    // If the defender has Vanish AND the attack is not self targeting, it should fail
    let chance_to_hit = move_accuracy/100 * get_stat_multiplier(attacker.stats.acc_mul - defender.stats.eva_mul, 3)
    if (((chance_to_hit * status_blind > Math.random()) || (defender.ability == 'Immense')) && !(defender.status_effects.includes(Status.Vanish) && selfTarget === false)) {
        // Take damage and heal from move effects
        defender.current_hp -= dmg
        defender.current_hp = _.clamp(defender.current_hp, 0, defender.stats.hp);

        attacker.current_hp += Math.round(vampire_heal * attacker.current_hp);
        attacker.current_hp += Math.round(attacker.stats.hp * move_heal);
        attacker.current_hp -= recoil_damage;
        attacker.current_hp = _.clamp(attacker.current_hp, 0, attacker.stats.hp)

        // When the Oochamon attacker hits the defender and we aren't targetting ourself
        if (selfTarget === false && dmg !== 0) {
            switch (attacker.ability) {
                case Ability.Leech:
                    attacker.current_hp = _.clamp(attacker.current_hp + Math.round(dmg * 0.1), 0, attacker.stats.hp); 
                    defender_field_text += `\n--- ${attacker_emote} **${atkOochName}** gained **${Math.ceil(dmg * 0.1)} HP** from its ability **Leech**!`
                break;
                case Ability.Ensnare:
                    if (check_chance(30)) {
                        defender = add_status_effect(defender, Status.Snare);
                        defender_field_text += `\n--- ${defender_emote} **${defOochName}** was **SNARED** on hit from the ability **Ensnare**!`;
                    }
                break;
                case Ability.Lacerating:
                    defender.current_hp = _.clamp(defender.current_hp + Math.round(dmg * 0.05), 0, defender.stats.hp);
                    defender_field_text += `\n--- ${defender_emote} **${defOochName}** lost 5% of their HP from the ability **Lacerating**!`;
                break;
                case Ability.Frostbite:
                    modify_stat(defender, Stats.Speed, -1);
                    defender_field_text += `\n--- ${defender_emote} **${defOochName}** had its SPD lowered from the ability **Frostbite**!`;
                break;
                case Ability.StringsAttached:
                    if (check_chance(20)) {
                        let randomStatus = _.sample([Status.Burn, Status.Blind, Status.Infect, Status.Snare]);
                        defender = add_status_effect(defender, randomStatus);
                        let statusName = db.status_data.get(randomStatus, 'name');
                        defender_field_text += `\n--- ${defender_emote} **${defOochName}** was **${_.upperCase(statusName)}** on hit from the ability **Strings Attached!**`;
                    }
                break;
                case Ability.Riposte:
                    attacker.ability = Ability.Parry;
                    defender_field_text += `\n--- ${attacker_emote} **${atkOochName}** changed its stance, and shifted its ability to **Parry**!`;
                break;
            }
            
            // When the Oochamon defender gets hit by the attacker
            switch (defender.ability) {
                case Ability.Reactive:
                    attacker.current_hp = _.clamp(attacker.current_hp - Math.round(attacker.stats.hp * 0.1), 0, attacker.stats.hp)
                    reflect_dmg = Math.round(attacker.stats.hp * 0.1);
                break;
                case Ability.Shadow:
                    if (check_chance(20)) {
                        defender_field_text += `\n--- ${defender_emote} **${defOochName}** **VANISHED** after being hit using its ability **Shadow**!`;
                        defender = add_status_effect(defender, Status.Vanish);
                    }
                break;
                case Ability.Tangled:
                    attacker = add_status_effect(attacker, Status.Snare);
                    defender_field_text += `\n--- ${attacker_emote} **${atkOochName}** was **SNARED** by ${defender_emote} **${defOochName}**s ability **Tangled**!`;
                break;
                case Ability.Flammable:
                    if (move_type === OochType.Flame) {
                        defender = modify_stat(defender, Stats.Attack, 1);
                        defender_field_text += `\n--- ${defender_emote} **${defOochName}** raised its ATK after being hit using its ability **Flammable**!`; 
                    }
                break;
                case Ability.Parry:
                    defender.ability = Ability.Riposte;
                    defender_field_text += `\n--- ${defender_emote} **${defOochName}** changed its stance, and shifted its ability to **Riposte**!`;
                break;
            }
        }

        if (ogMoveId !== atk_id) {
            string_to_send += `\n🎲 **${db.move_data.get(ogMoveId, 'name')}** changed into **${move_name}**!\n`;
        }

        if (move_effect == 'typematch') {
            string_to_send += `\n✨ **${move_name}** changed into the ${defender_emote} **${defOochName}**'s type, **${move_type_emote}** **${_.capitalize(move_type)}**!\n`
        }

        string_to_send += `\n${attacker_emote} **${atkOochName}** ${attacker.ability === Ability.Uncontrolled ? 'is uncontrollable and randomly used' : 'used'} **${move_type_emote}** **${move_name}**!`;
        if (dmg !== 0) string_to_send += `\n--- ${defender_emote} **${defOochName}** took **${dmg} damage**!`;
        
        //If a crit lands
        if (crit_multiplier >= 2) {
            string_to_send += `\n--- 💢 **A critical hit!**`
        }

        //If an attack has vampire
        if (vampire_heal > 0) {
            string_to_send += `\n--- 🩸 ${attacker_emote} **${atkOochName}** leeched **${vampire_heal}** HP from ${defender_emote} **${defOochName}**!`;
        }

        //If an attack has heal
        if (move_heal > 0) {
            string_to_send += `\n--- ❤️ ${attacker_emote} **${atkOochName}** healed **${Math.round(attacker.stats.hp * move_heal)}** HP!`;
        }

        //If attack has recoil
        if (recoil_damage > 0) {
            string_to_send += `\n--- 💥 ${attacker_emote} **${atkOochName}** lost **${recoil_damage}** HP from recoil!`
        }

        // If attack has reflect damage
        if (reflect_dmg > 0) {
            string_to_send += `\n--- 🪞 ${attacker_emote} **${atkOochName}** took **${reflect_dmg}** reflect damage from ${defender_emote} **${defOochName}**'s ability **Reactive**!`
        }

        //Type effectiveness
        string_to_send += type_multiplier[1];

        if (move_effect !== -1) {
            let status_effect_arr = move_effect.split('|')
            for (let eff of status_effect_arr) {
                let status_target = selfTarget ? attacker : defender;
                let status_target_emote = selfTarget ? attacker_emote : defender_emote;
                let statStatus = false;
                statStatus = eff.includes('+') || eff.includes('-');

                if (selfTarget !== false) {
                    // Change move_effect_chance based on abilities
                    switch (attacker.ability) {
                        case Ability.Scorching:
                            if (eff == Status.Burn) move_effect_chance = 100;
                        break;
                        case Ability.LiquidCooled:
                            if (eff == Status.Burn) move_effect_chance = 0;
                        break;
                    }

                    if (statStatus === false) {
                        switch (defender.ability) {
                            case Ability.Mundane:
                                move_effect_chance = 0;
                            break;
                        }
                    }
                }

                // Apply move effects
                if (Math.random() < move_effect_chance/100 && move_effect_chance > 0) { 
                    let status_split = eff.split('_')
                    let status_adds = [eff];

                    // +_def_1 is the format
                    if (status_split[0] == '+'){
                        let prevStatValue = status_target.stats[`${status_split[1]}_mul`];
                        status_target = modify_stat(status_target, status_split[1], parseInt(status_split[2]));
                        let newStatValue = status_target.stats[`${status_split[1]}_mul`];
                        if (prevStatValue !== status_target.stats[`${status_split[1]}_mul`]) {
                            defender_field_text += `\n--- ${status_target_emote} **${status_target.nickname}** raised its **${_.upperCase(status_split[1])}**\n` + 
                            `--- **New ${_.upperCase(status_split[1])}: ${newStatValue >= 1 ? `+` : ``}${newStatValue}**`;
                        } else {
                            defender_field_text += `\n--- ${status_target_emote} **${status_target.nickname}** cannot have its **${_.upperCase(status_split[1])}** raised any further!`;
                        }
                    }
                    else if (status_split[0] == '-'){
                        let prevStatValue = status_target.stats[`${status_split[1]}_mul`];
                        status_target = modify_stat(status_target, status_split[1], -parseInt(status_split[2]));
                        let newStatValue = status_target.stats[`${status_split[1]}_mul`];
                        if (prevStatValue !== status_target.stats[`${status_split[1]}_mul`]) {
                            defender_field_text += `\n--- ${status_target_emote} **${status_target.nickname}** had its **${_.upperCase(status_split[1])}** lowered!\n` + 
                            `--- **New ${_.upperCase(status_split[1])}: ${newStatValue >= 1 ? `+` : ``}${Math.round(newStatValue)}**`;
                        } else {
                            defender_field_text += `\n--- ${status_target_emote} **${status_target.nickname}** cannot have its **${_.upperCase(status_split[1])}** lowered any further!`;
                        }
                    }
                    else if (db.status_data.keyArray().includes(eff)) {
                        // Setup list of status effects to add
                        switch (status_target.ability) {
                            case Ability.Darkbright:
                                switch (eff) {
                                    case Status.Burn: status_adds.push(Status.Blind);
                                    case Status.Blind: status_adds.push(Status.Burn);
                                }
                            break;
                            case Ability.Radiant:
                                switch (eff) {
                                    case Status.Infect: status_adds.push(Status.Burn);
                                    case Status.Burn: status_adds.push(Status.Infect);
                                }
                            break;
                        }

                        // Remove duplicates
                        status_adds = status_adds.filter((item, index) => status_adds.indexOf(item) === index);     

                        defender_field_text += `\n--- The opposing ${status_target_emote} **${status_target.nickname}** was **${eff.toUpperCase()}!**`
                        status_target.status_effects.push(status_adds);
                        status_target.status_effects = status_target.status_effects.flat(1);
                        status_target.status_effects = status_target.status_effects.filter((item, index) => status_target.status_effects.indexOf(item) === index);     
                    } else if (eff == 'clear_status') {
                        status_target.status_effects = [];
                        defender_field_text += `\n--- ${status_target.emote} **${status_target.nickname}** had its status effects cleared!`;
                    } else if (eff == 'clear_stat_stages') {
                        status_target.stats.atk_mul = 0;
                        status_target.stats.def_mul = 0;
                        status_target.stats.spd_mul = 0;
                        status_target.stats.acc_mul = 0;
                        status_target.stats.eva_mul = 0;
                        defender_field_text += `\n--- ${status_target.emote} **${status_target.nickname}** had its stats set back to normal!`;
                    }
                }
            }
        }
    // If the attack misses
    } else {
        string_to_send += `\n${attacker_emote} **${atkOochName}** tried to use ${move_name} but it missed!`
        if (defender.status_effects.includes(Status.Vanish)) {
            defender.status_effects = defender.status_effects.filter(v => v !== Status.Vanish);
            string_to_send += `\n--- ${defender_emote} **${defOochName}** reappeared and lost its **VANISHED** status!`
        }
    }

    // Check if opposing Oochamon is dead
    if (defender.current_hp <= 0) {
        defender_field_text += `\n--- 🪦 ${defender_emote} **${defOochName}** fainted!`
        defender.alive = false;
        
        // Attacker oochamon on kill ability triggers
        switch (attacker.ability) {
            case Ability.Energized:
                attacker = modify_stat(attacker, Stats.Attack, 1);
                attacker = modify_stat(attacker, Stats.Speed, 1);
                defender_field_text += `\n${attacker_emote} **${atkOochName}** was energized from the kill and gained a boost in attack and speed from its ability **Energized**!`;
            break;
            case Ability.InvalidEntry:
                // 34 is the ID of i_
                db.monster_data.set('34', 1, 'atk');
                db.monster_data.set('34', 1, 'def');
                db.monster_data.set('34', 1, 'spd');
                db.monster_data.set('34', 1, 'hp');
            break;
        }

        // Opposing oochamon death ability triggers
        switch (defender.ability) {
            case Ability.Haunted:
                attacker = add_status_effect(attacker, Status.Doom);
                defender_field_text += `\n${attacker_emote} **${atkOochName}** was **DOOMED** from ${defender_emote} **${defOochName}**'s ability **Haunted**!`;
            break;
            case Ability.Ravenous:
                attacker.current_hp += _.clamp(attacker.current_hp + (attacker.stats.hp * 0.2), 0, attacker.stats.hp);
                defender_field_text += `\n${attacker_emote} **${atkOochName}** healed 20% HP back from its ability **Ravenous**!`;
            break;
            case Ability.Sporespray:
                attacker = add_status_effect(attacker, Status.Infect);
                defender_field_text += `\n${attacker_emote} **${atkOochName}** was **INFECTED** from ${defender_emote} **${defOochName}**'s ability **Sporespray**!`;
            break;
            case Ability.InvalidEntry:
                // 34 is the ID of i_
                db.monster_data.inc('34', 'atk');
                db.monster_data.inc('34', 'def');
                db.monster_data.inc('34', 'spd');
                db.monster_data.inc('34', 'hp');
            break;
            case Ability.EasyGo:
                defender_field_text += `\n💖 Healed the rest of ${defender_emote} **${defOochName}**'s team by **20%** due to its ability **Easy Go**!`;
            break;
            case Ability.Bomber:
                attacker.current_hp = _.ceil(attacker.current_hp / 2);
                defender_field_text += `\n${attacker_emote} **${atkOochName}** had its current HP halved from ${defender_emote} **${defOochName}**'s ability **Bomber**!`;
            break;
        }
    }

    
    displayEmbed.setDescription(`${string_to_send}${defender_field_text}`);

    await wait(battleSpeed);
    await thread.send({ content: header, embeds: [displayEmbed] });
    db.profile.inc(user_id, 'turn_msg_counter');
    db.profile.inc(user_id, 'battle_msg_counter');

    return [attacker, defender];

},

/**
 * A helper function for type effectiveness, takes 2 types and figures out the
 * attack multiplier for the attacking type based on the defending type.
 * @param {String} attack_type The type that is attacking
 * @param {Array} target_type The type that is defending
 * @returns An array with structured like [attack_multiplier, attack_string]
 */
type_effectiveness: function(attack_type, target_type) {
    let multiplier = 1;
    let string = '';

    for (let type_defender of target_type) {
        switch(attack_type){
            case OochType.Neutral:
                switch(type_defender){
                    case OochType.Magic: multiplier *= .5; break;
                }
            break;
            case OochType.Fungal:
                switch(type_defender){
                    case OochType.Flame:   multiplier *= .5; break;
                    case OochType.Fungal:  multiplier *= .5; break;
                    case OochType.Stone:   multiplier *= 2; break;
                    case OochType.Ooze:    multiplier *= 2; break;
                }
            break;
            case OochType.Flame:
                switch(type_defender){
                    case OochType.Ooze:    multiplier *= .5; break;
                    case OochType.Flame:   multiplier *= .5; break;
                    case OochType.Stone:   multiplier *= .5; break;
                    case OochType.Void:    multiplier *= 2; break;
                    case OochType.Fungal:  multiplier *= 2; break;
                }
            break;
            case OochType.Stone:
                switch(type_defender){
                    case OochType.Ooze:    multiplier *= .5; break;
                    case OochType.Tech:    multiplier *= 2; break;
                    case OochType.Flame:   multiplier *= 2; break;
                }
            break;
            case OochType.Tech:
                switch(type_defender){
                    case OochType.Magic:   multiplier *= .5; break;
                    case OochType.Ooze:    multiplier *= .5; break;
                    case OochType.Fungal:  multiplier *= 2; break;
                    case OochType.Stone:   multiplier *= 2; break;
                }
            break;
            case OochType.Ooze:
                switch(type_defender){
                    case OochType.Fungal:  multiplier *= .5; break;
                    case OochType.Ooze:    multiplier *= .5; break;
                    case OochType.Flame:   multiplier *= 2; break;
                    case OochType.Stone:   multiplier *= 2; break;
                }
            break;
            case OochType.Magic:
                switch(type_defender){
                    case OochType.Flame:  multiplier *= .5; break;
                    case OochType.Tech:   multiplier *=  2; break;
                    case OochType.Stone:  multiplier *=  2; break;
                }
            break;
            case OochType.Void:
                multiplier *= 1.5;
            break;
        }
    }
    
    multiplier = Math.min(8, Math.max(.125,multiplier))

    switch(multiplier){
        case(0.125):    string = '\n--- 🛡️ **It\'s barely effective...**';        break;
        case(0.25):     string = '\n--- 🛡️ **It\'s very ineffective...**';        break;
        case(0.5):      string = '\n--- 🛡️ **It\'s not very effective...**';      break;
        case(2):        string = '\n--- 🗡️ **It\'s super effective!**';           break;
        case(4):        string = '\n--- 🗡️ **It\'s incredibly effective!**';      break;
        case(8):        string = '\n--- 🗡️ **It\'s devastatingly effective!**';   break;
    }

    return([multiplier,string])
},

/**
 * Check if we've beaten an enemy Oochamon or lost an Oochamon
 * @param {Object} thread The thread Oochamon is being played in.
 * @param {String} user_id The user id of the user playing Oochamon.
 * @param {Object} ooch_enemy The Oochamon object for the enemy
 * @param {Object} ooch_plr The Oochamon object for the player
 * @returns 
 */
victory_defeat_check: async function(thread, user_id, ooch_enemy, ooch_plr) {

    const { finish_battle, battle_calc_exp, level_up } = require('./func_battle.js');
    let ooch_enemy_party, ooch_party, slot_to_send, oochabux;
    let user_profile = db.profile.get(user_id);
    let battleSpeed = user_profile.settings.battle_speed;

    // Victory/Defeat Check
    if (ooch_enemy.current_hp <= 0) { // Beat the enemy Oochamon
        slot_to_send = -1;
        ooch_enemy_party = user_profile.ooch_enemy.ooch_party;
        // Pick the next available ooch enemy party slot for the enemy to send in
        for (let i = 0; i < ooch_enemy_party.length; i++) {
            if (ooch_enemy_party[i].current_hp > 0 && slot_to_send == -1) {
                slot_to_send = i;
            }
        }

        if (slot_to_send == -1) { //if there is no slot to send in
            let string_to_send = ``;
            let displayEmbed = new EmbedBuilder();
            let is_wild = false;
            if (db.profile.get(user_id, 'ooch_enemy.trainer_type') == TrainerType.Wild) {
                oochabux = _.random(5, 40);
                is_wild = true;
            } else {
                oochabux = user_profile.ooch_enemy.oochabux;
            }
            string_to_send += `\n💵 You gained **${oochabux}** oochabux!`;

            let ooch_party = user_profile.ooch_party;
            // Distribute XP for a defeated Oochamon
            // The Oochamon in the active slot at the moment of beating the Oochamon gets 1.25x more EXP than the others.
            exp_earned = battle_calc_exp(ooch_enemy.level, db.monster_data.get(ooch_enemy.id, 'evo_stage'), is_wild ? 1 : 2);
            let exp_earned_main = Math.round(exp_earned * 1.25);
            if (ooch_plr.level != 50) {
                string_to_send += `\n${db.monster_data.get(ooch_plr.id, 'emote')} **${ooch_plr.nickname}** earned **${Math.round(exp_earned * 1.25)} exp!**` + 
                                    ` (EXP: **${_.clamp(ooch_plr.current_exp + exp_earned_main, 0, ooch_plr.next_lvl_exp)}/${ooch_plr.next_lvl_exp})**`
            }
            if (ooch_party.length !== 0) {
                string_to_send += `\nThe rest of your team earned **${exp_earned}** exp.`;
            }

            for (let i = 0; i < ooch_party.length; i++) {
                if (i == user_profile.ooch_active_slot) { 
                    db.profile.math(user_id, '+', Math.round(exp_earned * 1.25), `ooch_party[${i}].current_exp`);
                } else { 
                    db.profile.math(user_id, '+', (ooch_party[i].alive === false ? exp_earned : Math.round(exp_earned / 2)), `ooch_party[${i}].current_exp`); 
                }
                
                // Check for level ups
                let ooch_data = db.profile.get(user_id, `ooch_party[${i}]`)
                if (ooch_data.current_exp >= ooch_data.next_lvl_exp) { // If we can level up
                    ooch_data = level_up(ooch_data);
                    string_to_send += ooch_data[1];
                    await db.profile.set(user_id, ooch_data[0], `ooch_party[${i}]`)
                }
            }

            displayEmbed.setColor('#eeff00')
            displayEmbed.setTitle('Rewards')
            displayEmbed.setDescription(string_to_send);

            await wait(battleSpeed);
            await thread.send({ content: `**------------ You win! ------------**`, embeds: [displayEmbed] });
            db.profile.inc(user_id, 'turn_msg_counter');
            db.profile.inc(user_id, 'battle_msg_counter');

            db.profile.math(user_id, '+', oochabux, 'oochabux');
            db.profile.set(user_id, 0, 'ooch_active_slot');
            await finish_battle(thread, user_id, true);
            return true;
        };
    } else if (ooch_plr.current_hp <= 0) { // Lost one of our own Oochamon
        slot_to_send = -1;
        ooch_party = db.profile.get(user_id, 'ooch_party');

        // Figure out if we have an Oochamon to send in at this point
        for (let i = 0; i < ooch_party.length; i++) {
            if (ooch_party[i].current_hp > 0 && slot_to_send == -1) {
                slot_to_send = i;
            }
        }

        if (slot_to_send == -1) { //if there is no slot to send in
            oochabux = _.random(5, 10)
            oochabux = _.clamp(oochabux, 0, user_profile.oochabux);
            await wait(battleSpeed);
            await thread.send(`**------------ You lose... ------------**${oochabux != 0 ? `\nYou lose **${oochabux}** Oochabux.` : ``}`);
            db.profile.inc(user_id, 'turn_msg_counter');
            db.profile.inc(user_id, 'battle_msg_counter');
            db.profile.math(user_id, '-', oochabux, 'oochabux');
            db.profile.set(user_id, 0, 'ooch_active_slot');
            
            await finish_battle(thread, user_id, false);
            return true;
        }
    };
},

/**
 * Helper function to handle the end of an Oochamon battle round.
 * (A round ends after each Oochamon has done a move.)
 * @param {Object} thread The thread Oochamon is being played in.
 * @param {String} user_id The user id of the user playing Oochamon
 * @param {Object} ooch_plr The object of the "player" Oochamon
 * @param {Object} ooch_enemy The object of the "enemy" Oochamon
 */
end_of_round: async function(thread, user_id, ooch_plr, ooch_enemy) {
    const { generate_hp_bar, use_eot_ability, battle_calc_exp, level_up, ability_stat_change, modify_stat } = require('./func_battle.js');

    // If 2 Oochamon are the same, then pre-pend Player and Enemy to differentiate them
    let oochPlrNickname = ooch_plr.nickname;
    let oochEnemyNickname = ooch_enemy.nickname;

    if (ooch_plr.nickname == ooch_enemy.nickname) {
        ooch_plr.nickname = `Player's ${ooch_plr.nickname}`;
        ooch_enemy.nickname = `Enemy's ${ooch_enemy.nickname}`;
    }

    let ooch_list = [ooch_plr, ooch_enemy].filter(o => o.current_hp > 0);
    let ooch_status_emotes = [[], []]; // 0 is ooch_plr, 1 is ooch_enemy
    let string_to_send = ``;
    let enemy_send_string_to_send = ``;
    let user_profile = db.profile.get(user_id);
    let enemy_profile = db.profile.get(user_id, 'ooch_enemy');
    let battleSpeed = user_profile.settings.battle_speed;

    for (let i = 0; i < ooch_list.length; i++) {
        let ooch = ooch_list[i];
        let opposing_ooch = ooch_list[!i | 0]; // Flip 1 to 0 or 0 to 1 via type casting

        // Handle end of turn abilities (use_eot_ability returns the ooch, as well as a string with what the ability did)
        eot_result = use_eot_ability(ooch, user_id);
        ooch = eot_result[0];
        string_to_send += eot_result[1];

        // Handle status effects
        let ooch_burned = ooch.status_effects.includes(Status.Burn);
        let ooch_infected = ooch.status_effects.includes(Status.Infect);
        let ooch_digitized = ooch.status_effects.includes(Status.Digitize);
        let ooch_doomed = ooch.status_effects.includes(Status.Doom);
    
        for (let j = 0; j < ooch.status_effects.length; j++) {
            ooch_status_emotes[i].push(db.status_data.get(ooch.status_effects[j], 'emote'));
        }

        if (ooch_burned) {
            let burn_val = Math.round(ooch.stats.hp/10);
            ooch.current_hp -= burn_val;
            ooch.current_hp = _.clamp(ooch.current_hp, 0, ooch.stats.hp);
            string_to_send += `\n${ooch.emote} **${ooch.nickname}** was hurt by its burn and loses **${burn_val} HP**.`;
        }
    
        if (ooch_infected) {
            let infect_val = Math.round(ooch.stats.hp/20)
            ooch.current_hp -= infect_val;
            ooch.current_hp = _.clamp(ooch.current_hp, 0, ooch.stats.hp);
            opposing_ooch.current_hp = Math.min(opposing_ooch.current_hp + infect_val, opposing_ooch.stats.hp);
            string_to_send += `\n${ooch.emote} **${ooch.nickname}** has **${infect_val} HP** absorbed by ${opposing_ooch.emote} **${opposing_ooch.nickname}**.`;
        }

        if (ooch_digitized && ooch.type != [OochType.Tech]) {
            ooch.type = [OochType.Tech];
            string_to_send += `\n${ooch.emote} **${ooch.nickname}** was digitized and had its type changed to **Tech**!.`;
        }

        if (ooch_doomed) {
            ooch.doom_timer -= 1;
            if (ooch.doom_timer == 0) {
                ooch.current_hp = 0;
                string_to_send += `\n${ooch.emote} **${ooch.nickname}**'s **DOOM** timer hit 0! It dies unceremoniously.`
            } else {
                string_to_send += `\n${ooch.emote} **${ooch.nickname}**'s **DOOM** timer went down by 1 due to its status effect.\n**${ooch.doom_timer} turns left!**.`
            }
        }
    }

    let plr_hp_string = generate_hp_bar(ooch_plr, 'plr');
    let en_hp_string = generate_hp_bar(ooch_enemy, 'enemy');
    string_to_send += `\n${plr_hp_string} ${ooch_status_emotes[0].join(' ')}\n${en_hp_string} ${ooch_status_emotes[1].join(' ')}`

    db.profile.inc(user_id, 'battle_turn_counter');

    // Reset nicknames back to normal
    ooch_plr.nickname = oochPlrNickname;
    ooch_enemy.nickname = oochEnemyNickname;

    // Handle deaths and level ups
    if (ooch_enemy.current_hp <= 0) {
        let slot_to_send = -1;
        let ooch_enemy_party = enemy_profile.ooch_party;
        let ooch_party = user_profile.ooch_party;

        // On death ability that affects the entire party:
        if (ooch_enemy.ability == Ability.EasyGo) {
            for (let i = 0; i < ooch_enemy_party.length; i++) {
                let en = ooch_enemy_party[i];
                if (en.id != ooch_enemy.id) {
                    en.current_hp = _.clamp(Math.round(en.current_hp + (en.stats.hp / 5)), 0, en.stats.hp)
                    ooch_enemy_party[i] = en;
                }
            }
            string_to_send += `\nEnemy Oochamon's party HP was restored by 20% through the ability **Easy Go**!`
            enemy_profile.ooch_party = ooch_enemy_party;
        }

        // Distribute XP for a defeated Oochamon
        // The Oochamon in the active slot at the moment of beating the Oochamon gets 1.25x more EXP than the others.
        exp_earned = battle_calc_exp(ooch_enemy.level, db.monster_data.get(ooch_enemy.id, 'evo_stage'));
        string_to_send += `\n\n${ooch_plr.emote} **${ooch_plr.nickname}** earned **${Math.round(exp_earned * 1.25)} exp!**` + 
                                                        ` (EXP: **${_.clamp(ooch_plr.current_exp + Math.round(exp_earned * 1.25), 0, ooch_plr.next_lvl_exp)}/${ooch_plr.next_lvl_exp})**` + 
                                                        `\n${ooch_party.length !== 0 ? `The rest of your team earned **${exp_earned} exp** as well.` : ``}`

        for (let i = 0; i < ooch_party.length; i++) {
            let isMainOoch = (i == user_profile.ooch_active_slot);
            if (isMainOoch) { 
                ooch_plr.current_exp += Math.round(exp_earned * 1.25);

                // Check for level ups
                if (ooch_plr.current_exp >= ooch_plr.next_lvl_exp) { // If we can level up
                    ooch_plr = level_up(ooch_plr);
                    string_to_send += ooch_plr[1];
                    ooch_plr = ooch_plr[0];
                }
            } else { 
                db.profile.math(user_id, '+', (ooch_party[i].alive === false ? exp_earned : Math.round(exp_earned / 2)), `ooch_party[${i}].current_exp`); 

                let ooch_data = db.profile.get(user_id, `ooch_party[${i}]`)
                if (ooch_data.current_exp >= ooch_data.next_lvl_exp) { // If we can level up
                    ooch_data = level_up(ooch_data);
                    string_to_send += ooch_data[1];
                    await db.profile.set(user_id, ooch_data[0], `ooch_party[${i}]`)
                }
            }
        }

        // Pick the next available ooch enemy party slot for the enemy to send in
        for (let i = 0; i < ooch_enemy_party.length; i++) {
            if (ooch_enemy_party[i].current_hp > 0 && slot_to_send == -1) {
                slot_to_send = i;
            }
        }

        if (slot_to_send != -1) { //if there is a slot to send in
            enemy_send_string_to_send += `**${enemy_profile.name}** sends out ${ooch_enemy_party[slot_to_send].emote} **${ooch_enemy_party[slot_to_send].nickname}!**`;
            enemy_send_string_to_send += `\n${ooch_enemy_party.map(v => v = v.alive == true ? `<:item_prism:1274937161262698536>` : `❌`).join('')}`;

            // Check for on switch in abilities, enemy switching in, player ability activated
            switch (ooch_plr.ability) {
                case Ability.Alert:
                    ooch_plr = modify_stat(ooch_plr, Stats.Attack, 1);
                    string_to_send += `${ooch_plr.emote} **${ooch_plr.nickname}**'s ability **Alert** raised its ATK from the new Oochamon switch!`;
                break;
                case Ability.Duplicant:
                    if (ooch_enemy_party[slot_to_send].ability !== Ability.InvalidEntry) {
                        ooch_plr.ability = ooch_enemy_party[slot_to_send].ability;
                        string_to_send += `\n${ooch_plr.emote} **${ooch_plr.nickname}**'s copied its ability to **${_.startCase(db.ability_data.get(ooch_enemy_party[slot_to_send].ability, 'nickname'))}** through it's **Duplicant** ability!`;
                    }
                break;
                case Ability.Nullify:
                    ooch_enemy.ability = Ability.Null;
                    string_to_send += `\n${ooch_enemy.emote} **${ooch_enemy.nickname}**'s ability changed to **Null** from the ability **Nullify** from ${ooch_plr.emote} **${ooch_plr.nickname}**!`
                break;
            }

            // Check for on switch in abilities, enemy switching in, enemy ability activated
            switch (ooch_enemy.ability) {
                case Ability.Boisterous:
                    ooch_plr.current_hp = _.clamp(Math.floor(ooch_plr.current_hp - ooch_plr.stats.hp * 0.1), 1, ooch_plr.stats.hp);
                    string_to_send += `\n${ooch_plr.emote} **${ooch_plr.nickname}** lost 10% of it's hp from the switch in ability **Boisterous**!`;
                break;
                case Ability.Gentle:
                    ooch_plr = modify_stat(ooch_plr, Stats.Attack, -0.1);
                break;
            }

            // Reset modified stats for dead oochamon
            ooch_enemy.stats.atk_mul = 0;
            ooch_enemy.stats.def_mul = 0;
            ooch_enemy.stats.spd_mul = 0;
            ooch_enemy.stats.acc_mul = 0;
            ooch_enemy.stats.eva_mul = 0;
            ooch_enemy.ability = ooch_enemy.og_ability;
            ooch_enemy.type = ooch_enemy.og_type;
            ooch_enemy.status_effects = [];
            ooch_enemy.doom_timer = 3;
            db.profile.set(user_id, ooch_enemy, `ooch_enemy.ooch_party[${enemy_profile.ooch_active_slot}]`);

            // Switch in stats
            ooch_enemy = ooch_enemy_party[slot_to_send];
            ooch_enemy = ability_stat_change(ooch_enemy, ooch_enemy_party);
            string_to_send += `\n${ooch_enemy[1]}`;
            ooch_enemy = ooch_enemy[0];
            enemy_profile.ooch_active_slot = slot_to_send;
            db.profile.set(user_id, ooch_enemy, `ooch_enemy.ooch_party[${slot_to_send}]`);
            db.profile.set(user_id, slot_to_send, `ooch_enemy.ooch_active_slot`);
        };
    } 
    
    // Update the ooch objects at the end of the turn so that it stays across the battle
    db.profile.set(user_id, ooch_plr, `ooch_party[${user_profile.ooch_active_slot}]`);
    db.profile.set(user_id, ooch_enemy, `ooch_enemy.ooch_party[${enemy_profile.ooch_active_slot}]`);

    let displayEmbed = new EmbedBuilder()
    .setColor('#ffffff')
    .setDescription(`${string_to_send}`);
    await wait(battleSpeed);
    await thread.send({ content: `**------------ End of Round ------------**`, embeds: [displayEmbed] });
    db.profile.inc(user_id, 'turn_msg_counter');
    db.profile.inc(user_id, 'battle_msg_counter');
    if (enemy_send_string_to_send != '') {
        await thread.send({ content: enemy_send_string_to_send });
        db.profile.inc(user_id, 'turn_msg_counter');
        db.profile.inc(user_id, 'battle_msg_counter');
    }

},

/**
 * Generate a custom emote HP bar for use in Oochamon battles.
 * @param {Object} ooch The oochamon data.
 * @param {String} style The style of the HP bar (plr/enemy)
 * @returns The generated HP emote string for the Oochamon.
 */
generate_hp_bar: function(ooch, style) {
    let hp_string = ``;
    let hp_sec = (ooch.current_hp / ooch.stats.hp);
    let sections = Math.ceil(hp_sec * 10);
    if(ooch.current_hp != ooch.stats.hp){ sections = Math.min(sections, 9); }
    let piece_type;

    hp_string += `\n${db.monster_data.get(ooch.id, 'emote')} `;

    if (style == 'plr') {
        piece_type = `<:p_f_hm:1274936333277855775>`
        if (sections <= 5) piece_type = `<:p_m_hm:1274936384779714680>`;
        if (sections <= 2) piece_type = `<:p_l_hm:1274936321890193501>`;

        hp_string += `<:p_hs:1274936342677028905>`;
        hp_string += `${piece_type.repeat(sections)}` // Filled slots
        hp_string += `${`<:p_g_hm:1274936302529155115>`.repeat(10 - sections)}` // Empty slots
        hp_string += `<:p_he:1274936313123967016>\n`;
    } else {
        piece_type = `<:e_f_hm:1274935813758521416>`;
        if (sections <= 5) piece_type = `<:e_m_hm:1274936005777948744>`;
        if (sections <= 2) piece_type = `<:e_l_hm:1274935997037154417>`;

        hp_string += `<:e_hs:1274935985289039915>`;
        hp_string += `${piece_type.repeat(sections)}` // Filled slots
        hp_string += `${`<:e_g_hm:1274935806301048974>`.repeat(10 - sections)}` // Empty slots
        hp_string += `<:e_he:1274935824173240372>\n`;
    }

    hp_string += `\`HP: ${ooch.current_hp}/${ooch.stats.hp}\`\n**\`Lvl: ${ooch.level}\`**`;

    return hp_string;
},

/**
 * A helper function to handle using an item such as a healing or prism item
 * in an Oochamon battle.
 * @param {Object} ooch The oochamon data object
 * @param {String} item_id The item id that is to be used
 * @returns A true or false for prisms if they caught or didn't catch, otherwise the oochamon object.
 */
item_use: function(ooch, item_id) {
    let item_data = db.item_data.get(item_id);

    if (item_data.type == 'potion') {
        ooch.alive = true;
        ooch.current_hp += item_data.potency;
        ooch.current_hp = _.clamp(ooch.current_hp, 0, ooch.stats.hp);
        return ooch;
    } else if (item_data.type == 'prism') {
        let status_bonus = 1;
        let prism_multiplier = item_data.potency;
        let prism_chance = prism_multiplier / ooch.level * (ooch.stats.hp / ooch.current_hp) * status_bonus;

        if (Math.random() < prism_chance) {
            return true;
        } else {
            return false;
        }
    }
    
},

/**
 * Add or subtract a stat to an Oochamon object. NOTE: THIS DOES NOT SET THE MULTIPLIER UNLESS YOU USE THE SET ARGUMENT!
 * @param {Object} ooch The oochamon object to change stat mulitipliers on.
 * @param {String} stat The stat to change (atk, def, spd, acc, or eva)
 * @param {number} stage The stage amount to change it by (-8 to 8)
 * @param {Boolean} [set=false] Set the value instead of add to/subtract from the value.
 * @returns The Oochamon object with stats changed.
 */
modify_stat: function(ooch, stat, stage, set = false) {
    let min_stage = -8;
    let max_stage = 8;
    switch(stat) {
        case 'atk': 
            ooch.stats.atk_mul = (set == true ? stage : ooch.stats.atk_mul + stage); 
            ooch.stats.atk_mul = _.clamp(ooch.stats.atk_mul, min_stage, max_stage); 
        break; 
        case 'def': 
            ooch.stats.def_mul = (set == true ? stage : ooch.stats.def_mul + stage);
            ooch.stats.def_mul = _.clamp(ooch.stats.def_mul, min_stage, max_stage); 
        break;
        case 'spd': 
            ooch.stats.spd_mul = (set == true ? stage : ooch.stats.spd_mul + stage);
            ooch.stats.spd_mul = _.clamp(ooch.stats.spd_mul, min_stage, max_stage); 
        break; 
        case 'acc': 
            ooch.stats.acc_mul = (set == true ? stage : ooch.stats.acc_mul + stage); 
            ooch.stats.acc_mul = _.clamp(ooch.stats.acc_mul, min_stage, max_stage); 
        break; 
        case 'eva': 
            ooch.stats.eva_mul = (set == true ? stage : ooch.stats.eva_mul + stage);
            ooch.stats.eva_mul = _.clamp(ooch.stats.eva_mul, min_stage, max_stage); 
        break;
    }

    return ooch;
},

/**
 * Have the oochs ability affect its stats, then return the ooch with its stats adjusted accordingly.
 * Read the generate.js to see what each ability does.
 * @param {Object} ooch The oochamon object to have affected by it's ability
 * @param {Array} ooch_inv The oochamon party array for the user
 * @param {Object} ooch_enemy The oochamon you are fighting
 * @returns The Oochamon object with changed stats.
 */
ability_stat_change: function(ooch, ooch_inv) {
    const { modify_stat } = require('./func_battle.js');

    let output_msg = ``;
    let incAmount = 0;
    // Check for digitized status effect
    if (ooch.status_effects.includes(Status.Digitize)) {
        ooch.type = [OochType.Tech];
    }

    switch (ooch.ability) {
        case Ability.Miniscule: 
            ooch = modify_stat(ooch, Stats.Evasion, 1);
            output_msg = `${ooch.emote} **${ooch.nickname}** increased evasion from its ability **Miniscule**!`;
        break;
        case Ability.Burdened: 
            ooch = modify_stat(ooch, Stats.Speed, -1);
            ooch = modify_stat(ooch, Stats.Defense, 1); 
            output_msg = `${ooch.emote} **${ooch.nickname}** decreased its SPD and increased its DEF from its ability **Burdened**!`;
        break;
        case Ability.Tough:
            ooch = modify_stat(ooch, Stats.Defense, 1); 
            output_msg = `${ooch.emote} **${ooch.nickname}** increased its DEF from its ability **Tough**!`;
        break;
        case Ability.Gentle:
            ooch = modify_stat(ooch, Stats.Attack, -1); 
            output_msg = `${ooch.emote} **${ooch.nickname}** decreased its ATK from its ability **Gentle**!`;
        break;
        case Ability.Conflicted:
            ooch = modify_stat(ooch, Stats.Attack, 1);
            ooch = modify_stat(ooch, Stats.Defense, 1);
            ooch = modify_stat(ooch, Stats.Speed, 1);
            ooch = modify_stat(ooch, Stats.Accuracy, 1);
            ooch = modify_stat(ooch, Stats.Evasion, 1); 
            output_msg = `${ooch.emote} **${ooch.nickname}** increased all of its stats from its ability **Conflicted**!`;
        break;
        case Ability.Dense:
            ooch = modify_stat(ooch, Stats.Attack, 1);
            ooch = modify_stat(ooch, Stats.Speed, -1); 
            output_msg = `${ooch.emote} **${ooch.nickname}** decreased its SPD and increased its ATK from its ability **Dense**!`;
        break;
        case Ability.Withering:
            ooch = modify_stat(ooch, Stats.Speed, 1); 
            output_msg = `${ooch.emote} **${ooch.nickname}** sharply increased its SPD from its ability **Withering**!`;
        break;
        case Ability.Fleeting:
            ooch = modify_stat(ooch, Stats.Speed, 4);
            ooch = modify_stat(ooch, Stats.Attack, 4); 
            output_msg = `${ooch.emote} **${ooch.nickname}** dramatically increased its SPD and ATK from its ability **Fleeting**!`;
        break;
        case Ability.Uncontrolled:
            ooch = modify_stat(ooch, Stats.Attack, 4); 
            output_msg = `${ooch.emote} **${ooch.nickname}** dramatically increased its ATK from its ability **Uncontrolled**!`;
        break;
        case Ability.Immense:
            ooch = modify_stat(ooch, Stats.Defense, 2); 
            output_msg = `${ooch.emote} **${ooch.nickname}** sharply increased its DEF from its ability **Immense**!`;
        break;
        case Ability.Swaying:
            ooch = modify_stat(ooch, Stats.Defense, 1);
            ooch = modify_stat(ooch, Stats.Accuracy, -1);
            output_msg = `${ooch.emote} **${ooch.nickname}** increased its DEF and decreased its accuracy from its ability **Swaying**!`;
        break;
        case Ability.Thrashing:
            ooch = modify_stat(ooch, Stats.Attack, 1);
            ooch = modify_stat(ooch, Stats.Evasion, -1);
            output_msg = `${ooch.emote} **${ooch.nickname}** increased its ATK and decreased its evasion from its ability **Thrashing**!`;
        break;
        case Ability.Union:
            ooch = modify_stat(ooch, Stats.Attack, 1);
            ooch = modify_stat(ooch, Stats.Defense, 1);
            output_msg = `${ooch.emote} **${ooch.nickname}** increased its ATK and DEF from its ability **Union**!`;
        break;
        case Ability.Broodmother:
            incAmount = 0;
            for (let ooch_i of ooch_inv) {
                if (ooch_i.type[0] === ooch.type[0] && ooch_i.id != ooch.id) {
                    ooch = modify_stat(ooch, Stats.Attack, 1);
                    incAmount += 1;
                }
            } 
            output_msg = `${ooch.emote} **${ooch.nickname}** increased its ATK by **${incAmount} stages** from its ability **Broodmother**!`;
        break;
        case Ability.Apprentice:
            incAmount = 0;
            for (let ooch_i of ooch_inv) {
                if (ooch_i.moveset.some(item => ooch.moveset.includes(item)) && ooch_i.id != ooch.id) {
                    ooch = modify_stat(ooch, Stats.Attack, 2);
                    output_msg = `${ooch.emote} **${ooch.nickname}** sharply increased its ATK from its ability **Apprentice**!`;
                    break;
                }
            }
        break;
    }

    return [ooch, output_msg];
}, 

/**
 * Have the ooch object use its end of turn ability.
 * Read the generate.js to see what each ability does.
 * @param {Object} ooch The oochamon object to have affected by it's ability
 * @param {Object} user_id The user id of the person playing the battle (used for some abilities)
 * @returns The Oochamon object that has been affected by an ability.
 */
use_eot_ability: function(ooch, user_id) {
    const { modify_stat, type_to_emote, add_status_effect } = require('./func_battle.js');
    let ability_text = ``;
    switch(ooch.ability) {
        case Ability.Withering:
            ooch.current_hp -= Math.round(ooch.stats.hp * 0.05); 
            ability_text = `\n${ooch.emote} **${ooch.nickname}** lost 5% of its max HP due to its ability **Withering**!`;
        break;
        case Ability.Fleeting:
            ooch.current_hp = Math.floor(ooch.current_hp / 2);
            ability_text = `\n${ooch.emote} **${ooch.nickname}** had its HP halved due to its ability **Fleeting**!`;
        break;
        case Ability.Efficient:
            ooch = modify_stat(ooch, Stats.Attack, 1);
            ability_text = `\n${ooch.emote} **${ooch.nickname}** increased its ATK from its ability **Efficient**!`;
        break;
        case Ability.Inertia:
            ooch = modify_stat(ooch, Stats.Speed, 1); 
            ability_text = `\n${ooch.emote} **${ooch.nickname}** increased its SPD from its ability **Inertia**!`;
        break;
        case Ability.Patient:
            ooch = modify_stat(ooch, Stats.Defense, 1); 
            ability_text = `\n${ooch.emote} **${ooch.nickname}** increased its DEF from its ability **Patient**!`;
        break;
        case Ability.Increment:
            let randomStat = _.sample([Stats.Attack, Stats.Defense, Stats.Speed, Stats.Accuracy, Stats.Evasion]);
            ooch = modify_stat(ooch, randomStat, 1);
            ability_text = `\n${ooch.emote} **${ooch.nickname}** randomly increased its ${_.upperCase(randomStat)} from its ability **Increment**!`;
        break;
        case Ability.Riposte:
            ooch.ability = Ability.Parry;
            ability_text = `\n${ooch.emote} **${ooch.nickname}** changed its stance, and shifted its ability to **Parry**!`;
        break;
        case Ability.HoleDweller:
            if (db.profile.get(user_id, 'battle_turn_counter') % 2 === 0) {
                ooch = add_status_effect(ooch, Status.Vanish);
                ability_text = `${ooch.emote} **${ooch.nickname}** **VANISHED** into a hole with its ability **Hole Dweller**!`;
            }
        break;
    }

    if (!ooch.status_effects.includes(Status.Digitize)) {
        switch (ooch.ability) {
            case Ability.Spectral:
                if (ooch.type == ooch.og_type) {
                    ooch.type = [OochType.Magic];
                    ability_text = `\n${ooch.emote} **${ooch.nickname}** changed its type to ${type_to_emote(OochType.Magic)} **Magic** through its ability **Spectral**!`
                } else {
                    ooch.type = ooch.og_type;
                    ability_text = `\n${ooch.emote} **${ooch.nickname}** changed its type back to ${type_to_emote(ooch.type)} **${ooch.type.map(v => _.capitalize(v)).join(' | ')}**.`
                }
            break;
            case Ability.Radioactive:
                if (ooch.type == ooch.og_type) {
                    ooch.type = [OochType.Flame];
                    ability_text = `\n${ooch.emote} **${ooch.nickname}** changed its type to ${type_to_emote(OochType.Flame)} **Flame** through its ability **Radioactive**!`
                } else {
                    ooch.type = ooch.og_type;
                    ability_text = `\n${ooch.emote} **${ooch.nickname}** changed its type back to ${type_to_emote(ooch.type)} **${ooch.type.map(v => _.capitalize(v)).join(' | ')}**.`
                }
            break;
        }
    }
    

    return [ooch, ability_text];
},

/**
 * Handle finishing an Oochamon battle and setting back up the playspace.
 * @param {Object} thread The thread Oochamon is being played in.
 * @param {String} user_id The user id of the user playing Oochamon.
 * @param {Boolean} battle_won If the user won the battle or not
 */
finish_battle: async function(thread, user_id, battle_won) {
    const { event_process } = require('./func_event');

    db.profile.set(user_id, {}, 'ooch_enemy');
    await wait(5000);

    let msgs_to_delete = db.profile.get(user_id, 'battle_msg_counter');
    if (msgs_to_delete <= 100 && db.profile.get(user_id, 'settings.battle_cleanup') == true) {
        await thread.bulkDelete(msgs_to_delete)
    }

    // Reset Oochamon stat multipliers and ability and status effects
    for (let i = 0; i < db.profile.get(user_id, 'ooch_party').length; i++) {
        let ooch = db.profile.get(user_id, `ooch_party[${i}]`);
        ooch.stats.atk_mul = 0;
        ooch.stats.def_mul = 0;
        ooch.stats.spd_mul = 0;
        ooch.stats.acc_mul = 0;
        ooch.stats.eva_mul = 0;
        ooch.ability = ooch.og_ability;
        ooch.type = ooch.og_type;
        ooch.doom_timer = 3;
        ooch.status_effects = [];
        if (battle_won === false) {
            ooch.current_hp = ooch.stats.hp;
            ooch.alive = true;
        }

        db.profile.set(user_id, ooch, `ooch_party[${i}]`);
    }
    
    // If we lost, go back to the teleporter location.
    if (battle_won === false) {
        db.profile.set(user_id, db.profile.get(user_id, 'checkpoint_data'), 'location_data');
        db.profile.set(user_id, [], 'npc_event_data');
        db.profile.set(user_id, 0, 'npc_event_pos')
    } else {
        // If we won the battle
        let npc_event_data = db.profile.get(user_id, 'npc_event_data');
        let npc_event_pos = parseInt(db.profile.get(user_id, 'npc_event_pos'));

        if (npc_event_data.length != 0 ) {
            // If we have an NPC event obj, continue the event processing with our held event data info after the battle is done.
            event_process(user_id, thread, npc_event_data, npc_event_pos);
            db.profile.set(user_id, [], 'npc_event_data');
            db.profile.set(user_id, 0, 'npc_event_pos');
        }
    }

    // Setup playspace
    let playspace_str = await setup_playspace_str(user_id);
    await db.profile.set(user_id, PlayerState.Playspace, 'player_state');
    await db.profile.delete(user_id, 'rollback_profile');

    await thread.send({ content: playspace_str[0], components: playspace_str[1] }).then(msg => {
        db.profile.set(user_id, msg.id, 'display_msg_id');
    });
},

/**
 * Handle leveling up an Oochamon, including
 * giving it new moves.
 * @param {Object} ooch The oochamon that is leveling up
 * @returns A leveled up oochamon, and the output text, both in an array.
 */
level_up: function(ooch) {
    const { exp_to_next_level, get_stats, type_to_emote } = require('./func_battle');
    let level_counter = 0;
    let starting_level = ooch.level;
    let evoData = false;
    let output = ``;
    let possibleMoves = db.monster_data.get(ooch.id, 'move_list');

    if (ooch.level <= 50) {
        while (ooch.current_exp >= exp_to_next_level(ooch.level) && ooch.level < 50) {
            ooch.current_exp -= ooch.next_lvl_exp;
            ooch.level += 1;

            ooch.next_lvl_exp = exp_to_next_level(ooch.level);

            let new_stats = get_stats(ooch.id, ooch.level, ooch.stats.hp_iv, ooch.stats.atk_iv, ooch.stats.def_iv, ooch.stats.spd_iv);
            let hp_dif = new_stats[0] - ooch.stats.hp //Get the difference between new HP and old HP to be added to the mon

            ooch.stats.hp = new_stats[0]
            ooch.stats.atk = new_stats[1]
            ooch.stats.def = new_stats[2]
            ooch.stats.spd = new_stats[3]
            ooch.current_hp += hp_dif

            if(ooch.current_hp > 0){
                ooch.alive = true;
            }
            
            level_counter += 1;
        }

        let curOochMoveset = ooch.moveset;

        // Determine new moves
        possibleMoves = possibleMoves.filter(v => {
            return _.inRange(v[0], starting_level + 1, ooch.level + 1)
        });
        possibleMoves = possibleMoves.map(v => {
            let moveData = db.move_data.get(v[1]);
            // If the Oochamon can learn the new move and has room, add it automatically.
            if (ooch.moveset.length < 4) ooch.moveset.push(moveData.id);
            return `- ${type_to_emote(moveData.type)} **${moveData.name}**`;
        })

        // Determine if it can evolve
        if (ooch.level >= db.monster_data.get(ooch.id, `evo_lvl`) && db.monster_data.get(ooch.id, 'evo_id') != -1) {
            evoData = db.monster_data.get(db.monster_data.get(ooch.id, 'evo_id'));
        }

        output =  `\n\n⬆️ ${db.monster_data.get(ooch.id, 'emote')} **${ooch.nickname}** leveled up **${level_counter}** time${level_counter > 1 ? 's' : ''} and is now **level ${ooch.level}**!` +
        `${(evoData != false) ? `\n⬆️ **${ooch.nickname} is now able to evolve in the party menu!**` : ``}` +
        `${(possibleMoves.length != 0) ? `\n**${ooch.nickname}** learned ${possibleMoves.length > 1 ? `some new moves` : `a new move`}!\n${possibleMoves.join('\n')}\n${curOochMoveset.length <= 4 && ooch.moveset.length > 4 ? `You can teach these moves to your Oochamon in the party menu!` : ``}` : `` }`;
    }
    return [ooch, output];
},

/**
 * Generate a beginning of battle image based on data passed in
 * @param {Object} thread The thread this instance of Oochamon is being played in
 * @param {String} user_id The user ID of the user playing Oochamon
 * @param {Object} plr The player object
 * @param {Object} enemy The enemy object
 * @param {Boolean} is_npc_battle If this is an NPC battle, or a wild battle.
 * @returns A png attachment to be sent into a chat.
 */
generate_battle_image: async function(thread, user_id, plr, enemy, is_npc_battle) {

    // Define helper functions that are only used here
    function flipDrawImage(ctx, image, x = 0, y = 0, horizontal = false, vertical = false){
        ctx.save();  // save the current canvas state
        ctx.setTransform(
            horizontal ? -1 : 1, 0, // set the direction of x axis
            0, vertical ? -1 : 1,   // set the direction of y axis
            x + (horizontal ? image.width : 0), // set the x origin
            y + (vertical ? image.height : 0)   // set the y origin
        );
        ctx.drawImage(image,0,0);
        ctx.restore(); // restore the state as it was when this function was called
    }

    const fillTextScaled = (text, font, fontSize, cutoff, canvas, fontMod = '') => {
        const context = canvas.getContext('2d');
        do {
            // Assign the font to the context and decrement it so it can be measured again
            context.font = `${fontMod} ${fontSize -= 1}px ${font}`;
            // Compare pixel width of the text to the canvas minus the approximate avatar size
        } while (context.measureText(text).width > cutoff);
    
        // Return the result to use in the actual canvas
        return context.font;
    };

    let canvas = new Canvas(480, 270);
    FontLibrary.use("main_med", ["./fonts/LEMONMILK-Medium.otf"]);
    let ctx = canvas.getContext("2d");
    const background = await loadImage(`./art/BattleArt/battle_bg_${plr.location_data.area}.png`);
    
    // This uses the canvas dimensions to stretch the image onto the entire canvas
    ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
    const plrSprite = await loadImage('./art/NPCs/c_000.png')
    const oochPlr = await loadImage(`./art/ResizedArt/${_.lowerCase(plr.ooch_party[plr.ooch_active_slot].name)}.png`);
    let enemySprite = null;
    if (enemy.trainer_battle_sprite != undefined) {
        enemySprite = await loadImage(`./art/NPCs/${enemy.trainer_battle_sprite}.png`)
    }
    const oochEnemy = await loadImage(`./art/ResizedArt/${_.lowerCase(enemy.ooch_party[enemy.ooch_active_slot].name)}.png`);
    const prismIcon = await loadImage('./art/ArtFiles/item_prism.png');
    let playerMemberObj = thread.guild.members.cache.get(user_id);
    const playerName = playerMemberObj.displayName;

    // Player
    ctx.fillStyle = plr.location_data.area = 'fungal_cave' ? 'white' : 'black';
    ctx.font = `italic bold 20px main_med`;
    fillTextScaled(playerName, 'main_med', 20, 150, canvas, 'italic bold');
    ctx.fillText(playerName, 10, 110);
    ctx.fillStyle = 'white';

    // Player Prisms
    for (let i = 0; i < plr.ooch_party.length; i++) {
        ctx.drawImage(prismIcon, 10 + (30 * i), 115);
    }

    // Player Oochamon and Player Sprite
    flipDrawImage(ctx, plrSprite, 27, 157, true); // horizontal mirror
    flipDrawImage(ctx, oochPlr, 65, 180, true); // horizontal mirror
    ctx.font = `10px main_med`;
    ctx.fillText(`Lv. ${plr.ooch_party[plr.ooch_active_slot].level} ${plr.ooch_party[plr.ooch_active_slot].nickname}`, 75, 255);
    ctx.fillText(`HP: ${plr.ooch_party[plr.ooch_active_slot].current_hp} / ${plr.ooch_party[plr.ooch_active_slot].stats.hp}`, 75, 265);

    // Enemy
    ctx.font = `italic bold 20px main_med`;
    ctx.textAlign = 'right';
    ctx.fillStyle = plr.location_data.area = 'fungal_cave' ? 'white' : 'black';
    fillTextScaled(is_npc_battle ? enemy.name : '', 'main_med', 20, 150, canvas, 'italic bold');
    ctx.fillText(is_npc_battle ? `${enemy.name}` : '', 450, 170);
    ctx.fillStyle = 'white';

    if (is_npc_battle) {
        // Enemy Prisms
        for (let i = 0; i < enemy.ooch_party.length; i++) {
            ctx.drawImage(prismIcon, 420 - (30 * i), 120);
        }

        // Enemy Sprite
        ctx.drawImage(enemySprite, 421, 75);
    }

    // Enemy Oochamon
    ctx.drawImage(oochEnemy, 350, 15);
    ctx.font = `10px main_med`;
    ctx.fillText(`Lv. ${enemy.ooch_party[enemy.ooch_active_slot].level} ${enemy.ooch_party[enemy.ooch_active_slot].nickname}`, 410, 90)
    ctx.textAlign = 'left';

    let pngData = canvas.toBufferSync('png');

    return pngData;
},

/**
 * Add a status effect to an oochamon.
 * @param {Object} ooch The oochamon to add a status effect to
 * @param {String} status The status effect to add
 * @returns The affected Oochamon object, with its status added
 */
add_status_effect: function(ooch, status) {
    if (ooch.ability == Ability.Mundane || ooch.status_effects.includes(status)) {
        return ooch;
    }
    ooch.status_effects.push(status);
    return ooch;
},

/**
 * Get the stat multiplier from the stat stage system.
 * @param {Number} stage The stat stage
 * @param {Number} [scalar=2] The scalar to work off of
 * @returns The stat multiplier for stat calculations.
 */
get_stat_multiplier: function(stage, scalar=2) {
    if (scalar < 1) scalar = 1;
    return (stage >= 0) ? (stage / scalar) + 1 : scalar / (Math.abs(stage) + scalar)
}


}