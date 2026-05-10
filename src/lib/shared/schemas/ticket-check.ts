import { z } from 'zod';

export const TicketCheckSchema = z.object({
  event_id: z.coerce.number().int().positive(),
  show_id: z.coerce.number().int().positive(),
});

export type TicketCheckQuery = z.infer<typeof TicketCheckSchema>;
