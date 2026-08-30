import Link from 'next/link';

export default function NotFound() {
  return (
    <section className="band band-shop">
      <div className="wrap">
        <p className="lbl">Ошибка 404</p>
        <h1 className="mt-3">Страницы нет</h1>
        <p className="muted mt-5 max-w-[52ch]">
          Возможно, изделие переехало в другую линейку после переноса каталога.
          Загляните в каталог — там все текущие типоразмеры с ценами.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/catalog" className="btn">Открыть каталог</Link>
          <Link href="/" className="btn btn-ghost">На главную</Link>
        </div>
      </div>
    </section>
  );
}
