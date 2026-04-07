declare global {
  namespace App {
    interface Locals {
      user: {
        id: number;
        role: 'admin' | 'customer';
      } | null;
    }
  }
}

export {};
