// Restart bot command - restart the bot (admin only)
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('restartbot')
    .setDescription('Restart the bot (admin only)')
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for restart')
        .setRequired(false)
    ),

  async execute(interaction) {
    try {
      // Check if user is admin (you can customize this check)
      const isAdmin = interaction.user.id === '1189634658695135343'; // Replace with your Discord ID
      
      if (!isAdmin) {
        await interaction.reply('❌ You do not have permission to restart the bot.');
        return;
      }
      
      const reason = interaction.options.getString('reason') || 'No reason provided';
      
      const embed = new EmbedBuilder()
        .setTitle('🔄 Bot Restart Initiated')
        .setDescription('The bot is restarting...')
        .setColor(0xffaa00)
        .addFields(
          { name: '👤 Restarted by', value: interaction.user.tag, inline: true },
          { name: '📝 Reason', value: reason, inline: true },
          { name: '⏰ Time', value: new Date().toLocaleString(), inline: true }
        )
        .setFooter({ text: 'Bot will be back online shortly' });
      
      await interaction.reply({ embeds: [embed] });
      
      console.log(`🔄 Bot restart initiated by ${interaction.user.tag} (${interaction.user.id})`);
      console.log(`📝 Reason: ${reason}`);
      
      // Give time for the response to be sent
      setTimeout(() => {
        console.log('🔄 Restarting bot...');
        process.exit(0); // This will trigger Railway to restart the bot
      }, 2000);
      
    } catch (error) {
      console.error('Error in restartbot command:', error);
      await interaction.reply('❌ Sorry, I had trouble restarting the bot. Please try again!');
    }
  }
};
