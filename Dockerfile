# Base image
FROM node:20-alpine

# Install Chromium and dependencies
RUN apk update && apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    python3 \
    make \
    g++ \
    nginx \
    gettext

# Install PM2 globally and TypeScript
RUN npm install -g pm2 typescript

# Set environment variable to skip Chromium download in Puppeteer
ENV PUPPETEER_SKIP_DOWNLOAD true

# Set working directory
WORKDIR /app

# Copy backend code
COPY backend/ ./backend/

# Copy Puppeteer build from previsiones Dockerfile
COPY backend/previsiones/Dockerfile ./previsiones/Dockerfile
COPY backend/previsiones/ ./previsiones

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

# Expose the necessary port
EXPOSE ${PORT}

# Copy the PM2 ecosystem file
COPY ecosystem.config.js .

# Create a user for Puppeteer and switch to it
RUN addgroup -S pptruser && adduser -S -G pptruser pptruser \
    && mkdir -p /home/pptruser/Downloads \
    && chown -R pptruser:pptruser /home/pptruser
USER pptruser

# Start Nginx and services using PM2
CMD sh -c "envsubst '\$PORT' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf && pm2-runtime ecosystem.config.js && nginx -g 'daemon off;'"
