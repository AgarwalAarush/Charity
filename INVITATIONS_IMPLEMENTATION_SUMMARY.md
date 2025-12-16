# Team Invitation System - Implementation Summary

## Overview
The team invitation system has been fully implemented, allowing captains to invite users to join their teams. If a user doesn't exist in the app, the system falls back to adding them as a non-user roster member (existing behavior).

## ✅ Completed Tasks

### 1. Database Changes (`supabase/schema.sql`)
- ✅ Added `team_invitations` table with:
  - Invitation tracking (pending, accepted, declined, expired)
  - Foreign keys to teams, inviter, and invitee
  - Unique constraint for pending invitations
  - Indexes for performance
- ✅ RLS policies for:
  - Captains viewing team invitations
  - Invitees viewing their own invitations
  - Captains creating invitations
  - Invitees responding to invitations
- ✅ Trigger `handle_invitation_acceptance`:
  - Automatically creates roster member when invitation is accepted
  - Links user_id to roster member
  - Sets default role to 'player'

### 2. Add Player Dialog (`src/components/teams/add-player-dialog.tsx`)
- ✅ Email validation to check for existing users
- ✅ Visual indicators:
  - Green badge when user is found (will send invitation)
  - Blue badge when user not found (will add as roster member)
  - Auto-fills name and NTRP rating from user profile
- ✅ Duplicate checks:
  - Prevents inviting users already on roster
  - Prevents duplicate pending invitations
- ✅ Dynamic button text: "Send Invitation" vs "Add Player"

### 3. Messages Tab (`src/app/(app)/messages/page.tsx`)
- ✅ New "Team Invitations" section at the top
- ✅ Shows pending invitations with:
  - Team name and league format
  - Inviter name
  - Timestamp
- ✅ Accept/Decline buttons with:
  - Loading states
  - Success toasts
  - Auto-refresh after response

### 4. Team Dashboard (`src/app/(app)/teams/[id]/page.tsx`)
- ✅ Badge showing pending invitations count (captains only)
- ✅ Displayed in team info section
- ✅ Updates when invitations are sent/responded to

## Database Migration

To apply these changes to your Supabase database:

### Option 1: Apply Full Schema (Recommended for fresh setup)
```bash
cd Charity
# Make sure your Supabase project is set up
supabase db push
```

### Option 2: Apply Invitations Only (If you already have the schema applied)
1. Open your Supabase Dashboard
2. Go to SQL Editor
3. Run the contents of `invitations_migration.sql`

### Option 3: Manual SQL (Copy from schema.sql)
Search for these sections in `supabase/schema.sql`:
- "Team invitations table" (around line 668)
- "RLS POLICIES FOR TEAM INVITATIONS" (around line 428)
- "Team invitation acceptance trigger" (around line 645)

## Type Generation

After applying the database migration, regenerate TypeScript types:

```bash
cd Charity
npm run db:generate
```

**Note**: This requires a local Supabase instance (Docker). If you don't have one running, the types will be generated automatically when you deploy to production or you can manually add the type definitions.

## Features

### For Captains/Co-Captains:
1. **Add Player/Send Invitation**:
   - Enter email address
   - System checks if user exists
   - If user exists: sends invitation
   - If not: adds as non-user roster member
   - Prevents duplicate invitations and roster entries

2. **View Pending Invitations**:
   - See count badge on team dashboard
   - Full list accessible in Messages tab (though they appear to invitees)

### For Invitees:
1. **Receive Invitations**:
   - Invitations appear in Messages tab under "Team Invitations"
   - See team details, inviter, and timestamp

2. **Respond to Invitations**:
   - Accept: Automatically added to team roster with 'player' role
   - Decline: Invitation marked as declined
   - Toast notifications for confirmation

## Edge Cases Handled

1. ✅ User already on roster → Shows error, prevents duplicate
2. ✅ Pending invitation exists → Shows error, prevents duplicate
3. ✅ User declines and captain re-invites → Allowed (unique constraint only on pending status)
4. ✅ Non-user added manually later creates account → No auto-link (would need new invite)
5. ✅ Invitee doesn't exist → Falls back to non-user roster member

## Files Changed

### Database
- `supabase/schema.sql` - Added table, RLS, and trigger
- `invitations_migration.sql` - NEW: Standalone migration file

### Components
- `src/components/teams/add-player-dialog.tsx` - Enhanced with invitation flow

### Pages
- `src/app/(app)/messages/page.tsx` - Added invitations section
- `src/app/(app)/teams/[id]/page.tsx` - Added pending count badge

## Testing Checklist

- [ ] Apply database migration to Supabase
- [ ] Regenerate types (if local Supabase available)
- [ ] Test sending invitation to existing user
- [ ] Test adding non-user as roster member
- [ ] Test accepting invitation
- [ ] Test declining invitation
- [ ] Test duplicate invitation prevention
- [ ] Test pending count badge visibility
- [ ] Verify RLS policies work correctly

## Next Steps

1. **Apply the migration**: Run `invitations_migration.sql` in your Supabase SQL Editor
2. **Regenerate types**: Run `npm run db:generate` (requires local Supabase)
3. **Test the flow**: 
   - Create two user accounts
   - Have one create a team (becomes captain)
   - Invite the other user
   - Accept the invitation
4. **Optional enhancements**:
   - Email notifications when invitation is sent
   - Push notifications for invitations
   - Invitation expiration (auto-expire after X days)
   - Custom invitation messages

## Architecture

```
Captain adds email
       ↓
Check profiles table
       ↓
   User exists?
    ↙     ↘
 YES       NO
  ↓         ↓
Create      Add as
invitation  roster member
  ↓
Invitee sees
in Messages
  ↓
Accept/Decline
  ↓
Trigger creates
roster member
```

