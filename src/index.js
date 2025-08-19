const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { config } = require('dotenv');
const fs = require('fs');
const path = require('path');
const http = require('http');

// Load environment variables from .env file
config();

// Create a new Discord client with necessary permissions
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates
  ]
});

// Store commands and tasks
client.commands = new Collection();
client.userTasks = new Map(); // Store tasks for each user

// Load command files
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
  }
}

// Bot ready event
client.once('ready', () => {
  console.log(`🍱 Lunchbox is ready! Logged in as ${client.user.tag}`);
  client.user.setActivity('organizing your lunchbox! 🥪', { type: 'PLAYING' });
  
  // Log process information for debugging
  console.log(`📊 Process ID: ${process.pid}`);
  console.log(`📊 Node Version: ${process.version}`);
  console.log(`📊 Platform: ${process.platform}`);
  console.log(`📊 Architecture: ${process.arch}`);
  console.log(`📊 Memory Usage: ${JSON.stringify(process.memoryUsage())}`);
  
  // Start HTTP server for Railway health checks
  const server = http.createServer((req, res) => {
    console.log(`🌐 HTTP Request: ${req.method} ${req.url}`);
    
    if (req.url === '/health') {
      console.log('✅ Health check requested');
      // More comprehensive health check
      const healthStatus = {
        status: 'healthy',
        bot: 'Lunchbox Discord Bot',
        discord: client.isReady() ? 'connected' : 'connecting',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      };
      
      res.writeHead(200, { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      });
      res.end(JSON.stringify(healthStatus, null, 2));
      console.log('✅ Health check response sent');
    } else if (req.url === '/') {
      console.log('✅ Root endpoint requested');
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<h1>🍱 Lunchbox Discord Bot</h1><p>Bot is running! Use /help in Discord.</p>');
    } else if (req.url === '/ping') {
      console.log('✅ Ping endpoint requested');
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('pong');
    } else if (req.url === '/status') {
      console.log('✅ Status endpoint requested');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
    } else {
      console.log(`❌ Unknown endpoint: ${req.url}`);
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    }
  });
  
  const port = process.env.PORT || 3000;
  console.log(`🌐 Starting HTTP server on port ${port}...`);
  
  server.listen(port, '0.0.0.0', () => {
    console.log(`🌐 HTTP server successfully running on port ${port} for Railway health checks`);
    console.log(`🌐 Health check available at: http://0.0.0.0:${port}/health`);
    console.log(`🌐 Root endpoint at: http://0.0.0.0:${port}/`);
    
    // Signal that the server is ready
    console.log('🚀 Bot is fully ready and responding to health checks!');
  });
  
  // Handle server errors gracefully
  server.on('error', (error) => {
    console.error('HTTP server error:', error);
  });
  
  // Add a simple startup health check that responds immediately
  setTimeout(() => {
    console.log('🔍 Performing startup health check verification...');
    // This will help Railway know the service is ready
  }, 2000);
});

// Handle slash command interactions
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction, client);
  } catch (error) {
    console.error(error);
    const errorMessage = 'Oops! Something went wrong while organizing your lunchbox. 🥺';
    
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: errorMessage, ephemeral: true });
    } else {
      await interaction.reply({ content: errorMessage, ephemeral: true });
    }
  }
});

