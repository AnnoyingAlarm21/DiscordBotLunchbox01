const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('testnotification')
    .setDescription('Send a test DM notification to verify the reminder system is working')
    .addStringOption(option =>
      option.setName('type')
        .setDescription('Type of test notification to send')
        .setRequired(false)
        .addChoices(
          { name: '10 minutes reminder', value: '10min' },
          { name: '5 minutes reminder', value: '5min' },
          { name: 'Deadline NOW!', value: 'now' },
          { name: 'All types', value: 'all' }
        )
    ),

  async execute(interaction, client) {
    try {
      const notificationType = interaction.options.getString('type') || 'all';
      const userId = interaction.user.id;
      
      console.log(`🧪 Test notification requested by ${interaction.user.username} (${userId}) - Type: ${notificationType}`);
      
      // Defer reply since DM might take a moment
      await interaction.deferReply({ ephemeral: true });
      
      // Test the reminder system directly
      const reminderSystem = global.reminderSystem;
      if (!reminderSystem) {
        await interaction.editReply('❌ Reminder system not available. Please try again later.');
        return;
      }
      
      let testResults = [];
      
      if (notificationType === 'all' || notificationType === '10min') {
        try {
          await reminderSystem.sendReminder(client, userId, 'test_10min', '🧪 TEST: Doctor Appointment Tomorrow 6 PM', '10 minutes');
          testResults.push('✅ 10 minutes reminder sent');
        } catch (error) {
          testResults.push('❌ 10 minutes reminder failed: ' + error.message);
        }
      }
      
      if (notificationType === 'all' || notificationType === '5min') {
        try {
          await reminderSystem.sendReminder(client, userId, 'test_5min', '🧪 TEST: Doctor Appointment Tomorrow 6 PM', '5 minutes');
          testResults.push('✅ 5 minutes reminder sent');
        } catch (error) {
          testResults.push('❌ 5 minutes reminder failed: ' + error.message);
        }
      }
      
      if (notificationType === 'all' || notificationType === 'now') {
        try {
          await reminderSystem.sendReminder(client, userId, 'test_now', '🧪 TEST: Doctor Appointment Tomorrow 6 PM', 'NOW');
          testResults.push('✅ Deadline NOW reminder sent');
        } catch (error) {
          testResults.push('❌ Deadline NOW reminder failed: ' + error.message);
        }
      }
      
      // Also test direct DM functionality
      try {
        const user = await client.users.fetch(userId);
        if (user) {
          await user.send('🧪 **TEST NOTIFICATION**\n\nThis is a test DM to verify the bot can send you direct messages!\n\n✅ If you received this, the DM system is working!\n\n🔔 Your reminder notifications will be sent like this.');
          testResults.push('✅ Test DM sent successfully');
        } else {
          testResults.push('❌ Could not fetch user for DM test');
        }
      } catch (error) {
        testResults.push('❌ Test DM failed: ' + error.message);
      }
      
      // Send results back to user
      const resultMessage = `🧪 **Test Notification Results**\n\n${testResults.join('\n')}\n\n📱 **Check your DMs!** You should have received test messages.\n\n💡 **If you didn't get DMs:**\n• Make sure you have DMs enabled from server members\n• Check your Discord privacy settings\n• Try `/testnotification` again`;
      
      await interaction.editReply(resultMessage);
      
      console.log(`✅ Test notification completed for user ${interaction.user.username}. Results:`, testResults);
      
    } catch (error) {
      console.error('❌ Error in test notification command:', error);
      await interaction.editReply('❌ Error testing notifications: ' + error.message);
    }
  },
};
