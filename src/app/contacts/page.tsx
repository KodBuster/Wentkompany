import type { Metadata } from 'next';
import { LeadForm } from '@/components/lead-form';
import { PageBackdrop } from '@/components/page-backdrop';
import { site } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Контакты и заявка',
  description: 'Расчёт комплекта, замер и изготовление зонтов по размерам объекта. Москва и область.',
  alternates: { canonical: '/contacts' },
};

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ cfg?: string; mode?: string }>;
}) {
  const { cfg, mode: rawMode } = await searchParams;
  const mode = rawMode === 'order' || rawMode === 'quote' ? rawMode : undefined;

  const isOrder = mode === 'order';
  const isQuote = mode === 'quote';

  return (
    <section className="band band-shop page-hero band--backdrop">
      <PageBackdrop theme="steel" />
      <div className="wrap grid gap-10 lg:grid-cols-[1fr_420px]">
        <div>
          <div className="backdrop-copy">
            <div className="head">
              <p className="lbl">Заявка</p>
              <h1>
                {isOrder
                  ? 'Оформим заказ по вашей сборке'
                  : isQuote
                    ? 'Посчитаем точную цену по вводным'
                    : 'Проверим объект и пришлём расчёт'}
              </h1>
              <p className="muted mt-6 leading-relaxed">
                {isOrder
                  ? 'Конфигурация уже в заявке. Нужен пакет документов: чертёж, КП и спецификация — производство подтвердит срок и сумму.'
                  : isQuote
                    ? 'Приложите эскизы, чертежи и пояснения — производство пересчитает по вашим вводным, а не только по типовому габариту.'
                    : 'Опишите задачу — ответим с ориентиром по сроку и цене. Для объектов с открытым огнём приложим схему тракта по пп. 5.28–5.33 и спецификацию комплекта.'}
              </p>
            </div>
          </div>
          <div className="tiles mt-8" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))' }}>
            <div className="tile">
              <span className="lbl">Телефон</span>
              <a href={site.phoneHref} className="num text-lg no-underline">{site.phone}</a>
            </div>
            <div className="tile">
              <span className="lbl">Почта</span>
              <a href={`mailto:${site.email}`} className="num text-lg no-underline">{site.email}</a>
            </div>
            <div className="tile">
              <span className="lbl">География</span>
              <span>{site.address}</span>
            </div>
            <div className="tile">
              <span className="lbl">Часы работы</span>
              <span className="num">{site.hours}</span>
            </div>
          </div>
          <p className="lbl mt-6">Реквизиты и адрес производства подставим из карточки компании.</p>
        </div>
        <LeadForm configuration={cfg} mode={mode} />
      </div>
    </section>
  );
}
