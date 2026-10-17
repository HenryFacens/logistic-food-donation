FROM nginx:1.29-alpine
COPY infra/azure/gateway.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
