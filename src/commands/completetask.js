const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('completetask')
    .setDescription('Mark a task as completed')
    .addStringOption(option =>
      option.setName('task_id')
        .setDescription('The ID of the task to complete (use /lunchbox to see IDs)')
        .setRequired(true)
    ),

  async execute(interaction, client) {
    const userId = interaction.user.id;
    const taskId = parseInt(interaction.options.getString('task_id'));
    
    // Check if user has any tasks
    if (!client.userTasks.has(userId) || client.userTasks.get(userId).tasks.length === 0) {
      await interaction.reply({
        content: '🍱 Your lunchbox is empty! Add some tasks first with `/addtask`.',
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
    
    if (task.completed) {
      await interaction.reply({
        content: '🍱 This task is already completed! Great job! 🎉',
        ephemeral: true
      });
      return;
    }
    
    // Mark task as completed
    task.completed = true;
    task.completedAt = new Date();
    
    // Create celebration embed
    const embed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle('🎉 Task Completed!')
      .setDescription(`**${task.content}**`)
      .addFields(
        { name: '📂 Category', value: task.category, inline: true },
        { name: '✅ Completed', value: `<t:${Math.floor(task.completedAt.getTime() / 1000)}:R>`, inline: true },
        { name: '⏱️ Time Taken', value: getTimeDifference(task.createdAt, task.completedAt), inline: true }
      )
      .setFooter({ text: 'Great job! Your lunchbox is getting lighter! 🥪' })
      .setTimestamp();
    
    // Add motivational message based on category
    const motivationalMessage = getMotivationalMessage(task.category);
    if (motivationalMessage) {
      embed.addFields({
        name: '💪 Motivation',
        value: motivationalMessage,
        inline: false
      });
    }
    
    await interaction.reply({ embeds: [embed] });
    
    // Try to announce completion in voice if bot is in a voice channel
    try {
      if (interaction.client.voiceConnections?.has(interaction.guildId)) {
        const connection = interaction.client.voiceConnections.get(interaction.guildId);
        const { createAudioPlayer, createAudioResource } = require('@discordjs/voice');
        const { exec } = require('child_process');
        const fs = require('fs');
        const path = require('path');
        
        // Create TTS audio for completion
        const fileName = `tts_complete_${Date.now()}.wav`;
        const filePath = path.join(__dirname, '..', '..', 'temp', fileName);
        
        const tempDir = path.dirname(filePath);
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }
        
        const completionMessage = `Task completed! ${task.content}. Great job!`;
        const command = `say -o "${filePath}" "${completionMessage}"`;
        
        exec(command, (error) => {
          if (!error) {
            const player = createAudioPlayer();
            const resource = createAudioResource(filePath);
            
            player.play(resource);
            connection.subscribe(player);
            
            player.on('idle', () => {
              try {
                fs.unlinkSync(filePath);
              } catch (cleanupError) {
                console.error('Error cleaning up audio file:', cleanupError);
              }
            });
          }
        });
      }
    } catch (voiceError) {
      console.error('Voice announcement error:', voiceError);
      // Voice announcement is optional, so don't fail the command
    }
    
    // Check if user has completed all tasks
    const allCompleted = userData.tasks.every(t => t.completed);
    if (allCompleted) {
      const celebrationEmbed = new EmbedBuilder()
        .setColor(0xFFD700)
        .setTitle('🏆 LUNCHBOX EMPTY! 🏆')
        .setDescription('🎉 **CONGRATULATIONS!** 🎉\n\nYou\'ve completed ALL your tasks! Your lunchbox is completely empty and you\'re ready for a fresh start!')
        .addFields(
          { name: '🌟 Achievement Unlocked', value: 'Perfect Productivity', inline: true },
          { name: '🎯 Next Steps', value: 'Time to pack a new lunchbox with fresh tasks!', inline: true }
        )
        .setFooter({ text: 'You\'re absolutely crushing it! 🚀' });
      
      await interaction.followUp({ embeds: [celebrationEmbed] });
      
      // Voice celebration for empty lunchbox
      try {
        if (interaction.client.voiceConnections?.has(interaction.guildId)) {
          const connection = interaction.client.voiceConnections.get(interaction.guildId);
          const { createAudioPlayer, createAudioResource } = require('@discordjs/voice');
          const { exec } = require('child_process');
          const fs = require('fs');
          const path = require('path');
          
          const celebrationMessage = "Congratulations! Your lunchbox is completely empty! You've achieved perfect productivity!";
          const fileName = `tts_celebration_${Date.now()}.wav`;
          const filePath = path.join(__dirname, '..', '..', 'temp', fileName);
          
          const tempDir = path.dirname(filePath);
          if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
          }
          
          const command = `say -o "${filePath}" "${celebrationMessage}"`;
          
          exec(command, (error) => {
            if (!error) {
              const player = createAudioPlayer();
              const resource = createAudioResource(filePath);
              
              player.play(resource);
              connection.subscribe(player);
              
              player.on('idle', () => {
                try {
                  fs.unlinkSync(filePath);
                } catch (cleanupError) {
                  console.error('Error cleaning up audio file:', cleanupError);
                }
              });
            }
          });
        }
      } catch (voiceError) {
        console.error('Voice celebration error:', voiceError);
      }
    }
  }
};

// Calculate time difference between task creation and completion
function getTimeDifference(createdAt, completedAt) {
  const diffMs = completedAt - createdAt;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (diffHours > 0) {
    return `${diffHours}h ${diffMinutes}m`;
  } else if (diffMinutes > 0) {
    return `${diffMinutes}m`;
  } else {
    return 'Less than 1m';
  }
}

// Get motivational message based on task category
function getMotivationalMessage(category) {
  const messages = {
    '🍪 Sweets': 'You made time for what you enjoy - that\'s self-care! 🌟',
    '🥦 Vegetables': 'You tackled the important stuff - that\'s growth! 🌱',
    '🥪 Savory': 'You got things done - that\'s productivity! ⚡',
    '🧃 Sides': 'You handled the little things - that\'s attention to detail! ✨'
  };
  
  return messages[category] || 'You\'re making progress! Keep it up! 💪';
}
