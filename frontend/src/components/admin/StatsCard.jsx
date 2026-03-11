/**
 * Tarjeta de estadística para dashboard
 */

export default function StatsCard({ label, value, sublabel, variant = 'default', href }) {
  const variants = {
    default: 'bg-white border-gray-200 text-gray-800',
    primary: 'bg-primary-600 border-primary-600 text-white',
  };

  const content = (
    <div className={`rounded-xl border p-6 shadow-sm ${variants[variant] || variants.default}`}>
      <p className={`text-sm font-medium ${variant === 'primary' ? 'text-primary-100' : 'text-gray-500'}`}>
        {label}
      </p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {sublabel && (
        <p className={`text-sm mt-1 ${variant === 'primary' ? 'text-primary-200' : 'text-gray-500'}`}>
          {sublabel}
        </p>
      )}
    </div>
  );

  if (href) {
    return <a href={href} className="block hover:opacity-95 transition-opacity">{content}</a>;
  }
  return content;
}
