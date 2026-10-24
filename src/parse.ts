import { formatIndianNumber, round2 } from "./format.js";

const UNITS: Record<string, number> = {
  k: 1e3, thousand: 1e3, thousands: 1e3,
  l: 1e5, lac: 1e5, lacs: 1e5, lakh: 1e5, lakhs: 1e5,
  mn: 1e6, million: 1e6, millions: 1e6,
  cr: 1e7, crs: 1e7, crore: 1e7, crores: 1e7,
  bn: 1e9, billion: 1e9, billions: 1e9,
};

/**
 * Parses an amount the way people type it in India. Returns null if it can't be understood.
 *
 * parseINR("₹1,23,456.78")         -> 123456.78
 * parseINR("12.5 lakh")            -> 1250000
 * parseINR("2 Cr")                 -> 20000000
 * parseINR("1 crore 20 lakh")      -> 12000000
 * parseINR("Rs. 500/-")            -> 500
 */
export function parseINR(input: string | number): number | null {
  if (typeof input === "number") return Number.isFinite(input) ? input : null;
  if (typeof input !== "string") return null;

  let s = input.toLowerCase().trim();
  s = s.replace(/₹/g, "").replace(/\b(?:rs|inr)\b\.?/g, "").replace(/\/-\s*$/, "");
  s = s.replace(/,/g, "").trim();

  let sign = 1;
  if (s.startsWith("-")) {
    sign = -1;
    s = s.slice(1).trim();
  }
  if (!s) return null;

  const token = /(\d+(?:\.\d+)?|\.\d+)\s*([a-z]+)?\s*/y;
  let total = 0;
  let lastUnit = Infinity;
  let sawUnitless = false;

  while (token.lastIndex < s.length) {
    const start = token.lastIndex;
    const m = token.exec(s);
    if (!m || m.index !== start) return null;
    if (sawUnitless) return null; // a plain number can only come last
    const value = Number(m[1]);
    let multiplier = 1;
    if (m[2]) {
      const unit = UNITS[m[2]];
      if (!unit || unit >= lastUnit) return null; // unknown unit, or units not in decreasing order
      multiplier = unit;
      lastUnit = unit;
    } else {
      sawUnitless = true;
    }
    total += value * multiplier;
  }
  return sign * round2(total);
}

export interface CompactOptions {
  /** Maximum decimal places. Default: 2 */
  decimals?: number;
  /** Use words ("1.25 crore") instead of short labels ("1.25 Cr"). Default: false */
  long?: boolean;
  /** Prefix with ₹. Default: true */
  symbol?: boolean;
}

const COMPACT_STEPS = [
  { value: 1e7, short: "Cr", long: "crore" },
  { value: 1e5, short: "L", long: "lakh" },
  { value: 1e3, short: "K", long: "thousand" },
];

/**
 * Short amounts for dashboards and cards.
 *
 * formatCompact(12500000) -> "₹1.25 Cr"
 * formatCompact(450000)   -> "₹4.5 L"
 * formatCompact(45000)    -> "₹45 K"
 * formatCompact(999)      -> "₹999"
 */
export function formatCompact(n: number, options: CompactOptions = {}): string {
  if (typeof n !== "number" || !Number.isFinite(n)) {
    throw new TypeError(`Expected a finite number, got ${n}`);
  }
  const { decimals = 2, long = false, symbol = true } = options;
  const abs = Math.abs(n);
  const factor = 10 ** decimals;
  const roundTo = (x: number) => Math.round((x + Number.EPSILON) * factor) / factor;

  let body: string | null = null;
  for (let i = 0; i < COMPACT_STEPS.length; i++) {
    const step = COMPACT_STEPS[i];
    if (abs < step.value) continue;
    let v = roundTo(abs / step.value);
    let label = long ? step.long : step.short;
    // 99,999 would round to "100 K"; show it as "1 L" instead
    if (i > 0 && v >= COMPACT_STEPS[i - 1].value / step.value) {
      const up = COMPACT_STEPS[i - 1];
      v = roundTo(abs / up.value);
      label = long ? up.long : up.short;
    }
    body = `${formatIndianNumber(Math.trunc(v), { decimals: 0 })}${trimFraction(v)} ${label}`;
    break;
  }
  if (body === null) {
    const v = roundTo(abs);
    body = `${formatIndianNumber(Math.trunc(v), { decimals: 0 })}${trimFraction(v)}`;
  }
  const sign = n < 0 && body !== "0" ? "-" : "";
  return `${sign}${symbol ? "₹" : ""}${body}`;
}

/** ".5" for 4.5, "" for 4, ".25" for 1.25 */
function trimFraction(v: number): string {
  const s = String(v);
  const dot = s.indexOf(".");
  return dot === -1 ? "" : s.slice(dot);
}