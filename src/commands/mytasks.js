const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mytasks')
    .setDescription('Show all your personal tasks'),

  async execute(interaction, client) {
    const userId = interaction.user.id;
    
    // Debug: Log what's in storage
    console.log(`🔍 MyTasks command called for user ${userId}`);
    console.log(`🔍 client.userTasks has ${client.userTasks.size} users`);
    console.log(`🔍 User ${userId} has data:`, client.userTasks.has(userId) ? 'YES' : 'NO');
    
    if (client.userTasks.has(userId)) {
      const userData = client.userTasks.get(userId);
      console.log(`🔍 User data structure:`, JSON.stringify(userData, null, 2));
      console.log(`🔍 Tasks count:`, userData.tasks ? userData.tasks.length : 'NO TASKS ARRAY');
    }
    
    // Check if user has any tasks
    if (!client.userTasks.has(userId) || !client.userTasks.get(userId).tasks || client.userTasks.get(userId).tasks.length === 0) {
      const emptyEmbed = new EmbedBuilder()
        .setColor(0xFFD700)
        .setTitle('🍱 No Tasks Found!')
        .setDescription('You don\'t have any tasks in your lunchbox yet!')
        .addFields(
          { name: '🚀 Get Started', value: 'Use `/addtask` or just chat naturally:\n• "I have homework due tomorrow"\n• "I need to call the doctor"\n• "I want to exercise today"', inline: false },
          { name: '💬 Natural Chat', value: 'Or use `/conversate` to start chatting and create tasks naturally!', inline: false }
        )
        .setFooter({ text: 'Lunchbox will automatically organize your tasks!' });
      
      await interaction.reply({ embeds: [emptyEmbed] });
      return;
    }
    
    const userData = client.userTasks.get(userId);
    const tasks = userData.tasks;
    
    // Create a comprehensive tasks embed
    const embed = new EmbedBuilder()
      .setColor(0xFF6B6B)
      .setTitle(`🍱 ${interaction.user.username}'s Personal Tasks`)
      .setDescription(`Here are all **${tasks.length}** tasks in your lunchbox!`)
      .setThumbnail(interaction.user.displayAvatarURL())
      .setTimestamp();
    
    // Group tasks by completion status first, then by category
    const pendingTasks = tasks.filter(task => !task.completed);
    const completedTasks = tasks.filter(task => task.completed);
    
    // Show pending tasks first
    if (pendingTasks.length > 0) {
      let pendingList = '';
      pendingTasks.forEach((task, index) => {
        const category = task.category || '📁 Uncategorized';
        const timeAgo = `<t:${Math.floor(task.createdAt.getTime() / 1000)}:R>`;
        
        pendingList += `⏳ **${task.content}**\n`;
        pendingList += `📂 ${category} | 📅 ${timeAgo}`;
        
        // Add deadline info if exists
        if (task.deadline) {
          const deadline = new Date(task.deadline.fullDate);
          pendingList += ` | ⏰ Due: <t:${Math.floor(deadline.getTime() / 1000)}:F>`;
        }
        
        pendingList += '\n\n';
      });
      
      embed.addFields({
        name: `⏳ Pending Tasks (${pendingTasks.length})`,
        value: pendingList.trim(),
        inline: false
      });
    }
    
    // Show completed tasks
    if (completedTasks.length > 0) {
      let completedList = '';
      completedTasks.forEach((task, index) => {
        const category = task.category || '📁 Uncategorized';
        const timeAgo = `<t:${Math.floor(task.createdAt.getTime() / 1000)}:R>`;
        
        completedList += `✅ **${task.content}**\n`;
        completedList += `📂 ${category} | 📅 ${timeAgo}\n\n`;
      });
      
      embed.addFields({
        name: `✅ Completed Tasks (${completedTasks.length})`,
        value: completedList.trim(),
        inline: false
      });
    }
    
    // Add summary
    embed.addFields({
      name: '📊 Task Summary',
      value: `**Total:** ${tasks.length} | **Pending:** ${pendingTasks.length} | **Completed:** ${completedTasks.length}`,
      inline: false
    });
    
    // Add helpful commands
    embed.addFields({
      name: '🔧 Useful Commands',
      value: '• `/lunchbox` - Categorized view\n• `/calendar` - Scheduled tasks\n• `/addtask` - Add new task\n• `/completetask` - Mark as done',
      inline: false
    });
    
    embed.setFooter({ text: 'Keep your lunchbox organized and productive! 🥪' });
    
    await interaction.reply({ embeds: [embed] });
  }
};
