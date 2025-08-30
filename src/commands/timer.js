const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('timer')
    .setDescription('Set a countdown timer and get notified when it goes off')
    .addIntegerOption(option =>
      option.setName('minutes')
        .setDescription('How many minutes to count down')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(1440) // Max 24 hours
    )
    .addStringOption(option =>
      option.setName('label')
        .setDescription('What is this timer for? (optional)')
        .setRequired(false)
    ),

  async execute(interaction, client) {
    try {
      const minutes = interaction.options.getInteger('minutes');
      const label = interaction.options.getString('label') || 'Timer';
      const userId = interaction.user.id;
      const username = interaction.user.username;
      
      console.log(`⏰ Timer requested by ${username} (${userId}) - ${minutes} minutes for: ${label}`);
      
      // Defer reply since timer might take a while
      await interaction.deferReply({ ephemeral: true });
      
      // Calculate end time
      const endTime = new Date(Date.now() + (minutes * 60 * 1000));
      const timeString = endTime.toLocaleTimeString();
      
      // Create timer ID
      const timerId = `timer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Store timer info
      if (!client.activeTimers) client.activeTimers = new Map();
      client.activeTimers.set(timerId, {
        userId,
        username,
        label,
        endTime,
        minutes,
        startTime: new Date(),
        isActive: true
      });
      
      console.log(`⏰ Timer ${timerId} created: ${minutes} minutes for ${label}`);
      
      // Send confirmation
      const confirmMessage = `⏰ **Timer Set Successfully!**\n\n⏱️ **Duration:** ${minutes} minute${minutes > 1 ? 's' : ''}\n🏷️ **Label:** ${label}\n⏰ **Ends at:** ${timeString}\n\n🔔 **You'll get DM notifications every 5 seconds when it goes off!**\n\n💡 **To cancel:** Use \`/canceltimer ${timerId}\` (ID: \`${timerId}\`)`;
      
      await interaction.editReply(confirmMessage);
      
      // Set the timer
      const timerDuration = minutes * 60 * 1000; // Convert to milliseconds
      
      setTimeout(async () => {
        await this.timerFinished(client, timerId, userId, username, label);
      }, timerDuration);
      
      console.log(`⏰ Timer ${timerId} will finish in ${minutes} minutes`);
      
    } catch (error) {
      console.error('❌ Error in timer command:', error);
      await interaction.editReply('❌ Error setting timer: ' + error.message);
    }
  },

  // Method called when timer finishes
  async timerFinished(client, timerId, userId, username, label) {
    try {
      console.log(`⏰ Timer ${timerId} finished for user ${username}`);
      
      // Get timer info
      const timerInfo = client.activeTimers.get(timerId);
      if (!timerInfo || !timerInfo.isActive) {
        console.log(`⏰ Timer ${timerId} was cancelled or already finished`);
        return;
      }
      
      // Mark timer as finished
      timerInfo.isActive = false;
      client.activeTimers.set(timerId, timerInfo);
      
      // Send DM notifications every 5 seconds for 1 minute (12 notifications)
      let notificationCount = 0;
      const maxNotifications = 12; // 1 minute of notifications
      
      const notificationInterval = setInterval(async () => {
        try {
          const user = await client.users.fetch(userId);
          if (user) {
            const notificationMessage = `⏰ **TIMER FINISHED!** ⏰\n\n🏷️ **${label}**\n⏱️ **Duration:** ${timerInfo.minutes} minute${timerInfo.minutes > 1 ? 's' : ''}\n🔔 **Notification:** ${notificationCount + 1}/${maxNotifications}\n\n⏰ Your timer has finished! Time to get back to work! 💪`;
            
            await user.send(notificationMessage);
            console.log(`⏰ Sent timer notification ${notificationCount + 1}/${maxNotifications} to user ${username}`);
            
            notificationCount++;
            
            // Stop after max notifications
            if (notificationCount >= maxNotifications) {
              clearInterval(notificationInterval);
              console.log(`⏰ Timer ${timerId} notifications completed for user ${username}`);
              
              // Send final notification
              await user.send(`⏰ **Timer Complete!** 🎉\n\n🏷️ **${label}**\n⏱️ **Duration:** ${timerInfo.minutes} minute${timerInfo.minutes > 1 ? 's' : ''}\n\n✅ All notifications sent! Timer session ended.`);
              
              // Clean up timer
              client.activeTimers.delete(timerId);
              console.log(`⏰ Timer ${timerId} cleaned up for user ${username}`);
            }
          }
        } catch (error) {
          console.error(`❌ Error sending timer notification ${notificationCount + 1}:`, error);
          clearInterval(notificationInterval);
        }
      }, 5000); // Every 5 seconds
      
    } catch (error) {
      console.error(`❌ Error in timerFinished for timer ${timerId}:`, error);
    }
  }
};
