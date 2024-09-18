# Use an official node slim image
FROM node:16-slim

# Install necessary packages and dependencies for puppeteer
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    libnss3 \
    libxss1 \
    libasound2 \
    libx11-xcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libgtk-3-0 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libatk1.0-0 \
    xfonts-base \
    xfonts-75dpi \
    fonts-liberation \
    libappindicator3-1 \
    libxshmfence1 \
    libxslt1.1 \
    dbus-x11 \
    --no-install-recommends \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install Chromium (Puppeteer's bundled Chromium)
RUN npm install -g puppeteer --unsafe-perm --allow-root

# Set the working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install npm dependencies
RUN npm install --unsafe-perm

# Install TypeScript globally
RUN npm install -g typescript --unsafe-perm

# Copy the rest of the application code
COPY . .

# Compile TypeScript to JavaScript
RUN tsc

# Set environment variable for Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH="$(node -e 'console.log(require("puppeteer").executablePath())')"

# Expose port 3000 (or whatever your app uses)
EXPOSE 8080

# Command to run the application
CMD ["node", "dist/app.js"]
