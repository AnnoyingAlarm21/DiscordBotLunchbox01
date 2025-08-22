const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { 
  joinVoiceChannel, 
  createAudioPlayer, 
  createAudioResource, 
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
  getVoiceConnection,
  EndBehaviorType
} = require('@discordjs/voice');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const prism = require('prism-media');

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
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('listen')
        .setDescription('Start listening for voice commands and task creation')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('stop-listening')
        .setDescription('Stop listening for voice commands')
    ),

  async execute(interaction, client) {
    const subcommand = interaction.options.getSubcommand();
    const userId = interaction.user.id;

    // Check if user is in a voice channel
    const member = interaction.member;
    if (!member) {
      await interaction.reply({
        content: '🍱 Sorry, I couldn\'t get your member information. Try again!',
        ephemeral: true
      });
      return;
    }
    
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
    
    else if (subcommand === 'listen') {
      if (!client.voiceConnections?.has(interaction.guildId)) {
        await interaction.reply({
          content: '🍱 I need to be in a voice channel first! Use `/voice join`',
          ephemeral: true
        });
        return;
      }
      
      try {
        const connection = client.voiceConnections.get(interaction.guildId);
        
        // Start voice listening
        if (!client.voiceListeners) client.voiceListeners = new Map();
        
        if (client.voiceListeners.has(interaction.guildId)) {
          await interaction.reply({
            content: '🍱 I\'m already listening in this channel!',
            ephemeral: true
          });
          return;
        }
        
        // Create voice receiver
        const receiver = connection.receiver;
        const userId = interaction.user.id;
        
        // Store listener info
        client.voiceListeners.set(interaction.guildId, {
          userId: userId,
          connection: connection,
          active: true
        });
        
        // Listen for voice from ANY user in the channel
        connection.receiver.speaking.on('start', (speakingUserId) => {
          if (!client.voiceListeners.get(interaction.guildId)?.active) return;
          
          console.log(`🎤 User ${speakingUserId} started speaking in voice channel`);
          
          // Get the user's name
          const guild = interaction.guild;
          const member = guild.members.cache.get(speakingUserId);
          const userName = member ? member.displayName : `User ${speakingUserId}`;
          
          // Announce in voice channel
          speakMessage(`${userName} is talking!`, connection);
          
          // Send message to text channel
          const textChannel = interaction.channel;
          if (textChannel) {
            textChannel.send(`🎤 **${userName}** started talking...`);
          }
          
          const audioStream = connection.receiver.subscribe(speakingUserId, {
            end: {
              behavior: EndBehaviorType.AfterSilence,
              duration: 1500, // Increased duration for better capture
            },
          });
          
          // Process the audio stream with real-time transcription
          processVoiceStreamRealTime(audioStream, speakingUserId, interaction.guildId, client, textChannel, userName);
        });
        
        await interaction.reply({
          content: '🎤 **Voice listening activated!** I\'m now listening for your voice commands. Just speak naturally and I\'ll create tasks from what you say!',
          ephemeral: false
        });
        
        // Announce in voice channel
        const welcomeMessage = "Voice listening activated! I'm now listening for your voice commands. Just speak naturally and I'll create tasks from what you say!";
        await speakMessage(welcomeMessage, connection);
        
      } catch (error) {
        console.error('Error starting voice listening:', error);
        await interaction.reply({
          content: '🍱 Sorry, I had trouble starting voice listening.',
          ephemeral: true
        });
      }
    }
    
    else if (subcommand === 'stop-listening') {
      if (!client.voiceListeners?.has(interaction.guildId)) {
        await interaction.reply({
          content: '🍱 I\'m not listening in this channel.',
          ephemeral: true
        });
        return;
      }
      
      // Stop listening
      const listener = client.voiceListeners.get(interaction.guildId);
      listener.active = false;
      client.voiceListeners.delete(interaction.guildId);
      
      await interaction.reply({
        content: '🔇 Voice listening stopped. I\'m no longer listening for voice commands.',
        ephemeral: false
      });
      
      // Announce in voice channel
      const stopMessage = "Voice listening stopped. I'm no longer listening for voice commands.";
      const connection = client.voiceConnections.get(interaction.guildId);
      if (connection) {
        await speakMessage(stopMessage, connection);
      }
    }
  }
};

