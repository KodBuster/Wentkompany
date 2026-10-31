# Матрица URL и содержания

Источник списка: `src/app/sitemap.ts` и живой `https://fortinox.ru/sitemap.xml` — 48 адресов на 2026-11-01. Политика `/privacy` в карту не входит (`noindex`).

Интент оценен по тексту страницы, не по частотности. Частотность не измерялась.

## Коммерческие и инженерные страницы

| URL | Файл | Аудитория и интент | В HTML без JS | Замечание |
| --- | --- | --- | --- | --- |
| `/` | `src/app/page.tsx`, `home-page-content.tsx` | Все три аудитории, выбор входа | Да | Цифры «12→2», «+15 %», «0 переделок» — см. очередь фактов |
| `/dlya-obshchepita` | `src/app/dlya-obshchepita/page.tsx` | Ресторан, шеф-инженер | Да, FAQ | Своя посадочная, не дубль блога |
| `/chastnyy-dom` | `src/app/chastnyy-dom/page.tsx` | Частный заказчик | Да, FAQ | «Тихий режим» на главной ведёт сюда, на странице акустики нет |
| `/nestandartnyy-zont` | `src/app/nestandartnyy-zont/page.tsx` | Нестандарт, чертёж | Да, FAQ | Цена нестандарта честно «по заявке» |
| `/normy-mchs` | `src/app/normy-mchs/page.tsx` | Проектировщик, приёмка | Да, FAQ | Заголовок «безальтернативным» сильнее абзаца |
| `/configurator` | `src/app/configurator/page.tsx` | Проектировщик | Оболочка да, расчёт после ввода | Не индексировать каждое состояние размеров |
| `/contacts` | `src/app/contacts/page.tsx` | Заявка | Да | Контакты из `site.ts` |
| `/blog` | `src/app/blog/page.tsx` | Навигация по статьям | Да | Не статья |
| `/eshchyo-delaem` | `src/app/eshchyo-delaem/page.tsx` | Нейтральное оборудование | Да | Не вентиляция |

## Блог (`content/blog/*.md`)

| URL | О чём | Рядом, но не вместо |
| --- | --- | --- |
| `/blog/poleznye-ssylki` | Указатели на СП, приказ, АВОК | `/normy-mchs` |
| `/blog/obsiy` | Обзор типов зонтов | `/dlya-obshchepita` |
| `/blog/pristennyy` | Пристенный зонт | `/catalog/zvp` |
| `/blog/ostrovnoy` | Островной зонт | `/catalog/zvo` |
| `/blog/pritochno-vytyazhnoy` | Приток | `/catalog/zpvp`, `/catalog/zpvo` |
| `/blog/gidrozatvor` | Гидрозатвор внутри зонта | карточки ЗВПГ, ЗВОГ |
| `/blog/gidrofiltr` | Отдельный ГФ | `/catalog/gidrofiltr` |
| `/blog/mangal` | Мангал и твёрдое топливо | `/chastnyy-dom`, `/normy-mchs` |
| `/blog/kupit` | Из чего складывается заказ | каталог |
| `/blog/montazh` | Порядок монтажа, с оговоркой «не регламент» | — |
| `/blog/raschet` | Логика расхода и патрубков | `/configurator` |

## Каталог

Линейки с несколькими типоразмерами в sitemap: `/catalog/zvp`, `/catalog/zvo`, `/catalog/zpvp`, `/catalog/zpvo`.

Одно изделие канонизировано на карточку, линейка в sitemap не входит: ГФ → `/catalog/gidrofiltr`, ЗВПГ, ЗВОГ, ПИР, щит АВТ.

Карточки с ценой: Product + Offer «под заказ», текст «цена эталонного типоразмера». Щит без цены: Offer нет. Это фаза 3, здесь не менять.

Проблема содержания, не schema: длинный `description` у части зонтов про «двигатель» и «химические цеха». Короткий `short` при этом про цену эталона и нормальный.

Нейтралка, 7 URL: барные станции типы 1–5, урна, шкаф для мусора. Описания типов между собой почти не различают конструкцию. Для GEO вентиляции они побочные. Новые тексты без фактов от производства не писать.

## Не в индексе

`/privacy` — noindex. `/api/*` — disallow. `/catalog` как страница нет, редирект на `/#catalog`.
