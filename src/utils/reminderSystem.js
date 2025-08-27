// Reminder system for deadlines
const reminderSystem = {
  // Store active reminders
  activeReminders: new Map(),
  
  // Schedule reminders for a task
  scheduleReminders(client, userId, taskId, taskText, deadline) {
    const now = new Date();
    const timeUntilDeadline = deadline.getTime() - now.getTime();
    
    if (timeUntilDeadline <= 0) {
      console.log(`⚠️ Deadline already passed for task ${taskId}`);
      return;
    }
    
    const reminderTimes = [
      { time: 10 * 60 * 1000, label: '10 minutes' }, // 10 minutes before
      { time: 5 * 60 * 1000, label: '5 minutes' },   // 5 minutes before
      { time: 0, label: 'NOW' }                       // Exact time
    ];
    
    const reminders = [];
    
    reminderTimes.forEach(({ time, label }) => {
      const reminderTime = deadline.getTime() - time;
      const delay = reminderTime - now.getTime();
      
      if (delay > 0) {
        const timeoutId = setTimeout(async () => {
          await this.sendReminder(client, userId, taskId, taskText, label);
        }, delay);
        
        reminders.push({ timeoutId, label, time: reminderTime });
      }
    });
    
    // Store reminder info
    this.activeReminders.set(taskId, {
      userId,
      taskText,
      deadline,
      reminders
    });
    
    console.log(`⏰ Scheduled ${reminders.length} reminders for task ${taskId} (${taskText})`);
  },
  
  // Send a reminder DM
  async sendReminder(client, userId, taskId, taskText, timeLabel) {
    try {
      const user = await client.users.fetch(userId);
      if (!user) {
        console.log(`❌ Could not find user ${userId} for reminder`);
        return;
      }
      
      let message;
      if (timeLabel === 'NOW') {
        message = `🚨 **DEADLINE NOW!** 🚨\n\nYour task is due right now:\n**${taskText}**\n\nTime to get it done! 💪`;
      } else {
        message = `⏰ **Reminder: ${timeLabel} until deadline!**\n\nYour task is due soon:\n**${taskText}**\n\nBetter hurry up! 🏃‍♂️`;
      }
      
      await user.send(message);
      console.log(`✅ Sent ${timeLabel} reminder to user ${userId} for task: ${taskText}`);
      
    } catch (error) {
      console.error(`❌ Failed to send reminder to user ${userId}:`, error);
    }
  },
  
  // Cancel all reminders for a task
  cancelReminders(taskId) {
    const reminderInfo = this.activeReminders.get(taskId);
    if (reminderInfo) {
      reminderInfo.reminders.forEach(({ timeoutId }) => {
        clearTimeout(timeoutId);
      });
      this.activeReminders.delete(taskId);
      console.log(`❌ Cancelled all reminders for task ${taskId}`);
    }
  },
  
  // Get all active reminders for a user
  getUserReminders(userId) {
    const userReminders = [];
    for (const [taskId, reminderInfo] of this.activeReminders) {
      if (reminderInfo.userId === userId) {
        userReminders.push({
          taskId,
          taskText: reminderInfo.taskText,
          deadline: reminderInfo.deadline,
          reminders: reminderInfo.reminders
        });
      }
    }
    return userReminders;
  },
  
  // Clean up expired reminders
  cleanupExpiredReminders() {
    const now = new Date();
    for (const [taskId, reminderInfo] of this.activeReminders) {
      if (reminderInfo.deadline < now) {
        this.cancelReminders(taskId);
      }
    }
  }
};

module.exports = reminderSystem;
