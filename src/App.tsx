import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './lib/auth';
import { supabase } from './lib/supabase';
import { Layout } from './components/layout';
import { LoginPage } from './pages/login';
import { HomePage } from './pages/home';
import { MovementsPage } from './pages/movements';
import { InventoryPage } from './pages/inventory';
import { ExportPage } from './pages/export';
import { ImportPage } from './pages/import';
import { AddProductPage } from './pages/add-product';

const queryClient = new QueryClient();

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Vérifier la session au chargement
    const checkSession = async () => {
      try {
        await supabase.auth.getSession();
      } catch (error) {
        console.error('Error checking session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E72C63] mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return session ? <>{children}</> : <Navigate to="/login" />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<HomePage />} />
        <Route path="movements" element={<MovementsPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="add-product" element={<AddProductPage />} />
        <Route path="export" element={<ExportPage />} />
        <Route path="import" element={<ImportPage />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <div className="min-h-screen bg-gray-100">
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </div>
  );
}