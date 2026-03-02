FROM node:22-alpine AS build

WORKDIR /app

# Install dependencies
COPY package.json ./
RUN npm install

# Copy source and build
COPY tsconfig.json ./
COPY drizzle.config.ts ./
COPY src/ ./src/

RUN npx tsc

FROM node:22-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY --from=build /app/dist ./dist
COPY --from=build /app/src/db/migrations ./dist/db/migrations

# Create file storage directory
RUN mkdir -p /data/files

EXPOSE 3001

CMD ["node", "dist/index.js"]
