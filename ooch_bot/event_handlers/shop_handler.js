import wait from "wait";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder, StringSelectMenuBuilder } from "discord.js";
import { item_data, profile } from "../db.js";
import { get_inv_item, setup_playspace_str, shop_list_from_flags, add_item } from "../func_play.js";
import { PlayerState } from "../types.js";

const shop_data = new Map();

export async function shop_handler(interaction) {
    let customId, selected;
    let user_id = interaction.user.id;
    let user_profile = profile.get(`${user_id}`);
    let msg = interaction.message;

    if (interaction.componentType == ComponentType.Button) {
        customId = interaction.customId;
    } else {
        customId = interaction.customId;
        selected = interaction.values[0];
    }

    const pre = `shop_${user_id}_`;
    let action = customId.replace(pre, '');

    if (user_profile.play_thread_id != interaction.channel.id) {
        return interaction.user.send('Stop trying to use other peoples buttons! They are not for you!');
    }

    if (!shop_data.has(user_id)) {
        shop_data.set(user_id, {
            user_id: user_id,
            selected_item: null,
            shop_obj: null
        });
    }

    let shop_state = shop_data.get(user_id);
    let oochabux = user_profile.oochabux;

    let back_button = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`${pre}back`)
                .setLabel('Back')
                .setStyle(ButtonStyle.Danger)
        );

    async function buildShopMenu() {
        let profile_flags = profile.get(`${user_id}`, 'flags');
        let shopSelectOptions = shop_list_from_flags(shop_state.shop_obj || { special_items: [], type: 'default' }, profile_flags);

        shopSelectOptions = shopSelectOptions.flat(1);
        shopSelectOptions = [...new Set(shopSelectOptions)];
        shopSelectOptions = shopSelectOptions.map(id => {
            let db_item_data = item_data.get(`${id}`);
            let inv_item_data = get_inv_item(user_id, db_item_data.category, id);
            return {
                label: `${db_item_data.name} (${inv_item_data ? inv_item_data.quantity : 0}/50) [$${db_item_data.price}]`,
                description: db_item_data.description_short.slice(0, 100),
                value: `${id}`,
                emoji: db_item_data.emote,
            };
        });

        let currentOochabux = profile.get(`${user_id}`, 'oochabux');

        let shopSelectMenu = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId(`${pre}items`)
                    .setPlaceholder(`Select an item to buy! ($${currentOochabux})`)
                    .addOptions(shopSelectOptions)
            );

        return shopSelectMenu;
    }

    if (action == 'back') {
        shop_data.delete(user_id);
        profile.set(user_id, PlayerState.Playspace, 'player_state');
        let playspace_str = await setup_playspace_str(user_id);
        let play_msg = await interaction.channel.send({ content: playspace_str[0], components: playspace_str[1] });
        profile.set(user_id, play_msg.id, 'display_msg_id');
        await msg.delete().catch(() => {});
        return;
    }

    if (action == 'items') {
        let item_id = selected;
        let item = item_data.get(`${item_id}`);
        let inv_item = get_inv_item(user_id, item.category, item_id);
        let current_qty = inv_item ? inv_item.quantity : 0;
        oochabux = profile.get(`${user_id}`, 'oochabux');

        if (item.price > oochabux) {
            let shopSelectMenu = await buildShopMenu();
            let shopEmbed = new EmbedBuilder()
                .setColor('#808080')
                .setTitle('Shop')
                .setDescription(`You do not have enough Oochabux to purchase ${item.emote} **${item.name}**.`);

            await interaction.update({ embeds: [shopEmbed], components: [shopSelectMenu, back_button] });
            return;
        }

        if (current_qty >= 50) {
            let shopSelectMenu = await buildShopMenu();
            let shopEmbed = new EmbedBuilder()
                .setColor('#808080')
                .setTitle('Shop')
                .setDescription(`Your inventory is full! You cannot carry any more ${item.emote} **${item.name}**.`);

            await interaction.update({ embeds: [shopEmbed], components: [shopSelectMenu, back_button] });
            return;
        }

        let maxAffordable = Math.floor(oochabux / item.price);
        let maxCarryable = 50 - current_qty;
        let maxAmount = Math.min(maxAffordable, maxCarryable, 10);

        shop_state.selected_item = item_id;
        shop_data.set(user_id, shop_state);

        let qtyButtons1 = new ActionRowBuilder();
        let qtyButtons2 = new ActionRowBuilder();

        for (let i = 1; i <= Math.min(maxAmount, 5); i++) {
            qtyButtons1.addComponents(
                new ButtonBuilder()
                    .setCustomId(`${pre}buy_${i}`)
                    .setLabel(`${i}`)
                    .setStyle(ButtonStyle.Primary)
            );
        }

        if (maxAmount > 5) {
            for (let i = 6; i <= maxAmount; i++) {
                qtyButtons2.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`${pre}buy_${i}`)
                        .setLabel(`${i}`)
                        .setStyle(ButtonStyle.Primary)
                );
            }
        }

        let cancelButton = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`${pre}cancel`)
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Danger)
            );

        let purchaseEmbed = new EmbedBuilder()
            .setColor('#808080')
            .setTitle('Shop')
            .setDescription(`**${item.emote} ${item.name}**\n*${item.description_short}*\n\nPrice: **$${item.price}** each\nYou have: **$${oochabux}**\nCurrently owned: **${current_qty}/50**\n\nHow many would you like to buy?`);

        let components = [qtyButtons1];
        if (qtyButtons2.components.length > 0) components.push(qtyButtons2);
        components.push(cancelButton);

        await interaction.update({ embeds: [purchaseEmbed], components: components });
        return;
    }

    if (action == 'cancel') {
        shop_state.selected_item = null;
        shop_data.set(user_id, shop_state);

        let shopSelectMenu = await buildShopMenu();
        oochabux = profile.get(`${user_id}`, 'oochabux');

        let shopEmbed = new EmbedBuilder()
            .setColor('#808080')
            .setTitle('Shop')
            .setFooter({ text: `Oochabux: $${oochabux}` });

        await interaction.update({ embeds: [shopEmbed], components: [shopSelectMenu, back_button] });
        return;
    }

    if (action.startsWith('buy_')) {
        let buyAmount = parseInt(action.replace('buy_', ''));
        let item_id = shop_state.selected_item;
        let item = item_data.get(`${item_id}`);
        let inv_item = get_inv_item(user_id, item.category, item_id);
        let current_qty = inv_item ? inv_item.quantity : 0;
        oochabux = profile.get(`${user_id}`, 'oochabux');

        let totalCost = item.price * buyAmount;
        if (totalCost > oochabux) {
            buyAmount = Math.floor(oochabux / item.price);
            totalCost = item.price * buyAmount;
        }

        if (buyAmount + current_qty > 50) {
            buyAmount = 50 - current_qty;
            totalCost = item.price * buyAmount;
        }

        if (buyAmount <= 0) {
            let shopSelectMenu = await buildShopMenu();
            let shopEmbed = new EmbedBuilder()
                .setColor('#808080')
                .setTitle('Shop')
                .setDescription(`Unable to buy.`);

            await interaction.update({ embeds: [shopEmbed], components: [shopSelectMenu, back_button] });
            return;
        }

        oochabux -= totalCost;
        profile.set(user_id, oochabux, 'oochabux');
        add_item(user_id, item_id, buyAmount);

        let new_qty = get_inv_item(user_id, item.category, item_id).quantity;

        shop_state.selected_item = null;
        shop_data.set(user_id, shop_state);

        let shopSelectMenu = await buildShopMenu();
        let shopEmbed = new EmbedBuilder()
            .setColor('#808080')
            .setTitle('Shop')
            .setFooter({ text: `Oochabux: $${oochabux}` });

        await interaction.update({ embeds: [shopEmbed], components: [shopSelectMenu, back_button] });

        let followUpMsg = await interaction.channel.send({
            content: `Successfully purchased **${buyAmount}x** ${item.emote} **${item.name}** for **$${totalCost}**!\nYou now have **${new_qty} ${item.name}${new_qty > 1 ? 's' : ''}** in your inventory.`
        });

        await wait(5000);
        await followUpMsg.delete().catch(() => {});
    }
}

export function init_shop_state(user_id, shop_obj) {
    shop_data.set(user_id, {
        user_id: user_id,
        selected_item: null,
        shop_obj: shop_obj
    });
}
