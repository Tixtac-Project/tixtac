import { Errors } from '$lib/server/errors';
import type { SectionInput } from '$lib/shared/schemas';
import { parseSeatLabel, rowLabelToIndex } from '$lib/utils/seat-label';

export function validateDisabledSeats(sections: SectionInput[]): void {
  const details: Record<string, string> = {};

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const seatCfg = section.seat_config;

    // GA sections don't have disabled seats
    if (section.type === 'general') continue;

    // startRowIndex is 1-based; rowLabelToIndex returns 0-based
    // Convert to 0-based range for comparison
    const startRow0 = (seatCfg.startRowIndex ?? 1) - 1;
    const endRow0 = startRow0 + seatCfg.rows - 1;
    const startCol = seatCfg.startColIndex ?? 1;
    const endCol = startCol + seatCfg.cols - 1;

    const invalid: string[] = [];

    for (const label of section.disabled_seats ?? []) {
      const parsed = parseSeatLabel(label);
      if (!parsed) {
        invalid.push(label);
        continue;
      }

      // Check prefix matches the section's seat_config prefix
      if (seatCfg.prefix && parsed.prefix !== seatCfg.prefix) {
        invalid.push(label);
        continue;
      }

      const rowIndex = rowLabelToIndex(parsed.rowLabel);
      if (
        rowIndex < startRow0 ||
        rowIndex > endRow0 ||
        parsed.colNumber < startCol ||
        parsed.colNumber > endCol
      ) {
        invalid.push(label);
      }
    }

    if (invalid.length > 0) {
      details[`sections[${i}].disabled_seats`] =
        `Khu vực "${section.name}" có ghế hỏng không hợp lệ: ${invalid.join(', ')}`;
    }
  }

  if (Object.keys(details).length > 0) {
    throw Errors.VALIDATION(details);
  }
}