// Handle regular messages for task categorization
client.on('messageCreate', async message => {
  // Ignore bot messages and messages without content
  if (message.author.bot || !message.content.trim()) return;
  
  // Check if message mentions the bot or starts with the prefix
  const prefix = process.env.BOT_PREFIX || '!';
  const isMentioned = message.mentions.users.has(client.user.id);
  const isPrefixed = message.content.startsWith(prefix);
  
  // If it's a direct mention or prefix command, handle as task
  if (isMentioned || isPrefixed) {
    // Extract the task content
    let taskContent = message.content;
    if (isMentioned) {
      taskContent = message.content.replace(/<@!\d+>|<@\d+>/g, '').trim();
    } else if (isPrefixed) {
      taskContent = message.content.slice(prefix.length).trim();
    }
    
    if (!taskContent) {
      await message.reply('🍱 What task would you like me to add to your lunchbox?');
      return;
    }
    
    // Use the addTask command logic
    const addTaskCommand = client.commands.get('addtask');
    if (addTaskCommand) {
      try {
        // Create a mock interaction for the addTask command
        const mockInteraction = {
          user: message.author,
          reply: message.reply.bind(message),
          followUp: message.reply.bind(message),
          options: {
            getString: () => taskContent
          },
          isRepliable: () => true
        };
        
        await addTaskCommand.execute(mockInteraction, client);
      } catch (error) {
        console.error('Error processing message:', error);
        await message.reply('🍱 Sorry, I had trouble adding that task to your lunchbox. Try using the `/addtask` command instead!');
      }
    }
    return;
  }
  
  // Handle regular conversation - this is the key feature!
  const messageContent = message.content.toLowerCase().trim();
  
  // Check if this is a response to a pending task question
  if (client.pendingTasks && client.pendingTasks.has(message.author.id)) {
    const pendingTask = client.pendingTasks.get(message.author.id);
    const response = messageContent;
    
    if (response.includes('yes') || response.includes('yeah') || response.includes('sure') || response.includes('ok') || response.includes('yep')) {
      // User wants to add the task
      await message.reply(`🍱 Great! Adding "${pendingTask}" to your lunchbox...`);
      
      // Use the addTask command logic
      const addTaskCommand = client.commands.get('addtask');
      if (addTaskCommand) {
        try {
          const mockInteraction = {
            user: message.author,
            reply: message.reply.bind(message),
            followUp: message.reply.bind(message),
            options: {
              getString: () => pendingTask
            },
            isRepliable: () => true
          };
          
          await addTaskCommand.execute(mockInteraction, client);
          client.pendingTasks.delete(message.author.id); // Clear the pending task
        } catch (error) {
          console.error('Error adding task from conversation:', error);
          await message.reply('🍱 Sorry, I had trouble adding that task. Try using `/addtask` instead!');
        }
      }
      return;
    } else if (response.includes('no') || response.includes('nope') || response.includes('nah')) {
      // User doesn't want to add the task
      await message.reply('🍱 No problem! Just let me know if you change your mind.');
      client.pendingTasks.delete(message.author.id); // Clear the pending task
      return;
    }
  }
  
  // Check if the message contains task-related keywords AND user intent
  const taskKeywords = [
    'need to', 'have to', 'should', 'must', 'want to', 'plan to', 'going to',
    'homework', 'study', 'work', 'project', 'meeting', 'appointment', 'deadline',
    'clean', 'organize', 'buy', 'call', 'email', 'text', 'message', 'visit',
    'exercise', 'workout', 'cook', 'shop', 'read', 'write', 'learn', 'practice'
  ];
  
  const hasTaskKeywords = taskKeywords.some(keyword => messageContent.includes(keyword));
  
  // Only suggest tasks if it's clearly task-related AND not just casual conversation
  if (hasTaskKeywords && isClearlyTaskRelated(messageContent)) {
    // This looks like a task! Ask if they want to add it
    await message.reply(`🍱 That sounds like something for your lunchbox! Would you like me to add "${message.content}" as a task?`);
    
    // Store the potential task for this user
    if (!client.pendingTasks) client.pendingTasks = new Map();
    client.pendingTasks.set(message.author.id, message.content);
    
  } else {
    // Regular conversation - respond naturally and intelligently
    await handleRegularConversation(message, messageContent);
  }
});

// Login to Discord
client.login(process.env.DISCORD_TOKEN);

// Graceful shutdown handling for Railway
process.on('SIGTERM', () => {
  console.log('🔄 Received SIGTERM, shutting down gracefully...');
  client.destroy();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🔄 Received SIGINT, shutting down gracefully...');
  client.destroy();
  process.exit(0);
});