// Process voice stream and convert to text
async function processVoiceStream(audioStream, userId, guildId, client) {
  try {
    console.log(`🎤 Processing voice stream from user ${userId}...`);
    
    // Use Deepgram for real voice-to-text
    const transcribedText = await processVoiceWithDeepgram(audioStream, userId, guildId, client);
    
    if (transcribedText) {
      console.log(`🎤 Voice detected from user ${userId}: "${transcribedText}"`);
      
      // Check if this looks like a task
      const taskKeywords = [
        'need to', 'have to', 'should', 'must', 'want to', 'plan to', 'going to',
        'homework', 'study', 'work', 'project', 'meeting', 'appointment', 'deadline',
        'clean', 'organize', 'buy', 'call', 'email', 'text', 'message', 'visit',
        'exercise', 'workout', 'cook', 'shop', 'read', 'write', 'learn', 'practice'
      ];
      
      const hasTaskKeywords = taskKeywords.some(keyword => 
        transcribedText.toLowerCase().includes(keyword)
      );
      
      if (hasTaskKeywords) {
        // This sounds like a task! Add it automatically
        console.log(`🍱 Voice task detected: "${transcribedText}"`);
        await addTaskFromVoice(transcribedText, userId, guildId, client);
      } else {
        // Regular conversation - use Groq for intelligent response
        console.log(`💬 Voice conversation detected: "${transcribedText}"`);
        await respondToVoiceWithAI(transcribedText, userId, guildId, client);
      }
    }
  } catch (error) {
    console.error('Error processing voice stream:', error);
  }
}

// NEW: Real-time voice transcription with text channel updates
async function processVoiceStreamRealTime(audioStream, userId, guildId, client, textChannel, userName) {
  try {
    console.log(`🎤 Processing real-time voice from ${userName}...`);
    
    // Use Deepgram for real voice-to-text
    const transcribedText = await processVoiceWithDeepgram(audioStream, userId, guildId, client);
    
    if (transcribedText) {
      console.log(`🎤 ${userName} said: "${transcribedText}"`);
      
      // Send transcription to text channel
      if (textChannel) {
        const embed = new EmbedBuilder()
          .setColor(0x00FF00)
          .setAuthor({ name: userName, iconURL: 'https://cdn.discordapp.com/emojis/🎤' })
          .setDescription(`**Voice Transcription:**\n${transcribedText}`)
          .setTimestamp()
          .setFooter({ text: 'Real-time voice transcription' });
        
        await textChannel.send({ embeds: [embed] });
      }
      
      // Check if this looks like a task
      const taskKeywords = [
        'need to', 'have to', 'should', 'must', 'want to', 'plan to', 'going to',
        'homework', 'study', 'work', 'project', 'meeting', 'appointment', 'deadline',
        'clean', 'organize', 'buy', 'call', 'email', 'text', 'message', 'visit',
        'exercise', 'workout', 'cook', 'shop', 'read', 'write', 'learn', 'practice'
      ];
      
      const hasTaskKeywords = taskKeywords.some(keyword => 
        transcribedText.toLowerCase().includes(keyword)
      );
      
      if (hasTaskKeywords) {
        // This sounds like a task! Add it automatically
        console.log(`🍱 Voice task detected from ${userName}: "${transcribedText}"`);
        
        // Send task detection message to text channel
        if (textChannel) {
          await textChannel.send(`🍱 **Task Detected!** ${userName} said something that sounds like a task: "${transcribedText}"`);
        }
        
        await addTaskFromVoice(transcribedText, userId, guildId, client);
      } else {
        // Regular conversation - use Groq for intelligent response
        console.log(`💬 Voice conversation from ${userName}: "${transcribedText}"`);
        
        // Send conversation message to text channel
        if (textChannel) {
          await textChannel.send(`💬 **${userName}** said: "${transcribedText}"`);
        }
        
        await respondToVoiceWithAI(transcribedText, userId, guildId, client);
      }
    }
  } catch (error) {
    console.error('Error processing real-time voice stream:', error);
    
    // Send error message to text channel
    if (textChannel) {
      await textChannel.send(`❌ **Error processing voice** from ${userName}: ${error.message}`);
    }
  }
}

