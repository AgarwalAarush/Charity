'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'
import { parseCSVSchedule } from '@/lib/utils'

interface ImportScheduleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  teamId: string
  onImported: () => void
}

export function ImportScheduleDialog({
  open,
  onOpenChange,
  teamId,
  onImported,
}: ImportScheduleDialogProps) {
  const [csvText, setCsvText] = useState('')
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  async function handleImport() {
    if (!csvText.trim()) {
      toast({
        title: 'Error',
        description: 'Please paste your schedule data',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)

    try {
      const parsedSchedule = parseCSVSchedule(csvText)

      if (parsedSchedule.length === 0) {
        toast({
          title: 'Error',
          description: 'Could not parse any matches from the data',
          variant: 'destructive',
        })
        setLoading(false)
        return
      }

      const supabase = createClient()

      // Verify user has permission to add matches
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast({
          title: 'Error',
          description: 'You must be logged in',
          variant: 'destructive',
        })
        setLoading(false)
        return
      }

      const { data: teamData } = await supabase
        .from('teams')
        .select('captain_id, co_captain_id')
        .eq('id', teamId)
        .single()

      console.log('Team data:', teamData, 'Current user:', user.id)
      
      if (!teamData || (teamData.captain_id !== user.id && teamData.co_captain_id !== user.id)) {
        toast({
          title: 'Permission denied',
          description: 'Only team captains can import schedules',
          variant: 'destructive',
        })
        setLoading(false)
        return
      }

      const matchesToInsert = parsedSchedule.map((match) => ({
        team_id: teamId,
        date: match.date,
        time: match.time,
        opponent_name: match.opponent,
        venue: match.venue || null,
        is_home: match.isHome ?? true,
      }))

      console.log('=== IMPORT DEBUG ===')
      console.log('1. Team ID for import:', teamId)
      console.log('2. Matches to insert:', matchesToInsert)

      const { data, error } = await supabase
        .from('matches')
        .insert(matchesToInsert)
        .select()

      console.log('3. Insert result:', { data, error })
      
      // Verify matches were actually created for this team
      const { data: verifyMatches } = await supabase
        .from('matches')
        .select('id, team_id, opponent_name')
        .eq('team_id', teamId)
      console.log('4. Matches now in DB for this team:', verifyMatches)

      if (error) {
        console.error('Insert error:', error)
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        })
      } else {
        console.log(`Successfully inserted ${data?.length || parsedSchedule.length} matches`)
        toast({
          title: 'Schedule imported',
          description: `${data?.length || parsedSchedule.length} matches have been added`,
        })
        setCsvText('')
        onImported()
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to parse schedule data',
        variant: 'destructive',
      })
    }

    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import Schedule</DialogTitle>
          <DialogDescription>
            Paste your schedule data in CSV format
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Schedule Data</Label>
            <Textarea
              placeholder={`Date,Time,Opponent,Venue,Home/Away
2025-01-15,18:00,Team A,Court 1,Home
2025-01-22,19:00,Team B,Court 2,Away`}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              rows={8}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Format: Date (YYYY-MM-DD), Time (HH:MM), Opponent, Venue (optional), Home/Away (optional)
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={loading || !csvText.trim()}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
