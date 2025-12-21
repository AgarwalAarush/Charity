'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'

interface Venue {
  id: string
  name: string
  address: string | null
  google_maps_link: string | null
}

interface VenueDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  venue: Venue | null
  teamId: string
  onSaved: () => void
}

export function VenueDialog({
  open,
  onOpenChange,
  venue,
  teamId,
  onSaved,
}: VenueDialogProps) {
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [googleMapsLink, setGoogleMapsLink] = useState('')
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  // Reset form when dialog opens/closes or venue changes
  useEffect(() => {
    if (open) {
      if (venue) {
        setName(venue.name || '')
        setAddress(venue.address || '')
        setGoogleMapsLink(venue.google_maps_link || '')
      } else {
        setName('')
        setAddress('')
        setGoogleMapsLink('')
      }
    }
  }, [open, venue])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!name.trim()) {
      toast({
        title: 'Error',
        description: 'Venue name is required',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()

    try {
      if (venue) {
        // Update existing venue
        const { error } = await supabase
          .from('venues')
          .update({
            name: name.trim(),
            address: address.trim() || null,
            google_maps_link: googleMapsLink.trim() || null,
          })
          .eq('id', venue.id)

        if (error) {
          toast({
            title: 'Error',
            description: error.message,
            variant: 'destructive',
          })
        } else {
          toast({
            title: 'Venue updated',
            description: 'The venue has been updated successfully',
          })
          onSaved()
          onOpenChange(false)
        }
      } else {
        // Create new venue
        const { data: { user } } = await supabase.auth.getUser()
        const { error } = await supabase
          .from('venues')
          .insert({
            team_id: teamId,
            name: name.trim(),
            address: address.trim() || null,
            google_maps_link: googleMapsLink.trim() || null,
            created_by: user?.id || null,
          })

        if (error) {
          toast({
            title: 'Error',
            description: error.message,
            variant: 'destructive',
          })
        } else {
          toast({
            title: 'Venue created',
            description: 'The venue has been added successfully',
          })
          onSaved()
          onOpenChange(false)
        }
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save venue',
        variant: 'destructive',
      })
    }

    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{venue ? 'Edit Venue' : 'Add Venue'}</DialogTitle>
          <DialogDescription>
            {venue ? 'Update the venue information' : 'Add a new tennis court location'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              Club/Venue Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder="Tennis Club Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              placeholder="123 Tennis Court Rd, City, State ZIP"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="googleMapsLink">Google Maps Link</Label>
            <Input
              id="googleMapsLink"
              type="url"
              placeholder="https://maps.google.com/..."
              value={googleMapsLink}
              onChange={(e) => setGoogleMapsLink(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Paste the full Google Maps URL for this location
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                venue ? 'Update' : 'Create'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

