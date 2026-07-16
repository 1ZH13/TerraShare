FROM oven/bun:1 as builder

WORKDIR /app
COPY package.json ./
COPY apps/web/package.json apps/web/bun.lock ./apps/web/
COPY packages/shared/package.json packages/shared/bun.lock ./packages/shared/

RUN cd packages/shared && bun install --frozen-lockfile
RUN cd apps/web && bun install --frozen-lockfile

COPY . .

WORKDIR /app/apps/web
ARG VITE_CLERK_PUBLISHABLE_KEY
ARG VITE_API_BASE_URL

RUN bun run build

# Copy SPA shell to index.html for nginx (TanStack Start generates _shell.html with hydration support)
RUN cp dist/client/_shell.html dist/client/index.html

FROM nginx:alpine
COPY --from=builder /app/apps/web/dist/client /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
