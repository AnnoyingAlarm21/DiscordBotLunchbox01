// Calendar system for Discord bot
const ical = require('node-ical');
const fs = require('fs');
const path = require('path');
const timezoneSystem = require('./timezoneSystem');

const calendarSystem = {
  // Store user calendars
  userCalendars: new Map(),
  
  // Calendar event structure
  createEvent(eventData) {
    return {
      id: eventData.id || `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: eventData.title,
      description: eventData.description || '',
      startDate: new Date(eventData.startDate),
      endDate: new Date(eventData.endDate),
      location: eventData.location || '',
      allDay: eventData.allDay || false,
      reminderMinutes: eventData.reminderMinutes || [10, 5, 0], // 10min, 5min, exact time
      category: eventData.category || 'General',
      source: eventData.source || 'manual', // 'manual', 'ics', 'discord'
      createdAt: new Date(),
      userId: eventData.userId
    };
  },
  
  // Parse ICS file content
  async parseICSFile(icsContent, userId) {
    try {
      console.log(`📅 Parsing ICS file for user ${userId}`);
      
      // Parse the ICS content
      const parsed = ical.parseICS(icsContent);
      const events = [];
      
      for (const key in parsed) {
        const event = parsed[key];
        
        if (event.type === 'VEVENT') {
          const eventStartDate = new Date(event.start);
          const now = new Date();
          
          // Only include future events (skip past events)
          if (eventStartDate >= now) {
            const calendarEvent = this.createEvent({
              id: event.uid,
              title: event.summary || 'Untitled Event',
              description: event.description || '',
              startDate: event.start,
              endDate: event.end,
              location: event.location || '',
              allDay: event.start.getHours() === 0 && event.start.getMinutes() === 0 && 
                      event.end.getHours() === 0 && event.end.getMinutes() === 0,
              userId: userId,
              source: 'ics'
            });
            
            events.push(calendarEvent);
            console.log(`📅 Parsed future event: ${calendarEvent.title} on ${calendarEvent.startDate.toLocaleDateString()}`);
          } else {
            console.log(`⏰ Skipped past event: ${event.summary || 'Untitled Event'} on ${eventStartDate.toLocaleDateString()}`);
          }
        }
      }
      
      console.log(`📅 Successfully parsed ${events.length} events from ICS file`);
      return events;
      
    } catch (error) {
      console.error('❌ Error parsing ICS file:', error);
      throw new Error('Failed to parse ICS file. Please check the file format.');
    }
  },
  
  // Add events to user's calendar
  addEventsToUser(userId, events) {
    if (!this.userCalendars.has(userId)) {
      this.userCalendars.set(userId, []);
    }
    
    const userCalendar = this.userCalendars.get(userId);
    
    // Add new events (avoid duplicates)
    events.forEach(newEvent => {
      const exists = userCalendar.some(existingEvent => 
        existingEvent.id === newEvent.id || 
        (existingEvent.title === newEvent.title && 
         existingEvent.startDate.getTime() === newEvent.startDate.getTime())
      );
      
      if (!exists) {
        userCalendar.push(newEvent);
        console.log(`📅 Added event "${newEvent.title}" to user ${userId}'s calendar`);
      }
    });
    
    // Sort events by start date
    userCalendar.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
    
    return userCalendar.length;
  },
  
  // Get user's calendar events
  getUserCalendar(userId, options = {}) {
    const userCalendar = this.userCalendars.get(userId) || [];
    
    let filteredEvents = [...userCalendar];
    
    // Filter by date range
    if (options.startDate) {
      filteredEvents = filteredEvents.filter(event => 
        event.startDate >= new Date(options.startDate)
      );
    }
    
    if (options.endDate) {
      filteredEvents = filteredEvents.filter(event => 
        event.startDate <= new Date(options.endDate)
      );
    }
    
    // Filter by category
    if (options.category) {
      filteredEvents = filteredEvents.filter(event => 
        event.category.toLowerCase() === options.category.toLowerCase()
      );
    }
    
    // Limit results
    if (options.limit) {
      filteredEvents = filteredEvents.slice(0, options.limit);
    }
    
    return filteredEvents;
  },
  
  // Get events for a specific month
  getMonthEvents(userId, year, month) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    
    return this.getUserCalendar(userId, {
      startDate: startDate,
      endDate: endDate
    });
  },
  
  // Create Discord calendar embed
  createCalendarEmbed(userId, year, month) {
    const events = this.getMonthEvents(userId, year, month);
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    const monthName = monthNames[month - 1];
    const firstDay = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    
    // Get user timezone
    const userTimezone = timezoneSystem.getUserTimezone(userId);
    const timezoneOffset = timezoneSystem.getTimezoneOffset(userTimezone);
    
    // Create calendar grid
    let calendarGrid = `\`\`\`\n`;
    calendarGrid += `${monthName} ${year}\n`;
    calendarGrid += `Su Mo Tu We Th Fr Sa\n`;
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      calendarGrid += `   `;
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dayStr = day.toString().padStart(2, ' ');
      
      // Check if there are events on this day
      const dayEvents = events.filter(event => 
        event.startDate.getDate() === day
      );
      
      if (dayEvents.length > 0) {
        calendarGrid += `[${dayStr}]`; // Mark days with events
      } else {
        calendarGrid += ` ${dayStr} `;
      }
      
      // Add newline for Saturday
      if ((firstDay + day - 1) % 7 === 6) {
        calendarGrid += `\n`;
      }
    }
    
    calendarGrid += `\`\`\``;
    
    // Create events list
    let eventsList = '';
    if (events.length > 0) {
      eventsList = `\n**📅 Events this month:**\n`;
      events.forEach(event => {
        const timeStr = event.allDay ? 'All Day' : 
          event.startDate.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
          });
        
        eventsList += `• **${event.title}** - ${event.startDate.toLocaleDateString()} at ${timeStr}\n`;
        if (event.location) {
          eventsList += `  📍 ${event.location}\n`;
        }
      });
    } else {
      eventsList = `\n**📅 No events scheduled this month.**`;
    }
    
    return {
      title: `📅 ${monthName} ${year} Calendar`,
      description: calendarGrid + eventsList,
      color: 0x00ff00, // Green color
      footer: {
        text: `Timezone: ${userTimezone} (${timezoneOffset}) • Use /addevent to add events • Use /calendarsyncsetup for auto-sync`
      }
    };
  },
  
  // Schedule reminders for calendar events
  scheduleEventReminders(client, userId, event) {
    if (!event.reminderMinutes || event.reminderMinutes.length === 0) {
      return;
    }
    
    const now = new Date();
    const eventTime = event.startDate.getTime();
    
    // Don't schedule reminders for events that already happened
    if (eventTime < now.getTime()) {
      console.log(`⏰ Skipping reminders for past event: "${event.title}" (${event.startDate.toLocaleString()})`);
      return;
    }
    
    event.reminderMinutes.forEach(minutes => {
      const reminderTime = eventTime - (minutes * 60 * 1000);
      const delay = reminderTime - now.getTime();
      
      if (delay > 0) {
        setTimeout(async () => {
          try {
            const user = await client.users.fetch(userId);
            if (!user) return;
            
            let message;
            if (minutes === 0) {
              message = `🚨 **EVENT STARTING NOW!** 🚨\n\n**${event.title}**\n`;
              if (event.location) message += `📍 ${event.location}\n`;
              if (event.description) message += `📝 ${event.description}\n`;
              message += `\nTime to go! 🏃‍♂️`;
            } else {
              message = `⏰ **Event Reminder: ${minutes} minutes until ${event.title}**\n`;
              if (event.location) message += `📍 ${event.location}\n`;
              message += `\nBetter get ready! 🏃‍♂️`;
            }
            
            await user.send(message);
            console.log(`✅ Sent ${minutes}min reminder for event "${event.title}" to user ${userId}`);
            
          } catch (error) {
            console.error(`❌ Failed to send event reminder:`, error);
          }
        }, delay);
        
        console.log(`⏰ Scheduled ${minutes}min reminder for event "${event.title}"`);
      }
    });
  },
  
  // Save calendar data to file
  saveCalendarData() {
    try {
      const dataDir = path.join(__dirname, '..', '..', 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      
      const calendarData = {};
      for (const [userId, events] of this.userCalendars) {
        calendarData[userId] = events;
      }
      
      fs.writeFileSync(
        path.join(dataDir, 'calendars.json'),
        JSON.stringify(calendarData, null, 2)
      );
      
      console.log(`💾 Calendar data saved successfully`);
    } catch (error) {
      console.error('❌ Error saving calendar data:', error);
    }
  },
  
  // Load calendar data from file
  loadCalendarData() {
    try {
      const dataDir = path.join(__dirname, '..', '..', 'data');
      const calendarFile = path.join(dataDir, 'calendars.json');
      
      if (fs.existsSync(calendarFile)) {
        const calendarData = JSON.parse(fs.readFileSync(calendarFile, 'utf8'));
        
        for (const [userId, events] of Object.entries(calendarData)) {
          // Convert date strings back to Date objects
          const convertedEvents = events.map(event => ({
            ...event,
            startDate: new Date(event.startDate),
            endDate: new Date(event.endDate),
            createdAt: new Date(event.createdAt)
          }));
          
          this.userCalendars.set(userId, convertedEvents);
        }
        
        console.log(`📁 Loaded calendar data for ${Object.keys(calendarData).length} users`);
      }
    } catch (error) {
      console.error('❌ Error loading calendar data:', error);
    }
  }
};

module.exports = calendarSystem;
