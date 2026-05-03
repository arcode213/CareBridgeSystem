import { useState, useEffect, useCallback } from 'react';
import { ShieldCheck } from 'lucide-react';
import api from '../../utils/api';

const AdminApprovals = () => {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionId, setActionId] = useState(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const res = await api.get('/admin/users/pending');
      if (res.data.success) setPending(res.data.data || []);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load pending users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const approve = async (userId) => {
    setActionId(userId);
    try {
      await api.patch(`/admin/users/${userId}`, { status: 'active' });
      await load();
    } catch (e) {
      alert(e.response?.data?.message || 'Approve failed');
    } finally {
      setActionId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] text-slate-500">Loading approvals…</div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-xl bg-blue-100 text-blue-600">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Approvals</h1>
          <p className="text-slate-500 text-sm mt-1">
            PMDC and facility review before activation (FR-30).
          </p>
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>}

      {pending.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-12 text-center text-slate-500">
          No pending registrations.
        </div>
      ) : (
        <ul className="space-y-4">
          {pending.map((u) => (
            <li
              key={u._id}
              className="bg-white border border-slate-100 rounded-2xl p-5 sm:p-6 shadow-sm hover:border-blue-100 transition-colors"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 truncate">{u.name}</p>
                  <p className="text-sm text-slate-600 truncate">{u.email}</p>
                  <span className="inline-block mt-2 text-[10px] uppercase tracking-wider font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                    {u.role}
                  </span>
                  {u.role === 'consultant' && u.profile && (
                    <p className="text-sm text-slate-700 mt-3">
                      PMDC <span className="font-mono font-medium">{u.profile.pmdcNumber}</span> · {u.profile.specialty}
                    </p>
                  )}
                  {u.role === 'hospital' && u.profile && (
                    <div className="text-sm text-slate-700 mt-3 space-y-1">
                      <p>
                        <span className="font-semibold">{u.profile.hospitalName}</span> · Reg {u.profile.registrationNumber}
                      </p>
                      <p className="text-slate-600">
                        {(u.profile.departments || []).join(', ') || '—'}
                      </p>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  disabled={actionId === u._id}
                  onClick={() => approve(u._id)}
                  className="shrink-0 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 shadow-sm"
                >
                  {actionId === u._id ? 'Approving…' : 'Approve'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AdminApprovals;
