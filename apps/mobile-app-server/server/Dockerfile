# Use official Node.js LTS image
FROM node:20-alpine

# Install wget for health checks
RUN apk add --no-cache wget

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies (including devDependencies for testing)
# Unset NODE_ENV to ensure devDependencies are installed
RUN unset NODE_ENV && npm install

# Copy application files
COPY src/ ./src/
COPY scripts/ ./scripts/
COPY tests/ ./tests/

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]

