import { useState, useEffect } from 'react';
import { Navigate, Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../features/auth/AuthContext';
import { Sun, Moon } from 'lucide-react';
import api from '../utils/api';

const linkClass = ({ isActive }) =>
  `flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
    isActive 
      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20 dark:bg-blue-500' 
      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/60'
  }`;

const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // Notification Counters using React Query (Refreshes every 15s)
  const { data: inboxData } = useQuery({
    queryKey: ['hospital-inbox-count'],
    queryFn: async () => {
      const res = await api.get('/referrals/inbox');
      return res.data.data || [];
    },
    enabled: !!user && user.role === 'hospital',
    refetchInterval: 15000,
  });

  const { data: pendingApprovalsData } = useQuery({
    queryKey: ['admin-pending-count'],
    queryFn: async () => {
      const res = await api.get('/admin/users/pending');
      return res.data.data || [];
    },
    enabled: !!user && user.role === 'admin',
    refetchInterval: 15000,
  });

  const inboxCount = inboxData?.length || 0;
  const approvalsCount = pendingApprovalsData?.length || 0;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row transition-colors">
      {/* Mobile top nav */}
      <header className="md:hidden sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 px-4 py-3 flex items-center justify-between dark:bg-slate-900 dark:border-slate-800 transition-colors">
        <span className="font-bold text-blue-600 dark:text-blue-400">CareBridge</span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
            title="Toggle Theme"
          >
            {isDarkMode ? <Sun size={18} className="text-amber-500" /> : <Moon size={18} />}
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="text-sm font-semibold text-red-600 dark:text-red-400"
          >
            Out
          </button>
        </div>
      </header>
      
      {/* Mobile bottom scroll nav */}
      <nav className="md:hidden flex gap-1 overflow-x-auto px-3 py-2 bg-white border-b border-slate-100 scrollbar-hide dark:bg-slate-900 dark:border-slate-800">
        {user.role === 'consultant' && (
          <>
            <NavLink to="/dashboard" className={({ isActive }) => `whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold ${isActive ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-300'}`}>Home</NavLink>
            <NavLink to="/referrals/new" className={({ isActive }) => `whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold ${isActive ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-300'}`}>New</NavLink>
            <NavLink to="/referrals" className={({ isActive }) => `whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold ${isActive ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-300'}`}>List</NavLink>
            <NavLink to="/earnings" className={({ isActive }) => `whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold ${isActive ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-300'}`}>Earn</NavLink>
            <NavLink to="/profile" className={({ isActive }) => `whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold ${isActive ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-300'}`}>Profile</NavLink>
          </>
        )}
        {user.role === 'hospital' && (
          <>
            <NavLink to="/hospital/dashboard" className={({ isActive }) => `whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold ${isActive ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-300'}`}>Home</NavLink>
            <NavLink to="/hospital/emergency" className={({ isActive }) => `whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold ${isActive ? 'bg-red-600 text-white shadow-sm' : 'text-red-500 hover:bg-red-50'}`}>Emergency</NavLink>
            <NavLink to="/hospital/inbox" className={({ isActive }) => `whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 ${isActive ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-300'}`}>
              Inbox
              {inboxCount > 0 && (
                <span className="px-1.5 py-0.5 text-[9px] font-black bg-red-500 text-white rounded-full animate-pulse">
                  {inboxCount}
                </span>
              )}
            </NavLink>
            <NavLink to="/hospital/admissions" className={({ isActive }) => `whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold ${isActive ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-300'}`}>Admit</NavLink>
            <NavLink to="/hospital/ledger" className={({ isActive }) => `whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold ${isActive ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-300'}`}>Ledger</NavLink>
            <NavLink to="/hospital/beds" className={({ isActive }) => `whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold ${isActive ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-300'}`}>Beds</NavLink>
            <NavLink to="/hospital/departments" className={({ isActive }) => `whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold ${isActive ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-300'}`}>Depts</NavLink>
            <NavLink to="/hospital/doctors" className={({ isActive }) => `whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold ${isActive ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-300'}`}>Docs</NavLink>
            <NavLink to="/profile" className={({ isActive }) => `whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold ${isActive ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-300'}`}>Profile</NavLink>
          </>
        )}
        {user.role === 'admin' && (
          <>
            <NavLink to="/admin/overview" className={({ isActive }) => `whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold ${isActive ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-300'}`}>Overview</NavLink>
            <NavLink to="/admin/referrals" className={({ isActive }) => `whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold ${isActive ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-300'}`}>Referrals</NavLink>
            <NavLink to="/admin/beds" className={({ isActive }) => `whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold ${isActive ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-300'}`}>Beds</NavLink>
            <NavLink to="/admin/approvals" className={({ isActive }) => `whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 ${isActive ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-300'}`}>
              Approvals
              {approvalsCount > 0 && (
                <span className="px-1.5 py-0.5 text-[9px] font-black bg-amber-500 text-white rounded-full">
                  {approvalsCount}
                </span>
              )}
            </NavLink>
            <NavLink to="/admin/consultants" className={({ isActive }) => `whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold ${isActive ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-300'}`}>Consultants</NavLink>
            <NavLink to="/admin/hospitals" className={({ isActive }) => `whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold ${isActive ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-300'}`}>Hospitals</NavLink>
            <NavLink to="/admin/payouts" className={({ isActive }) => `whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold ${isActive ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-300'}`}>Payouts</NavLink>
            <NavLink to="/admin/settings" className={({ isActive }) => `whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold ${isActive ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-300'}`}>Setup</NavLink>
            <NavLink to="/admin/audit" className={({ isActive }) => `whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold ${isActive ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-300'}`}>Audit</NavLink>
            <NavLink to="/profile" className={({ isActive }) => `whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold ${isActive ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-300'}`}>Profile</NavLink>
          </>
        )}
      </nav>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 bg-white border-r border-slate-200 flex-col dark:bg-slate-900 dark:border-slate-800 transition-colors">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 transition-colors">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-xl tracking-tight">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center text-sm font-black">CB</div>
            <span>CareBridge</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {user.role === 'consultant' && (
            <>
              <NavLink to="/dashboard" className={linkClass}>
                <span>Dashboard</span>
              </NavLink>
              <NavLink to="/referrals/new" className={linkClass}>
                <span>New referral</span>
              </NavLink>
              <NavLink to="/referrals" className={linkClass}>
                <span>My referrals</span>
              </NavLink>
              <NavLink to="/earnings" className={linkClass}>
                <span>Earnings</span>
              </NavLink>
              <NavLink to="/profile" className={linkClass}>
                <span>Profile settings</span>
              </NavLink>
            </>
          )}

          {user.role === 'hospital' && (
            <>
              <NavLink to="/hospital/dashboard" className={linkClass}>
                <span>Dashboard</span>
              </NavLink>
              <NavLink to="/hospital/emergency" className={({ isActive }) => `flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${isActive ? 'bg-red-600 text-white shadow-md shadow-red-600/20' : 'text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20'}`}>
                <span>Emergency Center</span>
              </NavLink>
              <NavLink to="/hospital/inbox" className={linkClass}>
                <span>Inbox</span>
                {inboxCount > 0 && (
                  <span className="inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-black leading-none bg-red-500 text-white rounded-full animate-pulse shadow-sm">
                    {inboxCount}
                  </span>
                )}
              </NavLink>
              <NavLink to="/hospital/admissions" className={linkClass}>
                <span>Admissions & billing</span>
              </NavLink>
              <NavLink to="/hospital/ledger" className={linkClass}>
                <span>Financial Ledger</span>
              </NavLink>
              <NavLink to="/hospital/beds" className={linkClass}>
                <span>Bed management</span>
              </NavLink>
              <NavLink to="/hospital/departments" className={linkClass}>
                <span>Departments</span>
              </NavLink>
              <NavLink to="/hospital/doctors" className={linkClass}>
                <span>Manage doctors</span>
              </NavLink>
              <NavLink to="/profile" className={linkClass}>
                <span>Profile settings</span>
              </NavLink>
            </>
          )}

          {user.role === 'admin' && (
            <>
              <NavLink to="/admin/overview" className={linkClass}>
                <span>Overview</span>
              </NavLink>
              <NavLink to="/admin/referrals" className={linkClass}>
                <span>Referrals</span>
              </NavLink>
              <NavLink to="/admin/beds" className={linkClass}>
                <span>Bed Management</span>
              </NavLink>
              <NavLink to="/admin/approvals" className={linkClass}>
                <span>Approvals</span>
                {approvalsCount > 0 && (
                  <span className="inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-black leading-none bg-amber-500 text-white rounded-full shadow-sm">
                    {approvalsCount}
                  </span>
                )}
              </NavLink>
              <NavLink to="/admin/consultants" className={linkClass}>
                <span>Consultants</span>
              </NavLink>
              <NavLink to="/admin/hospitals" className={linkClass}>
                <span>Hospitals</span>
              </NavLink>
              <NavLink to="/admin/payouts" className={linkClass}>
                <span>Payouts</span>
              </NavLink>
              <NavLink to="/admin/scoring" className={linkClass}>
                <span>Scoring weights</span>
              </NavLink>
              <NavLink to="/admin/departments" className={linkClass}>
                <span>Departments</span>
              </NavLink>
              <NavLink to="/admin/settings" className={linkClass}>
                <span>Settings</span>
              </NavLink>
              <NavLink to="/admin/audit" className={linkClass}>
                <span>Audit Logs</span>
              </NavLink>
              <NavLink to="/profile" className={linkClass}>
                <span>Profile settings</span>
              </NavLink>
            </>
          )}
        </nav>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800 transition-colors">
          <div className="flex items-center justify-between mb-4 px-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Appearance</span>
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-500 dark:border-slate-800 dark:hover:bg-slate-800 dark:text-slate-400 transition-colors flex items-center gap-1.5 text-xs font-bold"
            >
              {isDarkMode ? (
                <>
                  <Sun size={14} className="text-amber-500" /> Light
                </>
              ) : (
                <>
                  <Moon size={14} /> Dark
                </>
              )}
            </button>
          </div>
          <div className="flex items-center gap-3 px-2 py-2 mb-2">
            <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold text-sm">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{user?.name || 'User'}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate capitalize">{user?.role}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full text-left px-4 py-2.5 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30 rounded-xl text-sm font-semibold transition-colors"
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
