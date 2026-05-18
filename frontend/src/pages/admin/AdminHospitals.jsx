import { useState, useEffect, useCallback } from 'react';
import { Building2, Eye, Search, BedDouble, Stethoscope } from 'lucide-react';
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

const AdminHospitals = () => {
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [actionId, setActionId] = useState(null);
  const [customDeduction, setCustomDeduction] = useState(20);

  useEffect(() => {
    if (selected?.profile?.deductionPercentage != null) {
      setCustomDeduction(selected.profile.deductionPercentage);
    }
  }, [selected]);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/admin/users?role=hospital');
      if (res.data.success) setHospitals(res.data.data || []);
    } catch (e) {
      toast.error('Failed to load hospitals');
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
      toast.success(`Hospital ${newStatus === 'active' ? 'activated' : 'suspended'}`);
      if (selected?._id === userId) setSelected(prev => ({ ...prev, status: newStatus }));
      await load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Action failed');
    } finally {
      setActionId(null);
    }
  };

  const handleDelete = async (userId) => {
    if (window.confirm('Are you absolutely sure you want to permanently delete this hospital? This cannot be undone.')) {
      setActionId(userId);
      try {
        const res = await api.delete(`/admin/users/${userId}`);
        if (res.data.success) {
          toast.success('Hospital deleted successfully');
          setSelected(null);
          await load();
        }
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to delete hospital');
      } finally {
        setActionId(null);
      }
    }
  };

  const handleChangePassword = async (userId) => {
    const newPass = window.prompt('Enter new password for this user (minimum 6 characters):');
    if (newPass) {
      if (newPass.length < 6) {
        toast.error('Password must be at least 6 characters');
        return;
      }
      setActionId(userId);
      try {
        const res = await api.post(`/admin/users/${userId}/change-password`, { password: newPass });
        if (res.data.success) {
          toast.success('Password updated successfully');
        }
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to update password');
      } finally {
        setActionId(null);
      }
    }
  };

  const filtered = hospitals.filter(h =>
    h.name?.toLowerCase().includes(search.toLowerCase()) ||
    h.email?.toLowerCase().includes(search.toLowerCase()) ||
    h.profile?.hospitalName?.toLowerCase().includes(search.toLowerCase()) ||
    h.profile?.address?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="flex items-center justify-center min-h-[40vh] text-slate-500">Loading hospitals…</div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-xl bg-teal-100 text-teal-600"><Building2 className="w-6 h-6" /></div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Hospitals</h1>
          <p className="text-slate-500 text-sm mt-1">Manage all registered hospital facilities on the platform.</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
        <input
          type="text"
          placeholder="Search by hospital name, admin email, address…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500 outline-none shadow-sm"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-left">
            <tr>
              <th className="px-5 py-3.5 font-semibold">Hospital</th>
              <th className="px-5 py-3.5 font-semibold">Reg. No.</th>
              <th className="px-5 py-3.5 font-semibold">Departments</th>
              <th className="px-5 py-3.5 font-semibold">Beds Available</th>
              <th className="px-5 py-3.5 font-semibold">Status</th>
              <th className="px-5 py-3.5 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-500">No hospitals found.</td></tr>
            ) : filtered.map(h => {
              const availableBeds = h.profile?.bedsInventory?.reduce((acc, curr) => acc + (curr.availableBeds || 0), 0) || 0;
              return (
                <tr key={h._id}
                  className="hover:bg-teal-50/30 transition-colors cursor-pointer"
                  onClick={() => setSelected(h)}
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-teal-100 text-teal-700 font-bold text-sm flex items-center justify-center shrink-0">
                        {(h.profile?.hospitalName || h.name)?.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{h.profile?.hospitalName || h.name}</p>
                        <p className="text-xs text-slate-500">{h.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 font-mono text-xs text-slate-700">{h.profile?.registrationNumber || '—'}</td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-1">
                      {(h.profile?.departments || []).slice(0, 2).map(d => (
                        <span key={d} className="px-2 py-0.5 bg-teal-50 text-teal-700 text-[10px] font-semibold rounded-full">{d}</span>
                      ))}
                      {(h.profile?.departments || []).length > 2 && (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-semibold rounded-full">
                          +{(h.profile?.departments || []).length - 2}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4 font-semibold text-xs text-slate-700">
                    <span className={availableBeds > 0 ? 'text-emerald-600' : 'text-red-500'}>
                      {availableBeds} beds available
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-lg capitalize ${statusBadge(h.status)}`}>
                      {h.status}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      <button onClick={() => setSelected(h)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-teal-600 transition-colors">
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => toggleStatus(h._id, h.status)}
                        disabled={actionId === h._id}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 ${
                          h.status === 'active'
                            ? 'text-red-600 hover:bg-red-50'
                            : 'text-emerald-600 hover:bg-emerald-50'
                        }`}
                      >
                        {actionId === h._id ? '…' : h.status === 'active' ? 'Suspend' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Detail Slide-over */}
      <DetailModal
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.profile?.hospitalName || selected?.name || ''}
        subtitle={`Hospital · Admin: ${selected?.name} · ${selected?.email}`}
        wide
      >
        {selected && (
          <div className="space-y-6">
            {/* Header info */}
            <div className="flex flex-col gap-4 border-b border-slate-100 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-teal-100 text-teal-700 font-black text-xl flex items-center justify-center shrink-0">
                    {(selected.profile?.hospitalName || selected.name)?.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{selected.profile?.hospitalName || selected.name}</h3>
                    <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-md capitalize ${statusBadge(selected.status)}`}>
                      {selected.status}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleStatus(selected._id, selected.status)}
                    disabled={actionId === selected._id}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                      selected.status === 'active'
                        ? 'bg-red-50 text-red-600 hover:bg-red-100'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    }`}
                  >
                    {actionId === selected._id ? '…' : selected.status === 'active' ? 'Suspend' : 'Activate'}
                  </button>
                  <button
                    onClick={() => handleChangePassword(selected._id)}
                    className="px-3 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-bold transition-all"
                  >
                    🔑 Password
                  </button>
                  <button
                    onClick={() => handleDelete(selected._id)}
                    className="px-3 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl text-xs font-bold transition-all"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl">
              <Field label="Admin Name" value={selected.name} />
              <Field label="Email" value={selected.email} />
              <Field label="Phone" value={selected.phone} />
              <Field label="Registered On" value={new Date(selected.createdAt).toLocaleDateString('en-PK', { dateStyle: 'medium' })} />
            </div>

            {selected.profile && (
              <>
                <div className="space-y-4 border-t border-slate-100 pt-5">
                  <div className="flex items-center gap-2 text-teal-700 font-bold text-sm mb-2">
                    <Building2 size={16} /> Facility Details
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Hospital Name" value={selected.profile.hospitalName} />
                    <Field label="Reg. Number" value={selected.profile.registrationNumber} />
                    <Field label="Address" value={selected.profile.address} />
                  </div>
                </div>

                {selected.profile.departments?.length > 0 && (
                  <div className="border-t border-slate-100 pt-5">
                    <div className="flex items-center gap-2 text-teal-700 font-bold text-sm mb-3">
                      <Stethoscope size={16} /> Departments
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selected.profile.departments.map(d => (
                        <span key={d} className="px-3 py-1.5 bg-teal-50 text-teal-700 text-xs font-semibold rounded-full">{d}</span>
                      ))}
                    </div>
                  </div>
                )}

                {selected.profile.bedsInventory?.length > 0 && (
                  <div className="border-t border-slate-100 pt-5">
                    <div className="flex items-center gap-2 text-slate-700 font-bold text-sm mb-3">
                      <BedDouble size={16} /> Bed Inventory
                    </div>
                    <div className="rounded-xl border border-slate-100 overflow-hidden">
                      <table className="min-w-full text-sm">
                        <thead className="bg-slate-50 text-slate-500">
                          <tr>
                            <th className="px-4 py-2.5 text-left font-semibold">Ward</th>
                            <th className="px-4 py-2.5 text-left font-semibold">Total</th>
                            <th className="px-4 py-2.5 text-left font-semibold">Available</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {selected.profile.bedsInventory.map(b => (
                            <tr key={b.ward}>
                              <td className="px-4 py-2.5 font-medium text-slate-700">{b.ward}</td>
                              <td className="px-4 py-2.5 text-slate-600">{b.totalBeds}</td>
                              <td className="px-4 py-2.5">
                                <span className={`font-bold ${b.availableBeds > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                  {b.availableBeds}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                {/* Platform Deduction settings */}
                <div className="border-t border-slate-100 pt-5">
                  <div className="flex items-center gap-2 text-teal-700 font-bold text-sm mb-3">
                    🛡️ Platform Deduction Configuration
                  </div>
                  <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold text-slate-800">Hospital Platform Cut (%)</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Define the platform percentage cut automatically deducted from patient payments at this hospital.</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        placeholder="20"
                        value={customDeduction}
                        onChange={(e) => setCustomDeduction(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                        className="w-20 px-2 py-1.5 text-center text-sm font-bold text-slate-800 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                      />
                      <button
                        onClick={async () => {
                          try {
                            setActionId(selected._id);
                            await api.post(`/admin/hospitals/${selected._id}/deduction`, { deductionPercentage: customDeduction });
                            toast.success(`Deduction percentage updated to ${customDeduction}%`);
                            // Re-apply locally
                            setSelected(prev => ({
                              ...prev,
                              profile: { ...prev.profile, deductionPercentage: customDeduction }
                            }));
                            await load();
                          } catch (err) {
                            toast.error('Failed to update deduction percentage');
                          } finally {
                            setActionId(null);
                          }
                        }}
                        disabled={actionId === selected._id}
                        className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm disabled:opacity-50"
                      >
                        Update
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </DetailModal>
    </div>
  );
};

export default AdminHospitals;
