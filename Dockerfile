# Stage 1: Use Puppeteer image to install and build your application
FROM ghcr.io/puppeteer/puppeteer:23.0.2 AS builder

# Set environment variables for Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

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

# Stage 2: Final production image with Node.js and Puppeteer built code
FROM node:20-alpine

# Copy the built application from the builder stage
COPY --from=builder /app /app

# Install PM2 globally
RUN npm install pm2 -g

# Expose the necessary port
EXPOSE ${PORT}

# Start Nginx and services using PM2

# Start Nginx and services using PM2
CMD sh -c "envsubst '\$PORT' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf && pm2-runtime ecosystem.config.js"
