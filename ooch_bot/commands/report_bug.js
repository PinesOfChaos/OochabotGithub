import {
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  MessageFlags,
} from 'discord.js';

import dotenv from 'dotenv';
import process from 'process';
dotenv.config();

export const data = new SlashCommandBuilder()
  .setName('report_bug')
  .setDescription('Report a bug in Oochamon to the Oochamon devs.');

export async function execute(interaction) {
  // Build modal
  const modal = new ModalBuilder()
    .setCustomId('report_bug_modal')
    .setTitle('Report a Bug');

  const titleInput = new TextInputBuilder()
    .setCustomId('bug_title')
    .setLabel('Bug Summary')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const descInput = new TextInputBuilder()
    .setCustomId('bug_desc')
    .setLabel('Please describe the bug in detail')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true);
  
  const imageInput = new TextInputBuilder()
    .setCustomId('bug_images')
    .setLabel('Relevant image links of the bug')
    .setPlaceholder('Attach any relevant image links, if any')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false)

  modal.addComponents(
    new ActionRowBuilder().addComponents(titleInput),
    new ActionRowBuilder().addComponents(descInput),
    new ActionRowBuilder().addComponents(imageInput),
  );

  await interaction.showModal(modal);
}

export async function handleModal(interaction) {
  if (!interaction.isModalSubmit()) return;
  if (interaction.customId !== 'report_bug_modal') return;

  const bugTitle = interaction.fields.getTextInputValue('bug_title');
  const bugDescription = interaction.fields.getTextInputValue('bug_desc');
  const bugImages = interaction.fields.getTextInputValue('bug_images');

  const forumChannelId = process.env.BUG_CHANNEL_ID;

  const forum = interaction.guild.channels.cache.get(forumChannelId);
  if (!forum || forum.type !== 15) {
    return interaction.reply({
      content: 'Bug forum channel not found or not a forum.',
      flags: MessageFlags.Ephemeral
    });
  }

  await forum.threads.create({
    name: `${bugTitle}`,
    message: {
      content: `*Bug Reported by <@${interaction.user.id}>*\n\n${bugDescription}\n\nAttached Images:\n${bugImages}`,
    },
  });

  await interaction.reply({
    content: 'Your bug report has been submitted, and will be reviewed by the developers.',
    flags: MessageFlags.Ephemeral
  });
}