// Helper function to determine if a message is clearly task-related
function isClearlyTaskRelated(messageContent) {
  // Phrases that are clearly about tasks
  const clearTaskPhrases = [
    'i need to', 'i have to', 'i should', 'i must', 'i want to', 'i plan to', 'i am going to',
    'i need to do', 'i have to do', 'i should do', 'i must do', 'i want to do',
    'i need to finish', 'i have to finish', 'i should finish',
    'i need to complete', 'i have to complete', 'i should complete',
    'i need to work on', 'i have to work on', 'i should work on',
    'i need to study', 'i have to study', 'i should study',
    'i need to clean', 'i have to clean', 'i should clean',
    'i need to buy', 'i have to buy', 'i should buy',
    'i need to call', 'i have to call', 'i should call',
    'i need to email', 'i have to email', 'i should email',
    'i need to schedule', 'i have to schedule', 'i should schedule',
    'i need to organize', 'i have to organize', 'i should organize'
  ];
  
  // Check for clear task phrases
  const hasClearTaskPhrase = clearTaskPhrases.some(phrase => 
    messageContent.includes(phrase)
  );
  
  // If it has a clear task phrase, it's definitely a task
  if (hasClearTaskPhrase) return true;
  
  // Check for casual conversation indicators that suggest it's NOT a task
  const casualIndicators = [
    'how are you', 'how\'s it going', 'what\'s up', 'sup', 'hey', 'hi', 'hello',
    'good morning', 'good afternoon', 'good evening', 'good night',
    'nice to meet you', 'pleasure to meet you', 'how do you do',
    'what\'s your name', 'who are you', 'tell me about yourself',
    'what can you do', 'how do you work', 'what are your features',
    'i like', 'i love', 'i enjoy', 'i hate', 'i dislike',
    'the weather is', 'it\'s raining', 'it\'s sunny', 'it\'s cold', 'it\'s hot',
    'i\'m tired', 'i\'m happy', 'i\'m sad', 'i\'m excited', 'i\'m bored',
    'that\'s cool', 'that\'s awesome', 'that\'s amazing', 'that\'s terrible',
    'i agree', 'i disagree', 'you\'re right', 'you\'re wrong',
    'thank you', 'thanks', 'appreciate it', 'no problem', 'you\'re welcome'
  ];
  
  const hasCasualIndicators = casualIndicators.some(indicator => 
    messageContent.includes(indicator)
  );
  
  // If it has casual indicators, it's probably not a task
  // BUT if it also has questions about the bot, we should still respond
  if (hasCasualIndicators) {
    // Check if it's asking about the bot specifically
    const botQuestions = ['what is your name', 'who are you', 'tell me about yourself', 'what can you do', 'how do you work'];
    const isAskingAboutBot = botQuestions.some(question => messageContent.includes(question));
    
    if (isAskingAboutBot) {
      return false; // Let it go to conversation handling
    }
    
    return false; // It's casual conversation, not a task
  }
  
  // Default: if it has task keywords but no clear context, ask the user
  return true;
}

