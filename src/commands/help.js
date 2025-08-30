const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show all available commands and how to use them'),

  async execute(interaction, client) {
    const embed = new EmbedBuilder()
      .setColor(0xFF6B6B)
      .setTitle('🍱 Lunchbox Bot Help')
      .setDescription('Welcome to Lunchbox! Your AI-powered productivity companion that organizes tasks into fun food categories.')
      .setThumbnail(interaction.client.user.displayAvatarURL())
      .addFields(
        {
          name: '🍪 Sweets',
          value: 'Things you want to do - fun and enjoyable tasks',
          inline: true
        },
        {
          name: '🥦 Vegetables',
          value: 'Things you need to do - important and necessary tasks',
          inline: true
        },
        {
          name: '🥪 Savory',
          value: 'Neutral but useful tasks - practical and productive',
          inline: true
        },
        {
          name: '🧃 Sides',
          value: 'Extra fillers or downtime activities - light and easy',
          inline: true
        }
      )
      .addFields(
        {
          name: '📝 Commands',
          value: 'Here are all the commands you can use:',
          inline: false
        },
        {
          name: '/addtask [task]',
          value: 'Add a new task to your lunchbox. The AI will automatically categorize it!',
          inline: false
        },
        {
          name: '/lunchbox',
          value: 'View all your tasks organized by category with beautiful formatting',
          inline: false
        },
        {
          name: '/completetask [task_id]',
          value: 'Mark a task as completed and celebrate your achievement!',
          inline: false
        },
        {
          name: '/deletetask [task_id]',
          value: 'Remove a task from your lunchbox when it\'s no longer needed',
          inline: false
        },
        {
          name: '/clearcompleted',
          value: 'Bulk remove all completed tasks to keep your lunchbox clean',
          inline: false
        },
        {
          name: '/voice join',
          value: 'Join your current voice channel',
          inline: false
        },
        {
          name: '/voice speak',
          value: 'Make the bot speak a message using text-to-speech',
          inline: false
        },
        {
          name: '/voice announce',
          value: 'Make voice announcements for task updates',
          inline: false
        },
        {
          name: '/voice listen',
          value: 'Start listening for voice commands and automatic task creation',
          inline: false
        },
        {
          name: '/voice stop-listening',
          value: 'Stop listening for voice commands',
          inline: false
        },
        {
          name: '/conversate',
          value: 'Start an AI conversation with Lunchbox - every message you type will be processed by AI. Add a topic like "productivity" or "work" for focused discussions.',
          inline: false
        },
        {
          name: '/endconversation',
          value: 'End your AI conversation with Lunchbox',
          inline: false
        },
        {
          name: '/calendar [view]',
          value: 'View your scheduled tasks in a calendar format (today/week/month/all)',
          inline: false
        },
        {
          name: '/testnotification',
          value: 'Send a test DM notification to verify the reminder system is working',
          inline: false
        },
        {
          name: '/timer [minutes] [label]',
          value: 'Set a countdown timer and get DM notifications every 5 seconds when it goes off',
          inline: false
        },
        {
          name: '/mytimers',
          value: 'Show your currently active timers',
          inline: false
        },
        {
          name: '/canceltimer [timer_id]',
          value: 'Cancel an active timer using its ID',
          inline: false
        },
        {
          name: '/help',
          value: 'Show this help message (you\'re here!)',
          inline: false
        },
        {
          name: '/thread',
          value: 'Create a private AI conversation thread',
          inline: false
        }
      )
      .addFields(
        {
          name: '💡 Quick Tips',
          value: '• You can also mention the bot or use the prefix (!) to add tasks\n• Tasks are automatically categorized using AI\n• **NEW: Voice commands!** Use `/voice listen` to create tasks by speaking\n• **NEW: Smart scheduling!** Use natural language like "due tomorrow", "by Friday", "this week"\n• Keep your lunchbox balanced for maximum productivity\n• Complete tasks to unlock achievements!',
          inline: false
        },
        {
          name: '🚀 Getting Started',
          value: '1. Use `/addtask` to add your first task\n2. Check `/lunchbox` to see your organized tasks\n3. Complete tasks with `/completetask`\n4. Keep your lunchbox balanced and productive!',
          inline: false
        }
      )
      .setFooter({ text: 'Lunchbox makes productivity fun and delicious! 🥪' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
