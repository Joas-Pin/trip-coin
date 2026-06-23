/**
 * CSRF (Cross-Site Request Forgery) protection module
 */

// Store CSRF token in memory (not localStorage for security)
let csrfToken = null;
let tokenExpiry = null;

/**
 * Generate a secure random CSRF token
 */
function generateCsrfToken() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Get or create a CSRF token
 */
export function getCsrfToken() {
  const now = Date.now();
  
  // Check if token is still valid (15 minutes expiry)
  if (csrfToken && tokenExpiry && now < tokenExpiry) {
    return csrfToken;
  }
  
  // Generate new token
  csrfToken = generateCsrfToken();
  tokenExpiry = now + 15 * 60 * 1000; // 15 minutes
  
  return csrfToken;
}

/**
 * Validate a CSRF token
 */
export function validateCsrfToken(token) {
  if (!token || !csrfToken) {
    return false;
  }
  
  // Use timing-safe comparison to prevent timing attacks
  const tokenBytes = new TextEncoder().encode(token);
  const storedBytes = new TextEncoder().encode(csrfToken);
  
  if (tokenBytes.length !== storedBytes.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < tokenBytes.length; i++) {
    result |= tokenBytes[i] ^ storedBytes[i];
  }
  
  return result === 0 && Date.now() < tokenExpiry;
}

/**
 * Clear the current CSRF token
 */
export function clearCsrfToken() {
  csrfToken = null;
  tokenExpiry = null;
}

/**
 * Add CSRF token to request headers or data
 */
export function addCsrfProtection(requestData = {}) {
  const token = getCsrfToken();
  
  // If request data is a headers object
  if (requestData && typeof requestData === 'object' && !Array.isArray(requestData)) {
    return {
      ...requestData,
      'X-CSRF-Token': token,
    };
  }
  
  // Otherwise return as object
  return {
    csrfToken: token,
  };
}