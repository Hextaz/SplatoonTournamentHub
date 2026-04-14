# Base image
FROM node:20-alpine AS builder
# Create app directory
WORKDIR /app
# Install app dependencies (we only need package.json/package-lock.json of the bot for now, but in monorepo we might copy all)
COPY package.json package-lock.json ./
RUN npm ci
# Copy source code
COPY . .
# Build the typescript project
RUN npm run build

# Production image
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
# Port
EXPOSE 8080
# Run the built app
CMD ["node", "dist/index.js"]