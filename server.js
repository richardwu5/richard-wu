import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Resolve .env relative to server.js — works regardless of cwd
const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: join(__dirname, '.env') })

import express from 'express'
import cors from 'cors'

const app = express()
const PORT = 3001
const SERPAPI_KEY = process.env.SERPAPI_KEY

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174'] }))
app.use(express.json())

// ─── Destination metadata ─────────────────────────────────────────────────────
const DEST_META = {
  tokyo:         { airports: ['NRT'], locationKey: 'g298184' },
  lisbon:        { airports: ['LIS'], locationKey: 'g189158' },
  'mexico-city': { airports: ['MEX'], locationKey: 'g150800' },
  barcelona:     { airports: ['BCN'], locationKey: 'g187497' },
  bali:          { airports: ['DPS'], locationKey: 'g297697' },
  'new-york':    { airports: ['JFK'], locationKey: 'g60763'  },
  paris:         { airports: ['CDG'], locationKey: 'g187147' },
}

// ─── Trimmed mean ─────────────────────────────────────────────────────────────
// Sorts values, drops bottom and top `trimFraction` of entries, averages the rest.
// With 20 hotels and trimFraction=0.25: drops 5 cheapest + 5 most expensive,
// averages the middle 10 — filters out hostels and luxury hotels automatically.
function trimmedMean(values, trimFraction = 0.25) {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const cut = Math.floor(sorted.length * trimFraction)
  const middle = cut > 0 ? sorted.slice(cut, sorted.length - cut) : sorted
  if (middle.length === 0) return sorted[Math.floor(sorted.length / 2)]
  return middle.reduce((a, b) => a + b, 0) / middle.length
}

// ─── In-memory hotel list cache (TTL: 24 h) ───────────────────────────────────
// Xotelo hotel lists don't change frequently — no need to re-fetch on every request.
const hotelListCache = new Map() // locationKey → { keys: string[], expiresAt: number }

async function getHotelKeys(locationKey, limit = 20) {
  const cached = hotelListCache.get(locationKey)
  if (cached && Date.now() < cached.expiresAt) return cached.keys

  const url = `https://data.xotelo.com/api/list?location_key=${locationKey}&limit=${limit}&sort=popularity`
  const r = await fetch(url)
  const data = await r.json()

  if (!data.result?.list || !Array.isArray(data.result.list)) {
    throw new Error(`Xotelo list failed for ${locationKey}`)
  }

  const keys = data.result.list
    .map(h => h.key)
    .filter(Boolean)

  hotelListCache.set(locationKey, { keys, expiresAt: Date.now() + 24 * 60 * 60 * 1000 })
  return keys
}

