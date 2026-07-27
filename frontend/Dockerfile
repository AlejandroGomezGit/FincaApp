FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build -- --configuration production

FROM nginx:1.27-alpine AS runtime
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist/frontend/browser /usr/share/nginx/html

# La imagen base arranca como root y nginx baja privilegios a "nginx" (uid
# 101) para los workers, pero en k8s forzamos TODO el proceso (master
# incluido) a correr como no-root desde el inicio — así que estos directorios,
# que nginx normalmente crea/posee él mismo al arrancar como root, hay que
# dejarlos ya creados y con dueño correcto en tiempo de build.
RUN mkdir -p /var/cache/nginx/client_temp /var/cache/nginx/proxy_temp \
      /var/cache/nginx/fastcgi_temp /var/cache/nginx/uwsgi_temp /var/cache/nginx/scgi_temp && \
    chown -R nginx:nginx /var/cache/nginx /var/run /var/log/nginx /usr/share/nginx/html && \
    touch /var/run/nginx.pid && chown nginx:nginx /var/run/nginx.pid

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -qO- http://127.0.0.1:8080/ >/dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]
