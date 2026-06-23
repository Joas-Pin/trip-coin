import { sanitizeObject, sanitizeAndValidateObject } from './sanitize';
import rateLimiter from './rateLimiter';
import { addCsrfProtection, getCsrfToken } from './csrf';

/**
 * Secure request wrapper with all security checks
 * @param {Function} requestFn - The actual API call function
 * @param {Object} options - Security options
 */
export async function secureRequest(requestFn, options = {}) {
  const {
    rateLimitKey,
    requiresAuth = true,
    sanitizeInput = true,
    validateInput = true,
    inputData,
    checkAuthFn, // Optional function to check auth status
  } = options;

  // 1. Rate limiting check
  if (rateLimitKey && !rateLimiter.checkRateLimit(rateLimitKey)) {
    throw new Error(`Rate limit exceeded for ${rateLimitKey}. Please try again later.`);
  }

  // 2. Authentication check
  if (requiresAuth && checkAuthFn) {
    const isAuthenticated = checkAuthFn();
    if (!isAuthenticated) {
      throw new Error('Authentication required');
    }
  }

  // 3. Sanitize and validate input data if needed
  let sanitizedData = inputData;
  if (sanitizeInput && inputData) {
    sanitizedData = sanitizeObject(inputData);
  }
  
  if (validateInput && inputData) {
    try {
      sanitizedData = sanitizeAndValidateObject(inputData);
    } catch (error) {
      console.error('[Security] Input validation failed:', error.message);
      throw error;
    }
  }

  // 4. Execute the request with sanitized data
  try {
    const result = await requestFn(sanitizedData);
    return result;
  } catch (error) {
    // Log but don't expose sensitive details
    console.error('[Secure Request] Error:', error.message);
    throw error;
  }
}

/**
 * Create a secure request wrapper with built-in auth check
 */
export function createSecureRequest(checkAuthFn) {
  return async (requestFn, options = {}) => {
    return secureRequest(requestFn, {
      ...options,
      checkAuthFn,
    });
  };
}

export default secureRequest;