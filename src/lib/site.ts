/** Единый источник контактов и реквизитов. Заглушки помечены TODO. */
export const site = {
  name: 'WENTBUSTER',
  legalName: 'WENTBUSTER', // TODO: юрлицо из реквизитов
  url: process.env.NEXT_PUBLIC_SITE_URL || 'https://wentbuster.ru',
  phone: '+7 000 000-00-00', // TODO
  phoneHref: 'tel:+70000000000', // TODO
  email: 'info@wentbuster.ru', // TODO
  address: 'Москва и Московская область', // TODO: адрес производства
  hours: 'Пн–Пт 09:00–18:00',
  promo: 'WK2023',
  description:
    'Производство гидрозонтов, гидрофильтров и вытяжных зонтов из нержавеющей стали. ' +
    'Решения под требования Изменения № 3 к СП 7.13130.2013 для мангалов и тандыров.',
  /** Мессенджеры: пустой href — заготовка на контактах, ссылку подставим позже. */
  messengers: {
    max: '', // TODO: https://max.ru/… или deep-link
    whatsapp: '', // TODO: https://wa.me/79…
    telegram: '', // TODO: https://t.me/…
  },
} as const;

/** Нормативная база — используется на посадочной и в FAQ. */
export const norms = {
  order: 'Приказ МЧС России от 27.03.2025 № 251',
  sp: 'СП 7.13130.2013',
  change: 'Изменение № 3',
  inForce: '01.07.2025',
  clauses: '5.28–5.33',
  /** Первоисточник на docs.cntd.ru */
  sourceUrl: 'https://docs.cntd.ru/document/1312658782',
} as const;
