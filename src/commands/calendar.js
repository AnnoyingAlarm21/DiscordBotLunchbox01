const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('calendar')
    .setDescription('View your scheduled tasks in a calendar-like format')
    .addStringOption(option =>
      option.setName('view')
        .setDescription('How to view your calendar')
        .setRequired(false)
        .addChoices(
          { name: 'Today', value: 'today' },
          { name: 'This Week', value: 'week' },
          { name: 'This Month', value: 'month' },
          { name: 'All Scheduled', value: 'all' }
        )
    ),

  async execute(interaction, client) {
    const userId = interaction.user.id;
    const viewType = interaction.options.getString('view') || 'week';
    
    // Get user's tasks
    if (!client.userTasks.has(userId)) {
      await interaction.reply({
        content: '🍱 You don\'t have any tasks in your lunchbox yet! Use `/addtask` to add some.',
        ephemeral: true
      });
      return;
    }
    
    const userData = client.userTasks.get(userId);
    const tasks = userData.tasks.filter(task => !task.completed);
    
    if (tasks.length === 0) {
      await interaction.reply({
        content: '🍱 You don\'t have any active tasks! Use `/addtask` to add some.',
        ephemeral: true
      });
      return;
    }
    
    // Filter tasks based on view type
    const now = new Date();
    let filteredTasks = [];
    let title = '';
    
    switch (viewType) {
      case 'today':
        filteredTasks = tasks.filter(task => {
          if (!task.deadline) return false;
          const taskDate = new Date(task.deadline.fullDate);
          return taskDate.toDateString() === now.toDateString();
        });
        title = '📅 Today\'s Tasks';
        break;
        
      case 'week':
        const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
        const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
        filteredTasks = tasks.filter(task => {
          if (!task.deadline) return false;
          const taskDate = new Date(task.deadline.fullDate);
          return taskDate >= weekStart && taskDate <= weekEnd;
        });
        title = '📅 This Week\'s Tasks';
        break;
        
      case 'month':
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        filteredTasks = tasks.filter(task => {
          if (!task.deadline) return false;
          const taskDate = new Date(task.deadline.fullDate);
          return taskDate >= monthStart && taskDate <= monthEnd;
        });
        title = '📅 This Month\'s Tasks';
        break;
        
      case 'all':
        filteredTasks = tasks.filter(task => task.deadline);
        title = '📅 All Scheduled Tasks';
        break;
    }
    
    if (filteredTasks.length === 0) {
      await interaction.reply({
        content: `🍱 No scheduled tasks found for ${viewType === 'today' ? 'today' : viewType === 'week' ? 'this week' : viewType === 'month' ? 'this month' : 'the selected period'}!`,
        ephemeral: true
      });
      return;
    }
    
    // Sort tasks by deadline
    filteredTasks.sort((a, b) => new Date(a.deadline.fullDate) - new Date(b.deadline.fullDate));
    
    // Group tasks by date
    const groupedTasks = {};
    filteredTasks.forEach(task => {
      const taskDate = new Date(task.deadline.fullDate);
      const dateKey = taskDate.toDateString();
      
      if (!groupedTasks[dateKey]) {
        groupedTasks[dateKey] = [];
      }
      groupedTasks[dateKey].push(task);
    });
    
    // Create calendar embed
    const embed = new EmbedBuilder()
      .setColor(0x00BFFF)
      .setTitle(title)
      .setDescription(`You have **${filteredTasks.length}** scheduled tasks`)
      .setFooter({ text: 'Use /addtask to add more scheduled tasks!' })
      .setTimestamp();
    
    // Add each date group
    Object.keys(groupedTasks).sort().forEach(dateKey => {
      const tasks = groupedTasks[dateKey];
      const date = new Date(dateKey);
      const dateStr = date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'short', 
        day: 'numeric' 
      });
      
      let fieldValue = '';
      tasks.forEach(task => {
        const taskTime = task.deadline.time ? 
          `${task.deadline.time.hour}:${task.deadline.time.minute.toString().padStart(2, '0')}` : 
          'All day';
        
        fieldValue += `• **${task.content}** (${task.category})\n`;
        fieldValue += `  ⏰ ${taskTime} | 📂 ${task.category}\n\n`;
      });
      
      embed.addFields({
        name: `📅 ${dateStr}`,
        value: fieldValue.trim(),
        inline: false
      });
    });
    
    await interaction.reply({ embeds: [embed] });
  }
};
