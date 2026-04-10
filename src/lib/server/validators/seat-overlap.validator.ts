import type { SectionInput } from '$lib/shared/schemas';
import { getRowLabel, rowLabelToIndex, parseSeatLabel } from '$lib/utils/seat-label';
import { Errors } from '$lib/server/errors';

export function validateEventRequirements(sections: SectionInput[]): void {
  // 1. Kiểm tra tổng ghế <= 50,000
  const totalSeats = sections.reduce((sum, s) => sum + s.rows * s.cols, 0);
  if (totalSeats > 50000) {
    throw Errors.VALIDATION({ general: 'Tổng số ghế không được vượt quá 50,000' });
  }

  const seatSet = new Set<string>();
  const conflicts: string[] = [];

  for (const section of sections) {
    const startRow = section.start_row_index ?? 0;
    const startCol = section.start_col_index ?? 1;
    const endRow = startRow + section.rows - 1;
    const endCol = startCol + section.cols - 1;

    // 2. Validate Disabled Seats
    const invalidDisabled: string[] = [];
    for (const label of section.disabled_seats ?? []) {
      const parsed = parseSeatLabel(label);
      if (!parsed) {
        invalidDisabled.push(label);
        continue;
      }
      const rIdx = rowLabelToIndex(parsed.rowLabel);
      if (
        rIdx < startRow ||
        rIdx > endRow ||
        parsed.colNumber < startCol ||
        parsed.colNumber > endCol
      ) {
        invalidDisabled.push(label);
      }
    }
    if (invalidDisabled.length > 0) {
      throw Errors.VALIDATION({
        disabled_seats: `Khu vực "${section.name}" có ghế hỏng không hợp lệ: ${invalidDisabled.join(', ')}`,
      });
    }

    // 3. Validate Trùng lặp
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
    throw Errors.VALIDATION({ overlap: `Phát hiện ghế trùng lặp giữa các khu vực: ${preview}...` });
  }
}
