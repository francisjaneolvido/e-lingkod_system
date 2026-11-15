# syntax=docker/dockerfile:1
# e-Lingkod Bayan | Lab Act 3 | main 040049d | Next.js 16 / Prisma 7 / Node 24
# This intentionally uses a full Node runtime for a first, low-change lab build.
# Review and optimize the image before any real production deployment.

FROM node:24-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# Non-secret build placeholders: Prisma generation reads DATABASE_URL but does not migrate.
# The real values are supplied only when the container is started.
ENV DATABASE_URL=mysql://build_user:build_placeholder@db:3306/e_lingkod_lab3
ENV BETTER_AUTH_SECRET=build-only-placeholder-not-a-production-authentication-secret
ARG NEXT_PUBLIC_APP_URL=http://localhost:3001
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
ENV BETTER_AUTH_URL=${NEXT_PUBLIC_APP_URL}

COPY package.json package-lock.json ./
COPY prisma/ ./prisma/
COPY prisma.config.ts ./
COPY scripts/ ./scripts/
# postinstall generates the repository's custom Prisma Client.
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

FROM node:24-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000
# Keep the same build, Next configuration and generated Prisma Client.
# The full runtime is deliberate for lab compatibility; it can be slimmed later.
COPY --from=builder /app ./
RUN mkdir -p /app/.next/cache && chown -R node:node /app/.next
USER node
EXPOSE 3000
CMD ["npm", "run", "start", "--", "--hostname", "0.0.0.0", "--port", "3000"]
