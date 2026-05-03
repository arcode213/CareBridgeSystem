import { Outlet } from 'react-router-dom';
import { Activity } from 'lucide-react';

const AuthLayout = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg border border-slate-100">
        <div className="flex flex-col items-center">
          <div className="bg-blue-600 p-3 rounded-full text-white mb-4 shadow-md">
            <Activity size={32} />
          </div>
          <h2 className="mt-2 text-center text-3xl font-extrabold text-slate-900">
            CareBridge Health
          </h2>
          <p className="mt-2 text-center text-sm text-slate-600">
            Digital Referral Management Platform
          </p>
        </div>
        <Outlet />
      </div>
    </div>
  );
};

export default AuthLayout;
