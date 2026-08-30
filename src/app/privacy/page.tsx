import type { Metadata } from 'next';
import { site } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Политика конфиденциальности',
  description: 'Обработка персональных данных в соответствии с 152-ФЗ.',
  alternates: { canonical: '/privacy' },
  robots: { index: false, follow: true },
};

export default function PrivacyPage() {
  return (
    <section className="band band-shop">
      <div className="wrap max-w-[75ch]">
        <div className="head">
          <p className="lbl">152-ФЗ</p>
          <h1>Политика конфиденциальности</h1>
          <p className="muted">
            Шаблон под проверку юристом до запуска: подставляются реквизиты оператора, сроки хранения
            и адрес для обращений субъекта данных.
          </p>
        </div>

        <div className="muted flex flex-col gap-5 text-[0.95rem]">
          <div>
            <h3 className="mb-2" style={{ color: 'var(--color-steel-100)' }}>1. Оператор</h3>
            <p>
              Оператором персональных данных является {site.legalName}. Контакты для обращений:{' '}
              {site.email}, {site.phone}. <span style={{ color: 'var(--color-warn)' }}>TODO: ИНН, ОГРН, юридический адрес.</span>
            </p>
          </div>
          <div>
            <h3 className="mb-2" style={{ color: 'var(--color-steel-100)' }}>2. Какие данные собираем</h3>
            <p>
              Имя, номер телефона, адрес электронной почты и текст обращения — то, что вы указываете
              в форме заявки. Дополнительно сохраняется конфигурация изделия, если она собиралась
              в конфигураторе, и адрес страницы, с которой отправлена заявка.
            </p>
          </div>
          <div>
            <h3 className="mb-2" style={{ color: 'var(--color-steel-100)' }}>3. Цели обработки</h3>
            <p>
              Подготовка расчёта и коммерческого предложения, связь по заявке, выполнение договорных
              обязательств. Данные не передаются третьим лицам, кроме случаев, предусмотренных законом.
            </p>
          </div>
          <div>
            <h3 className="mb-2" style={{ color: 'var(--color-steel-100)' }}>4. Основание и согласие</h3>
            <p>
              Обработка ведётся с согласия субъекта персональных данных, которое подтверждается
              отметкой в форме. Согласие может быть отозвано письменным обращением по адресу оператора.
            </p>
          </div>
          <div>
            <h3 className="mb-2" style={{ color: 'var(--color-steel-100)' }}>5. Хранение и защита</h3>
            <p>
              Данные хранятся на серверах, расположенных на территории Российской Федерации.
              Срок хранения — <span style={{ color: 'var(--color-warn)' }}>TODO: указать срок</span>, после чего данные удаляются.
            </p>
          </div>
          <div>
            <h3 className="mb-2" style={{ color: 'var(--color-steel-100)' }}>6. Права субъекта</h3>
            <p>
              Вы вправе запросить сведения об обработке своих данных, потребовать их уточнения,
              блокирования или уничтожения, а также отозвать согласие.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
