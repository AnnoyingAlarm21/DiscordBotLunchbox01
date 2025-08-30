const fs = require('fs');
const path = require('path');

class TaskStorage {
  constructor() {
    this.storagePath = path.join(__dirname, '../../data');
    this.tasksFile = path.join(this.storagePath, 'tasks.json');
    this.ensureStorageDirectory();
  }

  // Ensure storage directory exists
  ensureStorageDirectory() {
    if (!fs.existsSync(this.storagePath)) {
      fs.mkdirSync(this.storagePath, { recursive: true });
    }
  }

  // Load tasks from file
  loadTasks() {
    try {
      if (fs.existsSync(this.tasksFile)) {
        const data = fs.readFileSync(this.tasksFile, 'utf8');
        const tasks = JSON.parse(data);
        
        // Convert date strings back to Date objects
        Object.keys(tasks).forEach(userId => {
          if (tasks[userId].tasks) {
            tasks[userId].tasks.forEach(task => {
              if (task.createdAt) task.createdAt = new Date(task.createdAt);
              if (task.deadline && task.deadline.fullDate) {
                task.deadline.fullDate = new Date(task.deadline.fullDate);
              }
            });
          }
        });
        
        console.log(`📁 Loaded ${Object.keys(tasks).length} users with tasks from storage`);
        return new Map(Object.entries(tasks));
      }
    } catch (error) {
      console.error('❌ Error loading tasks from storage:', error);
    }
    
    console.log('📁 No existing task storage found, starting fresh');
    return new Map();
  }

  // Save tasks to file
  saveTasks(userTasks) {
    try {
      // Convert Map to object for JSON serialization
      const tasksObject = {};
      userTasks.forEach((userData, userId) => {
        tasksObject[userId] = userData;
      });
      
      fs.writeFileSync(this.tasksFile, JSON.stringify(tasksObject, null, 2));
      console.log(`💾 Saved ${Object.keys(tasksObject).length} users with tasks to storage`);
      return true;
    } catch (error) {
      console.error('❌ Error saving tasks to storage:', error);
      return false;
    }
  }

  // Add a task for a user
  addTask(userId, task) {
    try {
      // Load current tasks
      const currentTasks = this.loadTasks();
      
      // Get or create user data
      if (!currentTasks.has(userId)) {
        currentTasks.set(userId, { tasks: [] });
      }
      
      const userData = currentTasks.get(userId);
      if (!userData.tasks) {
        userData.tasks = [];
      }
      
      // Add the new task
      userData.tasks.push(task);
      
      // Save back to storage
      this.saveTasks(currentTasks);
      
      console.log(`✅ Task added for user ${userId}: ${task.content}`);
      return true;
    } catch (error) {
      console.error('❌ Error adding task to storage:', error);
      return false;
    }
  }

  // Get tasks for a user
  getUserTasks(userId) {
    try {
      const currentTasks = this.loadTasks();
      return currentTasks.get(userId) || { tasks: [] };
    } catch (error) {
      console.error('❌ Error getting user tasks from storage:', error);
      return { tasks: [] };
    }
  }

  // Update a task
  updateTask(userId, taskId, updates) {
    try {
      const currentTasks = this.loadTasks();
      const userData = currentTasks.get(userId);
      
      if (userData && userData.tasks) {
        const taskIndex = userData.tasks.findIndex(task => task.id === taskId);
        if (taskIndex !== -1) {
          userData.tasks[taskIndex] = { ...userData.tasks[taskIndex], ...updates };
          this.saveTasks(currentTasks);
          console.log(`✅ Task updated for user ${userId}: ${taskId}`);
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('❌ Error updating task in storage:', error);
      return false;
    }
  }

  // Delete a task
  deleteTask(userId, taskId) {
    try {
      const currentTasks = this.loadTasks();
      const userData = currentTasks.get(userId);
      
      if (userData && userData.tasks) {
        const taskIndex = userData.tasks.findIndex(task => task.id === taskId);
        if (taskIndex !== -1) {
          const deletedTask = userData.tasks.splice(taskIndex, 1)[0];
          this.saveTasks(currentTasks);
          console.log(`✅ Task deleted for user ${userId}: ${deletedTask.content}`);
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('❌ Error deleting task from storage:', error);
      return false;
    }
  }
}

module.exports = new TaskStorage();
