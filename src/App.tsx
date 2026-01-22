import { useEffect, useState } from 'react'
// Main App Component
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import AuthPage from '@/pages/Auth'
import ProfileSetup from '@/pages/ProfileSetup'
import MyStores from '@/pages/MyStores'
import StoreForm from '@/pages/StoreForm'
import Album from '@/pages/Album'
import Community from '@/pages/Community'
import Dashboard from '@/pages/Dashboard'
import UserAlbum from '@/pages/UserAlbum'
import Trades from '@/pages/Trades'
import Premium from '@/pages/Premium'
import FAQ from '@/pages/FAQ'
import Terms from '@/pages/Terms'
import Privacy from '@/pages/Privacy'
import UpdatePassword from '@/pages/UpdatePassword'
import LandingPage from '@/pages/Landing'
import Header from '@/components/Header'

// Admin Imports
import AdminRoute from './components/AdminRoute'
import AdminLayout from './layouts/AdminLayout'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminAlbums from './pages/admin/AdminAlbums'
import AdminAlbumForm from './pages/admin/AdminAlbumForm'
import AdminUsers from './pages/admin/AdminUsers'
import AdminRequests from './pages/admin/AdminRequests'

import PublicLayout from './layouts/PublicLayout'

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

function HomeDispatcher() {
  const host = window.location.hostname
  const isApp = host.startsWith('app.')

  if (isApp) {
    return <Navigate to="/dashboard" replace />
  }

  return <LandingPage />
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
        <Route
          path="/my-stores"
          element={
            <PrivateRoute>
              <MyStores />
            </PrivateRoute>
          }
        />
        <Route
          path="/my-stores/:id"
          element={
            <PrivateRoute>
              <StoreForm />
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
            <Route path="requests" element={<AdminRequests />} />
            <Route path="users" element={<AdminUsers />} />
          </Route>
        </Route>

        {/* User Area */}
        <Route
          path="/"
          element={<HomeDispatcher />}
        />
        <Route
          path="/dashboard"
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
          path="/premium"
          element={
            <PrivateRoute>
              <Premium />
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

        {/* Public Pages Layout */}
        <Route element={<PublicLayout />}>
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/faq" element={<FAQ />} />
        </Route>

        <Route
          path="/update-password"
          element={
            <PrivateRoute>
              <UpdatePassword />
            </PrivateRoute>
          }
        />
      </Routes>
    </Router>
  )
}

export default App
