# ==============================================================================
# Dockerfile para el Webhook Node.js / Express
# Proyecto: JGIS Publicidad
# ==============================================================================

FROM node:20-alpine

# Crear directorio de la aplicación
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar solo dependencias de producción
RUN npm install --only=production

# Copiar el código fuente, scripts y catálogo de la aplicación
COPY src/ ./src/
COPY scripts/ ./scripts/
COPY catalogo_borrador.csv ./

# Puerto expuesto por Express
EXPOSE 3000

# Variable de entorno de producción por defecto
ENV NODE_ENV=production
ENV PORT=3000

# Comando para iniciar la aplicación
CMD ["npm", "start"]
