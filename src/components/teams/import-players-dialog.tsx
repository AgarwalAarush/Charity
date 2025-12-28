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
import { Loader2, Upload, FileText, ArrowDownToLine } from 'lucide-react'
import { parseCSVPlayers } from '@/lib/utils'
import { ImportConflictDialog, Conflict, ConflictResolution } from './import-conflict-dialog'
import { ImportSummaryDialog, ImportResult } from './import-summary-dialog'

interface ImportPlayersDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  teamId: string
  onImported: () => void
}

export function ImportPlayersDialog({ open, onOpenChange, teamId, onImported }: ImportPlayersDialogProps) {
  const [csvText, setCsvText] = useState('')
  const [loading, setLoading] = useState(false)
  const [conflicts, setConflicts] = useState<Conflict[]>([])
  const [currentConflictIndex, setCurrentConflictIndex] = useState(0)
  const [showConflictDialog, setShowConflictDialog] = useState(false)
  const [conflictResolutions, setConflictResolutions] = useState<Map<number, ConflictResolution>>(new Map())
  const [importResults, setImportResults] = useState<ImportResult[]>([])
  const [showSummaryDialog, setShowSummaryDialog] = useState(false)
  const { toast } = useToast()

  // Reset state when dialog opens/closes
  const handleDialogChange = (open: boolean) => {
    if (!open) {
      setCsvText('')
      setConflicts([])
      setCurrentConflictIndex(0)
      setShowConflictDialog(false)
      setConflictResolutions(new Map())
      setImportResults([])
      setShowSummaryDialog(false)
      const fileInput = document.getElementById('csv-file') as HTMLInputElement
      if (fileInput) {
        fileInput.value = ''
      }
    }
    onOpenChange(open)
  }

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

  function getUserFriendlyError(error: any): string {
    if (!error) return 'Unknown error'
    
    const errorCode = error.code
    const errorMessage = error.message || ''

    // PostgreSQL error codes
    if (errorCode === '23505') {
      // Unique constraint violation
      if (errorMessage.includes('email')) {
        return 'Email address already exists in the database'
      }
      return 'Duplicate record - this player already exists'
    }
    if (errorCode === '23503') {
      return 'Foreign key constraint violation - referenced record does not exist'
    }
    if (errorCode === '23502') {
      return 'Required field is missing'
    }

    return errorMessage || 'Unknown error occurred'
  }

  async function detectConflicts(
    players: ReturnType<typeof parseCSVPlayers>,
    teamId: string,
    supabase: ReturnType<typeof createClient>
  ): Promise<Conflict[]> {
    const conflicts: Conflict[] = []
    const emailMap = new Map<string, number[]>() // email -> array of player indices

    // Check for duplicate emails in CSV
    players.forEach((player, index) => {
      if (player.email) {
        const normalizedEmail = player.email.toLowerCase().trim()
        if (!emailMap.has(normalizedEmail)) {
          emailMap.set(normalizedEmail, [])
        }
        emailMap.get(normalizedEmail)!.push(index)
      }
    })

    // Add conflicts for CSV duplicates
    emailMap.forEach((indices, email) => {
      if (indices.length > 1) {
        indices.forEach(index => {
          conflicts.push({
            player: players[index],
            type: 'duplicate_email_in_csv',
            errorMessage: `This email appears ${indices.length} times in your CSV file`,
          })
        })
      }
    })

    // Check database for existing records
    for (let i = 0; i < players.length; i++) {
      const player = players[i]
      
      // Skip if already marked as CSV duplicate
      if (conflicts.some(c => c.player === player && c.type === 'duplicate_email_in_csv')) {
        continue
      }

      if (player.email) {
        const normalizedEmail = player.email.toLowerCase().trim()
        
        // Check for existing roster member by email
        const { data: existingMember } = await supabase
          .from('roster_members')
          .select('*')
          .eq('team_id', teamId)
          .ilike('email', normalizedEmail)
          .eq('is_active', true)
          .maybeSingle()

        if (existingMember) {
          conflicts.push({
            player,
            type: 'already_on_roster',
            existingRecord: existingMember as any,
          })
          continue
        }

        // Check for existing user with this email
        const { data: existingUser } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .eq('email', normalizedEmail)
          .maybeSingle()

        if (existingUser) {
          // Check if user is already on roster
          const { data: memberWithUser } = await supabase
            .from('roster_members')
            .select('*')
            .eq('team_id', teamId)
            .eq('user_id', existingUser.id)
            .eq('is_active', true)
            .maybeSingle()

          if (memberWithUser) {
            conflicts.push({
              player,
              type: 'already_on_roster',
              existingRecord: memberWithUser as any,
            })
          } else {
            // User exists but not on roster - this is fine, will send invitation
            // No conflict needed
          }
        }
      }
    }

    return conflicts
  }

  async function processPlayerWithResolution(
    player: ReturnType<typeof parseCSVPlayers>[0],
    conflictIndex: number | null,
    supabase: ReturnType<typeof createClient>,
    userId: string,
    teamId: string
  ): Promise<ImportResult> {
    const resolution = conflictIndex !== null ? conflictResolutions.get(conflictIndex) : null

    // If resolution is skip, return skipped result
    if (resolution === 'skip') {
      return {
        player,
        status: 'skipped',
        action: 'skipped',
        error: 'Skipped by user',
      }
    }

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
          .select('*')
          .eq('team_id', teamId)
          .eq('user_id', existingUser.id)
          .eq('is_active', true)
          .maybeSingle()

        if (existingMember) {
          // Handle merge if resolution is merge
          if (resolution === 'merge') {
            const mergedFields: string[] = []
            const updateData: any = {}

            if (player.fullName !== existingMember.full_name) {
              updateData.full_name = player.fullName
              mergedFields.push('name')
            }
            if (player.email && player.email !== existingMember.email) {
              updateData.email = player.email
              mergedFields.push('email')
            }
            if (player.phone && player.phone !== existingMember.phone) {
              updateData.phone = player.phone
              mergedFields.push('phone')
            }
            if (player.ntrpRating && player.ntrpRating !== existingMember.ntrp_rating) {
              updateData.ntrp_rating = player.ntrpRating
              mergedFields.push('NTRP rating')
            }
            if (player.role && player.role !== existingMember.role) {
              updateData.role = player.role
              mergedFields.push('role')
            }

            if (mergedFields.length > 0) {
              const { error: updateError } = await supabase
                .from('roster_members')
                .update(updateData)
                .eq('id', existingMember.id)

              if (updateError) {
                return {
                  player,
                  status: 'failed',
                  error: getUserFriendlyError(updateError),
                }
              }

              return {
                player,
                status: 'merged',
                action: 'merged',
                existingRecord: existingMember as any,
                mergedFields,
              }
            } else {
              return {
                player,
                status: 'skipped',
                action: 'skipped',
                error: 'No changes to merge',
                existingRecord: existingMember as any,
              }
            }
          } else {
            // Skip if not merging
            return {
              player,
              status: 'skipped',
              action: 'skipped',
              error: 'Player already on roster',
              existingRecord: existingMember as any,
            }
          }
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
          return {
            player,
            status: 'skipped',
            action: 'skipped',
            error: 'Invitation already pending',
          }
        }

        // Send invitation
        const { error: inviteError } = await supabase
          .from('team_invitations')
          .insert({
            team_id: teamId,
            inviter_id: userId,
            invitee_id: existingUser.id,
            invitee_email: existingUser.email,
            status: 'pending',
          })

        if (inviteError) {
          return {
            player,
            status: 'failed',
            error: getUserFriendlyError(inviteError),
          }
        }

        return {
          player,
          status: 'success',
          action: 'invited',
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
          // Check if it's a duplicate key error
          if (insertError.code === '23505' || insertError.message.includes('duplicate')) {
            // If resolution is add_duplicate, try to add with modified email
            if (resolution === 'add_duplicate' && player.email) {
              // Try adding with a modified email (add timestamp)
              const modifiedEmail = `${Date.now()}_${player.email}`
              const { error: retryError } = await supabase
                .from('roster_members')
                .insert({
                  team_id: teamId,
                  full_name: player.fullName,
                  email: modifiedEmail,
                  phone: player.phone || null,
                  ntrp_rating: player.ntrpRating || null,
                  role: player.role || 'player',
                })

              if (retryError) {
                return {
                  player,
                  status: 'failed',
                  error: getUserFriendlyError(insertError),
                }
              }

              return {
                player: { ...player, email: modifiedEmail },
                status: 'success',
                action: 'duplicate_added',
              }
            }
          }

          return {
            player,
            status: 'failed',
            error: getUserFriendlyError(insertError),
          }
        }

        return {
          player,
          status: 'success',
          action: 'added',
        }
      }
    } catch (error: any) {
      return {
        player,
        status: 'failed',
        error: getUserFriendlyError(error),
      }
    }
  }

  async function processAllPlayers() {
    setShowConflictDialog(false)
    setLoading(true)

    try {
      const supabase = createClient()
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

      const parsedPlayers = parseCSVPlayers(csvText)
      const results: ImportResult[] = []

      // Create a map of player to conflict index using a more reliable matching
      const playerToConflictMap = new Map<string, number>()
      conflicts.forEach((conflict, conflictIndex) => {
        // Use a combination of name and email as key
        const key = `${conflict.player.fullName}|${conflict.player.email || ''}`
        playerToConflictMap.set(key, conflictIndex)
      })

      // Process each player
      for (let i = 0; i < parsedPlayers.length; i++) {
        const player = parsedPlayers[i]
        const key = `${player.fullName}|${player.email || ''}`
        const conflictIndex = playerToConflictMap.get(key)
        
        const result = await processPlayerWithResolution(
          player,
          conflictIndex !== undefined ? conflictIndex : null,
          supabase,
          user.id,
          teamId
        )
        results.push(result)
      }

      setImportResults(results)
      setShowSummaryDialog(true)
      setLoading(false)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to process import',
        variant: 'destructive',
      })
      setLoading(false)
    }
  }

  async function handleConflictResolution(resolution: ConflictResolution, applyToAll: boolean = false) {
    if (applyToAll) {
      // Apply resolution to all remaining conflicts
      for (let i = currentConflictIndex; i < conflicts.length; i++) {
        setConflictResolutions(prev => new Map(prev).set(i, resolution))
      }
      // Don't auto-process - wait for user to click "Process Import"
      setCurrentConflictIndex(conflicts.length) // Mark all as resolved
    } else {
      // Apply resolution to current conflict
      setConflictResolutions(prev => new Map(prev).set(currentConflictIndex, resolution))
      
      // Move to next conflict
      if (currentConflictIndex < conflicts.length - 1) {
        setCurrentConflictIndex(prev => prev + 1)
      } else {
        // All conflicts resolved - don't auto-process, wait for button
      }
    }
  }

  function handleProcessImport() {
    // All conflicts should be resolved at this point
    processAllPlayers()
  }

  function handleSummaryClose() {
    setShowSummaryDialog(false)
    setCsvText('')
    const fileInput = document.getElementById('csv-file') as HTMLInputElement
    if (fileInput) {
      fileInput.value = ''
    }
    onImported()
    onOpenChange(false)
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

      // Detect conflicts
      const detectedConflicts = await detectConflicts(parsedPlayers, teamId, supabase)
      setConflicts(detectedConflicts)

      if (detectedConflicts.length > 0) {
        // Show conflict resolution dialog
        setCurrentConflictIndex(0)
        setShowConflictDialog(true)
        setLoading(false)
      } else {
        // No conflicts, process directly
        await processAllPlayers()
      }
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
    <>
      <Dialog open={open} onOpenChange={handleDialogChange}>
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
            <div className="flex items-center justify-between">
              <div className="space-y-2 flex-1">
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
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const link = document.createElement('a')
                  link.href = '/templates/roster-import-template.csv'
                  link.download = 'roster-import-template.csv'
                  link.click()
                }}
                disabled={loading}
                className="ml-2"
              >
                <FileText className="h-4 w-4 mr-2" />
                Download Template
              </Button>
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
            <Button type="button" variant="outline" onClick={() => handleDialogChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="button" onClick={handleImport} disabled={loading || !csvText.trim()}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Import Players
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Conflict Resolution Dialog */}
      <ImportConflictDialog
        open={showConflictDialog}
        conflict={conflicts[currentConflictIndex] || null}
        onResolve={handleConflictResolution}
        onResolveAll={(resolution) => handleConflictResolution(resolution, true)}
        onProcessImport={handleProcessImport}
        hasMoreConflicts={currentConflictIndex < conflicts.length - 1}
        allConflictsResolved={currentConflictIndex >= conflicts.length && conflicts.length > 0}
      />

      {/* Summary Dialog */}
      <ImportSummaryDialog
        open={showSummaryDialog}
        results={importResults}
        onClose={handleSummaryClose}
      />
    </>
  )
}

