const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { config } = require('dotenv');
const fs = require('fs');
const path = require('path');
const http = require('http');
const taskProcessor = require('./utils/taskProcessor');
const taskStorage = require('./utils/taskStorage');
const { startAdminDashboard } = require('./admin/server');

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

// Store active conversation users
client.activeConversations = new Set();

// Store conversation context for each user
client.conversationContext = new Map();

// Store pending tasks for confirmation
client.pendingTasks = new Map();

// Make reminder system globally accessible
global.reminderSystem = require('./utils/reminderSystem');

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
  
  // Load tasks from persistent storage
  client.userTasks = taskStorage.loadTasks();
  console.log(`📁 Loaded ${client.userTasks.size} users with tasks from storage`);
  
  // Make bot client globally available for admin dashboard
  global.botClient = client;

  // Start admin dashboard
  startAdminDashboard();

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
        version: '1.0.0',
        startup: 'complete'
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
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    }
  });
  
  server.listen(8080, '0.0.0.0', () => {
    console.log('🌐 Starting HTTP server on port 8080...');
    console.log('🌐 HTTP server successfully running on port 8080 for Railway health checks');
    console.log('🌐 Health check available at: http://0.0.0.0:8080/health');
    console.log('🌐 Root endpoint at: http://0.0.0.0:8080/');
  });
  
  // Periodic task saving every 30 minutes
  setInterval(() => {
    if (client.userTasks && client.userTasks.size > 0) {
      console.log('💾 Periodic task save triggered');
      saveTasksToStorage();
    }
  }, 30 * 60 * 1000); // 30 minutes
  
  // Periodic reminder cleanup every 5 minutes
  if (global.reminderSystem) {
    setInterval(() => {
      global.reminderSystem.cleanupExpiredReminders();
    }, 5 * 60 * 1000); // 5 minutes
  }
  
  console.log('🚀 Bot is fully ready and responding to health checks!');
  
  // Add a simple startup health check that responds immediately
  setTimeout(() => {
    console.log('🔍 Performing startup health check verification...');
    console.log(`🔍 Initial userTasks size: ${client.userTasks.size}`);
    console.log(`🔍 Initial activeConversations size: ${client.activeConversations.size}`);
    console.log('✅ Startup health check complete - service is ready!');
  }, 1000);
});

// Handle slash command interactions
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction, client);
  } catch (error) {
    console.error('Command execution error:', error);
    const errorMessage = 'Oops! Something went wrong while organizing your lunchbox. 🥺';
    
    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: errorMessage, ephemeral: true });
      } else {
        await interaction.reply({ content: errorMessage, ephemeral: true });
      }
    } catch (replyError) {
      console.error('Failed to send error message:', replyError);
    }
  }
});

