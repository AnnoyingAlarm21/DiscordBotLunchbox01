const express = require('express');
const path = require('path');
const fs = require('fs');

// Create Express app for admin dashboard
const adminApp = express();
const adminPort = 3000; // Changed back to 3000

// Middleware
adminApp.use(express.json());
adminApp.use(express.static(__dirname));

// Admin dashboard routes
adminApp.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// API endpoint to get all user data
adminApp.get('/api/users', (req, res) => {
  try {
    // Read tasks from storage
    const tasksPath = path.join(__dirname, '../data/tasks.json');
    let userTasks = {};
    
    if (fs.existsSync(tasksPath)) {
      const tasksData = fs.readFileSync(tasksPath, 'utf8');
      userTasks = JSON.parse(tasksData);
    }
    
    // Get bot client data (if available)
    const botData = global.botClient ? {
      activeConversations: Array.from(global.botClient.activeConversations || []),
      privateThreads: Array.from(global.botClient.privateThreads || []),
      groupConversations: Array.from(global.botClient.groupConversations || []),
      pendingTasks: Array.from(global.botClient.pendingTasks || []),
      conversationContext: Array.from(global.botClient.conversationContext || [])
    } : {};
    
    res.json({
      users: userTasks,
      botData: botData,
      totalUsers: Object.keys(userTasks).length,
      totalTasks: Object.values(userTasks).reduce((sum, user) => sum + (user.tasks ? user.tasks.length : 0), 0)
    });
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
});

// API endpoint to get specific user data
adminApp.get('/api/users/:userId', (req, res) => {
  try {
    const userId = req.params.userId;
    const tasksPath = path.join(__dirname, '../data/tasks.json');
    
    if (fs.existsSync(tasksPath)) {
      const tasksData = fs.readFileSync(tasksPath, 'utf8');
      const userTasks = JSON.parse(tasksData);
      
      if (userTasks[userId]) {
        res.json(userTasks[userId]);
      } else {
        res.status(404).json({ error: 'User not found' });
      }
    } else {
      res.status(404).json({ error: 'No user data found' });
    }
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
});

// API endpoint to get conversation history for a specific user
adminApp.get('/api/conversations/:userId', (req, res) => {
  try {
    const userId = req.params.userId;
    const botData = global.botClient ? {
      activeConversations: Array.from(global.botClient.activeConversations || []),
      privateThreads: Array.from(global.botClient.privateThreads || []),
      groupConversations: Array.from(global.botClient.groupConversations || []),
      pendingTasks: Array.from(global.botClient.pendingTasks || []),
      conversationContext: Array.from(global.botClient.conversationContext || []),
      conversationHistory: global.botClient.conversationHistory ? 
        Object.fromEntries(global.botClient.conversationHistory) : {}
    } : {};
    
    const userHistory = botData.conversationHistory[userId] || [];
    
    res.json({
      userId: userId,
      isActive: botData.activeConversations.includes(userId),
      history: userHistory,
      totalMessages: userHistory.length,
      lastMessage: userHistory.length > 0 ? userHistory[userHistory.length - 1] : null
    });
  } catch (error) {
    console.error('Error fetching conversation history:', error);
    res.status(500).json({ error: 'Failed to fetch conversation history' });
  }
});

// Start admin dashboard server
function startAdminDashboard() {
  adminApp.listen(adminPort, () => {
    console.log(`🖥️  Admin Dashboard running on http://localhost:${adminPort}`);
    console.log(`📊 View all users, tasks, and threads at http://localhost:${adminPort}`);
  });
}

module.exports = { startAdminDashboard };
