'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

/**
 * React hook to check if the current user is a system admin
 * @returns { isAdmin: boolean, loading: boolean }
 */
export function useIsSystemAdmin() {
  const [isAdmin, setIsAdmin] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    async function checkAdmin() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setIsAdmin(false)
        setLoading(false)
        return
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('is_system_admin')
        .eq('id', user.id)
        .single()

      if (error) {
        console.error('Error checking system admin status:', error)
        setIsAdmin(false)
      } else {
        setIsAdmin(profile?.is_system_admin === true)
      }
      
      setLoading(false)
    }

    checkAdmin()
  }, [])

  return { isAdmin, loading }
}

