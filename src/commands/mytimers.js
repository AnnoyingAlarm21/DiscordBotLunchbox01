const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mytimers')
    .setDescription('Show your active timers'),

  async execute(interaction, client) {
    try {
      const userId = interaction.user.id;
      const username = interaction.user.username;
      
      console.log(`⏰ My timers requested by ${username} (${userId})`);
      
      // Check if user has any active timers
      if (!client.activeTimers || client.activeTimers.size === 0) {
        const noTimersEmbed = new EmbedBuilder()
          .setColor(0xFF6B6B)
          .setTitle('⏰ No Active Timers')
          .setDescription('You don\'t have any active timers right now.')
          .addFields({
            name: '💡 Set a Timer',
            value: 'Use `/timer` to create a new countdown timer!',
            inline: false
          })
          .setFooter({ text: 'Lunchbox Timer System' })
          .setTimestamp();
        
        await interaction.reply({ embeds: [noTimersEmbed], ephemeral: true });
        return;
      }
      
      // Get user's active timers
      const userTimers = [];
      for (const [timerId, timerInfo] of client.activeTimers) {
        if (timerInfo.userId === userId && timerInfo.isActive) {
          userTimers.push({ timerId, ...timerInfo });
        }
      }
      
      if (userTimers.length === 0) {
        const noUserTimersEmbed = new EmbedBuilder()
          .setColor(0xFF6B6B)
          .setTitle('⏰ No Active Timers')
          .setDescription('You don\'t have any active timers right now.')
          .addFields({
            name: '💡 Set a Timer',
            value: 'Use `/timer` to create a new countdown timer!',
            inline: false
          })
          .setFooter({ text: 'Lunchbox Timer System' })
          .setTimestamp();
        
        await interaction.reply({ embeds: [noUserTimersEmbed], ephemeral: true });
        return;
      }
      
      // Create embed for user's timers
      const timersEmbed = new EmbedBuilder()
        .setColor(0x4CAF50)
        .setTitle(`⏰ Your Active Timers (${userTimers.length})`)
        .setDescription('Here are your currently running timers:')
        .setThumbnail(interaction.client.user.displayAvatarURL());
      
      // Add each timer to the embed
      userTimers.forEach((timer, index) => {
        const timeRemaining = Math.max(0, timer.endTime.getTime() - Date.now());
        const minutesRemaining = Math.ceil(timeRemaining / (1000 * 60));
        const secondsRemaining = Math.ceil(timeRemaining / 1000);
        
        let timeDisplay;
        if (minutesRemaining > 0) {
          timeDisplay = `${minutesRemaining}m ${secondsRemaining % 60}s remaining`;
        } else {
          timeDisplay = `${secondsRemaining}s remaining`;
        }
        
        timersEmbed.addFields({
          name: `⏰ Timer ${index + 1}: ${timer.label}`,
          value: `⏱️ **Duration:** ${timer.minutes} minute${timer.minutes > 1 ? 's' : ''}\n⏰ **Ends:** ${timer.endTime.toLocaleTimeString()}\n⏳ **Remaining:** ${timeDisplay}\n🆔 **ID:** \`${timer.timerId}\``,
          inline: false
        });
      });
      
      timersEmbed.addFields({
        name: '💡 Timer Commands',
        value: '• `/timer` - Set a new timer\n• `/canceltimer` - Cancel a timer\n• `/mytimers` - View this list again',
        inline: false
      })
      .setFooter({ text: 'Lunchbox Timer System' })
      .setTimestamp();
      
      await interaction.reply({ embeds: [timersEmbed], ephemeral: true });
      
      console.log(`⏰ Displayed ${userTimers.length} active timers for user ${username}`);
      
    } catch (error) {
      console.error('❌ Error in my timers command:', error);
      await interaction.reply({ 
        content: '❌ Error displaying timers: ' + error.message, 
        ephemeral: true 
      });
    }
  },
};
