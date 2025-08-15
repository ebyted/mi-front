# Dockerfile para frontend React (Vite) producción
# Build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY . .
ENV VITE_API_URL=https://www.sanchodistribuidora.com/api/
RUN npm run build
RUN ls /app/dist

# Production stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
