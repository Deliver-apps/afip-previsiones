# Use a proper base image compatible with Puppeteer
FROM ghcr.io/puppeteer/puppeteer:23.0.2

# Set environment variables
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# Set the working directory
WORKDIR /usr/src/app

# Expose the application port
EXPOSE 3000

# Switch to root user to install necessary packages
USER root

# Install dependencies required for running Chrome in headless mode
RUN apt-get update && \
    apt-get install -y \
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
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/* && \
    apt-get clean

# Switch back to non-root user
USER pptruser

# Copy package.json and package-lock.json files
COPY package*.json ./

# Install npm dependencies with unsafe-perm
RUN npm install --unsafe-perm

# Install TypeScript globally as root
USER root
RUN npm install -g typescript --unsafe-perm
USER pptruser

# Copy the rest of the application code
COPY . .

# Compile TypeScript to JavaScript
RUN tsc

# Configure environment for Puppeteer
ENV DISPLAY=:99
ENV CHROME_BIN=/usr/bin/google-chrome-stable

# Command to run the application
CMD ["node", "dist/index.js"]
