/** All money in the app is integer paise. These helpers convert and format. */

export const rupeesToPaise = (rupees: number) => Math.round(rupees * 100);
export const paiseToRupees = (paise: number) => paise / 100;

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2, minimumFractionDigits: 0 });
const inrWhole = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

/** ₹1,23,456 (Indian grouping). Shows paise only when present. */
export function formatINR(paise: number): string {
  const rupees = paise / 100;
  return Number.isInteger(rupees) ? inrWhole.format(rupees) : inr.format(rupees);
}

/** Compact band label in the board's style: ₹40–60K, ₹1.5–3L, ₹50K. */
export function formatBand(minPaise: number, maxPaise: number): string {
  const short = (p: number) => {
    const r = p / 100;
    if (r >= 100000) return `${trim(r / 100000)}L`;
    if (r >= 1000) return `${trim(r / 1000)}K`;
    return `${r}`;
  };
  if (minPaise === maxPaise) return `₹${short(minPaise)}`;
  const a = short(minPaise);
  const b = short(maxPaise);
  const unitA = a.slice(-1);
  const unitB = b.slice(-1);
  if (unitA === unitB && /[KL]/.test(unitA)) return `₹${a.slice(0, -1)}–${b}`;
  return `₹${a}–${b}`;
}

function trim(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, "");
}

/** Round half away from zero to whole paise. */
export const roundPaise = (n: number) => (n < 0 ? -Math.round(-n) : Math.round(n));
