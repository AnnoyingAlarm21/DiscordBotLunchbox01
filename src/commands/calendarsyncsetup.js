// Calendar sync setup command - configure automatic syncing
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const calendarSyncSystem = require('../utils/calendarSyncSystem');
const timezoneSystem = require('../utils/timezoneSystem');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('calendarsyncsetup')
    .setDescription('Set up automatic calendar syncing from a URL')
    .addStringOption(option =>
      option.setName('name')
        .setDescription('Name for this sync (e.g., "School Calendar")')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('url')
        .setDescription('URL to the .ics calendar file')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName('interval')
        .setDescription('Sync interval in minutes (default: 60)')
        .setMinValue(15)
        .setMaxValue(1440)
        .setRequired(false)
    ),

  async execute(interaction) {
    try {
      const name = interaction.options.getString('name');
      const url = interaction.options.getString('url');
      const interval = interaction.options.getInteger('interval') || 60;
      const userId = interaction.user.id;
      
      // Validate URL
      try {
        new URL(url);
      } catch (error) {
        await interaction.reply('❌ Invalid URL format. Please provide a valid URL to an .ics file.');
        return;
      }
      
      // Check if user has timezone set
      const userTimezone = timezoneSystem.getUserTimezone(userId);
      if (userTimezone === 'UTC') {
        const embed = new EmbedBuilder()
          .setTitle('⚠️ Timezone Not Set')
          .setDescription('Please set your timezone first to ensure proper event scheduling!')
          .setColor(0xffaa00)
          .addFields(
            { name: '🌍 Set Timezone', value: 'Use `/timezone` to set your timezone before syncing calendars', inline: false }
          );
        
        await interaction.reply({ embeds: [embed] });
        return;
      }
      
      await interaction.deferReply();
      
      // Test the URL by fetching it
      try {
        const response = await fetch(url);
        if (!response.ok) {
          await interaction.editReply(`❌ Failed to fetch calendar from URL. HTTP ${response.status}: ${response.statusText}`);
          return;
        }
        
        const content = await response.text();
        if (!content.includes('BEGIN:VCALENDAR')) {
          await interaction.editReply('❌ The URL does not contain a valid .ics calendar file.');
          return;
        }
      } catch (error) {
        await interaction.editReply('❌ Failed to access the calendar URL. Please check the URL and try again.');
        return;
      }
      
      // Create sync configuration
      const syncConfig = calendarSyncSystem.createSyncConfig(userId, {
        name: name,
        icsUrl: url,
        syncInterval: interval
      });
      
      // Start automatic syncing
      calendarSyncSystem.startSync(userId, syncConfig.id);
      
      // Save configurations
      calendarSyncSystem.saveSyncConfigs();
      
      const embed = new EmbedBuilder()
        .setTitle('🔄 Calendar Sync Setup Complete!')
        .setDescription(`**${name}** is now syncing automatically`)
        .addFields(
          { name: '📅 Calendar URL', value: url, inline: false },
          { name: '⏰ Sync Interval', value: `Every ${interval} minutes`, inline: true },
          { name: '🌍 Timezone', value: userTimezone, inline: true },
          { name: '🔄 Status', value: 'Active', inline: true }
        )
        .setColor(0x00ff00)
        .setFooter({ text: 'Your calendar will be updated automatically. Use /calendarsynclist to manage syncs.' });
      
      await interaction.editReply({ embeds: [embed] });
      
    } catch (error) {
      console.error('Error in calendarsyncsetup command:', error);
      await interaction.editReply('❌ Sorry, I had trouble setting up calendar sync. Please check your URL and try again!');
    }
  }
};
