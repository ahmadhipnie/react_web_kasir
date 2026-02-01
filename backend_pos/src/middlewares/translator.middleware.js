/**
 * Middleware untuk menerjemahkan field dari Bahasa Indonesia ke Bahasa Inggris
 * Tanpa mengubah struktur database
 */

// Mapping field translations (ID -> EN)
const fieldTranslations = {
  // Status values
  'tersedia': 'available',
  'habis': 'out_of_stock',
  'nonaktif': 'inactive',
  'selesai': 'completed',
  'dibatalkan': 'cancelled',
  'pending': 'pending',
  
  // Payment methods
  'tunai': 'cash',
  'debit': 'debit',
  'kredit': 'credit',
  'qris': 'qris'
};

// Reverse mapping (EN -> ID) untuk translate query parameters dari frontend
const reverseTranslations = {
  'available': 'tersedia',
  'out_of_stock': 'habis',
  'inactive': 'nonaktif',
  'completed': 'selesai',
  'cancelled': 'dibatalkan',
  'pending': 'pending',
  'cash': 'tunai',
  'debit': 'debit',
  'credit': 'kredit',
  'qris': 'qris'
};

// Helper untuk translate single object
const translateObject = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  
  const translated = { ...obj };
  
  // Translate status field if exists
  if (translated.status && typeof translated.status === 'string') {
    const statusLower = translated.status.toLowerCase();
    if (fieldTranslations[statusLower]) {
      translated.status = fieldTranslations[statusLower];
    }
  }
  
  // Translate metode_pembayaran field if exists
  if (translated.metode_pembayaran && typeof translated.metode_pembayaran === 'string') {
    const metodeLower = translated.metode_pembayaran.toLowerCase();
    if (fieldTranslations[metodeLower]) {
      translated.metode_pembayaran = fieldTranslations[metodeLower];
    }
  }
  
  // Recursively translate nested objects
  Object.keys(translated).forEach(key => {
    if (Array.isArray(translated[key])) {
      translated[key] = translated[key].map(item => translateObject(item));
    } else if (translated[key] && typeof translated[key] === 'object' && !(translated[key] instanceof Date)) {
      translated[key] = translateObject(translated[key]);
    }
  });
  
  return translated;
};

// Middleware function
const translateResponse = (req, res, next) => {
  // Store original json method
  const originalJson = res.json.bind(res);
  
  // Override json method
  res.json = function(data) {
    // Translate data before sending
    const translatedData = translateObject(data);
    return originalJson(translatedData);
  };
  
  next();
};

// Middleware to translate query parameters from English to Indonesian
const translateQueryParams = (req, res, next) => {
  if (req.query && Object.keys(req.query).length > 0) {
    // Create a new query object to work with
    const translatedQuery = {};
    
    // Copy and translate all query parameters
    for (const [key, value] of Object.entries(req.query)) {
      if (key === 'status' && reverseTranslations[value]) {
        translatedQuery[key] = reverseTranslations[value];
      } else if (key === 'metode_pembayaran' && reverseTranslations[value]) {
        translatedQuery[key] = reverseTranslations[value];
      } else if (key === 'payment_method' && reverseTranslations[value]) {
        translatedQuery[key] = reverseTranslations[value];
      } else {
        translatedQuery[key] = value;
      }
    }
    
    // Replace req.query with translated version
    req.query = translatedQuery;
  }
  
  // Also translate request body if needed
  if (req.body && Object.keys(req.body).length > 0) {
    // Translate status in body
    if (req.body.status && reverseTranslations[req.body.status]) {
      req.body.status = reverseTranslations[req.body.status];
    }
    
    // Translate metode_pembayaran in body
    if (req.body.metode_pembayaran && reverseTranslations[req.body.metode_pembayaran]) {
      req.body.metode_pembayaran = reverseTranslations[req.body.metode_pembayaran];
    }
  }
  
  next();
};

module.exports = { translateResponse, translateObject, translateQueryParams };
