/**
 * System Admin utility functions
 * These functions check if a user has system administrator privileges
 */

import { createClient as createServerClient } from '@/lib/supabase/server'

/**
 * Check if a specific user ID is a system admin (server-side)
 * Use this in API routes and server components
 * @param userId - The user ID to check
 * @returns Promise<boolean>
 */
export async function isSystemAdminById(userId: string): Promise<boolean> {
  const supabase = await createServerClient()
  
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('is_system_admin')
    .eq('id', userId)
    .single()

  if (error || !profile) {
    return false
  }

  return profile.is_system_admin === true
}

/**
 * Check if the current authenticated user is a system admin (server-side)
 * Use this in API routes
 * @returns Promise<boolean>
 */
export async function isCurrentUserSystemAdmin(): Promise<boolean> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return false

  return isSystemAdminById(user.id)
}
