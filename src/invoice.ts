import { amountToWords, round2 } from "./format.js";
import { splitGST } from "./gst.js";
import { GST_STATE_CODES, isValidGSTIN, normalize } from "./validators.js";

export interface InvoiceItemInput {
  name?: string;
  hsn?: string;
  /** Quantity. Default: 1 */
  qty?: number;
  /** Price per unit. */
  price: number;
  /** GST rate in percent, e.g. 18 */
  gstRate: number;
  /** Discount in percent of the line amount, e.g. 10 for 10% */
  discount?: number;
  /** Flat discount in rupees for the whole line. Use this OR `discount`. */
  discountAmount?: number;
  /** true if `price` already includes GST (common for retail/B2C). Default: false */
  priceIncludesGST?: boolean;
}

export interface InvoiceInput {
  /** Seller GSTIN. Validated if given. */
  sellerGSTIN?: string;
  /** Buyer GSTIN (B2B). Validated if given. */
  buyerGSTIN?: string;
  /** Place of supply as a 2-digit state code ("27") or name ("Maharashtra"). Defaults to the buyer GSTIN's state. */
  placeOfSupply?: string;
  /** Force IGST (true) or CGST+SGST (false). By default it is worked out from the GSTINs / place of supply. */
  interState?: boolean;
  items: InvoiceItemInput[];
  /** Round the grand total to the nearest rupee. Default: true */
  roundOff?: boolean;
}

export interface InvoiceLine {
  name?: string;
  hsn?: string;
  qty: number;
  price: number;
  gstRate: number;
  grossAmount: number;
  discount: number;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
  total: number;
}

export interface TaxSummaryRow {
  gstRate: number;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
}

export interface Invoice {
  interState: boolean;
  sellerState: string | null;
  placeOfSupply: string | null;
  items: InvoiceLine[];
  /** Tax grouped by GST rate, as printed at the bottom of GST invoices. */
  taxSummary: TaxSummaryRow[];
  grossAmount: number;
  discount: number;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
  totalBeforeRoundOff: number;
  roundOff: number;
  grandTotal: number;
  amountInWords: string;
}

function resolveStateCode(place: string): string {
  const p = String(place).trim();
  const asCode = p.padStart(2, "0");
  if (/^\d{1,2}$/.test(p) && asCode in GST_STATE_CODES) return asCode;
  const match = Object.entries(GST_STATE_CODES).find(
    ([, name]) => name.toLowerCase() === p.toLowerCase(),
  );
  if (!match) throw new Error(`Unknown place of supply: "${place}"`);
  return match[0];
}

function checkNumber(value: unknown, label: string, min = 0, max = Infinity): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    const range = max === Infinity ? `>= ${min}` : `between ${min} and ${max}`;
    throw new RangeError(`${label} must be a number ${range}, got ${value}`);
  }
  return value;
}

/**
 * Calculates a complete GST invoice in one call: validates GSTINs, decides
 * IGST vs CGST+SGST, applies discounts, builds a rate-wise tax summary,
 * rounds off to the nearest rupee and writes the amount in words.
 */
export function createInvoice(input: InvoiceInput): Invoice {
  if (!input || !Array.isArray(input.items) || input.items.length === 0) {
    throw new Error("createInvoice needs at least one item");
  }

  let sellerCode: string | null = null;
  let supplyCode: string | null = null;

  if (input.sellerGSTIN !== undefined) {
    if (!isValidGSTIN(input.sellerGSTIN)) throw new Error(`Invalid seller GSTIN: "${input.sellerGSTIN}"`);
    sellerCode = normalize(input.sellerGSTIN).slice(0, 2);
  }
  if (input.buyerGSTIN !== undefined) {
    if (!isValidGSTIN(input.buyerGSTIN)) throw new Error(`Invalid buyer GSTIN: "${input.buyerGSTIN}"`);
    supplyCode = normalize(input.buyerGSTIN).slice(0, 2);
  }
  if (input.placeOfSupply !== undefined) supplyCode = resolveStateCode(input.placeOfSupply);

  const interState =
    typeof input.interState === "boolean"
      ? input.interState
      : sellerCode !== null && supplyCode !== null && sellerCode !== supplyCode;

  const items: InvoiceLine[] = input.items.map((item, i) => {
    const label = `Item ${i + 1}${item?.name ? ` ("${item.name}")` : ""}`;
    const qty = checkNumber(item.qty ?? 1, `${label} qty`, 0);
    const price = checkNumber(item.price, `${label} price`, 0);
    const gstRate = checkNumber(item.gstRate, `${label} gstRate`, 0, 100);
    if (item.discount !== undefined && item.discountAmount !== undefined) {
      throw new Error(`${label}: use either discount (%) or discountAmount, not both`);
    }

    const grossAmount = round2(qty * price);
    let discount = 0;
    if (item.discount !== undefined) {
      discount = round2((grossAmount * checkNumber(item.discount, `${label} discount`, 0, 100)) / 100);
    } else if (item.discountAmount !== undefined) {
      discount = round2(checkNumber(item.discountAmount, `${label} discountAmount`, 0, grossAmount));
    }

    const tax = splitGST(round2(grossAmount - discount), gstRate, {
      interState,
      inclusive: item.priceIncludesGST === true,
    });

    return {
      ...(item.name !== undefined && { name: item.name }),
      ...(item.hsn !== undefined && { hsn: item.hsn }),
      qty,
      price,
      gstRate,
      grossAmount,
      discount,
      taxableValue: tax.taxableValue,
      cgst: tax.cgst,
      sgst: tax.sgst,
      igst: tax.igst,
      totalTax: tax.totalTax,
      total: tax.total,
    };
  });

  const sum = (key: keyof InvoiceLine, lines: InvoiceLine[] = items) =>
    lines.reduce((acc, line) => round2(acc + (line[key] as number)), 0);

  const rates = [...new Set(items.map((l) => l.gstRate))].sort((a, b) => a - b);
  const taxSummary: TaxSummaryRow[] = rates.map((gstRate) => {
    const lines = items.filter((l) => l.gstRate === gstRate);
    return {
      gstRate,
      taxableValue: sum("taxableValue", lines),
      cgst: sum("cgst", lines),
      sgst: sum("sgst", lines),
      igst: sum("igst", lines),
      totalTax: sum("totalTax", lines),
    };
  });

  const totalBeforeRoundOff = sum("total");
  const grandTotal = input.roundOff === false ? totalBeforeRoundOff : Math.round(totalBeforeRoundOff);

  return {
    interState,
    sellerState: sellerCode ? GST_STATE_CODES[sellerCode] : null,
    placeOfSupply: supplyCode ? GST_STATE_CODES[supplyCode] : null,
    items,
    taxSummary,
    grossAmount: sum("grossAmount"),
    discount: sum("discount"),
    taxableValue: sum("taxableValue"),
    cgst: sum("cgst"),
    sgst: sum("sgst"),
    igst: sum("igst"),
    totalTax: sum("totalTax"),
    totalBeforeRoundOff,
    roundOff: round2(grandTotal - totalBeforeRoundOff),
    grandTotal,
    amountInWords: amountToWords(grandTotal),
  };
}