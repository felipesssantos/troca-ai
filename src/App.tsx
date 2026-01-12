import { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import AuthPage from '@/pages/Auth'
import ProfileSetup from '@/pages/ProfileSetup'
import Album from '@/pages/Album'
import Community from '@/pages/Community'
import UserAlbum from '@/pages/UserAlbum'
import Trades from '@/pages/Trades'
import Dashboard from '@/pages/Dashboard'
import Header from '@/components/Header'

// Admin Imports
import AdminRoute from './components/AdminRoute'
import AdminLayout from './layouts/AdminLayout'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminAlbums from './pages/admin/AdminAlbums'
import AdminAlbumForm from './pages/admin/AdminAlbumForm'
import AdminUsers from './pages/admin/AdminUsers'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { session } = useAuthStore()
  if (!session) return <Navigate to="/auth" replace />
  return (
    <>
      <Header />
      <div className="pt-4">
        {children}
      </div>
    </>
  )
}

function App() {
  const { setSession } = useAuthStore()
  const [authInitialized, setAuthInitialized] = useState(false)

  useEffect(() => {
    // 1. Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setAuthInitialized(true)
    })

    // 2. Listen for changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      // Ensure we mark as initialized if an event fires accurately
      setAuthInitialized(true)
    })

    return () => subscription.unsubscribe()
  }, [setSession])

  if (!authInitialized) {
    return <div className="flex h-screen items-center justify-center">Carregando troca.ai...</div>
  }

  return (
    <Router>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route
          path="/profile/setup"
          element={
            <PrivateRoute>
              <ProfileSetup />
            </PrivateRoute>
          }
        />
        {/* Admin Area */}
        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="albums" element={<AdminAlbums />} />
            <Route path="albums/new" element={<AdminAlbumForm />} />
            <Route path="albums/edit/:id" element={<AdminAlbumForm />} />
            <Route path="users" element={<AdminUsers />} />
          </Route>
        </Route>

        {/* User Area */}
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/album/:albumId"
          element={
            <PrivateRoute>
              <Album />
            </PrivateRoute>
          }
        />
        <Route
          path="/community"
          element={
            <PrivateRoute>
              <Community />
            </PrivateRoute>
          }
        />
        <Route
          path="/user/:username"
          element={
            <PrivateRoute>
              <UserAlbum />
            </PrivateRoute>
          }
        />
        <Route
          path="/trades"
          element={
            <PrivateRoute>
              <Trades />
            </PrivateRoute>
          }
        />
      </Routes>
    </Router>
  )
}

export default App
