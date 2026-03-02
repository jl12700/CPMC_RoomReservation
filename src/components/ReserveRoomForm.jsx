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

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!roomId || !date || !startTime || !endTime || !purpose || !reservedBy) {
      setError('All fields are required.')
      return
    }

    const startIso = combineDateAndTime(date, startTime)
    const endIso = combineDateAndTime(date, endTime)

    if (new Date(endIso) <= new Date(startIso)) {
      setError('End time must be after start time.')
      return
    }

    setSubmitting(true)

    try {
      // Check for overlapping reservations
      const { data: overlapping, error: checkError } = await supabase
        .from('reservations')
        .select('id')
        .eq('room_id', roomId)
        .lt('start_time', endIso)
        .gt('end_time', startIso)
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

      // Insert the new reservation
      const { data, error: insertError } = await supabase
        .from('reservations')
        .insert([
          {
            room_id: roomId,
            user_id: user.id,
            start_time: startIso,
            end_time: endIso,
            status: 'active',
            is_checked_in: true,
            purpose,
            reserved_by: reservedBy,
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
        return
      }

      if (onReservationCreated && data) {
        onReservationCreated(data)
      }

      // Clear form on success
      setStartTime('')
      setEndTime('')
      setPurpose('')
      setReservedBy('')
    } catch (err) {
      setError(err.message || 'Failed to reservation.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl mx-auto space-y-4 text-sm">
      {/* Room selection */}
      <div className="space-y-1.5">
        <label className="block font-medium text-slate-700">Room</label>
        <select
          className=" cursor-pointer w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
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

      {/* Date */}
      <div className="space-y-1.5">
        <label className="block font-medium text-slate-700">Date of meeting</label>
        <input
          type="date"
          className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
      </div>

      {/* Start & End time */}
      <div className="flex gap-4">
        <div className="flex-1 space-y-1.5">
          <label className="block font-medium text-slate-700">Start time</label>
          <input
            type="time"
            className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
          />
        </div>
        <div className="flex-1 space-y-1.5">
          <label className="block font-medium text-slate-700">End time</label>
          <input
            type="time"
            className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            required
          />
        </div>
      </div>

      {/* Purpose */}
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

      {/* Reserved by */}
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

      {/* Error message */}
      {error && (
        <p className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-md px-3 py-2.5">
          {error}
        </p>
      )}

      {/* Submit button */}
      <button
        type="submit"
        className=" cursor-pointer btn-primary w-full py-2.5 text-sm"
        disabled={submitting}
      >
        {submitting ? 'Reserving…' : 'Reserve room'}
      </button>
    </form>
  )
}