# Use Puppeteer image as the base (includes Chromium)
FROM ghcr.io/puppeteer/puppeteer:23.0.2

# Set environment variables to skip Chromium download
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# Install Node.js (Puppeteer base doesn't include it)
RUN apt-get update && apt-get install -y \
    nodejs \
    npm

# Set the working directory
WORKDIR /app

# Copy the backend code
COPY backend/ ./backend/

# Install dependencies and build 'previsiones'
WORKDIR /app/backend/previsiones
RUN npm install
RUN npm run build

# Install dependencies and build 'facturador'
WORKDIR /app/backend/facturador
RUN npm install
RUN npm run build

# Expose the necessary port
EXPOSE ${PORT}
