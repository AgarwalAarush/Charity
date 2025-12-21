'use client'

import { CalendarDay, CalendarItem, getWeekDays, groupItemsByDate, getWeekdayNames } from '@/lib/calendar-utils'
import { CalendarItemTile } from './calendar-item-tile'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

interface WeekViewProps {
  currentDate: Date
  items: CalendarItem[]
}

export function WeekView({ currentDate, items }: WeekViewProps) {
  const weekDays = getWeekDays(currentDate)
  const weekdayNames = getWeekdayNames(true)
  const itemsByDate = groupItemsByDate(items)

  // Sort items within each day by time
  const sortItemsByTime = (items: CalendarItem[]) => {
    return [...items].sort((a, b) => {
      // Convert time strings (HH:MM) to comparable numbers
      const timeA = a.time.replace(':', '')
      const timeB = b.time.replace(':', '')
      return timeA.localeCompare(timeB)
    })
  }

  return (
    <div className="overflow-x-auto pb-2">
      {/* Week grid - horizontal layout with vertical columns */}
      <div className="grid grid-cols-7 gap-1 min-w-[700px]">
        {weekDays.map((day, index) => {
          const dayItems = sortItemsByTime(itemsByDate[day.dateString] || [])

          return (
            <Card
              key={day.dateString}
              className={cn(
                'overflow-hidden min-h-[400px] flex flex-col',
                day.isToday && 'ring-2 ring-primary'
              )}
            >
              {/* Day header - fixed at top */}
              <div className={cn(
                'p-2 border-b bg-muted/30 text-center',
                day.isToday && 'bg-primary/10'
              )}>
                <p className="text-xs font-semibold text-muted-foreground">
                  {weekdayNames[index]}
                </p>
                <p className={cn(
                  'text-lg font-bold',
                  day.isToday && 'text-primary'
                )}>
                  {day.dayOfMonth}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {format(day.date, 'MMM')}
                </p>
              </div>

              {/* Items - scrollable if needed */}
              <div className="flex-1 overflow-y-auto p-1.5 space-y-1.5">
                {dayItems.length > 0 ? (
                  dayItems.map(item => (
                    <CalendarItemTile
                      key={item.id}
                      item={item}
                      compact={true}
                    />
                  ))
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-xs text-muted-foreground text-center px-1">
                      No events
                    </p>
                  </div>
                )}
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

