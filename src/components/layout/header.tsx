'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { createClient } from '@/lib/supabase/client'
import { formatDistanceToNow } from 'date-fns'

interface HeaderProps {
  title: string
  showNotifications?: boolean
}

interface RecentMessage {
  id: string
  conversation_id: string
  body: string
  created_at: string
  sender_name: string
  conversation_kind: 'team' | 'dm'
  team_name?: string
  sender_initials: string
}

export function Header({ title, showNotifications = true }: HeaderProps) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<RecentMessage[]>([])
  const [hasUnread, setHasUnread] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (open && messages.length === 0) {
      loadRecentMessages()
    }
  }, [open])

  useEffect(() => {
    // Check for unread messages periodically
    checkUnreadMessages()
    const interval = setInterval(checkUnreadMessages, 30000) // Check every 30s
    return () => clearInterval(interval)
  }, [])

  async function checkUnreadMessages() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Get user's conversations
    const { data: conversations } = await supabase
      .from('conversations')
      .select('id, last_message_at')
      .or(`team_id.in.(select team_id from roster_members where user_id='${user.id}'),dm_user1.eq.${user.id},dm_user2.eq.${user.id}`)
      .not('last_message_at', 'is', null)

    if (!conversations || conversations.length === 0) {
      setHasUnread(false)
      return
    }

    // Get read status
    const { data: reads } = await supabase
      .from('conversation_reads')
      .select('conversation_id, last_read_at')
      .eq('user_id', user.id)

    const readMap = new Map(reads?.map(r => [r.conversation_id, r.last_read_at]) || [])
    
    // Check if any conversation has messages newer than last read
    const unread = conversations.some(conv => {
      const lastRead = readMap.get(conv.id) || '1970-01-01'
      return conv.last_message_at && conv.last_message_at > lastRead
    })

    setHasUnread(unread)
  }

  async function loadRecentMessages() {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      setLoading(false)
      return
    }

    // Get user's teams
    const { data: teams } = await supabase
      .from('roster_members')
      .select('team_id')
      .eq('user_id', user.id)

    const teamIds = teams?.map(t => t.team_id) || []

    // Get recent messages from team conversations and DMs
    const { data: recentMessages } = await supabase
      .from('messages')
      .select(`
        id,
        conversation_id,
        body,
        created_at,
        sender_id,
        sender:profiles!messages_sender_id_fkey(full_name, email),
        conversation:conversations(
          id,
          kind,
          team_id,
          dm_user1,
          dm_user2,
          teams(name)
        )
      `)
      .order('created_at', { ascending: false })
      .limit(10)

    if (!recentMessages) {
      setLoading(false)
      return
    }

    // Filter to only show messages from accessible conversations
    const processedMessages: RecentMessage[] = []
    
    for (const msg of recentMessages) {
      const conv = msg.conversation as any
      if (!conv) continue

      // Check if user has access to this conversation
      if (conv.kind === 'team' && !teamIds.includes(conv.team_id)) continue
      if (conv.kind === 'dm' && conv.dm_user1 !== user.id && conv.dm_user2 !== user.id) continue

      const sender = msg.sender as any
      const senderName = sender?.full_name || sender?.email || 'Unknown'
      const initials = senderName
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)

      processedMessages.push({
        id: msg.id,
        conversation_id: msg.conversation_id,
        body: msg.body,
        created_at: msg.created_at,
        sender_name: senderName,
        conversation_kind: conv.kind,
        team_name: conv.kind === 'team' ? conv.teams?.name : undefined,
        sender_initials: initials
      })
    }

    setMessages(processedMessages)
    setLoading(false)
  }

  function handleMessageClick(conversationId: string) {
    setOpen(false)
    router.push(`/messages/${conversationId}`)
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 safe-area-inset-top">
      <div className="flex h-14 items-center justify-between px-4">
        <h1 className="text-lg font-semibold">{title}</h1>
        {showNotifications && (
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {hasUnread && (
                  <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
              <div className="flex items-center justify-between border-b p-3">
                <h3 className="font-semibold text-sm">Recent Messages</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-1 text-xs"
                  onClick={() => {
                    setOpen(false)
                    router.push('/messages')
                  }}
                >
                  View All
                </Button>
              </div>
              <ScrollArea className="h-[400px]">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                    <MessageCircle className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">No recent messages</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className="p-3 hover:bg-accent cursor-pointer transition-colors"
                        onClick={() => handleMessageClick(message.conversation_id)}
                      >
                        <div className="flex gap-3">
                          <Avatar className="h-8 w-8 shrink-0">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                              {message.sender_initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline justify-between gap-2 mb-1">
                              <p className="text-sm font-medium truncate">
                                {message.sender_name}
                              </p>
                              <span className="text-xs text-muted-foreground shrink-0">
                                {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                              </span>
                            </div>
                            {message.team_name && (
                              <p className="text-xs text-muted-foreground mb-1">
                                {message.team_name}
                              </p>
                            )}
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {message.body}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </header>
  )
}
