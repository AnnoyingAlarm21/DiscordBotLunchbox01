// Emergency stop command - immediately stop all reminders and clear old events
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const calendarSystem = require('../utils/calendarSystem');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('emergencystop')
    .setDescription('EMERGENCY: Stop all reminders and clear old events immediately'),

  async execute(interaction) {
    try {
      const userId = interaction.user.id;
      
      await interaction.deferReply();
      
      // 1. Clear all old events
      const userCalendar = calendarSystem.getUserCalendar(userId);
      const now = new Date();
      const futureEvents = userCalendar.filter(event => event.startDate >= now);
      const pastEventsCount = userCalendar.length - futureEvents.length;
      
      calendarSystem.userCalendars.set(userId, futureEvents);
      
      // 2. Stop all active reminders
      let stoppedReminders = 0;
      if (global.reminderSystem) {
        const userReminders = global.reminderSystem.getUserReminders(userId);
        userReminders.forEach(reminder => {
          global.reminderSystem.cancelReminders(reminder.taskId);
          stoppedReminders++;
        });
      }
      
      // 3. Save data
      calendarSystem.saveCalendarData();
      
      const embed = new EmbedBuilder()
        .setTitle('🚨 EMERGENCY STOP COMPLETE!')
        .setDescription('All reminders stopped and old events cleared!')
        .setColor(0xff0000)
        .addFields(
          { name: '🗑️ Old Events Removed', value: `${pastEventsCount} past events`, inline: true },
          { name: '🛑 Reminders Stopped', value: `${stoppedReminders} active reminders`, inline: true },
          { name: '📅 Future Events', value: `${futureEvents.length} events remain`, inline: true },
          { name: '✅ Status', value: 'No more spam DMs!', inline: false }
        )
        .setFooter({ text: 'Use /restartbot if you need to fully restart the bot' });
      
      await interaction.editReply({ embeds: [embed] });
      
      console.log(`🚨 Emergency stop executed by user ${userId}: ${pastEventsCount} old events removed, ${stoppedReminders} reminders stopped`);
      
    } catch (error) {
      console.error('Error in emergencystop command:', error);
      await interaction.editReply('❌ Sorry, I had trouble with the emergency stop. Please try again!');
    }
  }
};
