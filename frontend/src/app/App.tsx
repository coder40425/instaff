import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { Toaster } from './components/ui/sonner';
import { AuthProvider, useAuth } from './hooks/useAuth';

import LandingPage from './features/landing/LandingPage';
import LoginPage from './features/auth/LoginPage';
import RegisterPage from './features/auth/RegisterPage';

import CustomerDashboard from './features/customer/CustomerDashboard';
import CustomerHome from './features/customer/CustomerHome';
import WorkerDetailsPage from './features/customer/WorkerDetailsPage';
import CreateBookingPage from './features/customer/CreateBookingPage';
import CreateRequirementPage from './features/customer/CreateRequirementPage';
import RequirementDetailsPage from './features/customer/RequirementDetailsPage';
import MyBookingsPage from './features/customer/MyBookingsPage';
import CustomerProfile from './features/customer/CustomerProfile';
import ComplaintsPage from './features/customer/ComplaintsPage';
import MapTracking from './features/customer/MapTracking';
import PaymentsPage from './features/customer/PaymentsPage';

import WorkerDashboard from './features/worker/WorkerDashboard';
import WorkerProfile from './features/worker/WorkerProfile';
import WorkerBookings from './features/worker/WorkerBookings';
import WorkerLocation from './features/worker/WorkerLocation';
import WorkerEarnings from './features/worker/WorkerEarnings';

import AdminDashboard from './features/admin/AdminDashboard';
import AdminAnalytics from './features/admin/AdminAnalytics';
import PendingWorkers from './features/admin/PendingWorkers';
import WorkerManagement from './features/admin/WorkerManagement';
import BookingManagement from './features/admin/BookingManagement';
import ComplaintManagement from './features/admin/ComplaintManagement';
import AdminWallets from './features/admin/AdminWallets';
import AdminPaymentSettings from './features/admin/AdminPaymentSettings';

import EmployerPortal from './features/employer/EmployerPortal';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: (failureCount, error: any) => {
        if (error?.response?.status === 401) return false;
        return failureCount < 1;
      },
    },
  },
});

function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles?: string[];
}) {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth/login" element={<LoginPage />} />
      <Route path="/auth/register" element={<RegisterPage />} />

      <Route path="/customer" element={<ProtectedRoute allowedRoles={['CUSTOMER']}><CustomerDashboard /></ProtectedRoute>} />
      <Route path="/customer/home" element={<ProtectedRoute allowedRoles={['CUSTOMER']}><CustomerHome /></ProtectedRoute>} />
      <Route path="/workers/:id" element={<ProtectedRoute allowedRoles={['CUSTOMER']}><WorkerDetailsPage /></ProtectedRoute>} />
      <Route path="/booking/create" element={<ProtectedRoute allowedRoles={['CUSTOMER']}><CreateBookingPage /></ProtectedRoute>} />
      <Route path="/customer/requirements/new" element={<ProtectedRoute allowedRoles={['CUSTOMER']}><CreateRequirementPage /></ProtectedRoute>} />
      <Route path="/customer/requirements/:id" element={<ProtectedRoute allowedRoles={['CUSTOMER']}><RequirementDetailsPage /></ProtectedRoute>} />
      <Route path="/customer/bookings" element={<ProtectedRoute allowedRoles={['CUSTOMER']}><MyBookingsPage /></ProtectedRoute>} />
      <Route path="/customer/profile" element={<ProtectedRoute allowedRoles={['CUSTOMER']}><CustomerProfile /></ProtectedRoute>} />
      <Route path="/customer/complaints" element={<ProtectedRoute allowedRoles={['CUSTOMER']}><ComplaintsPage /></ProtectedRoute>} />
      <Route path="/customer/tracking" element={<ProtectedRoute allowedRoles={['CUSTOMER']}><MapTracking /></ProtectedRoute>} />
      <Route path="/customer/payments" element={<ProtectedRoute allowedRoles={['CUSTOMER']}><PaymentsPage /></ProtectedRoute>} />

      <Route path="/worker" element={<ProtectedRoute allowedRoles={['WORKER']}><WorkerDashboard /></ProtectedRoute>} />
      <Route path="/worker/profile" element={<ProtectedRoute allowedRoles={['WORKER']}><WorkerProfile /></ProtectedRoute>} />
      <Route path="/worker/bookings" element={<ProtectedRoute allowedRoles={['WORKER']}><WorkerBookings /></ProtectedRoute>} />
      <Route path="/worker/location" element={<ProtectedRoute allowedRoles={['WORKER']}><WorkerLocation /></ProtectedRoute>} />
      <Route path="/worker/earnings" element={<ProtectedRoute allowedRoles={['WORKER']}><WorkerEarnings /></ProtectedRoute>} />

      <Route path="/admin" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/analytics" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminAnalytics /></ProtectedRoute>} />
      <Route path="/admin/workers/pending" element={<ProtectedRoute allowedRoles={['ADMIN']}><PendingWorkers /></ProtectedRoute>} />
      <Route path="/admin/workers" element={<ProtectedRoute allowedRoles={['ADMIN']}><WorkerManagement /></ProtectedRoute>} />
      <Route path="/admin/bookings" element={<ProtectedRoute allowedRoles={['ADMIN']}><BookingManagement /></ProtectedRoute>} />
      <Route path="/admin/complaints" element={<ProtectedRoute allowedRoles={['ADMIN']}><ComplaintManagement /></ProtectedRoute>} />
      <Route path="/admin/wallets" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminWallets /></ProtectedRoute>} />
      <Route path="/admin/payment-settings" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminPaymentSettings /></ProtectedRoute>} />

      <Route path="/employer" element={<EmployerPortal />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <AppRoutes />
            <Toaster />
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}