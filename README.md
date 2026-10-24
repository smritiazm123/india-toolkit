# india-toolkit

**Build an Indian GST invoice in one function call.** Validates GSTINs, picks IGST or CGST + SGST automatically, applies discounts, rounds off, and writes the amount in words.

Also includes the building blocks: validators for PAN, GSTIN, Aadhaar, IFSC, UPI and mobile, lakh/crore formatting, and parsing amounts like `"12.5 lakh"`.

- Zero dependencies
- Works in Node.js and the browser
- TypeScript types included
- Supports `import` and `require`

## Install

```bash
npm install india-toolkit
```

## Create an invoice

```js
import { createInvoice } from "india-toolkit";

const invoice = createInvoice({
  sellerGSTIN: "27AAPFU0939F1ZV", // Maharashtra
  buyerGSTIN: "09AAACT2727Q1ZU",  // Uttar Pradesh -> inter-state, so IGST
  items: [
    { name: "Laptop", qty: 1, price: 50000, gstRate: 18 },
    { name: "Mouse", qty: 2, price: 499.5, gstRate: 18, discount: 10 },
  ],
});

invoice.interState;     // true
invoice.taxableValue;   // 50899.1
invoice.igst;           // 9161.84
invoice.roundOff;       // 0.06
invoice.grandTotal;     // 60061
invoice.amountInWords;  // "Sixty Thousand Sixty One Rupees Only"
invoice.taxSummary;     // tax grouped by GST rate
invoice.items;          // per-line taxable value, CGST, SGST, IGST, total
```

### Options

| Option | Meaning |
|---|---|
| `sellerGSTIN`, `buyerGSTIN` | Validated with checksum. An invalid one throws a clear error. |
| `placeOfSupply` | State code (`"27"`) or name (`"Maharashtra"`). Use for B2C sales with no buyer GSTIN. |
| `interState` | Force IGST (`true`) or CGST + SGST (`false`). |
| `roundOff` | Round the grand total to the nearest rupee. Default `true`. |

Each item: `price`, `gstRate`, and optionally `qty` (default 1), `name`, `hsn`, `discount` (percent) **or** `discountAmount` (rupees), and `priceIncludesGST` for retail prices that already include tax.

## Parse and format amounts

```js
parseINR("12.5 lakh");        // 1250000
parseINR("1 crore 20 lakh");  // 12000000
parseINR("₹1,23,456.78");     // 123456.78
parseINR("Rs. 500/-");        // 500
parseINR("hello");            // null

formatINR(1234567);           // "₹12,34,567"
formatCompact(12500000);      // "₹1.25 Cr"
formatCompact(450000);        // "₹4.5 L"
amountToWords(1500.5);        // "One Thousand Five Hundred Rupees and Fifty Paise Only"
numberToWords(150000);        // "One Lakh Fifty Thousand"
```

## GST helpers

```js
splitGST(1000, 18);                         // CGST 90 + SGST 90, total 1180
splitGST(1000, 18, { interState: true });   // IGST 180
splitGST(1180, 18, { inclusive: true });    // taxableValue 1000
isInterState("27AAPFU0939F1ZV", "09AAACT2727Q1ZU"); // true
```

## Validators

All validators ignore spaces, dashes and letter case.

| Function | Example | Result |
|---|---|---|
| `isValidGSTIN` (checksum) | `"27AAPFU0939F1ZV"` | `true` |
| `getStateFromGSTIN` | `"27AAPFU0939F1ZV"` | `"Maharashtra"` |
| `getPANFromGSTIN` | `"27AAPFU0939F1ZV"` | `"AAPFU0939F"` |
| `isValidPAN` | `"ABCPE1234F"` | `true` |
| `getPANHolderType` | `"AAACT2727Q"` | `"Company"` |
| `isValidAadhaar` (Verhoeff checksum) | `"4991 1866 5246"` | `true` |
| `maskAadhaar` | `"499118665246"` | `"XXXX XXXX 5246"` |
| `isValidIFSC` | `"SBIN0001234"` | `true` |
| `isValidUPI` | `"smriti@okaxis"` | `true` |
| `isValidMobile` | `"+91 98765-43210"` | `true` |
| `normalizeMobile` | `"09876543210"` | `"9876543210"` |
| `isValidPincode` | `"110001"` | `true` |

> Validators check format and checksums only. They do not confirm that a PAN, GSTIN or Aadhaar is registered with the government. Always have tax calculations reviewed for your use case.

## License

MIT