# Base image from Puppeteer
FROM ghcr.io/puppeteer/puppeteer:23.0.2

# Set environment variables to skip Chromium download
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# Set the working directory
WORKDIR /usr/src/app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application code
COPY . .

# Build TypeScript code
RUN npm run build

# Expose the necessary port (if needed)
EXPOSE 3000

# Command to run the Puppeteer scraper
CMD ["node", "dist/index.js"]
