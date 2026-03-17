import { useState, useEffect, useRef, useCallback } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO,
} from 'date-fns';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';

import { Calendar, Clock, MapPin, User, X, ChevronLeft, ChevronRight } from 'lucide-react';

function computeStatus(reservation) {
  const now = new Date();
  const start = new Date(reservation.start_time);
  const end = new Date(reservation.end_time);

  if (reservation.status === 'cancelled') return 'Cancelled';
  if (reservation.status === 'completed' || now > end) return 'Completed';
  if (now >= start && now <= end) return 'Ongoing';
  if (now < start) return 'Upcoming';
  return reservation.status;
}

function getStatusColorClass(status) {
  switch (status) {
    case 'Cancelled':
      return 'bg-gray-200 text-gray-800 border-gray-300';
    case 'Completed':
      return 'bg-green-100 text-green-800 border-green-300';
    case 'Ongoing':
      return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'Upcoming':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-300';
  }
}

function getStatusBadgeColor(status) {
  switch (status) {
    case 'Cancelled':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    case 'Completed':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'Ongoing':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'Upcoming':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

export function ReservationsTable({ reservations, rooms }) {
  const roomNameById = new Map((rooms || []).map((r) => [r.id, r.name]));

  const [filterRoomId, setFilterRoomId] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [selectedDayEvents, setSelectedDayEvents] = useState(null); 
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef(null);

  const [upcomingPage, setUpcomingPage] = useState(1);  // will be used for month events pagination
  const eventsPerPage = 3; 

  const filteredReservations = (reservations || [])
    .filter((r) => {
      if (filterRoomId && r.room_id !== filterRoomId) return false;
      const startDate = new Date(r.start_time);
      const dateStr = startDate.toISOString().split('T')[0];
      if (filterDateFrom && dateStr < filterDateFrom) return false;
      if (filterDateTo && dateStr > filterDateTo) return false;
      if (filterStatus) {
        const status = computeStatus(r);
        if (status !== filterStatus) return false;
      }
      return true;
    })
    .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

  useEffect(() => {
    setUpcomingPage(1);
  }, [filterRoomId, filterDateFrom, filterDateTo, filterStatus]);

  const reservationToEvent = (r) => ({
    id: r.id,
    title: r.purpose || 'No purpose',
    room: roomNameById.get(r.room_id) ?? 'Unknown',
    room_id: r.room_id,
    start: parseISO(r.start_time),
    end: parseISO(r.end_time),
    status: computeStatus(r),
    reserved_by: r.reserved_by,
    original: r,
  });

  const events = filteredReservations.map(reservationToEvent);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthEvents = events.filter((ev) => ev.start >= monthStart && ev.start <= monthEnd);
  // Sort month events by start time (ascending) for the list
  const monthEventsSorted = [...monthEvents].sort((a, b) => a.start - b.start);

  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const eventsByDay = daysInMonth.map((day) => ({
    date: day,
    events: monthEvents.filter((ev) => isSameDay(ev.start, day)),
  }));

  // --- Right column data (based on selected month) ---
  const scheduledCount = monthEventsSorted.filter((ev) => ev.status === 'Upcoming').length;
  const ongoingCount = monthEventsSorted.filter((ev) => ev.status === 'Ongoing').length;
  const completedCount = monthEventsSorted.filter((ev) => ev.status === 'Completed').length;
  const cancelledCount = monthEventsSorted.filter((ev) => ev.status === 'Cancelled').length;

  const totalMonthEvents = monthEventsSorted.length;
  const totalMonthPages = Math.ceil(totalMonthEvents / eventsPerPage);
  const monthStartIndex = (upcomingPage - 1) * eventsPerPage;
  const monthEndIndex = monthStartIndex + eventsPerPage;
  const currentMonthEvents = monthEventsSorted.slice(monthStartIndex, monthEndIndex);

  // Reset page when month changes
  useEffect(() => {
    setUpcomingPage(1);
  }, [currentDate]);

  const handlePrevMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
    setPickerOpen(false);
  };

  const handleMonthSelect = (month) => {
    setCurrentDate(month);
    setPickerOpen(false);
  };

  const handleEventClick = (event) => {
    setSelectedReservation(event.original);
  };

  const handleCloseModal = () => {
    setSelectedReservation(null);
  };

  const handleShowMoreEvents = (day, events) => {
    setSelectedDayEvents({ date: day, events });
  };

  const handleEventClickFromDay = (event) => {
    setSelectedDayEvents(null);
    setSelectedReservation(event.original);
  };

  const handleCloseDayModal = () => {
    setSelectedDayEvents(null);
  };

  const clearFilters = () => {
    setFilterRoomId('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setFilterStatus('');
  };

  const statusOptions = [...new Set((reservations || []).map((r) => computeStatus(r)))].sort();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setPickerOpen(false);
      }
    };
    if (pickerOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [pickerOpen]);

  return (
    <div className="flex flex-col gap-4">
      
      <div className="flex items-center justify-between">
        <h1 className="text-base font-semibold text-slate-900">Reservations Calendar</h1>
      </div>

      <div className="flex flex-wrap gap-2 items-end bg-slate-50 p-3 rounded-lg border border-slate-200">
        {/* Filters */}
        <div className="space-y-1 flex-1 min-w-[120px]">
          <label className="text-xs font-medium text-slate-600 px-2">Room</label>
          <select
            value={filterRoomId}
            onChange={(e) => setFilterRoomId(e.target.value)}
            className="cursor-pointer border border-slate-300 rounded px-2 py-1.5 text-xs w-full"
          >
            <option value="">All rooms</option>
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1 flex-1 min-w-[120px]">
          <label className="text-xs font-medium text-slate-600 px-2">From date</label>
          <input
            type="date"
            value={filterDateFrom}
            onChange={(e) => setFilterDateFrom(e.target.value)}
            className="border border-slate-300 rounded px-2 py-1.5 text-xs w-full"
          />
        </div>
        <div className="space-y-1 flex-1 min-w-[120px]">
          <label className="text-xs font-medium text-slate-600 px-2">To date</label>
          <input
            type="date"
            value={filterDateTo}
            onChange={(e) => setFilterDateTo(e.target.value)}
            className="border border-slate-300 rounded px-2 py-1.5 text-xs w-full"
          />
        </div>
        <div className="space-y-1 flex-1 min-w-[100px]">
          <label className="text-xs font-medium text-slate-600 px-2">Status</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border border-slate-300 rounded px-2 py-1.5 text-xs w-full"
          >
            <option value="">All</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
        <button onClick={clearFilters} className="cursor-pointer btn-outline text-xs px-3 py-1.5 self-end">
          Clear filters
        </button>
      </div>

      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevMonth}
                className="p-1 rounded hover:bg-slate-200 transition"
                aria-label="Previous month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleToday}
                className="px-3 py-1 text-xs font-semibold border border-slate-300 rounded hover:bg-slate-100"
              >
                Today
              </button>
              <button
                onClick={handleNextMonth}
                className="p-1 rounded hover:bg-slate-200 transition"
                aria-label="Next month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="relative" ref={pickerRef}>
              <button
                onClick={() => setPickerOpen(!pickerOpen)}
                className="inline-flex items-center gap-2 px-3 py-1 border border-slate-300 rounded bg-white text-sm font-medium hover:bg-slate-50"
              >
                {format(currentDate, 'MMMM yyyy')}
                <span className="text-slate-400">▾</span>
              </button>
          {pickerOpen && (
                <div className="absolute top-8 right-0 bg-white border border-slate-200 rounded-xl shadow-lg p-3 z-30 max-w-[90vw]">
                  <DayPicker
                    mode="single"
                    captionLayout="dropdown"
                    month={currentDate}
                    onMonthChange={handleMonthSelect}
                    className="text-sm"
                  />
                </div>
              )}
            </div>
          </div>

          
          <div className="grid grid-cols-7 text-center text-[10px] sm:text-xs font-medium text-slate-500 py-2 border-b border-slate-100">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>

          
          <div className="grid grid-cols-7 text-sm">
            {daysInMonth.map((day, idx) => {
              const dayEvents = eventsByDay.find((d) => isSameDay(d.date, day))?.events || [];
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isTodayFlag = isToday(day);

              return (
                <div
                  key={idx}
                  className={`min-h-[48px] sm:min-h-[80px] p-0.5 sm:p-1 border-b border-r border-slate-100 ${
                    !isCurrentMonth ? 'bg-slate-50 text-slate-400' : ''
                  } ${isTodayFlag ? 'bg-blue-50' : ''}`}
                >
                  <div className={`text-right pr-1 text-xs ${isTodayFlag ? 'font-bold text-blue-600' : ''}`}>
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-1 mt-1">
                    {dayEvents.slice(0, 2).map((ev) => (
                      <button
                        key={ev.id}
                        onClick={() => handleEventClick(ev)}
                        className={`w-full text-left text-[10px] px-1 py-0.5 rounded truncate border ${getStatusColorClass(
                          ev.status
                        )} hover:opacity-80 transition`}
                      >
                        {ev.room}: {ev.title}
                      </button>
                    ))}
                    {dayEvents.length > 2 && (
                      <button
                        onClick={() => handleShowMoreEvents(day, dayEvents)}
                        className="text-[9px] text-blue-600 hover:underline pl-1 focus:outline-none"
                      >
                        +{dayEvents.length - 2} more
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        
        <div className="space-y-6">
          
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
              Status Overview
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-yellow-50 rounded-lg text-center border border-yellow-100">
                <span className="block text-2xl font-bold text-yellow-600">{scheduledCount}</span>
                <span className="text-xs text-yellow-600 font-medium">Upcoming</span>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg text-center border border-blue-100">
                <span className="block text-2xl font-bold text-blue-600">{ongoingCount}</span>
                <span className="text-xs text-blue-600 font-medium">Ongoing</span>
              </div>
              <div className="p-3 bg-green-50 rounded-lg text-center border border-green-100">
                <span className="block text-2xl font-bold text-green-600">{completedCount}</span>
                <span className="text-xs text-green-600 font-medium">Completed</span>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg text-center border border-gray-100">
                <span className="block text-2xl font-bold text-gray-600">{cancelledCount}</span>
                <span className="text-xs text-gray-600 font-medium">Cancelled</span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Total reservations in month:</span>
                <span className="font-semibold text-slate-700">{totalMonthEvents}</span>
              </div>
            </div>
          </div>

          
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Reservations
              </h3>
              <span className="text-xs text-slate-500">{totalMonthEvents} total</span>
            </div>

            {currentMonthEvents.length > 0 ? (
              <div className="space-y-3 mb-4">
                {currentMonthEvents.map((ev) => (
                  <button
                    key={ev.id}
                    onClick={() => handleEventClick(ev)}
                    className="w-full text-left p-3 border rounded-lg hover:bg-slate-50 transition"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="font-semibold text-sm truncate">{ev.title}</h4>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getStatusBadgeColor(
                          ev.status
                        )}`}
                      >
                        {ev.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <p className="text-xs text-slate-500">{format(ev.start, 'MMM d, yyyy')}</p>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <p className="text-xs text-slate-500">
                        {format(ev.start, 'h:mm a')} – {format(ev.end, 'h:mm a')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <p className="text-xs text-slate-500 truncate">{ev.room}</p>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <User className="w-3 h-3 text-slate-400" />
                      <p className="text-xs text-slate-500 truncate">Reserved by: {ev.reserved_by}</p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-slate-400 text-sm">No reservations this month</p>
              </div>
            )}

            
            {totalMonthPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4 border-t border-slate-100">
                <button
                  onClick={() => setUpcomingPage((p) => Math.max(p - 1, 1))}
                  disabled={upcomingPage === 1}
                  className="p-1 rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: totalMonthPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setUpcomingPage(page)}
                    className={`w-8 h-8 text-sm rounded-md ${
                      upcomingPage === page
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setUpcomingPage((p) => Math.min(p + 1, totalMonthPages))}
                  disabled={upcomingPage === totalMonthPages}
                  className="p-1 rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      
      {selectedReservation && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in"
          onClick={handleCloseModal}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-slate-200 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
            
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(
                      computeStatus(selectedReservation)
                    )}`}
                  >
                    {computeStatus(selectedReservation)}
                  </span>
                  <h3 className="text-xl font-bold text-slate-900 mt-2 pr-4">
                    {selectedReservation.purpose || 'No purpose'}
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Room: {roomNameById.get(selectedReservation.room_id) ?? 'Unknown'}
                  </p>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              
              <div className="space-y-4 mt-4">
                <div className="flex items-start">
                  <Calendar className="w-5 h-5 text-blue-500 mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-slate-500">Date</p>
                    <p className="text-slate-900">
                      {format(parseISO(selectedReservation.start_time), 'EEEE, MMMM d, yyyy')}
                    </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Clock className="w-5 h-5 text-green-500 mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-slate-500">Time</p>
                    <p className="text-slate-900">
                      {format(parseISO(selectedReservation.start_time), 'h:mm a')} –{' '}
                      {format(parseISO(selectedReservation.end_time), 'h:mm a')}
                    </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <User className="w-5 h-5 text-orange-500 mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-slate-500">Reserved by</p>
                    <p className="text-slate-900">{selectedReservation.reserved_by}</p>
                  </div>
                </div>
              </div>

              
              <div className="mt-6 pt-6 border-t border-slate-100">
                <button
                  onClick={handleCloseModal}
                  className="w-full px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      
      {selectedDayEvents && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in"
          onClick={handleCloseDayModal}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-slate-200 animate-scale-in max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            
            <div className="p-6 pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    {format(selectedDayEvents.date, 'EEEE, MMMM d, yyyy')}
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    {selectedDayEvents.events.length} reservation(s)
                  </p>
                </div>
                <button
                  onClick={handleCloseDayModal}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            
            <div className="overflow-y-auto flex-1 px-6 pb-6">
              <div className="space-y-2">
                {selectedDayEvents.events.map((ev) => (
                  <button
                    key={ev.id}
                    onClick={() => handleEventClickFromDay(ev)}
                    className="w-full text-left p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-medium text-sm text-slate-900">{ev.title}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getStatusBadgeColor(
                          ev.status
                        )}`}
                      >
                        {ev.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <p className="text-xs text-slate-500">
                        {format(ev.start, 'h:mm a')} – {format(ev.end, 'h:mm a')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <p className="text-xs text-slate-500">{ev.room}</p>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <User className="w-3 h-3 text-slate-400" />
                      <p className="text-xs text-slate-500">Reserved by: {ev.reserved_by}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      
      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}