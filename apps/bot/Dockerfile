FROM node:20-slim AS builder
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared ./packages/shared
COPY apps/bot/package.json ./apps/bot/package.json
RUN npm install
COPY apps/bot ./apps/bot
RUN npm run build --workspace=@hub/shared
RUN npm run build --workspace=@hub/bot

FROM node:20-slim
WORKDIR /app
COPY --from=builder /app ./
EXPOSE 8080
CMD ["npm", "run", "start", "--workspace=@hub/bot"]