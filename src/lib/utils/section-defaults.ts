// src/lib/utils/section-defaults.ts
import type { SectionFormData } from '$lib/shared/schemas/event.schema';

/**
 * Generate a prefix from a section/tier name.
 * Strips non-alphanumeric characters, uppercases, takes first 5 chars.
 * Falls back to `K{index+1}` if name is too short.
 */
export function generatePrefix(name: string, index: number): string {
  const cleaned = name.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (cleaned.length >= 1) return cleaned.slice(0, 5);
  return `K${index + 1}`;
}

/** Create a blank SectionFormData with sensible defaults for form use */
export function createDefaultSection(sortOrder = 0): SectionFormData {
  return {
    name: '',
    type: 'assigned',
    price: 0,
    capacity: 0,
    layout_config: {
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      rotation: 0,
      color: '#cccccc',
    },
    seat_config: {
      rows: 1,
      cols: 1,
      prefix: `K${sortOrder + 1}`,
      rowFormat: 'alphabetic',
      colDirection: 'ltr',
      startRowIndex: 1,
      startColIndex: 1,
    },
    disabled_seats: '',
    sort_order: sortOrder,
    sales_start_at: '',
    sales_end_at: '',
  };
}
