const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('deletetask')
    .setDescription('Delete a task from your lunchbox')
    .addStringOption(option =>
      option.setName('task_id')
        .setDescription('The ID of the task to delete (use /lunchbox to see IDs)')
        .setRequired(true)
    ),

  async execute(interaction, client) {
    const userId = interaction.user.id;
    const taskId = parseInt(interaction.options.getString('task_id'));
    
    // Check if user has any tasks
    if (!client.userTasks.has(userId) || client.userTasks.get(userId).tasks.length === 0) {
      await interaction.reply({
        content: '🍱 Your lunchbox is empty! There\'s nothing to delete.',
        ephemeral: true
      });
      return;
    }
    
    const userData = client.userTasks.get(userId);
    const taskIndex = userData.tasks.findIndex(task => task.id === taskId);
    
    if (taskIndex === -1) {
      await interaction.reply({
        content: '🍱 Task not found! Use `/lunchbox` to see your tasks and their IDs.',
        ephemeral: true
      });
      return;
    }
    
    const task = userData.tasks[taskIndex];
    
    // Remove the task
    const deletedTask = userData.tasks.splice(taskIndex, 1)[0];
    userData.lastUpdated = new Date();
    
    // Create confirmation embed
    const embed = new EmbedBuilder()
      .setColor(0xFF6B6B)
      .setTitle('🗑️ Task Deleted')
      .setDescription(`**${deletedTask.content}** has been removed from your lunchbox.`)
      .addFields(
        { name: '📂 Was Category', value: deletedTask.category, inline: true },
        { name: '📊 Remaining Tasks', value: `${userData.tasks.length}`, inline: true },
        { name: '⏰ Deleted', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
      )
      .setFooter({ text: 'Your lunchbox is getting organized! 🥪' })
      .setTimestamp();
    
    // Add different messages based on task status
    if (deletedTask.completed) {
      embed.addFields({
        name: '💭 Note',
        value: 'You deleted a completed task. Great job on finishing it first! 🎉',
        inline: false
      });
    } else {
      embed.addFields({
        name: '💭 Note',
        value: 'Sometimes it\'s okay to let go of tasks that no longer serve you. 💪',
        inline: false
      });
    }
    
    await interaction.reply({ embeds: [embed] });
    
    // Check if lunchbox is now empty
    if (userData.tasks.length === 0) {
      const emptyEmbed = new EmbedBuilder()
        .setColor(0xFFD700)
        .setTitle('🍱 Lunchbox is Empty!')
        .setDescription('All tasks have been cleared! Time to start fresh with new goals.')
        .setFooter({ text: 'A clean slate awaits! ✨' });
      
      await interaction.followUp({ embeds: [emptyEmbed] });
    }
  }
};
