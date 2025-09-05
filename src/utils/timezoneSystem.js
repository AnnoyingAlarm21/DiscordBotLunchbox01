// Timezone system for calendar events
const timezoneSystem = {
  // Store user timezones
  userTimezones: new Map(),
  
  // Common timezone mappings
  timezoneMappings: {
    'EST': 'America/New_York',
    'EDT': 'America/New_York', 
    'CST': 'America/Chicago',
    'CDT': 'America/Chicago',
    'MST': 'America/Denver',
    'MDT': 'America/Denver',
    'PST': 'America/Los_Angeles',
    'PDT': 'America/Los_Angeles',
    'GMT': 'Europe/London',
    'UTC': 'UTC',
    'CET': 'Europe/Paris',
    'CEST': 'Europe/Paris',
    'JST': 'Asia/Tokyo',
    'IST': 'Asia/Kolkata',
    'AEST': 'Australia/Sydney',
    'AEDT': 'Australia/Sydney'
  },
  
  // Set user timezone
  setUserTimezone(userId, timezone) {
    // Validate timezone
    if (!this.isValidTimezone(timezone)) {
      throw new Error(`Invalid timezone: ${timezone}`);
    }
    
    this.userTimezones.set(userId, timezone);
    console.log(`🌍 Set timezone for user ${userId}: ${timezone}`);
    return true;
  },
  
  // Get user timezone
  getUserTimezone(userId) {
    return this.userTimezones.get(userId) || 'UTC';
  },
  
  // Detect timezone from ICS event
  detectTimezoneFromEvent(event) {
    // Check for timezone info in the event
    if (event.tzid) {
      return event.tzid;
    }
    
    // Check for timezone in start/end dates
    if (event.start && event.start.tz) {
      return event.start.tz;
    }
    
    // Try to detect from timezone abbreviations
    const eventText = `${event.summary || ''} ${event.description || ''}`.toUpperCase();
    for (const [abbrev, timezone] of Object.entries(this.timezoneMappings)) {
      if (eventText.includes(abbrev)) {
        return timezone;
      }
    }
    
    return null;
  },
  
  // Convert date to user's timezone
  convertToUserTimezone(date, userTimezone) {
    try {
      // Create a new date in the user's timezone
      const userDate = new Date(date.toLocaleString("en-US", { timeZone: userTimezone }));
      return userDate;
    } catch (error) {
      console.error('Error converting timezone:', error);
      return date; // Fallback to original date
    }
  },
  
  // Convert date from event timezone to user timezone
  convertEventToUserTimezone(eventDate, eventTimezone, userTimezone) {
    try {
      // If no event timezone, assume it's in user's timezone
      if (!eventTimezone) {
        return eventDate;
      }
      
      // Convert from event timezone to UTC, then to user timezone
      const utcDate = new Date(eventDate.toLocaleString("en-US", { timeZone: eventTimezone }));
      const userDate = new Date(utcDate.toLocaleString("en-US", { timeZone: userTimezone }));
      
      return userDate;
    } catch (error) {
      console.error('Error converting event timezone:', error);
      return eventDate; // Fallback to original date
    }
  },
  
  // Validate timezone
  isValidTimezone(timezone) {
    try {
      // Test if timezone is valid by trying to create a date
      new Date().toLocaleString("en-US", { timeZone: timezone });
      return true;
    } catch (error) {
      return false;
    }
  },
  
  // Get timezone offset string
  getTimezoneOffset(timezone) {
    try {
      const now = new Date();
      const utc = new Date(now.getTime() + (now.getTimezoneOffset() * 60000));
      const local = new Date(utc.toLocaleString("en-US", { timeZone: timezone }));
      const offset = (local.getTime() - utc.getTime()) / (1000 * 60 * 60);
      
      const sign = offset >= 0 ? '+' : '-';
      const hours = Math.abs(Math.floor(offset));
      const minutes = Math.abs((offset % 1) * 60);
      
      return `UTC${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    } catch (error) {
      return 'UTC+0:00';
    }
  },
  
  // Get common timezones for selection
  getCommonTimezones() {
    return [
      { name: 'Eastern Time (EST/EDT)', value: 'America/New_York' },
      { name: 'Central Time (CST/CDT)', value: 'America/Chicago' },
      { name: 'Mountain Time (MST/MDT)', value: 'America/Denver' },
      { name: 'Pacific Time (PST/PDT)', value: 'America/Los_Angeles' },
      { name: 'Greenwich Mean Time (GMT)', value: 'Europe/London' },
      { name: 'Central European Time (CET/CEST)', value: 'Europe/Paris' },
      { name: 'Japan Standard Time (JST)', value: 'Asia/Tokyo' },
      { name: 'India Standard Time (IST)', value: 'Asia/Kolkata' },
      { name: 'Australian Eastern Time (AEST/AEDT)', value: 'Australia/Sydney' },
      { name: 'UTC (Coordinated Universal Time)', value: 'UTC' }
    ];
  },
  
  // Save timezone data to file
  saveTimezoneData() {
    try {
      const fs = require('fs');
      const path = require('path');
      
      const dataDir = path.join(__dirname, '..', '..', 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      
      const timezoneData = {};
      for (const [userId, timezone] of this.userTimezones) {
        timezoneData[userId] = timezone;
      }
      
      fs.writeFileSync(
        path.join(dataDir, 'timezones.json'),
        JSON.stringify(timezoneData, null, 2)
      );
      
      console.log(`💾 Timezone data saved successfully`);
    } catch (error) {
      console.error('❌ Error saving timezone data:', error);
    }
  },
  
  // Load timezone data from file
  loadTimezoneData() {
    try {
      const fs = require('fs');
      const path = require('path');
      
      const dataDir = path.join(__dirname, '..', '..', 'data');
      const timezoneFile = path.join(dataDir, 'timezones.json');
      
      if (fs.existsSync(timezoneFile)) {
        const timezoneData = JSON.parse(fs.readFileSync(timezoneFile, 'utf8'));
        
        for (const [userId, timezone] of Object.entries(timezoneData)) {
          this.userTimezones.set(userId, timezone);
        }
        
        console.log(`📁 Loaded timezone data for ${Object.keys(timezoneData).length} users`);
      }
    } catch (error) {
      console.error('❌ Error loading timezone data:', error);
    }
  }
};

module.exports = timezoneSystem;
