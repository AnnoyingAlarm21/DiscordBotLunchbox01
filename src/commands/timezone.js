// Timezone command - set user timezone
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const timezoneSystem = require('../utils/timezoneSystem');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('timezone')
    .setDescription('Set your timezone for calendar events')
    .addStringOption(option =>
      option.setName('timezone')
        .setDescription('Your timezone')
        .setRequired(true)
        .addChoices(
          { name: 'Eastern Time (EST/EDT)', value: 'America/New_York' },
          { name: 'Central Time (CST/CDT)', value: 'America/Chicago' },
          { name: 'Mountain Time (MST/MDT)', value: 'America/Denver' },
          { name: 'Pacific Time (PST/PDT)', value: 'America/Los_Angeles' },
          { name: 'Greenwich Mean Time (GMT)', value: 'Europe/London' },
          { name: 'Central European Time (CET/CEST)', value: 'Europe/Paris' },
          { name: 'Japan Standard Time (JST)', value: 'Asia/Tokyo' },
          { name: 'India Standard Time (IST)', value: 'Asia/Kolkata' },
          { name: 'Australian Eastern Time (AEST/AEDT)', value: 'Australia/Sydney' },
          { name: 'UTC (Coordinated Universal Time)', value: 'UTC' }
        )
    ),

  async execute(interaction) {
    try {
      const timezone = interaction.options.getString('timezone');
      const userId = interaction.user.id;
      
      // Set user timezone
      timezoneSystem.setUserTimezone(userId, timezone);
      
      // Save timezone data
      timezoneSystem.saveTimezoneData();
      
      // Get current time in user's timezone
      const now = new Date();
      const userTime = now.toLocaleString('en-US', { 
        timeZone: timezone,
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      
      const offset = timezoneSystem.getTimezoneOffset(timezone);
      
      const embed = new EmbedBuilder()
        .setTitle('🌍 Timezone Set Successfully!')
        .setDescription(`Your timezone has been set to **${timezone}**`)
        .addFields(
          { name: '🕐 Current Time', value: userTime, inline: true },
          { name: '⏰ UTC Offset', value: offset, inline: true },
          { name: '📅 Calendar Events', value: 'All future calendar events will be displayed in your timezone', inline: false }
        )
        .setColor(0x00ff00)
        .setFooter({ text: 'Use /calendarsync to import events with proper timezone conversion!' });
      
      await interaction.reply({ embeds: [embed] });
      
    } catch (error) {
      console.error('Error in timezone command:', error);
      await interaction.reply('❌ Sorry, I had trouble setting your timezone. Please try again!');
    }
  }
};
