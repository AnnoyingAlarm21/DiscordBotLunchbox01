const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Groq = require('groq-sdk');
const taskProcessor = require('../utils/taskProcessor');
const reminderSystem = require('../utils/reminderSystem');

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Task categories with emojis and descriptions
const TASK_CATEGORIES = {
  '🍪 Sweets': {
    description: 'Things you want to do - fun and enjoyable tasks',
    color: 0xFFB6C1
  },
  '🥦 Vegetables': {
    description: 'Things you need to do - important and necessary tasks',
    color: 0x90EE90
  },
  '🥪 Savory': {
    description: 'Neutral but useful tasks - practical and productive',
    color: 0xDDA0DD
  },
  '🧃 Sides': {
    description: 'Extra fillers or downtime activities - light and easy',
    color: 0xFFD700
  }
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('addtask')
    .setDescription('Add a new task to your lunchbox')
    .addStringOption(option =>
      option.setName('task')
        .setDescription('What task do you want to add?')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('date')
        .setDescription('When is this task due?')
        .setRequired(false)
        .addChoices(
          { name: 'Today', value: 'today' },
          { name: 'Tomorrow', value: 'tomorrow' },
          { name: 'This Week', value: 'this_week' },
          { name: 'Next Week', value: 'next_week' },
          { name: 'This Month', value: 'this_month' },
          { name: 'Next Month', value: 'next_month' }
        )
    )
    .addStringOption(option =>
      option.setName('time')
        .setDescription('What time is this task due?')
        .setRequired(false)
        .addChoices(
          { name: 'Morning (9 AM)', value: '9:00 AM' },
          { name: 'Noon (12 PM)', value: '12:00 PM' },
          { name: 'Afternoon (3 PM)', value: '3:00 PM' },
          { name: 'Evening (6 PM)', value: '6:00 PM' },
          { name: 'Night (9 PM)', value: '9:00 PM' }
        )
    )
    .addStringOption(option =>
      option.setName('priority')
        .setDescription('How important is this task?')
        .setRequired(false)
        .addChoices(
          { name: '🟢 Low', value: 'low' },
          { name: '🟡 Medium', value: 'medium' },
          { name: '🟠 High', value: 'high' },
          { name: '🔴 Urgent', value: 'defcon0' }
        )
    ),

  async execute(interaction, client) {
    const rawTaskContent = interaction.options.getString('task');
    const scheduledDate = interaction.options.getString('date');
    const scheduledTime = interaction.options.getString('time');
    const priority = interaction.options.getString('priority');
    
    // Use custom time if time is set to "custom"
    const finalTimeOption = (scheduledTime === 'custom' && customTime) ? customTime : scheduledTime;
    
    const userId = interaction.user.id;
    
    // Initialize user's task storage if it doesn't exist
    if (!client.userTasks.has(userId)) {
      client.userTasks.set(userId, {
        tasks: [],
        lastUpdated: new Date()
      });
    }
    
    try {
      // Process and clean the task text
      const processedTask = taskProcessor.cleanTaskText(rawTaskContent);
      const cleanTaskText = processedTask.cleanText;
      
      // Handle scheduled date and time
      let finalDeadline = processedTask.deadline;
      
      if (scheduledDate && scheduledDate !== 'custom') {
        const calculatedDate = this.calculateScheduledDate(scheduledDate);
        if (calculatedDate) {
          finalDeadline = {
            date: calculatedDate,
            time: null,
            fullDate: calculatedDate
          };
          
          // If time is provided, add it to the date
          if (finalTimeOption) {
            const timeInfo = this.parseTimeString(finalTimeOption);
            if (timeInfo) {
              finalDeadline.time = timeInfo;
              finalDeadline.fullDate = new Date(
                calculatedDate.getFullYear(),
                calculatedDate.getMonth(),
                calculatedDate.getDate(),
                timeInfo.hour,
                timeInfo.minute
              );
            }
          }
        }
              } else if (finalTimeOption && !finalDeadline) {
          // Only time provided, use today's date
          const timeInfo = this.parseTimeString(finalTimeOption);
        if (timeInfo) {
          const today = new Date();
          finalDeadline = {
            date: today,
            time: timeInfo,
            fullDate: new Date(
              today.getFullYear(),
              today.getMonth(),
              today.getDate(),
              timeInfo.hour,
              timeInfo.minute
            )
          };
        }
      }
      
      // Try AI categorization first, fallback to keyword-based if it fails
      let category;
      try {
        console.log(`🤖 Attempting AI categorization for: "${cleanTaskText}"`);
        category = await categorizeTask(cleanTaskText);
        console.log(`✅ AI categorized task as: ${category}`);
      } catch (aiError) {
        console.error('❌ AI categorization failed, using fallback:', aiError);
        category = fallbackCategorization(cleanTaskText);
        console.log(`🔄 Fallback categorized task as: ${category}`);
      }
      
      // Validate category was assigned
      if (!category) {
        console.error('❌ No category assigned, using default');
        category = '🥪 Savory'; // Default fallback
      }
      
      // Ensure category is valid
      if (!TASK_CATEGORIES[category]) {
        console.error(`❌ Invalid category "${category}", using default`);
        category = '🥪 Savory';
      }
      
      console.log(`🎯 Final category for task: ${category}`);
      
      // Create the task object with new fields
      const task = {
        id: Date.now(),
        content: cleanTaskText,
        originalContent: rawTaskContent,
        category: category,
        createdAt: new Date(),
        completed: false,
        deadline: finalDeadline,
        priority: priority || 'medium',
        scheduledDate: scheduledDate,
        scheduledTime: finalTimeOption
      };
      
      // Add task to user's lunchbox
      const userData = client.userTasks.get(userId);
      userData.tasks.push(task);
      userData.lastUpdated = new Date();
      
      // Debug: Log what was saved
      console.log(`💾 Task saved for user ${userId}:`, JSON.stringify(task, null, 2));
      console.log(`💾 User now has ${userData.tasks.length} tasks total`);
      console.log(`💾 All user tasks:`, JSON.stringify(userData.tasks, null, 2));
      
      // Schedule reminders if there's a deadline
      if (finalDeadline) {
        reminderSystem.scheduleReminders(client, userId, task.id, cleanTaskText, finalDeadline.fullDate);
        console.log(`⏰ Scheduled reminders for task: ${cleanTaskText} at ${finalDeadline.fullDate}`);
      }
      
      // Create a beautiful embed response
      const embed = new EmbedBuilder()
        .setColor(TASK_CATEGORIES[category].color)
        .setTitle('🍱 Task Added to Your Lunchbox!')
        .setDescription(`**${cleanTaskText}**`)
        .addFields(
          { name: '📂 Category', value: `${category}\n${TASK_CATEGORIES[category].description}`, inline: true },
          { name: '⏰ Added', value: `<t:${Math.floor(task.createdAt.getTime() / 1000)}:R>`, inline: true },
          { name: '📊 Total Tasks', value: `${userData.tasks.length}`, inline: true }
        )
        .setFooter({ text: 'Your lunchbox is getting organized! 🥪' })
        .setTimestamp();
      
      // Add priority field
      const priorityEmojis = {
        'low': '🟢 Low',
        'medium': '🟡 Medium', 
        'high': '🟠 High',
        'defcon0': '🔴 DEFCON 0'
      };
      
      embed.addFields({
        name: '🎯 Priority',
        value: priorityEmojis[task.priority] || '🟡 Medium',
        inline: true
      });
      
      // Add deadline field if present
      if (finalDeadline) {
        embed.addFields({
          name: '⏰ Deadline',
          value: `<t:${Math.floor(finalDeadline.fullDate.getTime() / 1000)}:F>\nReminders set for 10 min, 5 min, and exact time!`,
          inline: false
        });
      }
      
      // Add scheduling info if provided
              if (scheduledDate || finalTimeOption) {
        let schedulingInfo = '';
        if (scheduledDate && scheduledDate !== 'custom') {
          schedulingInfo += `📅 **Date:** ${scheduledDate.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}\n`;
        }
        if (finalTimeOption) {
          schedulingInfo += `🕐 **Time:** ${finalTimeOption}`;
        }
        
        if (schedulingInfo) {
          embed.addFields({
            name: '📋 Scheduling',
            value: schedulingInfo,
            inline: false
          });
        }
      }
      
      await interaction.reply({ embeds: [embed] });
      
    } catch (error) {
      console.error('Error adding task:', error);
      
      // Provide more specific error messages
      let errorMessage = '🍱 Sorry, I had trouble processing your task. ';
      
      if (error.message.includes('GROQ_API_KEY')) {
        errorMessage += 'AI categorization is unavailable, but I can still categorize using keywords. Please try again!';
      } else if (error.message.includes('categorization')) {
        errorMessage += 'Task categorization failed, but I can still add your task. Please try again!';
      } else {
        errorMessage += 'Please try again or use a different task description.';
      }
      
      await interaction.reply({
        content: errorMessage,
        ephemeral: true
      });
    }
  },

  // Helper function to calculate scheduled dates
  calculateScheduledDate(dateOption) {
    const now = new Date();
    
    switch (dateOption) {
      case 'today':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
      case 'tomorrow':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      case 'after_tomorrow':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2);
      case 'this_week':
        const daysUntilFriday = (5 - now.getDay() + 7) % 7;
        return new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntilFriday);
      case 'next_week':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7);
      case 'this_month':
        return new Date(now.getFullYear(), now.getMonth() + 1, 0); // Last day of current month
      case 'next_month':
        return new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
      default:
        return null;
    }
  },

  // Parse time string into hour and minute
  parseTimeString(timeString) {
    if (!timeString) return null;
    
    // Handle preset time format (e.g., "5:00 PM", "12:00 AM")
    const presetTimeMatch = timeString.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (presetTimeMatch) {
      let hour = parseInt(presetTimeMatch[1]);
      const minute = parseInt(presetTimeMatch[2]);
      const period = presetTimeMatch[3].toUpperCase();
      
      // Convert 12-hour to 24-hour format
      if (period === 'PM' && hour !== 12) {
        hour += 12;
      } else if (period === 'AM' && hour === 12) {
        hour = 0;
      }
      
      return { hour, minute };
    }
    
    // Handle legacy formats (e.g., "3pm", "15:30")
    const timeMatch = timeString.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
    if (timeMatch) {
      let hour = parseInt(timeMatch[1]);
      const minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
      const period = timeMatch[3] ? timeMatch[3].toUpperCase() : null;
      
      // Convert 12-hour to 24-hour format
      if (period === 'PM' && hour !== 12) {
        hour += 12;
      } else if (period === 'AM' && hour === 12) {
        hour = 0;
      }
      
      return { hour, minute };
    }
    
    return null;
  }
};

