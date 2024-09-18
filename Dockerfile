# Base image
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

# Copy Nginx configuration template
WORKDIR /app
COPY backend/nginx/nginx.conf.template /etc/nginx/nginx.conf.template

# Expose the necessary port
EXPOSE ${PORT}

# Copy the PM2 ecosystem file
COPY ecosystem.config.js .

# Start Nginx and services using PM2
CMD sh -c "envsubst '\$PORT' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf && pm2-runtime ecosystem.config.js && nginx -g 'daemon off;'"
