import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { ToastProvider } from '@/components/ui/Toast';
import Layout from '@/components/Layout';
import Home from '@/pages/Home';
import Login from '@/pages/Login';
import Products from '@/pages/Products';
import Cashier from '@/pages/Cashier';
import Wholesale from '@/pages/Wholesale';
import Projects from '@/pages/Projects';
import Suppliers from '@/pages/Suppliers';
import Purchase from '@/pages/Purchase';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-300">{title}</h2>
        <p className="text-slate-500 mt-2">功能开发中...</p>
      </div>
    </div>
  );
}

export default function App() {
  const { initializeAuth } = useAuthStore();

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  return (
    <ToastProvider>
      <Router>
        <Routes>
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Products />} />
          <Route path="/cashier" element={<Cashier />} />
          <Route path="/wholesale" element={<Wholesale />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/suppliers" element={<Suppliers />} />
          <Route path="/purchase" element={<Purchase />} />
        </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ToastProvider>
  );
}
