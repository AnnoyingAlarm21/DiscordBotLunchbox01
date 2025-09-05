// Calendar sync command - import .ics files
const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const calendarSystem = require('../utils/calendarSystem');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('calendarsync')
    .setDescription('Import calendar events from a .ics file')
    .addAttachmentOption(option =>
      option.setName('icsfile')
        .setDescription('The .ics calendar file to import')
        .setRequired(true)
    ),

  async execute(interaction) {
    try {
      const attachment = interaction.options.getAttachment('icsfile');
      
      // Validate file type
      if (!attachment.name.toLowerCase().endsWith('.ics')) {
        await interaction.reply('❌ Please upload a valid .ics calendar file!');
        return;
      }
      
      // Validate file size (max 1MB)
      if (attachment.size > 1024 * 1024) {
        await interaction.reply('❌ File too large! Please upload a .ics file smaller than 1MB.');
        return;
      }
      
      await interaction.deferReply();
      
      // Fetch the file content
      const response = await fetch(attachment.url);
      const icsContent = await response.text();
      
      // Parse the ICS file
      const events = await calendarSystem.parseICSFile(icsContent, interaction.user.id);
      
      if (events.length === 0) {
        await interaction.editReply('❌ No events found in the .ics file. Please check the file format.');
        return;
      }
      
      // Add events to user's calendar
      const addedCount = calendarSystem.addEventsToUser(interaction.user.id, events);
      
      // Schedule reminders for new events
      events.forEach(event => {
        calendarSystem.scheduleEventReminders(interaction.client, interaction.user.id, event);
      });
      
      // Save calendar data
      calendarSystem.saveCalendarData();
      
      await interaction.editReply(
        `✅ **Calendar imported successfully!**\n\n` +
        `📅 **${addedCount} events** added to your calendar\n` +
        `🔔 **Reminders scheduled** for all events\n\n` +
        `Use \`/calendar\` to view your calendar!`
      );
      
    } catch (error) {
      console.error('Error in calendarsync command:', error);
      await interaction.editReply('❌ Sorry, I had trouble importing your calendar file. Please check the file format and try again!');
    }
  }
};
