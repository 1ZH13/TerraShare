/**
 * Ilustraciones editoriales de paisaje para el landing (#381).
 *
 * El landing pintaba recuadros grises con el rótulo «Foto — potrero / cultivo
 * al amanecer»: un marcador de posición a la vista de cualquiera que entrase.
 * En vez de depender de fotos externas (red, peso y una licencia que gestionar)
 * se dibujan en SVG con la paleta de la marca, así que pesan unos pocos kB,
 * escalan sin perder nitidez y no se despeinan del resto de la página.
 *
 * Son decorativas: van con `aria-hidden`, porque no aportan información que el
 * texto de al lado no dé ya.
 *
 * OJO: los colores van literales a propósito. Esto es una imagen, no una
 * superficie de interfaz — igual que una foto no cambia de color con el tema,
 * la ilustración mantiene su amanecer en claro y en oscuro. Por eso no usa
 * tokens `--ts-*`.
 */

const SKY_HIGH = "#bcd4d8";
const SKY_LOW = "#f0dcc4";
const SUN = "#e2a86a";
const VOLCANO = "#8fa5a0";
const HILL_FAR = "#6d8873";
const HILL_NEAR = "#4f6f52";
const TREE_DARK = "#2f5138";
const TREE_MID = "#3d6244";
const FIELD_1 = "#7d9a5c";
const FIELD_2 = "#6a8a4e";
const FIELD_3 = "#587a43";
const FIELD_4 = "#496b39";
const FENCE = "#a3733f";
const CREAM = "#f4efe4";

/**
 * Amanecer sobre un potrero: volcán al fondo, lomas, parcelas cultivadas en
 * perspectiva y una cerca en primer plano. Vertical, para la columna derecha
 * del hero.
 */
export function FarmlandHero({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 600 640"
      preserveAspectRatio="xMidYMid slice"
      role="presentation"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="ts-hero-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={SKY_HIGH} />
          <stop offset="62%" stopColor="#dfe0d2" />
          <stop offset="100%" stopColor={SKY_LOW} />
        </linearGradient>
        <clipPath id="ts-hero-clip">
          <rect x="0" y="0" width="600" height="640" />
        </clipPath>
      </defs>

      <g clipPath="url(#ts-hero-clip)">
        <rect width="600" height="640" fill="url(#ts-hero-sky)" />

        {/* sol bajo, apenas por encima de la línea de lomas */}
        <circle cx="425" cy="196" r="46" fill={SUN} opacity="0.55" />
        <circle cx="425" cy="196" r="27" fill={SUN} />

        {/* nubes largas y planas, al estilo del trazo editorial */}
        <g fill={CREAM} opacity="0.55">
          <rect x="60" y="112" width="150" height="9" rx="4.5" />
          <rect x="110" y="136" width="96" height="8" rx="4" />
          <rect x="352" y="96" width="118" height="8" rx="4" />
        </g>

        {/* volcán al fondo (Barú), velado por la distancia */}
        <path d="M96 262 L206 128 L316 262 Z" fill={VOLCANO} opacity="0.6" />
        <path d="M176 165 L206 128 L236 165 L216 172 L196 160 Z" fill={CREAM} opacity="0.5" />

        {/* dos bandas de lomas */}
        <path d="M0 268 Q118 212 246 262 T600 236 L600 320 L0 320 Z" fill={HILL_FAR} />
        <path d="M0 306 Q160 258 318 302 T600 288 L600 372 L0 372 Z" fill={HILL_NEAR} />

        {/* arboleda sobre la loma cercana */}
        <g fill={TREE_DARK}>
          <circle cx="62" cy="300" r="17" />
          <circle cx="86" cy="308" r="13" />
          <circle cx="502" cy="292" r="19" />
          <circle cx="528" cy="301" r="14" />
          <circle cx="548" cy="296" r="11" />
        </g>

        {/* parcelas en perspectiva: se ensanchan al acercarse */}
        <path d="M0 372 L600 356 L600 404 L0 424 Z" fill={FIELD_1} />
        <path d="M0 424 L600 404 L600 468 L0 496 Z" fill={FIELD_2} />
        <path d="M0 496 L600 468 L600 546 L0 582 Z" fill={FIELD_3} />
        <path d="M0 582 L600 546 L600 640 L0 640 Z" fill={FIELD_4} />

        {/* surcos: convergen hacia el punto de fuga del sol */}
        <g stroke={CREAM} strokeOpacity="0.16" strokeWidth="2" fill="none">
          <path d="M425 372 L-40 640" />
          <path d="M425 372 L130 640" />
          <path d="M425 372 L300 640" />
          <path d="M425 372 L470 640" />
          <path d="M425 372 L640 640" />
        </g>

        {/* árbol solitario, el punto de interés del paisaje */}
        <g>
          <rect x="132" y="388" width="9" height="62" rx="4" fill={FENCE} />
          <circle cx="136" cy="378" r="38" fill={TREE_MID} />
          <circle cx="110" cy="392" r="25" fill={TREE_DARK} />
          <circle cx="163" cy="394" r="22" fill={TREE_DARK} />
        </g>

        {/* cerca de alambre en primer plano */}
        <g>
          <path d="M0 556 L600 520" stroke={FENCE} strokeWidth="3" fill="none" />
          <path d="M0 588 L600 546" stroke={FENCE} strokeWidth="3" fill="none" />
          {[24, 140, 256, 372, 488].map((x, i) => (
            <rect
              key={x}
              x={x}
              y={548 - i * 8}
              width="9"
              height="76"
              rx="4"
              fill={FENCE}
            />
          ))}
        </g>

        {/* matojos sueltos, para que el primer plano no quede plano */}
        <g fill={TREE_DARK} opacity="0.5">
          <path d="M78 626 q10 -26 20 0 Z" />
          <path d="M330 618 q11 -28 22 0 Z" />
          <path d="M540 606 q10 -25 20 0 Z" />
        </g>
      </g>
    </svg>
  );
}

/**
 * Versión apaisada y más simple, para las tarjetas de terreno sin foto propia.
 * Sin volcán ni cerca: a ese tamaño el detalle solo ensucia.
 */
export function FarmlandCard({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 320 200"
      preserveAspectRatio="xMidYMid slice"
      role="presentation"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="ts-card-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={SKY_HIGH} />
          <stop offset="100%" stopColor={SKY_LOW} />
        </linearGradient>
      </defs>

      <rect width="320" height="200" fill="url(#ts-card-sky)" />
      <circle cx="238" cy="62" r="18" fill={SUN} />
      <path d="M0 96 Q78 68 158 92 T320 80 L320 122 L0 122 Z" fill={HILL_FAR} />
      <path d="M0 118 Q92 96 186 116 T320 108 L320 146 L0 146 Z" fill={HILL_NEAR} />
      <g fill={TREE_DARK}>
        <circle cx="46" cy="112" r="12" />
        <circle cx="62" cy="118" r="9" />
      </g>
      <path d="M0 146 L320 138 L320 168 L0 178 Z" fill={FIELD_2} />
      <path d="M0 178 L320 168 L320 200 L0 200 Z" fill={FIELD_4} />
      <g stroke={CREAM} strokeOpacity="0.16" strokeWidth="1.5" fill="none">
        <path d="M238 146 L20 200" />
        <path d="M238 146 L130 200" />
        <path d="M238 146 L250 200" />
      </g>
    </svg>
  );
}
