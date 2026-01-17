# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/backend/package*.json ./packages/backend/
COPY packages/shared/package*.json ./packages/shared/

# Install dependencies
RUN npm ci

# Copy source code
COPY packages/backend ./packages/backend
COPY packages/shared ./packages/shared

# Build shared package
WORKDIR /app/packages/shared
RUN npm run build

# Build backend
WORKDIR /app/packages/backend
RUN npx prisma generate
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/backend/package*.json ./packages/backend/

# Install production dependencies only
RUN npm ci --only=production

# Copy built files from builder
COPY --from=builder /app/packages/backend/dist ./packages/backend/dist
COPY --from=builder /app/packages/backend/prisma ./packages/backend/prisma
COPY --from=builder /app/packages/backend/node_modules/.prisma ./packages/backend/node_modules/.prisma
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist

WORKDIR /app/packages/backend

EXPOSE 3000

CMD ["node", "dist/server.js"]
