# Use official Node.js LTS image
FROM node:20-alpine

# Install wget for health checks
RUN apk add --no-cache wget

# Set working directory
WORKDIR /app

# Copy package files (don't use package-lock.json to ensure fresh install)
COPY package.json ./

# Install dependencies (including devDependencies for testing)
# Unset NODE_ENV to ensure devDependencies are installed
# Use npm ci for faster, reliable, reproducible builds, or npm install if no lock file
RUN unset NODE_ENV && npm install && npm list jest supertest || npm install jest supertest --save-dev

# Copy application files
COPY src/ ./src/
COPY scripts/ ./scripts/
COPY tests/ ./tests/

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]

