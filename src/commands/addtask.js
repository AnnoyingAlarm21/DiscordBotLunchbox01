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
          { name: 'After Tomorrow', value: 'after_tomorrow' },
          { name: 'This Week', value: 'this_week' },
          { name: 'Next Week', value: 'next_week' },
          { name: 'This Month', value: 'this_month' },
          { name: 'Next Month', value: 'next_month' },
          { name: 'Custom Date', value: 'custom' }
        )
    )
    .addStringOption(option =>
      option.setName('time')
        .setDescription('What time is this task due? (e.g., 3pm, 15:30)')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('priority')
        .setDescription('How important is this task?')
        .setRequired(false)
        .addChoices(
          { name: '🟢 Low', value: 'low' },
          { name: '🟡 Medium', value: 'medium' },
          { name: '🟠 High', value: 'high' },
          { name: '🔴 DEFCON 0', value: 'defcon0' }
        )
    ),

  async execute(interaction, client) {
    const rawTaskContent = interaction.options.getString('task');
    const scheduledDate = interaction.options.getString('date');
    const scheduledTime = interaction.options.getString('time');
    const priority = interaction.options.getString('priority');
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
          if (scheduledTime) {
            const timeInfo = this.parseTimeString(scheduledTime);
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
      } else if (scheduledTime && !finalDeadline) {
        // Only time provided, use today's date
        const timeInfo = this.parseTimeString(scheduledTime);
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
      
      // Use AI to categorize the task
      const category = await categorizeTask(cleanTaskText);
      
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
        scheduledTime: scheduledTime
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
      if (scheduledDate || scheduledTime) {
        let schedulingInfo = '';
        if (scheduledDate && scheduledDate !== 'custom') {
          schedulingInfo += `📅 **Date:** ${scheduledDate.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}\n`;
        }
        if (scheduledTime) {
          schedulingInfo += `🕐 **Time:** ${scheduledTime}`;
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
      await interaction.reply({
        content: '🍱 Sorry, I had trouble categorizing your task. Please try again!',
        ephemeral: true
      });
    }
  }
};

// Helper function to calculate scheduled dates
function calculateScheduledDate(dateOption) {
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
}

// Helper function to parse time strings
function parseTimeString(timeString) {
  // Handle 12-hour format (3pm, 3:30pm, 3:30 PM)
  const time12Hour = timeString.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)/i);
  if (time12Hour) {
    const hour = parseInt(time12Hour[1]);
    const minute = time12Hour[2] ? parseInt(time12Hour[2]) : 0;
    const period = time12Hour[3].toLowerCase();
    
    let hour24 = hour;
    if (period === 'pm' && hour !== 12) hour24 += 12;
    if (period === 'am' && hour === 12) hour24 = 0;
    
    return { hour: hour24, minute };
  }
  
  // Handle 24-hour format (15:30, 15.30, 1530)
  const time24Hour = timeString.match(/(\d{1,2})[:.]?(\d{2})/);
  if (time24Hour) {
    const hour = parseInt(time24Hour[1]);
    const minute = parseInt(time24Hour[2]);
    
    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      return { hour, minute };
    }
  }
  
  return null;
}

// AI-powered task categorization
async function categorizeTask(taskContent) {
  try {
    const prompt = `Categorize this task into one of these food categories:

🍪 Sweets: Things you want to do - fun and enjoyable tasks
🥦 Vegetables: Things you need to do - important and necessary tasks  
🥪 Savory: Neutral but useful tasks - practical and productive
🧃 Sides: Extra fillers or downtime activities - light and easy

Task: "${taskContent}"

Respond with ONLY the category name (e.g., "🍪 Sweets" or "🥦 Vegetables").`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama3-8b-8192",
      max_tokens: 10,
      temperature: 0.3
    });

    const response = completion.choices[0].message.content.trim();
    
    // Validate the response is a valid category
    if (TASK_CATEGORIES[response]) {
      return response;
    }
    
    // Fallback categorization based on keywords
    return fallbackCategorization(taskContent);
    
  } catch (error) {
    console.error('Groq API error:', error);
    // Fallback to keyword-based categorization
    return fallbackCategorization(taskContent);
  }
}

// Fallback categorization when AI is unavailable
function fallbackCategorization(taskContent) {
  const lowerTask = taskContent.toLowerCase();
  
  // Keywords for each category
  const sweets = ['fun', 'enjoy', 'play', 'game', 'hobby', 'creative', 'art', 'music', 'watch', 'read'];
  const vegetables = ['need', 'must', 'important', 'urgent', 'deadline', 'work', 'study', 'homework', 'project', 'meeting'];
  const savory = ['clean', 'organize', 'plan', 'schedule', 'exercise', 'cook', 'shop', 'errand', 'maintenance'];
  const sides = ['relax', 'rest', 'break', 'social', 'chat', 'browse', 'check', 'quick', 'simple'];
  
  if (sweets.some(keyword => lowerTask.includes(keyword))) return '🍪 Sweets';
  if (vegetables.some(keyword => lowerTask.includes(keyword))) return '🥦 Vegetables';
  if (savory.some(keyword => lowerTask.includes(keyword))) return '🥪 Savory';
  if (sides.some(keyword => lowerTask.includes(keyword))) return '🧃 Sides';
  
  // Default to savory if no clear match
  return '🥪 Savory';
}
