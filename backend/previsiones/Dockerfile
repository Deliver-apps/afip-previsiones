# Stage 1: Build 'previsiones' service using its own Dockerfile
FROM ghcr.io/puppeteer/puppeteer:23.0.2 AS build-previsiones

# Set environment variables for Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

WORKDIR /usr/src/app/previsiones

# Copy the previsiones package files
COPY backend/previsiones/package*.json ./
RUN npm install

# Copy the rest of the previsiones code
COPY backend/previsiones/ ./
RUN npm run build

# Stage 2: Node.js and Nginx Setup
FROM node:20-alpine

# Install dependencies for Nginx and build tools
RUN apk update && apk add --no-cache \
    nginx \
    gettext \
    python3 \
    make \
    g++

# Install PM2 globally
RUN npm install pm2 -g

# Set the working directory
WORKDIR /app

# Copy the built 'previsiones' service from Stage 1
COPY --from=build-previsiones /usr/src/app/previsiones /app/previsiones

# Install dependencies and build 'facturador'
WORKDIR /app/backend/facturador
COPY backend/facturador/package*.json ./
RUN npm install
COPY backend/facturador/ ./
RUN npm run build

# Copy Nginx configuration template
WORKDIR /app
COPY backend/nginx/nginx.conf.template /etc/nginx/nginx.conf.template

# Expose the necessary port
EXPOSE ${PORT}

# Copy the PM2 ecosystem file
COPY ecosystem.config.js .

# Start Nginx and services using PM2
CMD sh -c "envsubst '\$PORT' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf && pm2-runtime ecosystem.config.js"
