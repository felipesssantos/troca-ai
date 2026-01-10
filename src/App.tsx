import { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import AuthPage from '@/pages/Auth'
import ProfileSetup from '@/pages/ProfileSetup'
import Album from '@/pages/Album'

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
          navigate('/profile-setup')
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
  return <>{children}</>
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
          path="/profile-setup"
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
      </Routes>
    </Router>
  )
}

export default App
