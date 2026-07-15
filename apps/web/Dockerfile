FROM oven/bun:1.1 as builder

WORKDIR /app
COPY package.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/

RUN cd packages/shared && bun install --frozen-lockfile
RUN cd apps/web && bun install --frozen-lockfile

COPY . .

WORKDIR /app/apps/web
ARG VITE_CLERK_PUBLISHABLE_KEY
ARG VITE_API_BASE_URL
# m1: Solo ARG — las vars VITE_* se queman en el bundle durante el build.
# Usar ENV las embedia en las capas de la imagen (visible con docker history).
ENV HOST=127.0.0.1

RUN bun run build

FROM nginx:alpine
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
