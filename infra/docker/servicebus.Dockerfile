FROM node:20.19-bookworm-slim AS probe

FROM mcr.microsoft.com/azure-messaging/servicebus-emulator:2.0.1

COPY --from=probe /usr/local/bin/node /usr/local/bin/node
COPY infra/servicebus/healthcheck.mjs /opt/resgata/healthcheck.mjs
