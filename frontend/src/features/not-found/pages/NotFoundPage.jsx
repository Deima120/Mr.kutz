import { Link, useNavigate } from 'react-router-dom';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full panel-card p-8 sm:p-10 text-center">
        <div className="h-1.5 w-full bg-gradient-to-r from-gold-dark via-gold to-gold-light -mt-8 -mx-8 sm:-mt-10 sm:-mx-10 mb-8" aria-hidden />
        <p className="text-gold text-xs font-semibold tracking-widest mb-2">
          Error 404
        </p>
        <h1 className="font-serif text-3xl sm:text-4xl text-stone-900 font-medium mb-3">
          Página no encontrada
        </h1>
        <p className="text-stone-600 text-sm mb-8">
          La página que buscas no existe o fue movida. Revisa el enlace o vuelve
          al inicio.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn-outline py-2.5 px-5 text-sm"
          >
            Volver
          </button>
          <Link
            to="/"
            className="btn-dark py-2.5 px-5 text-sm inline-flex items-center justify-center"
          >
            Ir al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
