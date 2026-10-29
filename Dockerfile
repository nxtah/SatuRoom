# Satu image untuk web, sport, fnb, dan mahjong: workspace dibangun sekali, tiap layanan memilih folder dan perintahnya
# di docker-compose. Rahasia tidak ada di image; semuanya datang dari env_file saat berjalan.
FROM node:22-bookworm-slim
RUN corepack enable && mkdir /app && chown node:node /app
USER node
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY --chown=node:node pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY --chown=node:node core/package.json core/
COPY --chown=node:node web/package.json web/
COPY --chown=node:node sport/package.json sport/
COPY --chown=node:node fnb/package.json fnb/
COPY --chown=node:node mahjong/package.json mahjong/
RUN pnpm install --frozen-lockfile

COPY --chown=node:node . .
# Nama paket, bukan nama folder: filter yang tidak cocok diam-diam tidak membangun apa pun.
RUN pnpm --filter saturoom-web build
RUN pnpm --filter @saturoom/sport build
RUN pnpm --filter fnb build
RUN pnpm --filter @saturoom/mahjong build
RUN test -f web/.next/BUILD_ID && test -f sport/.next/BUILD_ID && test -f fnb/.next/BUILD_ID && test -f mahjong/.next/BUILD_ID
ENV NODE_ENV=production
