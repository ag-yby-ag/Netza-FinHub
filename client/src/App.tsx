import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { ToastProvider } from './components/ui/Toast';
import { LoadingSkeleton } from './components/ui/LoadingSkeleton';
import { AuthProvider } from './contexts/AuthProvider';
import { useAuth } from './hooks/useAuth';

/* ── Lazy-loaded pages ──────────────────────────────────────── */

const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const SuppliersPage = lazy(() => import('./pages/SuppliersPage'));
const SupplierDetailPage = lazy(() => import('./pages/SupplierDetailPage'));
const UploadPage = lazy(() => import('./pages/UploadPage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));

/* ── Error Boundary ─────────────────────────────────────────── */

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#F7F7F7] dark:bg-[#0D0D0D]">
          <div className="text-center">
            <h1 className="mb-2 font-['Space_Grotesk'] text-2xl font-bold text-[#0D0D0D] dark:text-white">
              Algo deu errado
            </h1>
            <p className="mb-4 font-['Plus_Jakarta_Sans'] text-sm text-[#737373]">
              {this.state.error?.message ?? 'Erro inesperado'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="rounded-full bg-[#6DED67] px-6 py-2.5 font-['Plus_Jakarta_Sans'] text-sm font-semibold text-[#0D0D0D] transition-colors hover:bg-[#5CCB56]"
            >
              Recarregar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ── Page loading fallback ──────────────────────────────────── */

const PageLoader: React.FC = () => (
  <div className="space-y-6">
    <LoadingSkeleton variant="text" width="40%" height={32} />
    <div className="grid grid-cols-3 gap-4">
      <LoadingSkeleton variant="card" />
      <LoadingSkeleton variant="card" />
      <LoadingSkeleton variant="card" />
    </div>
  </div>
);

/* ── Protected App (inside AuthProvider) ────────────────────── */

const ProtectedApp: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F7F7] dark:bg-[#0D0D0D]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#E5E5E5] border-t-[#6DED67]" />
          <p className="font-['Plus_Jakarta_Sans'] text-sm text-[#737373]">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Suspense fallback={<div />}>
        <LoginPage />
      </Suspense>
    );
  }

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Suspense fallback={<PageLoader />}><DashboardPage /></Suspense>} />
        <Route path="suppliers" element={<Suspense fallback={<PageLoader />}><SuppliersPage /></Suspense>} />
        <Route path="suppliers/:id" element={<Suspense fallback={<PageLoader />}><SupplierDetailPage /></Suspense>} />
        <Route path="upload" element={<Suspense fallback={<PageLoader />}><UploadPage /></Suspense>} />
        <Route path="search" element={<Suspense fallback={<PageLoader />}><SearchPage /></Suspense>} />
        <Route path="reports" element={<Suspense fallback={<PageLoader />}><ReportsPage /></Suspense>} />
        <Route path="settings" element={<Suspense fallback={<PageLoader />}><SettingsPage /></Suspense>} />
      </Route>
    </Routes>
  );
};

/* ── App ────────────────────────────────────────────────────── */

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <ProtectedApp />
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
};

export default App;
