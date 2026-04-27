// src/lib/types/layout.ts
// Shared types for the customer layout components.

export interface UserInfo {
  id: number;
  role: 'admin' | 'customer';
}

export interface CategoryInfo {
  id: number;
  name: string;
  slug: string;
}
