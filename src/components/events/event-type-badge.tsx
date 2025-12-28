'use client'

import { Badge } from '@/components/ui/badge'
import { getEventTypeLabel, getEventTypeBadgeClass } from '@/lib/event-type-colors'
import { EventType } from '@/lib/calendar-utils'
import { cn } from '@/lib/utils'

interface EventTypeBadgeProps {
  eventType?: EventType | string | null
  hidePractice?: boolean // If true, returns null for practice events (default: false)
  className?: string
}

/**
 * Centralized component for rendering event type badges
 * Ensures consistent styling across all pages using getEventTypeBadgeClass()
 * 
 * @param eventType - The event type (practice, warmup, social, other)
 * @param hidePractice - If true, practice events won't render a badge (default: false)
 * @param className - Additional CSS classes
 */
export function EventTypeBadge({ 
  eventType, 
  hidePractice = false, 
  className 
}: EventTypeBadgeProps) {
  // Normalize eventType - handle null/undefined consistently
  // Convert to string first to ensure consistent comparison
  const eventTypeStr = String(eventType || 'other').toLowerCase()
  // Map 'fun' to 'social' for display purposes, or handle all valid EventType values
  let normalizedType: EventType = 'other'
  if (eventTypeStr === 'practice' || eventTypeStr === 'warmup' || eventTypeStr === 'social' || eventTypeStr === 'other') {
    normalizedType = eventTypeStr as EventType
  } else if (eventTypeStr === 'fun') {
    normalizedType = 'social' // Map 'fun' to 'social' for display
  }

  // Don't render badge for practice events if hidePractice is true
  // Check after normalization to ensure consistent behavior
  if (hidePractice && normalizedType === 'practice') {
    return null
  }
  
  const label = getEventTypeLabel(normalizedType)
  const badgeClasses = getEventTypeBadgeClass(normalizedType)
  
  // Get the background color for inline style to ensure it overrides
  const getBackgroundColor = () => {
    switch (normalizedType) {
      case 'practice':
        return 'rgb(37, 99, 235)' // blue-600
      case 'warmup':
        return 'rgb(249, 115, 22)' // orange-500
      case 'social':
        return 'rgb(236, 72, 153)' // pink-500
      case 'other':
      default:
        return 'rgb(168, 85, 247)' // purple-500
    }
  }

  return (
    <Badge 
      variant="outline" 
      className={cn("text-[10px] px-1 py-0 h-4 !text-white border-0", badgeClasses, className)}
      style={{ 
        backgroundColor: getBackgroundColor(),
        color: 'white',
        opacity: 1
      }}
    >
      {label}
    </Badge>
  )
}





