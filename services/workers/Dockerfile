FROM node:20.19-alpine AS build

WORKDIR /workspace
RUN corepack enable

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.json ./
COPY packages/shared/package.json packages/shared/tsconfig*.json packages/shared/
COPY packages/shared/src packages/shared/src
COPY services/workers/package.json services/workers/tsconfig.json services/workers/host.json services/workers/
COPY services/workers/src services/workers/src
COPY services/workers/tests services/workers/tests

RUN pnpm install --filter @resgata/shared --filter @resgata/workers --no-frozen-lockfile
RUN pnpm --filter @resgata/shared build
RUN pnpm --filter @resgata/workers build

FROM mcr.microsoft.com/azure-functions/node:4-node20

ENV AzureWebJobsScriptRoot=/home/site/wwwroot/services/workers \
    AzureFunctionsJobHost__Logging__Console__IsEnabled=true \
    NODE_ENV=production

COPY --from=build /workspace /home/site/wwwroot

WORKDIR /home/site/wwwroot/services/workers
