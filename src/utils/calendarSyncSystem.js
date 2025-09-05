// Calendar sync system for automatic updates
const calendarSyncSystem = {
  // Store sync configurations
  userSyncConfigs: new Map(),
  
  // Active sync jobs
  activeSyncJobs: new Map(),
  
  // Create sync configuration
  createSyncConfig(userId, config) {
    const syncConfig = {
      id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: userId,
      name: config.name || 'Calendar Sync',
      icsUrl: config.icsUrl,
      syncInterval: config.syncInterval || 60, // minutes
      lastSync: null,
      enabled: true,
      createdAt: new Date()
    };
    
    this.userSyncConfigs.set(syncConfig.id, syncConfig);
    console.log(`🔄 Created sync config for user ${userId}: ${syncConfig.name}`);
    return syncConfig;
  },
  
  // Start automatic syncing for a user
  startSync(userId, syncConfigId) {
    const syncConfig = this.userSyncConfigs.get(syncConfigId);
    if (!syncConfig || syncConfig.userId !== userId) {
      throw new Error('Sync configuration not found');
    }
    
    // Stop existing sync if running
    this.stopSync(syncConfigId);
    
    // Start new sync job
    const syncJob = setInterval(async () => {
      try {
        await this.performSync(syncConfigId);
      } catch (error) {
        console.error(`❌ Sync error for ${syncConfigId}:`, error);
      }
    }, syncConfig.syncInterval * 60 * 1000); // Convert minutes to milliseconds
    
    this.activeSyncJobs.set(syncConfigId, syncJob);
    console.log(`🔄 Started sync job for ${syncConfig.name} (every ${syncConfig.syncInterval} minutes)`);
    
    // Perform initial sync
    this.performSync(syncConfigId);
  },
  
  // Stop automatic syncing
  stopSync(syncConfigId) {
    const syncJob = this.activeSyncJobs.get(syncConfigId);
    if (syncJob) {
      clearInterval(syncJob);
      this.activeSyncJobs.delete(syncConfigId);
      console.log(`🔄 Stopped sync job for ${syncConfigId}`);
    }
  },
  
  // Perform sync operation
  async performSync(syncConfigId) {
    const syncConfig = this.userSyncConfigs.get(syncConfigId);
    if (!syncConfig || !syncConfig.enabled) {
      return;
    }
    
    try {
      console.log(`🔄 Performing sync: ${syncConfig.name}`);
      
      // Fetch ICS content from URL
      const response = await fetch(syncConfig.icsUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const icsContent = await response.text();
      
      // Parse and import events
      const calendarSystem = require('./calendarSystem');
      const timezoneSystem = require('./timezoneSystem');
      
      const events = await calendarSystem.parseICSFile(icsContent, syncConfig.userId);
      
      // Convert timezones if needed
      const userTimezone = timezoneSystem.getUserTimezone(syncConfig.userId);
      const convertedEvents = events.map(event => {
        const eventTimezone = timezoneSystem.detectTimezoneFromEvent(event);
        if (eventTimezone && eventTimezone !== userTimezone) {
          event.startDate = timezoneSystem.convertEventToUserTimezone(
            event.startDate, eventTimezone, userTimezone
          );
          event.endDate = timezoneSystem.convertEventToUserTimezone(
            event.endDate, eventTimezone, userTimezone
          );
        }
        return event;
      });
      
      // Add events to calendar
      const addedCount = calendarSystem.addEventsToUser(syncConfig.userId, convertedEvents);
      
      // Schedule reminders for new events
      convertedEvents.forEach(event => {
        calendarSystem.scheduleEventReminders(global.botClient, syncConfig.userId, event);
      });
      
      // Update last sync time
      syncConfig.lastSync = new Date();
      
      // Save data
      calendarSystem.saveCalendarData();
      this.saveSyncConfigs();
      
      console.log(`✅ Sync completed: ${addedCount} events added from ${syncConfig.name}`);
      
    } catch (error) {
      console.error(`❌ Sync failed for ${syncConfig.name}:`, error);
      syncConfig.lastSync = new Date(); // Update even on failure
      syncConfig.lastError = error.message;
    }
  },
  
  // Get user's sync configurations
  getUserSyncConfigs(userId) {
    const userConfigs = [];
    for (const [id, config] of this.userSyncConfigs) {
      if (config.userId === userId) {
        userConfigs.push({
          ...config,
          isActive: this.activeSyncJobs.has(id)
        });
      }
    }
    return userConfigs;
  },
  
  // Delete sync configuration
  deleteSyncConfig(userId, syncConfigId) {
    const syncConfig = this.userSyncConfigs.get(syncConfigId);
    if (!syncConfig || syncConfig.userId !== userId) {
      throw new Error('Sync configuration not found');
    }
    
    // Stop sync job if running
    this.stopSync(syncConfigId);
    
    // Remove configuration
    this.userSyncConfigs.delete(syncConfigId);
    this.saveSyncConfigs();
    
    console.log(`🗑️ Deleted sync config: ${syncConfig.name}`);
    return true;
  },
  
  // Save sync configurations to file
  saveSyncConfigs() {
    try {
      const fs = require('fs');
      const path = require('path');
      
      const dataDir = path.join(__dirname, '..', '..', 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      
      const syncData = {};
      for (const [id, config] of this.userSyncConfigs) {
        syncData[id] = {
          ...config,
          createdAt: config.createdAt.toISOString(),
          lastSync: config.lastSync ? config.lastSync.toISOString() : null
        };
      }
      
      fs.writeFileSync(
        path.join(dataDir, 'sync-configs.json'),
        JSON.stringify(syncData, null, 2)
      );
      
      console.log(`💾 Sync configurations saved successfully`);
    } catch (error) {
      console.error('❌ Error saving sync configurations:', error);
    }
  },
  
  // Load sync configurations from file
  loadSyncConfigs() {
    try {
      const fs = require('fs');
      const path = require('path');
      
      const dataDir = path.join(__dirname, '..', '..', 'data');
      const syncFile = path.join(dataDir, 'sync-configs.json');
      
      if (fs.existsSync(syncFile)) {
        const syncData = JSON.parse(fs.readFileSync(syncFile, 'utf8'));
        
        for (const [id, config] of Object.entries(syncData)) {
          this.userSyncConfigs.set(id, {
            ...config,
            createdAt: new Date(config.createdAt),
            lastSync: config.lastSync ? new Date(config.lastSync) : null
          });
        }
        
        console.log(`📁 Loaded ${Object.keys(syncData).length} sync configurations`);
      }
    } catch (error) {
      console.error('❌ Error loading sync configurations:', error);
    }
  },
  
  // Restart all sync jobs (called on bot startup)
  restartAllSyncJobs() {
    console.log('🔄 Restarting all sync jobs...');
    
    for (const [id, config] of this.userSyncConfigs) {
      if (config.enabled) {
        try {
          this.startSync(config.userId, id);
        } catch (error) {
          console.error(`❌ Failed to restart sync ${id}:`, error);
        }
      }
    }
    
    console.log(`🔄 Restarted ${this.activeSyncJobs.size} sync jobs`);
  }
};

module.exports = calendarSyncSystem;
