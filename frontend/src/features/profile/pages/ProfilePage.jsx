import { Link } from 'react-router-dom';
import { useAuth } from '@/shared/contexts/AuthContext';

function safeDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function ProfilePage() {
  const { user } = useAuth();

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() || 'Cliente';
  const initial = fullName.charAt(0).toUpperCase();

  return (
    <div className="min-h-[70vh] bg-stone-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="max-w-4xl mx-auto">
          <p className="section-label text-gold">Mi cuenta</p>
          <h1 className="font-serif text-3xl sm:text-4xl text-stone-900 font-medium tracking-tight mb-2">
            Mi perfil
          </h1>
          <p className="text-stone-500 mb-8">
            Gestiona tu información y accede rápido a tus acciones principales.
          </p>

          <div className="grid lg:grid-cols-3 gap-6">
            <section className="panel-card lg:col-span-2">
              <div className="flex flex-wrap items-center gap-4 mb-6">
                <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-barber-dark text-gold text-xl font-semibold">
                  {initial}
                </span>
                <div>
                  <p className="text-xs tracking-widest text-stone-500">Cliente</p>
                  <p className="font-serif text-2xl text-stone-900 font-medium">{fullName}</p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="rounded-xl border border-stone-200 bg-white px-4 py-3">
                  <p className="text-xs tracking-wider text-stone-500 mb-1">Correo</p>
                  <p className="text-stone-800">{user?.email || '—'}</p>
                </div>
                <div className="rounded-xl border border-stone-200 bg-white px-4 py-3">
                  <p className="text-xs tracking-wider text-stone-500 mb-1">Teléfono</p>
                  <p className="text-stone-800">{user?.phone || '—'}</p>
                </div>
                <div className="rounded-xl border border-stone-200 bg-white px-4 py-3">
                  <p className="text-xs tracking-wider text-stone-500 mb-1">Rol</p>
                  <p className="text-stone-800 capitalize">{user?.role || '—'}</p>
                </div>
                <div className="rounded-xl border border-stone-200 bg-white px-4 py-3">
                  <p className="text-xs tracking-wider text-stone-500 mb-1">Miembro desde</p>
                  <p className="text-stone-800">{safeDate(user?.createdAt)}</p>
                </div>
              </div>
            </section>

            <aside className="panel-card-soft">
              <h2 className="font-serif text-xl text-stone-900 font-medium mb-4">Acciones rápidas</h2>
              <div className="space-y-3">
                <Link to="/appointments/new" className="btn-dark w-full text-center">
                  Agendar cita
                </Link>
                <Link to="/appointments" className="btn-outline w-full text-center">
                  Ver mis citas
                </Link>
                <Link to="/#satisfaccion" className="btn-outline w-full text-center">
                  Ver satisfacción
                </Link>
              </div>
              <p className="text-xs text-stone-500 mt-4">
                Pronto añadiremos edición de perfil y preferencias.
              </p>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
