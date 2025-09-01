const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('history')
    .setDescription('View your completed tasks history - only you can see this'),

  async execute(interaction, client) {
    const userId = interaction.user.id;
    
    // Check if user has any tasks
    if (!client.userTasks.has(userId) || client.userTasks.get(userId).tasks.length === 0) {
      await interaction.reply({
        content: '🍱 You haven\'t completed any tasks yet! Start by adding some tasks with `/addtask`.',
        ephemeral: true
      });
      return;
    }
    
    const userData = client.userTasks.get(userId);
    const completedTasks = userData.tasks.filter(task => task.completed);
    
    if (completedTasks.length === 0) {
      await interaction.reply({
        content: '🍱 You haven\'t completed any tasks yet! Keep working on your current tasks! 💪',
        ephemeral: true
      });
      return;
    }
    
    // Sort completed tasks by completion date (newest first)
    completedTasks.sort((a, b) => b.completedAt - a.completedAt);
    
    // Create history embed
    const embed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle('📚 Your Task Completion History')
      .setDescription(`You've completed **${completedTasks.length}** tasks! 🎉`)
      .setFooter({ text: `Only you can see this history • Total completed: ${completedTasks.length}` })
      .setTimestamp();
    
    // Add completed tasks (show last 10 to avoid embed limits)
    const recentTasks = completedTasks.slice(0, 10);
    let tasksDescription = '';
    
    recentTasks.forEach((task, index) => {
      const completionDate = `<t:${Math.floor(task.completedAt.getTime() / 1000)}:R>`;
      const timeTaken = getTimeDifference(task.createdAt, task.completedAt);
      const note = task.completionNote ? `\n📝 Note: ${task.completionNote}` : '';
      
      tasksDescription += `**${index + 1}.** ${task.content}\n`;
      tasksDescription += `📂 ${task.category} • ✅ ${completionDate} • ⏱️ ${timeTaken}${note}\n\n`;
    });
    
    if (completedTasks.length > 10) {
      tasksDescription += `*... and ${completedTasks.length - 10} more completed tasks!*`;
    }
    
    embed.addFields({
      name: '✅ Recently Completed',
      value: tasksDescription || 'No completed tasks found',
      inline: false
    });
    
    // Add statistics
    const categoryStats = {};
    completedTasks.forEach(task => {
      categoryStats[task.category] = (categoryStats[task.category] || 0) + 1;
    });
    
    const statsDescription = Object.entries(categoryStats)
      .map(([category, count]) => `${category}: ${count}`)
      .join(' • ');
    
    embed.addFields({
      name: '📊 Completion Statistics',
      value: statsDescription,
      inline: false
    });
    
    await interaction.reply({ 
      embeds: [embed],
      ephemeral: true // Only the user who used the command can see this
    });
  }
};

// Helper function to calculate time difference
function getTimeDifference(startDate, endDate) {
  const diff = endDate - startDate;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}
