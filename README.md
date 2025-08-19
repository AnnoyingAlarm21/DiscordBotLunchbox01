<<<<<<< HEAD
# 🍱 Lunchbox Discord Bot

A playful, AI-powered productivity Discord bot that helps organize daily tasks into fun food categories! Instead of boring to-do lists, tasks are sorted into:

- **🍪 Sweets**: Things you want to do - fun and enjoyable tasks
- **🥦 Vegetables**: Things you need to do - important and necessary tasks  
- **🥪 Savory**: Neutral but useful tasks - practical and productive
- **🧃 Sides**: Extra fillers or downtime activities - light and easy

## ✨ Features

- **AI-Powered Categorization**: Automatically sorts tasks using Groq's fast LLM models
- **Beautiful Discord Embeds**: Rich visual interface with emojis and colors
- **Interactive Commands**: Full slash command support with buttons
- **Task Management**: Add, complete, delete, and organize tasks
- **Progress Tracking**: Monitor your productivity and achievements
- **Balance Recommendations**: Get tips for maintaining a healthy task mix
- **Voice Capabilities**: Join voice channels, speak messages, and announce task updates
- **Railway Deployment**: Runs on Linux servers (no macOS compatibility issues!)

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- Discord Bot Token
- Groq API Key
- Discord Bot Token

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd lunchbox-discord-bot
npm install
```

### 2. Environment Setup

Copy `env.example` to `.env` and fill in your values:

```bash
cp env.example .env
```

Edit `.env` with your actual values:

```env
DISCORD_TOKEN=your_discord_bot_token_here
DISCORD_CLIENT_ID=your_discord_client_id_here
GROQ_API_KEY=your_groq_api_key_here
BOT_PREFIX=!
```

### 3. Deploy Commands

```bash
npm run deploy
```

### 4. Start the Bot

```bash
npm start
```

For development with auto-restart:

```bash
npm run dev
```

## 📋 Commands

| Command | Description | Usage |
|---------|-------------|-------|
| `/addtask` | Add a new task | `/addtask [task description]` |
| `/lunchbox` | View your organized tasks | `/lunchbox` |
| `/completetask` | Mark task as done | `/completetask [task_id]` |
| `/deletetask` | Remove a task | `/deletetask [task_id]` |
| `/clearcompleted` | Clear all completed tasks | `/clearcompleted` |
| `/voice join` | Join your voice channel | `/voice join` |
| `/voice speak` | Make bot speak a message | `/voice speak [message]` |
| `/voice announce` | Voice announcements | `/voice announce [type]` |
| `/help` | Show help and tips | `/help` |

## 🎯 How It Works

1. **Add Tasks**: Use `/addtask` or mention the bot with a task
2. **AI Categorization**: OpenAI automatically sorts tasks into food categories
3. **Organized View**: Check `/lunchbox` to see your categorized tasks
4. **Track Progress**: Complete tasks and watch your lunchbox empty
5. **Stay Balanced**: Get recommendations for maintaining task variety

## 🚂 Railway Deployment

This bot is designed to run on Railway's Linux infrastructure, avoiding macOS compatibility issues.

### Deploy to Railway

1. **Install Railway CLI**:
   ```bash
   npm install -g @railway/cli
   ```

2. **Login to Railway**:
   ```bash
   railway login
   ```

3. **Initialize Project**:
   ```bash
   railway init
   ```

4. **Set Environment Variables**:
   ```bash
   railway variables set DISCORD_TOKEN=your_token
   railway variables set DISCORD_CLIENT_ID=your_client_id
   railway variables set DISCORD_GUILD_ID=your_guild_id
   railway variables set OPENAI_API_KEY=your_openai_key
   ```

5. **Deploy**:
   ```bash
   railway up
   ```

### Railway Benefits

- **Linux Environment**: No macOS compatibility issues
- **Auto-scaling**: Handles traffic spikes automatically
- **SSL/HTTPS**: Secure connections out of the box
- **Custom Domains**: Easy domain management
- **Environment Variables**: Secure secret management

## 🔧 Configuration

### Discord Bot Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to "Bot" section and create a bot
4. Copy the bot token
5. Enable required intents:
   - Message Content Intent
   - Server Members Intent
6. Invite bot to your server with proper permissions

### Groq Setup

1. Sign up at [Groq](https://console.groq.com/)
2. Get your API key from the dashboard
3. Add it to your environment variables

## 📁 Project Structure

```
lunchbox-discord-bot/
├── src/
│   ├── commands/          # Bot commands
│   │   ├── addtask.js     # Add new tasks
│   │   ├── lunchbox.js    # View organized tasks
│   │   ├── completetask.js # Mark tasks complete
│   │   ├── deletetask.js  # Remove tasks
│   │   ├── clearcompleted.js # Clear completed tasks
│   │   └── help.js        # Help and documentation
│   ├── index.js           # Main bot file
│   └── deploy-commands.js # Command registration
├── Dockerfile             # Railway deployment
├── railway.json           # Railway configuration
├── package.json           # Dependencies and scripts
├── env.example            # Environment template
└── README.md              # This file
```

## 🎨 Customization

### Adding New Categories

Edit `src/commands/addtask.js` to modify the `TASK_CATEGORIES` object:

```javascript
const TASK_CATEGORIES = {
  '🍪 Sweets': { description: '...', color: 0xFFB6C1 },
  '🥦 Vegetables': { description: '...', color: 0x90EE90 },
  // Add your new category here
  '🍕 Pizza': { description: '...', color: 0xFF6347 }
};
```

### Changing Colors

Modify the color values in the categories object. Colors are in hexadecimal format.

### Adding New Commands

1. Create a new file in `src/commands/`
2. Follow the existing command structure
3. Add it to the deployment script
4. Update the help command

## 🐛 Troubleshooting

### Common Issues

**Bot not responding**: Check if the bot is online and has proper permissions
**Commands not working**: Run `npm run deploy` to register slash commands
**AI categorization failing**: Verify your Groq API key is valid
**Railway deployment issues**: Check the Railway logs for error details

### Debug Mode

Enable debug logging by setting:

```env
DEBUG=discord.js:*
```

### Logs

Check Railway logs with:

```bash
railway logs
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Discord.js team for the amazing Discord API wrapper
- Groq for AI-powered task categorization
- Railway for reliable Linux hosting
- The productivity community for inspiration

---

**Made with ❤️ and lots of 🍱 by the Lunchbox team!**

*Remember: A balanced lunchbox makes for a productive day! 🥪*
=======
# DiscordBotLunchbox01
>>>>>>> 755f24c675030960a5f118941bd9c8539d4773a7
