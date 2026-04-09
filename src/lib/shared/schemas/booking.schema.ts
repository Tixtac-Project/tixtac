// src/lib/shared/schemas/booking.schema.ts
import { z } from 'zod';

export const holdSeatsSchema = z.object({
  seat_ids: z
    .array(z.number().int().positive('seat_id phải là số nguyên dương'))
    .min(1, 'Phải chọn ít nhất 1 ghế')
    .max(10, 'Tối đa 10 ghế mỗi lần giữ chỗ'),
});

export const checkoutSchema = z
  .object({
    // Hiện tại không cần body, nhưng schema sẵn cho future
    // VD: payment_method khi tích hợp thanh toán thật
  })
  .optional();

export type HoldSeatsInput = z.infer<typeof holdSeatsSchema>;
