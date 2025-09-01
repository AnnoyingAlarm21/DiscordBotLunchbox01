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
      'totomorrow': 'tomorrow',  // NEW: Fix "totomorrow" → "tomorrow"
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
      console.log(`🔍 TaskProcessor: Text BEFORE date parsing: "${cleanedText}"`);
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
      const conversationFillers = ['well', 'so', 'um', 'uh', 'like', 'you know', 'actually', 'basically', 'good', 'bad', 'okay', 'ok', 'yeah', 'yes', 'no', 'nope', 'nah'];
      
      // NEW: Remove standalone "i" that are likely typos (like "i biology test")
      const standaloneI = word.toLowerCase() === 'i' && word.length === 1;
      
      // IMPORTANT: Keep "i", "need", "to", "have", "want", "study", "homework", etc. - these are the actual task!
      // But remove "to" if it's just a filler (like "to study" -> "study")
      
      console.log(`🔍 WordFilter: Checking word "${word}" - basicFillers: ${basicFillers.includes(word.toLowerCase())}, taskFillers: ${taskFillers.includes(word.toLowerCase())}, conversationFillers: ${conversationFillers.includes(word.toLowerCase())}, standaloneI: ${standaloneI}`);
      
      return !basicFillers.includes(word.toLowerCase()) && 
             !taskFillers.includes(word.toLowerCase()) && 
             !conversationFillers.includes(word.toLowerCase()) &&
             !standaloneI &&
             word.length > 0;
    });
    
    console.log(`🔍 TaskProcessor: Words after filtering: [${words.join(', ')}]`);
    
    // NEW: Clean up common patterns to make tasks more readable
    cleanedText = words.join(' ')
      .replace(/\s+/g, ' ') // Remove extra spaces
      .trim();
    
    console.log(`🔍 TaskProcessor: After joining words: "${cleanedText}"`);
    
    // Remove "to" if it's at the beginning and doesn't add meaning
    if (cleanedText.toLowerCase().startsWith('to ')) {
      cleanedText = cleanedText.substring(3);
    }
    
    // Remove "i need to" -> just keep the action
    cleanedText = cleanedText.replace(/^i need to /i, '');
    cleanedText = cleanedText.replace(/^i have to /i, '');
    cleanedText = cleanedText.replace(/^i want to /i, '');
    
    // NEW: Apply spelling fixes again after word filtering
    const spellingFixesAfter = {
      'totomorrow': 'tomorrow',
      'tomoroor': 'tomorrow'
      // REMOVED: 'morrow': 'tomorrow' - THIS WAS BREAKING "tomorrow"!
    };
    
    console.log(`🔍 TaskProcessor: Before spelling fixes: "${cleanedText}"`);
    
    Object.entries(spellingFixesAfter).forEach(([wrong, correct]) => {
      const before = cleanedText;
      cleanedText = cleanedText.replace(new RegExp(wrong, 'gi'), correct);
      if (before !== cleanedText) {
        console.log(`🔍 TaskProcessor: Fixed "${wrong}" → "${correct}"`);
      }
    });
    
    console.log(`🔍 TaskProcessor: After spelling fixes: "${cleanedText}"`);
    
    // NEW: Smart task name generation
    // Check for "i have" patterns and transform them into better task names
    const havePattern = /^i have (.+)$/i;
    const gotPattern = /^i got (.+)$/i;
    const needPattern = /^i need (.+)$/i;
    const haveSimplePattern = /^have (.+)$/i;
    const haveAnywherePattern = /i have (.+)$/i;
    
    console.log(`🔍 SmartTask: Checking patterns for "${cleanedText}"`);
    
    // Handle "i have a X" patterns
    if (havePattern.test(cleanedText)) {
      const match = cleanedText.match(havePattern);
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
    
    // Handle "i got X" patterns
    else if (gotPattern.test(cleanedText)) {
      const match = cleanedText.match(gotPattern);
      const item = match[1];
      console.log(`🔍 SmartTask: Matched "i got" pattern, item: "${item}"`);
      
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
    
    // Handle "i need X" patterns
    else if (needPattern.test(cleanedText)) {
      const match = cleanedText.match(needPattern);
      const item = match[1];
      console.log(`🔍 SmartTask: Matched "i need" pattern, item: "${item}"`);
      
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
    
    // Handle "have X" patterns (after "i" is filtered out)
    else if (haveSimplePattern.test(cleanedText)) {
      const match = cleanedText.match(haveSimplePattern);
      const item = match[1];
      console.log(`🔍 SmartTask: Matched "have" pattern, item: "${item}"`);
      
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
    
    // NEW: Handle cases where "i have" appears after other words
    if (!cleanedText.startsWith('Study for') && !cleanedText.startsWith('Prepare for') && !cleanedText.startsWith('Work on') && !cleanedText.startsWith('Complete')) {
      const match = cleanedText.match(/i have (.+)$/i);
      if (match) {
        const item = match[1];
        console.log(`🔍 SmartTask: Matched "i have" anywhere pattern, item: "${item}"`);
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
    
    // FIX: If we extracted a date but the word "tomorrow" was removed, add it back for clarity
    if (extractedDate && !cleanedText.toLowerCase().includes('tomorrow') && !cleanedText.toLowerCase().includes('today') && !cleanedText.toLowerCase().includes('next')) {
      // Check if the extracted date is tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      if (extractedDate.getDate() === tomorrow.getDate() && 
          extractedDate.getMonth() === tomorrow.getMonth() && 
          extractedDate.getFullYear() === tomorrow.getFullYear()) {
        cleanedText = `${cleanedText} Tomorrow`;
        console.log(`🔍 TaskProcessor: Added "Tomorrow" back to task text`);
      }
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
    
    // NEW: Specific dates like "September 4th", "Dec 15", "March 3rd"
    const specificDatePattern = /(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2})(?:st|nd|rd|th)?/i;
    const match = lowerText.match(specificDatePattern);
    if (match) {
      const monthName = match[1];
      const day = parseInt(match[2]);
      
      // Convert month name to number (0-11)
      const monthMap = {
        'january': 0, 'jan': 0,
        'february': 1, 'feb': 1,
        'march': 2, 'mar': 2,
        'april': 3, 'apr': 3,
        'may': 4,
        'june': 5, 'jun': 5,
        'july': 6, 'jul': 6,
        'august': 7, 'aug': 7,
        'september': 8, 'sep': 8,
        'october': 9, 'oct': 9,
        'november': 10, 'nov': 10,
        'december': 11, 'dec': 11
      };
      
      const month = monthMap[monthName.toLowerCase()];
      if (month !== undefined && day >= 1 && day <= 31) {
        // Assume current year unless it's already passed, then use next year
        let year = now.getFullYear();
        const targetDate = new Date(year, month, day);
        if (targetDate < now) {
          year++; // Use next year if date has passed
        }
        
        const result = new Date(year, month, day);
        console.log(`🔍 DateParser: "${match[0]}" → ${result.toLocaleString()}`);
        return result;
      }
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
