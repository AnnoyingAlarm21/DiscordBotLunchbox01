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
    ),

  async execute(interaction, client) {
    const rawTaskContent = interaction.options.getString('task');
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
      const deadline = processedTask.deadline;
      
      // Use AI to categorize the task
      const category = await categorizeTask(cleanTaskText);
      
      // Create the task object
      const task = {
        id: Date.now(),
        content: cleanTaskText,
        originalContent: rawTaskContent,
        category: category,
        createdAt: new Date(),
        completed: false,
        deadline: deadline
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
      if (deadline) {
        reminderSystem.scheduleReminders(client, userId, task.id, cleanTaskText, deadline.fullDate);
        console.log(`⏰ Scheduled reminders for task: ${cleanTaskText} at ${deadline.fullDate}`);
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
      
      // Add deadline field if present
      if (deadline) {
        embed.addFields({
          name: '⏰ Deadline',
          value: `<t:${Math.floor(deadline.fullDate.getTime() / 1000)}:F>\nReminders set for 10 min, 5 min, and exact time!`,
          inline: false
        });
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
