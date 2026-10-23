
FROM node:24-bookworm-slim

# Install OpenSSL so Prisma can detect the correct system library.
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Prisma client generation does not require a live database.
ENV DATABASE_URL="postgresql://build:build@127.0.0.1:5432/builddb?schema=public"

COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --fetch-retries=5 --fetch-timeout=300000 --maxsockets=1

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Apply committed migrations before starting the API.
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
