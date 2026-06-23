import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom'
import PageNotFound from './lib/PageNotFound'
import { AuthProvider, useAuth } from '@/lib/AuthContext'
import ScrollToTop from './components/ScrollToTop'
import ProtectedRoute from '@/components/ProtectedRoute'
// Add page imports here
import Layout from '@/components/Layout'
import Dashboard from '@/pages/Dashboard'
import CriarViagem from '@/pages/CriarViagem'
import ViagemDetail from '@/pages/ViagemDetail'
import MinhasViagens from '@/pages/MinhasViagens'
import Aprovacoes from '@/pages/Aprovacoes'
import AdminPanel from '@/pages/AdminPanel'
import Configuracoes from '@/pages/Configuracoes'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import ForgotPassword from '@/pages/ForgotPassword'
import ResetPassword from '@/pages/ResetPassword'
import MFASetup from '@/pages/MFASetup'
import MFAVerify from '@/pages/MFAVerify';

const AuthenticatedApp = () => {
  const { loading, authError } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    console.error(authError);
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/mfa-verify" element={<MFAVerify />} />
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/viagens" element={<MinhasViagens />} />
          <Route path="/viagens/nova" element={<CriarViagem />} />
          <Route path="/viagens/:id" element={<ViagemDetail />} />
          <Route path="/aprovacoes" element={<Aprovacoes />} />
          <Route path="/mfa-setup" element={<MFASetup />} />
          <Route
            element={
              <ProtectedRoute
                unauthenticatedElement={<Navigate to="/login" replace />}
                unauthorizedElement={<Navigate to="/" replace />}
                allowedRoles={["gestor", "financeiro", "admin"]}
              />
            }
          >
            <Route path="/configuracoes" element={<Configuracoes />} />
          </Route>
          <Route
            element={
              <ProtectedRoute
                unauthenticatedElement={<Navigate to="/login" replace />}
                unauthorizedElement={<Navigate to="/" replace />}
                allowedRoles={["admin"]}
              />
            }
          >
            <Route path="/admin" element={<AdminPanel />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <ScrollToTop />
          <AuthenticatedApp />
          <Toaster />
        </QueryClientProvider>
      </AuthProvider>
    </Router>
  )
}

export default App
