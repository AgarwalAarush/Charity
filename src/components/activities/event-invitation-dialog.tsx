'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
import { useToast } from '@/hooks/use-toast'
import { Loader2, X, Search, UserPlus } from 'lucide-react'
import { EmailService } from '@/services/EmailService'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Invitee {
  id?: string // user_id if in app
  email: string
  name?: string
  type: 'teammate' | 'app_user' | 'email'
}

interface SearchResult {
  id?: string // user_id if in app
  email: string
  name?: string
  isAppUser: boolean
  source: 'profile' | 'roster' | 'email'
}

interface EventInvitationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  eventId: string
  onInvited: () => void
  initialEditScope?: 'series' | 'single' | 'future'
}

export function EventInvitationDialog({
  open,
  onOpenChange,
  eventId,
  onInvited,
  initialEditScope,
}: EventInvitationDialogProps) {
  const [invitees, setInvitees] = useState<Invitee[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [teams, setTeams] = useState<Array<{ id: string; name: string }>>([])
  const [invitationMessage, setInvitationMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [isRecurring, setIsRecurring] = useState(false)
  const [editScope, setEditScope] = useState<'series' | 'single' | 'future'>('single')
  const [seriesEvents, setSeriesEvents] = useState<any[]>([])
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      loadTeams()
      loadExistingInvitations()
      loadEventInfo()
    }
  }, [open, eventId])

  async function loadEventInfo() {
    const supabase = createClient()
    
    // Check if this is a personal event with recurrence
    const { data: personalEvent } = await supabase
      .from('personal_events')
      .select('recurrence_series_id, recurrence_pattern, date')
      .eq('id', eventId)
      .single()

    if (personalEvent?.recurrence_series_id) {
      setIsRecurring(true)
      
      // Load all events in the series
      const { data: series } = await supabase
        .from('personal_events')
        .select('id, date')
        .eq('recurrence_series_id', personalEvent.recurrence_series_id)
        .order('date', { ascending: true })

      if (series) {
        setSeriesEvents(series)
        
        // Determine default scope
        if (initialEditScope) {
          setEditScope(initialEditScope)
        } else {
          // Default to 'single' for future events, 'series' for past events
          const eventDate = new Date(personalEvent.date)
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          
          if (eventDate >= today) {
            setEditScope('single')
          } else {
            setEditScope('series')
          }
        }
      }
    } else {
      setIsRecurring(false)
      setEditScope('single')
    }
  }

  async function loadTeams() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return

    const { data: rosterData } = await supabase
      .from('roster_members')
      .select('team_id, teams!inner(id, name)')
      .eq('user_id', user.id)
      .eq('is_active', true)

    if (rosterData) {
      const teamsList = rosterData.map((r: any) => ({
        id: r.team_id,
        name: r.teams.name,
      }))
      setTeams(teamsList)
    }
  }


  async function loadExistingInvitations() {
    const supabase = createClient()
    const { data } = await supabase
      .from('event_invitations')
      .select('invitee_id, invitee_email, invitee_name')
      .eq('event_id', eventId)
      .in('status', ['pending', 'accepted'])

    if (data) {
      const existingInvitees: Invitee[] = data.map((inv: any) => ({
        id: inv.invitee_id,
        email: inv.invitee_email,
        name: inv.invitee_name,
        type: inv.invitee_id ? 'app_user' : 'email',
      }))
      setInvitees(existingInvitees)
    }
  }

  async function searchPeople(query: string) {
    if (query.length < 2) {
      setSearchResults([])
      return
    }

    setSearching(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setSearching(false)
      return
    }

    const results: SearchResult[] = []
    const normalizedQuery = query.toLowerCase().trim()

    // Search app users (profiles)
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .or(`email.ilike.%${query}%,full_name.ilike.%${query}%`)
      .neq('id', user.id) // Exclude current user
      .limit(10)

    if (!profilesError && profiles) {
      profiles.forEach((profile) => {
        results.push({
          id: profile.id,
          email: profile.email,
          name: profile.full_name || undefined,
          isAppUser: true,
          source: 'profile',
        })
      })
    }

    // Search teammates from all user's teams (roster_members)
    // This includes both app users and non-app users
    // First, get all team IDs the user is on
    const { data: userTeams } = await supabase
      .from('roster_members')
      .select('team_id')
      .eq('user_id', user.id)
      .eq('is_active', true)

    const teamIds = userTeams?.map(t => t.team_id) || []

    // Get current user's email to exclude from results
    const { data: currentUserProfile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .single()

    const currentUserEmail = currentUserProfile?.email?.toLowerCase()

    // If user is on teams, search roster members from those teams
    // This includes roster members with user_id (app users) and without (non-app users)
    let rosterData: any[] = []
    if (teamIds.length > 0) {
      const { data, error } = await supabase
        .from('roster_members')
        .select(`
          id,
          user_id,
          full_name,
          email,
          team_id,
          profiles(id, email, full_name)
        `)
        .eq('is_active', true)
        .in('team_id', teamIds)
        .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(50) // Get more results since we'll filter out current user

      if (!error && data) {
        // Filter out current user
        rosterData = data.filter((rm: any) => {
          // Exclude if user_id matches current user
          if (rm.user_id === user.id) return false
          
          // Also exclude if email matches current user's email
          const email = rm.email || rm.profiles?.email || ''
          if (currentUserEmail && email.toLowerCase() === currentUserEmail) {
            return false
          }
          
          return true
        })
      }
    }

    if (rosterData && rosterData.length > 0) {
      rosterData.forEach((rm: any) => {
        const email = rm.email || rm.profiles?.email || ''
        const name = rm.full_name || rm.profiles?.full_name || undefined
        
        // Skip if no email (can't invite without contact info)
        if (!email || email.trim() === '') {
          return
        }
        
        // Skip if email matches current user's email
        if (currentUserEmail && email.toLowerCase() === currentUserEmail) {
          return
        }
        
        // Skip if already in results (from profiles search)
        if (rm.user_id && results.some(r => r.id === rm.user_id)) {
          return
        }
        
        // Skip if email already in results
        if (results.some(r => r.email.toLowerCase() === email.toLowerCase())) {
          return
        }

        // Include roster members whether they have user_id or not
        // This allows inviting non-app users who are on rosters
        results.push({
          id: rm.user_id || undefined, // Will be undefined for non-app users
          email: email,
          name: name,
          isAppUser: !!rm.user_id, // false for roster members without accounts
          source: 'roster',
        })
      })
    }

    // If query looks like an email and not found, offer to add as email-only invite
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (emailRegex.test(normalizedQuery)) {
      const emailExists = results.some(r => r.email.toLowerCase() === normalizedQuery)
      if (!emailExists) {
        results.push({
          email: normalizedQuery,
          isAppUser: false,
          source: 'email',
        })
      }
    }

    // Deduplicate by email (case-insensitive)
    const uniqueResults = results.reduce((acc, result) => {
      const emailLower = result.email.toLowerCase()
      if (!acc.some(r => r.email.toLowerCase() === emailLower)) {
        acc.push(result)
      }
      return acc
    }, [] as SearchResult[])

    setSearchResults(uniqueResults.slice(0, 20)) // Limit to 20 results
    setSearching(false)
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery) {
        searchPeople(searchQuery)
      } else {
        setSearchResults([])
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchQuery])

  function addFromSearch(result: SearchResult) {
    if (invitees.some(inv => inv.email.toLowerCase() === result.email.toLowerCase())) {
      toast({
        title: 'Already added',
        description: `${result.name || result.email} is already in the invite list`,
        variant: 'default',
      })
      return
    }

    // Determine type based on whether they're an app user
    let type: 'teammate' | 'app_user' | 'email' = 'email'
    if (result.isAppUser) {
      type = result.source === 'roster' ? 'teammate' : 'app_user'
    }

    setInvitees([...invitees, {
      id: result.id,
      email: result.email,
      name: result.name,
      type: type,
    }])
    
    // Clear search if it was an exact email match
    if (result.source === 'email' && searchQuery.toLowerCase() === result.email.toLowerCase()) {
      setSearchQuery('')
      setSearchResults([])
    }
  }

  function removeInvitee(index: number) {
    setInvitees(invitees.filter((_, i) => i !== index))
  }

  async function sendInvitations() {
    if (invitees.length === 0) {
      toast({
        title: 'No invitees',
        description: 'Please add at least one person to invite',
        variant: 'destructive',
      })
      return
    }

    setSending(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in',
        variant: 'destructive',
      })
      setSending(false)
      return
    }

    // Determine which events to invite to based on scope
    let targetEventIds: string[] = [eventId]
    
    if (isRecurring && editScope !== 'single') {
      const currentEventDate = new Date()
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      if (editScope === 'series') {
        // Invite to all events in the series
        targetEventIds = seriesEvents.map(e => e.id)
      } else if (editScope === 'future') {
        // Invite to this event and all future events in the series
        const currentEvent = seriesEvents.find(e => e.id === eventId)
        if (currentEvent) {
          const currentDate = new Date(currentEvent.date)
          targetEventIds = seriesEvents
            .filter(e => {
              const eventDate = new Date(e.date)
              return eventDate >= currentDate
            })
            .map(e => e.id)
        }
      }
    }

    // Check existing invitations to avoid duplicates across all target events
    const { data: existing } = await supabase
      .from('event_invitations')
      .select('event_id, invitee_email')
      .in('event_id', targetEventIds)
      .in('status', ['pending', 'accepted'])

    // Create a set of existing invitations by event_id and email
    const existingInvitations = new Set(
      (existing || []).map((inv: any) => `${inv.event_id}:${inv.invitee_email.toLowerCase()}`)
    )

    // Create invitations for each target event
    const allInvitationsToCreate: any[] = []
    
    for (const targetEventId of targetEventIds) {
      for (const invitee of invitees) {
        const invitationKey = `${targetEventId}:${invitee.email.toLowerCase()}`
        if (!existingInvitations.has(invitationKey)) {
          allInvitationsToCreate.push({
            event_id: targetEventId,
            inviter_id: user.id,
            invitee_id: invitee.id || null,
            invitee_email: invitee.email,
            invitee_name: invitee.name || null,
            status: 'pending' as const,
            message: invitationMessage || null,
          })
        }
      }
    }

    if (allInvitationsToCreate.length === 0) {
      toast({
        title: 'All invited',
        description: 'All selected people have already been invited to the selected event(s)',
        variant: 'default',
      })
      setSending(false)
      return
    }

    const { error } = await supabase
      .from('event_invitations')
      .insert(allInvitationsToCreate)

    if (error) {
      toast({
        title: 'Error sending invitations',
        description: error.message,
        variant: 'destructive',
      })
      setSending(false)
      return
    }

    // Get event details and inviter info for email
    // Try personal_events first (activities), then events (team events)
    let event: any = null
    let isPersonalEvent = false

    const { data: personalEvent } = await supabase
      .from('personal_events')
      .select('title, date, time, location, description')
      .eq('id', eventId)
      .single()

    if (personalEvent) {
      event = personalEvent
      isPersonalEvent = true
    } else {
      const { data: teamEvent } = await supabase
        .from('events')
        .select('event_name, date, time, location, description')
        .eq('id', eventId)
        .single()
      
      if (teamEvent) {
        event = teamEvent
        isPersonalEvent = false
      }
    }

    // Get inviter's name
    const { data: inviterProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()

    const inviterName = inviterProfile?.full_name || 'Someone'

    // Send emails to non-app users (and optionally to app users too)
    const emailResults: Array<{ email: string; success: boolean; error?: string }> = []
    
    if (event) {
      // Get unique invitees (by email) to send one email per person
      const uniqueInvitees = Array.from(
        new Map(invitees.map(inv => [inv.email.toLowerCase(), inv])).values()
      )

      for (const invitee of uniqueInvitees) {
        // Send email to all invitees (both app users and non-app users)
        // Non-app users especially need the email to know about the invitation
        const emailData = EmailService.compileEventInvitationEmail({
          eventName: isPersonalEvent ? (event as any).title : (event as any).event_name,
          eventDate: event.date,
          eventTime: event.time,
          eventLocation: event.location,
          eventDescription: event.description,
          inviterName: inviterName,
          inviteeName: invitee.name || undefined,
          invitationMessage: invitationMessage || null,
          isPersonalEvent: isPersonalEvent,
        })

        emailData.to = invitee.email

        // Send email via API route (server-side) to access RESEND_API_KEY securely
        try {
          const response = await fetch('/api/email/send-invitation', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ emailData }),
          })

          const data = await response.json()
          emailResults.push({
            email: invitee.email,
            success: data.success || false,
            error: data.error || undefined,
          })
        } catch (error) {
          emailResults.push({
            email: invitee.email,
            success: false,
            error: error instanceof Error ? error.message : 'Failed to send email',
          })
        }
      }
    }

    const successCount = emailResults.filter(r => r.success).length
    const failCount = emailResults.length - successCount

    const eventCountText = targetEventIds.length > 1 
      ? ` to ${targetEventIds.length} event${targetEventIds.length > 1 ? 's' : ''}`
      : ''
    
    let description = `Sent ${allInvitationsToCreate.length} invitation${allInvitationsToCreate.length > 1 ? 's' : ''}${eventCountText}`
    if (emailResults.length > 0) {
      if (failCount > 0) {
        description += `. ${successCount} email${successCount !== 1 ? 's' : ''} sent, ${failCount} failed.`
      } else {
        description += `. All emails sent successfully.`
      }
    }

    toast({
      title: 'Invitations sent',
      description: description,
    })

    setInvitees([])
    setInvitationMessage('')
    onInvited()
    onOpenChange(false)
    setSending(false)
  }

  const getInitials = (name?: string) => {
    if (!name) return '?'
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Invite People to Activity</DialogTitle>
          <DialogDescription>
            Search for people by name or email address. You can invite app users, teammates, or anyone via email (even if they haven't joined the app yet).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Recurrence Scope Selector */}
          {isRecurring && (
            <div className="space-y-2">
              <Label>Apply to</Label>
              <Select value={editScope} onValueChange={(value: 'series' | 'single' | 'future') => setEditScope(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">This occurrence only</SelectItem>
                  <SelectItem value="future">This and all future occurrences</SelectItem>
                  <SelectItem value="series">All occurrences in series</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {editScope === 'single' && 'Invitations will only be sent for this specific event.'}
                {editScope === 'future' && 'Invitations will be sent for this event and all future events in the series.'}
                {editScope === 'series' && 'Invitations will be sent for all events in the recurring series.'}
              </p>
            </div>
          )}

          {/* Unified Search */}
          <div className="space-y-2">
            <Label>Search People</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
                onKeyDown={(e) => {
                  // If Enter is pressed and there's exactly one result, add it
                  if (e.key === 'Enter' && searchResults.length === 1) {
                    e.preventDefault()
                    addFromSearch(searchResults[0])
                  }
                }}
              />
            </div>

            {searching && (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            )}

            {searchResults.length > 0 && (
              <div className="border rounded-md p-2 max-h-60 overflow-y-auto">
                <div className="space-y-1">
                  {searchResults.map((result, index) => (
                    <div
                      key={`${result.email}-${result.id || index}`}
                      className="flex items-center justify-between p-2 hover:bg-accent rounded cursor-pointer"
                      onClick={() => addFromSearch(result)}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarFallback className="text-xs">
                            {getInitials(result.name || result.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">
                            {result.name || result.email}
                          </div>
                          {result.name && (
                            <div className="text-xs text-muted-foreground truncate">
                              {result.email}
                            </div>
                          )}
                        </div>
                        <Badge 
                          variant={result.isAppUser ? "default" : "outline"} 
                          className="text-xs shrink-0 ml-2"
                        >
                          {result.isAppUser ? 'App User' : 'Email Only'}
                        </Badge>
                      </div>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm"
                        className="shrink-0"
                        onClick={(e) => {
                          e.stopPropagation()
                          addFromSearch(result)
                        }}
                      >
                        <UserPlus className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
              <div className="text-sm text-muted-foreground p-2 text-center">
                No results found. You can still invite by email - just type a valid email address and press Enter.
              </div>
            )}
          </div>

          {/* Invitation Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Invitation Message (Optional)</Label>
            <Textarea
              id="message"
              value={invitationMessage}
              onChange={(e) => setInvitationMessage(e.target.value)}
              placeholder="Add a personal message to your invitation..."
              rows={3}
            />
          </div>

          {/* Invitee List */}
          {invitees.length > 0 && (
            <div className="space-y-2">
              <Label>Invitees ({invitees.length})</Label>
              <div className="border rounded-md p-2 space-y-2 max-h-48 overflow-y-auto">
                {invitees.map((invitee, index) => (
                  <div
                    key={`${invitee.email}-${index}`}
                    className="flex items-center justify-between p-2 bg-accent rounded"
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {getInitials(invitee.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-sm font-medium">
                          {invitee.name || invitee.email}
                        </div>
                        {invitee.name && (
                          <div className="text-xs text-muted-foreground">{invitee.email}</div>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {invitee.type === 'teammate' ? 'Teammate' : 
                         invitee.type === 'app_user' ? 'App User' : 'Email'}
                      </Badge>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeInvitee(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={sending}
          >
            Cancel
          </Button>
          <Button onClick={sendInvitations} disabled={sending || invitees.length === 0}>
            {sending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              `Send ${invitees.length} Invitation${invitees.length !== 1 ? 's' : ''}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}



