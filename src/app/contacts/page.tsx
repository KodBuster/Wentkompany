import type { Metadata } from 'next';
import { LeadForm } from '@/components/lead-form';
import { site } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Контакты и заявка',
  description: 'Расчёт комплекта, замер и изготовление зонтов по размерам объекта. Москва и область.',
  alternates: { canonical: '/contacts' },
};

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ cfg?: string }>;
}) {
  const { cfg } = await searchParams;
  return (
    <section className="band band-shop">
      <div className="wrap grid gap-10 lg:grid-cols-[1fr_420px]">
        <div>
          <div className="head">
            <p className="lbl">Заявка</p>
            <h1>Проверим объект и пришлём расчёт</h1>
            <p className="muted">
              Для объектов с открытым огнём приложим схему тракта по пп. 5.28–5.33 и спецификацию комплекта.
            </p>
          </div>
          <div className="tiles" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))' }}>
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
        <LeadForm configuration={cfg} />
      </div>
    </section>
  );
}
