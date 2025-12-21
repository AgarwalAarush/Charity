'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { RosterMember, Match, Event, Availability } from '@/types/database.types'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { Check, X, HelpCircle, Clock } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface AvailabilityGrid {
  players: RosterMember[]
  items: Array<{ type: 'match' | 'event'; data: Match | Event; id: string; date: string }>
  availability: Record<string, Record<string, Availability>>
}

export default function AvailabilityPage() {
  const params = useParams()
  const router = useRouter()
  const teamId = params.id as string
  const [data, setData] = useState<AvailabilityGrid>({
    players: [],
    items: [],
    availability: {},
  })
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUserRosterIds, setCurrentUserRosterIds] = useState<Record<string, string>>({}) // teamId -> rosterMemberId
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    loadAvailabilityData()
  }, [teamId])

  async function loadAvailabilityData() {
    const supabase = createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    setCurrentUserId(user?.id || null)
    
    // Get current user's roster member ID for this team
    if (user) {
      const { data: userRoster } = await supabase
        .from('roster_members')
        .select('id')
        .eq('team_id', teamId)
        .eq('user_id', user.id)
        .maybeSingle()
      
      if (userRoster) {
        setCurrentUserRosterIds({ [teamId]: (userRoster as any).id })
      }
    }

    // Load roster
    const { data: players } = await supabase
      .from('roster_members')
      .select('*')
      .eq('team_id', teamId)
      .eq('is_active', true)
      .order('full_name')

    // Load upcoming matches
    const today = new Date().toISOString().split('T')[0]
    const { data: matches } = await supabase
      .from('matches')
      .select('*')
      .eq('team_id', teamId)
      .gte('date', today)
      .order('date')
      .limit(10)

    // Load upcoming events
    const { data: events } = await supabase
      .from('events')
      .select('*')
      .eq('team_id', teamId)
      .gte('date', today)
      .order('date')
      .limit(10)

    if (!players || (!matches && !events)) {
      setLoading(false)
      return
    }

    // Combine matches and events into a single sorted list
    const items: Array<{ type: 'match' | 'event'; data: Match | Event; id: string; date: string }> = []

    ;(matches as any[])?.forEach((match: any) => {
      items.push({
        type: 'match',
        data: match,
        id: match.id,
        date: match.date
      })
    })

    ;(events as any[])?.forEach((event: any) => {
      items.push({
        type: 'event',
        data: event,
        id: event.id,
        date: event.date
      })
    })

    // Sort by date
    items.sort((a, b) => a.date.localeCompare(b.date))

    // Load availability for all combinations
    const itemIds = items.map(item => item.id)
    const playerIds = (players as any[]).map((p: any) => p.id)

    const { data: availabilityData } = await supabase
      .from('availability')
      .select('*')
      .in('roster_member_id', playerIds)

    // Build availability lookup
    const availability: Record<string, Record<string, Availability>> = {}
    ;(availabilityData as any[])?.forEach((a: any) => {
      const itemId = a.match_id || a.event_id
      if (!itemId) return

      if (!availability[a.roster_member_id]) {
        availability[a.roster_member_id] = {}
      }
      availability[a.roster_member_id][itemId] = a
    })

    setData({ players: players as RosterMember[], items, availability })
    setLoading(false)
  }

  async function updateAvailability(
    playerId: string,
    itemId: string,
    itemType: 'match' | 'event',
    status: 'available' | 'unavailable' | 'maybe'
  ) {
    const supabase = createClient()

    const existing = data.availability[playerId]?.[itemId]

    let error = null
    if (existing) {
      const result = await (supabase
        .from('availability') as any)
        .update({ status })
        .eq('id', existing.id)
      error = result.error
    } else {
      const insertData: any = {
        roster_member_id: playerId,
        status,
      }

      if (itemType === 'match') {
        insertData.match_id = itemId
      } else {
        insertData.event_id = itemId
      }

      const result = await (supabase.from('availability') as any).insert(insertData)
      error = result.error
    }

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    } else {
      toast({
        title: 'Updated',
        description: 'Availability updated',
      })
      loadAvailabilityData()
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
      default:
        return <span className="h-4 w-4 text-gray-300">-</span>
    }
  }

  const getStatusBg = (status?: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 hover:bg-green-200'
      case 'unavailable':
        return 'bg-red-100 hover:bg-red-200'
      case 'maybe':
        return 'bg-yellow-100 hover:bg-yellow-200'
      case 'late':
        return 'bg-orange-100 hover:bg-orange-200'
      default:
        return 'bg-gray-50 hover:bg-gray-100'
    }
  }

  function getAvailabilityDisplay(avail?: Availability) {
    if (!avail) return { icon: <span className="h-4 w-4 text-gray-300">-</span>, text: 'Not set' }
    
    return {
      icon: getStatusIcon(avail.status),
      text: avail.status || 'Not set'
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

      <main className="flex-1 p-4">
        {data.items.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">No upcoming matches or events</p>
            </CardContent>
          </Card>
        ) : (
          <div className="overflow-x-auto availability-grid">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="sticky left-0 bg-background p-2 text-left text-sm font-medium min-w-[120px]">
                    Player
                  </th>
                  {data.items.map(item => {
                    const itemData = item.data as any
                    const displayName = item.type === 'match' 
                      ? `vs ${itemData.opponent_name}`
                      : itemData.event_name
                    
                    return (
                      <th key={item.id} className="p-2 text-center min-w-[80px]">
                        <div className="text-xs font-medium">
                          {formatDate(item.date, 'MMM d')}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {displayName}
                        </div>
                        <Badge variant={item.type === 'match' ? 'default' : 'secondary'} className="text-[10px] mt-1">
                          {item.type === 'match' ? 'Match' : 'Event'}
                        </Badge>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {data.players.map(player => (
                  <tr key={player.id} className="border-t">
                    <td className="sticky left-0 bg-background p-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">
                          {player.full_name.split(' ')[0]}
                        </span>
                        {player.ntrp_rating && (
                          <Badge variant="outline" className="text-xs">
                            {player.ntrp_rating}
                          </Badge>
                        )}
                      </div>
                    </td>
                    {data.items.map(item => {
                      const avail = data.availability[player.id]?.[item.id]
                      const display = getAvailabilityDisplay(avail)
                      const isCurrentUser = player.user_id === currentUserId
                      
                      return (
                        <td key={item.id} className="p-1">
                          <div className="flex flex-col items-center gap-1">
                            {isCurrentUser ? (
                              <Select
                                value={avail?.status || 'unavailable'}
                                onValueChange={(value) => updateAvailability(player.id, item.id, item.type, value as 'available' | 'unavailable' | 'maybe')}
                              >
                                <SelectTrigger className="h-8 w-full text-xs">
                                  <SelectValue>
                                    <div className="flex items-center justify-center">
                                      {display.icon}
                                    </div>
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="available">
                                    <div className="flex items-center gap-2">
                                      <Check className="h-3 w-3 text-green-500" />
                                      <span>Available</span>
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="maybe">
                                    <div className="flex items-center gap-2">
                                      <HelpCircle className="h-3 w-3 text-yellow-500" />
                                      <span>Maybe</span>
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="unavailable">
                                    <div className="flex items-center gap-2">
                                      <X className="h-3 w-3 text-red-500" />
                                      <span>Unavailable</span>
                                    </div>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <div className={cn(
                                'flex items-center justify-center h-8 w-full rounded px-1',
                                getStatusBg(avail?.status)
                              )}>
                                {display.icon}
                              </div>
                            )}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Legend */}
        <Card className="mt-4">
          <CardContent className="p-3">
            <div className="flex flex-wrap gap-3 text-xs">
              <div className="flex items-center gap-1">
                <Check className="h-3 w-3 text-green-500" />
                <span>Available</span>
              </div>
              <div className="flex items-center gap-1">
                <X className="h-3 w-3 text-red-500" />
                <span>Unavailable</span>
              </div>
              <div className="flex items-center gap-1">
                <HelpCircle className="h-3 w-3 text-yellow-500" />
                <span>Maybe</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-orange-500" />
                <span>Late</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
