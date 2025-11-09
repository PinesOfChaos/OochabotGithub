// import wait from "wait";
// import { item_data, profile } from "../db";
// import { get_inv_item, setup_playspace_str, shop_list_from_flags } from "../func_play";
// import { PlayerState } from "../types";
// import { ActionRowBuilder, StringSelectMenuBuilder } from "discord.js";

// // Shop operation is handled in this
// export async function shop_handler(interaction) {

//     let user_id = interaction.user.id;
//     let user_profile = profile.get(`${interaction.user.id}`);
//     let oochabux = user_profile.oochabux;
//     let customId = interaction.customId;
//     let msg = interaction.message;

//     const pre = `shop_${user_id}_`;
//     let action = customId.replace(pre, '');

//     if (action == 'back') {
//         profile.set(user_id, PlayerState.Playspace, 'player_state');
//         let playspace_str = await setup_playspace_str(user_id);
//         let play_msg = await interaction.channel.send({ content: playspace_str[0], components: playspace_str[1] });
//         profile.set(user_id, play_msg.id, 'display_msg_id')
//         profile.set(user_id, oochabux, 'oochabux')
//         await msg.delete().catch(() => {});
//         return;
//     }
    
//     if (action == 'quantity_back') {
//         await interaction.update({ content: null, components: [shopSelectMenu, back_button], embeds: [shopEmbed], files: [shopImage] }).catch(() => {});
//         return;
//     }
            
//     let item_id = interaction.values[0];
//     let item = item_data.get(`${item_id}`);
//     if (item.price <= oochabux) {
//         const qty_filter = async m => {
//             if (m.author.id != user_id) return false;
//             if (!isNaN(parseInt(m.content))) {
//                 if (oochabux < item.price * parseInt(m.content)) {
//                     m.delete().catch(() => {});
//                     return false;
//                 }
//                 return true;
//             } else {
//                 m.delete().catch(() => {});
//                 return false;
//             }
//         }

//         let inv_item = get_inv_item(user_id, item.category, item_id);
//         if (!inv_item) inv_item = { id: item_id, quantity: 0 }

//         let maxAmt = Math.floor(oochabux / item.price);
//         if (maxAmt > 50) maxAmt = 50;
//         if (maxAmt > inv_item.quantity) maxAmt -= inv_item.quantity;

//         if (inv_item.quantity >= 50) {
//             await interaction.update({ content: null, components: [shopSelectMenu, back_button], embeds: [shopEmbed], files: [shopImage] }).catch(() => {});
//             return;
//         }

//         if (inv_item) {
//             await interaction.update({ content: null });

        
//             let new_inv_qty = 0;
//             let buyAmount = Math.abs(parseInt(m.content));
//             if (buyAmount > (50 - inv_item.quantity)) buyAmount = (50 - inv_item.quantity);
//             oochabux -= item.price * buyAmount;
//             profile.set(user_id, oochabux, 'oochabux')
            
//             add_item(user_id, item_id, buyAmount);

//             new_inv_qty = get_inv_item(user_id, item.category, item_id).quantity;
            
//             await m.delete().catch(() => {});
//             let followUpMsg;
                
//             let profile_flags = profile.get(`${user_id}`, 'flags');
//             let shopSelectOptions = await shop_list_from_flags(obj, profile_flags);

//             shopSelectOptions = [...new Set(shopSelectOptions)];

//             shopSelectOptions = shopSelectOptions.map(id => {
//                 let db_item_data = item_data.get(`${id}`);
//                 let inv_item_data = get_inv_item(user_id, db_item_data.category, id);
//                 return { 
//                     label: `${db_item_data.name} (${inv_item_data ? inv_item_data.quantity : 0 }/50) [$${db_item_data.price}]`,
//                     description: db_item_data.description_short,
//                     value: `${id}`,
//                     emoji: db_item_data.emote,
//                 }
//             });

//             // Setup shop select menu
//             let shopSelectMenu = new ActionRowBuilder()
//             .addComponents(
//                 new StringSelectMenuBuilder()
//                     .setCustomId('shop_items')
//                     .setPlaceholder(`Select an item to buy! ($${oochabux})`)
//                     .addOptions(shopSelectOptions),
//             );

//             if (buyAmount != 0) {
//                 followUpMsg = await interaction.channel.send({ content: `Successfully purchased ${buyAmount}x ${item.emote} **${item.name}** from the shop!\nYou now have **${new_inv_qty} ${item.name}${new_inv_qty > 1 ? 's' : ''}** in your inventory.` });
//             } else {
//                 followUpMsg = await interaction.channel.send({ content: `Nothing was purchased.` });
//             }
//             await msg.edit({ content: null, components: [shopSelectMenu, back_button], embeds: [shopEmbed], files: [shopImage] }).catch(() => {});
//             await wait(7000);
//             await followUpMsg.delete().catch(() => {});
//         }
//     } else {
//         let followUpMsg = await interaction.channel.send({ content: `You do not have enough money to purchase a ${item.emote} **${item.name}**.` });
//         msg.edit({ content: null }).catch(() => {});
//         await wait(5000);
//         await followUpMsg.delete().catch(() => {});
//     }
// }