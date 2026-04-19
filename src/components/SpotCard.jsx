import { Star, Camera, Globe, Bot, BookOpen, ExternalLink, CheckCircle2, Circle, Utensils, Trash2, Plus } from 'lucide-react'

const SOURCE_ICONS = {
  IG: <Camera size={11} />,
  AI: <Bot size={11} />,
  website: <Globe size={11} />,
  blog: <BookOpen size={11} />,
}

const SOURCE_LABELS = { IG: 'Instagram', AI: 'AI rec', website: 'Website', blog: 'Blog' }

export default function SpotCard({ spot, onToggleReserved, onRemove, onAddToDay, days, compact = false }) {
  if (compact) {
    return (
      <div className={`flex items-center gap-2 p-2 rounded-lg bg-white border text-xs ${
        spot.reservationRequired && !spot.reserved ? 'border-amber-200 bg-amber-50' : 'border-stone-100'
      }`}>
        <span>{spot.type === 'restaurant' ? '🍽️' : '📍'}</span>
        <span className="font-medium text-stone-800 flex-1 truncate">{spot.name}</span>
        {spot.reservationRequired && (
          <span className={`shrink-0 ${spot.reserved ? 'text-green-500' : 'text-amber-500'}`}>
            {spot.reserved ? '✓ booked' : '⚠ need res.'}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-xl border p-4 transition-all ${
      spot.reservationRequired && !spot.reserved
        ? 'border-amber-200'
        : 'border-stone-200'
    }`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <span className="text-lg shrink-0">{spot.type === 'restaurant' ? '🍽️' : '📍'}</span>
          <div className="min-w-0">
            <p className="font-medium text-stone-900 text-sm leading-tight">{spot.name}</p>
            <p className="text-xs text-stone-500 mt-0.5">{spot.neighborhood}</p>
          </div>
        </div>
        {onRemove && (
          <button onClick={() => onRemove(spot.id)} className="text-stone-300 hover:text-red-400 shrink-0">
            <Trash2 size={13} />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap mb-2">
        {/* Rating */}
        <span className="flex items-center gap-1 text-xs text-amber-500 font-medium">
          <Star size={11} fill="currentColor" /> {spot.rating}
        </span>

        {/* Cuisine */}
        {spot.cuisine && (
          <span className="text-xs bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full">
            {spot.cuisine}
          </span>
        )}

        {/* Source */}
        <span className="flex items-center gap-1 text-xs text-stone-400">
          {SOURCE_ICONS[spot.source]} {SOURCE_LABELS[spot.source]}
        </span>

        {/* Added by */}
        <span className={`text-xs px-2 py-0.5 rounded-full ${
          spot.addedBy === 'wife' ? 'bg-pink-50 text-pink-600' : 'bg-blue-50 text-blue-600'
        }`}>
          {spot.addedBy === 'wife' ? '👩 Wife' : '👤 You'}
        </span>
      </div>

      {/* Reservation status */}
      {spot.reservationRequired && (
        <button
          onClick={() => onToggleReserved && onToggleReserved(spot.id)}
          className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg transition-colors mb-2 ${
            spot.reserved
              ? 'bg-green-50 text-green-700 hover:bg-green-100'
              : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
          }`}
        >
          {spot.reserved
            ? <><CheckCircle2 size={12} /> Reservation confirmed</>
            : <><Circle size={12} /> Reservation needed</>
          }
        </button>
      )}

      {spot.notes && (
        <p className="text-xs text-stone-400 italic mb-2">"{spot.notes}"</p>
      )}

      {/* Add to day */}
      {onAddToDay && days && days.length > 0 && (
        <div className="border-t border-stone-100 pt-2 mt-2">
          <p className="text-xs text-stone-400 mb-1">Add to day:</p>
          <div className="flex flex-wrap gap-1">
            {days.map(day => (
              <button
                key={day.id}
                onClick={() => onAddToDay(day.id, spot.id)}
                className={`text-xs px-2 py-0.5 rounded-md transition-colors ${
                  day.spotIds.includes(spot.id)
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-stone-100 text-stone-600 hover:bg-indigo-50 hover:text-indigo-600'
                }`}
              >
                {day.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
