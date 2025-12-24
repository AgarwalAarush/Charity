import { EventType } from './calendar-utils'
import { cn } from './utils'

/**
 * Get the color classes for an event type badge
 * This is the centralized styling - all badges should use this
 */
export function getEventTypeBadgeClass(eventType?: EventType): string {
  switch (eventType) {
    case 'practice':
      return 'bg-blue-400 !text-white'
    case 'warmup':
      return 'bg-orange-500 !text-white'
    case 'social':
      return 'bg-pink-500 !text-white'
    case 'other':
      return 'bg-purple-500 !text-white'
    default:
      return 'bg-purple-500 !text-white'
  }
}

/**
 * Get the display label for an event type
 */
export function getEventTypeLabel(eventType?: EventType): string {
  switch (eventType) {
    case 'practice':
      return 'Practice'
    case 'warmup':
      return 'Warmup'
    case 'social':
      return 'Social'
    case 'other':
      return 'Other'
    default:
      return 'Event'
  }
}

/**
 * Get all available event types
 */
export function getEventTypes(): { value: EventType; label: string }[] {
  return [
    { value: 'practice', label: 'Practice' },
    { value: 'warmup', label: 'Warmup' },
    { value: 'social', label: 'Social' },
    { value: 'other', label: 'Other' },
  ]
}




