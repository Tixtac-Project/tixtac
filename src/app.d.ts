declare global {
  namespace App {
    interface Locals {
      user: {
        id: number;
        role: 'admin' | 'customer';
      } | null;
    }

    // Uncomment khi cần:
    // interface Error {}
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }
}

export { };
