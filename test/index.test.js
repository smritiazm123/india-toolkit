import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import * as kit from "../dist/index.js";

const {
  isValidPAN, getPANHolderType,
  isValidGSTIN, getGSTINCheckChar, getStateFromGSTIN, getPANFromGSTIN,
  isValidIFSC, getBankCodeFromIFSC,
  isValidAadhaar, maskAadhaar,
  isValidPincode, isValidMobile, normalizeMobile,
  formatIndianNumber, formatINR, numberToWords, amountToWords,
  splitGST, isInterState,
} = kit;

test("PAN", () => {
  assert.equal(isValidPAN("ABCPE1234F"), true);
  assert.equal(isValidPAN(" abcpe1234f "), true);
  assert.equal(isValidPAN("ABCXE1234F"), false); // X is not a holder type
  assert.equal(isValidPAN("ABCPE12345"), false);
  assert.equal(getPANHolderType("AAACT2727Q"), "Company");
  assert.equal(getPANHolderType("ABCPE1234F"), "Individual");
  assert.equal(getPANHolderType("bad"), null);
});

test("GSTIN", () => {
  assert.equal(isValidGSTIN("27AAPFU0939F1ZV"), true);
  assert.equal(isValidGSTIN("09AAACT2727Q1ZU"), true);
  assert.equal(isValidGSTIN("09AAACT2727Q1ZA"), false); // wrong checksum
  assert.equal(isValidGSTIN("00AAACT2727Q1ZU"), false); // bad state
  assert.equal(getGSTINCheckChar("09AAACT2727Q1Z"), "U");
  assert.equal(getStateFromGSTIN("27AAPFU0939F1ZV"), "Maharashtra");
  assert.equal(getPANFromGSTIN("27AAPFU0939F1ZV"), "AAPFU0939F");
  assert.equal(getStateFromGSTIN("27AAPFU0939F1ZA"), null);
});

test("IFSC", () => {
  assert.equal(isValidIFSC("SBIN0001234"), true);
  assert.equal(isValidIFSC("sbin0001234"), true);
  assert.equal(isValidIFSC("SBIN1001234"), false); // 5th char must be 0
  assert.equal(getBankCodeFromIFSC("HDFC0000123"), "HDFC");
});

test("Aadhaar", () => {
  assert.equal(isValidAadhaar("499118665246"), true);
  assert.equal(isValidAadhaar("4991 1866 5246"), true);
  assert.equal(isValidAadhaar("499128665246"), false); // checksum fails
  assert.equal(isValidAadhaar("123456789012"), false); // cannot start with 0/1
  assert.equal(maskAadhaar("499118665246"), "XXXX XXXX 5246");
});

test("Pincode and mobile", () => {
  assert.equal(isValidPincode("110001"), true);
  assert.equal(isValidPincode(560034), true);
  assert.equal(isValidPincode("011001"), false);
  assert.equal(isValidMobile("9876543210"), true);
  assert.equal(normalizeMobile("+91 98765-43210"), "9876543210");
  assert.equal(normalizeMobile("09876543210"), "9876543210");
  assert.equal(normalizeMobile("919876543210"), "9876543210");
  assert.equal(isValidMobile("5876543210"), false);
  assert.equal(isValidMobile("98765"), false);
});

test("Indian number formatting", () => {
  assert.equal(formatIndianNumber(1234567), "12,34,567");
  assert.equal(formatIndianNumber(999), "999");
  assert.equal(formatIndianNumber(100000000), "10,00,00,000");
  assert.equal(formatINR(1234567), "₹12,34,567");
  assert.equal(formatINR(1500.5), "₹1,500.50");
  assert.equal(formatINR(-1500), "-₹1,500");
  assert.equal(formatINR(1234.567, { decimals: 2 }), "₹1,234.57");
  assert.equal(formatINR(0), "₹0");
  assert.throws(() => formatINR(NaN), TypeError);
});

test("Number and amount to words", () => {
  assert.equal(numberToWords(0), "Zero");
  assert.equal(numberToWords(15), "Fifteen");
  assert.equal(numberToWords(150000), "One Lakh Fifty Thousand");
  assert.equal(numberToWords(123456789), "Twelve Crore Thirty Four Lakh Fifty Six Thousand Seven Hundred Eighty Nine");
  assert.equal(numberToWords(1000000000000), "One Lakh Crore");
  assert.equal(numberToWords(-42), "Minus Forty Two");
  assert.equal(amountToWords(1500), "One Thousand Five Hundred Rupees Only");
  assert.equal(amountToWords(1), "One Rupee Only");
  assert.equal(amountToWords(1500.5), "One Thousand Five Hundred Rupees and Fifty Paise Only");
  assert.equal(amountToWords(0.75), "Seventy Five Paise Only");
  assert.throws(() => amountToWords(-1), RangeError);
});

