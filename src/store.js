import { useState, useCallback } from 'react'

// Shared app state via React context — no external state lib needed for MVP

export const INITIAL_STATE = {
  // Phase 1: destination comparison
  trips: [
    {
      id: 'tokyo',
      city: 'Tokyo',
      country: 'Japan',
      airport: 'NRT',
      emoji: '🗼',
      dates: { from: '2026-10-10', to: '2026-10-17' },
      flightPrice: 890,
      hotelPricePerNight: 180,
      nights: 7,
      currency: 'USD',
      bestSeason: 'Sep–Nov',
      weather: 'Mild, 18–24°C',
      notes: '',
    },
    {
      id: 'lisbon',
      city: 'Lisbon',
      country: 'Portugal',
      airport: 'LIS',
      emoji: '🏛️',
      dates: { from: '2026-10-10', to: '2026-10-17' },
      flightPrice: 620,
      hotelPricePerNight: 140,
      nights: 7,
      currency: 'USD',
      bestSeason: 'Apr–Oct',
      weather: 'Warm, 22–28°C',
      notes: '',
    },
    {
      id: 'mexico-city',
      city: 'Mexico City',
      country: 'Mexico',
      airport: 'MEX',
      emoji: '🌮',
      dates: { from: '2026-10-10', to: '2026-10-17' },
      flightPrice: 420,
      hotelPricePerNight: 120,
      nights: 7,
      currency: 'USD',
      bestSeason: 'Oct–Apr',
      weather: 'Dry season, 19–25°C',
      notes: '',
    },
  ],

  // Phase 2: itinerary for the chosen destination
  activeTrip: null,

  // Wishlist pool — spots added by either planner
  wishlist: {
    tokyo: [
      { id: 'w1', name: 'Ichiran Ramen Shibuya', type: 'restaurant', cuisine: 'Japanese', neighborhood: 'Shibuya', lat: 35.6595, lng: 139.7004, rating: 4.7, addedBy: 'you', reservationRequired: true, reserved: false, source: 'AI', notes: '' },
      { id: 'w2', name: 'Narisawa', type: 'restaurant', cuisine: 'Modern Japanese', neighborhood: 'Minami-Aoyama', lat: 35.6692, lng: 139.7167, rating: 4.9, addedBy: 'wife', reservationRequired: true, reserved: true, source: 'IG', notes: 'Wife found on @tokyofoodie' },
      { id: 'w3', name: 'Senso-ji Temple', type: 'activity', cuisine: null, neighborhood: 'Asakusa', lat: 35.7148, lng: 139.7967, rating: 4.8, addedBy: 'you', reservationRequired: false, reserved: false, source: 'AI', notes: '' },
      { id: 'w4', name: 'Tsukiji Outer Market', type: 'activity', cuisine: null, neighborhood: 'Tsukiji', lat: 35.6654, lng: 139.7707, rating: 4.6, addedBy: 'wife', reservationRequired: false, reserved: false, source: 'website', notes: '' },
      { id: 'w5', name: 'Sushi Saito', type: 'restaurant', cuisine: 'Sushi', neighborhood: 'Minato', lat: 35.6728, lng: 139.7394, rating: 5.0, addedBy: 'you', reservationRequired: true, reserved: false, source: 'AI', notes: 'Very hard to get reservation' },
      { id: 'w6', name: 'teamLab Borderless', type: 'activity', cuisine: null, neighborhood: 'Odaiba', lat: 35.6262, lng: 139.7750, rating: 4.8, addedBy: 'wife', reservationRequired: true, reserved: true, source: 'IG', notes: 'Tickets booked for Oct 12' },
      { id: 'w7', name: 'Yakitori Alley (Yurakucho)', type: 'restaurant', cuisine: 'Yakitori', neighborhood: 'Yurakucho', lat: 35.6750, lng: 139.7630, rating: 4.5, addedBy: 'you', reservationRequired: false, reserved: false, source: 'blog', notes: '' },
      { id: 'w8', name: 'Shinjuku Gyoen', type: 'activity', cuisine: null, neighborhood: 'Shinjuku', lat: 35.6851, lng: 139.7100, rating: 4.7, addedBy: 'wife', reservationRequired: false, reserved: false, source: 'website', notes: '' },
    ],
    lisbon: [],
    'mexico-city': [],
  },

  // Itinerary days
  itinerary: {
    tokyo: [
      {
        id: 'day1',
        date: '2026-10-10',
        label: 'Day 1',
        neighborhoods: ['Asakusa', 'Tsukiji'],
        spotIds: ['w3', 'w4'],
      },
      {
        id: 'day2',
        date: '2026-10-11',
        label: 'Day 2',
        neighborhoods: ['Shibuya', 'Minami-Aoyama'],
        spotIds: ['w1', 'w2'],
      },
      {
        id: 'day3',
        date: '2026-10-12',
        label: 'Day 3',
        neighborhoods: ['Odaiba', 'Yurakucho'],
        spotIds: ['w6', 'w7'],
      },
    ],
    lisbon: [],
    'mexico-city': [],
  },
}
