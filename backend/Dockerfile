FROM ghcr.io/puppeteer/puppeteer:23.0.2

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

WORKDIR /usr/src/app

EXPOSE 3000

COPY package*.json ./
RUN npm i
COPY . .
CMD [ "node", "app.js" ]
