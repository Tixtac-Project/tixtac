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
 * Convert row label back to 0-based index.
 *
 * - Alphabetic: `A→0, B→1, Z→25, AA→26, AB→27`
 * - Numeric: `"1"→0, "2"→1, "10"→9` (parsed as 1-based number, returned as 0-based)
 */
export function rowLabelToIndex(label: string): number {
  // Numeric row label: "1" → 0, "2" → 1, "10" → 9
  if (/^\d+$/.test(label)) {
    return parseInt(label, 10) - 1;
  }
  // Alphabetic row label: A→0, B→1, Z→25, AA→26
  let index = 0;
  for (let i = 0; i < label.length; i++) {
    index = index * 26 + (label.charCodeAt(i) - 64);
  }
  return index - 1;
}

/**
 * Parse a seat label into its component parts.
 *
 * Supports two formats:
 * - **Alphabetic row**: `"VIP-C5"` → `{ prefix: "VIP", rowLabel: "C", colNumber: 5 }`
 * - **Numeric row**: `"VIP-1-11"` → `{ prefix: "VIP", rowLabel: "1", colNumber: 11 }`
 *
 * The numeric format uses an extra `-` separator between row and column
 * to avoid ambiguity (e.g. row 1 col 11 vs row 11 col 1).
 */
export function parseSeatLabel(
  label: string,
): { prefix: string; rowLabel: string; colNumber: number } | null {
  // Alphabetic row: PREFIX-ROW_ALPHA COL_NUM (e.g. VIP-A1, STD-AB12)
  const alphaMatch = label.match(/^([A-Z0-9]+)-([A-Z]+)([1-9]\d*)$/);
  if (alphaMatch) {
    return {
      prefix: alphaMatch[1],
      rowLabel: alphaMatch[2],
      colNumber: parseInt(alphaMatch[3], 10),
    };
  }

  // Numeric row: PREFIX-ROW_NUM-COL_NUM (e.g. VIP-1-11, STD-12-3)
  const numericMatch = label.match(/^([A-Z0-9]+)-(\d+)-([1-9]\d*)$/);
  if (numericMatch) {
    return {
      prefix: numericMatch[1],
      rowLabel: numericMatch[2],
      colNumber: parseInt(numericMatch[3], 10),
    };
  }

  return null;
}

/**
 * Build a full seat label from its parts.
 *
 * - Alphabetic row: `("VIP", "A", 1)` → `"VIP-A1"`
 * - Numeric row: `("VIP", "1", 11)` → `"VIP-1-11"`
 *
 * Uses a `-` separator between row and column for numeric rows to prevent
 * ambiguity (e.g. `"VIP-111"` could be row 1 col 11 or row 11 col 1).
 */
export function buildSeatLabel(prefix: string, rowLabel: string, colNumber: number): string {
  const isNumericRow = /^\d+$/.test(rowLabel);
  const sep = isNumericRow ? '-' : '';
  return `${prefix}-${rowLabel}${sep}${colNumber}`;
}
