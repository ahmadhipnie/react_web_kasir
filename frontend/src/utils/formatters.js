/**
 * Format number to US Dollar currency
 * @param {number} amount - The amount to format
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * Format number with thousand separator
 * @param {number} number - The number to format
 * @returns {string} Formatted number string
 */
export const formatNumber = (number) => {
  return new Intl.NumberFormat('en-US').format(number);
};

/**
 * Parse currency string to number
 * @param {string} value - The currency string to parse
 * @returns {number} Parsed number
 */
export const parseCurrency = (value) => {
  return Number(value.replace(/[^0-9-]+/g, ''));
};
