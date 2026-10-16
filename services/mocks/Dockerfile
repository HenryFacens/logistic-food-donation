FROM node:20.19-alpine AS build

WORKDIR /app
COPY services/mocks/package.json services/mocks/tsconfig.json ./
RUN npm install --include=dev --no-package-lock
COPY tsconfig.json /workspace-tsconfig.json
COPY services/mocks/src src
COPY services/mocks/tests tests
RUN sed -i 's#"../../tsconfig.json"#"/workspace-tsconfig.json"#' tsconfig.json
RUN npm run build && npm prune --omit=dev

FROM node:20.19-alpine

ENV NODE_ENV=production \
    PORT=3000
WORKDIR /app
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules node_modules
COPY --from=build /app/dist dist
USER node

EXPOSE 3000
CMD ["node", "dist/src/index.js"]
