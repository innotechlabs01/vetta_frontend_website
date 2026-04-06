// src/lib/sent-dm/rate-limiter.ts
/**
 * Simple rate limiter for Sent.dm API calls per tenant
 * Uses in-memory storage - for production, use Redis or similar
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class TenantRateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  
  // Default limits: 100 messages per minute
  private readonly defaultLimit = 100;
  private readonly windowMs = 60 * 1000; // 1 minute

  /**
   * Check if a tenant can send more messages
   * @param tenantId - The organization ID
   * @returns { canSend: boolean, remaining: number, resetIn: number }
   */
  checkLimit(tenantId: string): { canSend: boolean; remaining: number; resetIn: number } {
    const now = Date.now();
    const entry = this.limits.get(tenantId);

    // If no entry or expired, allow sending
    if (!entry || now > entry.resetTime) {
      this.limits.set(tenantId, {
        count: 0,
        resetTime: now + this.windowMs,
      });
      return {
        canSend: true,
        remaining: this.defaultLimit,
        resetIn: this.windowMs,
      };
    }

    // Check if limit exceeded
    if (entry.count >= this.defaultLimit) {
      return {
        canSend: false,
        remaining: 0,
        resetIn: entry.resetTime - now,
      };
    }

    return {
      canSend: true,
      remaining: this.defaultLimit - entry.count,
      resetIn: entry.resetTime - now,
    };
  }

  /**
   * Record a message send attempt
   */
  recordSend(tenantId: string): void {
    const now = Date.now();
    let entry = this.limits.get(tenantId);

    // Create new entry if needed
    if (!entry || now > entry.resetTime) {
      entry = {
        count: 0,
        resetTime: now + this.windowMs,
      };
    }

    entry.count++;
    this.limits.set(tenantId, entry);
  }

  /**
   * Get current limit info without recording
   */
  getLimitInfo(tenantId: string): { limit: number; remaining: number; resetIn: number } {
    const { remaining, resetIn } = this.checkLimit(tenantId);
    return {
      limit: this.defaultLimit,
      remaining,
      resetIn,
    };
  }

  /**
   * Reset limit for a tenant
   */
  reset(tenantId: string): void {
    this.limits.delete(tenantId);
  }
}

// Singleton instance
export const tenantRateLimiter = new TenantRateLimiter();
