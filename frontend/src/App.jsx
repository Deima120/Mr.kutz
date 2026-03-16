/**
 * Componente raíz de la aplicación
 * Configura rutas principales
 */

import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ClientsPage from './pages/clients/ClientsPage';
import ClientDetailPage from './pages/clients/ClientDetailPage';
import ClientFormPage from './pages/clients/ClientFormPage';
import ServicesPage from './pages/services/ServicesPage';
import ServiceFormPage from './pages/services/ServiceFormPage';
import BarbersPage from './pages/barbers/BarbersPage';
import BarberFormPage from './pages/barbers/BarberFormPage';
import BarberSchedulesPage from './pages/barbers/BarberSchedulesPage';
import AppointmentsPage from './pages/appointments/AppointmentsPage';
import AppointmentFormPage from './pages/appointments/AppointmentFormPage';
import PaymentsPage from './pages/payments/PaymentsPage';
import PaymentFormPage from './pages/payments/PaymentFormPage';
import InventoryPage from './pages/inventory/InventoryPage';
import ProductFormPage from './pages/inventory/ProductFormPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import AgendaPage from './pages/agenda/AgendaPage';
import HistoryPage from './pages/history/HistoryPage';
import ReportsPage from './pages/reports/ReportsPage';
import SettingsPage from './pages/settings/SettingsPage';
import TestimonialsPage from './pages/testimonials/TestimonialsPage';
import TestimonialFormPage from './pages/testimonials/TestimonialFormPage';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';

function HomeOrRedirect() {
  const { user, isAuthenticated } = useAuth();
  if (isAuthenticated && (user?.role === 'admin' || user?.role === 'barber')) {
    return <Navigate to="/dashboard" replace />;
  }
  return <HomePage />;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<HomeOrRedirect />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
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
          path="inventory/:id/edit"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <ProductFormPage />
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
        <Route
          path="testimonials/new"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <TestimonialFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="testimonials/:id/edit"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <TestimonialFormPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
