// Calendar sync list command - manage sync configurations
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const calendarSyncSystem = require('../utils/calendarSyncSystem');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('calendarsynclist')
    .setDescription('View and manage your calendar sync configurations'),

  async execute(interaction) {
    try {
      const userId = interaction.user.id;
      const syncConfigs = calendarSyncSystem.getUserSyncConfigs(userId);
      
      if (syncConfigs.length === 0) {
        const embed = new EmbedBuilder()
          .setTitle('📅 No Calendar Syncs')
          .setDescription('You don\'t have any calendar syncs configured yet.')
          .setColor(0x666666)
          .addFields(
            { name: '🔄 Set Up Sync', value: 'Use `/calendarsyncsetup` to create automatic calendar syncing', inline: false }
          );
        
        await interaction.reply({ embeds: [embed] });
        return;
      }
      
      // Create embed with sync information
      let description = `You have **${syncConfigs.length}** calendar sync(s) configured:\n\n`;
      
      syncConfigs.forEach((config, index) => {
        const status = config.isActive ? '🟢 Active' : '🔴 Inactive';
        const lastSync = config.lastSync ? 
          config.lastSync.toLocaleString() : 
          'Never';
        
        description += `**${index + 1}. ${config.name}** ${status}\n`;
        description += `   📅 URL: ${config.icsUrl}\n`;
        description += `   ⏰ Interval: Every ${config.syncInterval} minutes\n`;
        description += `   🕐 Last Sync: ${lastSync}\n\n`;
      });
      
      const embed = new EmbedBuilder()
        .setTitle('📅 Calendar Sync Configurations')
        .setDescription(description)
        .setColor(0x00ff00)
        .setFooter({ text: 'Use /calendarsyncsetup to add more syncs' });
      
      // Create buttons for each sync (if not too many)
      const components = [];
      if (syncConfigs.length <= 5) {
        const row = new ActionRowBuilder();
        
        syncConfigs.forEach((config, index) => {
          const button = new ButtonBuilder()
            .setCustomId(`sync_${config.id}`)
            .setLabel(`${index + 1}. ${config.name}`)
            .setStyle(config.isActive ? ButtonStyle.Success : ButtonStyle.Secondary);
          
          row.addComponents(button);
        });
        
        components.push(row);
      }
      
      await interaction.reply({ 
        embeds: [embed], 
        components: components,
        ephemeral: true 
      });
      
    } catch (error) {
      console.error('Error in calendarsynclist command:', error);
      await interaction.reply('❌ Sorry, I had trouble loading your sync configurations. Please try again!');
    }
  }
};
