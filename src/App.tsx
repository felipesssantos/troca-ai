import { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import AuthPage from '@/pages/Auth'
import ProfileSetup from '@/pages/ProfileSetup'
import Album from '@/pages/Album'
import Community from '@/pages/Community'
import UserAlbum from '@/pages/UserAlbum'
import Trades from '@/pages/Trades'
import Header from '@/components/Header'

function AlbumWrapper() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [checkingProfile, setCheckingProfile] = useState(true)

  useEffect(() => {
    if (!user) return

    const checkProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .single()

        if (error || !data?.username) {
          navigate('/profile/setup')
        }
      } catch (e) {
        console.error(e)
      } finally {
        setCheckingProfile(false)
      }
    }
    checkProfile()
  }, [user, navigate])

  if (checkingProfile) return <div className="flex h-screen items-center justify-center">Verificando álbum...</div>

  return <Album />
}

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
        <Route
          path="/"
          element={
            <PrivateRoute>
              <AlbumWrapper />
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
