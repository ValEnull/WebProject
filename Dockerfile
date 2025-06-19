# Usa l'immagine Node ufficiale come base
FROM node:18

# Imposta la working directory
WORKDIR /app
COPY wait-for-it.sh ./
RUN chmod +x wait-for-it.sh

# Copia i file di dipendenze
COPY package*.json ./

# Installa le dipendenze
RUN npm install

# Copia il resto del codice
COPY . .

# Espone la porta usata dalla tua app (es. 3000)
EXPOSE 3000

# Comando per avviare l'app
CMD ["./wait-for-it.sh", "db", "5432", "--", "node", "server.js"]