import { useBranding } from '../context/BrandingContext';

/** Sidebar / header logo block using current effective branding */
const BrandLogo = ({ size = 'md', className = '' }) => {
  const { effective } = useBranding();
  const name = effective.platformName || 'CareBridge';
  const logoUrl = effective.logoUrl;
  const primary = effective.primaryColor || '#2563eb';

  const box =
    size === 'sm'
      ? 'w-8 h-8 text-xs'
      : size === 'lg'
        ? 'w-12 h-12 text-lg'
        : 'w-9 h-9 text-sm';

  return (
    <div className={`flex items-center gap-2 min-w-0 ${className}`}>
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={name}
          className={`${box} rounded-xl object-contain border border-slate-200 bg-white shrink-0`}
          onError={(e) => {
            e.target.style.display = 'none';
          }}
        />
      ) : (
        <div
          className={`${box} rounded-xl text-white flex items-center justify-center font-black shrink-0`}
          style={{ backgroundColor: primary }}
        >
          {name.charAt(0).toUpperCase()}
        </div>
      )}
      <span className="font-bold truncate" style={{ color: primary }}>
        {name}
      </span>
    </div>
  );
};

export default BrandLogo;
