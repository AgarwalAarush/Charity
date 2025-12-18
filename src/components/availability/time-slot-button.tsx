'use client'

import { cn } from '@/lib/utils'

interface TimeSlotButtonProps {
  time: string  // '18:00'
  isSelected: boolean
  isHighlighted?: boolean  // for match time
  onMouseDown: () => void
  onMouseEnter: () => void
  onTouchStart?: () => void
  readonly?: boolean
}

export function TimeSlotButton({
  time,
  isSelected,
  isHighlighted = false,
  onMouseDown,
  onMouseEnter,
  onTouchStart,
  readonly = false,
}: TimeSlotButtonProps) {
  return (
    <div
      className={cn(
        'min-h-[44px] border border-border rounded transition-colors select-none',
        'flex items-center justify-center text-xs sm:text-sm',
        readonly && 'cursor-not-allowed opacity-60',
        !readonly && 'cursor-pointer',
        isSelected && 'bg-green-500 hover:bg-green-600 text-white border-green-600',
        !isSelected && 'bg-background hover:bg-accent',
        isHighlighted && 'ring-2 ring-blue-500 ring-offset-2'
      )}
      onMouseDown={readonly ? undefined : onMouseDown}
      onMouseEnter={readonly ? undefined : onMouseEnter}
      onTouchStart={readonly ? undefined : onTouchStart}
    >
      {/* Empty - just colored block */}
    </div>
  )
}

