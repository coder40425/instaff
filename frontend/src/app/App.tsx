import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
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
import PartnerVerification from './features/admin/PartnerVerification';
import AdminAnalytics from './features/admin/AdminAnalytics';
import PendingWorkers from './features/admin/PendingWorkers';
import WorkerManagement from './features/admin/WorkerManagement';
import BookingManagement from './features/admin/BookingManagement';
import ComplaintManagement from './features/admin/ComplaintManagement';
import AdminWallets from './features/admin/AdminWallets';
import AdminPaymentSettings from './features/admin/AdminPaymentSettings';

// ── CRM / Operations (new) ──────────────────────────────────────────────────
import CrmOverview from './features/admin/crm/CrmOverview';
import CrmRequirements from './features/admin/crm/CrmRequirements';
import CrmRequirementDetails from './features/admin/crm/CrmRequirementDetails';

import EmployerPortal from './features/employer/EmployerPortal';
import PartnerDashboard from './features/partner/PartnerDashboard';
import PartnerProfile from './features/partner/PartnerProfile';
import PartnerWorkers from './features/partner/PartnerWorkers';
import PartnerRequirements from './features/partner/PartnerRequirements';
import PartnerAssignments from './features/partner/PartnerAssignments';
import PartnerLayout from './layouts/PartnerLayout';
import { partnerService } from './services/partnerApi';
import { Card, CardContent } from './components/ui/card';
import { Button } from './components/ui/button';

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

function ApprovedPartnerRoute({ children }: { children: React.ReactNode }) {
  const { data: profile, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['partner-profile'],
    queryFn: partnerService.getProfile,
  });

  if (isLoading) {
    return (
      <PartnerLayout>
        <Card><CardContent className="py-12 text-center text-neutral-500">Checking Partner approval…</CardContent></Card>
      </PartnerLayout>
    );
  }

  if (isError || !profile) {
    return (
      <PartnerLayout>
        <Card className="mx-auto max-w-xl border-red-200 dark:border-red-900">
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <p className="font-medium">Unable to verify Partner approval</p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {(error as any)?.response?.data?.message || (error as Error)?.message || 'Please try again.'}
            </p>
            <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>Retry</Button>
          </CardContent>
        </Card>
      </PartnerLayout>
    );
  }

  if (profile.status !== 'APPROVED') {
    return (
      <PartnerLayout>
        <Card className="mx-auto max-w-xl border-amber-200 bg-amber-50/70 dark:border-amber-900 dark:bg-amber-950/20">
          <CardContent className="py-10 text-center">
            <h1 className="text-lg font-semibold">Partner approval required</h1>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
              Operational features are unavailable while your Partner status is {profile.status.toLowerCase()}. You can review your status on your profile.
            </p>
          </CardContent>
        </Card>
      </PartnerLayout>
    );
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
      <Route path="/admin/partners" element={<ProtectedRoute allowedRoles={['ADMIN']}><PartnerVerification /></ProtectedRoute>} />
      <Route path="/admin/analytics" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminAnalytics /></ProtectedRoute>} />
      <Route path="/admin/workers/pending" element={<ProtectedRoute allowedRoles={['ADMIN']}><PendingWorkers /></ProtectedRoute>} />
      <Route path="/admin/workers" element={<ProtectedRoute allowedRoles={['ADMIN']}><WorkerManagement /></ProtectedRoute>} />
      <Route path="/admin/bookings" element={<ProtectedRoute allowedRoles={['ADMIN']}><BookingManagement /></ProtectedRoute>} />
      <Route path="/admin/complaints" element={<ProtectedRoute allowedRoles={['ADMIN']}><ComplaintManagement /></ProtectedRoute>} />
      <Route path="/admin/wallets" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminWallets /></ProtectedRoute>} />
      <Route path="/admin/payment-settings" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminPaymentSettings /></ProtectedRoute>} />

      {/* ── CRM / Operations routes (new) ── */}
      <Route path="/admin/crm" element={<ProtectedRoute allowedRoles={['ADMIN']}><CrmOverview /></ProtectedRoute>} />
      <Route path="/admin/crm/requirements" element={<ProtectedRoute allowedRoles={['ADMIN']}><CrmRequirements /></ProtectedRoute>} />
      <Route path="/admin/crm/requirements/:id" element={<ProtectedRoute allowedRoles={['ADMIN']}><CrmRequirementDetails /></ProtectedRoute>} />

      <Route path="/employer" element={<EmployerPortal />} />

      <Route path="/partner" element={<ProtectedRoute allowedRoles={['PARTNER']}><PartnerDashboard /></ProtectedRoute>} />
      <Route path="/partner/profile" element={<ProtectedRoute allowedRoles={['PARTNER']}><PartnerProfile /></ProtectedRoute>} />
      <Route path="/partner/workers" element={<ProtectedRoute allowedRoles={['PARTNER']}><ApprovedPartnerRoute><PartnerWorkers /></ApprovedPartnerRoute></ProtectedRoute>} />
      <Route path="/partner/requirements" element={<ProtectedRoute allowedRoles={['PARTNER']}><ApprovedPartnerRoute><PartnerRequirements /></ApprovedPartnerRoute></ProtectedRoute>} />
      <Route path="/partner/requirements/create" element={<ProtectedRoute allowedRoles={['PARTNER']}><ApprovedPartnerRoute><CreateRequirementPage /></ApprovedPartnerRoute></ProtectedRoute>} />
      <Route path="/partner/requirements/:id" element={<ProtectedRoute allowedRoles={['PARTNER']}><ApprovedPartnerRoute><RequirementDetailsPage /></ApprovedPartnerRoute></ProtectedRoute>} />
      <Route path="/partner/assignments" element={<ProtectedRoute allowedRoles={['PARTNER']}><ApprovedPartnerRoute><PartnerAssignments /></ApprovedPartnerRoute></ProtectedRoute>} />

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
