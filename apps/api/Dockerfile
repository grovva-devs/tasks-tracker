FROM node:24-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.12.0 --activate

FROM base AS builder
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
COPY tooling/ tooling/
RUN pnpm install --frozen-lockfile

COPY packages/shared/ packages/shared/
COPY apps/api/ apps/api/
RUN pnpm turbo build --filter=@onboarding-tracker/api

FROM base AS runner
WORKDIR /app
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/node_modules ./node_modules
COPY --from=builder /app/apps/api/package.json ./
COPY --from=builder /app/apps/api/drizzle ./drizzle

ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "dist/main.js"]