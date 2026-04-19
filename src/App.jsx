import { Routes, Route, NavLink, useNavigate } from 'react-router-dom'
import { AppProvider, useApp } from './AppContext'
import Compare from './pages/Compare'
import Itinerary from './pages/Itinerary'
import { Map, List, Globe } from 'lucide-react'

function Header() {
  const { activeTrip, trips } = useApp()
  const activeCity = trips.find(t => t.id === activeTrip)

  return (
    <header className="bg-white border-b border-stone-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="text-indigo-600" size={22} />
          <span className="font-semibold text-lg tracking-tight text-stone-900">Wayfarer</span>
        </div>
        <nav className="flex items-center gap-1">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100'
              }`
            }
          >
            <List size={15} />
            Compare
          </NavLink>
          <NavLink
            to="/itinerary"
            className={({ isActive }) =>
              `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100'
              }`
            }
          >
            <Map size={15} />
            Itinerary
            {activeCity && (
              <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full">
                {activeCity.city}
              </span>
            )}
          </NavLink>
        </nav>
      </div>
    </header>
  )
}

function AppInner() {
  return (
    <div className="min-h-screen bg-stone-50">
      <Header />
      <main className="max-w-6xl mx-auto px-6 py-8">
        <Routes>
          <Route path="/" element={<Compare />} />
          <Route path="/itinerary" element={<Itinerary />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  )
}
