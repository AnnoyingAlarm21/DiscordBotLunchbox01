const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clearcompleted')
    .setDescription('Clear all completed tasks from your lunchbox'),

  async execute(interaction, client) {
    const userId = interaction.user.id;
    
    // Check if user has any tasks
    if (!client.userTasks.has(userId) || client.userTasks.get(userId).tasks.length === 0) {
      await interaction.reply({
        content: '🍱 Your lunchbox is empty! There\'s nothing to clear.',
        ephemeral: true
      });
      return;
    }
    
    const userData = client.userTasks.get(userId);
    const completedTasks = userData.tasks.filter(task => task.completed);
    const pendingTasks = userData.tasks.filter(task => !task.completed);
    
    if (completedTasks.length === 0) {
      await interaction.reply({
        content: '🍱 No completed tasks to clear! Keep working on your pending tasks.',
        ephemeral: true
      });
      return;
    }
    
    // Remove completed tasks
    userData.tasks = pendingTasks;
    userData.lastUpdated = new Date();
    
    // Create confirmation embed
    const embed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle('🧹 Completed Tasks Cleared!')
      .setDescription(`Successfully removed **${completedTasks.length}** completed tasks from your lunchbox.`)
      .addFields(
        { name: '✅ Tasks Cleared', value: `${completedTasks.length}`, inline: true },
        { name: '⏳ Remaining Tasks', value: `${pendingTasks.length}`, inline: true },
        { name: '📊 Progress', value: `${Math.round((completedTasks.length / (completedTasks.length + pendingTasks.length)) * 100)}% completed`, inline: true }
      )
      .setFooter({ text: 'Your lunchbox is looking clean and organized! 🥪' })
      .setTimestamp();
    
    // Add motivational message
    if (pendingTasks.length > 0) {
      embed.addFields({
        name: '💪 Keep Going!',
        value: `You still have ${pendingTasks.length} tasks to tackle. You\'ve got this! 🚀`,
        inline: false
      });
    } else {
      embed.addFields({
        name: '🏆 All Done!',
        value: 'Congratulations! All your tasks are complete. Time to pack a new lunchbox! 🎉',
        inline: false
      });
    }
    
    await interaction.reply({ embeds: [embed] });
    
    // If all tasks were completed, show celebration
    if (pendingTasks.length === 0) {
      const celebrationEmbed = new EmbedBuilder()
        .setColor(0xFFD700)
        .setTitle('🎉 LUNCHBOX EMPTY! 🎉')
        .setDescription('**AMAZING WORK!** You\'ve completed everything and cleared your lunchbox!')
        .addFields(
          { name: '🌟 Achievement', value: 'Perfect Completion', inline: true },
          { name: '🎯 Next Steps', value: 'Ready for new challenges!', inline: true }
        )
        .setFooter({ text: 'You\'re absolutely crushing it! 🚀' });
      
      await interaction.followUp({ embeds: [celebrationEmbed] });
    }
  }
};
