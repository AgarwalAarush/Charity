'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { createClient } from '@/lib/supabase/client'
import { RosterMember, Match, Availability } from '@/types/database.types'
import { formatDate, formatTime } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { Check, X, HelpCircle, Clock, Info, ChevronDown, ArrowLeft, Save } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface PlayerStats {
  matchesPlayed: number
  matchesWon: number
  matchesLost: number
  availabilityCount: number
  totalMatches: number
}

interface AvailabilityData {
  players: Array<RosterMember & { stats: PlayerStats }>
  matches: Match[]
  availability: Record<string, Record<string, Availability>>
  availabilityCounts: Record<string, { available: number; total: number }>
}

export default function AvailabilityPage() {
  const params = useParams()
  const router = useRouter()
  const teamId = params.id as string
  const [data, setData] = useState<AvailabilityData>({
    players: [],
    matches: [],
    availability: {},
    availabilityCounts: {},
  })
  const [isCaptain, setIsCaptain] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [openPopovers, setOpenPopovers] = useState<Record<string, boolean>>({})
  const [pendingChanges, setPendingChanges] = useState<Record<string, Record<string, 'available' | 'unavailable' | 'maybe' | 'late' | 'last_resort'>>>({})
  const { toast } = useToast()

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  useEffect(() => {
    loadAvailabilityData()
  }, [teamId])

  async function loadAvailabilityData() {
    const supabase = createClient()
    setLoading(true)

    // Get current user and check if captain, also load team configuration
    const { data: { user } } = await supabase.auth.getUser()
    
    // Load team configuration
    const { data: teamData } = await supabase
      .from('teams')
      .select('captain_id, co_captain_id, total_lines, line_match_types')
      .eq('id', teamId)
      .single()

    let teamTotalLines = 3 // Default to 3 courts
    let teamLineMatchTypes: string[] = []
    
    if (!user) {
      setIsCaptain(false)
    } else if (teamData) {
      const isUserCaptain = teamData.captain_id === user.id || teamData.co_captain_id === user.id
      setIsCaptain(isUserCaptain)
      
      // Get team configuration for calculating players needed
      teamTotalLines = teamData.total_lines || 3
      if (teamData.line_match_types && Array.isArray(teamData.line_match_types)) {
        teamLineMatchTypes = teamData.line_match_types
      }
    } else {
      setIsCaptain(false)
    }

    // Load roster
    const { data: players } = await supabase
      .from('roster_members')
      .select('*')
      .eq('team_id', teamId)
      .eq('is_active', true)
      .order('full_name')

    if (!players || players.length === 0) {
      setLoading(false)
      return
    }

    // Load upcoming matches only (this view is for matches)
    const today = new Date().toISOString().split('T')[0]
    const { data: matches } = await supabase
      .from('matches')
      .select('*')
      .eq('team_id', teamId)
      .gte('date', today)
      .order('date')
      .limit(10)

    if (!matches || matches.length === 0) {
      setData({
        players: players.map(p => ({ ...p, stats: { matchesPlayed: 0, matchesWon: 0, matchesLost: 0, availabilityCount: 0, totalMatches: 0 } })),
        matches: [],
        availability: {},
        availabilityCounts: {},
      })
      setLoading(false)
      return
    }

    const playerIds = players.map(p => p.id)
    const matchIds = matches.map(m => m.id)

    // Load player statistics from individual_statistics table
    const { data: statsData } = await supabase
      .from('individual_statistics')
      .select('player_id, matches_played, matches_won, matches_lost')
      .in('player_id', playerIds)

    const statsMap = new Map<string, { matchesPlayed: number; matchesWon: number; matchesLost: number }>()
    statsData?.forEach(stat => {
      statsMap.set(stat.player_id, {
        matchesPlayed: stat.matches_played || 0,
        matchesWon: stat.matches_won || 0,
        matchesLost: stat.matches_lost || 0,
      })
    })

    // Load availability for all player/match combinations
    const { data: availabilityData } = await supabase
      .from('availability')
      .select('*')
      .in('roster_member_id', playerIds)
      .in('match_id', matchIds)

    // Build availability lookup
    const availability: Record<string, Record<string, Availability>> = {}
    availabilityData?.forEach(a => {
      if (!a.match_id) return
      
      if (!availability[a.roster_member_id]) {
        availability[a.roster_member_id] = {}
      }
      availability[a.roster_member_id][a.match_id] = a
    })

    // Calculate availability counts per match
    // Count how many players are available vs. how many are needed to fill the courts
    const availabilityCounts: Record<string, { available: number; total: number }> = {}
    
    // Calculate players needed based on team configuration
    // For each line, determine if it's doubles (2 players) or singles (1 player)
    const playersNeeded = teamLineMatchTypes.length > 0
      ? teamLineMatchTypes.reduce((sum, matchType) => {
          // Doubles Match or Mixed Doubles = 2 players, Singles Match = 1 player
          if (matchType === 'Singles Match') {
            return sum + 1
          } else {
            return sum + 2
          }
        }, 0)
      : teamTotalLines * 2 // Default: assume all doubles (2 players per court)
    
    matchIds.forEach(matchId => {
      let available = 0
      
      // Count only players with status = 'available' (not maybe, late, etc.)
      // This will be recalculated when rendering to include pending changes
      playerIds.forEach(playerId => {
        const avail = availability[playerId]?.[matchId]
        if (avail && avail.status === 'available') {
          available++
        }
      })
      
      availabilityCounts[matchId] = { available, total: playersNeeded }
    })

    // Calculate player stats (including availability count)
    const playersWithStats = players.map(player => {
      const stats = statsMap.get(player.id) || { matchesPlayed: 0, matchesWon: 0, matchesLost: 0 }
      const playerAvailabilities = availability[player.id] || {}
      const availabilityCount = Object.values(playerAvailabilities).filter(a => a.status === 'available').length
      
      return {
        ...player,
        stats: {
          matchesPlayed: stats.matchesPlayed,
          matchesWon: stats.matchesWon,
          matchesLost: stats.matchesLost,
          availabilityCount,
          totalMatches: matches.length,
        }
      }
    })

    setData({
      players: playersWithStats,
      matches,
      availability,
      availabilityCounts,
    })
    setLoading(false)
  }

  function updateAvailabilityLocal(
    playerId: string,
    matchId: string,
    status: 'available' | 'unavailable' | 'maybe' | 'late' | 'last_resort'
  ) {
    try {
      if (!isCaptain) {
        toast({
          title: 'Permission Denied',
          description: 'Only captains can set availability for other players',
          variant: 'destructive',
        })
        return
      }

      if (!playerId || !matchId) {
        console.error('Invalid playerId or matchId:', { playerId, matchId })
        toast({
          title: 'Error',
          description: 'Invalid player or match information',
          variant: 'destructive',
        })
        return
      }

      // Close the popover
      const popoverKey = `${playerId}-${matchId}`
      setOpenPopovers(prev => ({ ...prev, [popoverKey]: false }))

      // Store change in pending changes (offline)
      setPendingChanges(prev => {
        const newChanges = { ...prev }
        if (!newChanges[playerId]) {
          newChanges[playerId] = {}
        }
        newChanges[playerId][matchId] = status
        return newChanges
      })
    } catch (err) {
      console.error('Error in updateAvailabilityLocal:', err)
      toast({
        title: 'Error',
        description: `Failed to update availability: ${err instanceof Error ? err.message : 'Unknown error'}`,
        variant: 'destructive',
      })
    }
  }

  async function saveAllChanges() {
    if (!isCaptain) {
      return
    }

    if (Object.keys(pendingChanges).length === 0) {
      toast({
        title: 'No changes',
        description: 'No pending changes to save',
      })
      return
    }

    setSaving(true)
    const supabase = createClient()
    const errors: string[] = []

    try {
      // Process all pending changes
      for (const [playerId, matchChanges] of Object.entries(pendingChanges)) {
        for (const [matchId, status] of Object.entries(matchChanges)) {
          const existing = data.availability[playerId]?.[matchId]

          try {
            if (existing) {
              // Update existing availability record
              const { error } = await supabase
                .from('availability')
                .update({ status })
                .eq('id', existing.id)
              
              if (error) {
                console.error('Error updating availability:', error)
                errors.push(`${playerId}-${matchId}: ${error.message}`)
              }
            } else {
              // Insert new availability record
              const { error } = await supabase
                .from('availability')
                .insert({
                  roster_member_id: playerId,
                  match_id: matchId,
                  status,
                })
              
              if (error) {
                console.error('Error inserting availability:', error)
                errors.push(`${playerId}-${matchId}: ${error.message}`)
              }
            }
          } catch (err) {
            console.error('Exception saving availability:', err)
            errors.push(`${playerId}-${matchId}: ${err instanceof Error ? err.message : 'Unknown error'}`)
          }
        }
      }

      if (errors.length > 0) {
        toast({
          title: 'Error',
          description: `Failed to save ${errors.length} change(s). Check console for details.`,
          variant: 'destructive',
        })
        console.error('Availability save errors:', errors)
        setSaving(false)
      } else {
        toast({
          title: 'Saved',
          description: 'All availability changes saved successfully',
        })
        // Clear pending changes and reload data
        setPendingChanges({})
        await loadAvailabilityData()
        setSaving(false)
      }
    } catch (err) {
      console.error('Fatal error in saveAllChanges:', err)
      toast({
        title: 'Error',
        description: `Failed to save changes: ${err instanceof Error ? err.message : 'Unknown error'}`,
        variant: 'destructive',
      })
      setSaving(false)
    }
  }

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'available':
        return <Check className="h-4 w-4 text-green-500" />
      case 'unavailable':
        return <X className="h-4 w-4 text-red-500" />
      case 'maybe':
        return <HelpCircle className="h-4 w-4 text-yellow-500" />
      case 'late':
        return <Clock className="h-4 w-4 text-orange-500" />
      case 'last_resort':
        return <HelpCircle className="h-4 w-4 text-purple-500" />
      default:
        return null
    }
  }

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'available':
        return 'Available'
      case 'unavailable':
        return 'Unavailable'
      case 'maybe':
        return 'Maybe'
      case 'late':
        return 'Running Late'
      case 'last_resort':
        return 'Last Resort'
      default:
        return 'Set availability'
    }
  }

  const getStatusButtonClass = (status?: string) => {
    if (!status) {
      return 'bg-gray-100 hover:bg-gray-200 text-gray-600 border-gray-300'
    }
    switch (status) {
      case 'available':
        return 'bg-green-100 hover:bg-green-200 text-green-700 border-green-300'
      case 'unavailable':
        return 'bg-red-100 hover:bg-red-200 text-red-700 border-red-300'
      case 'maybe':
        return 'bg-yellow-100 hover:bg-yellow-200 text-yellow-700 border-yellow-300'
      case 'late':
        return 'bg-orange-100 hover:bg-orange-200 text-orange-700 border-orange-300'
      case 'last_resort':
        return 'bg-purple-100 hover:bg-purple-200 text-purple-700 border-purple-300'
      default:
        return 'bg-gray-100 hover:bg-gray-200 text-gray-600 border-gray-300'
    }
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
      <Header title="Availability" />

      <main className="flex-1 p-4 pt-2">
        <div className="flex items-center justify-between mb-2">
          <Button variant="ghost" onClick={() => router.back()} size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          
          {isCaptain && Object.keys(pendingChanges).length > 0 && (
            <Button 
              onClick={saveAllChanges} 
              disabled={saving}
              className="ml-auto"
              size="sm"
            >
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Saving...' : `Save ${Object.values(pendingChanges).reduce((sum, changes) => sum + Object.keys(changes).length, 0)} Change(s)`}
            </Button>
          )}
        </div>
        
        {data.matches.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">No upcoming matches</p>
            </CardContent>
          </Card>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                {/* First header row: Column names */}
                <tr className="border-b">
                  <th className="sticky left-0 bg-background p-2 text-left text-sm font-medium border-r min-w-[150px] z-10">
                    PLAYER
                  </th>
                  <th className="p-2 text-center text-sm font-medium border-r min-w-[120px] bg-gray-50">
                    MATCH HISTORY
                  </th>
                  {data.matches.map((match, index) => (
                    <th key={match.id} className="p-2 text-center text-sm font-medium border-r min-w-[140px] bg-gray-50">
                      MATCH {index + 1} {match.is_home ? '(H)' : '(A)'}
                    </th>
                  ))}
                </tr>
                {/* Second header row: Match details and availability counts */}
                <tr className="border-b bg-gray-50">
                  <th className="sticky left-0 bg-gray-50 p-2 border-r z-10"></th>
                  <th className="p-2 text-center text-xs text-muted-foreground border-r">
                    AVAILABLE
                  </th>
                  {data.matches.map(match => {
                    const baseCount = data.availabilityCounts[match.id] || { available: 0, total: data.players.length }
                    
                    // Recalculate available count including pending changes
                    let availableCount = baseCount.available
                    data.players.forEach(player => {
                      const pendingStatus = pendingChanges[player.id]?.[match.id]
                      const savedStatus = data.availability[player.id]?.[match.id]?.status
                      
                      if (pendingStatus) {
                        // Adjust count based on pending change
                        if (savedStatus === 'available' && pendingStatus !== 'available') {
                          availableCount-- // Was available, now not
                        } else if (savedStatus !== 'available' && pendingStatus === 'available') {
                          availableCount++ // Was not available, now is
                        }
                      }
                    })
                    
                    // Format: "1-2-26 @7:45P"
                    const matchDate = formatDate(match.date, 'M-d-yy')
                    const timeStr = formatTime(match.time)
                    const timeParts = timeStr.split(':')
                    const hour = parseInt(timeParts[0])
                    const minute = timeParts[1].split(' ')[0]
                    const ampm = timeStr.includes('AM') ? 'A' : 'P'
                    const formattedTime = `${hour}:${minute}${ampm}`
                    const opponent = match.opponent_name || 'TBD'
                    const dateTimeText = `${matchDate} @${formattedTime}`
                    
                    return (
                      <th key={match.id} className="p-2 border-r">
                        <div className="text-xs font-medium mb-1 text-left px-1">
                          {dateTimeText}
                        </div>
                        <div className={cn(
                          "text-xs font-medium",
                          availableCount >= baseCount.total ? "text-green-600" : "text-red-600"
                        )}>
                          {availableCount} of {baseCount.total}
                        </div>
                      </th>
                    )
                  })}
                </tr>
                {/* Third header row: Opponent names */}
                <tr className="border-b bg-gray-50">
                  <th className="sticky left-0 bg-gray-50 p-2 border-r z-10"></th>
                  <th className="p-2 text-center text-xs text-muted-foreground border-r"></th>
                  {data.matches.map(match => {
                    const opponent = match.opponent_name || 'TBD'
                    return (
                      <th key={match.id} className="p-2 border-r">
                        <div className="text-xs font-medium text-left px-1">
                          {opponent}
                        </div>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {data.players.map(player => (
                  <tr key={player.id} className="border-b hover:bg-muted/50">
                    {/* Player column */}
                    <td className="sticky left-0 bg-background p-2 border-r z-10">
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-primary/10 text-primary text-sm">
                              {getInitials(player.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <Popover>
                            <PopoverTrigger asChild>
                              <button
                                type="button"
                                className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-blue-500 text-white text-[10px] flex items-center justify-center hover:bg-blue-600"
                              >
                                <Info className="h-3 w-3" />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-64">
                              <div className="space-y-2 text-sm">
                                <div>
                                  <strong>Name:</strong> {player.full_name}
                                </div>
                                {player.email && (
                                  <div>
                                    <strong>Email:</strong> {player.email}
                                  </div>
                                )}
                                {player.phone && (
                                  <div>
                                    <strong>Phone:</strong> {player.phone}
                                  </div>
                                )}
                                {player.ntrp_rating && (
                                  <div>
                                    <strong>NTRP:</strong> {player.ntrp_rating}
                                  </div>
                                )}
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                        <span className="text-sm font-medium">{player.full_name}</span>
                      </div>
                    </td>
                    
                    {/* Match History column */}
                    <td className="p-2 text-center text-xs border-r">
                      <div className="space-y-0.5">
                        <div>- Played {player.stats.matchesPlayed} of {data.matches.length}</div>
                        <div>- {player.stats.matchesWon} wins / {player.stats.matchesLost} loss</div>
                        <div>- Avail {player.stats.availabilityCount} of {data.matches.length}</div>
                      </div>
                    </td>
                    
                    {/* Match columns */}
                    {data.matches.map(match => {
                      const avail = data.availability[player.id]?.[match.id]
                      const pendingStatus = pendingChanges[player.id]?.[match.id]
                      // Show pending status if available, otherwise show saved status
                      const status = pendingStatus || avail?.status
                      const hasPendingChange = !!pendingStatus
                      const popoverKey = `${player.id}-${match.id}`
                      const isOpen = openPopovers[popoverKey] || false
                      
                      return (
                        <td key={match.id} className="p-2 text-center border-r">
                          {isCaptain ? (
                            <Popover open={isOpen} onOpenChange={(open) => setOpenPopovers(prev => ({ ...prev, [popoverKey]: open }))}>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className={cn(
                                    'w-full justify-between text-xs',
                                    getStatusButtonClass(status),
                                    hasPendingChange && 'ring-2 ring-blue-500 ring-offset-1'
                                  )}
                                >
                                  <span className="flex items-center gap-1">
                                    {getStatusIcon(status)}
                                    {getStatusLabel(status)}
                                    {hasPendingChange && <span className="text-blue-500">*</span>}
                                  </span>
                                  <ChevronDown className="h-3 w-3" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-48 p-0">
                                <div className="py-1">
                                  <Button
                                    variant="ghost"
                                    className="w-full justify-start rounded-none"
                                    onClick={() => updateAvailabilityLocal(player.id, match.id, 'available')}
                                  >
                                    <Check className="h-4 w-4 mr-2 text-green-500" />
                                    Available
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    className="w-full justify-start rounded-none"
                                    onClick={() => updateAvailabilityLocal(player.id, match.id, 'unavailable')}
                                  >
                                    <X className="h-4 w-4 mr-2 text-red-500" />
                                    Unavailable
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    className="w-full justify-start rounded-none"
                                    onClick={() => updateAvailabilityLocal(player.id, match.id, 'maybe')}
                                  >
                                    <HelpCircle className="h-4 w-4 mr-2 text-yellow-500" />
                                    Maybe
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    className="w-full justify-start rounded-none"
                                    onClick={() => updateAvailabilityLocal(player.id, match.id, 'late')}
                                  >
                                    <Clock className="h-4 w-4 mr-2 text-orange-500" />
                                    Running Late
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    className="w-full justify-start rounded-none"
                                    onClick={() => updateAvailabilityLocal(player.id, match.id, 'last_resort')}
                                  >
                                    <HelpCircle className="h-4 w-4 mr-2 text-purple-500" />
                                    Last Resort
                                  </Button>
                                </div>
                              </PopoverContent>
                            </Popover>
                          ) : (
                            <div className={cn(
                              'flex items-center justify-center h-8 w-full rounded border cursor-default',
                              getStatusButtonClass(status)
                            )}>
                              {status ? (
                                <span className="flex items-center gap-1 text-xs">
                                  {getStatusIcon(status)}
                                  {getStatusLabel(status)}
                                </span>
                              ) : (
                                <span className="text-gray-400 text-xs">?</span>
                              )}
                            </div>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}
