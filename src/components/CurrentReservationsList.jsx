import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

function formatTimeRange(startIso, endIso) {
  const start = new Date(startIso)
  const end = new Date(endIso)
  const dateStr = start.toLocaleDateString()
  const startStr = start.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
  const endStr = end.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
  return { dateStr, rangeStr: `${startStr} – ${endStr}` }
}

export function CurrentReservationsList() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data, error } = await supabase
        .from('reservations')
        .select('id, start_time, end_time, purpose, reserved_by, status')
        .in('status', ['pending', 'active'])
        .order('start_time', { ascending: true })

      if (!error && data) {
        setItems(data)
      } else {
        console.error('Error loading reservations', error)
      }
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return <p className="text-xs text-slate-500">Loading reservations…</p>
  }

  if (items.length === 0) {
    return <p className="text-xs text-slate-500">No current reservations.</p>
  }

  return (
    <ul className="space-y-2 text-xs">
      {items.map((r) => {
        const { dateStr, rangeStr } = formatTimeRange(
          r.start_time,
          r.end_time,
        )
        return (
          <li
            key={r.id}
            className="border border-slate-200 rounded-md px-2 py-1.5 bg-slate-50"
          >
            <div className="font-medium text-slate-800">{dateStr}</div>
            <div className="text-slate-600">{rangeStr}</div>
            {r.purpose && (
              <div className="mt-1 text-[11px] text-slate-700">
                Purpose: {r.purpose}
              </div>
            )}
            {r.reserved_by && (
              <div className="mt-0.5 text-[11px] text-slate-700">
                Reserved by: {r.reserved_by}
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

