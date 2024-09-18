# Base image
FROM node:20-alpine

# Install dependencies for Nginx
RUN apk update && apk add nginx

# Install PM2 globally
RUN npm install pm2 -g

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

# Copy Nginx configuration
COPY backend/nginx/nginx.conf /etc/nginx/nginx.conf

# Expose the necessary ports
EXPOSE 80

# Set the working directory back to /app
WORKDIR /app

# Copy the PM2 ecosystem file
COPY ecosystem.config.js .

# Start all services using PM2
CMD ["pm2-runtime", "ecosystem.config.js"]
