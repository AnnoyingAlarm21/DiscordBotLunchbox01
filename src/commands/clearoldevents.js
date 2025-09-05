// Clear old events command - remove past events from calendar
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const calendarSystem = require('../utils/calendarSystem');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clearoldevents')
    .setDescription('Remove all past events from your calendar'),

  async execute(interaction) {
    try {
      const userId = interaction.user.id;
      const userCalendar = calendarSystem.getUserCalendar(userId);
      const now = new Date();
      
      // Filter out past events
      const futureEvents = userCalendar.filter(event => event.startDate >= now);
      const pastEventsCount = userCalendar.length - futureEvents.length;
      
      if (pastEventsCount === 0) {
        await interaction.reply('✅ Your calendar is already clean! No past events found.');
        return;
      }
      
      // Update user's calendar with only future events
      calendarSystem.userCalendars.set(userId, futureEvents);
      
      // Save calendar data
      calendarSystem.saveCalendarData();
      
      const embed = new EmbedBuilder()
        .setTitle('🧹 Old Events Cleared!')
        .setDescription(`Removed **${pastEventsCount} past events** from your calendar`)
        .setColor(0x00ff00)
        .addFields(
          { name: '📅 Remaining Events', value: `${futureEvents.length} future events`, inline: true },
          { name: '🗑️ Removed Events', value: `${pastEventsCount} past events`, inline: true }
        )
        .setFooter({ text: 'Your calendar now only shows upcoming events!' });
      
      await interaction.reply({ embeds: [embed] });
      
    } catch (error) {
      console.error('Error in clearoldevents command:', error);
      await interaction.reply('❌ Sorry, I had trouble clearing your old events. Please try again!');
    }
  }
};
