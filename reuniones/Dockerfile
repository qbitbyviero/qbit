# Imagen base con Node.js
FROM node:18

# Crea directorio de trabajo
WORKDIR /app

# Copia dependencias
COPY package*.json ./

# Instala dependencias
RUN npm install

# Copia el resto del código
COPY . .

# Expone el puerto 3000
EXPOSE 3000

# Comando de inicio
CMD [ "node", "server.js" ]
