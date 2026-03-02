import { useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useReservationsRealtime(onChange) {
  useEffect(() => {
    if (!onChange) return

    const channel = supabase
      .channel('reservations-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reservations' },
        (payload) => {
          onChange(payload)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [onChange])
}

