'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Upload, FileText } from 'lucide-react'
import { parseCSVPlayers } from '@/lib/utils'

interface ImportPlayersDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  teamId: string
  onImported: () => void
}

export function ImportPlayersDialog({ open, onOpenChange, teamId, onImported }: ImportPlayersDialogProps) {
  const [csvText, setCsvText] = useState('')
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.csv')) {
      toast({
        title: 'Invalid file type',
        description: 'Please select a CSV file',
        variant: 'destructive',
      })
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      setCsvText(text)
    }
    reader.onerror = () => {
      toast({
        title: 'Error reading file',
        description: 'Could not read the CSV file',
        variant: 'destructive',
      })
    }
    reader.readAsText(file)
  }

  async function handleImport() {
    if (!csvText.trim()) {
      toast({
        title: 'Error',
        description: 'Please paste CSV data or upload a file',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)

    try {
      const parsedPlayers = parseCSVPlayers(csvText)

      if (parsedPlayers.length === 0) {
        toast({
          title: 'Error',
          description: 'Could not parse any players from the CSV data',
          variant: 'destructive',
        })
        setLoading(false)
        return
      }

      const supabase = createClient()

      // Verify user has permission
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

      if (!teamData || (teamData.captain_id !== user.id && teamData.co_captain_id !== user.id)) {
        toast({
          title: 'Permission denied',
          description: 'Only team captains can import players',
          variant: 'destructive',
        })
        setLoading(false)
        return
      }

      // Process each player
      let addedCount = 0
      let invitedCount = 0
      let skippedCount = 0
      const errors: string[] = []

      for (const player of parsedPlayers) {
        try {
          // Check if user exists with this email
          let existingUser = null
          if (player.email) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('id, email, full_name')
              .eq('email', player.email.toLowerCase().trim())
              .maybeSingle()
            
            if (profile) {
              existingUser = profile
            }
          }

          if (existingUser) {
            // Check if already on roster
            const { data: existingMember } = await supabase
              .from('roster_members')
              .select('id')
              .eq('team_id', teamId)
              .eq('user_id', existingUser.id)
              .maybeSingle()

            if (existingMember) {
              skippedCount++
              continue
            }

            // Check for pending invitation
            const { data: existingInvite } = await supabase
              .from('team_invitations')
              .select('id')
              .eq('team_id', teamId)
              .eq('invitee_id', existingUser.id)
              .eq('status', 'pending')
              .maybeSingle()

            if (existingInvite) {
              skippedCount++
              continue
            }

            // Send invitation
            const { error: inviteError } = await supabase
              .from('team_invitations')
              .insert({
                team_id: teamId,
                inviter_id: user.id,
                invitee_id: existingUser.id,
                invitee_email: existingUser.email,
                status: 'pending',
              })

            if (inviteError) {
              errors.push(`${player.fullName}: ${inviteError.message}`)
            } else {
              invitedCount++
            }
          } else {
            // Add as non-user roster member
            const { error: insertError } = await supabase
              .from('roster_members')
              .insert({
                team_id: teamId,
                full_name: player.fullName,
                email: player.email || null,
                phone: player.phone || null,
                ntrp_rating: player.ntrpRating || null,
                role: player.role || 'player',
              })

            if (insertError) {
              errors.push(`${player.fullName}: ${insertError.message}`)
            } else {
              addedCount++
            }
          }
        } catch (error: any) {
          errors.push(`${player.fullName}: ${error.message || 'Unknown error'}`)
        }
      }

      // Show results
      const totalProcessed = addedCount + invitedCount + skippedCount
      const hasErrors = errors.length > 0

      if (hasErrors) {
        toast({
          title: 'Import completed with errors',
          description: `${addedCount} added, ${invitedCount} invited, ${skippedCount} skipped. ${errors.length} errors.`,
          variant: 'destructive',
        })
        console.error('Import errors:', errors)
      } else {
        toast({
          title: 'Import successful',
          description: `${addedCount} player(s) added, ${invitedCount} invitation(s) sent, ${skippedCount} skipped`,
        })
      }

      setCsvText('')
      // Reset file input
      const fileInput = document.getElementById('csv-file') as HTMLInputElement
      if (fileInput) {
        fileInput.value = ''
      }
      onImported()
      onOpenChange(false)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to import players',
        variant: 'destructive',
      })
    }

    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Import Players from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file or paste CSV data to import multiple players at once.
            <br />
            <br />
            <strong>CSV Format:</strong> Full Name, Email, Phone, NTRP Rating, Role
            <br />
            <span className="text-xs text-muted-foreground">
              Example: John Doe, john@example.com, 555-1234, 4.0, player
            </span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="csv-file">Upload CSV File</Label>
            <div className="flex items-center gap-2">
              <input
                id="csv-file"
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('csv-file')?.click()}
                disabled={loading}
              >
                <Upload className="h-4 w-4 mr-2" />
                Choose File
              </Button>
              {csvText && (
                <span className="text-sm text-muted-foreground">
                  <FileText className="h-4 w-4 inline mr-1" />
                  File loaded
                </span>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="csv-text">Or Paste CSV Data</Label>
            <Textarea
              id="csv-text"
              placeholder="Full Name, Email, Phone, NTRP Rating, Role&#10;John Doe, john@example.com, 555-1234, 4.0, player&#10;Jane Smith, jane@example.com, 555-5678, 4.5, player"
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              rows={8}
              disabled={loading}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              First row can be a header row (will be automatically skipped). Only Full Name is required.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button type="button" onClick={handleImport} disabled={loading || !csvText.trim()}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Import Players
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

