// Task processing utilities
const taskProcessor = {
  // Clean up task text: fix spelling, capitalization, extract core task
  cleanTaskText(rawText) {
    console.log(`🔍 TaskProcessor: Processing raw text: "${rawText}"`);
    
    let cleanedText = rawText.toLowerCase();
    console.log(`🔍 TaskProcessor: After lowercase: "${cleanedText}"`);
    
    // Fix common misspellings FIRST (before any other processing)
    const spellingFixes = {
      'seesion': 'session',
      'appoint ment': 'appointment',
      'tomoroor': 'tomorrow',
      'morrow': 'tomorrow',  // NEW: Fix "morrow" → "tomorrow"
      'dr ': 'doctor ',
      'doc ': 'doctor ',
      'apt ': 'appointment ',
      'mtg ': 'meeting '
      // Removed hw/homework replacements that were causing "have" → "homeworkave"
    };
    
    Object.entries(spellingFixes).forEach(([wrong, correct]) => {
      cleanedText = cleanedText.replace(new RegExp(wrong, 'gi'), correct);
    });
    console.log(`🔍 TaskProcessor: After spelling fixes: "${cleanedText}"`);
    
    // Extract time information BEFORE any text cleaning
    // NEW: Handle typos like "pkm" for "pm"
    let timeMatch = cleanedText.match(/(\d{1,2}):?(\d{2})?\s*(am|pm|pkm|amk)/i);
    let extractedTime = null;
    let extractedDate = null;
    
    if (timeMatch) {
      const hour = parseInt(timeMatch[1]);
      const minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
      let period = timeMatch[3].toLowerCase();
      
      // Fix common typos
      if (period === 'pkm') period = 'pm';
      if (period === 'amk') period = 'am';
      
      // Convert to 24-hour format
      let hour24 = hour;
      if (period === 'pm' && hour !== 12) hour24 += 12;
      if (period === 'am' && hour === 12) hour24 = 0;
      
      extractedTime = { hour: hour24, minute };
      console.log(`🔍 TaskProcessor: Extracted time: ${hour24}:${minute.toString().padStart(2, '0')}`);
      
      // Remove the time from text to avoid duplication
      cleanedText = cleanedText.replace(timeMatch[0], '').trim();
      console.log(`🔍 TaskProcessor: After removing time: "${cleanedText}"`);
    }
    
    // Enhanced date parsing with natural language
    extractedDate = this.parseNaturalDate(cleanedText);
    if (extractedDate) {
      console.log(`🔍 TaskProcessor: Extracted date: ${extractedDate.toLocaleString()}`);
    }
    
    // NEW: Remove question phrases and task creation requests
    const questionPhrases = [
      'can you create a task',
      'can you add this',
      'can you add that',
      'can you help me',
      'do you help me',
      'please create a task',
      'please add this',
      'please add that',
      'please help me',
      'i want you to create',
      'i want you to add',
      'i want you to help',
      'make this a task',
      'add this to my lunchbox',
      'add this to lunchbox',
      'create a task for this',
      'create a task for that'
    ];
    
    questionPhrases.forEach(phrase => {
      cleanedText = cleanedText.replace(new RegExp(phrase, 'gi'), '').trim();
    });
    
    console.log(`🔍 TaskProcessor: After removing question phrases: "${cleanedText}"`);
    
    // NOW do minimal text cleaning - only remove truly unnecessary words
    // Split into words and filter out only the most basic fillers
    const words = cleanedText.split(/\s+/).filter(word => {
      // Keep all meaningful words, only remove very basic fillers
      const basicFillers = ['and', 'or', 'but', 'the', 'a', 'an', 'in', 'on', 'at', 'for', 'of', 'with', 'by'];
      
      // NEW: Be much less aggressive - only remove obvious task creation words
      const taskFillers = ['can', 'you', 'help', 'please', 'create', 'add', 'make', 'this', 'that', 'thing', 'task'];
      
      // NEW: Remove conversational fillers that don't add meaning to tasks
      const conversationFillers = ['well', 'so', 'um', 'uh', 'like', 'you know', 'actually', 'basically'];
      
      // IMPORTANT: Keep "i", "need", "to", "have", "want", "study", "homework", etc. - these are the actual task!
      // But remove "to" if it's just a filler (like "to study" -> "study")
      
      return !basicFillers.includes(word.toLowerCase()) && 
             !taskFillers.includes(word.toLowerCase()) && 
             !conversationFillers.includes(word.toLowerCase()) &&
             word.length > 0;
    });
    
    // NEW: Clean up common patterns to make tasks more readable
    cleanedText = words.join(' ')
      .replace(/\s+/g, ' ') // Remove extra spaces
      .trim();
    
    // Remove "to" if it's at the beginning and doesn't add meaning
    if (cleanedText.toLowerCase().startsWith('to ')) {
      cleanedText = cleanedText.substring(3);
    }
    
    // Remove "i need to" -> just keep the action
    cleanedText = cleanedText.replace(/^i need to /i, '');
    cleanedText = cleanedText.replace(/^i have to /i, '');
    cleanedText = cleanedText.replace(/^i want to /i, '');
    
    // NEW: Smart task name generation
    // If it's "i have a [something]", make it "Study for [Something]" or "Prepare for [Something]"
    const havePattern = /^i have a (.+)$/i;
    const gotPattern = /^i got a (.+)$/i;
    const needPattern = /^i need a (.+)$/i;
    
    console.log(`🔍 SmartTask: Checking patterns for "${cleanedText}"`);
    
    if (havePattern.test(cleanedText) || gotPattern.test(cleanedText) || needPattern.test(cleanedText)) {
      const match = cleanedText.match(/(?:i have a|i got a|i need a) (.+)$/i);
      if (match) {
        const item = match[1];
        console.log(`🔍 SmartTask: Matched "i have a" pattern, item: "${item}"`);
        // Determine the appropriate action based on the item
        if (item.toLowerCase().includes('test') || item.toLowerCase().includes('exam') || item.toLowerCase().includes('quiz')) {
          cleanedText = `Study for ${item}`;
          console.log(`🔍 SmartTask: Generated "Study for ${item}"`);
        } else if (item.toLowerCase().includes('meeting') || item.toLowerCase().includes('appointment') || item.toLowerCase().includes('interview')) {
          cleanedText = `Prepare for ${item}`;
          console.log(`🔍 SmartTask: Generated "Prepare for ${item}"`);
        } else if (item.toLowerCase().includes('project') || item.toLowerCase().includes('assignment') || item.toLowerCase().includes('paper')) {
          cleanedText = `Work on ${item}`;
          console.log(`🔍 SmartTask: Generated "Work on ${item}"`);
        } else {
          cleanedText = `Prepare for ${item}`;
          console.log(`🔍 SmartTask: Generated "Prepare for ${item}"`);
        }
      }
    }
    
    // NEW: Also handle "i have [something]" without "a"
    const haveSimplePattern = /^i have (.+)$/i;
    if (haveSimplePattern.test(cleanedText)) {
      const match = cleanedText.match(/^i have (.+)$/i);
      if (match) {
        const item = match[1];
        console.log(`🔍 SmartTask: Matched "i have" pattern, item: "${item}"`);
        if (item.toLowerCase().includes('test') || item.toLowerCase().includes('exam') || item.toLowerCase().includes('quiz')) {
          cleanedText = `Study for ${item}`;
          console.log(`🔍 SmartTask: Generated "Study for ${item}"`);
        } else if (item.toLowerCase().includes('homework')) {
          cleanedText = `Complete ${item}`;
          console.log(`🔍 SmartTask: Generated "Complete ${item}"`);
        } else if (item.toLowerCase().includes('meeting') || item.toLowerCase().includes('appointment')) {
          cleanedText = `Prepare for ${item}`;
          console.log(`🔍 SmartTask: Generated "Prepare for ${item}"`);
        } else {
          cleanedText = `Complete ${item}`;
          console.log(`🔍 SmartTask: Generated "Complete ${item}"`);
        }
      }
    }
    
    // Capitalize first letter of each word
    cleanedText = cleanedText.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    // Remove trailing punctuation
    cleanedText = cleanedText.replace(/[.!?]+$/, '');
    
    // NEW: If we extracted time, add it back to the task text for clarity
    if (extractedTime) {
      const timeString = `${extractedTime.hour > 12 ? extractedTime.hour - 12 : extractedTime.hour}:${extractedTime.minute.toString().padStart(2, '0')}${extractedTime.hour >= 12 ? 'pm' : 'am'}`;
      cleanedText = `${cleanedText} at ${timeString}`;
    }
    
    console.log(`🔍 TaskProcessor: Final cleaned text: "${cleanedText}"`);
    
    const result = {
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
      } : extractedTime ? {
        // NEW: If only time is mentioned, use today's date
        date: new Date(),
        time: extractedTime,
        fullDate: new Date(
          new Date().getFullYear(),
          new Date().getMonth(),
          new Date().getDate(),
          extractedTime.hour,
          extractedTime.minute
        )
      } : null
    };
    
    console.log(`🔍 TaskProcessor: Final result:`, JSON.stringify(result, null, 2));
    return result;
  },
  
  // Parse natural language dates
  parseNaturalDate(text) {
    const now = new Date();
    const lowerText = text.toLowerCase();
    
    console.log(`🔍 DateParser: Current date: ${now.toLocaleString()}`);
    console.log(`🔍 DateParser: Processing text: "${text}"`);
    
    // Immediate/urgent
    if (lowerText.includes('now') || lowerText.includes('asap') || lowerText.includes('urgent')) {
      const result = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes from now
      console.log(`🔍 DateParser: "now" → ${result.toLocaleString()}`);
      return result;
    }
    
    // Today variations
    if (lowerText.includes('today') || lowerText.includes('tonight')) {
      const result = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      console.log(`🔍 DateParser: "today" → ${result.toLocaleString()}`);
      return result;
    }
    
    // Tomorrow variations
    if (lowerText.includes('tomorrow')) {
      const result = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      console.log(`🔍 DateParser: "tomorrow" → ${result.toLocaleString()}`);
      return result;
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
