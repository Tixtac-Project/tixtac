// src/lib/components/admin/seatmap/types.ts
import type { MapConfigInput, SectionFormData } from '$lib/shared/schemas/event.schema';
import { getRowLabel } from '$lib/utils/seat-label';

/** A ticket tier created in the Inventory view (Phase 1) */
export type TicketTier = {
  id: string;
  name: string;
  /** Seat label prefix for assigned tiers (e.g. "VIP", "STD"). Required for assigned type. */
  prefix: string;
  price: number;
  capacity: number;
  color: string;
  type: 'assigned' | 'general';
  /** How many seats/tickets have been placed on the seatmap canvas */
  placedCount: number;
};

/** Stage layout element on the canvas */
export type StageElement = {
  id: string;
  type: 'stage' | 'obstacle' | 'entrance';
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
};

/** The selected object on canvas */
export type CanvasSelection =
  | { kind: 'none' }
  | { kind: 'section'; index: number }
  | { kind: 'stage'; id: string };

/** Seatmap builder store state */
export type SeatmapState = {
  mapConfig: MapConfigInput;
  sections: SectionFormData[];
  stageElements: StageElement[];
  selection: CanvasSelection;
  zoom: number;
  panX: number;
  panY: number;
  showGrid: boolean;
  snapToGrid: boolean;
  seatEditMode: boolean;
  seatEditSectionIndex: number | null;
  /** Set of disabled seat labels for the section currently in seat-edit mode */
  seatEditDisabled: Set<string>;
  /** Set of currently selected seats in seat-edit mode (for bulk enable/disable) */
  seatEditSelected: Set<string>;
};

export const SECTION_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ef4444', // rose
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#84cc16', // lime
];

export const STAGE_ELEMENT_DEFAULTS: Record<string, Partial<StageElement>> = {
  stage: { width: 300, height: 80, label: 'Sân khấu', type: 'stage' },
  obstacle: { width: 40, height: 40, label: 'Cột trụ', type: 'obstacle' },
  entrance: { width: 60, height: 30, label: 'Lối vào', type: 'entrance' },
};

/** Seat size in canvas pixels (for rendering individual seats at zoom) */
export const SEAT_SIZE = 18;
export const SEAT_GAP = 4;

/** Zoom threshold for showing individual seats (Level of Detail) */
export const LOD_SEAT_ZOOM = 1.5;

/** Default rows/cols for auto-generated seated blocks.
 *  Picks dimensions where rows × cols >= capacity with minimal waste
 *  AND the shape is as close to square as possible (cols slightly >= rows).
 *  Examples: 120 → 10×12, 100 → 10×10, 50 → 5×10, 7 → 1×7. */
export function autoGridDimensions(capacity: number): { rows: number; cols: number } {
  if (capacity <= 0) return { rows: 1, cols: 1 };
  if (capacity <= 50) {
    // Small capacity: prefer a single row if ≤ max cols
    const maxCols = 30;
    if (capacity <= maxCols) return { rows: 1, cols: capacity };
  }

  // Search candidate column counts and score by (waste, aspect-ratio balance)
  const maxCols = Math.min(capacity, 50);
  let bestRows = capacity;
  let bestCols = 1;
  let bestScore = Infinity;

  for (let c = 2; c <= maxCols; c++) {
    const r = Math.ceil(capacity / c);
    if (r > 50) continue;
    // Skip if cols < rows — prefer wider-than-tall (cols >= rows)
    if (c < r) continue;

    const waste = r * c - capacity;
    // Score: primary = waste (lower is better), secondary = aspect imbalance
    // Weighted so 1 waste seat ≈ a few points of imbalance
    const imbalance = c - r; // always >= 0 since c >= r
    const score = waste * 10 + imbalance;

    if (score < bestScore) {
      bestRows = r;
      bestCols = c;
      bestScore = score;
    }
  }

  return { rows: bestRows, cols: bestCols };
}

/** Generate comma-separated disabled seat labels for excess seats in a grid.
 *  When rows × cols > capacity, disables seats from the last row (right to left)
 *  so only exactly `capacity` seats remain active.
 *  @param capacity Target number of active seats
 *  @param rows Grid rows
 *  @param cols Grid columns
 *  @param prefix Optional seat prefix (e.g. "VIP")
 *  @param startRowIndex 1-based row start index (default 1)
 *  @param startColIndex 1-based col start index (default 1)
 */
export function generateExcessDisabledSeats(
  capacity: number,
  rows: number,
  cols: number,
  prefix: string | null = null,
  startRowIndex = 1,
  startColIndex = 1,
): string {
  const total = rows * cols;
  const excess = total - capacity;
  if (excess <= 0) return '';

  const labels: string[] = [];
  let remaining = excess;

  // Disable from bottom-right corner upward
  for (let r = rows - 1; r >= 0 && remaining > 0; r--) {
    const rowLabel = getRowLabel(startRowIndex + r - 1);
    for (let c = cols - 1; c >= 0 && remaining > 0; c--) {
      const colNum = startColIndex + c;
      const prefixStr = prefix ? `${prefix}-` : '';
      labels.push(`${prefixStr}${rowLabel}${colNum}`);
      remaining--;
    }
  }

  return labels.join(', ');
}
