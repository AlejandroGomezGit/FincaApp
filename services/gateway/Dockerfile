FROM nginx:1.27-alpine

RUN rm /etc/nginx/conf.d/default.conf 2>/dev/null || true
COPY nginx.conf /etc/nginx/nginx.conf

# nginx:alpine ya corre como usuario no-root "nginx" en los procesos worker;
# el master process necesita permisos para bindear el puerto y escribir PIDs,
# lo cual la imagen base ya deja configurado correctamente por defecto.

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -qO- http://127.0.0.1:80/ >/dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]
