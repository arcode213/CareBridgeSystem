import { Outlet, useLocation } from 'react-router-dom';
import { Activity } from 'lucide-react';

const AuthLayout = () => {
  const location = useLocation();
  const isHospitalReg = location.pathname === '/register/hospital';

  return (
    <div className="min-h-screen flex w-full">
      {/* Left side: Branding / Visual (Hidden on small screens) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-700 via-blue-800 to-slate-900 relative flex-col justify-between p-12 text-white overflow-hidden">
        {/* Abstract background shapes */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-blue-500 opacity-20 blur-3xl"></div>
          <div className="absolute top-1/2 right-[-10%] w-3/4 h-3/4 rounded-full bg-teal-400 opacity-10 blur-3xl"></div>
          <div className="absolute bottom-[-10%] left-10 w-80 h-80 rounded-full bg-indigo-500 opacity-20 blur-3xl"></div>
        </div>
        
        <div className="z-10 relative">
          <div className="flex items-center gap-3">
            <div className="bg-white p-2.5 rounded-xl text-blue-700 shadow-xl">
              <Activity size={28} strokeWidth={2.5} />
            </div>
            <span className="text-2xl font-bold tracking-tight">CareBridge<span className="text-blue-300">Health</span></span>
          </div>
        </div>

        <div className="z-10 relative mt-auto mb-20 space-y-6">
          <h1 className="text-5xl font-extrabold leading-tight tracking-tight">
            Seamless Referrals.<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-teal-200">
              Better Outcomes.
            </span>
          </h1>
          <p className="text-blue-100 text-lg max-w-lg leading-relaxed">
            Join Pakistan's premier digital referral management platform. Connect with top consultants and leading hospitals to ensure every patient gets the care they deserve.
          </p>
        </div>

        <div className="z-10 relative text-sm text-blue-200/80 font-medium tracking-wide">
          &copy; {new Date().getFullYear()} CareBridge Health Pakistan. All rights reserved.
        </div>
      </div>

      {/* Right side: Form / Content */}
      <div className="flex-1 flex flex-col justify-center bg-white overflow-y-auto relative">
        <div className={`w-full mx-auto px-6 py-12 lg:px-12 xl:px-20 ${isHospitalReg ? 'max-w-4xl' : 'max-w-xl'}`}>
          {/* Mobile branding header */}
          <div className="flex lg:hidden items-center justify-center gap-3 mb-8">
            <div className="bg-blue-600 p-2.5 rounded-xl text-white shadow-lg">
              <Activity size={24} />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">CareBridge<span className="text-blue-600">Health</span></span>
          </div>

          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
