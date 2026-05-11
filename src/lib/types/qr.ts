export interface TicketQrPayload {
  /** Version of the payload structure. */
  v: 1;
  /** Event ID for fast local dataset filtering. */
  e: number;
  /** Show ID for fast local dataset filtering. */
  s: number;
  /** Normalized check-in secret (12 chars, no hyphens). */
  k: string;
}
