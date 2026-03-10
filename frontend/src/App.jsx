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
import AppointmentsPage from './pages/appointments/AppointmentsPage';
import AppointmentFormPage from './pages/appointments/AppointmentFormPage';
import PaymentsPage from './pages/payments/PaymentsPage';
import PaymentFormPage from './pages/payments/PaymentFormPage';
import InventoryPage from './pages/inventory/InventoryPage';
import ProductFormPage from './pages/inventory/ProductFormPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<HomePage />} />
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
            <ProtectedRoute allowedRoles={['admin', 'barber']}>
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
            <ProtectedRoute allowedRoles={['admin', 'barber']}>
              <ClientFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="services"
          element={
            <ProtectedRoute allowedRoles={['admin', 'barber']}>
              <ServicesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="services/new"
          element={
            <ProtectedRoute allowedRoles={['admin', 'barber']}>
              <ServiceFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="services/:id/edit"
          element={
            <ProtectedRoute allowedRoles={['admin', 'barber']}>
              <ServiceFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="barbers"
          element={
            <ProtectedRoute allowedRoles={['admin', 'barber']}>
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
            <ProtectedRoute allowedRoles={['admin', 'barber']}>
              <AppointmentFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="payments"
          element={
            <ProtectedRoute allowedRoles={['admin', 'barber']}>
              <PaymentsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="payments/new"
          element={
            <ProtectedRoute allowedRoles={['admin', 'barber']}>
              <PaymentFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="inventory"
          element={
            <ProtectedRoute allowedRoles={['admin', 'barber']}>
              <InventoryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="inventory/new"
          element={
            <ProtectedRoute allowedRoles={['admin', 'barber']}>
              <ProductFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="inventory/:id/edit"
          element={
            <ProtectedRoute allowedRoles={['admin', 'barber']}>
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
