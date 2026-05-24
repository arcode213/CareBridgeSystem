import { Outlet, useLocation } from 'react-router-dom';
import { useBranding } from '../context/BrandingContext';

const AuthLayout = () => {
  const location = useLocation();
  const isHospitalReg = location.pathname === '/register/hospital';
  const { effective } = useBranding();
  const name = effective.platformName || 'CareBridge';
  const logoUrl = effective.logoUrl;
  const primary = effective.primaryColor || '#2563eb';
  const accent = effective.accentColor || '#06b6d4';

  const panelGradient = {
    background: `linear-gradient(135deg, ${primary} 0%, ${primary}dd 45%, #0f172a 100%)`,
  };

  return (
    <div className="min-h-screen flex w-full">
      <div
        className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 text-white overflow-hidden"
        style={panelGradient}
      >
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div
            className="absolute -top-24 -left-24 w-96 h-96 rounded-full opacity-20 blur-3xl"
            style={{ backgroundColor: accent }}
          />
          <div className="absolute bottom-[-10%] left-10 w-80 h-80 rounded-full opacity-20 blur-3xl" style={{ backgroundColor: primary }} />
        </div>

        <div className="z-10 relative">
          {logoUrl ? (
            <img src={logoUrl} alt={name} className="h-14 max-w-[240px] object-contain" />
          ) : (
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-xl text-white flex items-center justify-center text-xl font-black shadow-xl"
                style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
              >
                {name.charAt(0).toUpperCase()}
              </div>
              <span className="text-2xl font-bold tracking-tight">{name}</span>
            </div>
          )}
        </div>

        <div className="z-10 relative mt-auto mb-20 space-y-6">
          <h1 className="text-5xl font-extrabold leading-tight tracking-tight">
            Seamless Referrals.
            <br />
            <span style={{ color: accent }}>Better Outcomes.</span>
          </h1>
          <p className="text-white/80 text-lg max-w-lg leading-relaxed">
            Join Pakistan&apos;s premier digital referral management platform. Connect with top consultants and leading
            hospitals to ensure every patient gets the care they deserve.
          </p>
        </div>

        <div className="z-10 relative text-sm text-white/60 font-medium tracking-wide">
          &copy; {new Date().getFullYear()} {name}. All rights reserved.
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center bg-white overflow-y-auto relative">
        <div className={`w-full mx-auto px-6 py-12 lg:px-12 xl:px-20 ${isHospitalReg ? 'max-w-4xl' : 'max-w-xl'}`}>
          <div className="flex lg:hidden items-center justify-center gap-3 mb-8">
            {logoUrl ? (
              <img src={logoUrl} alt={name} className="h-10 object-contain" />
            ) : (
              <>
                <div
                  className="w-10 h-10 rounded-xl text-white flex items-center justify-center font-black shadow-lg"
                  style={{ backgroundColor: primary }}
                >
                  {name.charAt(0).toUpperCase()}
                </div>
                <span className="text-xl font-bold tracking-tight text-slate-900">{name}</span>
              </>
            )}
          </div>

          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
