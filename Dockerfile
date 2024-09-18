# Stage 1: Build the TypeScript code for 'previsiones'
FROM ghcr.io/puppeteer/puppeteer:23.0.2 AS build-previsiones

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

WORKDIR /usr/src/app/previsiones

COPY backend/previsiones/package*.json ./
RUN npm install

COPY backend/previsiones ./

# Compile TypeScript to JavaScript
RUN npm run build

# Stage 2: Build the TypeScript code for 'facturador'
FROM ghcr.io/puppeteer/puppeteer:23.0.2 AS build-facturador

WORKDIR /usr/src/app/facturador

COPY backend/facturador/package*.json ./
RUN npm install

COPY backend/facturador ./

# Compile TypeScript to JavaScript
RUN npm run build

# Stage 3: Set up Nginx with both services
FROM nginx:alpine

COPY backend/nginx/nginx.conf /etc/nginx/nginx.conf

COPY --from=build-previsiones /usr/src/app/previsiones/dist /usr/share/nginx/html/previsiones
COPY --from=build-facturador /usr/src/app/facturador/dist /usr/share/nginx/html/facturador

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
