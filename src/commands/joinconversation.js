const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('joinconversation')
    .setDescription('Join another user\'s conversation with Lunchbox AI - perfect for group discussions and collaboration!')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('Which user\'s conversation do you want to join?')
        .setRequired(true)
    ),

  async execute(interaction, client) {
    const targetUser = interaction.options.getUser('user');
    const targetUserId = targetUser.id;
    const currentUserId = interaction.user.id;
    
    // Check if target user is in conversation
    if (!client.activeConversations.has(targetUserId)) {
      await interaction.reply({
        content: `🍱 **${targetUser.username}** is not currently in a conversation with me. Ask them to use \`/conversate\` first!`,
        ephemeral: true
      });
      return;
    }
    
    // Check if current user is already in conversation
    if (client.activeConversations.has(currentUserId)) {
      await interaction.reply({
        content: '🍱 You\'re already in a conversation! Use `/endconversation` to stop your current conversation first.',
        ephemeral: true
      });
      return;
    }
    
    // Join the conversation
    client.activeConversations.add(currentUserId);
    
    // Get or create conversation context for the group
    if (!client.groupConversations) {
      client.groupConversations = new Map();
    }
    
    const groupId = `group_${targetUserId}`;
    if (!client.groupConversations.has(groupId)) {
      client.groupConversations.set(groupId, {
        participants: [targetUserId],
        startTime: new Date(),
        topic: 'Group collaboration'
      });
    }
    
    const groupData = client.groupConversations.get(groupId);
    groupData.participants.push(currentUserId);
    
    // Notify both users
    await interaction.reply({
      content: `🍱 **${interaction.user.username}** has joined **${targetUser.username}**'s conversation!\n\nNow you can collaborate together with Lunchbox AI. Both of you can chat naturally and I'll help you both with tasks and productivity!`,
      ephemeral: false
    });
    
    // Also notify the target user
    try {
      await targetUser.send(`🍱 **${interaction.user.username}** has joined your conversation! You can now collaborate together with Lunchbox AI.`);
    } catch (error) {
      console.log(`Could not DM ${targetUser.username} about conversation join`);
    }
    
    console.log(`👥 User ${interaction.user.tag} joined ${targetUser.tag}'s conversation`);
  }
};
