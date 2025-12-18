'use client'

import { useState, useEffect } from 'react'
import { TimeSlotButton } from './time-slot-button'
import { generateTimeSlots, formatTimeDisplay, getAllDays } from '@/lib/availability-utils'

interface AvailabilityGridProps {
  mode: 'weekly' | 'daily'  // weekly for defaults, daily for match
  selectedSlots: string[] | Record<string, string[]>  // ['18:00', '18:30'] or {'Monday': ['18:00']}
  onSelectionChange: (slots: string[] | Record<string, string[]>) => void
  highlightTime?: string  // e.g., '19:00' for match time
  startHour?: number  // default 6
  endHour?: number    // default 22
  readonly?: boolean
  days?: string[]  // for weekly mode, defaults to all days
}

export function AvailabilityGrid({
  mode,
  selectedSlots,
  onSelectionChange,
  highlightTime,
  startHour = 6,
  endHour = 22,
  readonly = false,
  days,
}: AvailabilityGridProps) {
  const [isMouseDown, setIsMouseDown] = useState(false)
  const [dragMode, setDragMode] = useState<'select' | 'deselect' | null>(null)
  const [touchDragMode, setTouchDragMode] = useState<'select' | 'deselect' | null>(null)

  const timeSlots = generateTimeSlots(startHour, endHour)
  const daysToShow = mode === 'weekly' ? (days || getAllDays()) : ['']

  useEffect(() => {
    function handleMouseUp() {
      setIsMouseDown(false)
      setDragMode(null)
    }

    function handleTouchEnd() {
      setTouchDragMode(null)
    }

    if (isMouseDown) {
      window.addEventListener('mouseup', handleMouseUp)
    }
    
    window.addEventListener('touchend', handleTouchEnd)
    
    return () => {
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('touchend', handleTouchEnd)
    }
  }, [isMouseDown])

  function isSlotSelected(time: string, day?: string): boolean {
    if (mode === 'daily') {
      return (selectedSlots as string[]).includes(time)
    } else {
      const weeklySlots = selectedSlots as Record<string, string[]>
      return day ? weeklySlots[day]?.includes(time) || false : false
    }
  }

  function handleSlotToggle(time: string, day?: string) {
    if (mode === 'daily') {
      const currentSlots = selectedSlots as string[]
      const isSelected = currentSlots.includes(time)
      
      if (isSelected) {
        onSelectionChange(currentSlots.filter(s => s !== time))
      } else {
        onSelectionChange([...currentSlots, time].sort())
      }
    } else {
      if (!day) return
      const weeklySlots = selectedSlots as Record<string, string[]>
      const daySlots = weeklySlots[day] || []
      const isSelected = daySlots.includes(time)
      
      if (isSelected) {
        onSelectionChange({
          ...weeklySlots,
          [day]: daySlots.filter(s => s !== time)
        })
      } else {
        onSelectionChange({
          ...weeklySlots,
          [day]: [...daySlots, time].sort()
        })
      }
    }
  }

  function handleMouseDown(time: string, day?: string) {
    if (readonly) return
    
    setIsMouseDown(true)
    const isSelected = isSlotSelected(time, day)
    setDragMode(isSelected ? 'deselect' : 'select')
    handleSlotToggle(time, day)
  }

  function handleMouseEnter(time: string, day?: string) {
    if (!isMouseDown || !dragMode || readonly) return
    
    const isSelected = isSlotSelected(time, day)
    
    if (dragMode === 'select' && !isSelected) {
      handleSlotToggle(time, day)
    } else if (dragMode === 'deselect' && isSelected) {
      handleSlotToggle(time, day)
    }
  }

  function handleTouchStart(time: string, day?: string) {
    if (readonly) return
    
    const isSelected = isSlotSelected(time, day)
    setTouchDragMode(isSelected ? 'deselect' : 'select')
    handleSlotToggle(time, day)
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!touchDragMode || readonly) return
    
    e.preventDefault()
    const touch = e.touches[0]
    const element = document.elementFromPoint(touch.clientX, touch.clientY)
    
    if (element && element.getAttribute('data-time')) {
      const time = element.getAttribute('data-time')!
      const day = element.getAttribute('data-day') || undefined
      const isSelected = isSlotSelected(time, day)
      
      if (touchDragMode === 'select' && !isSelected) {
        handleSlotToggle(time, day)
      } else if (touchDragMode === 'deselect' && isSelected) {
        handleSlotToggle(time, day)
      }
    }
  }

  if (mode === 'weekly') {
    return (
      <div className="overflow-x-auto">
        <div className="min-w-max">
          <div className="grid gap-2" style={{ gridTemplateColumns: `80px repeat(${daysToShow.length}, 1fr)` }}>
            {/* Header row */}
            <div className="font-medium text-sm">Time</div>
            {daysToShow.map((day) => (
              <div key={day} className="font-medium text-sm text-center">
                {day.slice(0, 3)}
              </div>
            ))}

            {/* Time slot rows */}
            {timeSlots.map((time) => (
              <div key={time} className="contents">
                <div className="text-xs sm:text-sm text-muted-foreground flex items-center">
                  {formatTimeDisplay(time)}
                </div>
                {daysToShow.map((day) => (
                  <div key={`${day}-${time}`} data-time={time} data-day={day}>
                    <TimeSlotButton
                      time={time}
                      isSelected={isSlotSelected(time, day)}
                      isHighlighted={highlightTime === time}
                      onMouseDown={() => handleMouseDown(time, day)}
                      onMouseEnter={() => handleMouseEnter(time, day)}
                      onTouchStart={() => handleTouchStart(time, day)}
                      readonly={readonly}
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Daily mode
  return (
    <div className="space-y-2" onTouchMove={handleTouchMove}>
      {timeSlots.map((time) => (
        <div key={time} className="grid grid-cols-[100px_1fr] gap-3 items-center">
          <div className="text-sm text-muted-foreground">
            {formatTimeDisplay(time)}
          </div>
          <div data-time={time}>
            <TimeSlotButton
              time={time}
              isSelected={isSlotSelected(time)}
              isHighlighted={highlightTime === time}
              onMouseDown={() => handleMouseDown(time)}
              onMouseEnter={() => handleMouseEnter(time)}
              onTouchStart={() => handleTouchStart(time)}
              readonly={readonly}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

