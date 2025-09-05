// Add event command - manually add calendar events
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const calendarSystem = require('../utils/calendarSystem');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('addevent')
    .setDescription('Add a new event to your calendar')
    .addStringOption(option =>
      option.setName('title')
        .setDescription('Event title')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('date')
        .setDescription('Event date (e.g., "2025-09-15" or "tomorrow")')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('time')
        .setDescription('Event time (e.g., "3:00 PM" or "15:00")')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('location')
        .setDescription('Event location')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('description')
        .setDescription('Event description')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('category')
        .setDescription('Event category')
        .setRequired(false)
        .addChoices(
          { name: '🎓 School', value: 'School' },
          { name: '💼 Work', value: 'Work' },
          { name: '🏥 Medical', value: 'Medical' },
          { name: '🎉 Social', value: 'Social' },
          { name: '🏃‍♂️ Fitness', value: 'Fitness' },
          { name: '🎨 Hobby', value: 'Hobby' },
          { name: '📅 General', value: 'General' }
        )
    ),

  async execute(interaction) {
    try {
      const title = interaction.options.getString('title');
      const dateStr = interaction.options.getString('date');
      const timeStr = interaction.options.getString('time');
      const location = interaction.options.getString('location') || '';
      const description = interaction.options.getString('description') || '';
      const category = interaction.options.getString('category') || 'General';
      
      // Parse date
      let startDate;
      const now = new Date();
      
      // Handle relative dates
      if (dateStr.toLowerCase().includes('today')) {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (dateStr.toLowerCase().includes('tomorrow')) {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      } else if (dateStr.toLowerCase().includes('next week')) {
        startDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      } else {
        // Try to parse as ISO date or other formats
        startDate = new Date(dateStr);
        if (isNaN(startDate.getTime())) {
          await interaction.reply('❌ Invalid date format! Please use formats like "2025-09-15", "tomorrow", or "next week".');
          return;
        }
      }
      
      // Parse time if provided
      if (timeStr) {
        const timeMatch = timeStr.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
        if (timeMatch) {
          let hour = parseInt(timeMatch[1]);
          const minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
          const period = timeMatch[3] ? timeMatch[3].toLowerCase() : '';
          
          // Convert to 24-hour format
          if (period === 'pm' && hour !== 12) hour += 12;
          if (period === 'am' && hour === 12) hour = 0;
          
          startDate.setHours(hour, minute, 0, 0);
        } else {
          await interaction.reply('❌ Invalid time format! Please use formats like "3:00 PM" or "15:00".');
          return;
        }
      } else {
        // Default to all-day event
        startDate.setHours(0, 0, 0, 0);
      }
      
      // Create end date (1 hour after start, or end of day for all-day events)
      const endDate = new Date(startDate);
      if (timeStr) {
        endDate.setHours(endDate.getHours() + 1);
      } else {
        endDate.setHours(23, 59, 59, 999);
      }
      
      // Create event
      const event = calendarSystem.createEvent({
        title: title,
        description: description,
        startDate: startDate,
        endDate: endDate,
        location: location,
        allDay: !timeStr,
        category: category,
        userId: interaction.user.id,
        source: 'manual'
      });
      
      // Add to user's calendar
      calendarSystem.addEventsToUser(interaction.user.id, [event]);
      
      // Schedule reminders
      calendarSystem.scheduleEventReminders(interaction.client, interaction.user.id, event);
      
      // Save calendar data
      calendarSystem.saveCalendarData();
      
      // Create confirmation embed
      const embed = new EmbedBuilder()
        .setTitle('✅ Event Added Successfully!')
        .setDescription(`**${event.title}**`)
        .addFields(
          { name: '📅 Date', value: event.startDate.toLocaleDateString(), inline: true },
          { name: '⏰ Time', value: event.allDay ? 'All Day' : event.startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }), inline: true },
          { name: '🏷️ Category', value: event.category, inline: true }
        )
        .setColor(0x00ff00);
      
      if (location) {
        embed.addFields({ name: '📍 Location', value: location, inline: true });
      }
      
      if (description) {
        embed.addFields({ name: '📝 Description', value: description, inline: false });
      }
      
      embed.addFields({ name: '🔔 Reminders', value: '10 min • 5 min • Exact time', inline: false });
      
      await interaction.reply({ embeds: [embed] });
      
    } catch (error) {
      console.error('Error in addevent command:', error);
      await interaction.reply('❌ Sorry, I had trouble adding your event. Please check your input and try again!');
    }
  }
};
