import { EmbedBuilder } from 'discord.js';
import { botClient } from '../index.js';

export async function reportCrash(error, context = 'Unknown') {
    try {
        const channel = await botClient.channels.fetch(process.env.CRASH_CHANNEL_ID);
        if (!channel) return;

        const stack = error?.stack || String(error);
        const truncatedStack = stack.length > 1015 ? stack.slice(0, 1015) + '...' : stack;

        const embed = new EmbedBuilder()
            .setTitle('Bot Crash / Unhandled Error')
            .addFields(
                { name: 'Context', value: context },
                { name: 'Error', value: `\`\`\`${truncatedStack}\`\`\`` },
            )
            .setTimestamp();

        await channel.send({ embeds: [embed] });
    } catch (reportingError) {
        console.error('Failed to report crash to Discord:', reportingError);
    }
}
