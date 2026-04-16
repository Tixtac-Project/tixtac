// src/lib/stores/event-create-store.svelte.ts
// Reactive store for the 3-step event creation flow.
// Uses Svelte 5 runes ($state) for cross-component reactive state.
// Persists to sessionStorage so drafts survive page reloads.

import { browser } from '$app/environment';

/** All sessionStorage keys used by the create-event flow */
const STORAGE_KEYS = {
  eventId: 'tixtac-create-event-id',
  eventTitle: 'tixtac-create-event-title',
  step1Draft: 'tixtac-create-event-step1-v1',
  step2Draft: 'tixtac-create-event-step2-v1',
  shows: 'tixtac-create-shows',
  step3Draft: 'tixtac-create-event-step3-v2',
  mapConfig: 'tixtac-create-map-config',
  stageElements: 'tixtac-create-stage-elements',
} as const;

export type StorageKey = keyof typeof STORAGE_KEYS;

// ── Low-level storage utilities (pure functions, no runes) ──────────

function readJson<T>(storageKey: string): T | null {
  if (!browser) return null;
  try {
    const raw = sessionStorage.getItem(storageKey);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    sessionStorage.removeItem(storageKey);
    return null;
  }
}

function readString(storageKey: string): string | null {
  if (!browser) return null;
  return sessionStorage.getItem(storageKey);
}

function writeJson(storageKey: string, value: unknown): void {
  if (!browser) return;
  sessionStorage.setItem(storageKey, JSON.stringify(value));
}

function writeString(storageKey: string, value: string): void {
  if (!browser) return;
  sessionStorage.setItem(storageKey, value);
}

function remove(storageKey: string): void {
  if (!browser) return;
  sessionStorage.removeItem(storageKey);
}

// ── Reactive Store Class ────────────────────────────────────────────

/**
 * Centralized, reactive store for the multi-step event creation flow.
 *
 * **Reactive properties** (`$state`):
 * - `eventId`, `eventTitle` — set after Step 1, read by Steps 2 & 3.
 *
 * **Draft helpers** — thin wrappers around sessionStorage so every step
 * doesn't have to know the raw key strings.
 */
class EventCreateStore {
  // ── Reactive cross-step identity ──
  eventId = $state<number | null>(null);
  eventTitle = $state('');

  constructor() {
    if (browser) {
      this.#hydrateIdentity();
    }
  }

  // ── Computed ──

  /** Whether Step 1 has been completed (event created) */
  get hasEvent(): boolean {
    return this.eventId !== null;
  }

  /**
   * URL search-param string for navigating between steps.
   * Returns `?event=123` or `''` if no event yet.
   */
  eventParam(id?: number | null): string {
    const eid = id ?? this.eventId;
    return eid ? `?event=${eid}` : '';
  }

  // ── Identity management ──

  /** Persist event identity after Step 1 submission (or server hydration). */
  setEventIdentity(id: number, title: string): void {
    this.eventId = id;
    this.eventTitle = title;
    writeString(STORAGE_KEYS.eventId, String(id));
    writeString(STORAGE_KEYS.eventTitle, title);
  }

  /** Hydrate identity from sessionStorage (called once in constructor). */
  #hydrateIdentity(): void {
    const rawId = readString(STORAGE_KEYS.eventId);
    this.eventId = rawId ? Number(rawId) : null;
    this.eventTitle = readString(STORAGE_KEYS.eventTitle) ?? '';
  }

  // ── Generic draft helpers ──

  /** Read and parse a JSON draft from sessionStorage. Returns null on miss/error. */
  readDraft<T>(key: StorageKey): T | null {
    return readJson<T>(STORAGE_KEYS[key]);
  }

  /** Read a raw string value from sessionStorage. */
  readDraftString(key: StorageKey): string | null {
    return readString(STORAGE_KEYS[key]);
  }

  /** Write a JSON-serializable value to sessionStorage. */
  writeDraft(key: StorageKey, value: unknown): void {
    writeJson(STORAGE_KEYS[key], value);
  }

  /** Write a raw string value to sessionStorage. */
  writeDraftString(key: StorageKey, value: string): void {
    writeString(STORAGE_KEYS[key], value);
  }

  /** Remove a single draft key. */
  clearDraft(key: StorageKey): void {
    remove(STORAGE_KEYS[key]);
  }

  /** Remove ALL create-event draft data (called on flow completion). */
  clearAllDrafts(): void {
    if (!browser) return;
    for (const storageKey of Object.values(STORAGE_KEYS)) {
      sessionStorage.removeItem(storageKey);
    }
    this.eventId = null;
    this.eventTitle = '';
  }
}

/** Singleton store instance — import this in components. */
export const eventStore = new EventCreateStore();

// ═══════════════════════════════════════════════════════════════════
// Backward-compatible named exports
// These delegate to the singleton so existing pages can migrate
// incrementally without large diffs.
// ═══════════════════════════════════════════════════════════════════

export function readDraft<T>(key: StorageKey): T | null {
  return eventStore.readDraft<T>(key);
}

export function readDraftString(key: StorageKey): string | null {
  return eventStore.readDraftString(key);
}

export function writeDraft(key: StorageKey, value: unknown): void {
  eventStore.writeDraft(key, value);
}

export function writeDraftString(key: StorageKey, value: string): void {
  eventStore.writeDraftString(key, value);
}

export function clearDraft(key: StorageKey): void {
  eventStore.clearDraft(key);
}

export function clearAllDrafts(): void {
  eventStore.clearAllDrafts();
}

export function getStoredEventId(): number | null {
  return eventStore.eventId;
}

export function getStoredEventTitle(): string {
  return eventStore.eventTitle;
}

export function storeEventIdentity(id: number, title: string): void {
  eventStore.setEventIdentity(id, title);
}

export function eventParam(eventId: number): string {
  return `?event=${eventId}`;
}
