'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useIsSystemAdmin } from '@/hooks/use-is-system-admin'
import { Loader2, Monitor, ChevronRight } from 'lucide-react'

interface ScreenGroup {
  title: string
  screens: Array<{
    name: string
    path: string
    description?: string
  }>
}

const screenGroups: ScreenGroup[] = [
  {
    title: 'Home & Dashboard',
    screens: [
      { name: 'Home', path: '/home', description: 'Main dashboard with upcoming matches and events' },
    ],
  },
  {
    title: 'Teams',
    screens: [
      { name: 'All Teams', path: '/teams', description: 'View all teams' },
      { name: 'Team Detail', path: '/teams/[id]', description: 'Team overview, matches, events, roster' },
      { name: 'Team Settings', path: '/teams/[id]/settings', description: 'Team configuration and settings' },
      { name: 'Team Roster', path: '/teams/[id]/roster', description: 'Manage team roster members' },
      { name: 'Team Availability', path: '/teams/[id]/availability', description: 'Team availability grid' },
    ],
  },
  {
    title: 'Matches',
    screens: [
      { name: 'All Matches', path: '/teams/[id]/matches', description: 'List of all matches for a team' },
      { name: 'Match Detail', path: '/teams/[id]/matches/[matchId]', description: 'Match details, lineup, scores' },
      { name: 'Lineup Builder', path: '/teams/[id]/matches/[matchId]/lineup', description: 'Build and publish lineups' },
      { name: 'Enter Scores', path: '/teams/[id]/matches/[matchId]/enter-scores', description: 'Enter match scores' },
    ],
  },
  {
    title: 'Events',
    screens: [
      { name: 'All Events', path: '/teams/[id]/events', description: 'List of all events for a team' },
      { name: 'Event Detail', path: '/teams/[id]/events/[eventId]', description: 'Event details and attendees' },
    ],
  },
  {
    title: 'Calendar',
    screens: [
      { name: 'Calendar View', path: '/calendar', description: 'Unified calendar view' },
      { name: 'Team Availability', path: '/calendar/team-availability', description: 'Team availability calendar' },
    ],
  },
  {
    title: 'Availability',
    screens: [
      { name: 'Bulk Availability', path: '/availability', description: 'Set availability for multiple events' },
      { name: 'Team Grid', path: '/teams/[id]/availability', description: 'Team availability grid view' },
    ],
  },
  {
    title: 'Activities',
    screens: [
      { name: 'Activity Detail', path: '/activities/[eventId]', description: 'Personal activity details' },
    ],
  },
  {
    title: 'Match History',
    screens: [
      { name: 'Match History', path: '/match-history', description: 'View past match results' },
    ],
  },
  {
    title: 'Rules',
    screens: [
      { name: 'Rules Guru', path: '/rules', description: 'AI-powered tennis rules assistant' },
    ],
  },
  {
    title: 'Admin',
    screens: [
      { name: 'Admin Dashboard', path: '/admin', description: 'System administration dashboard' },
      { name: 'Manage Venues', path: '/admin/venues', description: 'Manage tennis court locations' },
      { name: 'Manage Users', path: '/admin/users', description: 'View and manage users' },
      { name: 'All Screens', path: '/admin/screens', description: 'View all application screens' },
    ],
  },
  {
    title: 'Authentication',
    screens: [
      { name: 'Login', path: '/auth/login', description: 'User login page' },
      { name: 'Sign Up', path: '/auth/signup', description: 'User registration page' },
    ],
  },
  {
    title: 'Landing',
    screens: [
      { name: 'Landing Page', path: '/landing', description: 'Marketing landing page' },
      { name: 'Root Page', path: '/', description: 'Root page (redirects based on auth)' },
    ],
  },
]

export default function AllScreensPage() {
  const router = useRouter()
  const { isAdmin, loading } = useIsSystemAdmin()

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.push('/home')
    }
  }, [isAdmin, loading, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="All Screens" />

      <main className="flex-1 p-4 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              Application Screens
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-6">
              Browse all screens in the application, organized by main sections. Click on any screen to navigate to it.
            </p>

            <div className="space-y-6">
              {screenGroups.map((group) => (
                <div key={group.title} className="space-y-3">
                  <h2 className="text-lg font-semibold text-foreground border-b pb-2">
                    {group.title}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {group.screens.map((screen) => {
                      // Handle dynamic routes - replace [id] and [matchId] with example values
                      let displayPath = screen.path
                      let actualPath = screen.path
                      
                      if (screen.path.includes('[id]')) {
                        displayPath = screen.path.replace('[id]', 'team-id')
                        actualPath = screen.path.replace('[id]', '') // Will need team selection
                      }
                      if (screen.path.includes('[matchId]')) {
                        displayPath = displayPath.replace('[matchId]', 'match-id')
                        actualPath = actualPath.replace('[matchId]', '') // Will need match selection
                      }
                      if (screen.path.includes('[eventId]')) {
                        displayPath = displayPath.replace('[eventId]', 'event-id')
                        actualPath = actualPath.replace('[eventId]', '') // Will need event selection
                      }

                      const isDynamicRoute = screen.path.includes('[')
                      
                      return (
                        <Card
                          key={screen.path}
                          className={`hover:bg-accent transition-colors ${isDynamicRoute ? 'opacity-75' : ''}`}
                        >
                          <CardContent className="p-4">
                            {isDynamicRoute ? (
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <h3 className="font-medium text-sm">{screen.name}</h3>
                                  <span className="text-xs text-muted-foreground">Dynamic</span>
                                </div>
                                <p className="text-xs text-muted-foreground mb-2">
                                  {displayPath}
                                </p>
                                {screen.description && (
                                  <p className="text-xs text-muted-foreground">
                                    {screen.description}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <Link href={actualPath} className="block">
                                <div className="flex items-center justify-between mb-1">
                                  <h3 className="font-medium text-sm hover:text-primary">
                                    {screen.name}
                                  </h3>
                                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <p className="text-xs text-muted-foreground mb-2">
                                  {displayPath}
                                </p>
                                {screen.description && (
                                  <p className="text-xs text-muted-foreground">
                                    {screen.description}
                                  </p>
                                )}
                              </Link>
                            )}
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