// Handle regular messages for task categorization
client.on('messageCreate', async message => {
  // Ignore bot messages and messages without content
  if (message.author.bot || !message.content.trim()) return;
  
  console.log(`📨 Message received: "${message.content}" from ${message.author.username}`);
  
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
        // Create a proper mock interaction for the addTask command
        const mockInteraction = {
          user: message.author,
          guildId: message.guild?.id,
          reply: message.reply.bind(message),
          followUp: message.reply.bind(message),
          options: {
            getString: (optionName) => {
              if (optionName === 'task') return taskContent;
              return null;
            }
          },
          isRepliable: () => true,
          deferred: false,
          replied: false
        };
        
        await addTaskCommand.execute(mockInteraction, client);
      } catch (error) {
        console.error('Error processing message:', error);
        await message.reply('🍱 Sorry, I had trouble adding that task to your lunchbox. Try using the `/addtask` command instead!');
      }
    }
    return;
  }
  
  // Check if user is in conversation mode OR if this is a private thread
  const isInPrivateThread = message.channel.isThread() && 
                           message.channel.ownerId === message.author.id &&
                           client.privateThreads?.has(message.channel.id);
  
  // Check if user is in conversation mode
  const isInConversationMode = client.activeConversations.has(message.author.id);
  
  // Only process if user is in conversation mode OR in a private thread, but not both
  if (!isInConversationMode && !isInPrivateThread) {
    // User is not in conversation mode and not in a private thread - don't respond
    console.log(`🔇 User ${message.author.username} is not in conversation mode or private thread - ignoring message`);
    return;
  }
  
  // Prevent duplicate processing - if user is in both, prioritize conversation mode
  if (isInConversationMode && isInPrivateThread) {
    console.log(`🔇 User ${message.author.username} is in both conversation mode and private thread - using conversation mode only`);
  }
  
  // User is in conversation mode OR in private thread - process their message
  const context = isInConversationMode ? 'conversation mode' : 'private thread';
  console.log(`💬 Processing ${context} message from ${message.author.username}: "${message.content}"`);
  
  // Store message in conversation history
  if (!client.conversationHistory) {
    client.conversationHistory = new Map();
  }
  
  if (!client.conversationHistory.has(message.author.id)) {
    client.conversationHistory.set(message.author.id, []);
  }
  
  const userHistory = client.conversationHistory.get(message.author.id);
  
  // Check for duplicate messages (prevent processing the same message twice)
  const lastMessage = userHistory.length > 0 ? userHistory[userHistory.length - 1] : null;
  const isDuplicate = lastMessage && 
                     lastMessage.content === message.content && 
                     lastMessage.author === message.author.username &&
                     (new Date() - lastMessage.timestamp) < 5000; // Within 5 seconds
  
  if (isDuplicate) {
    console.log(`🔇 Duplicate message detected, ignoring: "${message.content}"`);
    return;
  }
  
  userHistory.push({
    timestamp: new Date(),
    author: message.author.username,
    content: message.content,
    type: 'user'
  });
  
  // Keep only last 50 messages per user to prevent memory issues
  if (userHistory.length > 50) {
    userHistory.splice(0, userHistory.length - 50);
  }
  
  // Handle regular conversation - this is the key feature!
  const messageContent = message.content.toLowerCase().trim();
  
  console.log(`🔍 Processing message: "${messageContent}"`);
  console.log(`🔍 Is mention: ${isMentioned}, Is prefixed: ${isPrefixed}`);
  
  // Check if this is a response to a pending task question
  if (client.pendingTasks && client.pendingTasks.has(message.author.id)) {
    console.log(`✅ Found pending task for user ${message.author.username}`);
    const pendingTaskData = client.pendingTasks.get(message.author.id);
    const response = messageContent;
    
    console.log(`🔍 User response: "${response}"`);
    console.log(`🔍 Pending task data:`, JSON.stringify(pendingTaskData, null, 2));
    
    if (response.includes('yes') || response.includes('yeah') || response.includes('sure') || response.includes('ok') || response.includes('yep') || response.includes('please')) {
      console.log(`✅ User confirmed task creation`);
      
      // Check if user added deadline information in their confirmation
      const deadlineUpdate = taskProcessor.cleanTaskText(message.content);
      const hasDeadlineUpdate = deadlineUpdate.deadline !== null;
      
      // Combine original task with any deadline updates
      let finalTaskText = pendingTaskData.cleanText || pendingTaskData.originalText || pendingTaskData;
      let finalDeadline = pendingTaskData.deadline;
      
      if (hasDeadlineUpdate) {
        // User provided deadline in confirmation - update the task
        finalTaskText = `${finalTaskText} (${deadlineUpdate.cleanText})`;
        finalDeadline = deadlineUpdate.deadline;
        
        await message.reply(`🍱 Perfect! Adding **"${finalTaskText}"** with deadline **${finalDeadline.fullDate.toLocaleString()}** to your lunchbox...`);
      } else {
        // No deadline update - use original task
        await message.reply(`🍱 Great! Adding **"${finalTaskText}"** to your lunchbox...`);
      }
      
      console.log(`🚀 Creating task: "${finalTaskText}"`);
      
      // Use the addTask command logic
      const addTaskCommand = client.commands.get('addtask');
      if (addTaskCommand) {
        try {
          const mockInteraction = {
            user: message.author,
            guildId: message.guild?.id,
            reply: message.reply.bind(message),
            followUp: message.reply.bind(message),
            options: {
              getString: (optionName) => {
                if (optionName === 'task') return finalTaskText;
                return null;
              }
            },
            isRepliable: () => true,
            deferred: false,
            replied: false
          };
          
          console.log(`🤖 Executing addTask command with mock interaction`);
          await addTaskCommand.execute(mockInteraction, client);
          console.log(`✅ Task successfully created!`);
          
          // Schedule reminders if the task has a deadline
          if (finalDeadline) {
            console.log(`⏰ Scheduling reminders for task with deadline: ${finalDeadline.fullDate.toLocaleString()}`);
            try {
              // Generate a unique task ID for reminders
              const taskId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
              global.reminderSystem.scheduleReminders(client, message.author.id, taskId, finalTaskText, finalDeadline.fullDate);
              console.log(`✅ Reminders scheduled successfully for task: ${taskId}`);
            } catch (reminderError) {
              console.error(`❌ Failed to schedule reminders:`, reminderError);
            }
          }
          
          client.pendingTasks.delete(message.author.id); // Clear the pending task
        } catch (error) {
          console.error('❌ Error adding task from conversation:', error);
          await message.reply('🍱 Sorry, I had trouble adding that task. Try using `/addtask` instead!');
        }
      } else {
        console.error('❌ addTask command not found!');
        await message.reply('🍱 Sorry, I had trouble adding that task. Try using `/addtask` instead!');
      }
      return;
    } else if (response.includes('no') || response.includes('nope') || response.includes('nah')) {
      // User doesn't want to add the task
      console.log(`❌ User declined task creation`);
      await message.reply('🍱 No problem! Just let me know if you change your mind.');
      client.pendingTasks.delete(message.author.id); // Clear the pending task
      return;
    } else {
      console.log(`❓ User response unclear: "${response}" - not yes/no`);
      
      // Check if user is adding deadline information to the existing task
      const deadlineInfo = taskProcessor.cleanTaskText(message.content);
      if (deadlineInfo.deadline !== null) {
        console.log(`⏰ User provided deadline info: "${deadlineInfo.cleanText}"`);
        
        // Update the pending task with deadline information
        const updatedTask = {
          ...pendingTaskData,
          deadline: deadlineInfo.deadline
        };
        
        // Ask for confirmation with the updated task
        let confirmationText = `🍱 Perfect! I'll add **"${pendingTaskData.cleanText}"** with deadline **${deadlineInfo.deadline.fullDate.toLocaleString()}** to your lunchbox.`;
        confirmationText += `\n\n⏰ **Deadline:** ${deadlineInfo.deadline.fullDate.toLocaleString()}`;
        confirmationText += `\n🔔 **Reminders:** 10 min • 5 min • Exact time`;
        confirmationText += `\n\n**Just say "yes" to confirm!**`;
        
        await message.reply(confirmationText);
        
        // Update the pending task with deadline
        client.pendingTasks.set(message.author.id, updatedTask);
        return;
      }
      
      // Check if user is providing additional context (not a new task)
      const contextWords = ['but', 'however', 'also', 'additionally', 'plus', 'and', 'or', 'for', 'at', 'on', 'in', 'due', 'when', 'where', 'how'];
      const hasContextWords = contextWords.some(word => messageContent.includes(word));
      
      if (hasContextWords) {
        console.log(`🔍 User providing additional context, not a new task`);
        
        // Ask user to clarify if they want to add this as a separate task or modify the existing one
        await message.reply(`🍱 I see you're adding more information. Do you want me to:\n\n1️⃣ **Modify the existing task** "${pendingTaskData.cleanText}" with this additional info?\n2️⃣ **Create a separate new task** with "${message.content}"?\n\nJust say "modify" or "new task" to let me know!`);
        
        // Store the context for the next response
        client.pendingTasks.set(message.author.id, {
          ...pendingTaskData,
          additionalContext: message.content
        });
        return;
      }
      
      // Don't return here - let it continue to AI conversation
    }
  }
  
  // NEW: Smart task detection from conversation (the core feature!)
  const taskKeywords = [
    'need to', 'have to', 'should', 'must', 'want to', 'plan to', 'going to',
    'got', 'have', 'need', 'want', 'plan', 'going', 'doing', 'attending',
    'homework', 'study', 'work', 'project', 'meeting', 'appointment', 'deadline',
    'book club', 'club', 'class', 'session', 'event', 'activity', 'gathering',
    'clean', 'organize', 'buy', 'call', 'email', 'text', 'message', 'visit',
    'exercise', 'workout', 'cook', 'shop', 'read', 'write', 'learn', 'practice',
    'schedule', 'due', 'get done', 'finish', 'complete', 'submit', 'turn in',
    'remind', 'set reminder', 'calendar', 'plan', 'organize', 'arrange',
    'doctor', 'dentist', 'medical', 'checkup', 'exam', 'test', 'procedure',
    'therapy', 'consultation', 'follow-up', 'surgery', 'treatment',
    'deliverables', 'coordination', 'work timings', 'timeline', 'requirements',
    'deadlines', 'milestones', 'goals', 'objectives', 'targets', 'priorities',
    'tasks', 'assignments', 'responsibilities', 'duties', 'chores', 'errands'
  ];
  
  const hasTaskKeywords = taskKeywords.some(keyword => messageContent.includes(keyword));
  
  // Removed context filters - detect tasks more aggressively
  
  // Check if user is in conversation mode and has pending tasks
  const hasPendingTask = client.pendingTasks && client.pendingTasks.has(message.author.id);
  
  // Priority: Handle pending tasks first, then detect new tasks, then AI conversation
  if (hasPendingTask) {
    console.log(`🎯 User has pending task, processing response to existing task`);
    // This will be handled by the pending task logic above
    return;
  }
  
  // NEW: Smart task detection - detect tasks more aggressively (removed filters)
  if (hasTaskKeywords) {
    console.log(`🎯 Task detected from conversation: "${message.content}"`);
    
    // Process the task text to clean it up
    const processedTask = taskProcessor.cleanTaskText(message.content);
    const cleanTaskText = processedTask.cleanText;
    const hasDeadline = processedTask.deadline !== null;
    
    console.log(`🧹 Cleaned task text: "${cleanTaskText}"`);
    console.log(`⏰ Has deadline: ${hasDeadline}`);
    if (hasDeadline) {
      console.log(`📅 Deadline: ${processedTask.deadline.fullDate.toLocaleString()}`);
    }
    
    // Create a better task suggestion - use the CLEANED text, not raw message
    let suggestionText = `🍱 That sounds like something for your lunchbox! Would you like me to add **"${cleanTaskText}"** as a task?`;
    
    if (hasDeadline) {
      const deadline = processedTask.deadline;
      suggestionText += `\n\n⏰ **Deadline detected:** ${deadline.fullDate.toLocaleString()}`;
      suggestionText += `\n🔔 **I'll send you reminders at:** 10 min • 5 min • Exact time`;
    }
    
    suggestionText += `\n\n💬 **To start chatting naturally with me, use \`/conversate\`**`;
    
    console.log(`💬 Sending task suggestion: "${suggestionText}"`);
    await message.reply(suggestionText);
    
    // Store the processed task for this user - store the CLEANED text
    if (!client.pendingTasks) client.pendingTasks = new Map();
    client.pendingTasks.set(message.author.id, {
      originalText: message.content,
      cleanText: cleanTaskText,  // This is the cleaned version
      deadline: processedTask.deadline
    });
    
    console.log(`💾 Stored pending task for user ${message.author.username}:`, JSON.stringify(client.pendingTasks.get(message.author.id), null, 2));
    
    // Also store in conversation context for AI to remember
    if (!client.conversationContext.has(message.author.id)) {
      client.conversationContext.set(message.author.id, {
        messages: [],
        lastTaskContext: null,
        userPreferences: {},
        conversationStart: new Date()
      });
    }
    const userContext = client.conversationContext.get(message.author.id);
    userContext.lastTaskContext = cleanTaskText;
    
    console.log(`🧠 Updated conversation context for user ${message.author.username}`);
    return;
  }
  
  // For users in conversation mode, use AI conversation handler (PRIORITY)
  console.log(`💬 Going to AI conversation handler for: "${messageContent}"`);
  await handleAIConversation(message, messageContent, client);
});

