import { lazy, Suspense } from 'react'

// three.js is heavy; the room loads after the shell paints.
const Room = lazy(() => import('./components/Room.jsx'))

export default function App() {
  return (
    <Suspense fallback={<div className="loading" role="status">warming up the room…</div>}>
      <Room />
    </Suspense>
  )
}
