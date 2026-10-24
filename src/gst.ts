import { round2 } from "./format.js";

export interface GSTOptions {
  /** true when buyer and seller are in different states (IGST applies). Default: false. */
  interState?: boolean;
  /** true when `amount` already includes GST. Default: false. */
  inclusive?: boolean;
}

export interface GSTBreakdown {
  taxableValue: number;
  rate: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
  total: number;
}

/**
 * Splits GST for an invoice line.
 * Same state  -> CGST + SGST (half each). Different state -> IGST.
 *
 * splitGST(1000, 18) -> { taxableValue: 1000, cgst: 90, sgst: 90, igst: 0, totalTax: 180, total: 1180 }
 */
export function splitGST(amount: number, rate: number, options: GSTOptions = {}): GSTBreakdown {
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount < 0) {
    throw new RangeError("amount must be a non-negative number");
  }
  if (typeof rate !== "number" || !Number.isFinite(rate) || rate < 0 || rate > 100) {
    throw new RangeError("rate must be a number between 0 and 100");
  }
  const { interState = false, inclusive = false } = options;

  const base = inclusive ? (amount * 100) / (100 + rate) : amount;
  let cgst = 0, sgst = 0, igst = 0;
  if (interState) {
    igst = round2((base * rate) / 100);
  } else {
    cgst = sgst = round2((base * rate) / 200);
  }
  const totalTax = round2(cgst + sgst + igst);
  const taxableValue = inclusive ? round2(amount - totalTax) : round2(amount);
  const total = inclusive ? round2(amount) : round2(taxableValue + totalTax);

  return { taxableValue, rate, cgst, sgst, igst, totalTax, total };
}

/**
 * Decides if a sale is inter-state by comparing the first two digits
 * (state codes) of the seller's and buyer's GSTINs.
 */
export function isInterState(sellerGSTIN: string, buyerGSTIN: string): boolean {
  const a = String(sellerGSTIN).trim().slice(0, 2);
  const b = String(buyerGSTIN).trim().slice(0, 2);
  return a !== b;
}