// Login to Discord
client.login(process.env.DISCORD_TOKEN);

// Helper function to save tasks to storage
function saveTasksToStorage() {
  try {
    taskStorage.saveTasks(client.userTasks);
  } catch (error) {
    console.error('❌ Error saving tasks to storage:', error);
  }
}

// Global error handlers to prevent crashes
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// Graceful shutdown handling for Railway
process.on('SIGTERM', () => {
  console.log('🔄 Received SIGTERM, shutting down gracefully...');
  // Save all tasks to storage
  saveTasksToStorage();
  // Clean up all active reminders
  if (global.reminderSystem) {
    global.reminderSystem.cleanupExpiredReminders();
  }
  client.destroy();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🔄 Received SIGINT, shutting down gracefully...');
  // Save all tasks to storage
  saveTasksToStorage();
  // Clean up all active reminders
  if (global.reminderSystem) {
    global.reminderSystem.cleanupExpiredReminders();
  }
  client.destroy();
  process.exit(0);
});

// Handle regular conversation intelligently
async function handleRegularConversation(message, messageContent) {
  console.log(`🎭 Conversation handler called with: "${messageContent}"`);
  
  // Store conversation context for this user
  if (!client.conversationContext) client.conversationContext = new Map();
  const userContext = client.conversationContext.get(message.author.id) || { lastMessage: '', responseCount: 0, mood: 'neutral' };
  
  // Update context
  userContext.lastMessage = messageContent;
  userContext.responseCount++;
  client.conversationContext.set(message.author.id, userContext);
  
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
    
    // If this is a repeat greeting, acknowledge it differently
    if (userContext.responseCount > 1) {
      await message.reply("🍱 Hey again! Still here and ready to help. What's on your mind this time?");
    } else {
      await message.reply(greetings[Math.floor(Math.random() * greetings.length)]);
    }
    return;
  }
  
  // Questions about the bot (including name questions)
  if (messageContent.includes('what can you do') || messageContent.includes('how do you work') || messageContent.includes('what are your features') || 
      messageContent.includes('what is your name') || messageContent.includes('who are you') || messageContent.includes('tell me about yourself')) {
    
    // Check if they've asked before
    if (userContext.lastMessage.includes('what') && userContext.responseCount > 1) {
      await message.reply("🍱 I'm still the same Lunchbox! But let me remind you - I'm your AI productivity buddy who can organize tasks, chat with you, and even listen to your voice. What would you like to know more about?");
    } else {
      await message.reply("🍱 I'm Lunchbox, your AI productivity assistant! I can:\n• Create and organize tasks into fun food categories\n• Listen to your voice and create tasks automatically\n• Help you stay productive with a balanced lunchbox\n• Chat naturally about anything - I'm not just about tasks!\n\nJust talk to me naturally or use commands like `/help` to see everything I can do!");
    }
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
  let response;
  
  // Contextual responses based on conversation history
  if (userContext.responseCount === 1) {
    response = "🍱 That's interesting! I'm here to help with productivity, but I'm happy to chat about anything. Want to add something to your lunchbox while we're talking?";
  } else if (userContext.responseCount === 2) {
    response = "🍱 I'm listening! I'm not just about tasks - I'm here to be your AI buddy too. What's on your mind?";
  } else if (userContext.responseCount === 3) {
    response = "🍱 Tell me more! I'm curious about what you're thinking. And hey, if anything sounds like a task, I can help organize it!";
  } else if (userContext.responseCount === 4) {
    response = "🍱 I'm here for you! Whether it's productivity help or just chatting, I'm all ears. What would you like to talk about?";
  } else {
    // After 4+ messages, be more casual and varied
    const casualResponses = [
      "🍱 Cool! What else is happening?",
      "🍱 Nice! Tell me more about that.",
      "🍱 That sounds interesting! What's next?",
      "🍱 I'm following along! What else?",
      "🍱 Got it! What's on your mind now?",
      "🍱 That's neat! What else do you want to chat about?"
    ];
    response = casualResponses[Math.floor(Math.random() * casualResponses.length)];
  }
  
  await message.reply(response);
}

