/**
 * Format number to Indonesian Rupiah currency
 * @param {number} amount - The amount to format
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Format number with thousand separator
 * @param {number} number - The number to format
 * @returns {string} Formatted number string
 */
export const formatNumber = (number) => {
  return new Intl.NumberFormat('id-ID').format(number);
};

/**
 * Parse currency string to number
 * @param {string} value - The currency string to parse
 * @returns {number} Parsed number
 */
export const parseCurrency = (value) => {
  return Number(value.replace(/[^0-9-]+/g, ''));
};
