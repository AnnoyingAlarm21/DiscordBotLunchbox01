const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('conversate')
    .setDescription('Start an AI conversation with Lunchbox - every message you type will be processed by AI')
    .addStringOption(option =>
      option.setName('topic')
        .setDescription('What would you like to talk about? (optional)')
        .setRequired(false)
    ),

  async execute(interaction, client) {
    const userId = interaction.user.id;
    const topic = interaction.options.getString('topic') || 'general conversation';
    
    // Check if user is already in conversation
    if (client.activeConversations.has(userId)) {
      await interaction.reply({
        content: '🍱 You\'re already in a conversation with me! Use `/endconversation` to stop first.',
        ephemeral: true
      });
      return;
    }
    
    // Start conversation
    client.activeConversations.add(userId);
    
    const welcomeMessage = topic === 'general conversation' 
      ? '🍱 **Conversation started!** I\'m now listening to every message you type. Just chat naturally and I\'ll respond with AI-powered conversation!\n\nUse `/endconversation` when you want to stop talking to me.'
      : `🍱 **Conversation started about: ${topic}** I\'m now listening to every message you type. Let\'s chat about ${topic}!\n\nUse \`/endconversation\` when you want to stop talking to me.`;
    
    await interaction.reply({
      content: welcomeMessage,
      ephemeral: false
    });
    
    console.log(`💬 User ${interaction.user.tag} (${userId}) started a conversation`);
  }
};
