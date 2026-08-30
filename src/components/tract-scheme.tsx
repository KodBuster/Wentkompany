/** Схема тракта от аппарата до оголовка по пп. 5.28–5.33. Инлайн-SVG, без библиотек. */
export function TractScheme() {
  return (
    <svg viewBox="0 0 560 320" role="img" aria-label="Схема тракта удаления продуктов горения по пунктам 5.28–5.33" className="w-full h-auto">
      <text x="20" y="18" fontFamily="IBM Plex Mono, monospace" fontSize="11" fill="#5E7280">ТРАКТ УДАЛЕНИЯ · пп. 5.28–5.33</text>

      {/* аппарат */}
      <rect x="60" y="248" width="150" height="34" fill="#141F26" stroke="#3A4C57" />
      <path d="M90 248 q10 -14 20 0 q10 14 20 0 q10 -14 20 0 q10 14 20 0" stroke="#F4703C" strokeWidth="2" fill="none" />
      <text x="60" y="300" fontFamily="IBM Plex Mono, monospace" fontSize="11" fill="#7F919C">мангал · тандыр</text>

      {/* негорючий пол */}
      <line x1="30" y1="286" x2="240" y2="286" stroke="#5E7280" strokeDasharray="4 4" />
      <text x="30" y="316" fontFamily="IBM Plex Mono, monospace" fontSize="10" fill="#5E7280">п. 5.29 · негорючий пол ≥ 500 мм</text>

      {/* зонт с гидрозатвором */}
      <polygon points="60,150 210,150 196,206 74,206" fill="#1B2831" stroke="#C8D3DA" strokeWidth="1.4" />
      <path d="M85 162 q7 12 0 24 M115 162 q7 12 0 24 M145 162 q7 12 0 24 M175 162 q7 12 0 24" stroke="#58B4DC" strokeWidth="1.6" fill="none" />
      <text x="60" y="142" fontFamily="IBM Plex Mono, monospace" fontSize="11" fill="#A3B3BD">ЗВПГ / ЗВОГ · гидрозатвор</text>
      <path d="M135 206 L135 232 M129 224 L135 232 L141 224" stroke="#F4703C" strokeWidth="2" fill="none" />

      {/* слив */}
      <path d="M100 206 L100 240 M94 232 L100 240 L106 232" stroke="#58B4DC" strokeWidth="1.6" fill="none" opacity=".8" />
      <text x="16" y="236" fontFamily="IBM Plex Mono, monospace" fontSize="10" fill="#58B4DC">слив</text>

      {/* вертикаль вверх и горизонт до оголовка */}
      <path d="M135 150 L135 96 L470 96" stroke="#F4703C" strokeWidth="2.4" fill="none" />
      <path d="M470 96 L470 44 M462 56 L470 44 L478 56" stroke="#F4703C" strokeWidth="2.4" fill="none" />
      <text x="440" y="34" fontFamily="IBM Plex Mono, monospace" fontSize="11" fill="#7F919C">оголовок</text>

      {/* EI 45 */}
      <rect x="250" y="76" width="86" height="20" fill="#141F26" stroke="#F4703C" />
      <text x="256" y="90" fontFamily="IBM Plex Mono, monospace" fontSize="11" fill="#F4703C">EI 45 · п. 5.32</text>

      {/* вентилятор */}
      <circle cx="400" cy="96" r="16" fill="#141F26" stroke="#C8D3DA" />
      <path d="M392 96 h16 M400 88 v16" stroke="#C8D3DA" strokeWidth="1.4" />
      <text x="368" y="134" fontFamily="IBM Plex Mono, monospace" fontSize="10" fill="#7F919C">п. 5.33 · 2,0 ч / 400 °C</text>

      {/* щит автоматики */}
      <rect x="250" y="170" width="150" height="60" fill="#141F26" stroke="#D2402E" />
      <text x="262" y="192" fontFamily="IBM Plex Mono, monospace" fontSize="11" fill="#D2402E">ЩИТ АВТОМАТИКИ</text>
      <text x="262" y="210" fontFamily="IBM Plex Mono, monospace" fontSize="10" fill="#7F919C">п. 5.30 · 1-я категория</text>
      <text x="262" y="224" fontFamily="IBM Plex Mono, monospace" fontSize="10" fill="#7F919C">сигнал ≥ 85 дБ / 1 м</text>
      <path d="M210 186 L250 186" stroke="#5E7280" strokeDasharray="3 3" />
      <path d="M325 170 L325 106" stroke="#5E7280" strokeDasharray="3 3" />
    </svg>
  );
}
