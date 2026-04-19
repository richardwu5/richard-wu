import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../AppContext'
import { fetchAllPrices, clearPriceCache, restoreFromCache } from '../api/priceService'
import {
  Plus, Trash2, Plane, Cloud, Calendar,
  ChevronRight, TrendingDown, Star, ChevronDown, ChevronUp,
  Info, RefreshCw, Loader2, Zap, MapPin, X
} from 'lucide-react'

// ─── Date/window helpers ──────────────────────────────────────────────────────

function buildWindows(windowStart, windowEnd, tripDays) {
  const windows = []
  const start = new Date(windowStart)
  const end = new Date(windowEnd)
  const tripMs = (tripDays - 1) * 86400000
  for (let d = new Date(start); ; d.setDate(d.getDate() + 1)) {
    const dep = new Date(d)
    const ret = new Date(dep.getTime() + tripMs)
    if (ret > end) break
    windows.push({ from: dep.toISOString().slice(0, 10), to: ret.toISOString().slice(0, 10), nights: tripDays - 1 })
  }
  return windows
}

function formatDate(iso) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatDuration(minutes) {
  if (!minutes) return null
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

// ─── Sub-components ───────────────────────────────────────────────────────────


function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border-2 border-stone-200 p-5 animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="h-8 w-8 bg-stone-100 rounded mb-2" />
          <div className="h-5 w-24 bg-stone-100 rounded mb-1" />
          <div className="h-3 w-16 bg-stone-100 rounded" />
        </div>
      </div>
      <div className="space-y-3 mb-4">
        {[1, 2].map(i => (
          <div key={i} className="flex justify-between">
            <div className="h-3 w-20 bg-stone-100 rounded" />
            <div className="h-3 w-14 bg-stone-100 rounded" />
          </div>
        ))}
        <div className="border-t border-stone-100 pt-3 flex justify-between">
          <div className="h-4 w-12 bg-stone-100 rounded" />
          <div className="h-5 w-20 bg-stone-200 rounded" />
        </div>
      </div>
      <div className="h-16 bg-stone-50 rounded-xl mb-4" />
      <div className="h-10 bg-stone-100 rounded-xl" />
    </div>
  )
}

