import type { NextConfig } from 'next';
import redirects from './src/data/redirects.json';

/**
 * 301 со старых URL WooCommerce.
 * Карта генерируется из выгрузки: `npm run data`.
 */
const nextConfig: NextConfig = {
  // самодостаточная сборка: в контейнер едет .next/standalone, а не node_modules целиком
  output: 'standalone',
  poweredByHeader: false,
  async redirects() {
    // statusCode 301, а не permanent: true — Next отдаёт для permanent код 308,
    // а на миграции каталога привычнее и безопаснее классический 301.
    return (redirects as { source: string; destination: string }[]).map((r) => ({
      source: r.source,
      destination: r.destination,
      statusCode: 301 as const,
    }));
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
          // HSTS включаем только когда сайт уже под HTTPS: иначе можно
          // закрыть себе доступ на время настройки сертификата
          ...(process.env.ENABLE_HSTS === '1'
            ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }]
            : []),
        ],
      },
      {
        // картинки каталога версионируются именем файла — можно кэшировать надолго
        source: '/catalog/:file*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=2592000, stale-while-revalidate=86400' }],
      },
      {
        source: '/fonts/:file*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        // выгрузки собираются на лету и содержат цену — не кэшируем нигде
        source: '/api/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store' }],
      },
    ];
  },
};

export default nextConfig;
