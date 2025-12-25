'use client'

import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { CalendarItem } from '@/lib/calendar-utils'
import { getTeamColorClass, getPersonalActivityColorClass } from '@/lib/team-colors'
import { getEventTypeBadgeClass, getEventTypeLabel } from '@/lib/event-type-colors'
import { formatTime, formatDate, calculateEndTime } from '@/lib/utils'
import { Check, X, HelpCircle, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { EventTypeBadge } from '@/components/events/event-type-badge'
import { ActivityTypeBadge } from '@/components/activities/activity-type-badge'

interface CalendarItemTileProps {
  item: CalendarItem
  compact?: boolean
  showDate?: boolean
}

export function CalendarItemTile({ item, compact = false, showDate = false }: CalendarItemTileProps) {
  const router = useRouter()

  const getAvailabilityIcon = () => {
    if (!item.availabilityStatus) return null
    
    switch (item.availabilityStatus) {
      case 'available':
        return <Check className="h-3 w-3 text-green-500" />
      case 'unavailable':
        return <X className="h-3 w-3 text-red-500" />
      case 'maybe':
        return <HelpCircle className="h-3 w-3 text-yellow-500" />
      case 'last_resort':
        return <HelpCircle className="h-3 w-3 text-purple-500" />
      default:
        return null
    }
  }

  const handleClick = () => {
    if (item.type === 'match') {
      router.push(`/teams/${item.teamId}/matches/${item.id}`)
    } else if (item.type === 'personal_activity') {
      router.push(`/activities/${item.id}`)
    } else {
      router.push(`/teams/${item.teamId}/events/${item.id}`)
    }
  }

  // Use distinct color for personal activities, team colors for matches/events
  const isPersonalActivity = item.type === 'personal_activity'
  const borderColorClass = isPersonalActivity 
    ? getPersonalActivityColorClass('border')
    : getTeamColorClass(item.teamId, 'border', item.teamColor)
  const bgColorClass = isPersonalActivity
    ? getPersonalActivityColorClass('bgLight')
    : getTeamColorClass(item.teamId, 'bgLight', item.teamColor)

  // Use inline styles for personal activities to ensure dark red color is applied
  const borderStyle = isPersonalActivity 
    ? { borderLeftColor: '#991b1b' } // red-800
    : undefined
  const bgStyle = isPersonalActivity
    ? { backgroundColor: '#fef2f2' } // red-50
    : undefined

  return (
    <div
      onClick={handleClick}
      className={cn(
        'rounded-md cursor-pointer transition-colors hover:opacity-80 border-l-4',
        borderColorClass,
        bgColorClass,
        compact ? 'p-1.5' : 'p-2'
      )}
      style={{
        ...borderStyle,
        ...bgStyle,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            {item.type === 'match' ? (
              <Badge 
                variant="default" 
                className="text-[10px] px-1 py-0 h-4"
              >
                Match {item.is_home !== undefined && (
                  item.is_home ? (
                    <span className="ml-1 bg-teal-500 text-white px-1 rounded">(H)</span>
                  ) : (
                    <span className="ml-1 bg-orange-500 text-white px-1 rounded">(A)</span>
                  )
                )}
              </Badge>
            ) : item.type === 'personal_activity' && item.activityType ? (
              <ActivityTypeBadge activityType={item.activityType} />
            ) : item.type === 'event' ? (
              <EventTypeBadge eventType={item.eventType} />
            ) : null}
            {getAvailabilityIcon()}
          </div>
          
          {showDate && (
            <p className={cn(
              'text-foreground mb-1 font-bold',
              compact ? 'text-lg' : 'text-xl'
            )}>
              {formatDate(item.date, 'd')}
            </p>
          )}
          
          <p className={cn(
            'font-medium truncate',
            compact ? 'text-xs' : 'text-sm'
          )}>
            {item.name}
          </p>
          
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <p className="text-xs text-muted-foreground">
              {(item.type === 'event' || item.type === 'personal_activity') && item.duration 
                ? `${formatTime(item.time)}-${formatTime(calculateEndTime(item.time, item.duration))}`
                : (item.type === 'event' || item.type === 'personal_activity') && !item.duration
                ? `${formatTime(item.time)} (no end time)`
                : formatTime(item.time)}
            </p>
            {item.teamName && (
              <p className={cn(
                'text-muted-foreground truncate',
                compact ? 'text-[10px]' : 'text-xs'
              )}>
                {item.teamName}
              </p>
            )}
            {item.type === 'personal_activity' && (
              <p className={cn(
                'text-muted-foreground truncate',
                compact ? 'text-[10px]' : 'text-xs'
              )}>
                Personal Activity
              </p>
            )}
            {item.availabilitySummary && !compact && (
              <p className="text-xs text-muted-foreground">
                • {item.availabilitySummary.available} available
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

