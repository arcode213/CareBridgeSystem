import { useState, useEffect, useCallback } from 'react';
import { Users, Eye, Search, CheckCircle, XCircle, Stethoscope } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import DetailModal from '../../components/DetailModal';

const statusBadge = (status) => {
  const map = {
    active: 'bg-emerald-50 text-emerald-700',
    pending: 'bg-amber-50 text-amber-700',
    suspended: 'bg-red-50 text-red-600',
  };
  return map[status] || 'bg-slate-100 text-slate-600';
};

const Field = ({ label, value }) => (
  <div>
    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
    <p className="text-sm font-medium text-slate-800">{value || '—'}</p>
  </div>
);

const AdminConsultants = () => {
  const [consultants, setConsultants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [actionId, setActionId] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/admin/users?role=consultant');
      if (res.data.success) setConsultants(res.data.data || []);
    } catch (e) {
      toast.error('Failed to load consultants');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleStatus = async (userId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    setActionId(userId);
    try {
      await api.patch(`/admin/users/${userId}`, { status: newStatus });
      toast.success(`User ${newStatus === 'active' ? 'activated' : 'suspended'}`);
      if (selected?._id === userId) setSelected(prev => ({ ...prev, status: newStatus }));
      await load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Action failed');
    } finally {
      setActionId(null);
    }
  };

  const filtered = consultants.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.profile?.pmdcNumber?.toLowerCase().includes(search.toLowerCase()) ||
    c.profile?.specialty?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="flex items-center justify-center min-h-[40vh] text-slate-500">Loading consultants…</div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-xl bg-blue-100 text-blue-600"><Users className="w-6 h-6" /></div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Consultants</h1>
          <p className="text-slate-500 text-sm mt-1">Manage all registered consultants on the platform.</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
        <input
          type="text"
          placeholder="Search by name, email, PMDC, specialty…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-left">
            <tr>
              <th className="px-5 py-3.5 font-semibold">Consultant</th>
              <th className="px-5 py-3.5 font-semibold">PMDC / Specialty</th>
              <th className="px-5 py-3.5 font-semibold">Phone</th>
              <th className="px-5 py-3.5 font-semibold">Status</th>
              <th className="px-5 py-3.5 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.length === 0 ? (
              <tr><td colSpan={5} className="px-5 py-12 text-center text-slate-500">No consultants found.</td></tr>
            ) : filtered.map(c => (
              <tr key={c._id}
                className="hover:bg-blue-50/30 transition-colors cursor-pointer"
                onClick={() => setSelected(c)}
              >
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 font-bold text-sm flex items-center justify-center shrink-0">
                      {c.name?.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{c.name}</p>
                      <p className="text-xs text-slate-500">{c.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <p className="font-mono text-xs font-medium text-slate-700">{c.profile?.pmdcNumber || '—'}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{c.profile?.specialty || '—'}</p>
                </td>
                <td className="px-5 py-4 text-slate-600 text-xs">{c.phone || '—'}</td>
                <td className="px-5 py-4">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-lg capitalize ${statusBadge(c.status)}`}>
                    {c.status}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    <button onClick={() => setSelected(c)}
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors">
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => toggleStatus(c._id, c.status)}
                      disabled={actionId === c._id}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 ${
                        c.status === 'active'
                          ? 'text-red-600 hover:bg-red-50'
                          : 'text-emerald-600 hover:bg-emerald-50'
                      }`}
                    >
                      {actionId === c._id ? '…' : c.status === 'active' ? 'Suspend' : 'Activate'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail Slide-over */}
      <DetailModal
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.name || ''}
        subtitle={`Consultant · ${selected?.email}`}
      >
        {selected && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-700 font-black text-2xl flex items-center justify-center">
                {selected.name?.charAt(0)}
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">{selected.name}</h3>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-lg capitalize ${statusBadge(selected.status)}`}>
                  {selected.status}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl">
              <Field label="Email" value={selected.email} />
              <Field label="Phone" value={selected.phone} />
              <Field label="Joined" value={new Date(selected.createdAt).toLocaleDateString('en-PK', { dateStyle: 'medium' })} />
            </div>

            {selected.profile && (
              <div className="space-y-4 border-t border-slate-100 pt-5">
                <div className="flex items-center gap-2 text-blue-700 font-bold text-sm mb-2">
                  <Stethoscope size={16} /> Professional Details
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="PMDC Number" value={selected.profile.pmdcNumber} />
                  <Field label="Specialty" value={selected.profile.specialty} />
                  <Field label="Clinic Name" value={selected.profile.clinicName} />
                  <Field label="Clinic Address" value={selected.profile.clinicAddress} />
                  <Field label="Total Earnings" value={selected.profile.totalEarnings != null ? `PKR ${(selected.profile.totalEarnings / 100).toLocaleString()}` : '—'} />
                  <Field label="Promo Code" value={selected.profile.promoCode} />
                  <Field label="Verified" value={selected.profile.isVerified ? 'Yes ✓' : 'Pending'} />
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-slate-100">
              <button
                onClick={() => toggleStatus(selected._id, selected.status)}
                disabled={actionId === selected._id}
                className={`w-full py-3 rounded-xl font-bold text-sm transition-colors disabled:opacity-50 ${
                  selected.status === 'active'
                    ? 'bg-red-50 text-red-600 hover:bg-red-100'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                }`}
              >
                {actionId === selected._id ? 'Updating…' : selected.status === 'active' ? 'Suspend Account' : 'Activate Account'}
              </button>
            </div>
          </div>
        )}
      </DetailModal>
    </div>
  );
};

export default AdminConsultants;
