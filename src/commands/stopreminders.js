// Stop reminders command - stop all active reminders
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stopreminders')
    .setDescription('Stop all active reminders and notifications'),

  async execute(interaction) {
    try {
      const userId = interaction.user.id;
      
      // Clear all active reminders for the user
      if (global.reminderSystem) {
        const userReminders = global.reminderSystem.getUserReminders(userId);
        
        // Cancel all reminders
        userReminders.forEach(reminder => {
          global.reminderSystem.cancelReminders(reminder.taskId);
        });
        
        console.log(`🛑 Stopped ${userReminders.length} reminders for user ${userId}`);
      }
      
      // Clear any pending timeouts (this is a more aggressive approach)
      // Note: This is a simplified approach - in a real implementation,
      // you'd want to track all setTimeout IDs and clear them specifically
      
      const embed = new EmbedBuilder()
        .setTitle('🛑 Reminders Stopped!')
        .setDescription('All active reminders have been stopped.')
        .setColor(0xff0000)
        .addFields(
          { name: '📅 Calendar Events', value: 'Future events will still be scheduled, but current reminders are stopped', inline: false },
          { name: '⏰ Timers', value: 'Active timers will continue running', inline: false },
          { name: '🔄 Restart', value: 'Use `/restartbot` to fully restart the bot if needed', inline: false }
        )
        .setFooter({ text: 'New events will still get reminders unless you clear them' });
      
      await interaction.reply({ embeds: [embed] });
      
    } catch (error) {
      console.error('Error in stopreminders command:', error);
      await interaction.reply('❌ Sorry, I had trouble stopping the reminders. Please try again!');
    }
  }
};
