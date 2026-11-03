# Usar imagen ligera de Node.js
FROM node:22-alpine

# Directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias de producción
RUN npm ci --omit=dev

# Copiar el código fuente del microservicio
COPY . .

# Exponer el puerto del microservicio (ajusta si usa otro puerto diferente a 3003)
EXPOSE 3001

# Comando de inicio
CMD ["node", "src/app.js"]