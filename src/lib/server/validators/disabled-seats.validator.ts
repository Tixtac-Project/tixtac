import { Errors } from '$lib/server/errors';
import type { SectionInput } from '$lib/shared/schemas';
import { parseSeatLabel, rowLabelToIndex } from '$lib/utils/seat-label';

export function validateDisabledSeats(sections: SectionInput[]): void {
  const details: Record<string, string> = {};

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const startRow = section.start_row_index ?? 0;
    const startCol = section.start_col_index ?? 1;
    const endRow = startRow + section.rows - 1;
    const endCol = startCol + section.cols - 1;

    const invalid: string[] = [];

    for (const label of section.disabled_seats ?? []) {
      const parsed = parseSeatLabel(label);
      if (!parsed) {
        invalid.push(label);
        continue;
      }

      const rowIndex = rowLabelToIndex(parsed.rowLabel);
      if (
        rowIndex < startRow ||
        rowIndex > endRow ||
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