// ─── Flights: GET /api/flights ────────────────────────────────────────────────
app.get('/api/flights', async (req, res) => {
  const { origin, destId, arrivalAirport, outbound, inbound } = req.query

  if (!origin || !outbound || !inbound || (!destId && !arrivalAirport)) {
    return res.status(400).json({ error: 'Missing required params: origin, (destId or arrivalAirport), outbound, inbound' })
  }

  // Prefer explicit arrivalAirport if provided, else look up preset destId
  let destCode = arrivalAirport?.toUpperCase()
  if (!destCode) {
    const meta = DEST_META[destId]
    if (!meta) return res.status(404).json({ error: `Unknown destination: ${destId}` })
    destCode = meta.airports[0]
  }
  if (!SERPAPI_KEY) return res.status(500).json({ error: 'SERPAPI_KEY not configured' })
  const url = new URL('https://serpapi.com/search.json')
  url.searchParams.set('engine', 'google_flights')
  url.searchParams.set('departure_id', origin.toUpperCase())
  url.searchParams.set('arrival_id', destCode)
  url.searchParams.set('outbound_date', outbound)
  url.searchParams.set('return_date', inbound)
  url.searchParams.set('type', '1')
  url.searchParams.set('currency', 'USD')
  url.searchParams.set('api_key', SERPAPI_KEY)

  try {
    const r = await fetch(url.toString())
    const data = await r.json()

    if (data.error) {
      console.error('[flights] SerpApi error:', data.error)
      return res.status(502).json({ error: data.error })
    }

    const allFlights = [...(data.best_flights || []), ...(data.other_flights || [])]
    const validFlights = allFlights.filter(f => typeof f.price === 'number' && f.price > 0)

    if (validFlights.length === 0) {
      return res.json({ price: null, airlines: [], airlineLogo: null, totalDuration: null,
        isDirect: null, layovers: [],
        route: `${origin.toUpperCase()} → ${destCode}`, dates: { outbound, inbound } })
    }

    // Prefer direct flights; fall back to single-stop with ≤4 h layover
    const MAX_LAYOVER_MIN = 240
    const directFlights = validFlights.filter(f => (f.flights || []).length <= 1)
    const oneStopFlights = validFlights.filter(f => {
      if ((f.flights || []).length !== 2) return false
      return (f.layovers || []).every(l => l.duration <= MAX_LAYOVER_MIN)
    })
    const candidates = directFlights.length > 0 ? directFlights : oneStopFlights

    if (candidates.length === 0) {
      return res.json({ price: null, airlines: [], airlineLogo: null, totalDuration: null,
        isDirect: null, layovers: [],
        route: `${origin.toUpperCase()} → ${destCode}`, dates: { outbound, inbound } })
    }

    const cheapest = candidates.reduce((a, b) => a.price < b.price ? a : b)
    const segments = cheapest.flights || []
    const airlines = [...new Set(segments.map(s => s.airline).filter(Boolean))]
    const isDirect = segments.length <= 1
    const layovers = (cheapest.layovers || []).map(l => ({
      duration: l.duration,
      name: l.name || null,
      id: l.id || null,
    }))

    res.json({
      price: cheapest.price,
      airlines,
      airlineLogo: cheapest.airline_logo || segments[0]?.airline_logo || null,
      totalDuration: cheapest.total_duration || null,
      isDirect,
      layovers,
      priceInsights: data.price_insights || null,
      route: `${origin.toUpperCase()} → ${destCode}`,
      dates: { outbound, inbound },
    })
  } catch (err) {
    console.error('[flights] fetch error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ─── Hotels: GET /api/hotels ──────────────────────────────────────────────────
// 1. Fetch top-20 popular hotels for the destination (cached 24 h)
// 2. Get rates for all 20 in parallel from Xotelo
// 3. Apply 25% trimmed mean to the per-night prices → excludes hostels + luxury
app.get('/api/hotels', async (req, res) => {
  const { destId, checkin, checkout } = req.query

  if (!destId || !checkin || !checkout) {
    return res.status(400).json({ error: 'Missing required params: destId, checkin, checkout' })
  }

  const meta = DEST_META[destId]
  if (!meta) return res.status(404).json({ error: `Unknown destination: ${destId}` })

  const nights = Math.round((new Date(checkout) - new Date(checkin)) / 86400000)
  if (nights <= 0) return res.status(400).json({ error: 'checkout must be after checkin' })

  let hotelKeys
  try {
    hotelKeys = await getHotelKeys(meta.locationKey, 20)
  } catch (err) {
    console.error('[hotels] list fetch error:', err.message)
    return res.status(502).json({ error: `Could not fetch hotel list: ${err.message}` })
  }

  if (hotelKeys.length === 0) {
    return res.status(502).json({ error: 'No hotels found for destination' })
  }

  // Fetch rates for all hotels in parallel
  const rateResults = await Promise.allSettled(
    hotelKeys.map(async (key) => {
      const url = `https://data.xotelo.com/api/rates?hotel_key=${key}&chk_in=${checkin}&chk_out=${checkout}&currency=USD`
      const r = await fetch(url)
      const data = await r.json()

      if (!data.result?.rates?.length) return null

      // rate field = per-night; take cheapest OTA for this hotel
      const perNightRates = data.result.rates
        .map(e => typeof e.rate === 'number' ? e.rate : parseFloat(e.rate))
        .filter(p => !isNaN(p) && p > 0)

      return perNightRates.length > 0 ? Math.min(...perNightRates) : null
    })
  )

  const perNightPrices = rateResults
    .filter(r => r.status === 'fulfilled' && r.value !== null)
    .map(r => r.value)

  console.log(`[hotels] ${destId}: ${perNightPrices.length}/${hotelKeys.length} hotels returned rates`)
  console.log(`[hotels] per-night range: $${Math.min(...perNightPrices)} – $${Math.max(...perNightPrices)}`)

  if (perNightPrices.length === 0) {
    return res.json({ totalPrice: null, pricePerNight: null, nights,
      hotelsQueried: hotelKeys.length, hotelsUsedInMean: 0 })
  }

  // Trimmed mean on per-night prices (25% each side)
  const trimFraction = 0.25
  const sorted = [...perNightPrices].sort((a, b) => a - b)
  const cut = Math.floor(sorted.length * trimFraction)
  const middle = cut > 0 ? sorted.slice(cut, sorted.length - cut) : sorted
  const trimmedPerNight = Math.round(middle.reduce((a, b) => a + b, 0) / middle.length)
  const totalPrice = trimmedPerNight * nights

  console.log(`[hotels] sorted: [${sorted.map(p => '$' + p).join(', ')}]`)
  console.log(`[hotels] trimmed middle (${middle.length} hotels): $${trimmedPerNight}/night → $${totalPrice} total`)

  res.json({
    totalPrice,
    pricePerNight: trimmedPerNight,
    nights,
    hotelsQueried: hotelKeys.length,
    hotelsWithRates: perNightPrices.length,
    hotelsUsedInMean: middle.length,
    priceRange: { low: sorted[0], high: sorted[sorted.length - 1] },
    trimmedRange: { low: middle[0], high: middle[middle.length - 1] },
  })
})

// ─── Airport lookup: GET /api/airport?code=SFO ────────────────────────────────
// Resolves IATA code → { city, country }. Dataset fetched once and cached in memory.
let airportIndex = null // { [IATA]: { city, country } }
async function getAirportIndex() {
  if (airportIndex) return airportIndex
  const url = 'https://raw.githubusercontent.com/mwgg/Airports/master/airports.json'
  const r = await fetch(url)
  const data = await r.json()
  const idx = {}
  for (const a of Object.values(data)) {
    if (a.iata && a.city) idx[a.iata.toUpperCase()] = { city: a.city, country: a.country || '' }
  }
  airportIndex = idx
  return idx
}

app.get('/api/airport', async (req, res) => {
  const code = (req.query.code || '').toString().toUpperCase()
  if (!/^[A-Z]{3}$/.test(code)) return res.status(400).json({ error: 'Invalid IATA code' })
  try {
    const idx = await getAirportIndex()
    const hit = idx[code]
    if (!hit) return res.status(404).json({ error: `Unknown airport code: ${code}` })
    res.json(hit)
  } catch (err) {
    console.error('[airport] lookup error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/api/ping', (_, res) => res.json({ ok: true }))

app.listen(PORT, () => {
  console.log(`[wayfarer-api] running on http://localhost:${PORT}`)
  if (!SERPAPI_KEY) console.warn('[wayfarer-api] WARNING: SERPAPI_KEY not set')
})
