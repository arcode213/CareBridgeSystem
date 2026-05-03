import { Navigate, Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';

const linkClass = ({ isActive }) =>
  `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
    isActive ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' : 'text-slate-600 hover:bg-slate-100'
  }`;

const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Mobile top nav */}
      <header className="md:hidden sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <span className="font-bold text-blue-600">CareBridge</span>
        <button
          type="button"
          onClick={handleLogout}
          className="text-sm font-semibold text-red-600"
        >
          Out
        </button>
      </header>
      <nav className="md:hidden flex gap-1 overflow-x-auto px-3 py-2 bg-white border-b border-slate-100 scrollbar-hide">
        {user.role === 'consultant' && (
          <>
            <NavLink to="/dashboard" className={({ isActive }) => `whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold ${isActive ? 'bg-blue-600 text-white' : 'text-slate-600'}`}>Home</NavLink>
            <NavLink to="/referrals/new" className={({ isActive }) => `whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold ${isActive ? 'bg-blue-600 text-white' : 'text-slate-600'}`}>New</NavLink>
            <NavLink to="/referrals" className={({ isActive }) => `whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold ${isActive ? 'bg-blue-600 text-white' : 'text-slate-600'}`}>List</NavLink>
            <NavLink to="/earnings" className={({ isActive }) => `whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold ${isActive ? 'bg-blue-600 text-white' : 'text-slate-600'}`}>Earn</NavLink>
          </>
        )}
        {user.role === 'hospital' && (
          <>
            <NavLink to="/hospital/dashboard" className={({ isActive }) => `whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold ${isActive ? 'bg-blue-600 text-white' : 'text-slate-600'}`}>Home</NavLink>
            <NavLink to="/hospital/inbox" className={({ isActive }) => `whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold ${isActive ? 'bg-blue-600 text-white' : 'text-slate-600'}`}>Inbox</NavLink>
            <NavLink to="/hospital/admissions" className={({ isActive }) => `whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold ${isActive ? 'bg-blue-600 text-white' : 'text-slate-600'}`}>Admit</NavLink>
            <NavLink to="/hospital/beds" className={({ isActive }) => `whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold ${isActive ? 'bg-blue-600 text-white' : 'text-slate-600'}`}>Beds</NavLink>
          </>
        )}
        {user.role === 'admin' && (
          <>
            <NavLink to="/admin/overview" className={({ isActive }) => `whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold ${isActive ? 'bg-blue-600 text-white' : 'text-slate-600'}`}>Overview</NavLink>
            <NavLink to="/admin/approvals" className={({ isActive }) => `whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold ${isActive ? 'bg-blue-600 text-white' : 'text-slate-600'}`}>Approvals</NavLink>
            <NavLink to="/admin/scoring" className={({ isActive }) => `whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold ${isActive ? 'bg-blue-600 text-white' : 'text-slate-600'}`}>Scoring</NavLink>
            <NavLink to="/admin/departments" className={({ isActive }) => `whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold ${isActive ? 'bg-blue-600 text-white' : 'text-slate-600'}`}>Depts</NavLink>
            <NavLink to="/admin/payouts" className={({ isActive }) => `whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold ${isActive ? 'bg-blue-600 text-white' : 'text-slate-600'}`}>Payouts</NavLink>
            <NavLink to="/admin/settings" className={({ isActive }) => `whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold ${isActive ? 'bg-blue-600 text-white' : 'text-slate-600'}`}>Settings</NavLink>
          </>
        )}
      </nav>

      <aside className="hidden md:flex w-64 shrink-0 bg-white border-r border-slate-200 flex-col">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-2 text-blue-600 font-bold text-xl tracking-tight">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center text-sm font-black">CB</div>
            <span>CareBridge</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {user.role === 'consultant' && (
            <>
              <NavLink to="/dashboard" className={linkClass}>Dashboard</NavLink>
              <NavLink to="/referrals/new" className={linkClass}>New referral</NavLink>
              <NavLink to="/referrals" className={linkClass}>My referrals</NavLink>
              <NavLink to="/earnings" className={linkClass}>Earnings</NavLink>
            </>
          )}

          {user.role === 'hospital' && (
            <>
              <NavLink to="/hospital/dashboard" className={linkClass}>Dashboard</NavLink>
              <NavLink to="/hospital/inbox" className={linkClass}>Inbox</NavLink>
              <NavLink to="/hospital/admissions" className={linkClass}>Admissions & billing</NavLink>
              <NavLink to="/hospital/beds" className={linkClass}>Bed management</NavLink>
            </>
          )}

          {user.role === 'admin' && (
            <>
              <NavLink to="/admin/overview" className={linkClass}>Overview</NavLink>
              <NavLink to="/admin/approvals" className={linkClass}>Approvals</NavLink>
              <NavLink to="/admin/scoring" className={linkClass}>Scoring weights</NavLink>
              <NavLink to="/admin/departments" className={linkClass}>Departments</NavLink>
              <NavLink to="/admin/payouts" className={linkClass}>Payouts</NavLink>
              <NavLink to="/admin/settings" className={linkClass}>Settings</NavLink>
            </>
          )}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 px-2 py-2 mb-2">
            <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{user?.name || 'User'}</p>
              <p className="text-xs text-slate-500 truncate capitalize">{user?.role}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full text-left px-4 py-2.5 text-red-600 hover:bg-red-50 rounded-xl text-sm font-semibold transition-colors"
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
