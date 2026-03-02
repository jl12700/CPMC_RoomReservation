import { useState, useEffect } from 'react'

function computeStatus(reservation) {
  const now = new Date()
  const start = new Date(reservation.start_time)
  const end = new Date(reservation.end_time)

  if (reservation.status === 'cancelled') return 'Cancelled'
  if (reservation.status === 'completed' || now > end) return 'Completed'
  if (now >= start && now <= end) return 'Ongoing'
  if (now < start) return 'Upcoming'
  return reservation.status
}

function getStatusColorClass(status) {
  switch (status) {
    case 'Cancelled':
      return 'bg-gray-200 text-gray-800'
    case 'Completed':
      return 'bg-green-100 text-green-800'
    case 'Ongoing':
      return 'bg-blue-100 text-blue-800'
    case 'Upcoming':
      return 'bg-yellow-100 text-yellow-800'
    default:
      return 'bg-slate-100 text-slate-700'
  }
}

export function MyReservations({
  reservations,
  rooms,
  user,
  onCancel,
  onEndEarly,
  onExtend,
}) {
  const now = new Date()
  const roomNameById = new Map((rooms || []).map((r) => [r.id, r.name]))

  // --- Filter state ---
  const [filterRoomId, setFilterRoomId] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  // --- Pagination state ---
  const [page, setPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(5)

  // Filter function
  const filteredRows = (reservations || [])
    .filter((r) => r.user_id === user.id)
    .filter((r) => {
      if (filterRoomId && r.room_id !== filterRoomId) return false
      const startDate = new Date(r.start_time)
      const dateStr = startDate.toISOString().split('T')[0] // YYYY-MM-DD
      if (filterDateFrom && dateStr < filterDateFrom) return false
      if (filterDateTo && dateStr > filterDateTo) return false
      if (filterStatus) {
        const status = computeStatus(r)
        if (status !== filterStatus) return false
      }
      return true
    })
    .sort(
      (a, b) =>
        new Date(b.start_time).getTime() - new Date(a.start_time).getTime(),
    )

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1)
  }, [filterRoomId, filterDateFrom, filterDateTo, filterStatus])

  const totalRows = filteredRows.length
  const totalPages = Math.ceil(totalRows / rowsPerPage)

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages || 1)
    }
  }, [totalPages, page])

  const startIndex = (page - 1) * rowsPerPage
  const endIndex = startIndex + rowsPerPage
  const paginatedRows = filteredRows.slice(startIndex, endIndex)

  const handlePageChange = (newPage) => {
    setPage(Math.min(Math.max(newPage, 1), totalPages))
  }

  const clearFilters = () => {
    setFilterRoomId('')
    setFilterDateFrom('')
    setFilterDateTo('')
    setFilterStatus('')
  }

  // Unique status options based on computed status of user's reservations
  const statusOptions = [
    ...new Set(
      (reservations || [])
        .filter((r) => r.user_id === user.id)
        .map((r) => computeStatus(r))
    ),
  ].sort()

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-base font-semibold text-slate-900">
          My reservations
        </h1>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-end bg-slate-50 p-3 rounded-lg border border-slate-200">
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600 px-2 ">Room</label>
          <select
            value={filterRoomId}
            onChange={(e) => setFilterRoomId(e.target.value)}
            className="cursor-pointer border border-slate-300 rounded px-2 py-1 text-xs w-32"
          >
            <option value="">All rooms</option>
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600 px-2">From date</label>
          <input
            type="date"
            value={filterDateFrom}
            onChange={(e) => setFilterDateFrom(e.target.value)}
            className="border border-slate-300 rounded px-2 py-1 text-xs w-36"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600 px-2">To date</label>
          <input
            type="date"
            value={filterDateTo}
            onChange={(e) => setFilterDateTo(e.target.value)}
            className="border border-slate-300 rounded px-2 py-1 text-xs w-36"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600 px-2">Status</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border border-slate-300 rounded px-2 py-1 text-xs w-28"
          >
            <option value="">All</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={clearFilters}
          className="cursor-pointer btn-outline text-xs px-3 py-1.5"
        >
          Clear filters
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white">
        <table className="min-w-full text-xs">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-slate-600">Room</th>
              <th className="px-3 py-2 text-left font-medium text-slate-600">Date</th>
              <th className="px-3 py-2 text-left font-medium text-slate-600">Start</th>
              <th className="px-3 py-2 text-left font-medium text-slate-600">End</th>
              <th className="px-3 py-2 text-left font-medium text-slate-600">Purpose</th>
              <th className="px-3 py-2 text-left font-medium text-slate-600">Status</th>
              <th className="px-3 py-2 text-left font-medium text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedRows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-4 text-center text-slate-500">
                  No reservations match your filters.
                </td>
              </tr>
            ) : (
              paginatedRows.map((r) => {
                const start = new Date(r.start_time)
                const end = new Date(r.end_time)
                const roomName = roomNameById.get(r.room_id) ?? 'Unknown'
                const statusLabel = computeStatus(r)
                const statusColorClass = getStatusColorClass(statusLabel)

                const isFuture = start.getTime() > now.getTime()
                const isOngoing =
                  now.getTime() >= start.getTime() &&
                  now.getTime() <= end.getTime()

                const canCancel =
                  (r.status === 'pending' || r.status === 'active') && isFuture
                const canEndEarly = r.status === 'active' && isOngoing
                const canExtend = r.status === 'active'

                return (
                  <tr key={r.id} className="border-t border-slate-100">
                    <td className="px-3 py-2 text-slate-800">{roomName}</td>
                    <td className="px-3 py-2 text-slate-700">
                      {start.toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {start.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {end.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-3 py-2 text-slate-700 max-w-xs truncate">
                      {r.purpose}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${statusColorClass}`}
                      >
                        {statusLabel}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {canEndEarly && (
                          <button
                            type="button"
                            className="cursor-pointer btn-outline text-[11px] px-2 py-1"
                            onClick={() => onEndEarly?.(r)}
                          >
                            End early
                          </button>
                        )}
                        {canExtend && (
                          <button
                            type="button"
                            className="cursor-pointer btn-primary text-[11px] px-2 py-1"
                            onClick={() => onExtend?.(r, 15)}
                          >
                            Extend 15m
                          </button>
                        )}
                        {canCancel && (
                          <button
                            type="button"
                            className="cursor-pointer btn-outline text-[11px] px-2 py-1"
                            onClick={() => onCancel?.(r)}
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      {totalPages > 0 && (
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-600">Rows per page:</span>
            <select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value))
                setPage(1)
              }}
              className="border border-slate-300 rounded px-2 py-1 text-xs"
            >
              {[5, 10, 20, 50].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-600">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
                className="px-2 py-1 border border-slate-300 rounded text-xs disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
              >
                Previous
              </button>
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page === totalPages}
                className="px-2 py-1 border border-slate-300 rounded text-xs disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}