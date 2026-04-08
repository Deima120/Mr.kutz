/**
 * Componente raíz de la aplicación
 * Configura rutas principales
 */

import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import { useAuth } from './context/AuthContext';

const HomePage = lazy(() => import('./pages/HomePage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const ClientsPage = lazy(() => import('./pages/clients/ClientsPage'));
const ClientDetailPage = lazy(() => import('./pages/clients/ClientDetailPage'));
const ClientFormPage = lazy(() => import('./pages/clients/ClientFormPage'));
const ServicesPage = lazy(() => import('./pages/services/ServicesPage'));
const ServiceFormPage = lazy(() => import('./pages/services/ServiceFormPage'));
const BarbersPage = lazy(() => import('./pages/barbers/BarbersPage'));
const BarberFormPage = lazy(() => import('./pages/barbers/BarberFormPage'));
const BarberSchedulesPage = lazy(() => import('./pages/barbers/BarberSchedulesPage'));
const AppointmentsPage = lazy(() => import('./pages/appointments/AppointmentsPage'));
const AppointmentFormPage = lazy(() => import('./pages/appointments/AppointmentFormPage'));
const PaymentsPage = lazy(() => import('./pages/payments/PaymentsPage'));
const PaymentFormPage = lazy(() => import('./pages/payments/PaymentFormPage'));
const InventoryPage = lazy(() => import('./pages/inventory/InventoryPage'));
const ProductFormPage = lazy(() => import('./pages/inventory/ProductFormPage'));
const ProductCategoriesPage = lazy(() => import('./pages/inventory/ProductCategoriesPage'));
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'));
const AgendaPage = lazy(() => import('./pages/agenda/AgendaPage'));
const HistoryPage = lazy(() => import('./pages/history/HistoryPage'));
const ReportsPage = lazy(() => import('./pages/reports/ReportsPage'));
const SettingsPage = lazy(() => import('./pages/settings/SettingsPage'));
const TestimonialsPage = lazy(() => import('./pages/testimonials/TestimonialsPage'));
const ProfilePage = lazy(() => import('./pages/profile/ProfilePage'));
const PurchasesPage = lazy(() => import('./pages/purchases/PurchasesPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));

function HomeOrRedirect() {
  const { user, isAuthenticated } = useAuth();
  if (isAuthenticated && (user?.role === 'admin' || user?.role === 'barber')) {
    return <Navigate to="/dashboard" replace />;
  }
  return <HomePage />;
}

function RouteFallback() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center text-stone-500">
      Cargando...
    </div>
  );
}

function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <ErrorBoundary>
        <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<HomeOrRedirect />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="forgot-password" element={<ForgotPasswordPage />} />
          <Route
            path="clients"
            element={
              <ProtectedRoute allowedRoles={['admin', 'barber']}>
                <ClientsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="clients/new"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <ClientFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="clients/:id"
            element={
              <ProtectedRoute allowedRoles={['admin', 'barber']}>
                <ClientDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="clients/:id/edit"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <ClientFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="services"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <ServicesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="services/new"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <ServiceFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="services/:id/edit"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <ServiceFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="barbers"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <BarbersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="barbers/new"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <BarberFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="barbers/:id/schedules"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <BarberSchedulesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="barbers/:id/edit"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <BarberFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="appointments"
            element={
              <ProtectedRoute allowedRoles={['admin', 'barber', 'client']}>
                <AppointmentsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="appointments/new"
            element={
              <ProtectedRoute allowedRoles={['admin', 'barber', 'client']}>
                <AppointmentFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="payments"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <PaymentsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="purchases"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <PurchasesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="sales"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <PaymentsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="payments/new"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <PaymentFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="inventory"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <InventoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="inventory/new"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <ProductFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="inventory/categories"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <ProductCategoriesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="inventory/:id/edit"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <ProductFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="profile"
            element={
              <ProtectedRoute allowedRoles={['client']}>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="dashboard"
            element={
              <ProtectedRoute allowedRoles={['admin', 'barber']}>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="agenda"
            element={
              <ProtectedRoute allowedRoles={['barber']}>
                <AgendaPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="history"
            element={
              <ProtectedRoute allowedRoles={['barber']}>
                <HistoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="reports"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <ReportsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="settings"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <SettingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="testimonials"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <TestimonialsPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
        </Routes>
      </ErrorBoundary>
    </Suspense>
  );
}

export default App;
