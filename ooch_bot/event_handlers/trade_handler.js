import { ComponentType } from "discord.js";
import { profile } from "../db.js";

export async function trade_handler(interaction) {

    let customId;

    // Initialize used variables
    if (interaction.componentType == ComponentType.Button) {
        customId = interaction.customId;
    } else {
        customId = interaction.customId;
    }

    const pre = `trade_${interaction.user.id}_`;
    let action = customId.replace(pre, '');
    let user_profile = profile.get(`${interaction.user.id}`);

}