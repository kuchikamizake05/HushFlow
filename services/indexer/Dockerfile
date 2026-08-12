FROM node:24.18.0-bookworm-slim

ENV PNPM_HOME=/pnpm
ENV COREPACK_HOME=/opt/corepack
ENV PATH=$PNPM_HOME:$PATH

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@11.15.1 --activate
RUN mkdir -p /pnpm && chown -R node:node /pnpm && chmod -R a+rX /opt/corepack

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/protocol/package.json packages/protocol/package.json
COPY services/indexer/package.json services/indexer/package.json
RUN pnpm install --frozen-lockfile --prod=false

COPY packages/protocol packages/protocol
COPY services/indexer services/indexer

USER node

CMD ["pnpm", "--filter", "@hushflow/indexer", "start:api"]
