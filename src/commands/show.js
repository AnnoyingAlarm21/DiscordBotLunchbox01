const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('show')
    .setDescription('Show your lunchbox contents'),

  async execute(interaction, client) {
    const userId = interaction.user.id;
    
    // Debug: Log what's in storage
    console.log(`🔍 Show command called for user ${userId}`);
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
        .setTitle('🍱 Your Lunchbox is Empty!')
        .setDescription('Time to pack it with some tasks!')
        .addFields(
          { name: '🚀 Quick Start', value: 'Try these commands:\n• `/addtask` - Add a specific task\n• `/conversate` - Start chatting naturally\n• Just type: "I have homework due tomorrow"', inline: false }
        )
        .setFooter({ text: 'Lunchbox will automatically organize your tasks!' });
      
      await interaction.reply({ embeds: [emptyEmbed] });
      return;
    }
    
    const userData = client.userTasks.get(userId);
    const tasks = userData.tasks;
    
    // Create a simple show embed
    const embed = new EmbedBuilder()
      .setColor(0x00BFFF)
      .setTitle(`🍱 ${interaction.user.username}'s Lunchbox Contents`)
      .setDescription(`Showing **${tasks.length}** tasks`)
      .setThumbnail(interaction.user.displayAvatarURL())
      .setTimestamp();
    
    // Show all tasks
    tasks.forEach((task, index) => {
      const status = task.completed ? '✅' : '⏳';
      const category = task.category || '📁 Uncategorized';
      const timeAgo = `<t:${Math.floor(task.createdAt.getTime() / 1000)}:R>`;
      
      let taskInfo = `${status} **${task.content}**\n`;
      taskInfo += `📂 ${category} | 📅 ${timeAgo}`;
      
      // Add deadline info if exists
      if (task.deadline) {
        const deadline = new Date(task.deadline.fullDate);
        taskInfo += ` | ⏰ Due: <t:${Math.floor(deadline.getTime() / 1000)}:F>`;
      }
      
      embed.addFields({
        name: `Task ${index + 1}`,
        value: taskInfo,
        inline: false
      });
    });
    
    // Add summary
    const completedTasks = tasks.filter(task => task.completed).length;
    const pendingTasks = tasks.length - completedTasks;
    
    embed.addFields({
      name: '📊 Summary',
      value: `**Total:** ${tasks.length} | **Pending:** ${pendingTasks} | **Completed:** ${completedTasks}`,
      inline: false
    });
    
    embed.setFooter({ text: 'Use /lunchbox for categorized view or /calendar for scheduled tasks' });
    
    await interaction.reply({ embeds: [embed] });
  }
};
