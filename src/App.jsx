import { useEffect, useMemo, useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { Topbar } from './components/Topbar'
import { RoomGrid } from './components/RoomGrid'
import { AuthScreen } from './components/AuthScreen'
import { ReserveRoomForm } from './components/ReserveRoomForm'
import { ReservationsTable } from './components/ReservationsTable'
import { MyReservations } from './components/MyReservations'
import { useAuth } from './contexts/AuthContext.jsx'
import { supabase } from './lib/supabaseClient'
import { useReservationsRealtime } from './hooks/useReservationsRealtime'

function App() {
  const { user, loading: authLoading } = useAuth()
  const [rooms, setRooms] = useState([])
  const [reservations, setReservations] = useState([])
  const [activeView, setActiveView] = useState('reserve') // 'reserve' | 'my-reservations' | 'reservations'

  // initial load (after auth known)
  useEffect(() => {
    if (authLoading || !user) return

    async function loadInitial() {
      const [roomsRes, reservationsRes] = await Promise.all([
        supabase.from('rooms').select('*').order('name', { ascending: true }),
        supabase.from('reservations').select('*'),
      ])

      if (!roomsRes.error && roomsRes.data) {
        setRooms(roomsRes.data)
      } else {
        console.error('Error loading rooms', roomsRes.error)
      }

      if (!reservationsRes.error && reservationsRes.data) {
        setReservations(reservationsRes.data)
      } else {
        console.error('Error loading reservations', reservationsRes.error)
      }
    }

    loadInitial()
  }, [authLoading, user])

  // realtime updates
  useReservationsRealtime((payload) => {
    setReservations((prev) => {
      if (payload.eventType === 'DELETE') {
        return prev.filter((r) => r.id !== payload.old.id)
      }

      if (payload.eventType === 'INSERT') {
        return [...prev, payload.new]
      }

      if (payload.eventType === 'UPDATE') {
        return prev.map((r) => (r.id === payload.new.id ? payload.new : r))
      }

      return prev
    })
  })

  const handleBookNow = async (room) => {
    if (!user) return

    const now = new Date()
    const end = new Date(now.getTime() + 30 * 60 * 1000) // 30 minutes
    const startIso = now.toISOString()
    const endIso = end.toISOString()

    const { data, error } = await supabase
      .from('reservations')
      .insert([
        {
          room_id: room.id,
          user_id: user.id,
          start_time: startIso,
          end_time: endIso,
          status: 'active',
          is_checked_in: true,
        },
      ])
      .select()
      .single()

    if (error || !data) {
      let msg = 'Could not create reservation'
      if (
        error?.code === '42501' ||
        (error?.message &&
          error.message.toLowerCase().includes('row-level security'))
      ) {
        msg = 'This time slot is already taken. Please choose another time.'
      }
      // eslint-disable-next-line no-alert
      alert(msg)
      return
    }

    setReservations((prev) => [...prev, data])
  }

  const handleCheckIn = async (reservation) => {
    if (!user) return
    const previous = reservations

    setReservations((prev) =>
      prev.map((r) =>
        r.id === reservation.id
          ? { ...r, status: 'active', is_checked_in: true }
          : r,
      ),
    )

    const { error } = await supabase
      .from('reservations')
      .update({ status: 'active', is_checked_in: true })
      .eq('id', reservation.id)
      .eq('user_id', user.id)

    if (error) {
      setReservations(previous)
      // eslint-disable-next-line no-alert
      alert(error.message || 'Could not check in')
    }
  }

  const handleEndEarly = async (reservation) => {
    if (!user) return
    const previous = reservations
    const now = new Date().toISOString()

    setReservations((prev) =>
      prev.map((r) =>
        r.id === reservation.id
          ? { ...r, status: 'completed', end_time: now }
          : r,
      ),
    )

    const { error } = await supabase
      .from('reservations')
      .update({ status: 'completed', end_time: now })
      .eq('id', reservation.id)
      .eq('user_id', user.id)

    if (error) {
      setReservations(previous)
      // eslint-disable-next-line no-alert
      alert(error.message || 'Could not end reservation early')
    }
  }

  const handleExtend = async (reservation, minutes = 15) => {
    if (!user) return
    // Allow any positive number of minutes (including 5)
    if (minutes <= 0) {
      // eslint-disable-next-line no-alert
      alert('Extension time must be positive.')
      return
    }

    // Optional: if you still want to enforce 5‑minute increments, uncomment the next block
    // if (minutes % 5 !== 0) {
    //   alert('Extensions must be in 5‑minute increments.')
    //   return
    // }

    const previous = reservations
    const currentEnd = new Date(reservation.end_time)
    const newEnd = new Date(currentEnd.getTime() + minutes * 60 * 1000)

    // Check against next reservation in same room (5-minute buffer)
    const bufferMs = 5 * 60 * 1000
    const sameRoom = reservations.filter(
      (r) =>
        r.room_id === reservation.room_id &&
        r.id !== reservation.id &&
        ['pending', 'active'].includes(r.status),
    )

    const next = sameRoom
      .filter(
        (r) => new Date(r.start_time).getTime() >= currentEnd.getTime(),
      )
      .sort(
        (a, b) =>
          new Date(a.start_time).getTime() -
          new Date(b.start_time).getTime(),
      )[0]

    if (next) {
      const newEndWithBuffer =
        newEnd.getTime() + bufferMs
      const nextStart = new Date(next.start_time).getTime()
      if (newEndWithBuffer > nextStart) {
        // eslint-disable-next-line no-alert
        alert(
          'Cannot extend: this would overlap with the next reservation.',
        )
        return
      }
    }

    const newEndIso = newEnd.toISOString()

    setReservations((prev) =>
      prev.map((r) =>
        r.id === reservation.id ? { ...r, end_time: newEndIso } : r,
      ),
    )

    const { error } = await supabase
      .from('reservations')
      .update({ end_time: newEndIso })
      .eq('id', reservation.id)
      .eq('user_id', user.id)

    if (error) {
      setReservations(previous)
      // eslint-disable-next-line no-alert
      alert(error.message || 'Could not extend reservation')
    }
  }

  const handleCancel = async (reservation) => {
    if (!user) return
    const previous = reservations

    setReservations((prev) =>
      prev.map((r) =>
        r.id === reservation.id ? { ...r, status: 'cancelled' } : r,
      ),
    )

    const { error } = await supabase
      .from('reservations')
      .update({ status: 'cancelled' })
      .eq('id', reservation.id)
      .eq('user_id', user.id)

    if (error) {
      setReservations(previous)
      // eslint-disable-next-line no-alert
      alert(error.message || 'Could not cancel reservation')
    }
  }

  const roomsWithCurrentReservation = useMemo(() => {
    const now = new Date()
    return rooms.map((room) => {
      const roomReservations = reservations.filter((r) => r.room_id === room.id)

      const current = roomReservations.find((r) => {
        const start = new Date(r.start_time)
        const end = new Date(r.end_time)
        return (
          ['pending', 'active'].includes(r.status) &&
          now >= start &&
          now <= end
        )
      })

      return { ...room, currentReservation: current ?? null }
    })
  }, [rooms, reservations])

  if (authLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50 text-slate-900">
        <span className="text-sm text-slate-500">Loading session…</span>
      </div>
    )
  }

  if (!user) {
    return <AuthScreen />
  }

  return (
    <div className="h-screen w-screen flex bg-slate-50 text-slate-900">
      <Sidebar
        activeView={activeView}
        onChangeView={setActiveView}
      />
      <div className="flex-1 flex flex-col">
        <Topbar />
        <main className="flex-1 overflow-auto px-6 py-4">
          {activeView === 'reserve' && (
            <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
              <div className="w-full max-w-xl">
                <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
                  <h1 className="text-lg font-semibold text-slate-900 mb-4">
                    Reserve room
                  </h1>
                  <ReserveRoomForm
                    rooms={rooms}
                    onReservationCreated={(created) => {
                      setReservations((prev) => {
                        if (prev.some((r) => r.id === created.id)) return prev
                        return [...prev, created]
                      })
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {activeView === 'my-reservations' && (
            <MyReservations
              reservations={reservations}
              rooms={rooms}
              user={user}
              onCancel={handleCancel}
              onEndEarly={handleEndEarly}
              onExtend={handleExtend}
            />
          )}

          {activeView === 'reservations' && (
            <ReservationsTable
              reservations={reservations}
              rooms={rooms}
            />
          )}
        </main>
      </div>
    </div>
  )
}

export default App