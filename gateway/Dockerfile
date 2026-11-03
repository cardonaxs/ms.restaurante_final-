# Usar una imagen oficial y ligera de Node.js
FROM node:22-alpine

WORKDIR /app

COPY gateway/package*.json ./
RUN npm ci --omit=dev

COPY gateway/index.js ./index.js

EXPOSE 3000

CMD ["node", "index.js"]