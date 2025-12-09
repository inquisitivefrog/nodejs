# Use official Node.js LTS image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install

# Copy application files
COPY src/ ./src/
COPY scripts/ ./scripts/
COPY package.json ./

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]

