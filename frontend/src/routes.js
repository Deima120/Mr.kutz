/**
 * Configuracion de rutas principales con React Router.
 */

import { createElement, lazy } from 'react';
import { Navigate, useRoutes } from 'react-router-dom';
import MainLayout from '@/shared/components/layout/MainLayout';
import ProtectedRoute from '@/shared/components/ProtectedRoute';
import { useAuth } from '@/shared/contexts/AuthContext';

const HomePage = lazy(() => import('@/features/home/pages/HomePage'));
const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage'));
const RegisterPage = lazy(() => import('@/features/auth/pages/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('@/features/auth/pages/ForgotPasswordPage'));
const ClientsPage = lazy(() => import('@/features/clients/pages/ClientsPage'));
const ClientDetailPage = lazy(() => import('@/features/clients/pages/ClientDetailPage'));
const ClientFormPage = lazy(() => import('@/features/clients/pages/ClientFormPage'));
const ServicesPage = lazy(() => import('@/features/services/pages/ServicesPage'));
const ServiceFormPage = lazy(() => import('@/features/services/pages/ServiceFormPage'));
const BarbersPage = lazy(() => import('@/features/barbers/pages/BarbersPage'));
const BarberFormPage = lazy(() => import('@/features/barbers/pages/BarberFormPage'));
const BarberSchedulesPage = lazy(() => import('@/features/barbers/pages/BarberSchedulesPage'));
const AppointmentsPage = lazy(() => import('@/features/appointments/pages/AppointmentsPage'));
const AppointmentFormPage = lazy(() => import('@/features/appointments/pages/AppointmentFormPage'));
const PaymentsPage = lazy(() => import('@/features/payments/pages/PaymentsPage'));
const PaymentFormPage = lazy(() => import('@/features/payments/pages/PaymentFormPage'));
const InventoryPage = lazy(() => import('@/features/inventory/pages/InventoryPage'));
const ProductFormPage = lazy(() => import('@/features/inventory/pages/ProductFormPage'));
const ProductCategoriesPage = lazy(() => import('@/features/inventory/pages/ProductCategoriesPage'));
const DashboardPage = lazy(() => import('@/features/dashboard/pages/DashboardPage'));
const AgendaPage = lazy(() => import('@/features/agenda/pages/AgendaPage'));
const HistoryPage = lazy(() => import('@/features/history/pages/HistoryPage'));
const ReportsPage = lazy(() => import('@/features/reports/pages/ReportsPage'));
const SettingsPage = lazy(() => import('@/features/settings/pages/SettingsPage'));
const TestimonialsPage = lazy(() => import('@/features/testimonials/pages/TestimonialsPage'));
const ProfilePage = lazy(() => import('@/features/profile/pages/ProfilePage'));
const PurchasesPage = lazy(() => import('@/features/purchases/pages/PurchasesPage'));
const NotFoundPage = lazy(() => import('@/features/not-found/pages/NotFoundPage'));
const BookingPage = lazy(() => import('@/features/booking/pages/BookingPage'));

function HomeOrRedirect() {
  const { user, isAuthenticated } = useAuth();

  if (isAuthenticated && (user?.role === 'admin' || user?.role === 'barber')) {
    return createElement(Navigate, { to: '/dashboard', replace: true });
  }

  return createElement(HomePage);
}

function page(Component) {
  return createElement(Component);
}

function protectedPage(Component, allowedRoles) {
  return createElement(
    ProtectedRoute,
    { allowedRoles },
    createElement(Component)
  );
}

export default function AppRoutes() {
  return useRoutes([
    {
      path: '/',
      element: createElement(MainLayout),
      children: [
        { index: true, element: createElement(HomeOrRedirect) },
        { path: 'login', element: page(LoginPage) },
        { path: 'register', element: page(RegisterPage) },
        { path: 'forgot-password', element: page(ForgotPasswordPage) },
        { path: 'reservar', element: page(BookingPage) },
        { path: 'clients', element: protectedPage(ClientsPage, ['admin', 'barber']) },
        { path: 'clients/new', element: protectedPage(ClientFormPage, ['admin']) },
        { path: 'clients/:id', element: protectedPage(ClientDetailPage, ['admin', 'barber']) },
        { path: 'clients/:id/edit', element: protectedPage(ClientFormPage, ['admin']) },
        { path: 'services', element: protectedPage(ServicesPage, ['admin']) },
        { path: 'services/new', element: protectedPage(ServiceFormPage, ['admin']) },
        { path: 'services/:id/edit', element: protectedPage(ServiceFormPage, ['admin']) },
        { path: 'barbers', element: protectedPage(BarbersPage, ['admin']) },
        { path: 'barbers/new', element: protectedPage(BarberFormPage, ['admin']) },
        { path: 'barbers/:id/schedules', element: protectedPage(BarberSchedulesPage, ['admin']) },
        { path: 'barbers/:id/edit', element: protectedPage(BarberFormPage, ['admin']) },
        { path: 'appointments', element: protectedPage(AppointmentsPage, ['admin', 'barber', 'client']) },
        { path: 'appointments/new', element: protectedPage(AppointmentFormPage, ['admin', 'barber', 'client']) },
        { path: 'appointments/:id/edit', element: protectedPage(AppointmentFormPage, ['admin', 'barber', 'client']) },
        { path: 'payments', element: protectedPage(PaymentsPage, ['admin']) },
        { path: 'purchases', element: protectedPage(PurchasesPage, ['admin']) },
        { path: 'sales', element: protectedPage(PaymentsPage, ['admin']) },
        { path: 'payments/new', element: protectedPage(PaymentFormPage, ['admin']) },
        { path: 'inventory', element: protectedPage(InventoryPage, ['admin']) },
        { path: 'inventory/new', element: protectedPage(ProductFormPage, ['admin']) },
        { path: 'inventory/categories', element: protectedPage(ProductCategoriesPage, ['admin']) },
        { path: 'inventory/:id/edit', element: protectedPage(ProductFormPage, ['admin']) },
        { path: 'profile', element: protectedPage(ProfilePage, ['client']) },
        { path: 'dashboard', element: protectedPage(DashboardPage, ['admin', 'barber']) },
        { path: 'agenda', element: protectedPage(AgendaPage, ['barber']) },
        { path: 'history', element: protectedPage(HistoryPage, ['barber']) },
        { path: 'reports', element: protectedPage(ReportsPage, ['admin']) },
        { path: 'settings', element: protectedPage(SettingsPage, ['admin']) },
        { path: 'testimonials', element: protectedPage(TestimonialsPage, ['admin']) },
        { path: '*', element: page(NotFoundPage) },
      ],
    },
  ]);
}
