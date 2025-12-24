'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createClient } from '@/lib/supabase/client'
import { Contact } from '@/types/database.types'
import { ContactListItem } from '@/components/contacts/contact-list-item'
import { AddEditContactDialog } from '@/components/contacts/add-edit-contact-dialog'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Plus, Users, Download, Search, X } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRelationship, setFilterRelationship] = useState<string>('all')
  const [filterSource, setFilterSource] = useState<string>('all')
  const [selectedTag, setSelectedTag] = useState<string>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null)
  const [syncing, setSyncing] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    loadContacts()
  }, [])

  async function loadContacts() {
    try {
      setLoading(true)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/auth/login')
        return
      }

      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true })

      if (error) {
        console.error('Error loading contacts:', error)
        toast({
          title: 'Error',
          description: 'Failed to load contacts',
          variant: 'destructive',
        })
      } else {
        setContacts(data || [])
      }
    } catch (error: any) {
      console.error('Error loading contacts:', error)
      toast({
        title: 'Error',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleSyncFromNetwork() {
    try {
      setSyncing(true)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        toast({
          title: 'Error',
          description: 'You must be logged in',
          variant: 'destructive',
        })
        return
      }

      const { data, error } = await supabase.rpc('sync_contacts_from_network', {
        target_user_id: user.id,
      })

      if (error) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        })
      } else {
        const result = data?.[0]
        toast({
          title: 'Sync complete',
          description: `Created: ${result?.created_count || 0}, Updated: ${result?.updated_count || 0}, Skipped: ${result?.skipped_count || 0}`,
        })
        loadContacts()
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to sync contacts',
        variant: 'destructive',
      })
    } finally {
      setSyncing(false)
    }
  }

  async function handleDelete(contact: Contact) {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        toast({
          title: 'Error',
          description: 'You must be logged in',
          variant: 'destructive',
        })
        return
      }

      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', contact.id)
        .eq('user_id', user.id)

      if (error) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Contact deleted',
          description: `${contact.name} has been removed`,
        })
        loadContacts()
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete contact',
        variant: 'destructive',
      })
    } finally {
      setDeleteDialogOpen(false)
      setContactToDelete(null)
    }
  }

  // Get unique tags from all contacts
  const allTags = useMemo(() => {
    const tagSet = new Set<string>()
    contacts.forEach(contact => {
      contact.tags?.forEach(tag => tagSet.add(tag))
    })
    return Array.from(tagSet).sort()
  }, [contacts])

  // Get unique relationship types
  const relationshipTypes = useMemo(() => {
    const types = new Set<string>()
    contacts.forEach(contact => {
      if (contact.relationship_type) {
        types.add(contact.relationship_type)
      }
    })
    return Array.from(types).sort()
  }, [contacts])

  // Filter contacts
  const filteredContacts = useMemo(() => {
    return contacts.filter(contact => {
      // Search filter
      const searchLower = searchTerm.toLowerCase()
      const matchesSearch = !searchTerm ||
        contact.name.toLowerCase().includes(searchLower) ||
        contact.email?.toLowerCase().includes(searchLower) ||
        contact.phone?.toLowerCase().includes(searchLower) ||
        contact.address?.toLowerCase().includes(searchLower) ||
        contact.notes?.toLowerCase().includes(searchLower) ||
        contact.tags?.some(tag => tag.toLowerCase().includes(searchLower))

      // Relationship filter
      const matchesRelationship = filterRelationship === 'all' ||
        contact.relationship_type === filterRelationship ||
        (!contact.relationship_type && filterRelationship === 'none')

      // Source filter
      const matchesSource = filterSource === 'all' ||
        contact.source === filterSource

      // Tag filter
      const matchesTag = selectedTag === 'all' ||
        contact.tags?.includes(selectedTag)

      return matchesSearch && matchesRelationship && matchesSource && matchesTag
    })
  }, [contacts, searchTerm, filterRelationship, filterSource, selectedTag])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Contacts" />
      
      <main className="flex-1 p-4 space-y-4">
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search contacts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>
          <Button
            variant="outline"
            onClick={handleSyncFromNetwork}
            disabled={syncing}
          >
            {syncing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Sync from Network
          </Button>
          <Button onClick={() => {
            setEditingContact(null)
            setDialogOpen(true)
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Contact
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <Select value={filterRelationship} onValueChange={setFilterRelationship}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Relationship" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Relationships</SelectItem>
              <SelectItem value="none">No Relationship</SelectItem>
              {relationshipTypes.map(type => (
                <SelectItem key={type} value={type}>
                  {type.replace('_', ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterSource} onValueChange={setFilterSource}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
              <SelectItem value="auto">Auto</SelectItem>
              <SelectItem value="merged">Merged</SelectItem>
            </SelectContent>
          </Select>

          {allTags.length > 0 && (
            <Select value={selectedTag} onValueChange={setSelectedTag}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Tag" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tags</SelectItem>
                {allTags.map(tag => (
                  <SelectItem key={tag} value={tag}>
                    {tag}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {(filterRelationship !== 'all' || filterSource !== 'all' || selectedTag !== 'all' || searchTerm) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFilterRelationship('all')
                setFilterSource('all')
                setSelectedTag('all')
                setSearchTerm('')
              }}
            >
              <X className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
          )}
        </div>

        {/* Contacts List */}
        {filteredContacts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">
                {contacts.length === 0 ? 'No contacts yet' : 'No contacts match your filters'}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {contacts.length === 0
                  ? 'Start building your tennis network by adding contacts or syncing from your teams'
                  : 'Try adjusting your search or filters'}
              </p>
              {contacts.length === 0 && (
                <Button onClick={() => {
                  setEditingContact(null)
                  setDialogOpen(true)
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Contact
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-1">
            {filteredContacts.map(contact => (
              <ContactListItem
                key={contact.id}
                contact={contact}
                onDelete={(id) => {
                  const contactToDelete = contacts.find(c => c.id === id)
                  if (contactToDelete) {
                    setContactToDelete(contactToDelete)
                    setDeleteDialogOpen(true)
                  }
                }}
              />
            ))}
          </div>
        )}

        {/* Stats */}
        {contacts.length > 0 && (
          <div className="text-center text-sm text-muted-foreground pt-4">
            Showing {filteredContacts.length} of {contacts.length} contacts
          </div>
        )}
      </main>

      {/* Add/Edit Dialog */}
      <AddEditContactDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        contact={editingContact}
        onSaved={() => {
          loadContacts()
          setEditingContact(null)
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contact</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {contactToDelete?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => contactToDelete && handleDelete(contactToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}