/**
 * Схема зонта с выносками — терминология производителя.
 *
 * Перерисована в вектор со схем старого сайта: те же подписи (Вылет, Высота,
 * Длина, Врезка присоединительная, Лабиринтные фильтры (жироуловители),
 * Ванночка, а у приточных — Врезка притока и Щелевые решётки притока), но в
 * цветах сайта, масштабируемая и читаемая на телефоне.
 *
 * Схема объясняет, ЧТО как называется. Пропорции конкретного изделия
 * показывает конфигуратор, размеры — чертёж; здесь намеренно нет ни одного
 * числа, чтобы схему нельзя было принять за чертёж.
 *
 * Геометрия — усечённая пирамида в изометрии: снизу проём захвата шире,
 * сверху крыша уже, на ней врезка. Все подписи вынесены за габарит корпуса,
 * поэтому ничего не накладывается ни на каком размере экрана.
 */

interface Props {
  /** островное исполнение: подвес на потолок, захват по периметру */
  island?: boolean;
  /** приточно-вытяжной: врезка притока и щелевые решётки */
  supply?: boolean;
  className?: string;
}

/* Изометрия. Низ — проём захвата, верх — крыша. */
const B = { fl: [150, 300], fr: [430, 300], br: [520, 252], bl: [240, 252] }; // низ
const T = { fl: [196, 186], fr: [396, 186], br: [458, 152], bl: [258, 152] }; // верх

const poly = (...pts: number[][]) => pts.map((p) => p.join(',')).join(' ');

