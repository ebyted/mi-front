# Dockerfile para frontend React (Vite) producción
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY . .
# Copiar archivo de variables de entorno de producción
COPY .env.production .env.production
# Establecer variable de entorno para el build
ENV VITE_API_URL=http://168.231.67.221:8030/api/
RUN npm run build

# Servidor estático nginx
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
