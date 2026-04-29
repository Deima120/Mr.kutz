/**
 * Componente raiz de la aplicacion.
 * Envuelve las rutas con Suspense y ErrorBoundary.
 */

import { createElement, Suspense } from 'react';
import ErrorBoundary from '@/shared/components/ErrorBoundary';
import AppRoutes from './routes.js';

function RouteFallback() {
  return createElement(
    'div',
    { className: 'min-h-[40vh] flex items-center justify-center text-stone-500' },
    'Cargando...'
  );
}

function App() {
  return createElement(
    Suspense,
    { fallback: createElement(RouteFallback) },
    createElement(ErrorBoundary, null, createElement(AppRoutes))
  );
}

export default App;
