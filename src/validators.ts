/** Removes spaces and dashes and converts to uppercase. */
export function normalize(value: string): string {
  return String(value ?? "").replace(/[\s-]/g, "").toUpperCase();
}

// ---------------------------------------------------------------- PAN

const PAN_HOLDER_TYPES: Record<string, string> = {
  A: "Association of Persons (AOP)",
  B: "Body of Individuals (BOI)",
  C: "Company",
  F: "Firm / LLP",
  G: "Government",
  H: "Hindu Undivided Family (HUF)",
  J: "Artificial Juridical Person",
  L: "Local Authority",
  P: "Individual",
  T: "Trust",
};

const PAN_REGEX = /^[A-Z]{3}[ABCFGHJLPT][A-Z][0-9]{4}[A-Z]$/;

/** Checks the format of a PAN, e.g. "ABCPE1234F". */
export function isValidPAN(pan: string): boolean {
  return PAN_REGEX.test(normalize(pan));
}

/** Returns who the PAN belongs to (e.g. "Individual", "Company"), or null if invalid. */
export function getPANHolderType(pan: string): string | null {
  const p = normalize(pan);
  return PAN_REGEX.test(p) ? PAN_HOLDER_TYPES[p[3]] : null;
}

// ---------------------------------------------------------------- GSTIN

export const GST_STATE_CODES: Record<string, string> = {
  "01": "Jammu and Kashmir",
  "02": "Himachal Pradesh",
  "03": "Punjab",
  "04": "Chandigarh",
  "05": "Uttarakhand",
  "06": "Haryana",
  "07": "Delhi",
  "08": "Rajasthan",
  "09": "Uttar Pradesh",
  "10": "Bihar",
  "11": "Sikkim",
  "12": "Arunachal Pradesh",
  "13": "Nagaland",
  "14": "Manipur",
  "15": "Mizoram",
  "16": "Tripura",
  "17": "Meghalaya",
  "18": "Assam",
  "19": "West Bengal",
  "20": "Jharkhand",
  "21": "Odisha",
  "22": "Chhattisgarh",
  "23": "Madhya Pradesh",
  "24": "Gujarat",
  "25": "Daman and Diu",
  "26": "Dadra and Nagar Haveli and Daman and Diu",
  "27": "Maharashtra",
  "28": "Andhra Pradesh (Old)",
  "29": "Karnataka",
  "30": "Goa",
  "31": "Lakshadweep",
  "32": "Kerala",
  "33": "Tamil Nadu",
  "34": "Puducherry",
  "35": "Andaman and Nicobar Islands",
  "36": "Telangana",
  "37": "Andhra Pradesh",
  "38": "Ladakh",
  "97": "Other Territory",
  "99": "Centre Jurisdiction",
};

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const BASE36 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** Computes the 15th (check) character of a GSTIN from its first 14 characters. */
export function getGSTINCheckChar(first14: string): string {
  const s = normalize(first14).slice(0, 14);
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const product = BASE36.indexOf(s[i]) * (i % 2 === 0 ? 1 : 2);
    sum += Math.floor(product / 36) + (product % 36);
  }
  return BASE36[(36 - (sum % 36)) % 36];
}

/** Checks format, state code and the checksum of a GSTIN, e.g. "27AAPFU0939F1ZV". */
export function isValidGSTIN(gstin: string): boolean {
  const g = normalize(gstin);
  if (!GSTIN_REGEX.test(g)) return false;
  if (!(g.slice(0, 2) in GST_STATE_CODES)) return false;
  return getGSTINCheckChar(g) === g[14];
}

/** Returns the state name from a valid GSTIN, e.g. "Maharashtra", or null. */
export function getStateFromGSTIN(gstin: string): string | null {
  const g = normalize(gstin);
  return isValidGSTIN(g) ? GST_STATE_CODES[g.slice(0, 2)] : null;
}

/** Returns the PAN embedded inside a valid GSTIN, or null. */
export function getPANFromGSTIN(gstin: string): string | null {
  const g = normalize(gstin);
  return isValidGSTIN(g) ? g.slice(2, 12) : null;
}

// ---------------------------------------------------------------- IFSC

/** Checks the format of an IFSC code, e.g. "SBIN0001234". */
export function isValidIFSC(ifsc: string): boolean {
  return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(normalize(ifsc));
}

/** Returns the 4-letter bank code from an IFSC, e.g. "SBIN", or null. */
export function getBankCodeFromIFSC(ifsc: string): string | null {
  const i = normalize(ifsc);
  return isValidIFSC(i) ? i.slice(0, 4) : null;
}

// ---------------------------------------------------------------- Aadhaar (Verhoeff)

const VERHOEFF_D = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];
const VERHOEFF_P = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];

function verhoeffValid(digits: string): boolean {
  let c = 0;
  const rev = digits.split("").reverse();
  for (let i = 0; i < rev.length; i++) {
    c = VERHOEFF_D[c][VERHOEFF_P[i % 8][Number(rev[i])]];
  }
  return c === 0;
}

/** Checks a 12-digit Aadhaar number, including its Verhoeff checksum. */
export function isValidAadhaar(aadhaar: string): boolean {
  const a = normalize(aadhaar);
  return /^[2-9][0-9]{11}$/.test(a) && verhoeffValid(a);
}

/** Masks an Aadhaar number for display, e.g. "XXXX XXXX 0124". */
export function maskAadhaar(aadhaar: string): string {
  const a = normalize(aadhaar);
  if (!/^[0-9]{12}$/.test(a)) throw new TypeError("Aadhaar must be 12 digits");
  return `XXXX XXXX ${a.slice(8)}`;
}

// ---------------------------------------------------------------- UPI

const UPI_REGEX = /^[a-z0-9][a-z0-9._-]{1,255}@[a-z][a-z0-9]{1,63}$/;

/** Cleans a UPI ID (trims, lowercases). Returns null if it is not valid. */
export function normalizeUPI(upi: string): string | null {
  const u = String(upi ?? "").trim().toLowerCase();
  return UPI_REGEX.test(u) ? u : null;
}

/** Checks the format of a UPI ID / VPA, e.g. "smriti@okaxis" or "9876543210@ybl". */
export function isValidUPI(upi: string): boolean {
  return normalizeUPI(upi) !== null;
}

// ---------------------------------------------------------------- Pincode & mobile

/** Checks a 6-digit Indian pincode, e.g. "110001". */
export function isValidPincode(pincode: string | number): boolean {
  return /^[1-9][0-9]{5}$/.test(normalize(String(pincode)));
}

/**
 * Cleans an Indian mobile number to 10 digits. Accepts "+91 98765-43210",
 * "09876543210", "919876543210" etc. Returns null if it is not valid.
 */
export function normalizeMobile(mobile: string | number): string | null {
  let m = String(mobile ?? "").replace(/[\s\-()]/g, "");
  if (m.startsWith("+91")) m = m.slice(3);
  else if (m.length === 12 && m.startsWith("91")) m = m.slice(2);
  else if (m.length === 11 && m.startsWith("0")) m = m.slice(1);
  return /^[6-9][0-9]{9}$/.test(m) ? m : null;
}

/** Checks an Indian mobile number (with or without +91 / 0 prefix). */
export function isValidMobile(mobile: string | number): boolean {
  return normalizeMobile(mobile) !== null;
}