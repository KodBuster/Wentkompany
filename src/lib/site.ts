/** Единый источник контактов и реквизитов. Заглушки помечены TODO. */
export const site = {
  name: 'WENTKOMPANY',
  legalName: 'WENTKOMPANY', // TODO: юрлицо из реквизитов
  url: process.env.NEXT_PUBLIC_SITE_URL || 'https://wentkompany.ru',
  phone: '+7 000 000-00-00', // TODO
  phoneHref: 'tel:+70000000000', // TODO
  email: 'info@wentkompany.ru', // TODO
  address: 'Москва и Московская область', // TODO: адрес производства
  hours: 'Пн–Пт 09:00–18:00',
  promo: 'WK2023',
  description:
    'Производство гидрозонтов, гидрофильтров и вытяжных зонтов из нержавеющей стали. ' +
    'Решения под требования Изменения № 3 к СП 7.13130.2013 для мангалов и тандыров.',
} as const;

/** Нормативная база — используется на посадочной и в FAQ. */
export const norms = {
  order: 'Приказ МЧС России от 27.03.2025 № 251',
  sp: 'СП 7.13130.2013',
  change: 'Изменение № 3',
  inForce: '01.07.2025',
  clauses: '5.28–5.33',
} as const;
