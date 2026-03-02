FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install

COPY prisma ./prisma
COPY src ./src
COPY .env.example ./.env.example

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && node src/server.js"]