// AI-powered task categorization
async function categorizeTask(taskContent) {
  try {
    // Check if Groq API key is available
    if (!process.env.GROQ_API_KEY) {
      console.log('⚠️ No GROQ_API_KEY found, using fallback categorization');
      throw new Error('No GROQ_API_KEY available');
    }
    
    const prompt = `Categorize this task into one of these food categories:

🍪 Sweets: Things you want to do - fun and enjoyable tasks
🥦 Vegetables: Things you need to do - important and necessary tasks  
🥪 Savory: Neutral but useful tasks - practical and productive
🧃 Sides: Extra fillers or downtime activities - light and easy

Task: "${taskContent}"

Respond with ONLY the category name (e.g., "🍪 Sweets" or "🥦 Vegetables").`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
              model: "gpt-4o-mini",
      max_tokens: 10,
      temperature: 0.3
    });

    const response = completion.choices[0]?.message?.content?.trim();
    
    // Validate the response is a valid category
    if (TASK_CATEGORIES[response]) {
      return response;
    }
    
    console.log(`⚠️ AI returned invalid category: "${response}", using fallback`);
    // Fallback to keyword-based categorization
    return fallbackCategorization(taskContent);
    
  } catch (error) {
    console.error('Groq API error:', error);
    // Fallback to keyword-based categorization
    return fallbackCategorization(taskContent);
  }
}

