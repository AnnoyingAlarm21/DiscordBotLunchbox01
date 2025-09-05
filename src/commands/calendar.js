// Calendar command - view calendar
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const calendarSystem = require('../utils/calendarSystem');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('calendar')
    .setDescription('View your calendar')
    .addIntegerOption(option =>
      option.setName('month')
        .setDescription('Month (1-12)')
        .setMinValue(1)
        .setMaxValue(12)
        .setRequired(false)
    )
    .addIntegerOption(option =>
      option.setName('year')
        .setDescription('Year (e.g., 2025)')
        .setMinValue(2020)
        .setMaxValue(2030)
        .setRequired(false)
    ),

  async execute(interaction) {
    try {
      const month = interaction.options.getInteger('month') || new Date().getMonth() + 1;
      const year = interaction.options.getInteger('year') || new Date().getFullYear();
      
      const userId = interaction.user.id;
      
      // Create calendar embed
      const calendarEmbed = calendarSystem.createCalendarEmbed(userId, year, month);
      
      const embed = new EmbedBuilder()
        .setTitle(calendarEmbed.title)
        .setDescription(calendarEmbed.description)
        .setColor(calendarEmbed.color)
        .setFooter(calendarEmbed.footer);
      
      await interaction.reply({ embeds: [embed] });
      
    } catch (error) {
      console.error('Error in calendar command:', error);
      await interaction.reply('❌ Sorry, I had trouble loading your calendar. Please try again!');
    }
  }
};