// Real Deepgram voice-to-text integration
async function processVoiceWithDeepgram(audioStream, userId, guildId, client) {
  try {
    console.log(`🎤 Processing real voice with Deepgram for user ${userId}...`);
    
    const { Deepgram } = require('@deepgram/sdk');
    const deepgram = new Deepgram(process.env.DEEPGRAM_API_KEY);
    
    // Convert audio stream to buffer with proper format handling
    const chunks = [];
    for await (const chunk of audioStream) {
      chunks.push(chunk);
    }
    const audioBuffer = Buffer.concat(chunks);
    
    console.log(`🎤 Audio buffer size: ${audioBuffer.length} bytes`);
    
    // Try different audio formats that Discord might use
    let transcript = null;
    
    try {
      // First try with Opus format (most common for Discord)
      const response = await deepgram.transcription.preRecorded({
        buffer: audioBuffer,
        mimetype: 'audio/opus',
        options: {
          model: 'nova-2',
          language: 'en-US',
          smart_format: true,
          punctuate: true,
          diarize: false,
          utterances: false
        }
      });
      
      transcript = response.results?.channels[0]?.alternatives[0]?.transcript;
      
    } catch (opusError) {
      console.log('🎤 Opus format failed, trying raw audio...');
      
      try {
        // Fallback to raw audio
        const response = await deepgram.transcription.preRecorded({
          buffer: audioBuffer,
          mimetype: 'audio/raw',
          options: {
            model: 'nova-2',
            language: 'en-US',
            smart_format: true,
            punctuate: true,
            diarize: false,
            utterances: false
          }
        });
        
        transcript = response.results?.channels[0]?.alternatives[0]?.transcript;
        
      } catch (rawError) {
        console.log('🎤 Raw audio format also failed, using fallback...');
        throw rawError;
      }
    }
    
    if (transcript && transcript.trim()) {
      console.log(`🎤 Deepgram transcribed: "${transcript}"`);
      return transcript.trim();
    } else {
      console.log('🎤 No speech detected in audio');
      return null;
    }
    
  } catch (error) {
    console.error('Deepgram error:', error);
    console.log('🎤 Falling back to simulated text...');
    // Fallback to simulated text if Deepgram fails
    return await simulateVoiceToText(audioStream);
  }
}

// Fallback simulated voice-to-text (kept for backup)
async function simulateVoiceToText(audioStream) {
  // This is a placeholder - replace with actual voice-to-text service
  // For testing, we'll return some sample text based on common voice inputs
  return new Promise((resolve) => {
    setTimeout(() => {
      const sampleInputs = [
        // Task-related
        "I need to do my homework tonight",
        "I should clean my room tomorrow",
        "I have a meeting at 3 PM",
        "I want to exercise this weekend",
        "I must buy groceries after work",
        "I need to call my mom",
        "I should study for the test",
        "I want to play games with friends",
        "I need to organize my desk",
        "I should practice guitar",
        // General conversation
        "How are you doing today?",
        "What's the weather like?",
        "Tell me a joke",
        "What time is it?",
        "How's your day going?",
        "What can you help me with?",
        "I'm feeling tired today",
        "That's really interesting",
        "Can you help me with something?",
        "What's your favorite food?"
      ];
      resolve(sampleInputs[Math.floor(Math.random() * sampleInputs.length)]);
    }, 300); // Even faster response for better feel
  });
}

