# Use Node.js 18 Alpine Linux image (lightweight and Linux-based)
FROM node:18-alpine

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++ git

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Clean up dev dependencies to reduce image size
RUN npm prune --production

# Create a non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S bot -u 1001

# Change ownership of the app directory
RUN chown -R bot:nodejs /app
USER bot

# Expose port (Railway will handle this)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "console.log('Bot is healthy')" || exit 1

# Start the bot
CMD ["npm", "run", "railway"]
