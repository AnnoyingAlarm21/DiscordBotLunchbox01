// Task processing utilities
const taskProcessor = {
  // Clean up task text: fix spelling, capitalization, extract core task
  cleanTaskText(rawText) {
    // Remove common filler words and phrases
    const fillerPhrases = [
      'i have a', 'i need to', 'i want to', 'i should', 'i must',
      'can you', 'please', 'remind me', 'set a reminder',
      'deadline', 'due date', 'due time', 'at', 'pm', 'am'
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
    
    // Extract date information
    const dateMatch = cleanedText.match(/(tomorrow|today|next week|next month)/i);
    if (dateMatch) {
      const dateText = dateMatch[1].toLowerCase();
      const now = new Date();
      
      if (dateText === 'tomorrow') {
        extractedDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      } else if (dateText === 'today') {
        extractedDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (dateText === 'next week') {
        extractedDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7);
      } else if (dateText === 'next month') {
        extractedDate = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
      }
    }
    
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
      } : null
    };
  },
  
  // Check if task has a deadline
  hasDeadline(taskText) {
    const timePattern = /\d{1,2}:?\d{2}?\s*(am|pm)/i;
    const datePattern = /(tomorrow|today|next week|next month)/i;
    return timePattern.test(taskText) || datePattern.test(taskText);
  }
};

module.exports = taskProcessor;
