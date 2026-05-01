"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { PromotionsService } from '@/lib/promotions/service'
import { getSupabaseBrowser } from '@/utils/supabase/client'
import { useEnvironment } from '@/context/EnvironmentContext'

export default function PromotionsPage() {
  const env = useEnvironment()
  const [promotionsService] = useState(() => new PromotionsService(getSupabaseBrowser()))
  const [promotions, setPromotions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const organizationId = env.org?.id || ''

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'percentage',
    discount_value: 0,
    bogo_get_quantity: 1,
    start_date: '',
    end_date: '',
    max_uses: null as number | null,
    max_uses_per_customer: 1,
    applies_to_category_ids: [] as string[],
    location_id: '' as string | null,
    is_active: true
  })

  // Fetch promotions when organization is available
  useEffect(() => {
    if (organizationId) {
      fetchPromotions()
    } else {
      setLoading(false)
    }
  }, [organizationId])

  async function fetchPromotions() {
    try {
      setLoading(true)
      // In a real implementation, you would call an API endpoint
      // For now, we'll use the service directly (but note: service is for server side)
      // This is a simplification for demonstration
      const data = await promotionsService.getActivePromotions(organizationId)
      setPromotions(data)
    } catch (err) {
      setError('Failed to fetch promotions')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!organizationId) return
    
    try {
      const supabase = getSupabaseBrowser()
      const { error } = await supabase
        .from('promotions')
        .insert({
          organization_id: organizationId,
          location_id: formData.location_id || null,
          name: formData.name,
          description: formData.description,
          type: formData.type,
          discount_value: formData.discount_value,
          bogo_get_quantity: formData.type === 'bogo' ? formData.bogo_get_quantity : null,
          start_date: formData.start_date || null,
          end_date: formData.end_date || null,
          max_uses: formData.max_uses,
          max_uses_per_customer: formData.max_uses_per_customer,
          applies_to_all: formData.applies_to_category_ids.length === 0,
          applies_to_category_ids: formData.applies_to_category_ids.length > 0 ? formData.applies_to_category_ids : null,
          is_active: formData.is_active
        })
      
      if (error) throw error
      
      await fetchPromotions()
      // Reset form
      setFormData({
        name: '',
        description: '',
        type: 'percentage',
        discount_value: 0,
        bogo_get_quantity: 1,
        start_date: '',
        end_date: '',
        max_uses: null,
        max_uses_per_customer: 1,
        applies_to_category_ids: [],
        location_id: '',
        is_active: true
      })
    } catch (err: any) {
      setError('Failed to create promotion: ' + err.message)
      console.error(err)
    }
  }

  function handleToggleActive(promotion: any) {
    if (!organizationId) return
    
    const supabase = getSupabaseBrowser()
    supabase
      .from('promotions')
      .update({ is_active: !promotion.is_active, updated_at: new Date().toISOString() })
      .eq('id', promotion.id)
      .then(() => fetchPromotions())
  }

  if (loading) return <div>Loading promotions...</div>
  if (error) return <div>Error: {error}</div>

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Promotions Management</h1>

      {/* Promotion Form */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Create New Promotion</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Name</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Type</label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage</SelectItem>
                  <SelectItem value="fixed_amount">Fixed Amount</SelectItem>
                  <SelectItem value="bogo">Buy X Get Y</SelectItem>
                  <SelectItem value="volume">Volume Discount</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Discount Value</label>
              <Input
                type="number"
                value={formData.discount_value}
                onChange={(e) => setFormData({ ...formData, discount_value: parseFloat(e.target.value) || 0 })}
                required
              />
            </div>
            {formData.type === 'bogo' && (
              <div>
                <label className="block text-sm font-medium mb-2">Get Y Free</label>
                <Input
                  type="number"
                  value={formData.bogo_get_quantity}
                  onChange={(e) => setFormData({ ...formData, bogo_get_quantity: parseInt(e.target.value) || 1 })}
                  min="1"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Start Date</label>
              <Input
                type="datetime-local"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">End Date</label>
              <Input
                type="datetime-local"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Location (Optional)</label>
              <Select
                value={formData.location_id || 'all'}
                onValueChange={(value) => setFormData({ ...formData, location_id: value === 'all' ? null : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {env.organizationLocations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Max Uses (Optional)</label>
              <Input
                type="number"
                value={formData.max_uses ?? ''}
                onChange={(e) => {
                  const val = e.target.value === '' ? null : parseInt(e.target.value)
                  setFormData({ ...formData, max_uses: val })
                }}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Max Uses Per Customer</label>
              <Input
                type="number"
                value={formData.max_uses_per_customer}
                onChange={(e) => setFormData({ ...formData, max_uses_per_customer: parseInt(e.target.value) || 1 })}
                min="1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Category (Optional)</label>
              <p className="text-sm text-muted-foreground mt-2">Coming soon: filter by category</p>
            </div>
          </div>

          <div className="flex items-center">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              />
              Active
            </label>
          </div>

          <Button type="submit" className="w-full">
            Create Promotion
          </Button>
        </form>
      </div>

      {/* Promotions List */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Active Promotions</h2>
        {promotions.length === 0 ? (
          <p className="text-center text-muted-foreground">No promotions found.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Uses</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {promotions.map((promo) => (
                <TableRow key={promo.id}>
                  <TableCell>{promo.name}</TableCell>
                  <TableCell>
                    {promo.type === 'percentage' && `${promo.discount_value}%`}
                    {promo.type === 'fixed_amount' && `$${promo.discount_value}`}
                    {promo.type === 'bogo' && `Buy ${promo.discount_value} Get ${promo.bogo_get_quantity} Free`}
                    {promo.type === 'volume' && `${promo.discount_value}% off when buying ${promo.discount_value}+`}
                  </TableCell>
                  <TableCell>
                    {promo.type === 'percentage' && `${promo.discount_value}%`}
                    {promo.type === 'fixed_amount' && `$${promo.discount_value}`}
                    {promo.type === 'bogo' && `Buy ${promo.discount_value} Get ${promo.bogo_get_quantity} Free`}
                    {promo.type === 'volume' && `${promo.discount_value}% off when buying ${promo.discount_value}+`}
                  </TableCell>
                  <TableCell>
                    {promo.location_id 
                      ? env.organizationLocations.find(l => l.id === promo.location_id)?.name || 'Unknown'
                      : 'All Locations'
                    }
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger className="h-9 w-9">
                        <Button variant="ghost" size="icon">
                          {/* More vertical icon */}
                          <span className="h-4 w-4">{'⋮'}</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleToggleActive(promo)}>
                          {promo.is_active ? 'Deactivate' : 'Activate'}
                        </DropdownMenuItem>
                        <DropdownMenuItem>Edit</DropdownMenuItem>
                        <DropdownMenuItem>Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}