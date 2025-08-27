const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('test')
    .setDescription('Test if the bot is working properly'),

  async execute(interaction, client) {
    const userId = interaction.user.id;
    
    // Test basic functionality
    const testEmbed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle('🧪 Bot Test Results')
      .setDescription('Testing basic bot functionality...')
      .addFields(
        { name: '✅ Bot Status', value: 'Online and responding', inline: true },
        { name: '✅ User ID', value: userId, inline: true },
        { name: '✅ Commands Loaded', value: `${client.commands.size} commands`, inline: true }
      )
      .addFields(
        { name: '🔍 Data Storage Test', value: 'Checking user data storage...', inline: false }
      )
      .setTimestamp();
    
    // Test data storage
    if (client.userTasks.has(userId)) {
      const userData = client.userTasks.get(userId);
      const taskCount = userData.tasks ? userData.tasks.length : 0;
      testEmbed.addFields({
        name: '✅ User Data',
        value: `Found ${taskCount} tasks for user ${userId}`,
        inline: false
      });
    } else {
      testEmbed.addFields({
        name: '⚠️ User Data',
        value: 'No user data found (this is normal for new users)',
        inline: false
      });
    }
    
    // Test environment variables
    const envTests = {
      'GROQ_API_KEY': process.env.GROQ_API_KEY ? '✅ Set' : '❌ Missing',
      'DISCORD_TOKEN': process.env.DISCORD_TOKEN ? '✅ Set' : '❌ Missing',
      'DEEPGRAM_API_KEY': process.env.DEEPGRAM_API_KEY ? '✅ Set' : '❌ Missing'
    };
    
    let envStatus = '';
    Object.entries(envTests).forEach(([key, status]) => {
      envStatus += `${key}: ${status}\n`;
    });
    
    testEmbed.addFields({
      name: '🔧 Environment Variables',
      value: envStatus,
      inline: false
    });
    
    // Add recommendations
    let recommendations = '';
    if (!process.env.GROQ_API_KEY) {
      recommendations += '• Set GROQ_API_KEY for AI task categorization\n';
    }
    if (!process.env.DEEPGRAM_API_KEY) {
      recommendations += '• Set DEEPGRAM_API_KEY for voice features\n';
    }
    
    if (recommendations) {
      testEmbed.addFields({
        name: '💡 Recommendations',
        value: recommendations,
        inline: false
      });
    }
    
    testEmbed.setFooter({ text: 'Bot is working! 🎉' });
    
    await interaction.reply({ embeds: [testEmbed] });
  }
};
