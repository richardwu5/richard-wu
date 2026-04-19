import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import { useEffect } from 'react'
import L from 'leaflet'

// Fix default marker icon for Vite
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const RESTAURANT_ICON = L.divIcon({
  html: `<div style="background:#6366f1;color:white;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 6px rgba(0,0,0,0.3);border:2px solid white;">🍽️</div>`,
  className: '',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
})

const ACTIVITY_ICON = L.divIcon({
  html: `<div style="background:#f59e0b;color:white;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 6px rgba(0,0,0,0.3);border:2px solid white;">📍</div>`,
  className: '',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
})

const SELECTED_ICON = L.divIcon({
  html: `<div style="background:#ef4444;color:white;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 2px 8px rgba(0,0,0,0.4);border:2px solid white;">⭐</div>`,
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
})

function FitBounds({ spots }) {
  const map = useMap()
  useEffect(() => {
    if (spots.length === 0) return
    const bounds = L.latLngBounds(spots.map(s => [s.lat, s.lng]))
    map.fitBounds(bounds, { padding: [40, 40] })
  }, [spots.map(s => s.id).join(',')])
  return null
}

export default function TripMap({ spots, highlightedSpotIds = [] }) {
  if (spots.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-stone-100 rounded-2xl text-stone-400 text-sm">
        No spots to display
      </div>
    )
  }

  const center = [spots[0].lat, spots[0].lng]

  return (
    <MapContainer
      center={center}
      zoom={13}
      style={{ height: '100%', width: '100%' }}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds spots={spots} />
      {spots.map(spot => (
        <Marker
          key={spot.id}
          position={[spot.lat, spot.lng]}
          icon={
            highlightedSpotIds.includes(spot.id)
              ? SELECTED_ICON
              : spot.type === 'restaurant'
              ? RESTAURANT_ICON
              : ACTIVITY_ICON
          }
        >
          <Popup>
            <div className="text-sm">
              <strong>{spot.name}</strong>
              <br />
              <span className="text-stone-500">{spot.neighborhood}</span>
              {spot.rating && (
                <>
                  <br />
                  <span className="text-amber-500">★ {spot.rating}</span>
                </>
              )}
              {spot.reservationRequired && (
                <>
                  <br />
                  <span className={spot.reserved ? 'text-green-600' : 'text-amber-600'}>
                    {spot.reserved ? '✓ Reserved' : '⚠ Needs reservation'}
                  </span>
                </>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
