const { SlashCommandBuilder, PermissionFlagsBits, ThreadAutoArchiveDuration } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('thread')
    .setDescription('Create a private thread for exclusive AI conversations')
    .addSubcommand(subcommand =>
      subcommand
        .setName('start')
        .setDescription('Start a new private thread with Lunchbox AI')
        .addStringOption(option =>
          option
            .setName('topic')
            .setDescription('What would you like to discuss in this thread?')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('end')
        .setDescription('End the current private thread')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('List your active private threads')
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    
    if (subcommand === 'start') {
      await this.startThread(interaction);
    } else if (subcommand === 'end') {
      await this.endThread(interaction);
    } else if (subcommand === 'list') {
      await this.listThreads(interaction);
    }
  },

  async startThread(interaction) {
    try {
      const topic = interaction.options.getString('topic') || 'Productivity Planning';
      
      // Create a private thread
      const thread = await interaction.channel.threads.create({
        name: `🍱 ${interaction.user.username}'s Private Session`,
        autoArchiveDuration: ThreadAutoArchiveDuration.OneHour,
        reason: `Private AI conversation thread for ${interaction.user.username}`,
        type: 12 // Private thread
      });

      // Set permissions so only the user and bot can see it
      await thread.members.add(interaction.user.id);
      
      // Send welcome message in the thread
      const welcomeEmbed = {
        color: 0x00ff00,
        title: '🍱 Welcome to Your Private Session!',
        description: `Hey ${interaction.user.username}! This is your exclusive space to chat with Lunchbox AI about:\n\n` +
                    `• **Task planning** and organization\n` +
                    `• **Productivity coaching** and advice\n` +
                    `• **Private discussions** about your goals\n` +
                    `• **Focused work sessions** without distractions\n\n` +
                    `**Topic:** ${topic}\n\n` +
                    `Just chat naturally - I'm here to help! Use \`/thread end\` when you're done.`,
        footer: {
          text: '🍱 Lunchbox Private Thread • Only you and I can see this!'
        },
        timestamp: new Date()
      };

      await thread.send({ embeds: [welcomeEmbed] });

      // Confirm thread creation
      await interaction.reply({
        content: `✅ **Private thread created!** Check out <#${thread.id}> for your exclusive AI session!\n\n` +
                 `🔒 **Only you and I can see it**\n` +
                 `⏰ **Auto-archives** after 1 hour of inactivity\n` +
                 `💬 **Chat naturally** about anything productivity-related!`,
        ephemeral: true
      });

      // Store thread info for management
      if (!interaction.client.privateThreads) {
        interaction.client.privateThreads = new Map();
      }
      
      interaction.client.privateThreads.set(thread.id, {
        userId: interaction.user.id,
        username: interaction.user.username,
        channelId: interaction.channelId,
        createdAt: new Date(),
        topic: topic
      });

    } catch (error) {
      console.error('Error creating thread:', error);
      await interaction.reply({
        content: '❌ Sorry, I couldn\'t create the private thread. Make sure I have permission to create threads in this channel!',
        ephemeral: true
      });
    }
  },

  async endThread(interaction) {
    try {
      // Check if this is a thread
      if (!interaction.channel.isThread()) {
        await interaction.reply({
          content: '❌ This command only works in threads! Use it in the private thread you want to end.',
          ephemeral: true
        });
        return;
      }

      // Check if user owns this thread
      if (!interaction.client.privateThreads?.has(interaction.channel.id) ||
          interaction.client.privateThreads.get(interaction.channel.id).userId !== interaction.user.id) {
        await interaction.reply({
          content: '❌ You can only end your own private threads!',
          ephemeral: true
        });
        return;
      }

      // Archive the thread
      await interaction.channel.setArchived(true, 'Thread ended by user');
      
      // Remove from tracking
      interaction.client.privateThreads.delete(interaction.channel.id);

      await interaction.reply({
        content: '✅ **Thread ended!** This private session has been archived. Thanks for using Lunchbox! 🍱',
        ephemeral: true
      });

    } catch (error) {
      console.error('Error ending thread:', error);
      await interaction.reply({
        content: '❌ Sorry, I couldn\'t end the thread. Please try again!',
        ephemeral: true
      });
    }
  },

  async listThreads(interaction) {
    try {
      if (!interaction.client.privateThreads || interaction.client.privateThreads.size === 0) {
        await interaction.reply({
          content: '📝 **No active private threads found.** Use `/thread start` to create your first one!',
          ephemeral: true
        });
        return;
      }

      // Get user's threads
      const userThreads = Array.from(interaction.client.privateThreads.values())
        .filter(thread => thread.userId === interaction.user.id);

      if (userThreads.length === 0) {
        await interaction.reply({
          content: '📝 **No active private threads found.** Use `/thread start` to create your first one!',
          ephemeral: true
        });
        return;
      }

      const threadList = userThreads.map(thread => {
        const age = Math.floor((new Date() - thread.createdAt) / (1000 * 60 * 60)); // hours
        return `• **${thread.topic}** - Created ${age} hour${age !== 1 ? 's' : ''} ago`;
      }).join('\n');

      const embed = {
        color: 0x00ff00,
        title: '🍱 Your Active Private Threads',
        description: threadList,
        footer: {
          text: `You have ${userThreads.length} active private thread${userThreads.length !== 1 ? 's' : ''}`
        }
      };

      await interaction.reply({
        embeds: [embed],
        ephemeral: true
      });

    } catch (error) {
      console.error('Error listing threads:', error);
      await interaction.reply({
        content: '❌ Sorry, I couldn\'t list your threads. Please try again!',
        ephemeral: true
      });
    }
  }
};
