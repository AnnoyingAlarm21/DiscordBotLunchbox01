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
    
    // Create personalized welcome message based on topic
    let welcomeMessage;
    
    if (topic === 'general conversation') {
      welcomeMessage = '🍱 **Conversation started!** I\'m now listening to every message you type. Just chat naturally and I\'ll respond with AI-powered conversation!\n\nUse `/endconversation` when you want to stop talking to me.';
    } else {
      // Customize response based on topic
      const topicResponses = {
        'firing employees': '🍱 **Conversation started about: Firing Employees**\n\nThis is a sensitive topic that requires careful consideration. I\'m here to help you think through this situation thoughtfully. What specific aspects would you like to discuss?\n\n• Legal considerations\n• Communication strategies\n• Emotional impact\n• Alternative solutions\n\nUse `/endconversation` when you want to stop talking to me.',
        'productivity': '🍱 **Conversation started about: Productivity**\n\nGreat choice! Let\'s explore ways to boost your productivity and organize your tasks effectively. What area would you like to focus on?\n\n• Time management\n• Task prioritization\n• Work-life balance\n• Goal setting\n\nUse `/endconversation` when you want to stop talking to me.',
        'work': '🍱 **Conversation started about: Work**\n\nWork can be challenging! I\'m here to help you navigate workplace issues and improve your professional life. What\'s on your mind?\n\n• Career development\n• Workplace relationships\n• Stress management\n• Work organization\n\nUse `/endconversation` when you want to stop talking to me.',
        'school': '🍱 **Conversation started about: School**\n\nSchool life can be tough! Let\'s talk about how to make it more manageable and successful. What would you like to discuss?\n\n• Study strategies\n• Time management\n• Academic stress\n• Goal setting\n\nUse `/endconversation` when you want to stop talking to me.',
        'goals': '🍱 **Conversation started about: Goals**\n\nSetting and achieving goals is crucial for success! Let\'s work on making your goals clear and achievable. What type of goals?\n\n• Personal goals\n• Professional goals\n• Academic goals\n• Health goals\n\nUse `/endconversation` when you want to stop talking to me.',
        'stress': '🍱 **Conversation started about: Stress**\n\nStress management is so important! I\'m here to help you find healthy ways to cope and reduce stress. What\'s causing stress?\n\n• Work stress\n• School stress\n• Personal stress\n• Relationship stress\n\nUse `/endconversation` when you want to stop talking to me.'
      };
      
      // Check if we have a specific response for this topic
      const lowerTopic = topic.toLowerCase();
      if (topicResponses[lowerTopic]) {
        welcomeMessage = topicResponses[lowerTopic];
      } else {
        // Generic topic response
        welcomeMessage = `🍱 **Conversation started about: ${topic}**\n\nI\'m excited to chat with you about ${topic}! I\'m now listening to every message you type and will respond with AI-powered conversation.\n\nWhat would you like to discuss about ${topic}?\n\nUse \`/endconversation\` when you want to stop talking to me.`;
      }
    }
    
    await interaction.reply({
      content: welcomeMessage,
      ephemeral: false
    });
    
    console.log(`💬 User ${interaction.user.tag} (${userId}) started a conversation about: ${topic}`);
  }
};
