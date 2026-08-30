import Image from 'next/image';
import data from '@/data/cases.json';

/**
 * Кейсы по объектам.
 *
 * Данные лежат в src/data/cases.json и по умолчанию пусты: пока нет
 * реальных объектов с фото и согласием заказчика, блок не рендерится
 * вообще. Выдуманные кейсы на сайте производителя проверяются первым
 * же звонком, поэтому здесь их нет.
 */

export interface CaseRecord {
  slug: string;
  title: string;
  city: string;
  /** тип объекта: ресторан, столовая, частный дом… */
  kind: string;
  /** что стояло на линии — мангал, хоспер, тандыр */
  equipment: string;
  /** что поставили: артикулы через запятую */
  supplied: string;
  /** одно предложение о задаче */
  task: string;
  /** одно предложение о результате, без превосходных степеней */
  result: string;
  /** путь к фото в /public, необязательно */
  photo?: string;
  year?: number;
}

export const cases = (data.items ?? []) as CaseRecord[];
export const hasCases = cases.length > 0;

export function Cases({ limit = 3, kind }: { limit?: number; kind?: string }) {
  const list = (kind ? cases.filter((c) => c.kind === kind) : cases).slice(0, limit);
  if (list.length === 0) return null;

  return (
    <div className="tiles" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))' }}>
      {list.map((c) => (
        <article key={c.slug} className="tile" style={{ padding: 0 }}>
          {c.photo && (
            <div className="relative aspect-[4/3] w-full overflow-hidden" style={{ background: 'var(--color-steel-850)' }}>
              <Image src={c.photo} alt={c.title} fill sizes="(max-width:900px) 100vw, 380px" style={{ objectFit: 'cover' }} />
            </div>
          )}
          <div className="flex flex-col gap-2 p-6">
            <span className="lbl">
              {c.city}
              {c.year ? ` · ${c.year}` : ''}
            </span>
            <h3 style={{ textTransform: 'none', fontFamily: 'var(--font-body)', fontWeight: 600 }}>{c.title}</h3>
            <p className="muted text-sm">{c.task}</p>
            <dl className="cfg-kv mt-2 text-sm">
              <div>
                <dt>На линии</dt>
                <dd>{c.equipment}</dd>
              </div>
              <div>
                <dt>Поставлено</dt>
                <dd className="num">{c.supplied}</dd>
              </div>
            </dl>
            <p className="mt-2 text-sm" style={{ color: 'var(--color-ok)' }}>{c.result}</p>
          </div>
        </article>
      ))}
    </div>
  );
}
