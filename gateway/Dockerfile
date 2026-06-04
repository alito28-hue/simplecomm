FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache openssl

# El build context es la raíz del repo — copiamos desde gateway/
COPY gateway/package*.json ./
RUN npm install

COPY gateway/prisma ./prisma
RUN npx prisma generate

COPY gateway/ .

EXPOSE 3001

CMD ["npm", "start"]
