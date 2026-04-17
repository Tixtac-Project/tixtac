import { customAlphabet } from 'nanoid';

const nano = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 10);

export function generateTicketCode() {
  return `TIX-${nano()}`;
}
