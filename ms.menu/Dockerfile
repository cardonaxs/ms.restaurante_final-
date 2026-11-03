# Usar imagen ligera de Node.js
FROM node:22-alpine

# Directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias de producción
RUN npm install --production

# Copiar el código fuente y carpetas (src, etc.)
COPY . .

# Exponer el puerto del microservicio de pedidos (ajusta si usas otro, por ejemplo 3002)
EXPOSE 3002

# Comando de inicio apuntando a app.js
CMD ["node", "src/app.js"]