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

# Generate index.html SPA shell (client uses createRoot, not hydration)
RUN cd dist/client && \
    echo '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>TerraShare</title>' > index.html && \
    for f in assets/*.css; do [ -f "$f" ] && echo "<link rel=\"stylesheet\" href=\"/$f\">" >> index.html; done && \
    echo '</head><body><div id="root"></div>' >> index.html && \
    for f in assets/index-*.js; do [ -f "$f" ] && echo "<script type=\"module\" src=\"/$f\"></script>" >> index.html; done && \
    echo '</body></html>' >> index.html

FROM nginx:alpine
COPY --from=builder /app/apps/web/dist/client /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
