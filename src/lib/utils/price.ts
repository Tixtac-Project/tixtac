/**
 * @description Format price to VND currency format
 * @param {number} price - The price to format
 * @returns {string} The formatted price string
 */
export function formatPrice(price: number): string {
  if (!price || price === 0) return 'Miễn phí';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(price);
}
