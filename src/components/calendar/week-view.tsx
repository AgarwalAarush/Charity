'use client'

import { CalendarDay, CalendarItem, getWeekDays, groupItemsByDate, getWeekdayNames } from '@/lib/calendar-utils'
import { CalendarItemTile } from './calendar-item-tile'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useState } from 'react'

interface WeekViewProps {
  currentDate: Date
  items: CalendarItem[]
}

export function WeekView({ currentDate, items }: WeekViewProps) {
  const weekDays = getWeekDays(currentDate)
  const weekdayNames = getWeekdayNames(true)
  const itemsByDate = groupItemsByDate(items)
  const [expandedDay, setExpandedDay] = useState<string | null>(null)

  return (
    <div className="space-y-2">
      {/* Week grid */}
      <div className="grid grid-cols-1 gap-2">
        {weekDays.map((day, index) => {
          const dayItems = itemsByDate[day.dateString] || []
          const visibleItems = expandedDay === day.dateString ? dayItems : dayItems.slice(0, 5)
          const hasMore = dayItems.length > 5
          const isExpanded = expandedDay === day.dateString

          return (
            <Card
              key={day.dateString}
              className={cn(
                'overflow-hidden',
                day.isToday && 'ring-2 ring-primary'
              )}
            >
              <div className="p-3">
                {/* Day header */}
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-semibold">
                      {weekdayNames[index]}
                    </p>
                    <p className={cn(
                      'text-2xl font-bold',
                      day.isToday && 'text-primary'
                    )}>
                      {day.dayOfMonth}
                    </p>
                  </div>
                  
                  {dayItems.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      {dayItems.length} {dayItems.length === 1 ? 'item' : 'items'}
                    </div>
                  )}
                </div>

                {/* Items */}
                <div className="space-y-1.5">
                  {visibleItems.length > 0 ? (
                    <>
                      {visibleItems.map(item => (
                        <CalendarItemTile
                          key={item.id}
                          item={item}
                          compact={false}
                        />
                      ))}
                      
                      {hasMore && !isExpanded && (
                        <button
                          onClick={() => setExpandedDay(day.dateString)}
                          className="w-full text-xs text-primary hover:underline py-1 text-center"
                        >
                          +{dayItems.length - 5} more
                        </button>
                      )}
                      
                      {isExpanded && hasMore && (
                        <button
                          onClick={() => setExpandedDay(null)}
                          className="w-full text-xs text-primary hover:underline py-1 text-center"
                        >
                          Show less
                        </button>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      No events
                    </p>
                  )}
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

