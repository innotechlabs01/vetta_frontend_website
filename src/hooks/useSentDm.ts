import { useEnvironment } from '@/context/EnvironmentContext';
import SentDm from '@sentdm/sentdm';

export function useSentDm() {
  const { org } = useEnvironment();

  const sendMessage = async (options: any): Promise<any> => {
    if (!org?.id) {
      throw new Error('No active organization selected');
    }

    try {
      const apiKey = process.env.SENT_DM_API_KEY || process.env.NEXT_PUBLIC_SENT_DM_SANDBOX_KEY;
      
      if (!apiKey) {
        throw new Error('Sent.dm not configured');
      }

      const client = new SentDm({ apiKey });
      
      const response = await client.messages.send({
        to: options.to,
        template: {
          id: options.template.id,
          name: options.template.name,
          parameters: options.template.parameters
        },
        channel: options.channel || 'sms'
      }) as any;

      const message = response.data?.messages?.[0];
      
      return {
        success: true,
        data: {
          id: message?.id,
          status: message?.status,
          channel: message?.channel,
          created_at: message?.created_at,
        }
      };
    } catch (error: any) {
      console.error('[useSentDm] Error:', error);
      return {
        success: false,
        error: {
          code: error.name || 'API_ERROR',
          message: error.message || 'Unknown error',
        },
      };
    }
  };

  const getMessageStatus = async (messageId: string): Promise<any> => {
    if (!org?.id) {
      throw new Error('No active organization selected');
    }

    try {
      const apiKey = process.env.SENT_DM_API_KEY || process.env.NEXT_PUBLIC_SENT_DM_SANDBOX_KEY;

      if (!apiKey) {
        throw new Error('Sent.dm not configured');
      }

      // Use REST API to get message status
      const response = await fetch(`https://api.sent.dm/v3/messages/${messageId}`, {
        method: 'GET',
        headers: {
          'x-api-key': apiKey,
        },
      });

      const data = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          error: data.error,
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error: any) {
      console.error('[useSentDm] Error getting status:', error);
      return {
        success: false,
        error: {
          code: error.name || 'NETWORK_ERROR',
          message: error.message || 'Unknown error',
        },
      };
    }
  };

  return { sendMessage, getMessageStatus };
}
