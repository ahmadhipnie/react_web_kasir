import { format, parseISO, isValid } from 'date-fns';
import { id } from 'date-fns/locale';

/**
 * Format date to Indonesian format
 * @param {string|Date} date - The date to format
 * @param {string} formatStr - The format string
 * @returns {string} Formatted date string
 */
export const formatDate = (date, formatStr = 'dd MMMM yyyy') => {
  if (!date) return '-';
  
  let dateObj = date;
  if (typeof date === 'string') {
    dateObj = parseISO(date);
  }
  
  if (!isValid(dateObj)) return '-';
  
  return format(dateObj, formatStr, { locale: id });
};

/**
 * Format datetime to Indonesian format
 * @param {string|Date} date - The date to format
 * @returns {string} Formatted datetime string
 */
export const formatDateTime = (date) => {
  return formatDate(date, 'dd MMMM yyyy, HH:mm');
};

/**
 * Format date for input field
 * @param {string|Date} date - The date to format
 * @returns {string} Formatted date string for input
 */
export const formatDateForInput = (date) => {
  if (!date) return '';
  
  let dateObj = date;
  if (typeof date === 'string') {
    dateObj = parseISO(date);
  }
  
  if (!isValid(dateObj)) return '';
  
  return format(dateObj, 'yyyy-MM-dd');
};

/**
 * Get current date formatted for input
 * @returns {string} Current date formatted for input
 */
export const getCurrentDateForInput = () => {
  return format(new Date(), 'yyyy-MM-dd');
};

/**
 * Get start of month formatted for input
 * @returns {string} Start of month formatted for input
 */
export const getStartOfMonthForInput = () => {
  const now = new Date();
  return format(new Date(now.getFullYear(), now.getMonth(), 1), 'yyyy-MM-dd');
};
