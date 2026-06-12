import type { OCRResponse } from "../../shared/api";

// ---------------------------------------------------------------------------
// Text parsing — pure function, always returns the full OCRResponse shape
// ---------------------------------------------------------------------------

export function parseReceiptText(text: string): OCRResponse {
  // Amount: look for GHS, ₵, or amount/total/paid keyword near a number
  const amountMatch = text.match(
    /(?:total|amount|paid|ghs|₵)\s*:?\s*([\d,]+\.?\d{0,2})/i
  );
  let amountValue: string | null = null;
  if (amountMatch) {
    amountValue = parseFloat(amountMatch[1].replace(/,/g, "")).toFixed(2);
  }

  // Date: ISO YYYY-MM-DD, or DD/MM/YYYY, or DD-MM-YYYY
  const dateMatch = text.match(
    /(\d{4}-\d{2}-\d{2})|(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/
  );
  let dateValue: string | null = null;
  if (dateMatch) {
    dateValue = dateMatch[0];
  }

  // Vendor: first non-empty line of text
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const vendorValue: string | null = lines[0] ?? null;

  return {
    extracted: {
      amount: { value: amountValue, found: amountValue !== null },
      date: { value: dateValue, found: dateValue !== null },
      vendor: { value: vendorValue, found: vendorValue !== null },
    },
  };
}

// ---------------------------------------------------------------------------
// OCR extraction — calls Tesseract.js if available
// ---------------------------------------------------------------------------

export async function extractReceiptData(buffer: Buffer): Promise<OCRResponse> {
  try {
    // Dynamic import to avoid crashing if tesseract.js is not yet installed
    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker("eng");
    const {
      data: { text },
    } = await worker.recognize(buffer);
    await worker.terminate();
    return parseReceiptText(text);
  } catch {
    // Tesseract not available or OCR failed — return partial empty result
    console.warn("[OCRService] Tesseract.js not available or failed. Returning empty result.");
    return {
      extracted: {
        amount: { value: null, found: false },
        date: { value: null, found: false },
        vendor: { value: null, found: false },
      },
    };
  }
}
