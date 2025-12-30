import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/auth/link-roster-members
 * Links roster members to a user account when they sign up
 * This is called after user signup to automatically link them to teams
 * where their email was already added to the roster
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's email from their profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .single()

    if (!profile || !profile.email) {
      return NextResponse.json(
        { error: 'User email not found' },
        { status: 400 }
      )
    }

    // Use database function to link roster members
    // This function uses SECURITY DEFINER to bypass RLS and allow linking
    const { data: linkedCount, error: functionError } = await supabase
      .rpc('link_roster_members_to_user', { target_user_id: user.id })

    if (functionError) {
      console.error('Error linking roster members:', functionError)
      return NextResponse.json(
        { error: 'Failed to link roster members' },
        { status: 500 }
      )
    }

    const count = linkedCount || 0

    // Also link event invitations that were sent to this user's email
    let linkedInvitations = 0
    try {
      const { data: invitationCount, error: invitationError } = await supabase
        .rpc('link_event_invitations_to_user', { target_user_id: user.id })
      
      if (!invitationError && invitationCount) {
        linkedInvitations = invitationCount
        if (linkedInvitations > 0) {
          console.log(`Linked ${linkedInvitations} event invitation(s) to user ${user.id}`)
        }
      }
    } catch (invitationLinkError) {
      // Don't fail if invitation linking fails - user can still use the app
      console.error('Error linking event invitations:', invitationLinkError)
    }

    if (count === 0 && linkedInvitations === 0) {
      // No roster members or invitations to link - this is fine
      return NextResponse.json({
        success: true,
        linked: 0,
        linkedInvitations: 0,
        message: 'No teams or invitations found to link',
      })
    }

    // Get the linked roster members to return team info
    const { data: linkedRosters } = await supabase
      .from('roster_members')
      .select('id, team_id, full_name, teams(name)')
      .eq('user_id', user.id)
      .eq('is_active', true)

    // Check if user should be assigned as captain for any teams
    // This handles the case where a captain was intended but couldn't be set because they weren't a user yet
    let captainAssignments = 0
    if (linkedRosters && linkedRosters.length > 0) {
      const teamIds = linkedRosters.map(rm => rm.team_id)
      
      // Find teams where this user is on the roster but captain_id is null
      const { data: teamsWithoutCaptain } = await supabase
        .from('teams')
        .select('id, name, captain_id, co_captain_id')
        .in('id', teamIds)
        .is('captain_id', null)
      
      // Assign user as captain for teams with no captain
      if (teamsWithoutCaptain && teamsWithoutCaptain.length > 0) {
        const teamsToUpdate = teamsWithoutCaptain.map(t => t.id)
        const { error: updateError } = await supabase
          .from('teams')
          .update({ captain_id: user.id })
          .in('id', teamsToUpdate)
        
        if (!updateError) {
          captainAssignments = teamsToUpdate.length
          console.log(`Assigned user ${user.id} as captain for ${captainAssignments} team(s)`)
        } else {
          console.error('Error assigning captain:', updateError)
        }
      }
    }

    const messages = []
    if (count > 0) {
      messages.push(`Successfully linked to ${count} team(s)`)
    }
    if (captainAssignments > 0) {
      messages.push(`assigned as captain for ${captainAssignments} team(s)`)
    }
    if (linkedInvitations > 0) {
      messages.push(`${linkedInvitations} event invitation(s)`)
    }

    return NextResponse.json({
      success: true,
      linked: count,
      linkedInvitations: linkedInvitations,
      captainAssignments: captainAssignments,
      teams: linkedRosters?.map(rm => ({
        roster_member_id: rm.id,
        team_id: rm.team_id,
        team_name: (rm.teams as any)?.name || 'Unknown Team',
        name: rm.full_name,
      })) || [],
      message: messages.length > 0 ? messages.join(' and ') : 'No items to link',
    })
  } catch (error: any) {
    console.error('Error in link-roster-members:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

