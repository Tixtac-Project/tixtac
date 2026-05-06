/**
 * @description Format price to VND currency format
 * @param {number} price - The price to format
 * @returns {string} The formatted price string
 */
export function formatPrice(price: number): string {
  if (!Number.isFinite(price)) return 'Đang cập nhật';
  if (price === 0) return 'Miễn phí';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(price);
}

/**
 * Format a number as VND currency with symbol included.
 * @param n - The number to format
 * @returns VND currency string with "₫" symbol (e.g. "351.900.000 ₫")
 */
export function formatFullVND(n: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(n);
}
