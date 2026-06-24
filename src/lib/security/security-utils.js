/**
 * Security Utilities - HTTPS Enforcement & Response Sanitization
 */

/**
 * Enforce HTTPS in production environments
 */
export function enforceHttps() {
  if (typeof window === 'undefined') return;

  const isProduction = import.meta.env.PROD;
  const isHttps = window.location.protocol === 'https:';
  const isLocalhost = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);

  if (isProduction && !isHttps && !isLocalhost) {
    const httpsUrl = `https://${window.location.host}${window.location.pathname}${window.location.search}`;
    window.location.replace(httpsUrl);
  }
}

/**
 * Sanitize API responses before rendering
 */
export function sanitizeResponse(data) {
  if (!data) return data;

  if (Array.isArray(data)) {
    return data.map(sanitizeResponse);
  }

  if (typeof data === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = sanitizeResponse(value);
    }
    return sanitized;
  }

  if (typeof data === 'string') {
    // Basic sanitization for response strings (prevent XSS)
    return data
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  return data;
}

/**
 * Safe error handler - strips sensitive info
 */
export function safeErrorHandler(error) {
  // Only log full error in development
  if (import.meta.env.DEV) {
    console.error('[Error]', error);
  }

  // Never expose sensitive info to the user
  const userMessage = 'Ocorreu um erro. Por favor, tente novamente mais tarde.';
  const safeError = {
    message: userMessage,
    // Optional: Include a generic error code
    code: error?.code || 'UNKNOWN_ERROR',
  };

  return safeError;
}

/**
 * Validate and sanitize URL parameters
 */
export function sanitizeUrlParams(params) {
  if (!params) return {};
  const sanitized = {};

  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string') {
      sanitized[key] = value
        .replace(/[^\w\s-]/g, '') // Allow only alphanumeric, spaces, hyphens
        .trim();
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeUrlParams(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}
