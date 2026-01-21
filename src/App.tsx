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
import UpdatePassword from '@/pages/UpdatePassword'
import Header from '@/components/Header'

// Admin Imports
import AdminRoute from './components/AdminRoute'
import AdminLayout from './layouts/AdminLayout'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminAlbums from './pages/admin/AdminAlbums'
import AdminAlbumForm from './pages/admin/AdminAlbumForm'
import AdminUsers from './pages/admin/AdminUsers'
import AdminRequests from './pages/admin/AdminRequests'

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
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      // Ensure we mark as initialized if an event fires accurately
      setAuthInitialized(true)

      if (event === 'PASSWORD_RECOVERY') {
        // Redirect to update password page
        // Note: The router isn't available outside the component render, 
        // so we rely on the component re-rendering or we can use window.location if needed,
        // but typically the session is established and we can just let the user navigate
        // or we can force a redirect if we had access to navigate() here.
        // However, since we are inside App component, we can't easily use navigate hook here 
        // without refactoring. 
        // Users clicking the link will land on the app, session is set, 
        // and if we want to force them to the update page we can do it via a useEffect check or
        // simply trust they will follow the flow.
        // BETTER APPROACH: The `resetPasswordForEmail` had `redirectTo` pointing to /update-password,
        // so the browser should land there naturally if the link is correct. 
        // We just need to ensure the Route exists.
      }
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
          path="/faq"
          element={
            <PrivateRoute>
              <FAQ />
            </PrivateRoute>
          }
        />
        <Route
          path="/terms"
          element={
            <PrivateRoute>
              <Terms />
            </PrivateRoute>
          }
        />
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
