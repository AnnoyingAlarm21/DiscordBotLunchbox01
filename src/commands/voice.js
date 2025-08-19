const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { 
  joinVoiceChannel, 
  createAudioPlayer, 
  createAudioResource, 
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState
} = require('@discordjs/voice');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('voice')
    .setDescription('Voice commands for Lunchbox bot')
    .addSubcommand(subcommand =>
      subcommand
        .setName('join')
        .setDescription('Join your current voice channel')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('speak')
        .setDescription('Make the bot speak a message')
        .addStringOption(option =>
          option.setName('message')
            .setDescription('What should the bot say?')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('leave')
        .setDescription('Leave the voice channel')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('announce')
        .setDescription('Announce a task completion or reminder')
        .addStringOption(option =>
          option.setName('type')
            .setDescription('Type of announcement')
            .setRequired(true)
            .addChoices(
              { name: 'Task Completed', value: 'completed' },
              { name: 'Task Reminder', value: 'reminder' },
              { name: 'Lunchbox Status', value: 'status' },
              { name: 'Motivation', value: 'motivation' }
            )
        )
        .addStringOption(option =>
          option.setName('message')
            .setDescription('Additional message (optional)')
            .setRequired(false)
        )
    ),

  async execute(interaction, client) {
    const subcommand = interaction.options.getSubcommand();
    const userId = interaction.user.id;

    // Check if user is in a voice channel
    const member = interaction.member;
    const voiceChannel = member.voice.channel;

    if (subcommand === 'join') {
      if (!voiceChannel) {
        await interaction.reply({
          content: '🍱 You need to be in a voice channel first!',
          ephemeral: true
        });
        return;
      }

      try {
        const connection = joinVoiceChannel({
          channelId: voiceChannel.id,
          guildId: voiceChannel.guild.id,
          adapterCreator: voiceChannel.guild.voiceAdapterCreator,
          selfDeaf: false,
          selfMute: false
        });

        // Store connection in client for later use
        client.voiceConnections = client.voiceConnections || new Map();
        client.voiceConnections.set(interaction.guildId, connection);

        const embed = new EmbedBuilder()
          .setColor(0x00FF00)
          .setTitle('🎤 Voice Channel Joined!')
          .setDescription(`Lunchbox is now in **${voiceChannel.name}**`)
          .addFields(
            { name: '📢 Ready to Speak', value: 'Use `/voice speak` to make me talk!', inline: true },
            { name: '🎵 Channel', value: voiceChannel.name, inline: true }
          )
          .setFooter({ text: 'Your voice assistant is ready! 🍱' });

        await interaction.reply({ embeds: [embed] });

        // Handle connection events
        connection.on(VoiceConnectionStatus.Ready, () => {
          console.log('🎤 Voice connection ready');
        });

        connection.on(VoiceConnectionStatus.Disconnected, async () => {
          try {
            await Promise.race([
              entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
              entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
            ]);
          } catch (error) {
            connection.destroy();
            client.voiceConnections.delete(interaction.guildId);
          }
        });

      } catch (error) {
        console.error('Error joining voice channel:', error);
        await interaction.reply({
          content: '🍱 Sorry, I had trouble joining the voice channel.',
          ephemeral: true
        });
      }
    }

    else if (subcommand === 'speak') {
      if (!client.voiceConnections?.has(interaction.guildId)) {
        await interaction.reply({
          content: '🍱 I need to join a voice channel first! Use `/voice join`',
          ephemeral: true
        });
        return;
      }

      const message = interaction.options.getString('message');
      
      try {
        await interaction.deferReply();
        
        // Create TTS audio using system TTS
        const audioFile = await createTTSAudio(message);
        
        if (audioFile) {
          const connection = client.voiceConnections.get(interaction.guildId);
          const player = createAudioPlayer();
          const resource = createAudioResource(audioFile);
          
          player.play(resource);
          connection.subscribe(player);

          player.on(AudioPlayerStatus.Playing, () => {
            console.log('🎤 Speaking:', message);
          });

          player.on(AudioPlayerStatus.Idle, () => {
            // Clean up audio file
            try {
              fs.unlinkSync(audioFile);
            } catch (error) {
              console.error('Error cleaning up audio file:', error);
            }
          });

          const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('🎤 Speaking!')
            .setDescription(`**"${message}"**`)
            .setFooter({ text: 'Lunchbox is talking! 🍱' });

          await interaction.editReply({ embeds: [embed] });
        } else {
          await interaction.editReply({
            content: '🍱 Sorry, I couldn\'t create the speech audio.',
            ephemeral: true
          });
        }

      } catch (error) {
        console.error('Error speaking:', error);
        await interaction.editReply({
          content: '🍱 Sorry, I had trouble speaking that message.',
          ephemeral: true
        });
      }
    }

    else if (subcommand === 'leave') {
      if (!client.voiceConnections?.has(interaction.guildId)) {
        await interaction.reply({
          content: '🍱 I\'m not in a voice channel!',
          ephemeral: true
        });
        return;
      }

      const connection = client.voiceConnections.get(interaction.guildId);
      connection.destroy();
      client.voiceConnections.delete(interaction.guildId);

      const embed = new EmbedBuilder()
        .setColor(0xFF6B6B)
        .setTitle('👋 Voice Channel Left')
        .setDescription('Lunchbox has left the voice channel')
        .setFooter({ text: 'See you later! 🍱' });

      await interaction.reply({ embeds: [embed] });
    }

    else if (subcommand === 'announce') {
      if (!client.voiceConnections?.has(interaction.guildId)) {
        await interaction.reply({
          content: '🍱 I need to be in a voice channel first! Use `/voice join`',
          ephemeral: true
        });
        return;
      }

      const type = interaction.options.getString('type');
      const customMessage = interaction.options.getString('message') || '';
      
      const announcements = {
        completed: '🎉 Task completed! Great job! Keep up the amazing work!',
        reminder: '⏰ Time to check your lunchbox! Don\'t forget your tasks!',
        status: '📊 Your lunchbox status update! Time to organize and prioritize!',
        motivation: '💪 You\'ve got this! Every task completed brings you closer to your goals!'
      };

      const message = announcements[type] + (customMessage ? ` ${customMessage}` : '');
      
      try {
        await interaction.deferReply();
        
        const audioFile = await createTTSAudio(message);
        
        if (audioFile) {
          const connection = client.voiceConnections.get(interaction.guildId);
          const player = createAudioPlayer();
          const resource = createAudioResource(audioFile);
          
          player.play(resource);
          connection.subscribe(player);

          player.on(AudioPlayerStatus.Playing, () => {
            console.log('🎤 Announcing:', message);
          });

          player.on(AudioPlayerStatus.Idle, () => {
            try {
              fs.unlinkSync(audioFile);
            } catch (error) {
              console.error('Error cleaning up audio file:', error);
            }
          });

          const embed = new EmbedBuilder()
            .setColor(0xFFD700)
            .setTitle('📢 Voice Announcement!')
            .setDescription(`**${message}**`)
            .addFields(
              { name: '🎤 Type', value: type.charAt(0).toUpperCase() + type.slice(1), inline: true },
              { name: '📢 Channel', value: voiceChannel?.name || 'Unknown', inline: true }
            )
            .setFooter({ text: 'Lunchbox is announcing! 🍱' });

          await interaction.editReply({ embeds: [embed] });
        }

      } catch (error) {
        console.error('Error announcing:', error);
        await interaction.editReply({
          content: '🍱 Sorry, I had trouble making the announcement.',
          ephemeral: true
        });
      }
    }
  }
};

// Create TTS audio using system TTS
async function createTTSAudio(text) {
  return new Promise((resolve) => {
    const fileName = `tts_${Date.now()}.wav`;
    const filePath = path.join(__dirname, '..', '..', 'temp', fileName);
    
    // Ensure temp directory exists
    const tempDir = path.dirname(filePath);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Use macOS say command for TTS
    const command = `say -o "${filePath}" "${text}"`;
    
    exec(command, (error) => {
      if (error) {
        console.error('TTS Error:', error);
        resolve(null);
      } else {
        resolve(filePath);
      }
    });
  });
}
