# Stage 1: Build the TypeScript code
FROM ghcr.io/puppeteer/puppeteer:23.0.2 AS build

# Set environment variables for Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# Set the working directory
WORKDIR /usr/src/app

# Install build essentials
RUN apt-get update && apt-get install -y build-essential && \
    rm -rf /var/lib/apt/lists/*

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install dependencies, including devDependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Compile TypeScript code to JavaScript with verbose logging
RUN npm run build --verbose

# Stage 2: Run the compiled JavaScript code
FROM ghcr.io/puppeteer/puppeteer:23.0.2

# Set environment variables for Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable \
    NODE_ENV=production

# Set the working directory
WORKDIR /usr/src/app

# Copy only the necessary files from the build stage
COPY --from=build /usr/src/app/package*.json ./
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/dist ./dist

# Expose the application port
EXPOSE 3001

# Start the application using the compiled JavaScript
CMD [ "node", "dist/index.js" ]
