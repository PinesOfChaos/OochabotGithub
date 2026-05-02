import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, ContainerBuilder, MediaGalleryBuilder, MessageFlags, SeparatorBuilder, SeparatorSpacingSize, StringSelectMenuBuilder, TextDisplayBuilder } from "discord.js";
import { item_data, profile, shop_data } from "../db.js";
import { get_inv_item, setup_playspace_str, shop_list_from_flags, add_item } from "../func_play.js";
import { PlayerState } from "../types.js";

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

    function buildShopContainer(shopTextContent, actionRows) {
        let greetingDialogue = shop_state.shop_obj?.greeting_dialogue || '';
        let shopHeader = new TextDisplayBuilder().setContent(`## Shop`);
        let shopGallery = new MediaGalleryBuilder().addItems({ media: { url: 'attachment://shopPlaceholder.png' } });
        let shopGreeting = new TextDisplayBuilder().setContent(greetingDialogue);
        let shopSpacer = new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large);
        let shopText = false;
        if (shopTextContent) shopText = new TextDisplayBuilder().setContent(shopTextContent);

        let shopContainer = new ContainerBuilder()
            .addTextDisplayComponents(shopHeader)
            .addMediaGalleryComponents(shopGallery)
            .addTextDisplayComponents(shopGreeting)
            .addSeparatorComponents(shopSpacer);
        if (shopText) shopContainer
            .addTextDisplayComponents(shopText);

        for (let row of actionRows) {
            shopContainer.addActionRowComponents(row);
        }

        return shopContainer;
    }

    if (action == 'back') {
        shop_data.delete(user_id);
        profile.set(user_id, PlayerState.Playspace, 'player_state');
        let playspace_str = await setup_playspace_str(user_id);
        let play_msg = await interaction.channel.send({ components: playspace_str.components, flags: playspace_str.flags });
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
            let shopContainer = buildShopContainer(
                `You do not have enough Oochabux to purchase ${item.emote} **${item.name}**.`,
                [shopSelectMenu, back_button]
            );

            await interaction.update({ components: [shopContainer], flags: MessageFlags.IsComponentsV2 });
            return;
        }

        if (current_qty >= 50) {
            let shopSelectMenu = await buildShopMenu();
            let shopContainer = buildShopContainer(
                `Your inventory is full! You cannot carry any more ${item.emote} **${item.name}**.`,
                [shopSelectMenu, back_button]
            );

            await interaction.update({ components: [shopContainer], flags: MessageFlags.IsComponentsV2 });
            return;
        }

        shop_state.selected_item = item_id;
        shop_data.set(user_id, shop_state);

        let qtyButtons1 = new ActionRowBuilder();
        let qtyButtons2 = new ActionRowBuilder();

        for (let i = 1; i <= 5; i++) {
            qtyButtons1.addComponents(
                new ButtonBuilder()
                    .setCustomId(`${pre}buy_${i}`)
                    .setLabel(`${i}`)
                    .setStyle(ButtonStyle.Primary)
            );
        }

        for (let i = 10; i <= 50; i += 10) {
            qtyButtons2.addComponents(
                new ButtonBuilder()
                    .setCustomId(`${pre}buy_${i}`)
                    .setLabel(`${i}`)
                    .setStyle(ButtonStyle.Primary)
            );
        }

        let extraButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`${pre}buy_9999`)
                    .setLabel('Buy Max')
                    .setStyle(ButtonStyle.Success)
            )
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`${pre}cancel`)
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Danger)
            );

        let purchaseTextContent = `**${item.emote} ${item.name}**\n*${item.description_short}*\n\nPrice: **$${item.price}** each\nYou have: **$${oochabux}**\nCurrently owned: **${current_qty}/50**\n\nHow many would you like to buy?`;

        let actionRows = [qtyButtons1, qtyButtons2];
        actionRows.push(extraButtons);

        let shopContainer = buildShopContainer(purchaseTextContent, actionRows);

        await interaction.update({ components: [shopContainer], flags: MessageFlags.IsComponentsV2 });
        return;
    }

    if (action == 'cancel') {
        shop_state.selected_item = null;
        shop_data.set(user_id, shop_state);

        let shopSelectMenu = await buildShopMenu();

        let shopContainer = buildShopContainer(
            ``,
            [shopSelectMenu, back_button]
        );

        await interaction.update({ components: [shopContainer], flags: MessageFlags.IsComponentsV2 });
        return;
    }

    if (action.startsWith('buy_')) {
        let buyAmount = parseInt(action.replace('buy_', ''));
        if (isNaN(buyAmount)) buyAmount = 999;
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
            let shopContainer = buildShopContainer(
                `Unable to buy.`,
                [shopSelectMenu, back_button]
            );

            await interaction.update({ components: [shopContainer], flags: MessageFlags.IsComponentsV2 });
            return;
        }

        oochabux -= totalCost;
        profile.set(user_id, oochabux, 'oochabux');
        add_item(user_id, item_id, buyAmount);

        let new_qty = get_inv_item(user_id, item.category, item_id).quantity;

        shop_state.selected_item = null;
        shop_data.set(user_id, shop_state);

        let shopSelectMenu = await buildShopMenu();
        let shopContainer = buildShopContainer(
            `Successfully purchased **${buyAmount}x** ${item.emote} **${item.name}** for **$${totalCost}**!\nYou now have **${new_qty} ${item.name}${new_qty > 1 ? 's' : ''}** in your inventory.`,
            [shopSelectMenu, back_button]
        );

        await interaction.update({ components: [shopContainer], flags: MessageFlags.IsComponentsV2 });
    }
}

export function init_shop_state(user_id, shop_obj) {
    shop_data.set(user_id, {
        user_id: user_id,
        selected_item: null,
        shop_obj: shop_obj
    });
}
