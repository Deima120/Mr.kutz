/**
 * Tarjeta de sección para las pantallas de perfil del cliente
 * (`features/profile/pages/ProfilePage.jsx` y `features/loyalty/pages/ClientLoyaltyPage.jsx`),
 * fuera de `AdminLayout` — mismo envoltorio visual en ambas, para que se lean
 * como una sola experiencia en vez de dos maquetas distintas.
 */
export default function ProfileCard({ title, hint, children, className = '' }) {
  return (
    <div
      className={`rounded-2xl border border-stone-100 bg-white p-5 shadow-card transition-all duration-300 hover:shadow-card-hover ${className}`}
    >
      <div className="mb-4 flex items-center justify-between border-b border-stone-100 pb-3">
        <h3 className="text-base font-bold text-stone-850">{title}</h3>
        {hint && (
          <span className="text-xs font-bold uppercase tracking-wider text-stone-400">{hint}</span>
        )}
      </div>
      {children}
    </div>
  );
}
