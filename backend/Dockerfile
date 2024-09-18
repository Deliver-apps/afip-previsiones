# Use an official Node.js LTS base image
FROM node:20-alpine

# Install dependencies required for running Puppeteer
RUN apt-get update \
    && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    && apt-get install -y \
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
    --no-install-recommends \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd -r puppeteer \
    && useradd -r -g puppeteer -G audio,video puppeteer \
    && mkdir -p /home/puppeteer/Downloads \
    && chown -R puppeteer:puppeteer /home/puppeteer

# Create and change to the app directory
WORKDIR /app

# Copy package.json and package-lock.json and install dependencies
COPY package*.json ./
RUN npm install

# Install Chrome for Puppeteer
RUN npx puppeteer install

# Copy the rest of the application code
COPY . .

# Compile TypeScript to JavaScript
RUN npm run build

# Set the environment to "production"
ENV NODE_ENV=production

# Specify user to run the app
USER puppeteer

# Command to start the application
CMD ["node", "dist/index.js"]
