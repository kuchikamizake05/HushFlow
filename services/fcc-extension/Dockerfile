# syntax=docker/dockerfile:1
# This image packages only the HushFlow extension process. The organizer-pinned
# tee-node remains a separate process in the same network namespace.
FROM node:24.18.0-bookworm-slim AS build

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json ./
COPY packages/protocol/package.json packages/protocol/package.json
COPY services/fcc-extension/package.json services/fcc-extension/package.json
RUN corepack enable && pnpm install --frozen-lockfile --filter @hushflow/fcc-extension...

COPY packages/protocol packages/protocol
COPY services/fcc-extension services/fcc-extension
RUN pnpm --filter @hushflow/fcc-extension build

FROM node:24.18.0-bookworm-slim AS runtime

ENV NODE_ENV=production
ENV EXTENSION_PORT=7702
ENV SIGN_PORT=7701

WORKDIR /app

COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/packages/protocol /app/packages/protocol
COPY --from=build /app/services/fcc-extension /app/services/fcc-extension

WORKDIR /app/services/fcc-extension
EXPOSE 7702

CMD ["node", "dist/main.js"]
