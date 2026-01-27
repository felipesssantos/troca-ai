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
import Inbox from '@/pages/Inbox'
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

function AuthDispatcher() {
  const host = window.location.hostname
  const isLanding = !host.startsWith('app.') && host !== 'localhost'

  if (isLanding) {
    window.location.href = `https://app.trocaai.net/auth${window.location.search}`
    return null
  }

  return <AuthPage />
}

function App() {
  const { setSession } = useAuthStore()
  const [authInitialized, setAuthInitialized] = useState(false)

  useEffect(() => {
    const checkUserStatus = async (session: any) => {
      if (!session?.user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_blocked')
        .eq('id', session.user.id)
        .single()

      if (profile?.is_blocked) {
        await supabase.auth.signOut()
        alert('Sua conta foi suspensa por violar os termos de uso. Entre em contato com o suporte.')
        setSession(null)
        window.location.href = '/'
      } else {
        setSession(session)
      }
    }

    // 1. Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        checkUserStatus(session).then(() => setAuthInitialized(true))
      } else {
        setSession(null)
        setAuthInitialized(true)
      }
    })

    // 2. Listen for changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        checkUserStatus(session)
      } else {
        setSession(null)
      }
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
        <Route path="/auth" element={<AuthDispatcher />} />
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
        <Route
          path="/inbox"
          element={
            <PrivateRoute>
              <Inbox />
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
