FROM node:20-slim AS builder
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared ./packages/shared
COPY apps/web/package.json ./apps/web/package.json
RUN npm install
COPY apps/web ./apps/web
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build --workspace=@hub/shared
RUN npm run build --workspace=@hub/web

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN groupadd --system --gid 1001 nodejs
RUN useradd --system --uid 1001 nextjs

COPY --from=builder /app ./

USER nextjs
EXPOSE 3000
ENV PORT=3000

CMD ["npm", "run", "start", "--workspace=@hub/web"]