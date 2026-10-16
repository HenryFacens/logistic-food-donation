FROM node:20.19-alpine AS build

WORKDIR /workspace
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc tsconfig.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/web/package.json apps/web/package.json
RUN pnpm --config.engine-strict=false install --frozen-lockfile --filter @resgata/web...

COPY packages/shared packages/shared
COPY apps/web apps/web
RUN pnpm --filter @resgata/web... build

FROM nginx:1.29-alpine

COPY infra/nginx/web.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/apps/web/dist /usr/share/nginx/html

EXPOSE 8080
