function assertNumber(n: number): void {
  if (typeof n !== "number" || !Number.isFinite(n)) {
    throw new TypeError(`Expected a finite number, got ${n}`);
  }
}

/** Rounds to 2 decimal places (money-safe for normal amounts). */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Adds Indian-style commas to a string of digits: "1234567" -> "12,34,567". */
function groupIndian(digits: string): string {
  if (digits.length <= 3) return digits;
  const last3 = digits.slice(-3);
  const rest = digits.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return `${rest},${last3}`;
}

export interface FormatOptions {
  /** Number of decimal places. Default: 0 for whole numbers, 2 otherwise. */
  decimals?: number;
}

/** Formats a number with lakh/crore commas: 1234567 -> "12,34,567". */
export function formatIndianNumber(n: number, options: FormatOptions = {}): string {
  assertNumber(n);
  const decimals = options.decimals ?? (Number.isInteger(n) ? 0 : 2);
  const [intPart, fracPart] = Math.abs(n).toFixed(decimals).split(".");
  const sign = n < 0 && Number(intPart + (fracPart ?? "")) !== 0 ? "-" : "";
  return sign + groupIndian(intPart) + (fracPart ? `.${fracPart}` : "");
}

/** Formats as Indian rupees: 1234567 -> "₹12,34,567", -1500.5 -> "-₹1,500.50". */
export function formatINR(n: number, options: FormatOptions = {}): string {
  const formatted = formatIndianNumber(n, options);
  return formatted.startsWith("-") ? `-₹${formatted.slice(1)}` : `₹${formatted}`;
}

// ---------------------------------------------------------------- Words

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function below100(n: number): string {
  if (n < 20) return ONES[n];
  return [TENS[Math.floor(n / 10)], ONES[n % 10]].filter(Boolean).join(" ");
}

function below1000(n: number): string {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  return [hundreds ? `${ONES[hundreds]} Hundred` : "", rest ? below100(rest) : ""]
    .filter(Boolean)
    .join(" ");
}

function integerToWords(n: number): string {
  if (n === 0) return "Zero";
  const parts: string[] = [];
  const crore = Math.floor(n / 10_000_000);
  const lakh = Math.floor((n % 10_000_000) / 100_000);
  const thousand = Math.floor((n % 100_000) / 1000);
  const rest = n % 1000;
  if (crore) parts.push(`${integerToWords(crore)} Crore`);
  if (lakh) parts.push(`${below100(lakh)} Lakh`);
  if (thousand) parts.push(`${below100(thousand)} Thousand`);
  if (rest) parts.push(below1000(rest));
  return parts.join(" ");
}

/** Converts a whole number to words in the Indian system: 150000 -> "One Lakh Fifty Thousand". */
export function numberToWords(n: number): string {
  assertNumber(n);
  if (!Number.isInteger(n)) throw new TypeError("numberToWords expects a whole number; use amountToWords for money");
  if (Math.abs(n) > Number.MAX_SAFE_INTEGER) throw new RangeError("Number is too large");
  return (n < 0 ? "Minus " : "") + integerToWords(Math.abs(n));
}

/**
 * Converts an amount to words for invoices and cheques:
 * 1500 -> "One Thousand Five Hundred Rupees Only"
 * 1500.5 -> "One Thousand Five Hundred Rupees and Fifty Paise Only"
 */
export function amountToWords(amount: number): string {
  assertNumber(amount);
  if (amount < 0) throw new RangeError("amountToWords does not accept negative amounts");
  const totalPaise = Math.round(round2(amount) * 100);
  if (totalPaise > Number.MAX_SAFE_INTEGER) throw new RangeError("Amount is too large");
  const rupees = Math.floor(totalPaise / 100);
  const paise = totalPaise % 100;
  const rupeeWord = rupees === 1 ? "Rupee" : "Rupees";
  if (paise === 0) return `${integerToWords(rupees)} ${rupeeWord} Only`;
  if (rupees === 0) return `${integerToWords(paise)} Paise Only`;
  return `${integerToWords(rupees)} ${rupeeWord} and ${integerToWords(paise)} Paise Only`;
}
