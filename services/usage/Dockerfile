FROM node:24.18.1-trixie-slim@sha256:10c950bed4f33b3cedac92b6a46a14f18b8bf4bed18affbf86c871d9bc0d0a91 AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
COPY scripts/check-runtime.mjs ./scripts/check-runtime.mjs
COPY apps/web/package.json ./apps/web/package.json
COPY services/identity/package.json ./services/identity/package.json
COPY services/content/package.json ./services/content/package.json
COPY services/usage/package.json ./services/usage/package.json
RUN npm ci --omit=dev --workspace=@vinlook/usage --include-workspace-root=false --no-audit --no-fund

FROM node:24.18.1-trixie-slim@sha256:10c950bed4f33b3cedac92b6a46a14f18b8bf4bed18affbf86c871d9bc0d0a91 AS runtime
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY services/usage/package.json ./services/usage/package.json
COPY services/usage/src ./services/usage/src
ENV NODE_ENV=production HOST=0.0.0.0 PORT=10000
USER node
WORKDIR /app/services/usage
EXPOSE 10000
CMD ["node", "src/server.js"]
