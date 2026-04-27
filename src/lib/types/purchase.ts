// src/lib/types/purchase.ts
// Shared types for the ticket purchase flow.

export interface GACartItem {
  section_id: number;
  quantity: number;
}

export interface CartItemInput {
  show_id: number;
  assigned_seats: number[];
  general_admission: GACartItem[];
}

export interface PurchaseBody {
  cart_items: CartItemInput[];
}

export interface GAConflictDetail {
  section_id: number;
  requested: number;
  available: number;
}

export interface CartConflictDetail {
  show_id: number;
  unavailable_assigned_seats: number[];
  unavailable_ga_sections: GAConflictDetail[];
}

export interface PurchaseResponse {
  order_id: number;
  total_amount: string;
  expires_at: string;
  locked_items: number;
  is_appended: boolean;
}

// ── Pending Order (shared between server responses and UI components) ──
export interface PendingOrderItem {
  event_id: number;
  event_title: string;
  show_title: string | null;
  show_date: string;
  start_time: string;
  section_name: string;
  seat_type: 'assigned' | 'general';
  seat_label: string | null;
  price: string;
}

export interface PendingOrder {
  order_id: number;
  total_amount: string;
  status?: string;
  expires_at: string;
  created_at?: string;
  items: PendingOrderItem[];
}
