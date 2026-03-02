import { useEffect, useState } from 'react'

export function ReservationCountdown({ reservation }) {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const start = new Date(reservation.start_time)
  const end = new Date(reservation.end_time)
  const target = reservation.status === 'pending' ? start : end
  const diffMs = target.getTime() - now.getTime()
  const isPast = diffMs < 0
  const abs = Math.abs(diffMs) / 1000
  const mins = Math.floor(abs / 60)
  const secs = Math.floor(abs % 60)

  const label =
    reservation.status === 'pending'
      ? isPast
        ? 'Started'
        : 'Starts in'
      : isPast
      ? 'Over time'
      : 'Ends in'

  return (
    <div className="text-xs text-slate-600">
      <span className="font-medium">{label}:</span>{' '}
      <span>
        {mins.toString().padStart(2, '0')}:
        {secs.toString().padStart(2, '0')}
      </span>
    </div>
  )
}

