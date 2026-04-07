/**
 * Captura errores de render en React y evita pantalla en blanco.
 */

import { Component } from 'react';
import { Link } from 'react-router-dom';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary:', error, info);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center px-4 py-16">
          <div className="max-w-md w-full panel-card p-8 text-center">
            <p className="text-gold text-xs font-semibold tracking-widest uppercase mb-2">Algo salió mal</p>
            <h1 className="font-serif text-2xl text-stone-900 mb-3">No pudimos mostrar esta vista</h1>
            <p className="text-stone-600 text-sm mb-6">
              Recarga la página o vuelve al inicio. Si el problema continúa, contacta al administrador.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="btn-dark py-2.5 px-5 text-sm"
              >
                Recargar
              </button>
              <Link to="/" className="btn-outline py-2.5 px-5 text-sm inline-flex items-center justify-center">
                Ir al inicio
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