// Handle regular conversation intelligently
async function handleRegularConversation(message, messageContent) {
  // Greetings and introductions
  if (messageContent.includes('hello') || messageContent.includes('hi') || messageContent.includes('hey')) {
    const greetings = [
      "🍱 Hey there! How's your day going?",
      "🍱 Hi! I'm Lunchbox, your AI productivity buddy!",
      "🍱 Hello! Ready to organize some tasks?",
      "🍱 Hi! I'm here to help make your day more organized and fun!",
      "🍱 Hey! I'm Lunchbox - I turn conversations into organized tasks!",
      "🍱 Hello! I'm your lunchbox organizer - just chat with me naturally!"
    ];
    await message.reply(greetings[Math.floor(Math.random() * greetings.length)]);
    return;
  }
  
  // Questions about the bot (including name questions)
  if (messageContent.includes('what can you do') || messageContent.includes('how do you work') || messageContent.includes('what are your features') || 
      messageContent.includes('what is your name') || messageContent.includes('who are you') || messageContent.includes('tell me about yourself')) {
    await message.reply("🍱 I'm Lunchbox, your AI productivity assistant! I can:\n• Create and organize tasks into fun food categories\n• Listen to your voice and create tasks automatically\n• Help you stay productive with a balanced lunchbox\n• Chat naturally about anything - I'm not just about tasks!\n\nJust talk to me naturally or use commands like `/help` to see everything I can do!");
    return;
  }
  
  // Questions about the user
  if (messageContent.includes('how are you') || messageContent.includes('how\'s it going') || messageContent.includes('what\'s up')) {
    const responses = [
      "🍱 I'm doing great! Always excited to help organize someone's day! How about you?",
      "🍱 I'm fantastic! Ready to help make your productivity delicious! What's new with you?",
      "🍱 I'm wonderful! My lunchbox is full of helpful features. How's your day shaping up?",
      "🍱 I'm excellent! Eager to help you pack your lunchbox with productive tasks. What's on your mind?"
    ];
    await message.reply(responses[Math.floor(Math.random() * responses.length)]);
    return;
  }
  
  // Weather and casual topics
  if (messageContent.includes('weather') || messageContent.includes('raining') || messageContent.includes('sunny') || messageContent.includes('cold') || messageContent.includes('hot')) {
    await message.reply("🍱 I'm not a weather bot, but I can help you plan your day around whatever weather you're having! Want to add some indoor or outdoor activities to your lunchbox?");
    return;
  }
  
  // Emotional responses
  if (messageContent.includes('i\'m tired') || messageContent.includes('i\'m exhausted') || messageContent.includes('i\'m worn out')) {
    await message.reply("🍱 I hear you! Being tired is totally normal. Maybe we can add some rest and self-care tasks to your lunchbox? Remember, taking breaks is productive too!");
    return;
  }
  
  if (messageContent.includes('i\'m happy') || messageContent.includes('i\'m excited') || messageContent.includes('i\'m thrilled')) {
    await message.reply("🍱 That's wonderful! I love when people are feeling good! Maybe we can channel that positive energy into some fun and productive tasks for your lunchbox?");
    return;
  }
  
  if (messageContent.includes('i\'m sad') || messageContent.includes('i\'m down') || messageContent.includes('i\'m feeling low')) {
    await message.reply("🍱 I'm sorry you're feeling down. Remember, it's okay to not be okay. Maybe we can add some gentle, achievable tasks to your lunchbox to help you feel accomplished? Small wins add up!");
    return;
  }
  
  // Gratitude
  if (messageContent.includes('thank you') || messageContent.includes('thanks') || messageContent.includes('appreciate')) {
    const responses = [
      "🍱 You're very welcome! I'm here to help make your day more organized and fun!",
      "🍱 Anytime! Helping you stay productive is what I do best!",
      "🍱 My pleasure! I love helping people organize their lunchbox!",
      "🍱 No problem at all! That's what I'm here for!"
    ];
    await message.reply(responses[Math.floor(Math.random() * responses.length)]);
    return;
  }
  
  // Default response for other conversations
  const defaultResponses = [
    "🍱 That's interesting! I'm here to help with productivity, but I'm happy to chat about anything. Want to add something to your lunchbox while we're talking?",
    "🍱 I'm listening! I'm not just about tasks - I'm here to be your AI buddy too. What's on your mind?",
    "🍱 Tell me more! I'm curious about what you're thinking. And hey, if anything sounds like a task, I can help organize it!",
    "🍱 I'm here for you! Whether it's productivity help or just chatting, I'm all ears. What would you like to talk about?"
  ];
  
  await message.reply(defaultResponses[Math.floor(Math.random() * defaultResponses.length)]);
}
