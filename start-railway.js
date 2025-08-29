#!/usr/bin/env node

// Railway-specific startup script
console.log('🚂 Railway startup script starting...');

// Wait a shorter moment for the system to be ready
setTimeout(() => {
  console.log('🚂 Starting main bot process...');
  
  // Start the main bot
  require('./src/index.js');
}, 500); // Reduced from 1000ms to 500ms