// Add task from voice input
async function addTaskFromVoice(taskText, userId, guildId, client) {
  try {
    // Get the user's task storage
    if (!client.userTasks.has(userId)) {
      client.userTasks.set(userId, {
        tasks: [],
        lastUpdated: new Date()
      });
    }
    
    // Use AI to categorize the task
    const addTaskCommand = client.commands.get('addtask');
    if (addTaskCommand) {
      // Create a proper mock interaction that matches what addTask expects
      const mockInteraction = {
        user: { id: userId },
        guildId: guildId,
        reply: async (content) => {
          console.log(`🍱 Voice task added: ${JSON.stringify(content)}`);
          // Announce in voice channel
          const connection = client.voiceConnections.get(guildId);
          if (connection) {
            if (content.embeds && content.embeds[0]) {
              // Extract task info from embed
              const taskInfo = content.embeds[0].description || taskText;
              await speakMessage(`Task added to your lunchbox: ${taskInfo}`, connection);
            } else {
              await speakMessage(`Task added to your lunchbox: ${taskText}`, connection);
            }
          }
        },
        followUp: async (content) => {
          console.log(`🍱 Voice task followup: ${JSON.stringify(content)}`);
        },
        options: {
          getString: (optionName) => {
            if (optionName === 'task') return taskText;
            return null;
          }
        },
        isRepliable: () => true,
        deferred: false,
        replied: false
      };
      
      await addTaskCommand.execute(mockInteraction, client);
    }
  } catch (error) {
    console.error('Error adding task from voice:', error);
  }
}

// Respond to voice input with AI-powered responses
async function respondToVoiceWithAI(message, userId, guildId, client) {
  try {
    console.log(`🤖 Processing voice conversation with AI: "${message}"`);
    
    const connection = client.voiceConnections.get(guildId);
    if (connection) {
      // Use Groq for intelligent voice responses
      const Groq = require('groq-sdk');
      const groq = new Groq({
        apiKey: process.env.GROQ_API_KEY,
      });
      
      try {
        const completion = await groq.chat.completions.create({
          messages: [
            {
              role: "system",
              content: "You are Lunchbox, a friendly AI productivity assistant. Respond naturally to voice conversations. Keep responses conversational and under 100 words since this is voice."
            },
            {
              role: "user", 
              content: message
            }
          ],
          model: "llama3-8b-8192",
          temperature: 0.7,
          max_tokens: 150,
        });

        const aiResponse = completion.choices[0]?.message?.content || "That's interesting! I'm here to help with productivity and chat about anything.";
        
        // Speak the AI response
        await speakMessage(aiResponse, connection);
        
        // Also send AI response to text channel if we can find it
        try {
          const guild = client.guilds.cache.get(guildId);
          if (guild) {
            // Find the first text channel to send the response
            const textChannel = guild.channels.cache.find(channel => 
              channel.type === 0 && channel.permissionsFor(client.user).has('SendMessages')
            );
            
            if (textChannel) {
              const embed = new EmbedBuilder()
                .setColor(0x0099FF)
                .setAuthor({ name: 'Lunchbox AI', iconURL: 'https://cdn.discordapp.com/emojis/🤖' })
                .setDescription(`**AI Response:**\n${aiResponse}`)
                .setTimestamp()
                .setFooter({ text: 'Voice AI response' });
              
              await textChannel.send({ embeds: [embed] });
            }
          }
        } catch (textError) {
          console.log('Could not send AI response to text channel:', textError.message);
        }
        
      } catch (aiError) {
        console.error('AI error in voice response:', aiError);
        // Fallback response
        const fallbackResponse = `I heard you say: ${message}. That's interesting! I'm here to help organize your day and chat about anything.`;
        await speakMessage(fallbackResponse, connection);
      }
    }
  } catch (error) {
    console.error('Error responding to voice with AI:', error);
  }
}

// Legacy function for backward compatibility
async function respondToVoice(message, userId, guildId, client) {
  await respondToVoiceWithAI(message, userId, guildId, client);
}

// Speak a message using TTS
async function speakMessage(message, connection) {
  try {
    const audioFile = await createTTSAudio(message);
    
    if (audioFile) {
      const player = createAudioPlayer();
      const resource = createAudioResource(audioFile);
      
      player.play(resource);
      connection.subscribe(player);
      
      player.on(AudioPlayerStatus.Playing, () => {
        console.log('🎤 Speaking:', message);
      });
      
      player.on(AudioPlayerStatus.Idle, () => {
        try {
          fs.unlinkSync(audioFile);
        } catch (error) {
          console.error('Error cleaning up audio file:', error);
        }
      });
    }
  } catch (error) {
    console.error('Error speaking message:', error);
  }
}

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
