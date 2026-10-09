'use client';

import { useEffect } from 'react';

/**
 * Старый URL листинга /catalog больше не нужен —
 * перекидываем на якорь каталога на главной.
 */
export function CatalogAnchorRedirect() {
  useEffect(() => {
    window.location.replace('/#catalog');
  }, []);

  return (
    <main className="band">
      <div className="wrap py-16">
        <p className="muted">
          Переходим в каталог…{' '}
          <a href="/#catalog" className="underline">
            Открыть
          </a>
        </p>
      </div>
    </main>
  );
}
