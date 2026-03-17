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

  const handleReview = (e) => {
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
            onChange={(e) => setDate(e.target.value)}
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
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              Confirm Reservation
            </h3>
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
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
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