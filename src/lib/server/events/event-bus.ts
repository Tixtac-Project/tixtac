import { EventEmitter } from 'node:events';

export const eventBus = new EventEmitter();

eventBus.setMaxListeners(1000);

export const SSE_EVENTS = {
  SEAT_UPDATE: (showId: number | string) => `show:${showId}:seats`,
};