// NEW: Handle AI-powered conversations using Groq
async function handleAIConversation(message, messageContent, client) {
  console.log(`🤖 AI conversation handler called with: "${messageContent}"`);
  
  // Initialize global message tracking to prevent duplicates
  if (!client.lastResponseTime) {
    client.lastResponseTime = new Map();
  }

  // Check if we've already responded to this user recently
  const userId = message.author.id;
  const now = new Date();
  const lastResponse = client.lastResponseTime.get(userId);
  const timeSinceLastResponse = lastResponse ? (now - lastResponse) : 60000; // Default to 60 seconds

  if (timeSinceLastResponse < 3000) { // 3 seconds
    console.log(`🔇 Preventing duplicate response to ${message.author.username} (last response was ${timeSinceLastResponse}ms ago)`);
    return;
  }

  // Update last response time
  client.lastResponseTime.set(userId, now);
  
  // Get user's conversation context
  if (!client.conversationContext.has(message.author.id)) {
    client.conversationContext.set(message.author.id, {
      messages: [],
      lastTaskContext: null,
      userPreferences: {},
      conversationStart: new Date()
    });
  }
  
  const userContext = client.conversationContext.get(message.author.id);
  
  // Add user message to context
  userContext.messages.push({
    role: 'user',
    content: messageContent
  });
  
  // Keep only last 10 messages for context (to avoid token limits)
  if (userContext.messages.length > 10) {
    userContext.messages = userContext.messages.slice(-10);
  }
  
  try {
    const Groq = require('groq-sdk');
    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });
    
    const systemPrompt = `You are Lunchbox, a friendly AI assistant that helps teens organize their tasks and have casual conversations. You're helpful, encouraging, and speak like a supportive friend. Keep responses short and engaging (under 150 characters). Don't mention tasks or productivity unless the user specifically asks. Just be a good conversation partner!`;
    
    const messages = [
      { role: 'system', content: systemPrompt },
      ...userContext.messages
    ];
    
    console.log(`🤖 Sending to Groq with ${messages.length} messages for context (non-task conversation)`);
    
    const completion = await groq.chat.completions.create({
      messages: messages,
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens: 150,  // REDUCED: Shorter responses for teens
    });
    
    const botResponse = completion.choices[0]?.message?.content || "I'm here to chat! What's on your mind?";
    
    // Store bot response in conversation history
    if (client.conversationHistory && client.conversationHistory.has(message.author.id)) {
      const userHistory = client.conversationHistory.get(message.author.id);
      
      // Check for duplicate bot responses
      const lastBotMessage = userHistory.length > 0 ? userHistory[userHistory.length - 1] : null;
      const isDuplicateBotResponse = lastBotMessage && 
                                    lastBotMessage.content === botResponse && 
                                    lastBotMessage.author === 'Lunchbox AI' &&
                                    (new Date() - lastBotMessage.timestamp) < 5000;
      
      if (!isDuplicateBotResponse) {
        userHistory.push({
          timestamp: new Date(),
          author: 'Lunchbox AI',
          content: botResponse,
          type: 'bot'
        });
        
        // Keep only last 50 messages per user
        if (userHistory.length > 50) {
          userHistory.splice(0, userHistory.length - 50);
        }
      }
    }
    
    // Add bot response to context
    userContext.messages.push({
      role: 'assistant',
      content: botResponse
    });
    
    // Keep only last 10 messages for context
    if (userContext.messages.length > 10) {
      userContext.messages = userContext.messages.slice(-10);
    }
    
    await message.reply(botResponse);
    
  } catch (error) {
    console.error('Error with AI conversation:', error);
    
    // If it's a Groq model error, try a different model
    if (error.message && (error.message.includes('model') || error.message.includes('decommissioned'))) {
      console.log('🔄 Groq model error, trying fallback model...');
      try {
        const Groq = require('groq-sdk');
        const groq = new Groq({
          apiKey: process.env.GROQ_API_KEY,
        });
        
        const systemPrompt = `You are Lunchbox, a friendly AI assistant that helps teens organize their tasks and have casual conversations. You're helpful, encouraging, and speak like a supportive friend. Keep responses short and engaging (under 150 characters). Don't mention tasks or productivity unless the user specifically asks. Just be a good conversation partner!`;
        
        const messages = [
          { role: 'system', content: systemPrompt },
          ...userContext.messages
        ];
        
        const completion = await groq.chat.completions.create({
          messages: messages,
          model: "llama-3.3-70b-versatile", // Fallback model
          temperature: 0.7,
          max_tokens: 150,
        });
        
        const botResponse = completion.choices[0]?.message?.content || "I'm here to chat! What's on your mind?";
        
        // Store bot response in conversation history
        if (client.conversationHistory && client.conversationHistory.has(message.author.id)) {
          const userHistory = client.conversationHistory.get(message.author.id);
          userHistory.push({
            timestamp: new Date(),
            author: 'Lunchbox AI',
            content: botResponse,
            type: 'bot'
          });
          
          if (userHistory.length > 50) {
            userHistory.splice(0, userHistory.length - 50);
          }
        }
        
        // Add bot response to context
        userContext.messages.push({
          role: 'assistant',
          content: botResponse
        });
        
        if (userContext.messages.length > 10) {
          userContext.messages = userContext.messages.slice(-10);
        }
        
        await message.reply(botResponse);
        return;
      } catch (fallbackError) {
        console.error('Fallback model also failed:', fallbackError);
        console.log('🔄 Using simple fallback response...');
      }
    }
    
    // Simple fallback response that always works
    const simpleResponses = [
      "Hey there! 👋 How's your day going?",
      "Hi! I'm here to chat and help with your tasks!",
      "Hello! What's on your mind today?",
      "Hey! Ready to tackle some tasks or just chat?",
      "Hi there! How can I help you today?"
    ];
    
    const fallbackResponse = simpleResponses[Math.floor(Math.random() * simpleResponses.length)];
    
    // Store fallback response in conversation history
    if (client.conversationHistory && client.conversationHistory.has(message.author.id)) {
      const userHistory = client.conversationHistory.get(message.author.id);
      
      // Check for duplicate fallback responses
      const lastBotMessage = userHistory.length > 0 ? userHistory[userHistory.length - 1] : null;
      const isDuplicateFallback = lastBotMessage && 
                                 lastBotMessage.content === fallbackResponse && 
                                 lastBotMessage.author === 'Lunchbox AI' &&
                                 (new Date() - lastBotMessage.timestamp) < 5000;
      
      if (!isDuplicateFallback) {
        userHistory.push({
          timestamp: new Date(),
          author: 'Lunchbox AI',
          content: fallbackResponse,
          type: 'bot'
        });
      }
    }
    
    await message.reply(fallbackResponse);
  }
}

