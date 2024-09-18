# Use an official Puppeteer image
FROM ghcr.io/puppeteer/puppeteer:23.0.2

# Set environment variables
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# Set the working directory
WORKDIR /usr/src/app

# Expose the application port
EXPOSE 3000

# Copy the package.json and package-lock.json files
COPY package*.json ./

# Install npm dependencies
RUN npm install

# Install TypeScript globally
RUN npm install -g typescript

# Copy the rest of the application code
COPY . .

# Compile TypeScript to JavaScript
RUN tsc

# Command to run the application
CMD ["node", "dist/index.js"]
