// src/components/marketing/Dashboard.tsx
"use client";

import { useEnvironment } from '@/context/EnvironmentContext';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { SendTestMessage } from './SendTestMessage';
import { MessageHistory } from './MessageHistory';
import { StatCard } from './StatCard';

async function sendMessageApi(options: any): Promise<any> {
  const response = await fetch('/api/sent-dm/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(options),
  });
  return response.json();
}

export function MessagingDashboard() {
  const { org } = useEnvironment();
  const [stats, setStats] = useState({
    total_sent: 0,
    total_delivered: 0,
    total_failed: 0,
    delivery_rate: 0,
    today_sent: 0,
    total_cost: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMessagingStats();
  }, [org?.id]);

  async function loadMessagingStats() {
    if (!org?.id) return;

    try {
      setLoading(true);
      const mockStats = {
        total_sent: 1245,
        total_delivered: 1180,
        total_failed: 15,
        delivery_rate: 95,
        today_sent: 23,
        total_cost: 42.50,
      };
      
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setStats(mockStats);
    } catch (error) {
      console.error('Error loading messaging stats:', error);
    } finally {
      setLoading(false);
    }
  }

  if (!org?.id) {
    return (
      <div className="p-6">
        <p className="text-gray-500">Please select an organization to view messaging stats</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Messaging Dashboard</h2>
        <Button 
          variant="outline"
          onClick={() => {
            loadMessagingStats();
          }}
        >
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <p className="text-gray-500">Loading messaging stats...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard 
              title="Messages Sent" 
              value={stats.total_sent.toLocaleString()} 
              trend="up" 
              trendValue="+12%"
            />
            <StatCard 
              title="Delivery Rate" 
              value={`${stats.delivery_rate}%`} 
              trend="up" 
              trendValue="+2%"
            />
            <StatCard 
              title="Messages Today" 
              value={stats.today_sent.toLocaleString()} 
              trend="neutral" 
              trendValue="Today"
            />
            <StatCard 
              title="Total Cost" 
              value={`$${stats.total_cost.toFixed(2)}`} 
              trend="down" 
              trendValue="-5%"
            />
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold">Recent Activity</h3>
            <MessageHistory orgId={org.id} limit={5} />
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold">Send Test Message</h3>
            <SendTestMessage 
              onSend={sendMessageApi} 
              orgId={org.id} 
            />
          </div>
        </>
      )}
    </div>
  );
}
