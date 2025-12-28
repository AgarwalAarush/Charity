'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Loader2, X, Search, UserPlus, Mail, UserCheck, UserX } from 'lucide-react'
import { EmailService } from '@/services/EmailService'

interface SearchResult {
  id?: string // user_id if in app
  email: string
  name?: string
  isAppUser: boolean
  source: 'profile' | 'roster' | 'contact'
}

interface AddAttendeeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  eventId: string
  onAdded: () => void
}

export function AddAttendeeDialog({
  open,
  onOpenChange,
  eventId,
  onAdded,
}: AddAttendeeDialogProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null)
  const [actionType, setActionType] = useState<'direct' | 'invite'>('direct')
  const [loading, setLoading] = useState(false)
  const [existingAttendees, setExistingAttendees] = useState<Set<string>>(new Set())
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      loadExistingAttendees()
      resetForm()
    }
  }, [open, eventId])

  // Debounced search
  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      const timeoutId = setTimeout(() => {
        searchUsers(searchQuery.trim())
      }, 300)
      
      return () => clearTimeout(timeoutId)
    } else {
      setSearchResults([])
      setSelectedResult(null)
    }
  }, [searchQuery])

  async function loadExistingAttendees() {
    const supabase = createClient()
    const { data } = await supabase
      .from('event_attendees')
      .select('email, user_id')
      .eq('personal_event_id', eventId)

    if (data) {
      const emails = new Set<string>()
      data.forEach(att => {
        if (att.email) {
          emails.add(att.email.toLowerCase())
        }
        if (att.user_id) {
          emails.add(att.user_id) // Track by user_id too
        }
      })
      setExistingAttendees(emails)
    }
  }

  async function searchUsers(query: string) {
    setSearching(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      setSearchResults([])
      setSearching(false)
      return
    }
    
    const searchLower = query.toLowerCase()
    const results: SearchResult[] = []
    const seenUserIds = new Set<string>()
    const seenEmails = new Set<string>()
    
    // Search profiles (app users)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .or(`full_name.ilike.%${searchLower}%,email.ilike.%${searchLower}%`)
      .limit(10)
    
    if (profiles) {
      profiles.forEach(profile => {
        if (profile.id && profile.email && !seenUserIds.has(profile.id)) {
          results.push({
            id: profile.id,
            email: profile.email,
            name: profile.full_name || undefined,
            isAppUser: true,
            source: 'profile',
          })
          seenUserIds.add(profile.id)
          seenEmails.add(profile.email.toLowerCase())
        }
      })
    }
    
    // Search roster members from user's teams (includes non-app users)
    const { data: userRosterMemberships } = await supabase
      .from('roster_members')
      .select('team_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
    
    if (userRosterMemberships && userRosterMemberships.length > 0) {
      const userTeamIds = userRosterMemberships.map(rm => rm.team_id)
      
      const { data: rosterMembers } = await supabase
        .from('roster_members')
        .select('user_id, email, full_name')
        .in('team_id', userTeamIds)
        .eq('is_active', true)
        .or(`full_name.ilike.%${searchLower}%,email.ilike.%${searchLower}%`)
        .limit(10)
      
      if (rosterMembers) {
        rosterMembers.forEach(rm => {
          const emailLower = rm.email?.toLowerCase()
          if (emailLower && !seenEmails.has(emailLower)) {
            results.push({
              id: rm.user_id || undefined,
              email: rm.email,
              name: rm.full_name || undefined,
              isAppUser: !!rm.user_id,
              source: 'roster',
            })
            if (rm.user_id) seenUserIds.add(rm.user_id)
            seenEmails.add(emailLower)
          }
        })
      }
    }
    
    // Search contacts (user's personal contacts)
    const { data: contacts } = await supabase
      .from('contacts')
      .select('id, name, email, linked_profile_id')
      .eq('user_id', user.id)
      .or(`name.ilike.%${searchLower}%,email.ilike.%${searchLower}%`)
      .limit(10)
    
    if (contacts) {
      contacts.forEach(contact => {
        const emailLower = contact.email?.toLowerCase()
        if (emailLower && !seenEmails.has(emailLower)) {
          results.push({
            id: contact.linked_profile_id || undefined,
            email: contact.email,
            name: contact.name || undefined,
            isAppUser: !!contact.linked_profile_id,
            source: 'contact',
          })
          if (contact.linked_profile_id) seenUserIds.add(contact.linked_profile_id)
          seenEmails.add(emailLower)
        } else if (contact.name && !emailLower) {
          // Contact without email - still show in results but mark as needing email
          // We'll allow user to add email manually
          const nameKey = contact.name.toLowerCase()
          if (!seenEmails.has(nameKey)) {
            results.push({
              id: contact.linked_profile_id || undefined,
              email: contact.email || '', // Will need to be filled in
              name: contact.name,
              isAppUser: !!contact.linked_profile_id,
              source: 'contact',
            })
            if (contact.linked_profile_id) seenUserIds.add(contact.linked_profile_id)
            seenEmails.add(nameKey)
          }
        }
      })
    }
    
    // Sort results: app users first, then by name
    results.sort((a, b) => {
      if (a.isAppUser !== b.isAppUser) {
        return a.isAppUser ? -1 : 1
      }
      return (a.name || a.email).localeCompare(b.name || b.email)
    })
    
    setSearchResults(results)
    setSearching(false)
  }

  function handleSelectResult(result: SearchResult) {
    setSelectedResult(result)
    setName(result.name || '')
    setEmail(result.email || '') // Handle contacts without email
    setSearchQuery('')
    setSearchResults([])
    
    // Auto-select action type based on whether user is in app
    if (result.isAppUser) {
      setActionType('direct') // Can add app users directly
    } else {
      setActionType('direct') // Default to direct, but allow invite option
    }
  }

  function resetForm() {
    setName('')
    setEmail('')
    setSearchQuery('')
    setSearchResults([])
    setSelectedResult(null)
    setActionType('direct')
  }

  function validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  async function handleSubmit() {
    if (!email || !validateEmail(email)) {
      toast({
        title: 'Invalid email',
        description: 'Please enter a valid email address',
        variant: 'destructive',
      })
      return
    }

    // Check for duplicates
    const emailLower = email.toLowerCase().trim()
    if (existingAttendees.has(emailLower)) {
      toast({
        title: 'Already added',
        description: 'This person is already an attendee',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setLoading(false)
      return
    }

    try {
      if (actionType === 'direct') {
        // Directly add as attendee
        const attendeeData: any = {
          personal_event_id: eventId,
          email: emailLower,
          name: name?.trim() || null,
          availability_status: 'available',
          added_via: 'direct',
        }

        // If selected result is an app user, set user_id
        if (selectedResult?.isAppUser && selectedResult.id) {
          attendeeData.user_id = selectedResult.id
        }

        const { error } = await supabase
          .from('event_attendees')
          .insert(attendeeData)

        if (error) {
          throw error
        }

        toast({
          title: 'Attendee added',
          description: `${name || email} has been added to this activity`,
        })
      } else {
        // Send invitation
        const { data: eventData } = await supabase
          .from('personal_events')
          .select('title, date, time, location')
          .eq('id', eventId)
          .single()

        const invitationData: any = {
          event_id: eventId,
          inviter_id: user.id,
          invitee_id: selectedResult?.isAppUser ? selectedResult.id : null,
          invitee_email: emailLower,
          invitee_name: name?.trim() || null,
          status: 'pending',
        }

        const { error: inviteError } = await supabase
          .from('event_invitations')
          .insert(invitationData)

        if (inviteError) {
          throw inviteError
        }

        // Send invitation email if not an app user
        if (!selectedResult?.isAppUser && eventData) {
          const emailData = EmailService.compileEventInvitationEmail({
            eventName: eventData.title,
            eventDate: eventData.date,
            eventTime: eventData.time,
            eventLocation: eventData.location || undefined,
            inviterName: user.user_metadata?.full_name || 'Someone',
            inviteeName: name || undefined,
          })

          emailData.to = emailLower

          try {
            await fetch('/api/email/send-invitation', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ emailData }),
            })
          } catch (emailError) {
            console.error('Error sending invitation email:', emailError)
            // Don't fail the whole operation if email fails
          }
        }

        toast({
          title: 'Invitation sent',
          description: `An invitation has been sent to ${name || email}`,
        })
      }

      onAdded()
      resetForm()
      onOpenChange(false)
    } catch (error: any) {
      console.error('Error adding attendee:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to add attendee',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Attendee</DialogTitle>
          <DialogDescription>
            Add someone to this activity. You can add them directly or send an invitation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Search */}
          <div className="space-y-2">
            <Label htmlFor="search">Search existing contacts</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
              {searching && (
                <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="border rounded-md max-h-48 overflow-y-auto">
                {searchResults.map((result, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectResult(result)}
                    className="w-full p-2 hover:bg-muted flex items-center gap-2 text-left"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {(result.name || result.email)[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">
                          {result.name || result.email}
                        </span>
                        {result.isAppUser ? (
                          <Badge variant="secondary" className="text-xs">
                            <UserCheck className="h-3 w-3 mr-1" />
                            App User
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            <UserX className="h-3 w-3 mr-1" />
                            Not on App
                          </Badge>
                        )}
                      </div>
                      {result.name && (
                        <p className="text-sm text-muted-foreground truncate">
                          {result.email}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Manual Entry */}
          <div className="space-y-2">
            <Label htmlFor="name">Name (optional)</Label>
            <Input
              id="name"
              placeholder="Enter name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {/* Action Type Selection */}
          {email && (
            <div className="space-y-2">
              <Label>Add as</Label>
              <Select value={actionType} onValueChange={(v: 'direct' | 'invite') => setActionType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="direct">
                    <div className="flex items-center gap-2">
                      <UserPlus className="h-4 w-4" />
                      <span>Add as Attendee</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="invite">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      <span>Send Invitation</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {actionType === 'direct'
                  ? 'They will be added immediately as an attendee'
                  : 'They will receive an email invitation to join'}
              </p>
            </div>
          )}

          {/* Selected Result Info */}
          {selectedResult && (
            <div className="p-3 bg-muted rounded-md flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  {(selectedResult.name || selectedResult.email)[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="font-medium">{selectedResult.name || selectedResult.email}</div>
                {selectedResult.name && (
                  <div className="text-sm text-muted-foreground">{selectedResult.email}</div>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedResult(null)
                  setName('')
                  setEmail('')
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={loading || !email}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {actionType === 'direct' ? 'Add Attendee' : 'Send Invitation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

