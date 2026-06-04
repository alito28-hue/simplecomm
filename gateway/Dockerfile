FROM node:22-alpine

WORKDIR /app

# Instalar OpenSSL (por si se necesita en el futuro, pero pkijs no lo requiere)
RUN apk add --no-cache openssl

COPY package*.json ./
RUN npm ci --only=production

COPY prisma ./prisma
RUN npx prisma generate

COPY . .

EXPOSE 3001

CMD ["npm", "start"]
