"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table } from '@/components/ui/table'
import { DropdownMenu } from '@/components/ui/dropdown-menu'
import { ReferralsService } from '@/lib/referrals/service'
import { getSupabaseBrowser } from '@/utils/supabase/client'

export default function ReferralsPage() {
  const [referralsService] = useState(() => new ReferralsService(getSupabaseBrowser()))
  const [referrals, setReferrals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [organizationId, setOrganizationId] = useState<string>('')

  // Form state for generating new referral code
  const [formData, setFormData] = useState({
    rewardAmount: 0,
    expiresInDays: 30
  })

  // In a real app, you would get the organizationId from the context or cookie
  useEffect(() => {
    // For demo, we'll use a fixed organizationId
    // In reality, you'd get this from the current organization context
    setOrganizationId('your-organization-id-here')
    fetchReferrals()
  }, [])

  async function fetchReferrals() {
    try {
      setLoading(true)
      // In a real implementation, you would call an API endpoint
      // For now, we'll use the service directly (but note: service is for server side)
      // This is a simplification for demonstration
      const stats = await referralsService.getReferralStats(organizationId)
      // We don't have a direct fetch for all referrals, but we can get stats
      // For a full list, we would need an API endpoint or to adjust the service
      setReferrals([]) // Placeholder
    } catch (err) {
      setError('Failed to fetch referral stats')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleGenerateReferral(e: React.FormEvent) {
    e.preventDefault()
    try {
      // In a real app, you would get the referrerId from the current user
      const referrerId = 'current-user-id' // Placeholder
      const referral = await referralsService.generateReferralCode(
        organizationId,
        referrerId,
        formData.rewardAmount,
        formData.expiresInDays
      )
      console.log('Generated referral:', referral)
      // After generating, we would refetch the list
      await fetchReferrals()
      // Reset form
      setFormData({
        rewardAmount: 0,
        expiresInDays: 30
      })
    } catch (err) {
      setError('Failed to generate referral code')
      console.error(err)
    }
  }

  function handleCompleteReferral(referral: any) {
    // In a real app, you would complete the referral via API
    console.log('Completing referral:', referral.id)
    // For demo, we'll just update the local state (if we had a list)
  }

  if (loading) return <div>Loading referral data...</div>
  if (error) return <div>Error: {error}</div>

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Referral Program Management</h1>

      {/* Referral Stats */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Referral Statistics</h2>
        {/* We would display stats here from fetchReferrals */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="font-medium">Total Referrals</h3>
            <p className="text-2xl">0</p>
          </div>
          <div>
            <h3 className="font-medium">Completed Referrals</h3>
            <p className="text-2xl">0</p>
          </div>
          <div>
            <h3 className="font-medium">Pending Referrals</h3>
            <p className="text-2xl">0</p>
          </div>
          <div>
            <h3 className="font-medium">Expired Referrals</h3>
            <p className="text-2xl">0</p>
          </div>
        </div>
      </div>

      {/* Generate Referral Code Form */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Generate New Referral Code</h2>
        <form onSubmit={handleGenerateReferral} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Reward Amount</label>
              <Input
                type="number"
                value={formData.rewardAmount}
                onChange={(e) => setFormData({ ...formData, rewardAmount: parseFloat(e.target.value) || 0 })}
                required
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Expires In (Days)</label>
              <Input
                type="number"
                value={formData.expiresInDays}
                onChange={(e) => setFormData({ ...formData, expiresInDays: parseInt(e.target.value) || 30 })}
                min="1"
              />
            </div>
          </div>

          <Button type="submit" className="w-full">
            Generate Referral Code
          </Button>
        </form>
      </div>

      {/* Referral Codes List */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Active Referral Codes</h2>
        {/* We would list the actual referral codes here */}
        <div className="text-center text-muted-foreground py-8">
          No referral codes generated yet.
        </div>
      </div>
    </div>
  )
}