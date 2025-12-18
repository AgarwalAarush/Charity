'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AvailabilityGrid } from '@/components/availability/availability-grid'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Save } from 'lucide-react'
import { getAllDays } from '@/lib/availability-utils'

export default function DefaultAvailabilityPage() {
  const [availability, setAvailability] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    loadAvailability()
  }, [])

  async function loadAvailability() {
    const supabase = createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('availability_defaults')
      .eq('id', user.id)
      .single()

    if (profile?.availability_defaults) {
      setAvailability(profile.availability_defaults as Record<string, string[]>)
    } else {
      // Initialize with empty arrays for all days
      const emptyAvailability: Record<string, string[]> = {}
      getAllDays().forEach(day => {
        emptyAvailability[day] = []
      })
      setAvailability(emptyAvailability)
    }

    setLoading(false)
  }

  async function saveAvailability() {
    setSaving(true)
    const supabase = createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in',
        variant: 'destructive',
      })
      setSaving(false)
      return
    }

    const { error } = await supabase
      .from('profiles')
      .update({ availability_defaults: availability })
      .eq('id', user.id)

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    } else {
      toast({
        title: 'Saved',
        description: 'Your default availability has been saved',
      })
    }

    setSaving(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Default Availability" />

      <main className="flex-1 p-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>My Weekly Availability</CardTitle>
            <CardDescription>
              Select the times you're typically available. This will pre-fill when setting match-specific availability.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AvailabilityGrid
              mode="weekly"
              selectedSlots={availability}
              onSelectionChange={(slots) => setAvailability(slots as Record<string, string[]>)}
            />

            <div className="mt-6 flex justify-end">
              <Button onClick={saveAvailability} disabled={saving}>
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Availability
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

