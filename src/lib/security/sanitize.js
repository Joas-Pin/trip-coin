import DOMPurify from 'dompurify';

// Common SQL injection patterns to block
const SQL_INJECTION_PATTERNS = [
  /(\%27)|(\')|(\-\-)|(\%23)|(#)/i,
  /\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|TRUNCATE)\b/i,
  /\b(OR|AND)\s+\d+\s*=\s*\d+/i,
  /\b(EXEC|EXECUTE|DECLARE|CAST|CONVERT)\b/i,
  /\b(UNION\s+ALL|UNION\s+DISTINCT)\b/i,
  /\b(WAITFOR\s+DELAY)\b/i,
  /\b(SLEEP)\s*\(/i,
  /\b(BENCHMARK)\s*\(/i,
  /\b(LOAD_FILE|INTO\s+OUTFILE|INTO\s+DUMPFILE)\b/i,
];

// XSS patterns to block
const XSS_PATTERNS = [
  /javascript:/i,
  /on\w+=/i,
  /<\s*script/i,
  /<\s*img/i,
  /<\s*svg/i,
  /<\s*iframe/i,
  /<\s*frame/i,
  /<\s*link/i,
  /<\s*meta/i,
  /<\s*object/i,
  /<\s*embed/i,
  /<\s*form/i,
  /<\s*input/i,
  /<\s*button/i,
  /<\s*textarea/i,
  /<\s*select/i,
  /<\s*option/i,
  /eval\s*\(/i,
  /expression\s*\(/i,
  /url\s*\(/i,
  /@import/i,
];

/**
 * Validate input against SQL injection patterns
 */
export function validateNoSqlInjection(input) {
  if (typeof input !== 'string') {
    return true;
  }
  
  for (const pattern of SQL_INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      return false;
    }
  }
  
  return true;
}

/**
 * Validate input against XSS patterns
 */
export function validateNoXss(input) {
  if (typeof input !== 'string') {
    return true;
  }
  
  for (const pattern of XSS_PATTERNS) {
    if (pattern.test(input)) {
      return false;
    }
  }
  
  return true;
}

/**
 * Securely sanitize user input to prevent XSS attacks
 */
export function sanitizeInput(input) {
  if (typeof input !== 'string') {
    return input;
  }
  
  // First, remove any potentially malicious content with DOMPurify
  let sanitized = DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [], // No HTML tags allowed by default
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
    FORCE_BODY: true,
  });
  
  // Additional aggressive sanitization
  sanitized = sanitized
    // Replace dangerous characters
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .replace(/`/g, '&#x60;')
    // Remove control characters
    .replace(/[\x00-\x1F\x7F]/g, '')
    // Trim whitespace
    .trim();
  
  return sanitized;
}

/**
 * Sanitize rich text content (allow limited safe HTML)
 */
export function sanitizeRichText(input) {
  if (typeof input !== 'string') {
    return input;
  }
  
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'b', 'i', 'ul', 'ol', 'li', 'span', 'div'],
    ALLOWED_ATTR: ['class', 'style'],
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
    FORBID_TAGS: ['script', 'style', 'link', 'meta', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'textarea', 'select', 'option'],
    FORBID_ATTR: ['on*', 'src', 'href', 'action', 'formaction'],
  });
}

/**
 * Sanitize and validate input - throws error if malicious content detected
 */
export function sanitizeAndValidate(input, options = {}) {
  const { allowRichText = false, strict = true } = options;
  
  if (typeof input === 'string') {
    // Check for SQL injection
    if (!validateNoSqlInjection(input)) {
      if (strict) {
        throw new Error('Potential SQL injection detected');
      }
      console.warn('[Security] Potential SQL injection pattern detected');
    }
    
    // Check for XSS
    if (!validateNoXss(input)) {
      if (strict) {
        throw new Error('Potential XSS attack detected');
      }
      console.warn('[Security] Potential XSS pattern detected');
    }
  }
  
  // Sanitize
  if (allowRichText) {
    return sanitizeRichText(input);
  }
  
  return sanitizeInput(input);
}

/**
 * Sanitize an entire object of user inputs
 */
export function sanitizeObject(obj, options = {}) {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, options));
  }
  
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    sanitized[key] = sanitizeObject(value, options);
  }
  
  return sanitized;
}

/**
 * Sanitize and validate an entire object
 */
export function sanitizeAndValidateObject(obj, options = {}) {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeAndValidateObject(item, options));
  }
  
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    sanitized[key] = sanitizeAndValidate(value, options);
  }
  
  return sanitized;
}