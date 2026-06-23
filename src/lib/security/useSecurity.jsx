import { useAuth } from '@/lib/AuthContext';
import { createSecureRequest } from '@/lib/security';
import { sanitizeInput, sanitizeObject, sanitizeAndValidate, sanitizeAndValidateObject } from '@/lib/security';
import rateLimiter from '@/lib/security/rateLimiter';

/**
 * Hook to use security utilities in React components
 */
export function useSecurity() {
  const { isAuthenticated, user, role } = useAuth();
  
  // Create a secure request function with auth check
  const secureRequest = createSecureRequest(() => isAuthenticated);
  
  return {
    // Authentication checks
    isAuthenticated,
    user,
    role,
    
    // Sanitization functions
    sanitizeInput,
    sanitizeObject,
    sanitizeAndValidate,
    sanitizeAndValidateObject,
    
    // Rate limiting
    checkRateLimit: (key) => rateLimiter.checkRateLimit(key),
    getRateLimitCount: (key) => rateLimiter.getRequestCount(key),
    
    // Secure request wrapper
    secureRequest,
    
    // Check if user has required role
    hasRole: (requiredRole) => role === requiredRole,
    hasAnyRole: (roles) => roles.includes(role),
  };
}