export function HoodDiagram({ island = false, supply = false, className }: Props) {
  const title = `Устройство ${island ? 'островного' : 'пристенного'} ${
    supply ? 'приточно-вытяжного' : 'вытяжного'
  } зонта`;

  return (
    <figure className={className} style={{ margin: 0 }}>
      <svg
        viewBox="0 0 660 420"
        role="img"
        aria-label={title}
        style={{ width: '100%', height: 'auto', display: 'block' }}
      >
        <defs>
          <marker id="hd-tip" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0,1 L10,5 L0,9 z" fill="var(--color-steel-400)" />
          </marker>
          <marker id="hd-tip-s" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M0,1 L10,5 L0,9 z" fill="var(--color-steel-500)" />
          </marker>
          <marker id="hd-hot" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M0,1 L10,5 L0,9 z" fill="var(--color-extract)" />
          </marker>
          <marker id="hd-cold" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M0,1 L10,5 L0,9 z" fill="var(--color-supply)" />
          </marker>
        </defs>

        {island && (
          <g>
            <path d="M120,40 L580,40" stroke="var(--color-steel-600)" strokeWidth="2.5" />
            <g stroke="var(--color-steel-600)" strokeWidth="1.2" strokeDasharray="5 4">
              <path d={`M${T.fl[0]},${T.fl[1]} L${T.fl[0]},40`} />
              <path d={`M${T.fr[0]},${T.fr[1]} L${T.fr[0]},40`} />
              <path d={`M${T.bl[0]},${T.bl[1]} L${T.bl[0]},40`} />
              <path d={`M${T.br[0]},${T.br[1]} L${T.br[0]},40`} />
            </g>
          </g>
        )}

        {/* ——— корпус ——— */}
        <g stroke="var(--color-steel-200)" strokeWidth="1.7" strokeLinejoin="round">
          {/* правая грань */}
          <polygon points={poly(B.fr, B.br, T.br, T.fr)} fill="rgba(200,211,218,.05)" />
          {/* передняя грань */}
          <polygon points={poly(B.fl, B.fr, T.fr, T.fl)} fill="rgba(200,211,218,.09)" />
          {/* крыша */}
          <polygon points={poly(T.fl, T.fr, T.br, T.bl)} fill="rgba(200,211,218,.14)" />
        </g>
        {/* задние рёбра — тонко, как скрытые линии */}
        <g stroke="var(--color-steel-600)" strokeWidth="1" strokeDasharray="4 3" fill="none">
          <path d={`M${B.bl[0]},${B.bl[1]} L${B.fl[0]},${B.fl[1]}`} />
          <path d={`M${B.bl[0]},${B.bl[1]} L${B.br[0]},${B.br[1]}`} />
          <path d={`M${B.bl[0]},${B.bl[1]} L${T.bl[0]},${T.bl[1]}`} />
        </g>

        {/* ——— лабиринтные фильтры в проёме ——— */}
        <g stroke="var(--color-steel-400)" strokeWidth="1.2" fill="rgba(200,211,218,.10)">
          {[0, 1, 2, 3, 4].map((i) => (
            <polygon
              key={i}
              points={poly(
                [204 + i * 46, 288],
                [226 + i * 46, 288],
                [248 + i * 46, 262],
                [226 + i * 46, 262],
              )}
            />
          ))}
        </g>

        {/* ——— ванночка по нижней кромке ——— */}
        <polygon
          points={poly([150, 300], [430, 300], [430, 311], [150, 311])}
          fill="rgba(200,211,218,.18)"
          stroke="var(--color-steel-300)"
          strokeWidth="1.4"
        />

        {/* ——— врезка присоединительная ——— */}
        <g stroke="var(--color-steel-200)" strokeWidth="1.5" fill="rgba(200,211,218,.12)">
          <ellipse cx="327" cy="169" rx="27" ry="10" />
          <path d="M300,169 L300,132" fill="none" />
          <path d="M354,169 L354,132" fill="none" />
          <ellipse cx="327" cy="132" rx="27" ry="10" />
        </g>

        {/* ——— потоки ——— */}
        <g stroke="var(--color-extract)" strokeWidth="2" fill="none" opacity=".95">
          <path d="M327,126 L327,96" markerEnd="url(#hd-hot)" />
        </g>
        <g stroke="var(--color-extract)" strokeWidth="1.5" fill="none" opacity=".6">
          <path d="M232,384 C238,352 246,322 252,300" markerEnd="url(#hd-hot)" />
          <path d="M300,392 C302,358 302,326 302,302" markerEnd="url(#hd-hot)" />
          <path d="M372,384 C366,352 358,322 352,300" markerEnd="url(#hd-hot)" />
        </g>

        {supply && (
          <>
            <g stroke="var(--color-supply)" strokeWidth="1.5" fill="rgba(88,180,220,.14)">
              <rect x="470" y="118" width="38" height="20" rx="1" />
              <path d="M489,138 L489,166" fill="none" />
            </g>
            <g stroke="var(--color-supply)" strokeWidth="1.4">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <path key={i} d={`M${168 + i * 46},296 L${192 + i * 46},296`} />
              ))}
            </g>
            <g stroke="var(--color-supply)" strokeWidth="1.5" fill="none" opacity=".8">
              <path d="M180,314 L172,368" markerEnd="url(#hd-cold)" />
              <path d="M410,314 L418,368" markerEnd="url(#hd-cold)" />
            </g>
          </>
        )}

        {/* ——— габариты: снаружи корпуса ——— */}
        <g stroke="var(--color-steel-400)" strokeWidth="1" fill="none">
          <path d="M196,118 L396,118" markerStart="url(#hd-tip)" markerEnd="url(#hd-tip)" />
          {/* вылет — снаружи корпуса, вдоль нижней правой кромки */}
          <path d="M448,318 L538,270" markerStart="url(#hd-tip)" markerEnd="url(#hd-tip)" />
          <path d="M582,166 L582,306" markerStart="url(#hd-tip)" markerEnd="url(#hd-tip)" />
          {/* выносные линии */}
          <g stroke="var(--color-steel-700)" strokeWidth=".8">
            <path d="M196,182 L196,122" />
            <path d="M396,182 L396,122" />
            <path d="M430,304 L452,322" />
            <path d="M520,256 L542,274" />
            <path d="M458,152 L588,152" />
            <path d="M520,252 L588,252" />
          </g>
        </g>
        <g fontFamily="var(--font-mono)" fontSize="12.5" fill="var(--color-steel-200)">
          <text x="296" y="110" textAnchor="middle">Длина</text>
          <text x="502" y="312" textAnchor="middle">Вылет</text>
          <text x="592" y="240" textAnchor="start">Высота</text>
        </g>

        {/* ——— выноски к узлам ——— */}
        <g stroke="var(--color-steel-500)" strokeWidth="1" fill="none" markerEnd="url(#hd-tip-s)">
          <path d="M186,86 L296,124" />
          <path d="M96,336 L200,282" />
          <path d="M96,372 L156,308" />
          {supply && <path d="M612,104 L514,124" />}
          {supply && <path d="M612,348 L400,300" />}
        </g>
        <g fontFamily="var(--font-mono)" fontSize="11.5" fill="var(--color-steel-300)">
          <text x="60" y="82" textAnchor="start">Врезка присоединительная</text>
          <text x="24" y="332" textAnchor="start">Лабиринтные фильтры</text>
          <text x="24" y="346" textAnchor="start">(жироуловители)</text>
          <text x="24" y="376" textAnchor="start">Ванночка</text>
          {supply && <text x="636" y="100" textAnchor="end">Врезка притока</text>}
          {supply && <text x="636" y="344" textAnchor="end">Щелевые решётки притока</text>}
        </g>
      </svg>

      <figcaption className="hint mt-3">
        {title}. Схема объясняет названия узлов; пропорции вашего изделия считает
        конфигуратор, размеры — чертёж.
      </figcaption>
    </figure>
  );
}
