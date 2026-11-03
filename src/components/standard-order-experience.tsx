'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { HoodDrawing } from '@/components/hood-drawing';
import { OrderPreviewPhoto } from '@/components/order-preview-photo';
import { StandardOrderForm } from '@/components/standard-order-form';
import { MessengerLinks } from '@/components/messenger-links';
import {
  calculate,
  defaultMaterialGrade,
  rub,
  sizeLabelMm,
  type Dims,
  type FamilyTraits,
  type Calculation,
} from '@/lib/calc';

/**
 * Заказ стандарта: опции формы сразу влияют на чертёж и ориентировочную цену.
 */
export function StandardOrderExperience({
  slug,
  productName,
  shortLabel,
  article,
  dims,
  traits,
  typeLabel,
  basePrice,
  availableOptions,
  photoSrc,
  supportsDrawing,
  intro,
}: {
  slug: string;
  productName: string;
  shortLabel: string;
  article: string;
  dims: Dims;
  traits: FamilyTraits;
  typeLabel?: string | null;
  basePrice: number | null;
  availableOptions: string[];
  photoSrc?: string;
  supportsDrawing: boolean;
  intro: string;
}) {
  const [options, setOptions] = useState<string[]>([]);
  const material = defaultMaterialGrade(traits.hydro);

  const calc: Calculation = useMemo(
    () =>
      calculate(dims, traits, dims, basePrice, material, {
        typeLabel,
        options,
      }),
    [dims, traits, basePrice, material, typeLabel, options],
  );

  const configuration = [
    shortLabel,
    sizeLabelMm(dims),
    `AISI ${material}`,
    calc.price ? rub(calc.price.value) : 'после расчёта',
  ].join(' · ');

  return (
    <>
      <div>
        <div className="backdrop-copy">
          <div className="head">
            <p className="lbl">Заявка</p>
            <h1>Оформить заказ стандартного типоразмера</h1>
            <p className="muted mt-6 leading-relaxed">{intro}</p>
          </div>
        </div>

        <div className="order-preview mt-8">
          {photoSrc && <OrderPreviewPhoto src={photoSrc} alt={productName} />}
          {supportsDrawing ? (
            <div className="order-preview__drawing">
              <HoodDrawing
                compact
                input={{
                  dims,
                  traits,
                  calc,
                  article,
                  productName,
                  material,
                  typeLabel,
                  options,
                  lamps: options.includes('Точечные светодиодные светильники'),
                }}
              />
            </div>
          ) : (
            <p className="lbl mt-3">
              Параметрический чертёж для этой линейки на сайте не строится — рабочий лист
              подготовим под заказ.
            </p>
          )}
          <p className="lbl mt-3">
            <Link href={`/catalog/${slug}`} className="no-underline">
              {shortLabel} · подробнее на карточке →
            </Link>
          </p>
        </div>

        <div className="mt-6">
          <MessengerLinks />
        </div>
      </div>

      <StandardOrderForm
        slug={slug}
        dims={dims}
        configuration={configuration}
        material={material}
        availableOptions={availableOptions}
        options={options}
        onOptionsChange={setOptions}
      />
    </>
  );
}
