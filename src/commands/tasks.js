const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tasks')
    .setDescription('Show all your tasks'),

  async execute(interaction, client) {
    const userId = interaction.user.id;
    
    // Debug: Log what's in storage
    console.log(`🔍 Tasks command called for user ${userId}`);
    console.log(`🔍 client.userTasks has ${client.userTasks.size} users`);
    console.log(`🔍 User ${userId} has data:`, client.userTasks.has(userId) ? 'YES' : 'NO');
    
    if (client.userTasks.has(userId)) {
      const userData = client.userTasks.get(userId);
      console.log(`🔍 User data structure:`, JSON.stringify(userData, null, 2));
      console.log(`🔍 Tasks count:`, userData.tasks ? userData.tasks.length : 'NO TASKS ARRAY');
    }
    
    // Check if user has any tasks
    if (!client.userTasks.has(userId) || !client.userTasks.get(userId).tasks || client.userTasks.get(userId).tasks.length === 0) {
      await interaction.reply({
        content: '🍱 **No tasks found!** Your lunchbox is empty. Use `/addtask` or chat naturally to add some tasks!',
        ephemeral: true
      });
      return;
    }
    
    const userData = client.userTasks.get(userId);
    const tasks = userData.tasks;
    
    // Create a simple text response
    let response = `🍱 **${interaction.user.username}'s Tasks** (${tasks.length} total)\n\n`;
    
    tasks.forEach((task, index) => {
      const status = task.completed ? '✅' : '⏳';
      const category = task.category || '📁 Uncategorized';
      const timeAgo = `<t:${Math.floor(task.createdAt.getTime() / 1000)}:R>`;
      
      response += `${status} **${task.content}**\n`;
      response += `📂 ${category} | 📅 ${timeAgo}`;
      
      // Add deadline info if exists
      if (task.deadline) {
        const deadline = new Date(task.deadline.fullDate);
        response += ` | ⏰ Due: <t:${Math.floor(deadline.getTime() / 1000)}:F>`;
      }
      
      response += '\n\n';
    });
    
    // Add summary
    const completedTasks = tasks.filter(task => task.completed).length;
    const pendingTasks = tasks.length - completedTasks;
    
    response += `📊 **Summary:** Total: ${tasks.length} | Pending: ${pendingTasks} | Completed: ${completedTasks}`;
    
    await interaction.reply({ content: response });
  }
};
