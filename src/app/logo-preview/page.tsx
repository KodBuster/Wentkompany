import type { Metadata } from 'next';
import { BrandLogo, LOGO_PREVIEW_VARIANTS } from '@/components/brand-logo';

export const metadata: Metadata = {
  title: 'Примерка логотипа',
  robots: { index: false, follow: false },
};

/**
 * Временная страница для скринов вариантов E–H.
 * Не в меню — только прямой URL.
 */
export default function LogoPreviewPage() {
  return (
    <main className="logo-preview">
      <div className="wrap logo-preview__intro">
        <p className="lbl">Временно · не для индекса</p>
        <h1>Примерка логотипа</h1>
        <p className="muted">Четыре новых варианта в контексте шапки — снимай скрин с каждого блока.</p>
      </div>

      {LOGO_PREVIEW_VARIANTS.map((v) => (
        <section key={v.id} className="logo-preview__block">
          <div className="wrap">
            <header className="logo-preview__meta">
              <h2>{v.title}</h2>
              <p className="muted">{v.note}</p>
            </header>
          </div>
          <div className="logo-preview__bar" aria-label={`Вариант ${v.id} в шапке`}>
            <div className="wrap flex min-h-[4.75rem] items-center gap-5">
              <BrandLogo variant={v.id} />
              <span className="logo-preview__nav-ghost muted">Нормы · Каталог · Конфигуратор</span>
              <span className="btn logo-preview__btn-ghost">Собрать зонт</span>
            </div>
          </div>
          <div className="wrap logo-preview__solo">
            <BrandLogo variant={v.id} />
          </div>
        </section>
      ))}
    </main>
  );
}