function TripCard({ trip, windows, realPrices, isWinner, isLoading, onSelect, onRemove }) {
  const [expanded, setExpanded] = useState(false)

  // Compute prices for every window — only populated from real fetch results.
  // Pre-search, all entries have flight/total = null so the UI shows a placeholder.
  const windowData = useMemo(() => windows.map((win) => {
    const winKey = `${win.from}::${win.to}`
    const real = realPrices?.[winKey]
    if (real) return { ...real, isReal: true, win }
    return { flight: null, total: null, airlines: [], airlineLogo: null, isDirect: null, layovers: [], isReal: false, win }
  }), [windows, realPrices])

  // bestIdx over windows that actually have real data; fall back to 0 if none
  const bestIdx = useMemo(() => {
    let bi = -1
    for (let i = 0; i < windowData.length; i++) {
      if (windowData[i].total === null) continue
      if (bi === -1 || windowData[i].total < windowData[bi].total) bi = i
    }
    return bi >= 0 ? bi : 0
  }, [windowData])
  const [selectedWin, setSelectedWin] = useState(bestIdx)
  useEffect(() => { setSelectedWin(bestIdx) }, [bestIdx])

  if (isLoading) return <SkeletonCard />

  if (windows.length === 0) {
    const total = trip.flightPrice
    return (
      <div className="relative bg-white rounded-2xl border-2 border-stone-200 p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <span className="text-3xl">{trip.emoji}</span>
            <h3 className="text-xl font-semibold text-stone-900 mt-1">{trip.city}</h3>
            <p className="text-sm text-stone-500">{trip.country}</p>
          </div>
          <button onClick={() => onRemove(trip.id)} className="text-stone-300 hover:text-red-400 p-1"><Trash2 size={15} /></button>
        </div>
        <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-2 mb-3">Trip length exceeds window — showing base estimate</p>
        <div className="text-lg font-bold mb-4">${total.toLocaleString()}</div>
        <button onClick={() => onSelect(trip.id)} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2">
          Build itinerary <ChevronRight size={15} />
        </button>
      </div>
    )
  }

  const active = windowData[selectedWin]
  const best = windowData[bestIdx]
  const anyReal = windowData.some(d => d.isReal)

  return (
    <div className={`relative bg-white rounded-2xl border-2 transition-all ${
      isWinner ? 'border-indigo-400 shadow-lg shadow-indigo-100' : 'border-stone-200 hover:border-stone-300'
    }`}>
      {isWinner && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1 whitespace-nowrap">
          <TrendingDown size={11} /> Best value
        </div>
      )}

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <span className="text-3xl">{trip.emoji}</span>
            <h3 className="text-xl font-semibold text-stone-900 mt-1">{trip.city}</h3>
            <p className="text-sm text-stone-500">{trip.country}</p>
          </div>
          <button onClick={() => onRemove(trip.id)} className="text-stone-300 hover:text-red-400 p-1"><Trash2 size={15} /></button>
        </div>

        {/* Active window price */}
        <div className="space-y-2.5 mb-4">
          <div className="flex items-start justify-between text-sm gap-2">
            <span className="flex items-center gap-2 text-stone-500 shrink-0 mt-0.5"><Plane size={13} /> Round-trip flight</span>
            <div className="flex flex-col items-end gap-0.5 min-w-0">
              <span className="flex items-center gap-1.5 font-medium text-stone-800">
                <span className={`text-lg font-bold ${isWinner ? 'text-indigo-600' : 'text-stone-900'}`}>
                  {active.flight !== null ? `$${active.flight.toLocaleString()}` : '—'}
                </span>
              </span>
              {/* Airline + direct/layover info — only shown when real data available */}
              {active.isReal && (active.airlineLogo || active.airlines?.length > 0) && (
                <span className="flex flex-col items-end gap-0.5">
                  <span className="flex items-center gap-1.5">
                    {active.airlineLogo && (
                      <img src={active.airlineLogo} alt="" className="h-5 w-5 object-contain rounded" />
                    )}
                    {active.airlines?.length > 0 && (
                      <span className="text-stone-500 text-xs">{active.airlines.join(' / ')}</span>
                    )}
                    {active.totalDuration && (
                      <span className="text-stone-400 text-xs">· {formatDuration(active.totalDuration)}</span>
                    )}
                  </span>
                  {active.isDirect === true && (
                    <span className="text-emerald-600 text-xs font-medium">Direct</span>
                  )}
                  {active.isDirect === false && active.layovers?.length > 0 && (
                    <span className="text-amber-600 text-xs">
                      1 stop · {formatDuration(active.layovers[0].duration)} in {active.layovers[0].name ?? active.layovers[0].id ?? '—'}
                    </span>
                  )}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Best window — only shown once we have real data */}
        <div className="bg-stone-50 rounded-xl p-3 mb-4">
          {anyReal ? (
            <>
              <div className="flex items-center justify-between">
                <div className="text-xs text-stone-500">
                  <span className="text-indigo-600 font-semibold">Best: </span>
                  {formatDate(best.win.from)} – {formatDate(best.win.to)}
                  <span className="text-stone-400 ml-1">· {best.win.nights + 1} days</span>
                </div>
                {selectedWin !== bestIdx && (
                  <button onClick={() => setSelectedWin(bestIdx)} className="text-xs text-indigo-600 hover:underline">
                    Use cheapest
                  </button>
                )}
              </div>
              {selectedWin === bestIdx && windows.length > 1 && (
                <p className="text-xs text-emerald-600 font-medium mt-1">✓ Cheapest selected</p>
              )}
            </>
          ) : (
            <p className="text-xs text-stone-400 italic text-center">Click Search to fetch live prices</p>
          )}
        </div>

        {/* Season / weather */}
        <div className="flex items-center gap-3 text-xs text-stone-400 mb-4">
          <span className="flex items-center gap-1"><Calendar size={11} /> {trip.bestSeason}</span>
          <span className="flex items-center gap-1"><Cloud size={11} /> {trip.weather}</span>
        </div>

        {/* Expand all windows */}
        {windows.length > 1 && (
          <button onClick={() => setExpanded(e => !e)}
            className="w-full flex items-center justify-between text-xs text-stone-400 hover:text-stone-600 mb-3 transition-colors">
            <span>All {windows.length} windows</span>
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        )}

        {expanded && (
          <div className="mb-3 max-h-44 overflow-y-auto space-y-0.5 border border-stone-100 rounded-xl p-1">
            {windowData.map((d, i) => (
              <button key={`${d.win.from}-${d.win.to}`} onClick={() => setSelectedWin(i)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors ${
                  i === selectedWin ? 'bg-indigo-50 text-indigo-700 font-medium' : 'hover:bg-stone-50 text-stone-600'
                }`}>
                <span className="flex items-center gap-1.5">
                  {formatDate(d.win.from)} – {formatDate(d.win.to)}
                  <span className={i === selectedWin ? 'text-indigo-400' : 'text-stone-400'}>· {d.win.nights + 1}d</span>
                </span>
                <span className="flex items-center gap-1.5">
                  {d.isReal && d.airlineLogo && (
                    <img src={d.airlineLogo} alt="" className="h-4 w-4 object-contain rounded" />
                  )}
                  {d.isReal && d.airlines?.length > 0 && (
                    <span className={i === selectedWin ? 'text-indigo-400' : 'text-stone-400'}>
                      {d.airlines[0]}
                    </span>
                  )}
                  <span className="font-medium">
                    {d.total !== null ? `$${d.total.toLocaleString()}` : '—'}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}

        <button onClick={() => onSelect(trip.id)}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2">
          Build itinerary <ChevronRight size={15} />
        </button>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

function slugifyCity(city) {
  return city.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function AddDestinationForm({ onAddCustom, onCancel }) {
  const [city, setCity]       = useState('')
  const [country, setCountry] = useState('')
  const [airport, setAirport] = useState('')
  const [emoji, setEmoji]     = useState('')
  const [error, setError]     = useState('')
  const [busy, setBusy]       = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!/^[A-Za-z]{3}$/.test(airport.trim())) { setError('Enter a 3-letter airport code (e.g. JFK)'); return }

    let finalCity = city.trim()
    let finalCountry = country.trim()

    // Auto-resolve city/country from IATA if city left blank
    if (!finalCity) {
      setBusy(true)
      try {
        const r = await fetch(`/api/airport?code=${airport.trim().toUpperCase()}`)
        if (!r.ok) { setBusy(false); setError('Couldn\'t find that airport — enter a city manually'); return }
        const data = await r.json()
        finalCity = data.city
        if (!finalCountry) finalCountry = data.country || ''
      } catch {
        setBusy(false); setError('Lookup failed — enter a city manually'); return
      }
      setBusy(false)
    }

    const ok = onAddCustom({ city: finalCity, country: finalCountry, airport, emoji })
    if (!ok) setError('Something went wrong — check your inputs')
  }

  return (
    <div className="p-5">
      {/* Custom entry */}
      <p className="text-sm font-medium text-stone-700 mb-2">Add a city</p>
      <form onSubmit={submit} className="space-y-2">
        <input value={city} onChange={e => { setCity(e.target.value); setError('') }}
          placeholder="City (leave blank to auto-fill from airport)"
          className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400" />
        <div className="flex gap-2">
          <input value={country} onChange={e => setCountry(e.target.value)}
            placeholder="Country (optional)"
            className="flex-1 min-w-0 border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400" />
          <input value={airport} onChange={e => { setAirport(e.target.value.toUpperCase().slice(0, 3)); setError('') }}
            placeholder="FCO" maxLength={3}
            className="w-20 border border-stone-200 rounded-lg px-2 py-2 text-sm font-mono font-semibold text-center uppercase focus:outline-none focus:border-indigo-400" />
        </div>
        <div className="flex gap-2">
          <input value={emoji} onChange={e => setEmoji(e.target.value.slice(0, 2))}
            placeholder="🏛️"
            className="w-14 border border-stone-200 rounded-lg px-2 py-2 text-base text-center focus:outline-none focus:border-indigo-400" />
          <button type="submit" disabled={busy}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-stone-300 text-white text-sm font-medium py-2 rounded-lg transition-colors">
            {busy ? 'Looking up…' : 'Add'}
          </button>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </form>

      <button type="button" onClick={onCancel} className="mt-3 text-xs text-stone-400 hover:text-stone-600 w-full text-center">
        Cancel
      </button>
    </div>
  )
}

export default function Compare() {
  const { trips, addTrip, removeTrip, setActiveTrip } = useApp()
  const navigate = useNavigate()

  // ── Draft filter state (what the inputs show — doesn't affect cards until committed)
  const [windowFrom, setWindowFrom]   = useState('2026-10-10')
  const [windowTo, setWindowTo]       = useState('2026-10-24')
  const [tripDaysMin, setTripDaysMin] = useState(8)
  const [tripDaysMax, setTripDaysMax] = useState(10)
  const [homeAirport, setHomeAirport] = useState('SFO')
  const [showAdd, setShowAdd]         = useState(false)

  // ── Committed search params (what the cards actually render)
  const [committed, setCommitted] = useState({
    windowFrom: '2026-10-10',
    windowTo: '2026-10-24',
    tripDaysMin: 8,
    tripDaysMax: 10,
    homeAirport: 'SFO',
  })

  // ── Fetch state
  const [realPrices, setRealPrices] = useState({})
  const [fetchStatus, setFetchStatus] = useState('idle') // idle | loading | done | error
  const [progress, setProgress]     = useState({ done: 0, total: 0 })
  const [fetchError, setFetchError] = useState(null)
  const [lastFetched, setLastFetched] = useState(null)
  const abortRef = useRef(false)

  // Build windows from COMMITTED params — cards stay stable while user edits the form
  const windows = useMemo(() => {
    const all = []
    for (let d = committed.tripDaysMin; d <= committed.tripDaysMax; d++) {
      all.push(...buildWindows(committed.windowFrom, committed.windowTo, d))
    }
    const seen = new Set()
    return all.filter(w => { const k = `${w.from}::${w.to}`; if (seen.has(k)) return false; seen.add(k); return true })
  }, [committed])

  // Indicate whether the draft form differs from the last committed search
  const isDirty = (
    windowFrom !== committed.windowFrom ||
    windowTo !== committed.windowTo ||
    tripDaysMin !== committed.tripDaysMin ||
    tripDaysMax !== committed.tripDaysMax ||
    homeAirport.trim().toUpperCase() !== committed.homeAirport
  )

  // Auto-restore from localStorage cache on mount / after HMR resets state
  useEffect(() => {
    if (Object.keys(realPrices).length > 0) return
    const restored = restoreFromCache({ trips, windows, homeAirport: committed.homeAirport })
    if (restored) {
      setRealPrices(restored)
      setFetchStatus('done')
      setLastFetched(new Date())
    }
  }, [trips, windows, committed.homeAirport])  // eslint-disable-line react-hooks/exhaustive-deps

  const windowDays = windowFrom && windowTo
    ? Math.round((new Date(windowTo) - new Date(windowFrom)) / 86400000) + 1 : 0

  // Best real prices per trip for "winner" determination — null if no data yet.
  const bestPrices = useMemo(() => trips.map(trip => {
    const perTrip = realPrices[trip.id]
    if (!perTrip || windows.length === 0) return null
    const reals = windows
      .map(win => perTrip[`${win.from}::${win.to}`]?.total)
      .filter(v => typeof v === 'number')
    return reals.length > 0 ? Math.min(...reals) : null
  }), [trips, windows, realPrices])
  const validBestPrices = bestPrices.filter(p => p !== null)
  const minBestPrice = validBestPrices.length > 0 ? Math.min(...validBestPrices) : null

  const handleFetch = useCallback(async () => {
    if (!homeAirport.trim()) return
    abortRef.current = false

    // Commit the draft form → triggers cards/windows to re-render with new params
    const newCommitted = {
      windowFrom,
      windowTo,
      tripDaysMin,
      tripDaysMax,
      homeAirport: homeAirport.trim().toUpperCase(),
    }
    setCommitted(newCommitted)

    // Build the windows list from the committed values (state isn't updated yet in this closure)
    const newWindows = []
    for (let d = newCommitted.tripDaysMin; d <= newCommitted.tripDaysMax; d++) {
      newWindows.push(...buildWindows(newCommitted.windowFrom, newCommitted.windowTo, d))
    }

    setFetchStatus('loading')
    setFetchError(null)
    setProgress({ done: 0, total: trips.length * newWindows.length })

    try {
      const result = await fetchAllPrices({
        trips,
        windows: newWindows,
        homeAirport: newCommitted.homeAirport,
        onProgress: (done, total) => {
          if (!abortRef.current) setProgress({ done, total })
        },
      })
      if (!abortRef.current) {
        setRealPrices(result)
        setFetchStatus('done')
        setLastFetched(new Date())
      }
    } catch (err) {
      if (!abortRef.current) {
        setFetchError(err.message)
        setFetchStatus('error')
      }
    }
  }, [trips, windowFrom, windowTo, tripDaysMin, tripDaysMax, homeAirport])

  const handleRefresh = () => {
    clearPriceCache()
    setRealPrices({})
    setFetchStatus('idle')
    setLastFetched(null)
  }

  const handleSelect = (id) => { setActiveTrip(id); navigate('/itinerary') }
  const handleAddCustom = ({ city, country, airport, emoji }) => {
    const trimmedCity = city.trim()
    const trimmedAirport = airport.trim().toUpperCase()
    if (!trimmedCity || !/^[A-Z]{3}$/.test(trimmedAirport)) return false
    let id = slugifyCity(trimmedCity) || trimmedAirport.toLowerCase()
    // Ensure uniqueness
    const existing = new Set(trips.map(t => t.id))
    let unique = id, n = 2
    while (existing.has(unique)) { unique = `${id}-${n++}` }
    addTrip({
      id: unique,
      city: trimmedCity,
      country: country.trim() || '—',
      airport: trimmedAirport,
      emoji: emoji || '✈️',
      flightPrice: 600,
      bestSeason: '—',
      weather: '—',
      currency: 'USD',
      dates: { from: windowFrom, to: windowTo },
      notes: '',
    })
    setShowAdd(false)
    return true
  }
  const isFetching = fetchStatus === 'loading'
  const hasPrices  = fetchStatus === 'done'

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-stone-900 tracking-tight">Compare destinations</h1>
        <p className="text-stone-500 mt-1">Real flight + hotel prices across every date window</p>
      </div>

      {/* ── Filters banner ── */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4 mb-6 space-y-3">
        <div className="flex flex-wrap items-center gap-4">
          {/* Home airport */}
          <div className="flex items-center gap-2">
            <MapPin size={15} className="text-indigo-500 shrink-0" />
            <span className="text-sm font-medium text-stone-700 whitespace-nowrap">Flying from</span>
            <input
              value={homeAirport}
              onChange={e => setHomeAirport(e.target.value.toUpperCase().slice(0, 3))}
              placeholder="JFK"
              maxLength={3}
              className="w-16 border border-stone-200 rounded-lg px-2 py-1.5 text-sm text-stone-800 font-mono font-semibold text-center uppercase focus:outline-none focus:border-indigo-400"
            />
          </div>

          <div className="h-6 w-px bg-stone-200 hidden sm:block" />

          {/* Travel window */}
          <div className="flex items-center gap-2">
            <Calendar size={15} className="text-indigo-500 shrink-0" />
            <span className="text-sm font-medium text-stone-700 whitespace-nowrap">Window</span>
            <input type="date" value={windowFrom} onChange={e => setWindowFrom(e.target.value)}
              className="border border-stone-200 rounded-lg px-3 py-1.5 text-sm text-stone-700 focus:outline-none focus:border-indigo-400" />
            <span className="text-stone-400 text-sm">→</span>
            <input type="date" value={windowTo} onChange={e => setWindowTo(e.target.value)}
              className="border border-stone-200 rounded-lg px-3 py-1.5 text-sm text-stone-700 focus:outline-none focus:border-indigo-400" />
          </div>

          <div className="h-6 w-px bg-stone-200 hidden sm:block" />

          {/* Trip length range */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-stone-700 whitespace-nowrap">Trip length</span>
            <div className="flex items-center border border-stone-200 rounded-lg overflow-hidden focus-within:border-indigo-400">
              <button onClick={() => setTripDaysMin(d => Math.max(1, d - 1))} className="px-2.5 py-1.5 text-stone-500 hover:bg-stone-50 text-sm font-medium">−</button>
              <input type="number" min="1" max={tripDaysMax} value={tripDaysMin}
                onChange={e => { const n = parseInt(e.target.value, 10); if (!isNaN(n) && n >= 1 && n <= tripDaysMax) setTripDaysMin(n) }}
                className="w-10 text-center text-sm text-stone-800 font-medium focus:outline-none py-1.5" />
              <button onClick={() => setTripDaysMin(d => Math.min(tripDaysMax, d + 1))} className="px-2.5 py-1.5 text-stone-500 hover:bg-stone-50 text-sm font-medium">+</button>
            </div>
            <span className="text-sm text-stone-400">–</span>
            <div className="flex items-center border border-stone-200 rounded-lg overflow-hidden focus-within:border-indigo-400">
              <button onClick={() => setTripDaysMax(d => Math.max(tripDaysMin, d - 1))} className="px-2.5 py-1.5 text-stone-500 hover:bg-stone-50 text-sm font-medium">−</button>
              <input type="number" min={tripDaysMin} max={windowDays} value={tripDaysMax}
                onChange={e => { const n = parseInt(e.target.value, 10); if (!isNaN(n) && n >= tripDaysMin) setTripDaysMax(n) }}
                className="w-10 text-center text-sm text-stone-800 font-medium focus:outline-none py-1.5" />
              <button onClick={() => setTripDaysMax(d => Math.min(windowDays, d + 1))} className="px-2.5 py-1.5 text-stone-500 hover:bg-stone-50 text-sm font-medium">+</button>
            </div>
            <span className="text-sm text-stone-500">days</span>
          </div>
        </div>

        {/* Fetch row */}
        <div className="flex items-center gap-3 pt-1 border-t border-stone-100">
          {/* Window pill */}
          {windows.length > 0
            ? <span className="bg-indigo-50 text-indigo-700 text-xs font-medium px-3 py-1 rounded-full flex items-center gap-1.5">
                <Calendar size={11} /> {windows.length} window{windows.length !== 1 ? 's' : ''}
                {tripDaysMin !== tripDaysMax && <span className="opacity-60">· {tripDaysMin}–{tripDaysMax} days</span>}
              </span>
            : <span className="bg-amber-50 text-amber-700 text-xs font-medium px-3 py-1 rounded-full flex items-center gap-1.5">
                <Info size={11} /> Trip length exceeds window
              </span>
          }

          {/* Progress bar while fetching */}
          {isFetching && (
            <div className="flex items-center gap-2 flex-1">
              <div className="flex-1 bg-stone-100 rounded-full h-1.5 overflow-hidden">
                <div className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                  style={{ width: progress.total > 0 ? `${(progress.done / progress.total) * 100}%` : '0%' }} />
              </div>
              <span className="text-xs text-stone-400 whitespace-nowrap">{progress.done}/{progress.total}</span>
            </div>
          )}

          {/* Filters changed indicator */}
          {isDirty && !isFetching && (
            <span className="text-xs text-amber-600 font-medium">Filters changed — hit Search</span>
          )}

          {/* Last fetched */}
          {lastFetched && !isFetching && !isDirty && (
            <span className="text-xs text-stone-400">
              Updated {lastFetched.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}

          {fetchError && (
            <span className="text-xs text-red-500 flex items-center gap-1">
              <X size={11} /> {fetchError}
            </span>
          )}

          <div className="ml-auto flex items-center gap-2">
            {hasPrices && (
              <button onClick={handleRefresh}
                className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-600 transition-colors px-2 py-1.5 rounded-lg hover:bg-stone-50">
                <RefreshCw size={11} /> Clear cache
              </button>
            )}
            <button
              onClick={handleFetch}
              disabled={isFetching || windows.length === 0 || !homeAirport.trim()}
              className={`flex items-center gap-2 text-sm font-medium px-4 py-1.5 rounded-xl transition-colors ${
                isFetching || windows.length === 0
                  ? 'bg-stone-100 text-stone-400 cursor-not-allowed'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              {isFetching
                ? <><Loader2 size={13} className="animate-spin" /> Fetching…</>
                : isDirty
                ? <><Zap size={13} /> Search</>
                : hasPrices
                ? <><RefreshCw size={13} /> Refresh prices</>
                : <><Zap size={13} /> Get real prices</>
              }
            </button>
          </div>
        </div>
      </div>

      {/* ── Cards grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {trips.map((trip, i) => (
          <TripCard
            key={trip.id}
            trip={trip}
            windows={windows}
            realPrices={realPrices[trip.id]}
            isWinner={bestPrices[i] !== null && bestPrices[i] === minBestPrice && trips.length > 1}
            isLoading={isFetching}
            onSelect={handleSelect}
            onRemove={removeTrip}
          />
        ))}

        {/* Add destination */}
        <div className="bg-white rounded-2xl border-2 border-dashed border-stone-200 hover:border-indigo-300 transition-colors">
          {!showAdd ? (
            <button onClick={() => setShowAdd(true)}
              className="w-full h-full min-h-64 flex flex-col items-center justify-center gap-3 text-stone-400 hover:text-indigo-500 transition-colors p-6">
              <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center"><Plus size={22} /></div>
              <span className="text-sm font-medium">Add destination</span>
            </button>
          ) : (
            <AddDestinationForm
              onAddCustom={handleAddCustom}
              onCancel={() => setShowAdd(false)}
            />
          )}
        </div>
      </div>

      {/* ── Summary bar — only when we have real prices ── */}
      {trips.length > 1 && validBestPrices.length > 0 && (
        <div className="mt-8 bg-indigo-50 border border-indigo-100 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Star size={15} className="text-indigo-600" />
            <span className="text-sm font-semibold text-indigo-900">Summary</span>
            <span className="text-xs text-indigo-400">
              — live prices, best across {windows.length} window{windows.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {trips.map((t, i) => (
              <div key={t.id} className="text-center">
                <div className="text-lg">{t.emoji}</div>
                <div className="text-sm font-semibold text-stone-800">{t.city}</div>
                <div className={`text-base font-bold ${bestPrices[i] !== null && bestPrices[i] === minBestPrice ? 'text-indigo-600' : 'text-stone-600'}`}>
                  {bestPrices[i] !== null ? `$${bestPrices[i].toLocaleString()}` : '—'}
                </div>
                <div className="text-xs text-stone-400">best of {windows.length}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
