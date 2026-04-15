import { Errors } from '$lib/server/errors';
import type { SectionInput } from '$lib/shared/schemas';
import { getRowLabel } from '$lib/utils/seat-label';
import { validateDisabledSeats } from './disabled-seats.validator';

export function validateEventRequirements(sections: SectionInput[]): void {
  // 1. Kiểm tra tổng ghế <= 50,000 (only assigned sections generate actual seat records)
  const totalSeats = sections.reduce((sum, s) => {
    if (s.type === 'general') return sum; // GA uses capacity, no seat records
    return sum + s.seat_config.rows * s.seat_config.cols;
  }, 0);
  if (totalSeats > 50000) {
    throw Errors.VALIDATION({ general: 'Tổng số ghế không được vượt quá 50,000' });
  }

  // 2. Validate Disabled Seats
  validateDisabledSeats(sections);

  // 3. Validate Trùng lặp (only for assigned sections)
  const seatSet = new Set<string>();
  const conflicts: string[] = [];

  for (const section of sections) {
    if (section.type === 'general') continue;

    const seatCfg = section.seat_config;
    const prefix = seatCfg.prefix || '';
    const startRow = seatCfg.startRowIndex ?? 1;
    const startCol = seatCfg.startColIndex ?? 1;

    for (let r = 0; r < seatCfg.rows; r++) {
      const rowLabel = getRowLabel(startRow + r - 1);
      for (let c = 0; c < seatCfg.cols; c++) {
        const key = `${prefix}-${rowLabel}${startCol + c}`;
        if (seatSet.has(key)) conflicts.push(key);
        else seatSet.add(key);
      }
    }
  }

  if (conflicts.length > 0) {
    const preview = conflicts.slice(0, 10).join(', ');
    const extra = conflicts.length > 10 ? ` ...và ${conflicts.length - 10} ghế khác` : '';
    throw Errors.VALIDATION({
      overlap: `Phát hiện ghế trùng lặp giữa các khu vực: ${preview}${extra}`,
    });
  }
}
