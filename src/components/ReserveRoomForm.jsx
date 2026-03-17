import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext.jsx'

function combineDateAndTime(dateStr, timeStr) {
  const [year, month, day] = dateStr.split('-').map(Number)
  const [hour, minute] = timeStr.split(':').map(Number)
  const d = new Date()
  d.setFullYear(year, month - 1, day)
  d.setHours(hour, minute, 0, 0)
  return d.toISOString()
}

function formatTime12h(timeStr) {
  const [hourStr, minuteStr] = timeStr.split(':')
  const hour = parseInt(hourStr, 10)
  const minute = minuteStr
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const h12 = hour % 12 || 12
  return `${h12}:${minute} ${ampm}`
}

function getTodayString() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Returns "HH:MM" of current time + a small buffer (5 min) to avoid razor-thin windows
function getMinTimeString() {
  const now = new Date()
  now.setMinutes(now.getMinutes() + 5)
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

export function ReserveRoomForm({ rooms, onReservationCreated }) {
  const { user } = useAuth()
  const [roomId, setRoomId] = useState('')
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [purpose, setPurpose] = useState('')
  const [reservedBy, setReservedBy] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [pendingData, setPendingData] = useState(null)

  const today = getTodayString()
  const isToday = date === today

  const handleReview = (e) => {
    e.preventDefault()
    setError('')

    if (!roomId || !date || !startTime || !endTime || !purpose || !reservedBy) {
      setError('All fields are required.')
      return
    }

    // Prevent past dates
    if (date < today) {
      setError('You cannot make a reservation for a past date.')
      return
    }

    const now = new Date()
    const startIso = combineDateAndTime(date, startTime)
    const endIso = combineDateAndTime(date, endTime)

    // Prevent past start time on today
    if (isToday && new Date(startIso) <= now) {
      setError('Start time must be at least a few minutes from now.')
      return
    }

    // End must be after start
    if (new Date(endIso) <= new Date(startIso)) {
      setError('End time must be after start time.')
      return
    }

    // Minimum duration: 15 minutes
    const durationMs = new Date(endIso) - new Date(startIso)
    if (durationMs < 15 * 60 * 1000) {
      setError('Reservation must be at least 15 minutes long.')
      return
    }

    // Maximum duration: 8 hours
    if (durationMs > 8 * 60 * 60 * 1000) {
      setError('Reservation cannot exceed 8 hours.')
      return
    }

    // Purpose length guard
    if (purpose.trim().length < 5) {
      setError('Please provide a more descriptive purpose (at least 5 characters).')
      return
    }

    // Reserved by: no numbers or special characters
    if (!/^[a-zA-Z\s.'-]+$/.test(reservedBy.trim())) {
      setError('Reserved by should contain a valid name.')
      return
    }

    setPendingData({
      roomId,
      date,
      startTime,
      endTime,
      purpose,
      reservedBy,
      startIso,
      endIso,
    })
    setShowModal(true)
  }

  const handleConfirm = async () => {
    setShowModal(false)
    setSubmitting(true)
    setError('')

    try {
      const { data: overlapping, error: checkError } = await supabase
        .from('reservations')
        .select('id')
        .eq('room_id', pendingData.roomId)
        .lt('start_time', pendingData.endIso)
        .gt('end_time', pendingData.startIso)
        .limit(1)

      if (checkError) {
        setError('Error checking availability. Please try again.')
        setSubmitting(false)
        return
      }

      if (overlapping && overlapping.length > 0) {
        setError('This time slot is already taken. Please choose another time.')
        setSubmitting(false)
        return
      }

      const { data, error: insertError } = await supabase
        .from('reservations')
        .insert([
          {
            room_id: pendingData.roomId,
            user_id: user.id,
            start_time: pendingData.startIso,
            end_time: pendingData.endIso,
            status: 'active',
            is_checked_in: true,
            purpose: pendingData.purpose,
            reserved_by: pendingData.reservedBy,
          },
        ])
        .select()
        .single()

      if (insertError) {
        if (insertError.code === '23P01') {
          setError('This time slot is already taken. Please choose another time.')
        } else {
          setError('Failed to create reservation. Please try again.')
        }
        setSubmitting(false)
        return
      }

      if (onReservationCreated && data) {
        onReservationCreated(data)
      }

      setRoomId('')
      setDate('')
      setStartTime('')
      setEndTime('')
      setPurpose('')
      setReservedBy('')

      setSuccessMessage('Reservation created successfully!')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      setError(err.message || 'Failed to create reservation.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = () => {
    setShowModal(false)
    setPendingData(null)
  }

  // Reset times when date changes to avoid stale past-time values
  const handleDateChange = (e) => {
    setDate(e.target.value)
    setStartTime('')
    setEndTime('')
  }

  const selectedRoom = rooms.find((r) => r.id === pendingData?.roomId)

  return (
    <>
      <form onSubmit={handleReview} className="max-w-xl mx-auto space-y-4 text-sm">
        <div className="space-y-1.5">
          <label className="block font-medium text-slate-700">Room</label>
          <select
            className="cursor-pointer w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            required
          >
            <option value="">Select a room</option>
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="block font-medium text-slate-700">Date of meeting</label>
          <input
            type="date"
            className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            value={date}
            min={today}
            onChange={handleDateChange}
            required
          />
        </div>

        <div className="flex gap-4">
          <div className="flex-1 space-y-1.5">
            <label className="block font-medium text-slate-700">Start time</label>
            <input
              type="time"
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              value={startTime}
              min={isToday ? getMinTimeString() : undefined}
              onChange={(e) => {
                setStartTime(e.target.value)
                // Clear end time if it's now invalid
                if (endTime && e.target.value >= endTime) {
                  setEndTime('')
                }
              }}
              required
            />
          </div>
          <div className="flex-1 space-y-1.5">
            <label className="block font-medium text-slate-700">End time</label>
            <input
              type="time"
              className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              value={endTime}
              min={startTime || (isToday ? getMinTimeString() : undefined)}
              onChange={(e) => setEndTime(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block font-medium text-slate-700">Purpose</label>
          <textarea
            rows={3}
            className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1.5">
          <label className="block font-medium text-slate-700">Reserved by</label>
          <input
            type="text"
            placeholder={user?.email ?? 'Name'}
            className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            value={reservedBy}
            onChange={(e) => setReservedBy(e.target.value)}
            required
          />
        </div>

        {error && (
          <p className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-md px-3 py-2.5">
            {error}
          </p>
        )}

        {successMessage && (
          <p className="text-sm text-green-600 bg-green-50 border border-green-100 rounded-md px-3 py-2.5">
            {successMessage}
          </p>
        )}

        <button
          type="submit"
          className="cursor-pointer btn-primary w-full py-2.5 text-sm"
          disabled={submitting}
        >
          {submitting ? 'Reserving…' : 'Reserve room'}
        </button>
      </form>

      {showModal && pendingData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">
                Confirm Reservation
              </h3>
              <button
                type="button"
                onClick={handleCancel}
                className="cursor-pointer text-slate-400 hover:text-slate-600 transition-colors"
                aria-label="Close modal"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            <div className="space-y-2 text-sm">
              <p><span className="font-medium text-slate-700">Room:</span> {selectedRoom?.name}</p>
              <p><span className="font-medium text-slate-700">Date:</span> {new Date(pendingData.date).toLocaleDateString()}</p>
              <p><span className="font-medium text-slate-700">Start time:</span> {formatTime12h(pendingData.startTime)}</p>
              <p><span className="font-medium text-slate-700">End time:</span> {formatTime12h(pendingData.endTime)}</p>
              <p><span className="font-medium text-slate-700">Purpose:</span> {pendingData.purpose}</p>
              <p><span className="font-medium text-slate-700">Reserved by:</span> {pendingData.reservedBy}</p>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={handleCancel}
                className="cursor-pointer px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="cursor-pointer px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}