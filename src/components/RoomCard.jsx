import { ReservationCountdown } from './ReservationCountdown'

export function RoomCard({
  room,
  user,
  onBookNow,
  onCheckIn,
  onEndEarly,
  onExtend,
  onCancel,
}) {
  const currentReservation = room.currentReservation
  const userId = user?.id ?? null
  const isOwner = currentReservation?.user_id === userId

  let statusColor = 'bg-emerald-50 text-emerald-700 border-emerald-200'
  let statusLabel = 'Available'

  if (currentReservation?.status === 'pending') {
    statusColor = 'bg-amber-50 text-amber-700 border-amber-200'
    statusLabel = 'Pending check-in'
  } else if (currentReservation?.status === 'active') {
    statusColor = 'bg-rose-50 text-rose-700 border-rose-200'
    statusLabel = 'Occupied'
  }

  const handleBookNow = () => {
    if (onBookNow) {
      onBookNow(room)
    }
  }

  const handleCheckIn = () => {
    if (onCheckIn && currentReservation) {
      onCheckIn(currentReservation)
    }
  }

  const handleEndEarly = () => {
    if (onEndEarly && currentReservation) {
      onEndEarly(currentReservation)
    }
  }

  const handleExtend = () => {
    if (onExtend && currentReservation) {
      onExtend(currentReservation, 15)
    }
  }

  const handleCancel = () => {
    if (onCancel && currentReservation) {
      onCancel(currentReservation)
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col gap-3 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-900">{room.name}</h3>
          <p className="text-xs text-slate-500">
            {room.location} • {room.capacity} people
          </p>
        </div>
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium border ${statusColor}`}
        >
          {statusLabel}
        </span>
      </div>

      {currentReservation ? (
        <div className="flex flex-col gap-2">
          <ReservationCountdown reservation={currentReservation} />
          {isOwner && (
            <div className="flex flex-wrap gap-2">
              {currentReservation.status === 'pending' && (
                <button className="btn-primary" onClick={handleCheckIn}>
                  Check in
                </button>
              )}
              {currentReservation.status === 'active' && (
                <>
                  <button className="btn-outline" onClick={handleEndEarly}>
                    End early
                  </button>
                  <button className="btn-primary" onClick={handleExtend}>
                    Extend 15 min
                  </button>
                </>
              )}
              {(currentReservation.status === 'pending' ||
                currentReservation.status === 'active') && (
                <button className="btn-outline" onClick={handleCancel}>
                  Cancel
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="mt-2">
          <button className="btn-primary w-full" onClick={handleBookNow}>
            Book now
          </button>
        </div>
      )}
    </div>
  )
}

