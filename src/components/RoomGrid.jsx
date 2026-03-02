import { RoomCard } from './RoomCard'

export function RoomGrid({
  rooms,
  user,
  onBookNow,
  onCheckIn,
  onEndEarly,
  onExtend,
  onCancel,
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {rooms.map((room) => (
        <RoomCard
          key={room.id}
          room={room}
          user={user}
          onBookNow={onBookNow}
          onCheckIn={onCheckIn}
          onEndEarly={onEndEarly}
          onExtend={onExtend}
          onCancel={onCancel}
        />
      ))}
      {rooms.length === 0 && (
        <div className="col-span-full text-sm text-slate-500">
          No rooms found. Seed the database with rooms to get started.
        </div>
      )}
    </div>
  )
}

