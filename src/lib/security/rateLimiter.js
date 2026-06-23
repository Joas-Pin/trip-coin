
/**
 * Client-side rate limiter to prevent excessive requests
 */
class RateLimiter {
  constructor(options = {}) {
    this.maxRequests = options.maxRequests || 10; // Max requests per window
    this.windowMs = options.windowMs || 60000; // 1 minute default
    this.requests = new Map(); // key -> [timestamps]
  }

  /**
   * Check if a request is allowed
   * @param {string} key - Unique identifier for the request type (e.g., "login", "api:viagens")
   * @returns {boolean} - True if allowed
   */
  checkRateLimit(key) {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Get or initialize request timestamps for this key
    if (!this.requests.has(key)) {
      this.requests.set(key, []);
    }
    const timestamps = this.requests.get(key);

    // Remove requests outside the current window
    while (timestamps.length > 0 && timestamps[0] < windowStart) {
      timestamps.shift();
    }

    // Check if over limit
    if (timestamps.length >= this.maxRequests) {
      return false;
    }

    // Record the request
    timestamps.push(now);
    this.requests.set(key, timestamps);
    return true;
  }

  /**
   * Reset rate limits for a specific key
   */
  reset(key) {
    if (this.requests.has(key)) {
      this.requests.delete(key);
    }
  }

  /**
   * Get current request count for a key
   */
  getRequestCount(key) {
    if (!this.requests.has(key)) return 0;
    const timestamps = this.requests.get(key);
    const now = Date.now();
    const windowStart = now - this.windowMs;
    return timestamps.filter(t => t >= windowStart).length;
  }
}

// Create singleton instance
const rateLimiter = new RateLimiter({
  maxRequests: 15, // 15 requests per minute
  windowMs: 60000
});

export default rateLimiter;

// Named export for custom instances
export { RateLimiter };

