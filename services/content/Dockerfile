FROM node:24.18.1-trixie-slim@sha256:10c950bed4f33b3cedac92b6a46a14f18b8bf4bed18affbf86c871d9bc0d0a91 AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
COPY scripts/check-runtime.mjs ./scripts/check-runtime.mjs
COPY apps/web/package.json ./apps/web/package.json
COPY services/identity/package.json ./services/identity/package.json
COPY services/content/package.json ./services/content/package.json
COPY services/usage/package.json ./services/usage/package.json
RUN npm ci --omit=dev --workspace=@vinlook/content --include-workspace-root=false --no-audit --no-fund

FROM node:24.18.1-trixie-slim@sha256:10c950bed4f33b3cedac92b6a46a14f18b8bf4bed18affbf86c871d9bc0d0a91 AS runtime
RUN apt-get update && apt-get download ffmpeg=7:7.1.5-0+deb13u1 && mv ffmpeg_*.deb pinned-ffmpeg.deb && echo '8669bc77e55393c14e0dd257ba9a916007cb6da0e1074c9b5e1d53812024f2af  pinned-ffmpeg.deb' | sha256sum -c - && apt-get install -y --no-install-recommends ./pinned-ffmpeg.deb && rm -f /tmp/pinned-ffmpeg.deb && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY services/content/package.json ./services/content/package.json
COPY services/content/src ./services/content/src
ENV NODE_ENV=production HOST=0.0.0.0 PORT=10000
ENV CONTENT_GEMINI_ENABLED=false
USER node
WORKDIR /app/services/content
EXPOSE 10000
CMD ["node", "src/server.js"]
