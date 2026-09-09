import data from '@/data/catalog.json';
import type { Family, FamilyTraits, Dims } from './calc';

export interface FamilyRecord extends FamilyTraits {
  code: Family;
  slug: string;
  title: string;
  count: number;
  priceFrom: number | null;
}

export interface Product {
  id: number;
  slug: string;
  article: string;
  family: Family;
  type: string | null;
  name: string;
  price: number | null;
  base: Dims | null;
  greaseTraps: boolean;
  materials: string[];
  options: string[];
  short: string;
  /** короткий список свойств; выводится маркированным списком на карточке */
  features: string[];
  description: string;
  images: string[];
  legacyUrl: string;
}

export const families = data.families as FamilyRecord[];
export const products = data.products as Product[];
export const generatedAt = data.generatedAt as string;

export const familyBySlug = (slug: string) => families.find((f) => f.slug === slug);
export const familyByCode = (code: string) => families.find((f) => f.code === code);
export const productBySlug = (slug: string) => products.find((p) => p.slug === slug);
export const productsOf = (code: string) => products.filter((p) => p.family === code);

export const traitsOf = (code: string): FamilyTraits => {
  const f = familyByCode(code);
  return { island: !!f?.island, supply: !!f?.supply, hydro: !!f?.hydro };
};

/** Изделия, попадающие под пп. 5.28–5.33 СП 7.13130.2013. */
export const complianceProducts = products.filter(
  (p) => p.family === 'ЗВПГ' || p.family === 'ЗВОГ' || p.family === 'ГФ' || p.family === 'АВТ',
);

/** Линейки зонтов для профессиональной кухни без открытого огня. */
export const hoodFamilies = families.filter((f) =>
  ['ЗВП', 'ЗВО', 'ЗПВП', 'ЗПВО', 'ПИР'].includes(f.code),
);

export const priceFrom = (code: string) => familyByCode(code)?.priceFrom ?? null;

export const shortName = (p: Product) =>
  `${p.article}${p.type ? ` · ${p.type}` : ''}`;

export const sizeLabel = (d: Dims | null) => (d ? `${d.h} / ${d.w} / ${d.d}` : '—');
