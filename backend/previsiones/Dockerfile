# Stage 1: Build Stage for 'previsiones' and 'facturador'
FROM ghcr.io/puppeteer/puppeteer:23.0.2 AS build

# Set environment variables for Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# Set the working directory
WORKDIR /usr/src/app

# Copy the package.json and package-lock.json for both services
COPY package*.json ./

# Install dependencies for both services
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the port
EXPOSE 3000

# Stage 2: Set up Nginx with the services
FROM nginx:alpine

# Copy the compiled application from the build stage
COPY --from=build /usr/src/app /usr/src/app

# Copy the Nginx configuration file
COPY ./backend/nginx/nginx.conf /etc/nginx/nginx.conf

# Expose the port that Nginx will listen on
EXPOSE 80

# Start Nginx as the entry point
CMD ["nginx", "-g", "daemon off;"]