// NEW: Process tasks that were redirected from AI conversation handler
async function processTaskFromConversation(message, messageContent, client) {
  console.log(`🎯 Processing redirected task: "${messageContent}"`);
  
  try {
    // Check if taskProcessor is available
    if (!taskProcessor || typeof taskProcessor.cleanTaskText !== 'function') {
      console.error('❌ taskProcessor not available or cleanTaskText is not a function');
      await message.reply('🍱 Sorry, the task processor is not available. Please try using the `/addtask` command instead!');
      return;
    }
    
    // Process the task text to clean it up
    const processedTask = taskProcessor.cleanTaskText(messageContent);
    
    if (!processedTask || !processedTask.cleanText) {
      console.error('❌ Failed to process task text:', processedTask);
      await message.reply('🍱 Sorry, I had trouble understanding that task. Please try being more specific or use the `/addtask` command!');
      return;
    }
    
    const cleanTaskText = processedTask.cleanText;
    const hasDeadline = processedTask.deadline !== null;
    
    console.log(`🧹 Cleaned task text: "${cleanTaskText}"`);
    console.log(`⏰ Has deadline: ${hasDeadline}`);
    if (hasDeadline) {
      console.log(`📅 Deadline: ${processedTask.deadline.fullDate.toLocaleString()}`);
    }
    
    // Create a better task suggestion - use the CLEANED text, not raw message
    let suggestionText = `🍱 That sounds like something for your lunchbox! Would you like me to add **"${cleanTaskText}"** as a task?`;
    
    if (hasDeadline) {
      const deadline = processedTask.deadline;
      suggestionText += `\n\n⏰ **Deadline detected:** ${deadline.fullDate.toLocaleString()}`;
      suggestionText += `\n🔔 **I'll send you reminders at:** 10 min • 5 min • Exact time`;
    }
    
    suggestionText += `\n\n💬 **To start chatting naturally with me, use \`/conversate\`**`;
    
    console.log(`💬 Sending task suggestion: "${suggestionText}"`);
    await message.reply(suggestionText);
    
    // Store the processed task for this user - store the CLEANED text
    if (!client.pendingTasks) client.pendingTasks = new Map();
    client.pendingTasks.set(message.author.id, {
      originalText: messageContent,
      cleanText: cleanTaskText,  // This is the cleaned version
      deadline: processedTask.deadline
    });
    
    console.log(`💾 Stored pending task for user ${message.author.username}:`, JSON.stringify(client.pendingTasks.get(message.author.id), null, 2));
    
    // Also store in conversation context for AI to remember
    if (!client.conversationContext.has(message.author.id)) {
      client.conversationContext.set(message.author.id, {
        messages: [],
        lastTaskContext: null,
        userPreferences: {},
        conversationStart: new Date()
      });
    }
    const userContext = client.conversationContext.get(message.author.id);
    userContext.lastTaskContext = cleanTaskText;
    
    console.log(`🧠 Updated conversation context for user ${message.author.username}`);
    
  } catch (error) {
    console.error('❌ Error processing redirected task:', error);
    console.error('❌ Error stack:', error.stack);
    await message.reply('🍱 Sorry, I had trouble processing that task. Try using the `/addtask` command instead!');
  }
}
