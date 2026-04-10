import { Errors } from '$lib/server/errors';
import type { SectionInput } from '$lib/shared/schemas';
import { getRowLabel } from '$lib/utils/seat-label';
import { validateDisabledSeats } from './disabled-seats.validator';

export function validateEventRequirements(sections: SectionInput[]): void {
  // 1. Kiểm tra tổng ghế <= 50,000
  const totalSeats = sections.reduce((sum, s) => sum + s.rows * s.cols, 0);
  if (totalSeats > 50000) {
    throw Errors.VALIDATION({ general: 'Tổng số ghế không được vượt quá 50,000' });
  }

  // 2. Validate Disabled Seats
  validateDisabledSeats(sections);

  // 3. Validate Trùng lặp
  const seatSet = new Set<string>();
  const conflicts: string[] = [];

  for (const section of sections) {
    const startRow = section.start_row_index ?? 0;
    const startCol = section.start_col_index ?? 1;

    for (let r = 0; r < section.rows; r++) {
      const rowLabel = getRowLabel(startRow + r);
      for (let c = 0; c < section.cols; c++) {
        const key = `${rowLabel}${startCol + c}`;
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
