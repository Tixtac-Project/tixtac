import { writable } from 'svelte/store';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
}

const MAX_TOASTS = 5;

function createToastStore() {
  const { subscribe, update } = writable<Toast[]>([]);

  function add(type: ToastType, message: string, duration = 4000) {
    const id = crypto.randomUUID();
    const toast: Toast = { id, type, message, duration };

    update((toasts) => {
      const next = [...toasts, toast];
      return next.length > MAX_TOASTS ? next.slice(-MAX_TOASTS) : next;
    });

    if (duration > 0) {
      setTimeout(() => remove(id), duration);
    }

    return id;
  }

  function remove(id: string) {
    update((toasts) => toasts.filter((t) => t.id !== id));
  }

  return {
    subscribe,
    success: (msg: string, duration?: number) => add('success', msg, duration),
    error: (msg: string, duration?: number) => add('error', msg, duration ?? 6000),
    info: (msg: string, duration?: number) => add('info', msg, duration),
    warning: (msg: string, duration?: number) => add('warning', msg, duration),
    remove,
    clear: () => update(() => []),
  };
}

export const toast = createToastStore();
