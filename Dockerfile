# Сборка сайта WENTKOMPANY.
# Многоступенчатый образ: в финальный слой едет только standalone-сборка,
# без исходников и dev-зависимостей. Итог — около 200 МБ вместо полутора гигабайт.

# ---------- зависимости ----------
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# ---------- сборка ----------
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Публичные переменные вшиваются в бандл на этапе сборки, а не в рантайме.
# Timeweb: передаются build-args из docker-compose.
# Amvera: переменные панели на сборке недоступны — читаем amvera.build.env из git.
ARG NEXT_PUBLIC_SITE_URL=https://wentkompany.ru
ARG NEXT_PUBLIC_YM_ID=
ARG ENABLE_HSTS=0
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_YM_ID=$NEXT_PUBLIC_YM_ID
ENV ENABLE_HSTS=$ENABLE_HSTS
ENV NEXT_TELEMETRY_DISABLED=1

COPY amvera.build.env* ./
RUN set -a \
  && { [ -f amvera.build.env ] && . ./amvera.build.env; true; } \
  && set +a \
  && npm run build

# ---------- рантайм ----------
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# не от root
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

# Проверка живости для оркестратора: главная должна отдавать 200
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
