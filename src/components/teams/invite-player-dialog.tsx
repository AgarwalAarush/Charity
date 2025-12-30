'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { Loader2, Mail, UserPlus } from 'lucide-react'
import { EmailService } from '@/services/EmailService'

interface InvitePlayerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  teamId: string
  teamName?: string
  onInvited: () => void
}

export function InvitePlayerDialog({ 
  open, 
  onOpenChange, 
  teamId, 
  teamName,
  onInvited 
}: InvitePlayerDialogProps) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const resetForm = () => {
    setEmail('')
    setName('')
    setMessage('')
  }

  const handleClose = (open: boolean) => {
    if (!open) {
      resetForm()
    }
    onOpenChange(open)
  }

  async function handleSendInvite(e: React.FormEvent) {
    e.preventDefault()
    
    if (!email || !email.includes('@')) {
      toast({
        title: 'Invalid email',
        description: 'Please enter a valid email address',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
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

    // Get inviter name
    const { data: inviterProfile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single()

    const inviterName = inviterProfile?.full_name || inviterProfile?.email || 'Someone'

    // Get team name if not provided
    let finalTeamName = teamName
    if (!finalTeamName) {
      const { data: teamData } = await supabase
        .from('teams')
        .select('name')
        .eq('id', teamId)
        .single()
      
      finalTeamName = teamData?.name || 'the team'
    }

    // Check if user with this email already exists
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle()

    // Check if already on roster
    if (existingUser) {
      const { data: existingMember } = await supabase
        .from('roster_members')
        .select('id')
        .eq('team_id', teamId)
        .eq('user_id', existingUser.id)
        .eq('is_active', true)
        .maybeSingle()

      if (existingMember) {
        toast({
          title: 'Already on roster',
          description: `${existingUser.full_name || existingUser.email} is already on this team`,
          variant: 'destructive',
        })
        setLoading(false)
        return
      }
    } else {
      // Check if non-app user with this email is already on roster
      const { data: existingMemberByEmail } = await supabase
        .from('roster_members')
        .select('id')
        .eq('team_id', teamId)
        .ilike('email', email.toLowerCase().trim())
        .is('user_id', null)
        .eq('is_active', true)
        .maybeSingle()

      if (existingMemberByEmail) {
        toast({
          title: 'Already on roster',
          description: 'This email is already associated with a player on this team',
          variant: 'destructive',
        })
        setLoading(false)
        return
      }
    }

    // Check for pending invitation
    const { data: existingInvite } = await supabase
      .from('team_invitations')
      .select('id')
      .eq('team_id', teamId)
      .ilike('invitee_email', email.toLowerCase().trim())
      .eq('status', 'pending')
      .maybeSingle()

    if (existingInvite) {
      toast({
        title: 'Already invited',
        description: 'An invitation has already been sent to this email address',
        variant: 'destructive',
      })
      setLoading(false)
      return
    }

    // Create invitation record
    const { error: inviteError } = await supabase
      .from('team_invitations')
      .insert({
        team_id: teamId,
        inviter_id: user.id,
        invitee_id: existingUser?.id || null,
        invitee_email: email.toLowerCase().trim(),
        invitee_name: name || existingUser?.full_name || null,
        status: 'pending',
        message: message || null,
      })

    if (inviteError) {
      toast({
        title: 'Error creating invitation',
        description: inviteError.message,
        variant: 'destructive',
      })
      setLoading(false)
      return
    }

    // Send invitation email
    const emailData = EmailService.compileTeamInvitationEmail({
      teamName: finalTeamName,
      inviterName,
      inviteeName: name || existingUser?.full_name || undefined,
      invitationMessage: message || null,
    })

    emailData.to = email.toLowerCase().trim()

    try {
      const response = await fetch('/api/email/send-team-invitation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ emailData }),
      })

      const data = await response.json()

      if (!data.success) {
        toast({
          title: 'Invitation created',
          description: 'Invitation was created but email could not be sent. The person can still join using this email address.',
          variant: 'default',
        })
      } else {
        toast({
          title: 'Invitation sent!',
          description: `An invitation has been sent to ${email}. They'll receive an email to join the app and this team.`,
        })
      }

      resetForm()
      onInvited()
      handleClose(false)
    } catch (error) {
      toast({
        title: 'Invitation created',
        description: 'Invitation was created but email could not be sent. The person can still join using this email address.',
        variant: 'default',
      })
      resetForm()
      onInvited()
      handleClose(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite to Join Team
          </DialogTitle>
          <DialogDescription>
            Send an invitation to someone who hasn't joined the app yet. They'll receive an email to sign up and join {teamName || 'this team'}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSendInvite}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                placeholder="player@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Name (Optional)</Label>
              <Input
                id="name"
                type="text"
                placeholder="Player Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                If provided, this will be used in the invitation email
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Personal Message (Optional)</Label>
              <Textarea
                id="message"
                placeholder="Add a personal message to the invitation..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                disabled={loading}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Send Invitation
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}



