import { useState, lazy, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../AppContext'
import SpotCard from '../components/SpotCard'
import {
  Plus, MapPin, Calendar, Users, Filter, SortAsc,
  ChevronDown, ChevronUp, ArrowLeft, Sparkles, Star
} from 'lucide-react'

const TripMap = lazy(() => import('../components/TripMap'))

const SORT_OPTIONS = [
  { value: 'rating', label: 'Rating' },
  { value: 'neighborhood', label: 'Neighborhood' },
  { value: 'addedBy', label: 'Added by' },
]

function AddSpotModal({ tripId, onClose }) {
  const { addSpotToWishlist } = useApp()
  const [form, setForm] = useState({
    name: '', type: 'restaurant', cuisine: '', neighborhood: '',
    lat: '', lng: '', rating: '', addedBy: 'you',
    reservationRequired: false, source: 'AI', notes: '',
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    addSpotToWishlist(tripId, {
      ...form,
      id: `spot-${Date.now()}`,
      lat: parseFloat(form.lat) || 0,
      lng: parseFloat(form.lng) || 0,
      rating: parseFloat(form.rating) || 0,
      reserved: false,
    })
    onClose()
  }

  const f = (k) => (e) => setForm(s => ({ ...s, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-stone-900 mb-4">Add spot to wishlist</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input required placeholder="Name" value={form.name} onChange={f('name')}
            className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-400" />

          <div className="grid grid-cols-2 gap-3">
            <select value={form.type} onChange={f('type')}
              className="border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-400">
              <option value="restaurant">Restaurant</option>
              <option value="activity">Activity / Sight</option>
            </select>
            <input placeholder="Cuisine (optional)" value={form.cuisine} onChange={f('cuisine')}
              className="border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-400" />
          </div>

          <input required placeholder="Neighborhood" value={form.neighborhood} onChange={f('neighborhood')}
            className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-400" />

          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Latitude" value={form.lat} onChange={f('lat')}
              className="border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-400" />
            <input placeholder="Longitude" value={form.lng} onChange={f('lng')}
              className="border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-400" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Rating (e.g. 4.7)" value={form.rating} onChange={f('rating')}
              className="border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-400" />
            <select value={form.source} onChange={f('source')}
              className="border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-400">
              <option value="AI">AI recommendation</option>
              <option value="IG">Instagram</option>
              <option value="website">Website</option>
              <option value="blog">Blog</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <select value={form.addedBy} onChange={f('addedBy')}
              className="border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-400">
              <option value="you">Added by: You</option>
              <option value="wife">Added by: Wife</option>
            </select>
            <label className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer">
              <input type="checkbox" checked={form.reservationRequired} onChange={f('reservationRequired')}
                className="rounded" />
              Needs reservation
            </label>
          </div>

          <textarea placeholder="Notes (optional)" value={form.notes} onChange={f('notes')}
            rows={2}
            className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 resize-none" />

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 border border-stone-200 text-stone-600 text-sm py-2 rounded-xl hover:bg-stone-50 transition-colors">
              Cancel
            </button>
            <button type="submit"
              className="flex-1 bg-indigo-600 text-white text-sm py-2 rounded-xl hover:bg-indigo-700 transition-colors">
              Add spot
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function DayBlock({ day, spots, tripId, allDays }) {
  const { removeSpotFromDay, updateDay, addSpotToDay } = useApp()
  const [collapsed, setCollapsed] = useState(false)
  const [editingLabel, setEditingLabel] = useState(false)

  const daySpots = spots.filter(s => day.spotIds.includes(s.id))
  const reservationWarnings = daySpots.filter(s => s.reservationRequired && !s.reserved).length

  return (
    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-stone-50 transition-colors"
        onClick={() => setCollapsed(c => !c)}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
            <Calendar size={14} className="text-indigo-600" />
          </div>
          <div>
            {editingLabel ? (
              <input
                value={day.label}
                onChange={e => updateDay(tripId, day.id, { label: e.target.value })}
                onBlur={() => setEditingLabel(false)}
                autoFocus
                onClick={e => e.stopPropagation()}
                className="text-sm font-semibold text-stone-900 border-b border-indigo-400 focus:outline-none bg-transparent"
              />
            ) : (
              <span
                className="text-sm font-semibold text-stone-900 hover:text-indigo-600"
                onDoubleClick={e => { e.stopPropagation(); setEditingLabel(true) }}
              >
                {day.label}
              </span>
            )}
            <p className="text-xs text-stone-400">{day.date}</p>
          </div>

          {/* Neighborhood pills */}
          <div className="flex flex-wrap gap-1 ml-1">
            {day.neighborhoods.map(n => (
              <span key={n} className="text-xs bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                <MapPin size={9} /> {n}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {reservationWarnings > 0 && (
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
              {reservationWarnings} reservation{reservationWarnings > 1 ? 's' : ''} needed
            </span>
          )}
          <span className="text-xs text-stone-400">{daySpots.length} spots</span>
          {collapsed ? <ChevronDown size={15} className="text-stone-400" /> : <ChevronUp size={15} className="text-stone-400" />}
        </div>
      </div>

      {!collapsed && (
        <div className="px-4 pb-4 space-y-2 border-t border-stone-100 pt-3">
          {daySpots.length === 0 ? (
            <p className="text-xs text-stone-400 text-center py-4">No spots yet — add from the wishlist →</p>
          ) : (
            daySpots.map(spot => (
              <SpotCard
                key={spot.id}
                spot={spot}
                compact
                onRemove={() => removeSpotFromDay(tripId, day.id, spot.id)}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default function Itinerary() {
  const { activeTrip, trips, wishlist, itinerary, setActiveTrip, addDay, addSpotToDay, removeSpotFromWishlist, updateSpot } = useApp()
  const navigate = useNavigate()
  const [showAddSpot, setShowAddSpot] = useState(false)
  const [showMap, setShowMap] = useState(true)
  const [sortBy, setSortBy] = useState('rating')
  const [filterBy, setFilterBy] = useState('all')
  const [selectedNeighborhood, setSelectedNeighborhood] = useState(null)

  const trip = trips.find(t => t.id === activeTrip)

  if (!activeTrip || !trip) {
    return (
      <div className="text-center py-20">
        <div className="text-5xl mb-4">🗺️</div>
        <h2 className="text-2xl font-semibold text-stone-900 mb-2">No trip selected</h2>
        <p className="text-stone-500 mb-6">Go to Compare, pick a destination, and click "Build itinerary"</p>
        <button
          onClick={() => navigate('/')}
          className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          Browse destinations
        </button>
      </div>
    )
  }

  const spots = wishlist[activeTrip] || []
  const days = itinerary[activeTrip] || []

  // Spots not yet assigned to any day
  const assignedIds = new Set(days.flatMap(d => d.spotIds))
  const unassignedSpots = spots.filter(s => !assignedIds.has(s.id))

  // Derive neighborhoods from wishlist
  const neighborhoods = [...new Set(spots.map(s => s.neighborhood))]

  // Filter + sort wishlist
  let displaySpots = [...spots]
  if (filterBy === 'restaurant') displaySpots = displaySpots.filter(s => s.type === 'restaurant')
  if (filterBy === 'activity') displaySpots = displaySpots.filter(s => s.type === 'activity')
  if (filterBy === 'needs-res') displaySpots = displaySpots.filter(s => s.reservationRequired && !s.reserved)
  if (filterBy === 'wife') displaySpots = displaySpots.filter(s => s.addedBy === 'wife')
  if (selectedNeighborhood) displaySpots = displaySpots.filter(s => s.neighborhood === selectedNeighborhood)
  if (sortBy === 'rating') displaySpots.sort((a, b) => b.rating - a.rating)
  if (sortBy === 'neighborhood') displaySpots.sort((a, b) => a.neighborhood.localeCompare(b.neighborhood))
  if (sortBy === 'addedBy') displaySpots.sort((a, b) => a.addedBy.localeCompare(b.addedBy))

  // Map spots (all spots with coordinates)
  const mapSpots = spots.filter(s => s.lat && s.lng)
  const highlightedIds = selectedNeighborhood
    ? spots.filter(s => s.neighborhood === selectedNeighborhood).map(s => s.id)
    : []

  const reservationTotal = spots.filter(s => s.reservationRequired && !s.reserved).length

  return (
    <div>
      {/* Trip header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="text-stone-400 hover:text-stone-700 transition-colors">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
              {trip.emoji} {trip.city} itinerary
            </h1>
            <p className="text-sm text-stone-500">{trip.dates.from} → {trip.dates.to} · {trip.nights} nights</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {reservationTotal > 0 && (
            <div className="bg-amber-50 border border-amber-200 text-amber-700 text-xs px-3 py-1.5 rounded-xl">
              ⚠ {reservationTotal} reservation{reservationTotal > 1 ? 's' : ''} still needed
            </div>
          )}
          <button
            onClick={() => setShowMap(m => !m)}
            className={`text-sm px-3 py-1.5 rounded-xl border transition-colors ${showMap ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'border-stone-200 text-stone-500 hover:bg-stone-50'}`}
          >
            {showMap ? 'Hide map' : 'Show map'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: Itinerary days */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-stone-800">Day-by-day plan</h2>
            <button
              onClick={() => addDay(activeTrip)}
              className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              <Plus size={14} /> Add day
            </button>
          </div>

          {days.length === 0 ? (
            <div className="bg-white rounded-2xl border-2 border-dashed border-stone-200 p-10 text-center">
              <Calendar size={32} className="text-stone-300 mx-auto mb-3" />
              <p className="text-stone-400 text-sm">No days yet</p>
              <button onClick={() => addDay(activeTrip)} className="mt-3 text-sm text-indigo-600 hover:underline">
                Add your first day
              </button>
            </div>
          ) : (
            days.map(day => (
              <DayBlock
                key={day.id}
                day={day}
                spots={spots}
                tripId={activeTrip}
                allDays={days}
              />
            ))
          )}

          {/* Map */}
          {showMap && (
            <div className="h-72 rounded-2xl overflow-hidden border border-stone-200 mt-4">
              <Suspense fallback={<div className="h-full bg-stone-100 flex items-center justify-center text-stone-400 text-sm">Loading map…</div>}>
                <TripMap spots={mapSpots} highlightedSpotIds={highlightedIds} />
              </Suspense>
            </div>
          )}
        </div>

        {/* RIGHT: Wishlist */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-stone-800 flex items-center gap-2">
              <Sparkles size={15} className="text-indigo-500" />
              Wishlist
              <span className="text-xs bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full">{spots.length}</span>
            </h2>
            <button
              onClick={() => setShowAddSpot(true)}
              className="flex items-center gap-1.5 text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-xl hover:bg-indigo-700 transition-colors"
            >
              <Plus size={13} /> Add
            </button>
          </div>

          {/* Neighborhood filter chips */}
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setSelectedNeighborhood(null)}
              className={`text-xs px-3 py-1 rounded-full transition-colors ${
                !selectedNeighborhood ? 'bg-indigo-100 text-indigo-700' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              All areas
            </button>
            {neighborhoods.map(n => (
              <button
                key={n}
                onClick={() => setSelectedNeighborhood(sn => sn === n ? null : n)}
                className={`text-xs px-3 py-1 rounded-full transition-colors flex items-center gap-1 ${
                  selectedNeighborhood === n ? 'bg-indigo-100 text-indigo-700' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                <MapPin size={9} /> {n}
              </button>
            ))}
          </div>

          {/* Filter + sort */}
          <div className="flex gap-2">
            <select
              value={filterBy}
              onChange={e => setFilterBy(e.target.value)}
              className="flex-1 text-xs border border-stone-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-indigo-400 text-stone-600"
            >
              <option value="all">All types</option>
              <option value="restaurant">Restaurants</option>
              <option value="activity">Activities</option>
              <option value="needs-res">Needs reservation</option>
              <option value="wife">Wife's picks</option>
            </select>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="flex-1 text-xs border border-stone-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-indigo-400 text-stone-600"
            >
              <option value="rating">Sort: Rating</option>
              <option value="neighborhood">Sort: Neighborhood</option>
              <option value="addedBy">Sort: Added by</option>
            </select>
          </div>

          {/* Spot cards */}
          <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto pr-1">
            {displaySpots.length === 0 ? (
              <div className="text-center py-8 text-stone-400 text-sm">
                No spots yet — add one above
              </div>
            ) : (
              displaySpots.map(spot => (
                <SpotCard
                  key={spot.id}
                  spot={spot}
                  days={days}
                  onToggleReserved={(id) => updateSpot(activeTrip, id, { reserved: !spot.reserved })}
                  onRemove={(id) => removeSpotFromWishlist(activeTrip, id)}
                  onAddToDay={(dayId, spotId) => addSpotToDay(activeTrip, dayId, spotId)}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {showAddSpot && <AddSpotModal tripId={activeTrip} onClose={() => setShowAddSpot(false)} />}
    </div>
  )
}
