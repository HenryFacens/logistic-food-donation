FROM node:20.19-alpine AS build

WORKDIR /workspace
RUN corepack enable

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY services/api/package.json services/api/package.json
RUN pnpm install --no-frozen-lockfile --filter @resgata/api...

COPY packages/shared packages/shared
COPY services/api services/api
RUN pnpm --filter @resgata/shared build \
    && pnpm --filter @resgata/api build \
    && pnpm --filter @resgata/api deploy --prod --legacy /out

FROM mcr.microsoft.com/azure-functions/node:4-node20

ENV AzureWebJobsScriptRoot=/home/site/wwwroot \
    AzureFunctionsJobHost__Logging__Console__IsEnabled=true

COPY --from=build /out /home/site/wwwroot
COPY --from=build /workspace/services/api/dist /home/site/wwwroot/dist
COPY services/api/host.json /home/site/wwwroot/host.json
