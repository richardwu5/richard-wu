import { createContext, useContext, useState } from 'react'
import { INITIAL_STATE } from './store'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [state, setState] = useState(INITIAL_STATE)

  const addTrip = (trip) =>
    setState(s => ({ ...s, trips: [...s.trips, trip] }))

  const removeTrip = (id) =>
    setState(s => ({ ...s, trips: s.trips.filter(t => t.id !== id) }))

  const updateTrip = (id, patch) =>
    setState(s => ({
      ...s,
      trips: s.trips.map(t => t.id === id ? { ...t, ...patch } : t),
    }))

  const setActiveTrip = (id) =>
    setState(s => ({ ...s, activeTrip: id }))

  const addSpotToWishlist = (tripId, spot) =>
    setState(s => ({
      ...s,
      wishlist: {
        ...s.wishlist,
        [tripId]: [...(s.wishlist[tripId] || []), spot],
      },
    }))

  const removeSpotFromWishlist = (tripId, spotId) =>
    setState(s => ({
      ...s,
      wishlist: {
        ...s.wishlist,
        [tripId]: (s.wishlist[tripId] || []).filter(sp => sp.id !== spotId),
      },
      // also remove from itinerary days
      itinerary: {
        ...s.itinerary,
        [tripId]: (s.itinerary[tripId] || []).map(day => ({
          ...day,
          spotIds: day.spotIds.filter(id => id !== spotId),
        })),
      },
    }))

  const updateSpot = (tripId, spotId, patch) =>
    setState(s => ({
      ...s,
      wishlist: {
        ...s.wishlist,
        [tripId]: (s.wishlist[tripId] || []).map(sp =>
          sp.id === spotId ? { ...sp, ...patch } : sp
        ),
      },
    }))

  const addDay = (tripId) => {
    const days = state.itinerary[tripId] || []
    const lastDate = days.length > 0
      ? new Date(days[days.length - 1].date)
      : new Date(state.trips.find(t => t.id === tripId)?.dates?.from || Date.now())
    const nextDate = new Date(lastDate)
    nextDate.setDate(nextDate.getDate() + 1)
    const newDay = {
      id: `day-${Date.now()}`,
      date: nextDate.toISOString().slice(0, 10),
      label: `Day ${days.length + 1}`,
      neighborhoods: [],
      spotIds: [],
    }
    setState(s => ({
      ...s,
      itinerary: {
        ...s.itinerary,
        [tripId]: [...(s.itinerary[tripId] || []), newDay],
      },
    }))
  }

  const addSpotToDay = (tripId, dayId, spotId) =>
    setState(s => ({
      ...s,
      itinerary: {
        ...s.itinerary,
        [tripId]: (s.itinerary[tripId] || []).map(day =>
          day.id === dayId && !day.spotIds.includes(spotId)
            ? { ...day, spotIds: [...day.spotIds, spotId] }
            : day
        ),
      },
    }))

  const removeSpotFromDay = (tripId, dayId, spotId) =>
    setState(s => ({
      ...s,
      itinerary: {
        ...s.itinerary,
        [tripId]: (s.itinerary[tripId] || []).map(day =>
          day.id === dayId
            ? { ...day, spotIds: day.spotIds.filter(id => id !== spotId) }
            : day
        ),
      },
    }))

  const updateDay = (tripId, dayId, patch) =>
    setState(s => ({
      ...s,
      itinerary: {
        ...s.itinerary,
        [tripId]: (s.itinerary[tripId] || []).map(day =>
          day.id === dayId ? { ...day, ...patch } : day
        ),
      },
    }))

  return (
    <AppContext.Provider value={{
      ...state,
      addTrip, removeTrip, updateTrip, setActiveTrip,
      addSpotToWishlist, removeSpotFromWishlist, updateSpot,
      addDay, addSpotToDay, removeSpotFromDay, updateDay,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
