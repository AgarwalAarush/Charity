'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { formatDate, formatTime } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { Check, X, HelpCircle, ArrowLeft, Calendar, Users } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getEventTypeLabel, getEventTypeBadgeClass } from '@/lib/event-type-colors'
import { EventTypeBadge } from '@/components/events/event-type-badge'

interface TeamEvent {
  id: string
  team_id: string
  event_name: string
  event_type: string | null
  date: string
  time: string
  location: string | null
  description: string | null
  team_name: string
  availability_status?: string | null
}

export default function TeamAvailabilityPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const teamId = searchParams.get('teamId')
  const [events, setEvents] = useState<TeamEvent[]>([])
  const [teams, setTeams] = useState<Array<{ id: string; name: string }>>([])
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(teamId)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const { toast } = useToast()

  useEffect(() => {
    loadTeams()
  }, [])

  useEffect(() => {
    if (selectedTeamId) {
      loadTeamEvents(selectedTeamId)
    }
  }, [selectedTeamId])

  async function loadTeams() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    // Get teams where user is a roster member
    const { data: rosterMembers } = await supabase
      .from('roster_members')
      .select('team_id, teams(id, name)')
      .eq('user_id', user.id)
      .eq('is_active', true)

    if (rosterMembers) {
      const teamList = rosterMembers
        .map((rm: any) => {
          const team = Array.isArray(rm.teams) ? rm.teams[0] : rm.teams
          return team ? { id: team.id, name: team.name } : null
        })
        .filter((t): t is { id: string; name: string } => t !== null)

      setTeams(teamList)

      // If no team selected and we have teams, select the first one
      if (!selectedTeamId && teamList.length > 0) {
        setSelectedTeamId(teamList[0].id)
      }
    }
  }

  async function loadTeamEvents(teamId: string) {
    const supabase = createClient()
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    // Get roster member ID for this team
    const { data: rosterMember } = await supabase
      .from('roster_members')
      .select('id')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()

    if (!rosterMember) {
      setLoading(false)
      return
    }

    // Get team name
    const { data: team } = await supabase
      .from('teams')
      .select('name')
      .eq('id', teamId)
      .single()

    // Get all future events for this team
    const today = new Date().toISOString().split('T')[0]
    const { data: teamEvents } = await supabase
      .from('events')
      .select('id, event_name, event_type, date, time, location, description, team_id')
      .eq('team_id', teamId)
      .gte('date', today)
      .order('date', { ascending: true })
      .order('time', { ascending: true })

    if (!teamEvents) {
      setEvents([])
      setLoading(false)
      return
    }

    // Get availability for all events
    const eventIds = teamEvents.map(e => e.id)
    const { data: availability } = await supabase
      .from('availability')
      .select('event_id, status')
      .eq('roster_member_id', rosterMember.id)
      .in('event_id', eventIds)

    // Map availability to events
    const availabilityMap = new Map<string, string>()
    availability?.forEach(avail => {
      if (avail.event_id) {
        availabilityMap.set(avail.event_id, avail.status)
      }
    })

    const eventsWithAvailability: TeamEvent[] = teamEvents.map(event => ({
      id: event.id,
      team_id: event.team_id,
      event_name: event.event_name,
      event_type: event.event_type,
      date: event.date,
      time: event.time,
      location: event.location,
      description: event.description,
      team_name: team?.name || '',
      availability_status: availabilityMap.get(event.id) || null,
    }))

    setEvents(eventsWithAvailability)
    setLoading(false)
  }

  async function updateAvailability(eventId: string, status: 'available' | 'unavailable' | 'maybe' | 'last_resort') {
    const supabase = createClient()
    setSaving(prev => ({ ...prev, [eventId]: true }))

    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !selectedTeamId) {
      setSaving(prev => ({ ...prev, [eventId]: false }))
      return
    }

    // Get roster member ID
    const { data: rosterMember } = await supabase
      .from('roster_members')
      .select('id')
      .eq('team_id', selectedTeamId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()

    if (!rosterMember) {
      toast({
        title: 'Error',
        description: 'Could not find roster membership',
        variant: 'destructive',
      })
      setSaving(prev => ({ ...prev, [eventId]: false }))
      return
    }

    // Check if availability exists
    const { data: existing } = await supabase
      .from('availability')
      .select('id')
      .eq('roster_member_id', rosterMember.id)
      .eq('event_id', eventId)
      .maybeSingle()

    let error = null
    if (existing) {
      const result = await supabase
        .from('availability')
        .update({ status })
        .eq('id', existing.id)
      error = result.error
    } else {
      const result = await supabase
        .from('availability')
        .insert({
          roster_member_id: rosterMember.id,
          event_id: eventId,
          status,
        })
      error = result.error
    }

    setSaving(prev => ({ ...prev, [eventId]: false }))

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    } else {
      toast({
        title: 'Updated',
        description: `Availability set to ${getStatusLabel(status)}`,
      })

      // Update local state
      setEvents(prev => prev.map(e =>
        e.id === eventId
          ? { ...e, availability_status: status }
          : e
      ))
    }
  }

  function getStatusLabel(status: string | null | undefined) {
    switch (status) {
      case 'available':
        return 'Available'
      case 'unavailable':
        return 'Unavailable'
      case 'maybe':
        return 'Maybe'
      case 'last_resort':
        return 'Last Resort'
      default:
        return 'Not Set'
    }
  }

  function getStatusIcon(status: string | null | undefined) {
    switch (status) {
      case 'available':
        return <Check className="h-4 w-4 text-green-500" />
      case 'unavailable':
        return <X className="h-4 w-4 text-red-500" />
      case 'maybe':
        return <HelpCircle className="h-4 w-4 text-yellow-500" />
      case 'last_resort':
        return <HelpCircle className="h-4 w-4 text-purple-500" />
      default:
        return null
    }
  }

  if (loading && events.length === 0) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header title="Team Availability" />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen pb-16">
      <Header title="Team Availability" />
      
      <main className="flex-1 p-4 space-y-4">
        {/* Back Button */}
        <Button variant="ghost" onClick={() => router.back()} size="sm" className="mb-2">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        {/* Team Selector */}
        {teams.length > 1 && (
          <Card>
            <CardContent className="p-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Team</label>
                <Select
                  value={selectedTeamId || ''}
                  onValueChange={(value) => setSelectedTeamId(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a team" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map(team => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Events List */}
        {!selectedTeamId ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">Please select a team to view events</p>
            </CardContent>
          </Card>
        ) : events.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <Calendar className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
              <p className="text-muted-foreground">No upcoming events for this team</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {events.map(event => (
              <Card key={event.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {/* Event Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-base truncate">{event.event_name}</h3>
                          {event.event_type && (
                            <EventTypeBadge eventType={event.event_type} />
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground space-y-0.5">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>{formatDate(event.date, 'EEE M/d/yy')}</span>
                            <span className="mx-1">•</span>
                            <span>{formatTime(event.time)}</span>
                          </div>
                          {event.location && (
                            <div className="truncate">{event.location}</div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Current Status */}
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Your Status:</span>
                        {event.availability_status ? (
                          <div className="flex items-center gap-1">
                            {getStatusIcon(event.availability_status)}
                            <span className="text-sm">{getStatusLabel(event.availability_status)}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Not Set</span>
                        )}
                      </div>
                    </div>

                    {/* Quick Action Buttons */}
                    <div className="grid grid-cols-4 gap-2 pt-2">
                      <Button
                        variant={event.availability_status === 'available' ? 'default' : 'outline'}
                        size="sm"
                        className={cn(
                          "flex flex-col items-center gap-1 h-auto py-2",
                          event.availability_status === 'available' && "bg-green-600 hover:bg-green-700 text-white"
                        )}
                        onClick={() => updateAvailability(event.id, 'available')}
                        disabled={saving[event.id]}
                      >
                        <Check className="h-4 w-4" />
                        <span className="text-xs">Available</span>
                      </Button>
                      <Button
                        variant={event.availability_status === 'maybe' ? 'default' : 'outline'}
                        size="sm"
                        className={cn(
                          "flex flex-col items-center gap-1 h-auto py-2",
                          event.availability_status === 'maybe' && "bg-yellow-600 hover:bg-yellow-700 text-white"
                        )}
                        onClick={() => updateAvailability(event.id, 'maybe')}
                        disabled={saving[event.id]}
                      >
                        <HelpCircle className="h-4 w-4" />
                        <span className="text-xs">Maybe</span>
                      </Button>
                      <Button
                        variant={event.availability_status === 'last_resort' ? 'default' : 'outline'}
                        size="sm"
                        className={cn(
                          "flex flex-col items-center gap-1 h-auto py-2",
                          event.availability_status === 'last_resort' && "bg-purple-600 hover:bg-purple-700 text-white"
                        )}
                        onClick={() => updateAvailability(event.id, 'last_resort')}
                        disabled={saving[event.id]}
                      >
                        <HelpCircle className="h-4 w-4" />
                        <span className="text-xs">Last Resort</span>
                      </Button>
                      <Button
                        variant={event.availability_status === 'unavailable' ? 'default' : 'outline'}
                        size="sm"
                        className={cn(
                          "flex flex-col items-center gap-1 h-auto py-2",
                          event.availability_status === 'unavailable' && "bg-red-600 hover:bg-red-700 text-white"
                        )}
                        onClick={() => updateAvailability(event.id, 'unavailable')}
                        disabled={saving[event.id]}
                      >
                        <X className="h-4 w-4" />
                        <span className="text-xs">Unavailable</span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

