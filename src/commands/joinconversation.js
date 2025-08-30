const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('joinconversation')
    .setDescription('Join another user\'s conversation with Lunchbox AI')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user whose conversation you want to join')
        .setRequired(true)
    ),

  async execute(interaction, client) {
    const targetUserId = interaction.options.getUser('user').id;
    const currentUserId = interaction.user.id;
    
    // Check if target user is in a conversation
    if (!client.activeConversations.has(targetUserId)) {
      await interaction.reply({
        content: `❌ **${interaction.options.getUser('user').username}** is not currently in a conversation with me. They need to use \`/conversate\` first!`,
        ephemeral: true
      });
      return;
    }
    
    // Check if current user is already in a conversation
    if (client.activeConversations.has(currentUserId)) {
      await interaction.reply({
        content: '❌ You\'re already in a conversation! Use `/endconversation` to stop your current conversation first.',
        ephemeral: true
      });
      return;
    }
    
    // Check if target user is in a private thread
    const isInPrivateThread = interaction.channel.isThread() && 
                             interaction.channel.ownerId === targetUserId &&
                             client.privateThreads?.has(interaction.channel.id);
    
    if (isInPrivateThread) {
      await interaction.reply({
        content: '❌ You cannot join a private thread conversation. Private threads are exclusive to the thread owner.',
        ephemeral: true
      });
      return;
    }
    
    // Add current user to conversation
    client.activeConversations.add(currentUserId);
    
    // Get conversation context from target user
    const targetUserContext = client.conversationContext.get(targetUserId);
    const conversationStart = targetUserContext?.conversationStart || new Date();
    const conversationAge = Math.floor((new Date() - conversationStart) / (1000 * 60)); // minutes
    
    // Create welcome message
    const welcomeMessage = `🍱 **Conversation joined!** You've joined **${interaction.options.getUser('user').username}**'s conversation!\n\n` +
                          `⏰ **Conversation started:** ${conversationAge} minute${conversationAge !== 1 ? 's' : ''} ago\n` +
                          `💬 **Chat naturally** - I'll respond to both of you!\n` +
                          `👥 **Group conversation** - perfect for collaboration!\n\n` +
                          `Use \`/endconversation\` when you want to leave.`;
    
    await interaction.reply({
      content: welcomeMessage,
      ephemeral: false
    });
    
    // Notify the target user
    try {
      await interaction.channel.send({
        content: `👋 **${interaction.user.username}** has joined your conversation! Now it's a group chat! 🎉`,
        ephemeral: false
      });
    } catch (error) {
      console.error('Could not send notification to target user:', error);
    }
    
    console.log(`👥 User ${interaction.user.tag} (${currentUserId}) joined conversation of ${interaction.options.getUser('user').tag} (${targetUserId})`);
  }
};
