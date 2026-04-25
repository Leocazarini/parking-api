import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ToastProvider } from './hooks/useToast'
import { Layout } from './components/Layout'

const Login = lazy(() => import('./pages/Login'))
const Yard = lazy(() => import('./pages/Yard'))
const Entry = lazy(() => import('./pages/Entry'))
const Exit = lazy(() => import('./pages/Exit'))
const Subscribers = lazy(() => import('./pages/Subscribers'))
const Financial = lazy(() => import('./pages/Financial'))
const Users = lazy(() => import('./pages/Users'))
const Settings = lazy(() => import('./pages/Settings'))

const qc = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function PageSpinner() {
  return (
    <div style={{
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      gap: 12,
    }}>
      <div className="spinner" />
    </div>
  )
}

function AuthGuard() {
  const { isAuthenticated, isLoading } = useAuth()
  if (isLoading) return <PageSpinner />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return (
    <Layout>
      <Suspense fallback={<PageSpinner />}>
        <Outlet />
      </Suspense>
    </Layout>
  )
}

function AdminGuard() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/yard" replace />
  if (user.role !== 'admin') return <Navigate to="/yard" replace />
  return <Outlet />
}

function AppRoutes() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) return <PageSpinner />

  return (
    <Routes>
      <Route
        path="/login"
        element={
          isAuthenticated ? <Navigate to="/yard" replace /> : (
            <Suspense fallback={<PageSpinner />}>
              <Login />
            </Suspense>
          )
        }
      />

      <Route element={<AuthGuard />}>
        <Route index element={<Navigate to="/yard" replace />} />
        <Route path="/yard"  element={<Yard />} />
        <Route path="/entry" element={<Entry />} />
        <Route path="/exit"  element={<Exit />} />

        <Route element={<AdminGuard />}>
          <Route path="/subscribers" element={<Subscribers />} />
          <Route path="/financial"   element={<Financial />} />
          <Route path="/users"       element={<Users />} />
          <Route path="/settings"    element={<Settings />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/yard" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  )
}
