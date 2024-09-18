# Stage 1: Build the TypeScript code for 'previsiones'
FROM ghcr.io/puppeteer/puppeteer:23.0.2 AS build-previsiones

# Set environment variables for Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# Set the working directory
WORKDIR /usr/src/app/previsiones

# Copy package.json and package-lock.json for 'previsiones'
COPY ./previsiones/package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY ./backend/previsiones ./

# Compile TypeScript to JavaScript
RUN npm run build

# Stage 2: Build the TypeScript code for 'facturador'
FROM ghcr.io/puppeteer/puppeteer:23.0.2 AS build-facturador

WORKDIR /usr/src/app/facturador

# Copy package.json and package-lock.json for 'facturador'
COPY ./facturador/package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY ./backend/facturador ./

# Compile TypeScript to JavaScript
RUN npm run build

# Stage 3: Set up Nginx with both services
FROM nginx:alpine

# Copy Nginx configuration file
COPY ./nginx/nginx.conf /etc/nginx/nginx.conf

# Copy the built 'previsiones' and 'facturador' services
COPY --from=build-previsiones /usr/src/app/previsiones/dist /usr/share/nginx/html/previsiones
COPY --from=build-facturador /usr/src/app/facturador/dist /usr/share/nginx/html/facturador

# Expose the port Nginx will listen on
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
