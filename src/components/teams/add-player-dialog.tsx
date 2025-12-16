'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Loader2, UserCheck, UserX } from 'lucide-react'

interface FoundUser {
  id: string
  email: string
  full_name: string | null
  ntrp_rating: number | null
}

interface AddPlayerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  teamId: string
  onAdded: () => void
}

export function AddPlayerDialog({ open, onOpenChange, teamId, onAdded }: AddPlayerDialogProps) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [ntrpRating, setNtrpRating] = useState('')
  const [role, setRole] = useState<'captain' | 'co-captain' | 'player'>('player')
  const [loading, setLoading] = useState(false)
  const [checkingEmail, setCheckingEmail] = useState(false)
  const [foundUser, setFoundUser] = useState<FoundUser | null>(null)
  const [emailChecked, setEmailChecked] = useState(false)
  const { toast } = useToast()

  // Check for existing user when email changes
  useEffect(() => {
    if (email && email.includes('@')) {
      checkForExistingUser(email)
    } else {
      setFoundUser(null)
      setEmailChecked(false)
    }
  }, [email])

  async function checkForExistingUser(emailToCheck: string) {
    setCheckingEmail(true)
    const supabase = createClient()

    // Check if user exists with this email
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, email, full_name, ntrp_rating')
      .eq('email', emailToCheck)
      .maybeSingle()

    if (profile) {
      setFoundUser(profile)
      // Pre-fill fields with user data
      if (profile.full_name && !fullName) {
        setFullName(profile.full_name)
      }
      if (profile.ntrp_rating && !ntrpRating) {
        setNtrpRating(profile.ntrp_rating.toString())
      }
    } else {
      setFoundUser(null)
    }

    setEmailChecked(true)
    setCheckingEmail(false)
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
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

    // If user exists in app, send invitation
    if (foundUser) {
      // Check if user is already on roster
      const { data: existingMember } = await supabase
        .from('roster_members')
        .select('id')
        .eq('team_id', teamId)
        .eq('user_id', foundUser.id)
        .maybeSingle()

      if (existingMember) {
        toast({
          title: 'Already on roster',
          description: `${foundUser.full_name || foundUser.email} is already on this team`,
          variant: 'destructive',
        })
        setLoading(false)
        return
      }

      // Check for pending invitation
      const { data: existingInvite } = await supabase
        .from('team_invitations')
        .select('id')
        .eq('team_id', teamId)
        .eq('invitee_id', foundUser.id)
        .eq('status', 'pending')
        .maybeSingle()

      if (existingInvite) {
        toast({
          title: 'Already invited',
          description: `${foundUser.full_name || foundUser.email} has a pending invitation`,
          variant: 'destructive',
        })
        setLoading(false)
        return
      }

      // Create invitation
      const { error: inviteError } = await supabase
        .from('team_invitations')
        .insert({
          team_id: teamId,
          inviter_id: user.id,
          invitee_id: foundUser.id,
          invitee_email: foundUser.email,
          status: 'pending',
        })

      if (inviteError) {
        toast({
          title: 'Error sending invitation',
          description: inviteError.message,
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Invitation sent!',
          description: `${foundUser.full_name || foundUser.email} will see the invitation in their Messages tab`,
        })
        setFullName('')
        setEmail('')
        setPhone('')
        setNtrpRating('')
        setRole('player')
        setFoundUser(null)
        setEmailChecked(false)
        onAdded()
      }
    } else {
      // Fall back to adding as non-user roster member
      const { error } = await supabase.from('roster_members').insert({
        team_id: teamId,
        full_name: fullName,
        email: email || null,
        phone: phone || null,
        ntrp_rating: ntrpRating ? parseFloat(ntrpRating) : null,
        role,
      })

      if (error) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Player added',
          description: `${fullName} has been added to the roster`,
        })
        setFullName('')
        setEmail('')
        setPhone('')
        setNtrpRating('')
        setRole('player')
        setFoundUser(null)
        setEmailChecked(false)
        onAdded()
      }
    }

    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{foundUser ? 'Send Invitation' : 'Add Player'}</DialogTitle>
          <DialogDescription>
            {foundUser 
              ? 'Send a team invitation to this user'
              : 'Add a new player to your team roster'
            }
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleAdd}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              {checkingEmail && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Checking for user...
                </p>
              )}
              {emailChecked && foundUser && (
                <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-950 rounded-md">
                  <UserCheck className="h-4 w-4 text-green-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-900 dark:text-green-100">
                      User found: {foundUser.full_name || foundUser.email}
                    </p>
                    <p className="text-xs text-green-700 dark:text-green-300">
                      Will send invitation instead of adding directly
                    </p>
                  </div>
                </div>
              )}
              {emailChecked && !foundUser && email && (
                <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-950 rounded-md">
                  <UserX className="h-4 w-4 text-blue-600" />
                  <p className="text-xs text-blue-900 dark:text-blue-100">
                    No user found - will add as roster member
                  </p>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                disabled={foundUser !== null}
              />
              {foundUser && (
                <p className="text-xs text-muted-foreground">
                  Auto-filled from user profile
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="(555) 123-4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rating">NTRP Rating</Label>
                <Input
                  id="rating"
                  type="number"
                  step="0.5"
                  min="2.0"
                  max="7.0"
                  placeholder="4.0"
                  value={ntrpRating}
                  onChange={(e) => setNtrpRating(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={role} onValueChange={(v) => setRole(v as 'captain' | 'co-captain' | 'player')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="player">Player</SelectItem>
                    <SelectItem value="co-captain">Co-Captain</SelectItem>
                    <SelectItem value="captain">Captain</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !fullName || !email}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {foundUser ? 'Send Invitation' : 'Add Player'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
