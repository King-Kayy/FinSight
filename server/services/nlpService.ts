/**
 * Rule-based NLP parser for natural language transaction entry.
 * Handles Ghanaian English patterns with GHS / cedis currency.
 */

import type { ParsedTransaction } from "../../shared/api";

// ---------------------------------------------------------------------------
// Intent detection
// ---------------------------------------------------------------------------

const EXPENSE_PATTERNS = [
  /\b(spent|spend|paid|pay|bought|buy|used|gave|cost|costs|paying|spending)\b/i,
];

const INCOME_PATTERNS = [
  /\b(received|receive|got|get|earned|earn|income|salary|paid me|sent me|gave me|deposited)\b/i,
];

function detectType(text: string): "expense" | "income" {
  if (INCOME_PATTERNS.some((p) => p.test(text))) return "income";
  return "expense"; // default to expense
}

// ---------------------------------------------------------------------------
// Amount extraction
// ---------------------------------------------------------------------------

function extractAmount(text: string): number | null {
  // Patterns: "35 cedis", "GHS 35", "GHS35", "35gh", "35ghs", "₵35", "35.50"
  const patterns = [
    /(?:ghs|₵|gh[cs]?)\s*([\d,]+(?:\.\d{1,2})?)/i,
    /([\d,]+(?:\.\d{1,2})?)\s*(?:cedis?|ghs|gh[cs]?|₵)/i,
    /\b([\d,]+(?:\.\d{1,2})?)\b/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const raw = match[1].replace(/,/g, "");
      const val = parseFloat(raw);
      if (!isNaN(val) && val > 0) return val;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Date extraction
// ---------------------------------------------------------------------------

function extractDate(text: string): string {
  const now = new Date();
  const today = toISO(now);

  if (/\btoday\b/i.test(text)) return today;

  if (/\byesterday\b/i.test(text)) {
    const d = new Date(now);
    d.setDate(d.getDate() - 1);
    return toISO(d);
  }

  // "last Monday/Tuesday/..." 
  const dayNames = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
  const lastDayMatch = text.match(/\blast\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i);
  if (lastDayMatch) {
    const targetDay = dayNames.indexOf(lastDayMatch[1].toLowerCase());
    const d = new Date(now);
    const diff = (d.getDay() - targetDay + 7) % 7 || 7;
    d.setDate(d.getDate() - diff);
    return toISO(d);
  }

  // "X days ago"
  const daysAgoMatch = text.match(/(\d+)\s+days?\s+ago/i);
  if (daysAgoMatch) {
    const d = new Date(now);
    d.setDate(d.getDate() - parseInt(daysAgoMatch[1]));
    return toISO(d);
  }

  // Explicit date like "23/09/2026" or "2026-09-23"
  const isoMatch = text.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (isoMatch) return isoMatch[1];

  const dmyMatch = text.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    const year = y.length === 2 ? `20${y}` : y;
    return `${year}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`;
  }

  return today;
}

function toISO(d: Date): string {
  return d.toISOString().split("T")[0];
}

// ---------------------------------------------------------------------------
// Category detection
// ---------------------------------------------------------------------------

const CATEGORY_MAP: Record<string, string[]> = {
  "Food": ["lunch","dinner","breakfast","food","meal","eat","restaurant","snack","groceries","grocery","drinks","drink","water","rice","bread","chicken","beef","pizza","burger","chop"],
  "Transport": ["transport","taxi","uber","bolt","bus","trotro","fuel","petrol","gas","car","fare","ride","vehicle"],
  "Utilities": ["electricity","light bill","water bill","internet","wifi","data","mtn","airtel","telecel","vodafone","bill","utility"],
  "Shopping": ["shopping","clothes","shoes","bag","market","mall","shop","buy","bought","items"],
  "Health": ["hospital","clinic","pharmacy","medicine","drugs","doctor","health","medical"],
  "Education": ["school","fees","tuition","book","stationery","course","training"],
  "Entertainment": ["movie","cinema","game","concert","event","outing","fun","bar","club"],
  "Rent": ["rent","landlord","accommodation","house","apartment"],
  "Salary": ["salary","pay","wage","income","internship","work","job","stipend"],
  "Business": ["business","sales","profit","revenue","client","customer"],
  "Gifts": ["mum","dad","family","friend","gift","sent","gave"],
};

function detectCategory(text: string, type: "expense" | "income"): string {
  const lower = text.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_MAP)) {
    if (keywords.some((k) => lower.includes(k))) return category;
  }
  return type === "income" ? "Other Income" : "Other";
}

// ---------------------------------------------------------------------------
// Description extraction
// ---------------------------------------------------------------------------

function extractDescription(text: string, category: string): string {
  // Try to extract meaningful fragment after common prepositions
  const match = text.match(/(?:on|for|at|from|buying|purchase[d]?)\s+(.{2,30})(?:\s+(?:today|yesterday|last|on|\d)|$)/i);
  if (match) {
    return capitalize(match[1].trim().replace(/[.,;]$/, ""));
  }
  return category;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ---------------------------------------------------------------------------
// Confidence scoring
// ---------------------------------------------------------------------------

function scoreConfidence(amount: number | null, text: string): "high" | "medium" | "low" {
  if (!amount) return "low";
  const hasIntent = [...EXPENSE_PATTERNS, ...INCOME_PATTERNS].some((p) => p.test(text));
  const hasCurrency = /(?:ghs|cedis?|₵|gh[cs]?)/i.test(text);
  if (hasIntent && hasCurrency) return "high";
  if (hasIntent || hasCurrency) return "medium";
  return "low";
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function parseTransaction(text: string): ParsedTransaction {
  const type = detectType(text);
  const amount = extractAmount(text) ?? 0;
  const date = extractDate(text);
  const category = detectCategory(text, type);
  const description = extractDescription(text, category);
  const confidence = scoreConfidence(amount, text);

  return {
    type,
    amount,
    currency: "GHS",
    category,
    description,
    date,
    confidence,
    raw: text,
  };
}
