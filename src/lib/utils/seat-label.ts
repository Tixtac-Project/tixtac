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
 * Parse "C5" → { rowLabel: "C", colNumber: 5 }
 */
export function parseSeatLabel(label: string): { rowLabel: string; colNumber: number } | null {
  const match = label.match(/^([A-Z]+)([1-9]\d*)$/);
  if (!match) return null;
  return { rowLabel: match[1], colNumber: parseInt(match[2], 10) };
}
