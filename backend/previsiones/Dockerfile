# Stage 1: Build Stage
FROM node:18 AS builder

# Set the working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install all dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Compile TypeScript to JavaScript
RUN npx tsc

# Stage 2: Production Stage
FROM ghcr.io/puppeteer/puppeteer:23.0.2


# Install necessary dependencies for Chromium
RUN apt-get update && apt-get install -y \
    gconf-service \
    libasound2 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libfontconfig1 \
    libgbm1 \
    libgconf-2-4 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libxss1 \
    libxtst6 \
    xdg-utils \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libcurl4 \
    libatk-bridge2.0-0 \
    libx11-xcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxi6 \
    libxtst6 \
    libxrandr2 \
    libxdamage1 \
    libxfixes3 \
    dbus-x11 \
    --no-install-recommends && rm -rf /var/lib/apt/lists/*


# Set environment variables
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# Set the working directory
WORKDIR /usr/src/app

# Copy only necessary files from the build stage
COPY package*.json ./

# Install only production dependencies
RUN npm install --only=production

# Copy the compiled JavaScript files from the builder stage
COPY --from=builder /usr/src/app/dist ./dist

# Expose the desired port
EXPOSE 3001
# Specify the command to run your app
CMD ["node", "dist/index.js"]
