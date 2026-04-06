// src/lib/sent-dm/client.ts
// Sent.dm API client with multi-tenant support

import { tenantRateLimiter } from './rate-limiter';

interface SentDmMessageOptions {
  to: string[];
  template: {
    id: string;
    name?: string;
    parameters?: Record<string, any>;
  };
  channel?: 'sms' | 'whatsapp' | 'auto';
  metadata?: Record<string, any>;
}

interface SentDmMessageResponse {
  success: boolean;
  data: {
    id: string;
    status: string;
    channel: string;
    created_at: string;
  };
  error?: {
    code: string;
    message: string;
  };
  meta: {
    request_id: string;
    timestamp: string;
  };
}

class SentDmClient {
  private apiKey: string;
  private baseUrl: string = 'https://api.sent.dm/v3';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'x-api-key': this.apiKey,
    };
  }

  async sendMessage(options: SentDmMessageOptions & { tenantId?: string }): Promise<SentDmMessageResponse> {
    const tenantId = options.tenantId;

    // Check rate limit if tenant ID provided
    if (tenantId) {
      const { canSend, remaining, resetIn } = tenantRateLimiter.checkLimit(tenantId);
      if (!canSend) {
        return {
          success: false,
          data: {
            id: '',
            status: 'rate_limited',
            channel: options.channel || 'auto',
            created_at: new Date().toISOString(),
          },
          error: {
            code: 'RATE_LIMITED',
            message: `Rate limit exceeded. Try again in ${Math.ceil(resetIn / 1000)} seconds.`,
          },
          meta: {
            request_id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
          },
        };
      }
      // Record the send attempt
      tenantRateLimiter.recordSend(tenantId);
    }

    try {
      const response = await fetch(`${this.baseUrl}/messages/send`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          to: options.to,
          template: options.template,
          channel: options.channel || 'auto',
          metadata: options.metadata || {},
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          data: {
            id: '',
            status: 'failed',
            channel: options.channel || 'auto',
            created_at: new Date().toISOString(),
          },
          error: {
            code: errorData.error?.code || 'HTTP_ERROR',
            message: errorData.error?.message || `HTTP ${response.status}`,
          },
          meta: {
            request_id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
          },
        };
      }

      const data = await response.json();
      return {
        success: true,
        data: {
          id: data.id,
          status: data.status,
          channel: data.channel,
          created_at: data.created_at,
        },
        meta: {
          request_id: data.request_id || crypto.randomUUID(),
          timestamp: data.timestamp || new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error('Sent.dm API error:', error);
      return {
        success: false,
        data: {
          id: '',
          status: 'failed',
          channel: options.channel || 'auto',
          created_at: new Date().toISOString(),
        },
        error: {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        meta: {
          request_id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  // Get message status by ID
  async getMessageStatus(messageId: string): Promise<SentDmMessageResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/messages/${messageId}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          data: {
            id: messageId,
            status: 'unknown',
            channel: 'unknown',
            created_at: new Date().toISOString(),
          },
          error: {
            code: errorData.error?.code || 'HTTP_ERROR',
            message: errorData.error?.message || `HTTP ${response.status}`,
          },
          meta: {
            request_id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
          },
        };
      }

      const data = await response.json();
      return {
        success: true,
        data: {
          id: data.id,
          status: data.status,
          channel: data.channel,
          created_at: data.created_at,
        },
        meta: {
          request_id: data.request_id || crypto.randomUUID(),
          timestamp: data.timestamp || new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error('Sent.dm API error:', error);
      return {
        success: false,
        data: {
          id: messageId,
          status: 'failed',
          channel: 'unknown',
          created_at: new Date().toISOString(),
        },
        error: {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        meta: {
          request_id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
        },
      };
    }
  }
}

// Singleton factory for tenant-specific clients
class SentDmService {
  private clients: Map<string, SentDmClient> = new Map();

  getClient(tenantId: string): SentDmClient {
    if (!this.clients.has(tenantId)) {
      const apiKey = this.getApiKeyForTenant(tenantId);
      this.clients.set(tenantId, new SentDmClient(apiKey));
    }
    return this.clients.get(tenantId)!;
  }

  private getApiKeyForTenant(tenantId: string): string {
    // In sandbox mode, use the sandbox key for all tenants
    if (process.env.SENT_DM_SANDBOX_MODE === 'true') {
      const sandboxKey = process.env.NEXT_PUBLIC_SENT_DM_SANDBOX_KEY;
      if (!sandboxKey) {
        throw new Error('NEXT_PUBLIC_SENT_DM_SANDBOX_KEY is not configured');
      }
      return sandboxKey;
    }

    // In production, we would fetch tenant-specific key from secure storage
    // For now, fall back to production key (in real implementation, this would be encrypted in DB)
    const productionKey = process.env.SENT_DM_PRODUCTION_KEY;
    if (!productionKey) {
      throw new Error('SENT_DM_PRODUCTION_KEY is not configured');
    }
    return productionKey;
  }
}

export const sentDmService = new SentDmService();
export type { SentDmMessageOptions, SentDmMessageResponse };