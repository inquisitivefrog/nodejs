# Use official Node.js LTS image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies (including Jest for testing)
RUN npm install

# Copy the application files
COPY helloworld.js .
COPY helloworld.test.js .
COPY jest.config.js .

# Default command runs the app
CMD ["node", "helloworld.js"]

