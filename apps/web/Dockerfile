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
    JS_FILE=$(ls assets/index-*.js | head -1) && \
    printf '<!DOCTYPE html>\n<html lang="es">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<title>TerraShare</title>\n</head>\n<body>\n<div id="root"></div>\n<script type="module" src="/%s"></script>\n</body>\n</html>\n' "$JS_FILE" > index.html

FROM nginx:alpine
COPY --from=builder /app/apps/web/dist/client /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
