# Usar imagen ligera de Node.js
FROM node:20-alpine

# Directorio de trabajo dentro del contenedor
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias de producción
RUN npm install --production

# Copiar el código fuente y carpetas (src, etc.)
COPY . .

# Exponer el puerto del microservicio (ajusta según corresponda, ej: 3001 para menú)
EXPOSE 3003

# Comando de inicio apuntando a app.js
CMD ["node", "src/app.js"]