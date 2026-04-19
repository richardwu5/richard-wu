// ─── Price Service ────────────────────────────────────────────────────────────
// Fetches real flight (SerpApi) and hotel (Xotelo) prices via the local proxy.
// Results are cached in localStorage for CACHE_TTL_MS to avoid burning API quota.

const CACHE_TTL_MS = 4 * 60 * 60 * 1000 // 4 hours

function cacheKey(type, ...parts) {
  return `wayfarer:${type}:${parts.join(':')}`
}

function readCache(key) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const { value, expiresAt } = JSON.parse(raw)
    if (Date.now() > expiresAt) { localStorage.removeItem(key); return null }
    return value
  } catch { return null }
}

function writeCache(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify({ value, expiresAt: Date.now() + CACHE_TTL_MS }))
  } catch { /* storage full — silently skip */ }
}

// ─── Flights ──────────────────────────────────────────────────────────────────
// Returns cheapest round-trip price in USD, or null if unavailable.
// Pass `arrivalAirport` (IATA code) for custom destinations; falls back to destId preset lookup.
export async function fetchFlightPrice(origin, destId, outbound, inbound, arrivalAirport) {
  const key = cacheKey('flight', origin, arrivalAirport || destId, outbound, inbound)
  const cached = readCache(key)
  if (cached !== null) return cached

  const params = new URLSearchParams({ origin, destId, outbound, inbound })
  if (arrivalAirport) params.set('arrivalAirport', arrivalAirport)
  const res = await fetch(`/api/flights?${params}`)
  if (!res.ok) throw new Error(`Flight API error ${res.status}`)
  const data = await res.json()

  if (data.error) throw new Error(data.error)

  const result = {
    price: data.price,
    airlines: data.airlines || [],
    airlineLogo: data.airlineLogo || null,
    totalDuration: data.totalDuration || null,
    isDirect: data.isDirect ?? null,
    layovers: data.layovers || [],
  }
  writeCache(key, result)
  return result  // { price, airlines, airlineLogo, totalDuration, isDirect, layovers }
}

// ─── Hotels ───────────────────────────────────────────────────────────────────
// Returns { totalPrice, pricePerNight, nights } or null if unavailable.
export async function fetchHotelPrice(destId, checkin, checkout) {
  const key = cacheKey('hotel', destId, checkin, checkout)
  const cached = readCache(key)
  if (cached !== null) return cached

  const params = new URLSearchParams({ destId, checkin, checkout })
  const res = await fetch(`/api/hotels?${params}`)
  if (!res.ok) throw new Error(`Hotel API error ${res.status}`)
  const data = await res.json()

  if (data.error) throw new Error(data.error)

  const result = {
    totalPrice: data.totalPrice,
    pricePerNight: data.pricePerNight,
    nights: data.nights,
  }
  writeCache(key, result)
  return result
}

// ─── Batch fetcher ────────────────────────────────────────────────────────────
// Fetches flight prices for every (trip × window) combination.
// Calls onProgress(completed, total) after each resolves.
//
// Returns:
//   { [tripId]: { [windowKey]: { flight, total, airlines, ... } } }
//
export async function fetchAllPrices({ trips, windows, homeAirport, onProgress }) {
  const results = {}
  const tasks = []

  for (const trip of trips) {
    results[trip.id] = {}
    for (const win of windows) {
      const windowKey = `${win.from}::${win.to}`
      tasks.push({ trip, win, windowKey })
    }
  }

  let completed = 0
  const total = tasks.length

  await Promise.all(tasks.map(async ({ trip, win, windowKey }) => {
    const flightResult = await Promise.allSettled([
      fetchFlightPrice(homeAirport, trip.id, win.from, win.to, trip.airport),
    ])

    const flightData = flightResult[0].status === 'fulfilled' ? flightResult[0].value : null
    const flightPrice = flightData?.price ?? null

    results[trip.id][windowKey] = {
      flight: flightPrice,
      total: flightPrice,
      airlines: flightData?.airlines ?? [],
      airlineLogo: flightData?.airlineLogo ?? null,
      totalDuration: flightData?.totalDuration ?? null,
      isDirect: flightData?.isDirect ?? null,
      layovers: flightData?.layovers ?? [],
    }

    completed++
    onProgress?.(completed, total)
  }))

  return results
}

// ─── Restore from cache (no network) ─────────────────────────────────────────
// Re-reads all cached flight results into the same shape as fetchAllPrices.
// Returns null if any entry is missing or expired.
export function restoreFromCache({ trips, windows, homeAirport }) {
  const results = {}
  for (const trip of trips) {
    results[trip.id] = {}
    for (const win of windows) {
      const windowKey = `${win.from}::${win.to}`
      const flightKey = cacheKey('flight', homeAirport, trip.airport || trip.id, win.from, win.to)
      const flightData = readCache(flightKey)
      if (!flightData) return null   // cache miss — bail out
      const flightPrice = flightData?.price ?? null
      results[trip.id][windowKey] = {
        flight: flightPrice,
        total: flightPrice,
        airlines: flightData?.airlines ?? [],
        airlineLogo: flightData?.airlineLogo ?? null,
        totalDuration: flightData?.totalDuration ?? null,
        isDirect: flightData?.isDirect ?? null,
        layovers: flightData?.layovers ?? [],
      }
    }
  }
  return results
}

// ─── Cache introspection ──────────────────────────────────────────────────────
export function clearPriceCache() {
  const keysToRemove = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k?.startsWith('wayfarer:')) keysToRemove.push(k)
  }
  keysToRemove.forEach(k => localStorage.removeItem(k))
}

export function getCacheAge(trips, windows, homeAirport) {
  // Returns the oldest cache entry's remaining TTL in ms, or 0 if any is expired/missing
  let oldest = Infinity
  for (const trip of trips) {
    for (const win of windows) {
      for (const type of ['flight']) {
        const key = cacheKey('flight', homeAirport, trip.airport || trip.id, win.from, win.to)
        try {
          const raw = localStorage.getItem(key)
          if (!raw) return 0
          const { expiresAt } = JSON.parse(raw)
          oldest = Math.min(oldest, expiresAt - Date.now())
        } catch { return 0 }
      }
    }
  }
  return oldest === Infinity ? 0 : Math.max(0, oldest)
}
