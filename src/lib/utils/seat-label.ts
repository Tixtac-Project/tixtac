// src/lib/utils/seat-label.ts

/**
 * Convert 0-based index to row label
 * 0→A, 1→B, 25→Z, 26→AA, 27→AB
 */
export function getRowLabel(index: number): string {
  let label = '';
  let i = index;
  while (i >= 0) {
    label = String.fromCharCode(65 + (i % 26)) + label;
    i = Math.floor(i / 26) - 1;
  }
  return label;
}

/**
 * Convert row label back to 0-based index
 * A→0, B→1, Z→25, AA→26, AB→27
 */
export function rowLabelToIndex(label: string): number {
  let index = 0;
  for (let i = 0; i < label.length; i++) {
    index = index * 26 + (label.charCodeAt(i) - 64);
  }
  return index - 1;
}

/**
 * Parse "VIP-C5" → { prefix: "VIP", rowLabel: "C", colNumber: 5 }
 */
export function parseSeatLabel(
  label: string,
): { prefix: string; rowLabel: string; colNumber: number } | null {
  const match = label.match(/^([A-Z0-9]+)-([A-Z]+)([1-9]\d*)$/);
  if (!match) return null;
  return { prefix: match[1], rowLabel: match[2], colNumber: parseInt(match[3], 10) };
}

/**
 * Build a full seat label from its parts.
 * ("VIP", "A", 1) → "VIP-A1"
 */
export function buildSeatLabel(prefix: string, rowLabel: string, colNumber: number): string {
  return `${prefix}-${rowLabel}${colNumber}`;
}
