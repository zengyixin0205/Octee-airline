// Shared art for the certificates: the official peanut (with a monocle, a moustache and a bow tie) and the red seal.
export const PEANUT = `<svg class="cert-peanut" viewBox="0 0 150 190" role="img" aria-label="A peanut with a monocle, a moustache and a red bow tie, looking very official">
  <path d="M75 8c-26 0-42 17-42 38 0 12 5 20 11 26-9 7-17 18-17 34 0 27 20 48 48 48s48-21 48-48c0-16-8-27-17-34 6-6 11-14 11-26C117 25 101 8 75 8z" fill="#e5bd7f" stroke="#2b1a0e" stroke-width="4" stroke-linejoin="round"/>
  <path d="M42 73c10 6 22 8 33 8s23-2 33-8" fill="none" stroke="#2b1a0e" stroke-width="3" opacity=".35"/>
  <g fill="#b98a4c" opacity=".75"><circle cx="46" cy="120" r="2.4"/><circle cx="60" cy="140" r="2.4"/><circle cx="92" cy="128" r="2.4"/><circle cx="104" cy="108" r="2.4"/><circle cx="76" cy="150" r="2.4"/><circle cx="56" cy="104" r="2.4"/><circle cx="96" cy="152" r="2.4"/></g>
  <circle cx="60" cy="44" r="4" fill="#2b1a0e"/><circle cx="92" cy="44" r="4" fill="#2b1a0e"/>
  <circle cx="92" cy="44" r="12" fill="#fff" fill-opacity=".35" stroke="#b8860b" stroke-width="3"/>
  <path d="M104 48c10 6 12 18 8 30" fill="none" stroke="#b8860b" stroke-width="2"/>
  <path d="M58 62c6-6 12-5 18 0 6-5 12-6 18 0-6 8-12 8-18 3-6 5-12 5-18-3z" fill="#2b1a0e"/>
  <path d="M66 74c6 5 14 5 20 0" fill="none" stroke="#2b1a0e" stroke-width="3" stroke-linecap="round"/>
  <path d="M75 92l-22-12v26z M75 92l22-12v26z" fill="#b3261e" stroke="#2b1a0e" stroke-width="3" stroke-linejoin="round"/>
  <rect x="68" y="86" width="14" height="14" rx="3" fill="#8f1d17" stroke="#2b1a0e" stroke-width="3"/>
</svg>`;

export const SEAL = `<svg class="cert-seal" viewBox="0 0 140 140" role="img" aria-label="Official seal: very official">
  <defs><path id="sealpath" d="M70 70 m-44 0 a44 44 0 1 1 88 0 a44 44 0 1 1 -88 0"/></defs>
  <circle cx="70" cy="70" r="66" fill="#fff6d6" stroke="#b3261e" stroke-width="5"/>
  <circle cx="70" cy="70" r="58" fill="none" stroke="#b3261e" stroke-width="1.5" stroke-dasharray="3 3"/>
  <text font-family="Inter, sans-serif" font-size="9.5" font-weight="800" letter-spacing="1.6" fill="#b3261e"><textPath href="#sealpath" startOffset="0">OFFICIAL SEAL · OCTEE DELAY DIVISION ·</textPath></text>
  <polygon transform="translate(70 62) scale(.72) translate(-70 -66)" points="70,40 77,59 98,60 82,72 88,92 70,81 52,92 58,72 42,60 63,59" fill="#b3261e"/>
  <text x="70" y="96" text-anchor="middle" font-family="Inter, sans-serif" font-size="9" font-weight="800" fill="#b3261e">VERY OFFICIAL</text>
</svg>`;
