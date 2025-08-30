const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('canceltimer')
    .setDescription('Cancel an active timer')
    .addStringOption(option =>
      option.setName('timer_id')
        .setDescription('The ID of the timer to cancel (from /timer command)')
        .setRequired(true)
    ),

  async execute(interaction, client) {
    try {
      const timerId = interaction.options.getString('timer_id');
      const userId = interaction.user.id;
      const username = interaction.user.username;
      
      console.log(`⏰ Cancel timer requested by ${username} (${userId}) - Timer ID: ${timerId}`);
      
      // Check if user has active timers
      if (!client.activeTimers || !client.activeTimers.has(timerId)) {
        await interaction.reply({ 
          content: '❌ **Timer Not Found!**\n\n⏰ No active timer found with that ID.\n\n💡 **To see your active timers:** Use `/mytimers`\n💡 **To set a new timer:** Use `/timer`', 
          ephemeral: true 
        });
        return;
      }
      
      // Get timer info
      const timerInfo = client.activeTimers.get(timerId);
      
      // Check if user owns this timer
      if (timerInfo.userId !== userId) {
        await interaction.reply({ 
          content: '❌ **Access Denied!**\n\n⏰ You can only cancel your own timers.\n\n💡 **To see your active timers:** Use `/mytimers`', 
          ephemeral: true 
        });
        return;
      }
      
      // Check if timer is still active
      if (!timerInfo.isActive) {
        await interaction.reply({ 
          content: '❌ **Timer Already Finished!**\n\n⏰ This timer has already completed and cannot be cancelled.\n\n💡 **To set a new timer:** Use `/timer`', 
          ephemeral: true 
        });
        return;
      }
      
      // Cancel the timer
      timerInfo.isActive = false;
      client.activeTimers.set(timerId, timerInfo);
      
      // Calculate time remaining
      const timeRemaining = Math.max(0, timerInfo.endTime.getTime() - Date.now());
      const minutesRemaining = Math.ceil(timeRemaining / (1000 * 60));
      
      const cancelMessage = `⏰ **Timer Cancelled Successfully!**\n\n🏷️ **Label:** ${timerInfo.label}\n⏱️ **Duration:** ${timerInfo.minutes} minute${timerInfo.minutes > 1 ? 's' : ''}\n⏰ **Time Remaining:** ${minutesRemaining} minute${minutesRemaining > 1 ? 's' : ''}\n\n✅ **Timer stopped!** No more notifications will be sent.\n\n💡 **To set a new timer:** Use \`/timer\``;
      
      await interaction.reply({ content: cancelMessage, ephemeral: true });
      
      console.log(`⏰ Timer ${timerId} cancelled by user ${username}`);
      
    } catch (error) {
      console.error('❌ Error in cancel timer command:', error);
      await interaction.reply({ 
        content: '❌ Error cancelling timer: ' + error.message, 
        ephemeral: true 
      });
    }
  },
};
