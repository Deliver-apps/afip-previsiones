# Base image
FROM node:20-alpine

# Install dependencies for Nginx, build tools, and Puppeteer
RUN apk update && apk add --no-cache \
    nginx \
    gettext \
    python3 \
    make \
    g++ \
    # Puppeteer dependencies
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    # Utilities
    bash \
    curl

# Install PM2 globally and TypeScript
RUN npm install -g pm2 typescript

# Set environment variables for Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    NODE_ENV=production

# Set the working directory
WORKDIR /app

# Copy the backend code
COPY backend/ ./backend/

# Install dependencies and build 'facturador'
WORKDIR /app/backend/facturador
RUN npm install
RUN npm run build

# Install dependencies and build 'previsiones'
WORKDIR /app/backend/previsiones
RUN npm install
RUN npm run build

# Copy Nginx configuration template
WORKDIR /app
COPY backend/nginx/nginx.conf.template /etc/nginx/nginx.conf.template

# Expose the necessary ports
EXPOSE ${PORT} 3001

# Copy the PM2 ecosystem file
COPY ecosystem.config.js .

# Ensure Nginx logs are accessible
RUN mkdir -p /var/log/nginx

# Start Nginx and services using PM2
CMD sh -c "envsubst '\$PORT' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf && \
    pm2-runtime ecosystem.config.js && \
    nginx -g 'daemon off;'"
