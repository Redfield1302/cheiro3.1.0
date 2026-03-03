FROM node:20-bookworm-slim AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
ENV NODE_OPTIONS=--max-old-space-size=1024
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
