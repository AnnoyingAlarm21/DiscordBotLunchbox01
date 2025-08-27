const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lunchbox')
    .setDescription('View your organized lunchbox of tasks'),

  async execute(interaction, client) {
    const userId = interaction.user.id;
    
    // Debug: Log what's in storage
    console.log(`🔍 Lunchbox command called for user ${userId}`);
    console.log(`🔍 client.userTasks has ${client.userTasks.size} users`);
    console.log(`🔍 User ${userId} has data:`, client.userTasks.has(userId) ? 'YES' : 'NO');
    
    if (client.userTasks.has(userId)) {
      const userData = client.userTasks.get(userId);
      console.log(`🔍 User data structure:`, JSON.stringify(userData, null, 2));
      console.log(`🔍 Tasks count:`, userData.tasks ? userData.tasks.length : 'NO TASKS ARRAY');
    }
    
    // Check if user has any tasks
    if (!client.userTasks.has(userId) || client.userTasks.get(userId).tasks.length === 0) {
      const emptyEmbed = new EmbedBuilder()
        .setColor(0xFFD700)
        .setTitle('🍱 Your Lunchbox is Empty!')
        .setDescription('Time to pack it with some tasks! Use `/addtask` to get started.')
        .addFields(
          { name: '🍪 Sweets', value: 'Things you want to do', inline: true },
          { name: '🥦 Vegetables', value: 'Things you need to do', inline: true },
          { name: '🥪 Savory', value: 'Neutral but useful tasks', inline: true },
          { name: '🧃 Sides', value: 'Extra fillers or downtime', inline: true }
        )
        .setFooter({ text: 'A balanced lunchbox makes for a productive day! 🥪' });
      
      await interaction.reply({ embeds: [emptyEmbed] });
      return;
    }
    
    const userData = client.userTasks.get(userId);
    const tasks = userData.tasks;
    
    // Group tasks by category
    const categorizedTasks = {
      '🍪 Sweets': [],
      '🥦 Vegetables': [],
      '🥪 Savory': [],
      '🧃 Sides': []
    };
    
    tasks.forEach(task => {
      if (categorizedTasks[task.category]) {
        categorizedTasks[task.category].push(task);
      }
    });
    
    // Create the main lunchbox embed
    const embed = new EmbedBuilder()
      .setColor(0xFF6B6B)
      .setTitle(`🍱 ${interaction.user.username}'s Lunchbox`)
      .setDescription('Here\'s what\'s in your organized lunchbox today!')
      .setThumbnail(interaction.user.displayAvatarURL())
      .setTimestamp();
    
    // Add each category with its tasks
    Object.entries(categorizedTasks).forEach(([category, categoryTasks]) => {
      if (categoryTasks.length > 0) {
        const taskList = categoryTasks
          .map(task => {
            const status = task.completed ? '✅' : '⏳';
            const timeAgo = `<t:${Math.floor(task.createdAt.getTime() / 1000)}:R>`;
            return `${status} **${task.content}** (${timeAgo})`;
          })
          .join('\n');
        
        embed.addFields({
          name: `${category} (${categoryTasks.length})`,
          value: taskList || 'No tasks yet',
          inline: false
        });
      }
    });
    
    // Add summary statistics
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.completed).length;
    const pendingTasks = totalTasks - completedTasks;
    
    embed.addFields({
      name: '📊 Lunchbox Summary',
      value: `**Total Tasks:** ${totalTasks}\n**Completed:** ${completedTasks}\n**Pending:** ${pendingTasks}`,
      inline: false
    });
    
    // Add balance recommendation
    const balanceMessage = getBalanceRecommendation(categorizedTasks);
    if (balanceMessage) {
      embed.addFields({
        name: '💡 Balance Tip',
        value: balanceMessage,
        inline: false
      });
    }
    
    embed.setFooter({ text: `Last updated: ${userData.lastUpdated.toLocaleDateString()}` });
    
    // Create action buttons
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('complete_task')
          .setLabel('Complete Task')
          .setStyle(ButtonStyle.Success)
          .setEmoji('✅'),
        new ButtonBuilder()
          .setCustomId('delete_task')
          .setLabel('Delete Task')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('🗑️'),
        new ButtonBuilder()
          .setCustomId('clear_completed')
          .setLabel('Clear Completed')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('🧹')
      );
    
    await interaction.reply({ embeds: [embed], components: [row] });
  }
};

// Provide balance recommendations based on task distribution
function getBalanceRecommendation(categorizedTasks) {
  const counts = Object.values(categorizedTasks).map(tasks => tasks.length);
  const maxCount = Math.max(...counts);
  const minCount = Math.min(...counts);
  
  if (maxCount - minCount <= 1) {
    return "🎉 Great balance! Your lunchbox has a healthy mix of all categories.";
  }
  
  const recommendations = [];
  
  if (categorizedTasks['🍪 Sweets'].length < 2) {
    recommendations.push("Add some fun tasks to your Sweets category!");
  }
  
  if (categorizedTasks['🥦 Vegetables'].length < 2) {
    recommendations.push("Don't forget important tasks in your Vegetables category!");
  }
  
  if (categorizedTasks['🥪 Savory'].length < 2) {
    recommendations.push("Include some practical tasks in your Savory category!");
  }
  
  if (categorizedTasks['🧃 Sides'].length < 2) {
    recommendations.push("Add some light activities to your Sides category!");
  }
  
  if (recommendations.length > 0) {
    return recommendations.join(' ');
  }
  
  return "Try to maintain a balanced mix of all task types for a productive day!";
}
