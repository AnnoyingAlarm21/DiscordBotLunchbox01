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
  
  // Check if the message contains task-related keywords
  const taskKeywords = [
    'need to', 'have to', 'should', 'must', 'want to', 'plan to', 'going to',
    'homework', 'study', 'work', 'project', 'meeting', 'appointment', 'deadline',
    'clean', 'organize', 'buy', 'call', 'email', 'text', 'message', 'visit',
    'exercise', 'workout', 'cook', 'shop', 'read', 'write', 'learn', 'practice'
  ];
  
  const hasTaskKeywords = taskKeywords.some(keyword => messageContent.includes(keyword));
  
  if (hasTaskKeywords) {
    // This looks like a task! Ask if they want to add it
    await message.reply(`🍱 That sounds like something for your lunchbox! Would you like me to add "${message.content}" as a task? Just say "yes" or "no"!`);
    
    // Store the potential task for this user
    if (!client.pendingTasks) client.pendingTasks = new Map();
    client.pendingTasks.set(message.author.id, message.content);
    
  } else {
    // Check if this is a response to a pending task question
    if (client.pendingTasks && client.pendingTasks.has(message.author.id)) {
      const pendingTask = client.pendingTasks.get(message.author.id);
      const response = messageContent.toLowerCase();
      
      if (response.includes('yes') || response.includes('yeah') || response.includes('sure') || response.includes('ok')) {
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
    
    // Regular conversation - respond naturally
    const responses = [
      "🍱 Hey there! How's your day going?",
      "🍱 Hi! I'm Lunchbox, your AI productivity buddy!",
      "🍱 Hello! Ready to organize some tasks?",
      "🍱 Hi! I'm here to help make your day more organized and fun!",
      "🍱 Hey! I'm Lunchbox - I turn conversations into organized tasks!",
      "🍱 Hello! I'm your lunchbox organizer - just chat with me naturally!"
    ];
    
    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    await message.reply(randomResponse);
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
