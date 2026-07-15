FROM oven/bun:1.1 as builder

WORKDIR /app
COPY package.json ./
COPY apps/backend-api/package.json ./apps/backend-api/
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/

RUN cd packages/shared && bun install --frozen-lockfile
RUN cd apps/backend-api && bun install --frozen-lockfile

COPY . .

WORKDIR /app/apps/backend-api
ENV NODE_ENV=production

EXPOSE 3000
CMD ["bun", "run", "start"]
