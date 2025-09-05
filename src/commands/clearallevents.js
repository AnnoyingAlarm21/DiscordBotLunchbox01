// Clear all events command - remove all calendar events
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const calendarSystem = require('../utils/calendarSystem');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clearallevents')
    .setDescription('Remove ALL events from your calendar (use with caution!)')
    .addBooleanOption(option =>
      option.setName('confirm')
        .setDescription('Confirm that you want to delete ALL events')
        .setRequired(true)
    ),

  async execute(interaction) {
    try {
      const confirm = interaction.options.getBoolean('confirm');
      const userId = interaction.user.id;
      
      if (!confirm) {
        await interaction.reply('❌ Operation cancelled. You must confirm to delete all events.');
        return;
      }
      
      // Get current event count
      const currentEvents = calendarSystem.getUserCalendar(userId);
      const eventCount = currentEvents.length;
      
      if (eventCount === 0) {
        await interaction.reply('✅ Your calendar is already empty! No events to clear.');
        return;
      }
      
      // Clear all events for the user
      calendarSystem.userCalendars.set(userId, []);
      
      // Save calendar data
      calendarSystem.saveCalendarData();
      
      const embed = new EmbedBuilder()
        .setTitle('🧹 All Events Cleared!')
        .setDescription(`Removed **${eventCount} events** from your calendar`)
        .setColor(0xff0000)
        .addFields(
          { name: '📅 Events Removed', value: `${eventCount} events`, inline: true },
          { name: '🔄 Calendar Sync', value: 'If you have auto-sync enabled, events will be re-added on next sync', inline: false },
          { name: '⚠️ Warning', value: 'This action cannot be undone!', inline: false }
        )
        .setFooter({ text: 'Use /calendarsyncsetup to set up automatic syncing again' });
      
      await interaction.reply({ embeds: [embed] });
      
    } catch (error) {
      console.error('Error in clearallevents command:', error);
      await interaction.reply('❌ Sorry, I had trouble clearing your events. Please try again!');
    }
  }
};
