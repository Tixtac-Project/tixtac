// src/lib/stores/event-create-store.ts
// Centralized sessionStorage management for the 3-step event creation flow.
// All draft read/write/clear logic lives here to avoid duplication across steps.

import { browser } from '$app/environment';

/** All sessionStorage keys used by the create-event flow */
const STORAGE_KEYS = {
  eventId: 'tixtac-create-event-id',
  eventTitle: 'tixtac-create-event-title',
  step1Draft: 'tixtac-create-event-step1-v1',
  step2Draft: 'tixtac-create-event-step2-v1',
  shows: 'tixtac-create-shows',
  step3Draft: 'tixtac-create-event-step3-v2',
  tiers: 'tixtac-create-tiers-v1',
  mapConfig: 'tixtac-create-map-config',
  stageElements: 'tixtac-create-stage-elements',
} as const;

export type StorageKey = keyof typeof STORAGE_KEYS;

// ── Generic helpers ──────────────────────────────

/** Read and parse a JSON value from sessionStorage. Returns null on failure. */
export function readDraft<T>(key: StorageKey): T | null {
  if (!browser) return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEYS[key]);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    sessionStorage.removeItem(STORAGE_KEYS[key]);
    return null;
  }
}

/** Read a raw string value from sessionStorage. */
export function readDraftString(key: StorageKey): string | null {
  if (!browser) return null;
  return sessionStorage.getItem(STORAGE_KEYS[key]);
}

/** Write a JSON value to sessionStorage (debounce-friendly). */
export function writeDraft(key: StorageKey, value: unknown): void {
  if (!browser) return;
  sessionStorage.setItem(STORAGE_KEYS[key], JSON.stringify(value));
}

/** Write a raw string value to sessionStorage. */
export function writeDraftString(key: StorageKey, value: string): void {
  if (!browser) return;
  sessionStorage.setItem(STORAGE_KEYS[key], value);
}

/** Remove a single draft key. */
export function clearDraft(key: StorageKey): void {
  if (!browser) return;
  sessionStorage.removeItem(STORAGE_KEYS[key]);
}

/** Remove all create-event draft data (used on flow completion). */
export function clearAllDrafts(): void {
  if (!browser) return;
  for (const storageKey of Object.values(STORAGE_KEYS)) {
    sessionStorage.removeItem(storageKey);
  }
}

// ── Convenience accessors ────────────────────────

/** Get the stored event ID (number or null). */
export function getStoredEventId(): number | null {
  const raw = readDraftString('eventId');
  return raw ? Number(raw) : null;
}

/** Get the stored event title. */
export function getStoredEventTitle(): string {
  return readDraftString('eventTitle') ?? '';
}

/** Store event ID and title after step 1 submission. */
export function storeEventIdentity(id: number, title: string): void {
  writeDraftString('eventId', String(id));
  writeDraftString('eventTitle', title);
}

/**
 * Build the URL search param string for navigating between steps.
 * E.g. `?event=123` — allows server-side data loading on refresh.
 */
export function eventParam(eventId: number): string {
  return `?event=${eventId}`;
}
