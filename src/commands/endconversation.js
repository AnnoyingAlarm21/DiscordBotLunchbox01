const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('endconversation')
    .setDescription('End your AI conversation with Lunchbox - you won\'t be able to talk to it anymore'),

  async execute(interaction, client) {
    const userId = interaction.user.id;
    
    // Check if user is in a conversation
    if (!client.activeConversations.has(userId)) {
      await interaction.reply({
        content: '🍱 You\'re not currently in a conversation with me. Use `/conversate` to start one!',
        ephemeral: true
      });
      return;
    }
    
    // End conversation
    client.activeConversations.delete(userId);
    
    await interaction.reply({
      content: '🍱 **Conversation ended!** I\'m no longer listening to your messages. Use `/conversate` if you want to start talking to me again.',
      ephemeral: false
    });
    
    console.log(`💬 User ${interaction.user.tag} (${userId}) ended their conversation`);
  }
};