test("GST split", () => {
  assert.deepEqual(splitGST(1000, 18), {
    taxableValue: 1000, rate: 18, cgst: 90, sgst: 90, igst: 0, totalTax: 180, total: 1180,
  });
  assert.deepEqual(splitGST(1000, 18, { interState: true }), {
    taxableValue: 1000, rate: 18, cgst: 0, sgst: 0, igst: 180, totalTax: 180, total: 1180,
  });
  assert.deepEqual(splitGST(1180, 18, { inclusive: true }), {
    taxableValue: 1000, rate: 18, cgst: 90, sgst: 90, igst: 0, totalTax: 180, total: 1180,
  });
  const odd = splitGST(999.99, 5);
  assert.equal(odd.taxableValue + odd.totalTax, odd.total);
  assert.equal(isInterState("27AAPFU0939F1ZV", "09AAACT2727Q1ZU"), true);
  assert.equal(isInterState("27AAPFU0939F1ZV", "27AAPFU0939F1ZV"), false);
  assert.throws(() => splitGST(100, 150), RangeError);
});

test("CommonJS build works with require()", () => {
  const require = createRequire(import.meta.url);
  const cjs = require("../dist/index.cjs");
  assert.equal(cjs.formatINR(1234567), "₹12,34,567");
  assert.equal(cjs.isValidGSTIN("27AAPFU0939F1ZV"), true);
});

test("UPI", () => {
  assert.equal(kit.isValidUPI("Smriti@OkAxis"), true);
  assert.equal(kit.isValidUPI("9876543210@ybl"), true);
  assert.equal(kit.isValidUPI("bad@"), false);
  assert.equal(kit.normalizeUPI(" Smriti@OkAxis "), "smriti@okaxis");
});

test("parseINR", () => {
  assert.equal(kit.parseINR("₹1,23,456.78"), 123456.78);
  assert.equal(kit.parseINR("12.5 lakh"), 1250000);
  assert.equal(kit.parseINR("2 Cr"), 20000000);
  assert.equal(kit.parseINR("1 crore 20 lakh"), 12000000);
  assert.equal(kit.parseINR("Rs. 500/-"), 500);
  assert.equal(kit.parseINR("50k"), 50000);
  assert.equal(kit.parseINR("1.1 cr"), 11000000);
  assert.equal(kit.parseINR("-3 lakh"), -300000);
  assert.equal(kit.parseINR("abc"), null);
  assert.equal(kit.parseINR("20 lakh 1 crore"), null);
  assert.equal(kit.parseINR(""), null);
});

test("formatCompact", () => {
  assert.equal(kit.formatCompact(12500000), "₹1.25 Cr");
  assert.equal(kit.formatCompact(450000), "₹4.5 L");
  assert.equal(kit.formatCompact(45000), "₹45 K");
  assert.equal(kit.formatCompact(999), "₹999");
  assert.equal(kit.formatCompact(99999), "₹1 L");
  assert.equal(kit.formatCompact(-450000), "-₹4.5 L");
  assert.equal(kit.formatCompact(12500000, { long: true }), "₹1.25 crore");
});

test("createInvoice: B2B inter-state with discount", () => {
  const inv = kit.createInvoice({
    sellerGSTIN: "27AAPFU0939F1ZV",
    buyerGSTIN: "09AAACT2727Q1ZU",
    items: [
      { name: "Laptop", qty: 1, price: 50000, gstRate: 18 },
      { name: "Mouse", qty: 2, price: 499.5, gstRate: 18, discount: 10 },
    ],
  });
  assert.equal(inv.interState, true);
  assert.equal(inv.sellerState, "Maharashtra");
  assert.equal(inv.placeOfSupply, "Uttar Pradesh");
  assert.equal(inv.discount, 99.9);
  assert.equal(inv.taxableValue, 50899.1);
  assert.equal(inv.igst, 9161.84);
  assert.equal(inv.cgst, 0);
  assert.equal(inv.totalBeforeRoundOff, 60060.94);
  assert.equal(inv.roundOff, 0.06);
  assert.equal(inv.grandTotal, 60061);
  assert.equal(inv.amountInWords, "Sixty Thousand Sixty One Rupees Only");
});

test("createInvoice: B2C same state, GST-inclusive prices, two rates", () => {
  const inv = kit.createInvoice({
    sellerGSTIN: "27AAPFU0939F1ZV",
    placeOfSupply: "Maharashtra",
    items: [
      { name: "Shirt", price: 1049, gstRate: 5, priceIncludesGST: true },
      { name: "Phone", price: 15999, gstRate: 18, priceIncludesGST: true, discountAmount: 999 },
    ],
  });
  assert.equal(inv.interState, false);
  assert.equal(inv.taxSummary.length, 2);
  assert.equal(inv.cgst, inv.sgst);
  assert.equal(inv.igst, 0);
  assert.equal(inv.grandTotal, 16049);
});

test("createInvoice: errors", () => {
  assert.throws(() => kit.createInvoice({ items: [] }), /at least one item/);
  assert.throws(
    () => kit.createInvoice({ sellerGSTIN: "27AAPFU0939F1ZA", items: [{ price: 1, gstRate: 5 }] }),
    /Invalid seller GSTIN/,
  );
  assert.throws(() => kit.createInvoice({ items: [{ name: "X", price: -1, gstRate: 5 }] }), /Item 1 \("X"\) price/);
});