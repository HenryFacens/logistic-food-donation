FROM node:20.19-alpine AS build

WORKDIR /workspace
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc tsconfig.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY services/workers/package.json services/workers/package.json
RUN pnpm --config.engine-strict=false install --frozen-lockfile --filter @resgata/workers...

COPY packages/shared packages/shared
COPY services/workers services/workers
RUN pnpm --filter @resgata/workers... build
RUN pnpm --config.engine-strict=false --filter @resgata/workers --prod deploy --legacy /out

FROM mcr.microsoft.com/azure-functions/node:4-node20

ENV AzureWebJobsScriptRoot=/home/site/wwwroot \
    AzureFunctionsJobHost__Logging__Console__IsEnabled=true

COPY --from=build /out /home/site/wwwroot

EXPOSE 80
