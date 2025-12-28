'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { Team } from '@/types/database.types'

// Define types inline since they're not exported from database.types
type Match = {
  id: string
  team_id: string
  date: string
  time: string
  opponent_name: string
  venue?: string | null
  is_home: boolean
  duration?: number | null
  [key: string]: any
}

type Event = {
  id: string
  team_id: string
  event_name: string
  date: string
  time: string
  location?: string | null
  event_type?: string | null
  duration?: number | null
  [key: string]: any
}
import { formatDate, formatTime, calculateEndTime, cn } from '@/lib/utils'
import { getEventTypeLabel, getEventTypeBadgeClass } from '@/lib/event-type-colors'
import { EventTypeBadge } from '@/components/events/event-type-badge'
import {
  Users,
  Calendar,
  ClipboardList,
  Plus,
  ChevronRight,
  ChevronDown,
  Settings,
  ListChecks,
  MessageCircle,
  CalendarPlus,
  Check,
  X,
  HelpCircle,
  Clock,
  ArrowRightLeft
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AddMatchDialog } from '@/components/teams/add-match-dialog'
import { AddEventDialog } from '@/components/teams/add-event-dialog'

export default function TeamDetailPage() {
  const params = useParams()
  const router = useRouter()
  const teamId = params.id as string
  const [team, setTeam] = useState<Team | null>(null)
  const [matches, setMatches] = useState<Match[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [eventAvailability, setEventAvailability] = useState<Record<string, string>>({})
  const [rosterCount, setRosterCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showAddMatchDialog, setShowAddMatchDialog] = useState(false)
  const [showAddEventDialog, setShowAddEventDialog] = useState(false)
  const [teamConversationId, setTeamConversationId] = useState<string | null>(null)
  const [pendingInvitesCount, setPendingInvitesCount] = useState(0)
  const [isCaptain, setIsCaptain] = useState(false)
  const [teamStats, setTeamStats] = useState<{
    totalMatches: number
    wins: number
    losses: number
    ties: number
    winPercentage: number
  } | null>(null)
  const [expandedLineups, setExpandedLineups] = useState<Record<string, boolean>>({})
  const [matchLineups, setMatchLineups] = useState<Record<string, any[]>>({})
  const [userTeams, setUserTeams] = useState<Array<{ id: string; name: string }>>([])

  useEffect(() => {
    loadTeamData()
  }, [teamId])

  async function loadTeamData() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Load all teams the user is on
    if (user) {
      const { data: rosterMemberships } = await supabase
        .from('roster_members')
        .select('team_id, teams(id, name)')
        .eq('user_id', user.id)
        .eq('is_active', true)

      if (rosterMemberships) {
        const teams = rosterMemberships
          .map((rm: any) => {
            const team = Array.isArray(rm.teams) ? rm.teams[0] : rm.teams
            return team ? { id: team.id, name: team.name } : null
          })
          .filter((t): t is { id: string; name: string } => t !== null)
        
        setUserTeams(teams)
      }
    }

    const { data: teamData } = await supabase
      .from('teams')
      .select('*')
      .eq('id', teamId)
      .single()

    if (teamData) {
      setTeam(teamData)
      
      // Check if current user is captain
      if (user && (teamData.captain_id === user.id || teamData.co_captain_id === user.id)) {
        setIsCaptain(true)
        
        // Load pending invitations count for captains
        const { count } = await supabase
          .from('team_invitations')
          .select('*', { count: 'exact', head: true })
          .eq('team_id', teamId)
          .eq('status', 'pending')
        
        setPendingInvitesCount(count || 0)
      }
    }

    const today = new Date().toISOString().split('T')[0]
    console.log('=== TEAM DETAIL MATCHES DEBUG ===')
    console.log('1. Today date for filtering:', today)
    console.log('2. Loading matches for team:', teamId, 'user:', user?.id)
    
    // First, get ALL matches for this team (no date filter)
    const { data: allTeamMatches } = await supabase
      .from('matches')
      .select('id, date, opponent_name')
      .eq('team_id', teamId)
      .order('date', { ascending: true })
    console.log('3. ALL matches for this team (no date filter):', allTeamMatches)
    
    // Now get only upcoming matches
    const { data: matchData, error: matchError } = await supabase
      .from('matches')
      .select('*')
      .eq('team_id', teamId)
      .gte('date', today)
      .order('date', { ascending: true })
      .limit(5)

    console.log('4. Upcoming matches (date >= today):', { matchData, matchError, count: matchData?.length })

    if (matchError) {
      console.error('Error loading matches on team detail:', matchError)
    }

    if (matchData) {
      setMatches(matchData)
      // Load lineups for all matches
      const matchIds = matchData.map(m => m.id)
      if (matchIds.length > 0) {
        const { data: lineupsData } = await supabase
          .from('lineups')
          .select(`
            id,
            match_id,
            court_slot,
            player1:roster_members!lineups_player1_id_fkey(full_name),
            player2:roster_members!lineups_player2_id_fkey(full_name)
          `)
          .in('match_id', matchIds)
          .order('match_id')
          .order('court_slot', { ascending: true })

        if (lineupsData) {
          const lineupsByMatch: Record<string, any[]> = {}
          lineupsData.forEach(lineup => {
            if (!lineupsByMatch[lineup.match_id]) {
              lineupsByMatch[lineup.match_id] = []
            }
            lineupsByMatch[lineup.match_id].push(lineup)
          })
          setMatchLineups(lineupsByMatch)
        }
      }
    }

    // Load upcoming events (gracefully handle if table doesn't exist yet)
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('team_id', teamId)
      .gte('date', today)
      .order('date', { ascending: true })
      .limit(5)

    console.log('5. Upcoming events (date >= today):', { eventData, eventError, count: eventData?.length })

    // Only log error if it's not a "relation does not exist" error (table not created yet)
    if (eventError && !eventError.message?.includes('relation') && !eventError.code?.includes('42P01')) {
      console.error('Error loading events on team detail:', eventError)
    }

    // Set events data if available, otherwise default to empty array
    if (eventData) {
      setEvents(eventData)
      
      // Load availability for events if user is logged in
      if (user && eventData.length > 0) {
        // Get user's roster member ID for this team
        const { data: rosterMember } = await supabase
          .from('roster_members')
          .select('id')
          .eq('team_id', teamId)
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle()
        
        if (rosterMember) {
          const eventIds = eventData.map(e => e.id)
          const { data: availabilityData } = await supabase
            .from('availability')
            .select('event_id, status')
            .eq('roster_member_id', rosterMember.id)
            .in('event_id', eventIds)
          
          // Build availability map
          const availMap: Record<string, string> = {}
          availabilityData?.forEach(avail => {
            if (avail.event_id) {
              availMap[avail.event_id] = avail.status || 'unavailable'
            }
          })
          setEventAvailability(availMap)
        }
      }
    } else {
      setEvents([])
      setEventAvailability({})
    }

    const { count } = await supabase
      .from('roster_members')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', teamId)
      .eq('is_active', true)

    setRosterCount(count || 0)

    // Load or create team conversation
    const { data: existingConv } = await supabase
      .from('conversations')
      .select('id')
      .eq('kind', 'team')
      .eq('team_id', teamId)
      .maybeSingle()

    if (existingConv) {
      setTeamConversationId(existingConv.id)
    } else {
      // Create conversation if it doesn't exist
      const { data: newConv } = await supabase
        .from('conversations')
        .insert({
          kind: 'team',
          team_id: teamId,
        })
        .select('id')
        .single()

      if (newConv) {
        setTeamConversationId(newConv.id)
      }
    }

    // Load team statistics
    const { data: statsData } = await supabase
      .from('team_statistics')
      .select('*')
      .eq('team_id', teamId)
      .maybeSingle()

    if (statsData) {
      setTeamStats({
        totalMatches: statsData.total_matches,
        wins: statsData.wins,
        losses: statsData.losses,
        ties: statsData.ties,
        winPercentage: statsData.win_percentage || 0,
      })
    }

    setLoading(false)
  }

  if (loading || !team) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header title={team.name} />
      
      {/* Team Switcher - Only show if user is on multiple teams */}
      {userTeams.length > 1 && (
        <div className="px-4 pb-2">
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Switch Team:</span>
                <Select
                  value={teamId}
                  onValueChange={(newTeamId) => {
                    router.push(`/teams/${newTeamId}`)
                  }}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {userTeams.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <main className="flex-1 p-4 space-y-4">
        {/* Team Info */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge>{team.league_format}</Badge>
                  {team.season && (
                    <span className="text-sm text-muted-foreground">{team.season}</span>
                  )}
                  {isCaptain && pendingInvitesCount > 0 && (
                    <Badge variant="default" className="text-xs">
                      {pendingInvitesCount} pending invite{pendingInvitesCount !== 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
                {team.rating_limit && (
                  <p className="text-sm text-muted-foreground">
                    Rating Limit: {team.rating_limit}
                  </p>
                )}
              </div>
              <Link href={`/teams/${teamId}/settings`}>
                <Button variant="ghost" size="icon">
                  <Settings className="h-5 w-5" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Team Statistics */}
        {teamStats && teamStats.totalMatches > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Season Record</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold">
                  {teamStats.wins}-{teamStats.losses}
                  {teamStats.ties > 0 && `-${teamStats.ties}`}
                </span>
                <Badge variant="default" className="text-base px-3 py-1">
                  {teamStats.winPercentage.toFixed(1)}%
                </Badge>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center text-xs pt-2 border-t">
                <div>
                  <div className="font-bold text-primary">{teamStats.totalMatches}</div>
                  <div className="text-muted-foreground">Played</div>
                </div>
                <div>
                  <div className="font-bold text-green-600">{teamStats.wins}</div>
                  <div className="text-muted-foreground">Won</div>
                </div>
                <div>
                  <div className="font-bold text-red-600">{teamStats.losses}</div>
                  <div className="text-muted-foreground">Lost</div>
                </div>
                <div>
                  <div className="font-bold text-yellow-600">{teamStats.ties}</div>
                  <div className="text-muted-foreground">Tied</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link href={`/teams/${teamId}/roster`}>
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
              <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                <Users className="h-6 w-6 mb-2 text-primary" />
                <span className="text-sm font-medium">Roster</span>
                <span className="text-xs text-muted-foreground">{rosterCount} players</span>
              </CardContent>
            </Card>
          </Link>
          {teamConversationId && (
            <Link href={`/messages/${teamConversationId}`}>
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
                <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                  <MessageCircle className="h-6 w-6 mb-2 text-primary" />
                  <span className="text-sm font-medium">Team Chat</span>
                  <span className="text-xs text-muted-foreground">Messages</span>
                </CardContent>
              </Card>
            </Link>
          )}
          <Card
            className="hover:bg-accent/50 transition-colors cursor-pointer"
            onClick={() => setShowAddMatchDialog(true)}
          >
            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
              <Plus className="h-6 w-6 mb-2 text-primary" />
              <span className="text-sm font-medium">Add Match</span>
              <span className="text-xs text-muted-foreground">Single or CSV</span>
            </CardContent>
          </Card>
          <Card
            className="hover:bg-accent/50 transition-colors cursor-pointer"
            onClick={() => setShowAddEventDialog(true)}
          >
            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
              <CalendarPlus className="h-6 w-6 mb-2 text-primary" />
              <span className="text-sm font-medium">Add Event</span>
              <span className="text-xs text-muted-foreground">Practice, Dinner</span>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Matches */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Upcoming Matches
            </h2>
            <Link href={`/teams/${teamId}/matches`}>
              <Button variant="ghost" size="sm" className="text-xs">
                View All
              </Button>
            </Link>
          </div>

          {matches.length === 0 ? (
            <Card>
              <CardContent className="py-6 text-center">
                <Calendar className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground mb-3">No matches scheduled</p>
                <Button size="sm" onClick={() => setShowAddMatchDialog(true)}>
                  Add Match
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {matches.map((match) => {
                const lineups = matchLineups[match.id] || []
                const isExpanded = expandedLineups[match.id] || false
                return (
                  <Card 
                    key={match.id} 
                    className="hover:bg-accent/50 transition-colors"
                  >
                    <CardContent className="p-3">
                      <div 
                        className="flex items-center justify-between cursor-pointer"
                        onClick={() => router.push(`/teams/${teamId}/matches/${match.id}`)}
                      >
                        <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="default" className="text-xs bg-green-500 text-white">
                            Match
                          </Badge>
                          <span className="font-medium text-sm">
                            vs {match.opponent_name}
                          </span>
                          {match.is_home ? (
                            <Badge variant="default" className="text-xs bg-teal-500 text-white">
                              Home
                            </Badge>
                          ) : (
                            <Badge variant="default" className="text-xs bg-orange-500 text-white">
                              Away
                            </Badge>
                          )}
                        </div>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(match.date, 'EEE, MMM d')} {formatTime(match.time).toLowerCase()}
                            {match.duration && (
                              <span className="ml-1">
                                - {formatTime(calculateEndTime(match.time, match.duration)).toLowerCase()}
                              </span>
                            )}
                          </p>
                          {match.venue && (
                            <p className="text-xs text-muted-foreground mt-1">
                              📍 {match.venue}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs"
                            onClick={(e) => {
                              e.stopPropagation()
                              setExpandedLineups(prev => ({
                                ...prev,
                                [match.id]: !prev[match.id]
                              }))
                            }}
                            title={lineups.length > 0 ? "Show/hide lineup" : "No lineup posted yet"}
                          >
                            <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
                          </Button>
                          <Link href={`/teams/${teamId}/matches/${match.id}/lineup`}>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-xs"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ClipboardList className="h-4 w-4 mr-1" />
                              {lineups.length > 0 ? 'Edit' : 'Lineup'}
                            </Button>
                          </Link>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t space-y-2">
                          {lineups.length > 0 ? (
                            lineups.map((lineup) => (
                              <div key={lineup.id} className="text-xs">
                                <span className="font-medium">Court {lineup.court_slot}:</span>
                                <span className="text-muted-foreground ml-1">
                                  {lineup.player1?.full_name || 'TBD'}
                                  {lineup.player2 && ` & ${lineup.player2.full_name}`}
                                  {!lineup.player1 && !lineup.player2 && ' No players assigned'}
                                </span>
                              </div>
                            ))
                          ) : (
                            <div className="text-xs text-muted-foreground">
                              No lineup posted yet. Click "Lineup" to create one.
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>

        {/* Upcoming Events */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Upcoming Events
            </h2>
          </div>

          {events.length === 0 ? (
            <Card>
              <CardContent className="py-6 text-center">
                <Calendar className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground mb-3">No events scheduled</p>
                {isCaptain && (
                  <Button size="sm" onClick={() => setShowAddEventDialog(true)}>
                    Create Event
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {events.map((event) => (
                <Card 
                  key={event.id} 
                  className="hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => router.push(`/teams/${teamId}/events/${event.id}`)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">
                            {event.event_name}
                          </span>
                          <EventTypeBadge 
                            eventType={(event as any).event_type} 
                            className="text-xs"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(event.date, 'EEE, MMM d')} {formatTime(event.time).toLowerCase()}
                          {(event as any).duration && (
                            <span className="ml-1">
                              - {formatTime(calculateEndTime(event.time, (event as any).duration)).toLowerCase()}
                            </span>
                          )}
                        </p>
                        {event.location && (
                          <p className="text-xs text-muted-foreground mt-1">
                            📍 {event.location}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {(() => {
                          const status = eventAvailability[event.id]
                          if (!status) {
                            return (
                              <span className="text-xs text-muted-foreground">Not set</span>
                            )
                          }
                          const statusConfig = {
                            available: { icon: Check, label: 'Available', color: 'text-green-500' },
                            unavailable: { icon: X, label: 'Unavailable', color: 'text-red-500' },
                            maybe: { icon: HelpCircle, label: 'Maybe', color: 'text-yellow-500' },
                            last_resort: { icon: HelpCircle, label: 'Last Resort', color: 'text-purple-500' },
                          }
                          const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.unavailable
                          const Icon = config.icon
                          return (
                            <div className="flex items-center gap-1">
                              <Icon className={cn('h-3 w-3', config.color)} />
                              <span className={cn('text-xs', config.color)}>{config.label}</span>
                            </div>
                          )
                        })()}
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Captain Tools */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-1">
            Captain Tools
          </h2>
          <div className="grid gap-2">
            <Link href={`/teams/${teamId}/availability`}>
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ListChecks className="h-5 w-5 text-primary" />
                    <span className="text-sm font-medium">Availability Grid</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </main>

      <AddMatchDialog
        open={showAddMatchDialog}
        onOpenChange={setShowAddMatchDialog}
        teamId={teamId}
        onAdded={() => {
          setShowAddMatchDialog(false)
          loadTeamData()
        }}
      />

      <AddEventDialog
        open={showAddEventDialog}
        onOpenChange={setShowAddEventDialog}
        teamId={teamId}
        onAdded={() => {
          setShowAddEventDialog(false)
          loadTeamData()
        }}
      />
    </div>
  )
}
