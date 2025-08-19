const { REST, Routes } = require('discord.js');
const { config } = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load environment variables
config();

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

// Load all command data
for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  
  if ('data' in command && 'execute' in command) {
    commands.push(command.data.toJSON());
  } else {
    console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
  }
}

// Create REST instance
const rest = new REST().setToken(process.env.DISCORD_TOKEN);

// Deploy commands
(async () => {
  try {
    console.log(`🍱 Started refreshing ${commands.length} application (/) commands.`);

    // The put method is used to fully refresh all commands globally
    const data = await rest.put(
      Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
      { body: commands },
    );

    console.log(`🍱 Successfully reloaded ${data.length} application (/) commands.`);
    console.log('🍱 Commands deployed successfully! Your Lunchbox bot is ready to use.');
    
    // List all deployed commands
    console.log('\n📋 Deployed Commands:');
    commands.forEach(cmd => {
      console.log(`  /${cmd.name}: ${cmd.description}`);
    });
    
  } catch (error) {
    console.error('❌ Error deploying commands:', error);
  }
})();
