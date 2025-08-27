// Task processing utilities
const taskProcessor = {
  // Clean up task text: fix spelling, capitalization, extract core task
  cleanTaskText(rawText) {
    // Remove common filler words and phrases
    const fillerPhrases = [
      'i have a', 'i need to', 'i want to', 'i should', 'i must',
      'can you', 'please', 'remind me', 'set a reminder',
      'deadline', 'due date', 'due time', 'at', 'pm', 'am',
      'i have something due', 'i have to schedule', 'i need to get this done by',
      'schedule this', 'due by', 'due on', 'get done by', 'finish by',
      'yes', 'yeah', 'sure', 'ok', 'yep', 'and', 'also', 'make it'
    ];
    
    let cleanedText = rawText.toLowerCase();
    
    // Remove filler phrases
    fillerPhrases.forEach(phrase => {
      cleanedText = cleanedText.replace(new RegExp(phrase, 'gi'), '');
    });
    
    // Extract time information
    const timeMatch = cleanedText.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)/i);
    let extractedTime = null;
    let extractedDate = null;
    
    if (timeMatch) {
      const hour = parseInt(timeMatch[1]);
      const minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
      const period = timeMatch[3].toLowerCase();
      
      // Convert to 24-hour format
      let hour24 = hour;
      if (period === 'pm' && hour !== 12) hour24 += 12;
      if (period === 'am' && hour === 12) hour24 = 0;
      
      extractedTime = { hour: hour24, minute };
    }
    
    // Enhanced date parsing with natural language
    extractedDate = this.parseNaturalDate(cleanedText);
    
    // Clean up the task text
    cleanedText = cleanedText
      .replace(/\s+/g, ' ') // Remove extra spaces
      .trim();
    
    // Capitalize first letter of each word
    cleanedText = cleanedText.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    // Remove trailing punctuation
    cleanedText = cleanedText.replace(/[.!?]+$/, '');
    
    return {
      cleanText: cleanedText,
      deadline: extractedDate && extractedTime ? {
        date: extractedDate,
        time: extractedTime,
        fullDate: new Date(
          extractedDate.getFullYear(),
          extractedDate.getMonth(),
          extractedDate.getDate(),
          extractedTime.hour,
          extractedTime.minute
        )
      } : extractedDate ? {
        date: extractedDate,
        time: null,
        fullDate: extractedDate
      } : null
    };
  },
  
  // Parse natural language dates
  parseNaturalDate(text) {
    const now = new Date();
    const lowerText = text.toLowerCase();
    
    // Immediate/urgent
    if (lowerText.includes('now') || lowerText.includes('asap') || lowerText.includes('urgent')) {
      return new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes from now
    }
    
    // Today variations
    if (lowerText.includes('today') || lowerText.includes('tonight')) {
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }
    
    // Tomorrow variations
    if (lowerText.includes('tomorrow')) {
      return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    }
    
    // Next day variations
    if (lowerText.includes('next day')) {
      return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2);
    }
    
    // This week variations
    if (lowerText.includes('this week') || lowerText.includes('by end of week')) {
      const daysUntilFriday = (5 - now.getDay() + 7) % 7;
      return new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntilFriday);
    }
    
    // Next week variations
    if (lowerText.includes('next week')) {
      return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7);
    }
    
    // This month variations
    if (lowerText.includes('this month') || lowerText.includes('by end of month')) {
      return new Date(now.getFullYear(), now.getMonth() + 1, 0); // Last day of current month
    }
    
    // Next month variations
    if (lowerText.includes('next month')) {
      return new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
    }
    
    // Specific days of the week
    const dayPatterns = [
      { pattern: /(?:by\s+)?(monday|mon)/i, offset: 1 },
      { pattern: /(?:by\s+)?(tuesday|tues)/i, offset: 2 },
      { pattern: /(?:by\s+)?(wednesday|wed)/i, offset: 3 },
      { pattern: /(?:by\s+)?(thursday|thurs)/i, offset: 4 },
      { pattern: /(?:by\s+)?(friday|fri)/i, offset: 5 },
      { pattern: /(?:by\s+)?(saturday|sat)/i, offset: 6 },
      { pattern: /(?:by\s+)?(sunday|sun)/i, offset: 0 }
    ];
    
    for (const { pattern, offset } of dayPatterns) {
      if (pattern.test(lowerText)) {
        const daysUntilTarget = (offset - now.getDay() + 7) % 7;
        if (daysUntilTarget === 0) daysUntilTarget = 7; // Next week if today
        return new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntilTarget);
      }
    }
    
    // Relative time expressions
    if (lowerText.includes('in a few hours') || lowerText.includes('few hours')) {
      return new Date(now.getTime() + 3 * 60 * 60 * 1000); // 3 hours from now
    }
    
    if (lowerText.includes('in a few days') || lowerText.includes('few days')) {
      return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3);
    }
    
    if (lowerText.includes('in a week') || lowerText.includes('week from now')) {
      return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7);
    }
    
    if (lowerText.includes('in a month') || lowerText.includes('month from now')) {
      return new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
    }
    
    // End of day expressions
    if (lowerText.includes('end of day') || lowerText.includes('by end of day')) {
      return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59);
    }
    
    // End of week expressions
    if (lowerText.includes('end of week') || lowerText.includes('by end of week')) {
      const daysUntilFriday = (5 - now.getDay() + 7) % 7;
      return new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntilFriday, 23, 59);
    }
    
    return null;
  },
  
  // Check if task has a deadline
  hasDeadline(taskText) {
    const timePattern = /\d{1,2}:?\d{2}?\s*(am|pm)/i;
    const datePattern = /(tomorrow|today|next week|next month|monday|tuesday|wednesday|thursday|friday|saturday|sunday|now|asap|urgent|this week|this month|few hours|few days|week from now|month from now|end of day|end of week)/i;
    return timePattern.test(taskText) || datePattern.test(taskText);
  }
};

module.exports = taskProcessor;
