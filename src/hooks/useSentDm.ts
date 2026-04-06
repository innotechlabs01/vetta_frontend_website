import { useEnvironment } from '@/context/EnvironmentContext';
import { sentDmService, SentDmMessageOptions } from '@/lib/sent-dm/client';

/**
 * Hook for sending messages via Sent.dm with multi-tenant support
 * Automatically uses the current organization's Sent.dm client
 */
export function useSentDm() {
  const { org } = useEnvironment();

  /**
   * Send a message using Sent.dm
   * @param options - Message options including recipient, template, etc.
   * @returns Promise resolving to Sent.dm API response
   */
  const sendMessage = async (options: SentDmMessageOptions): Promise<any> => {
    if (!org?.id) {
      throw new Error('No active organization selected');
    }

    const client = sentDmService.getClient(org.id);
    
    // Add tenant metadata for tracking
    const enhancedOptions = {
      ...options,
      metadata: {
        ...options.metadata,
        tenantId: org.id,
        orgName: org.name,
        timestamp: new Date().toISOString(),
      }
    };

    return client.sendMessage(enhancedOptions);
  };

  /**
   * Get the status of a previously sent message
   * @param messageId - The ID of the message to check
   * @returns Promise resolving to message status
   */
  const getMessageStatus = async (messageId: string): Promise<any> => {
    if (!org?.id) {
      throw new Error('No active organization selected');
    }

    const client = sentDmService.getClient(org.id);
    return client.getMessageStatus(messageId);
  };

  return { sendMessage, getMessageStatus };
}