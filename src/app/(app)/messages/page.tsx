'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { createClient } from '@/lib/supabase/client'
import { Team, Profile } from '@/types/database.types'
import { formatDate, formatTime } from '@/lib/utils'
import { Users, MessageCircle, ChevronRight, Mail, Check, X, ArrowLeft, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'

interface Conversation {
  id: string
  kind: 'team' | 'dm'
  team_id?: string
  dm_user1?: string
  dm_user2?: string
  last_message_at?: string
  last_message_preview?: string
  created_at: string
}

interface TeamConversation extends Conversation {
  team?: Team
  has_unread?: boolean
}

interface DMConversation extends Conversation {
  other_user?: Profile
  has_unread?: boolean
}

interface TeamInvitation {
  id: string
  team_id: string
  inviter_id: string
  invitee_id: string
  invitee_email: string
  status: string
  message: string | null
  created_at: string
  team?: Team
  inviter?: Profile
}

interface EventInvitation {
  id: string
  event_id: string
  inviter_id: string
  invitee_id?: string | null
  invitee_email: string
  invitee_name?: string | null
  status: string
  message?: string | null
  created_at: string
  personal_events?: {
    id: string
    title: string
    activity_type: string
    date: string
    time: string
  }
  inviter?: Profile
}

export default function MessagesPage() {
  const [teamConversations, setTeamConversations] = useState<TeamConversation[]>([])
  const [dmConversations, setDMConversations] = useState<DMConversation[]>([])
  const [invitations, setInvitations] = useState<TeamInvitation[]>([])
  const [eventInvitations, setEventInvitations] = useState<EventInvitation[]>([])
  const [loading, setLoading] = useState(true)
  const [respondingToInvite, setRespondingToInvite] = useState<string | null>(null)
  const [respondingToEventInvite, setRespondingToEventInvite] = useState<string | null>(null)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    loadConversations()
  }, [])

  async function loadConversations() {
    try {
      setLoading(true)
      const supabase = createClient()
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError) {
        console.error('Error getting user:', userError)
        toast({
          title: 'Authentication Error',
          description: 'Unable to verify your session. Please try logging in again.',
          variant: 'destructive',
        })
        setLoading(false)
        return
      }

      if (!user) {
        router.push('/auth/login')
        setLoading(false)
        return
      }

      // Load pending team invitations
      const { data: invites, error: invitesError } = await supabase
        .from('team_invitations')
        .select('*, teams(*), inviter:profiles!team_invitations_inviter_id_fkey(*)')
        .eq('invitee_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (invitesError) {
        console.error('Error loading invitations:', invitesError)
        // Continue with other data even if invitations fail
      }

      if (invites) {
        const invitationsWithData = invites.map(invite => ({
          ...invite,
          team: invite.teams,
          inviter: invite.inviter,
        }))
        setInvitations(invitationsWithData as any)
      }

      // Load pending event invitations
      try {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', user.id)
          .single()
        
        const userEmail = profileData?.email
        
        // Build query conditionally
        let eventInvitesQuery = supabase
          .from('event_invitations')
          .select('*, personal_events(*)')
          .eq('status', 'pending')
        
        // Add invitee conditions - use OR only if we have an email
        if (userEmail) {
          eventInvitesQuery = eventInvitesQuery.or(`invitee_id.eq.${user.id},invitee_email.eq.${userEmail}`)
        } else {
          // If no email, only query by invitee_id
          eventInvitesQuery = eventInvitesQuery.eq('invitee_id', user.id)
        }
        
        const { data: eventInvites, error: eventInvitesError } = await eventInvitesQuery
          .order('created_at', { ascending: false })
        
        if (eventInvitesError) {
          console.error('Error loading event invitations:', {
            message: eventInvitesError.message || 'Unknown error',
            details: eventInvitesError.details || null,
            hint: eventInvitesError.hint || null,
            code: eventInvitesError.code || null,
            error: eventInvitesError,
          })
          setEventInvitations([])
        } else {
          // Load inviter profiles separately if we have invitations
          if (eventInvites && eventInvites.length > 0) {
            const inviterIds = [...new Set(eventInvites.map((inv: any) => inv.inviter_id).filter(Boolean))]
            if (inviterIds.length > 0) {
              const { data: inviters } = await supabase
                .from('profiles')
                .select('id, email, full_name')
                .in('id', inviterIds)
              
              // Map inviters to invitations
              if (inviters) {
                const inviterMap = new Map(inviters.map((inv: any) => [inv.id, inv]))
                eventInvites.forEach((invite: any) => {
                  invite.inviter = inviterMap.get(invite.inviter_id)
                })
              }
            }
          }

          const eventInvitationsWithData = (eventInvites || []).map((invite: any) => ({
            ...invite,
            inviter: invite.inviter,
          }))
          setEventInvitations(eventInvitationsWithData)
        }
      } catch (err: any) {
        console.error('Exception loading event invitations:', err)
        setEventInvitations([])
      }

      // Get teams the user belongs to
      const { data: captainTeams, error: captainError } = await supabase
        .from('teams')
        .select('*')
        .or(`captain_id.eq.${user.id},co_captain_id.eq.${user.id}`)

      if (captainError) {
        console.error('Error loading captain teams:', captainError)
      }

      const { data: memberTeams, error: memberError } = await supabase
        .from('roster_members')
        .select('teams(*)')
        .eq('user_id', user.id)

      if (memberError) {
        console.error('Error loading member teams:', memberError)
      }

      const allTeams = [
        ...(captainTeams || []),
        ...(memberTeams?.map(m => m.teams).filter(Boolean) as Team[] || [])
      ]

      // Remove duplicates
      const uniqueTeams = allTeams.filter((team, index, self) =>
        index === self.findIndex(t => t.id === team.id)
      )

      // Get or create team conversations
      const teamConvs: TeamConversation[] = []
      for (const team of uniqueTeams) {
        try {
          // Check if conversation exists
          const { data: existingConv, error: existingError } = await supabase
            .from('conversations')
            .select('*')
            .eq('kind', 'team')
            .eq('team_id', team.id)
            .maybeSingle()

          if (existingError) {
            console.error(`Error checking conversation for team ${team.id}:`, existingError)
            continue
          }

          let conversation = existingConv

          // Create if doesn't exist
          if (!conversation) {
            const { data: newConv, error: createError } = await supabase
              .from('conversations')
              .insert({
                kind: 'team',
                team_id: team.id,
              })
              .select()
              .single()

            if (createError) {
              console.error(`Error creating conversation for team ${team.id}:`, createError)
              continue
            }

            conversation = newConv
          }

          if (conversation) {
            // Check for unread
            const { data: readStatus } = await supabase
              .from('conversation_reads')
              .select('last_read_at')
              .eq('conversation_id', conversation.id)
              .eq('user_id', user.id)
              .maybeSingle()

            const hasUnread = conversation.last_message_at && (
              !readStatus || 
              new Date(conversation.last_message_at) > new Date(readStatus.last_read_at)
            )

            teamConvs.push({
              ...conversation,
              team,
              has_unread: hasUnread,
            })
          }
        } catch (err) {
          console.error(`Error processing team ${team.id}:`, err)
          // Continue with next team
        }
      }

      setTeamConversations(teamConvs.sort((a, b) => {
        if (!a.last_message_at) return 1
        if (!b.last_message_at) return -1
        return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
      }))

      // Get DM conversations
      const { data: dmConvs, error: dmError } = await supabase
        .from('conversations')
        .select('*')
        .eq('kind', 'dm')
        .or(`dm_user1.eq.${user.id},dm_user2.eq.${user.id}`)
        .order('last_message_at', { ascending: false, nullsFirst: false })

      if (dmError) {
        console.error('Error loading DM conversations:', dmError)
      }

      // Resolve other user profiles
      const dmConvsWithProfiles: DMConversation[] = []
      for (const conv of dmConvs || []) {
        try {
          const otherUserId = conv.dm_user1 === user.id ? conv.dm_user2 : conv.dm_user1

          const { data: otherUser } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', otherUserId)
            .maybeSingle()

          // Check for unread
          const { data: readStatus } = await supabase
            .from('conversation_reads')
            .select('last_read_at')
            .eq('conversation_id', conv.id)
            .eq('user_id', user.id)
            .maybeSingle()

          const hasUnread = conv.last_message_at && (
            !readStatus || 
            new Date(conv.last_message_at) > new Date(readStatus.last_read_at)
          )

          if (otherUser) {
            dmConvsWithProfiles.push({
              ...conv,
              other_user: otherUser,
              has_unread: hasUnread,
            })
          }
        } catch (err) {
          console.error(`Error processing DM conversation ${conv.id}:`, err)
          // Continue with next conversation
        }
      }

      setDMConversations(dmConvsWithProfiles)
    } catch (error) {
      console.error('Error loading conversations:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
        toast({
          title: 'Connection Error',
          description: 'Unable to connect to the server. Please check your internet connection and try again.',
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Error Loading Messages',
          description: errorMessage,
          variant: 'destructive',
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  async function respondToInvitation(invitationId: string, accept: boolean) {
    setRespondingToInvite(invitationId)
    const supabase = createClient()

    const { error } = await supabase
      .from('team_invitations')
      .update({
        status: accept ? 'accepted' : 'declined',
        responded_at: new Date().toISOString(),
      })
      .eq('id', invitationId)

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    } else {
      toast({
        title: accept ? 'Invitation accepted!' : 'Invitation declined',
        description: accept 
          ? 'You have been added to the team roster' 
          : 'The invitation has been declined',
      })
      // Reload to update lists
      loadConversations()
    }

    setRespondingToInvite(null)
  }

  async function respondToEventInvitation(invitationId: string, accept: boolean) {
    setRespondingToEventInvite(invitationId)
    const supabase = createClient()

    const { error } = await supabase
      .from('event_invitations')
      .update({
        status: accept ? 'accepted' : 'declined',
        responded_at: new Date().toISOString(),
      })
      .eq('id', invitationId)

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    } else {
      toast({
        title: accept ? 'Invitation accepted!' : 'Invitation declined',
        description: accept 
          ? 'You have been added to the activity' 
          : 'The invitation has been declined',
      })
      // Reload to update lists
      loadConversations()
    }

    setRespondingToEventInvite(null)
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Messages" />

      <main className="flex-1 p-4 space-y-6">
        {/* Back Button */}
        <div className="flex items-center justify-between mb-2">
          <Button variant="ghost" onClick={() => router.back()} size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>

        {/* Team Invitations */}
        {invitations.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-1">
              Team Invitations
            </h2>
            <div className="space-y-2">
              {invitations.map((invite) => (
                <Card key={invite.id} className="border-primary/50">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="bg-primary/10 rounded-full p-2">
                        <Mail className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{invite.team?.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {invite.team?.league_format}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          Invited by {invite.inviter?.full_name || invite.inviter?.email}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(invite.created_at, 'MMM d')} at {formatTime(invite.created_at)}
                        </p>
                        <div className="flex gap-2 mt-3">
                          <Button
                            size="sm"
                            onClick={() => respondToInvitation(invite.id, true)}
                            disabled={respondingToInvite === invite.id}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => respondToInvitation(invite.id, false)}
                            disabled={respondingToInvite === invite.id}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Decline
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Team Chats */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-1">
            Team Chats
          </h2>
          {teamConversations.length === 0 ? (
            <Card>
              <CardContent className="py-6 text-center">
                <Users className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No team chats yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {teamConversations.map((conv) => (
                <Link key={conv.id} href={`/messages/${conv.id}`}>
                  <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-primary/10 text-primary">
                              <Users className="h-5 w-5" />
                            </AvatarFallback>
                          </Avatar>
                          {conv.has_unread && (
                            <div className="absolute -top-1 -right-1 h-3 w-3 bg-primary rounded-full" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">{conv.team?.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {conv.team?.league_format}
                            </Badge>
                          </div>
                          {conv.last_message_preview && (
                            <p className="text-sm text-muted-foreground truncate">
                              {conv.last_message_preview}
                            </p>
                          )}
                          {conv.last_message_at && (
                            <p className="text-xs text-muted-foreground">
                              {formatDate(conv.last_message_at, 'MMM d')} at {formatTime(conv.last_message_at)}
                            </p>
                          )}
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Direct Messages */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-1">
            Direct Messages
          </h2>
          {dmConversations.length === 0 ? (
            <Card>
              <CardContent className="py-6 text-center">
                <MessageCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No direct messages yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Visit a teammate's profile to start a conversation
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {dmConversations.map((conv) => (
                <Link key={conv.id} href={`/messages/${conv.id}`}>
                  <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-primary/10 text-primary text-sm">
                              {getInitials(conv.other_user?.full_name || conv.other_user?.email || 'U')}
                            </AvatarFallback>
                          </Avatar>
                          {conv.has_unread && (
                            <div className="absolute -top-1 -right-1 h-3 w-3 bg-primary rounded-full" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="font-medium block truncate">
                            {conv.other_user?.full_name || conv.other_user?.email}
                          </span>
                          {conv.last_message_preview && (
                            <p className="text-sm text-muted-foreground truncate">
                              {conv.last_message_preview}
                            </p>
                          )}
                          {conv.last_message_at && (
                            <p className="text-xs text-muted-foreground">
                              {formatDate(conv.last_message_at, 'MMM d')} at {formatTime(conv.last_message_at)}
                            </p>
                          )}
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

