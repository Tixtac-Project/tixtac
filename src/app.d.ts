declare global {
  namespace App {
    interface Locals {
      user: {
        id: number;
        role: 'admin' | 'customer';
      } | null;
    }
  }
  declare const __APP_VERSION__: string;
}

export {};
