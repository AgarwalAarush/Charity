'use client'

import { CalendarDay, CalendarItem, getWeekDays, groupItemsByDate, getWeekdayNames } from '@/lib/calendar-utils'
import { CalendarItemTile } from './calendar-item-tile'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

interface WeekViewProps {
  currentDate: Date
  items: CalendarItem[]
  numWeeks?: number
}

export function WeekView({ currentDate, items, numWeeks = 2 }: WeekViewProps) {
  const weekDays = getWeekDays(currentDate, numWeeks)
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

  // Split days into weeks
  const weeks: CalendarDay[][] = []
  for (let i = 0; i < numWeeks; i++) {
    weeks.push(weekDays.slice(i * 7, (i + 1) * 7))
  }
  
  // Get month name from first day
  const monthName = format(weekDays[0].date, 'MMMM yyyy')

  const renderWeek = (weekDays: CalendarDay[], weekIndex: number) => (
    <div key={weekIndex} className="grid grid-cols-7 gap-1">
      {weekDays.map((day) => {
        const dayItems = sortItemsByTime(itemsByDate[day.dateString] || [])

        return (
          <Card
            key={day.dateString}
            className={cn(
              'overflow-hidden min-h-[400px] flex flex-col',
              day.isToday && 'ring-2 ring-primary'
            )}
          >
            {/* Date header - always shown */}
            <div className="p-1.5 pb-0">
              <p className="text-lg font-bold text-foreground">
                {format(day.date, 'd')}
              </p>
            </div>

            {/* Items - scrollable if needed */}
            <div className="flex-1 overflow-y-auto p-1.5 pt-1 space-y-1.5">
              {dayItems.length > 0 ? (
                dayItems.map((item) => (
                  <CalendarItemTile
                    key={item.id}
                    item={item}
                    compact={true}
                    showDate={false}
                  />
                ))
              ) : (
                <div className="flex items-start">
                  <p className="text-xs text-muted-foreground px-1">
                    No events
                  </p>
                </div>
              )}
            </div>
          </Card>
        )
      })}
    </div>
  )

  return (
    <div className="space-y-1 pb-2">
      {/* Header with month and weekday names */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        <div className="col-span-7 text-center mb-1">
          <h3 className="text-lg font-semibold">{monthName}</h3>
        </div>
        {weekdayNames.map((dayName, index) => (
          <div key={index} className="text-center p-2 bg-muted/30 rounded-md">
            <p className="text-xs font-semibold text-muted-foreground">{dayName}</p>
          </div>
        ))}
      </div>

      {/* Render all weeks */}
      {weeks.map((week, index) => renderWeek(week, index))}
    </div>
  )
}

