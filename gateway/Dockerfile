# Usar una imagen oficial y ligera de Node.js
FROM node:18-alpine

# Definir el directorio de trabajo dentro del contenedor
WORKDIR /app

# Copiar los archivos de dependencias
COPY package*.json ./

# Instalar las dependencias de producción
RUN npm install --production

# Copiar el resto del código fuente del microservicio
COPY . .

# Exponer el puerto en el que corre el gateway (reemplaza 3000 si usas otro)
EXPOSE 3000

# Comando para iniciar la aplicación
CMD ["node", "index.js"]