// Fallback categorization when AI is unavailable
function fallbackCategorization(taskContent) {
  if (!taskContent || typeof taskContent !== 'string') {
    console.log('⚠️ Invalid task content, using default category');
    return '🥪 Savory';
  }
  
  const lowerTask = taskContent.toLowerCase().trim();
  
  // Keywords for each category
  const sweets = ['fun', 'enjoy', 'play', 'game', 'hobby', 'creative', 'art', 'music', 'watch', 'read', 'entertainment', 'leisure', 'relax', 'party', 'celebration', 'vacation', 'travel'];
  const vegetables = ['need', 'must', 'important', 'urgent', 'deadline', 'work', 'study', 'homework', 'project', 'meeting', 'appointment', 'doctor', 'medical', 'call', 'email', 'submit', 'due', 'exam', 'test', 'assignment', 'report', 'presentation'];
  const savory = ['clean', 'organize', 'plan', 'schedule', 'exercise', 'cook', 'shop', 'errand', 'maintenance', 'repair', 'buy', 'purchase', 'arrange', 'setup', 'laundry', 'dishes', 'grocery', 'bank', 'post office', 'dmv'];
  const sides = ['relax', 'rest', 'break', 'social', 'chat', 'browse', 'check', 'quick', 'simple', 'casual', 'optional', 'extra', 'coffee', 'lunch', 'dinner', 'call friend', 'text', 'message'];
  
  // Check for specific keywords first
  if (vegetables.some(keyword => lowerTask.includes(keyword))) {
    console.log(`🥦 Keyword match found for Vegetables: "${lowerTask}"`);
    return '🥦 Vegetables';
  }
  if (savory.some(keyword => lowerTask.includes(keyword))) {
    console.log(`🥪 Keyword match found for Savory: "${lowerTask}"`);
    return '🥪 Savory';
  }
  if (sweets.some(keyword => lowerTask.includes(keyword))) {
    console.log(`🍪 Keyword match found for Sweets: "${lowerTask}"`);
    return '🍪 Sweets';
  }
  if (sides.some(keyword => lowerTask.includes(keyword))) {
    console.log(`🧃 Keyword match found for Sides: "${lowerTask}"`);
    return '🧃 Sides';
  }
  
  // Handle vague descriptions like "something", "task", "thing", etc.
  const vagueWords = ['something', 'thing', 'task', 'item', 'stuff', 'work', 'job', 'activity', 'todo', 'to do', 'to-do'];
  if (vagueWords.some(word => lowerTask.includes(word))) {
    console.log(`🥪 Vague task detected: "${lowerTask}", defaulting to Savory`);
    // Default vague tasks to Savory (neutral but useful)
    return '🥪 Savory';
  }
  
  // If no keywords match, use Savory as default (neutral category)
  console.log(`🥪 No keyword matches found for: "${lowerTask}", defaulting to Savory`);
  return '🥪 Savory';
}
