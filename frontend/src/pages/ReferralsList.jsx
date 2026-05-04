import { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import api from '../utils/api';
import { SOCKET_URL } from '../config';
import DetailModal from '../components/DetailModal';
import { FileText, User, Clock, Activity } from 'lucide-react';

const statusConfig = {
  pending:  { cls: 'bg-amber-50 text-amber-600',    label: 'Pending' },
  accepted: { cls: 'bg-emerald-50 text-emerald-600', label: 'Accepted' },
  rejected: { cls: 'bg-red-50 text-red-600',         label: 'Rejected' },
  admitted: { cls: 'bg-blue-50 text-blue-600',        label: 'Admitted' },
  closed:   { cls: 'bg-slate-100 text-slate-500',     label: 'Closed' },
};

const urgencyConfig = {
  emergency: 'bg-red-50 text-red-600',
  urgent:    'bg-orange-50 text-orange-600',
  routine:   'bg-blue-50 text-blue-600',
};

const Field = ({ label, value }) => (
  <div>
    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
    <p className="text-sm font-medium text-slate-800">{value || '—'}</p>
  </div>
);

const ReferralsList = () => {
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);

  const fetchReferrals = useCallback(async () => {
    try {
      const res = await api.get('/referrals/mine');
      if (res.data.success) setReferrals(res.data.data);
    } catch (err) {
      console.error('Failed to fetch referrals:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReferrals(); }, [fetchReferrals]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return undefined;
    const socket = io(SOCKET_URL, { transports: ['websocket'] });
    socket.emit('join_consultant', { token });
    const refresh = () => fetchReferrals();
    socket.on('STATUS_UPDATE', refresh);
    socket.on('REFERRAL_ESCALATED', refresh);
    return () => socket.disconnect();
  }, [fetchReferrals]);

  const filteredReferrals = filter === 'all' ? referrals : referrals.filter(r => r.status === filter);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Referrals</h1>
          <p className="text-gray-500 text-sm mt-0.5">Click any row to view full referral details.</p>
        </div>
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-gray-100 shadow-sm">
          {['all', 'pending', 'accepted', 'rejected', 'admitted'].map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                filter === f ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >{f}</button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500 italic">Fetching your referral history...</div>
        ) : filteredReferrals.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-[10px] uppercase font-bold tracking-wider">
                  <th className="px-5 py-4">Referral ID</th>
                  <th className="px-5 py-4">Patient</th>
                  <th className="px-5 py-4">Department</th>
                  <th className="px-5 py-4">Hospital</th>
                  <th className="px-5 py-4">Urgency</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredReferrals.map((r) => {
                  const st  = statusConfig[r.status]  || statusConfig.pending;
                  const urg = urgencyConfig[r.urgency] || urgencyConfig.routine;
                  return (
                    <tr key={r._id}
                      className="hover:bg-blue-50/40 transition-all cursor-pointer"
                      onClick={() => setSelected(r)}
                    >
                      <td className="px-5 py-4 font-bold text-blue-600 font-mono text-sm">{r.referralCode}</td>
                      <td className="px-5 py-4">
                        <div className="font-semibold text-gray-900">{r.patientName}</div>
                        <div className="text-xs text-gray-500">{r.age}y · {r.gender} · {r.phone}</div>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-700">{r.department || '—'}</td>
                      <td className="px-5 py-4">
                        <div className="text-sm font-medium text-gray-900">{r.targetHospitalId?.hospitalName || 'N/A'}</div>
                        <div className="text-[10px] text-gray-400 uppercase">{r.area}</div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${urg}`}>
                          {r.urgency}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold capitalize ${st.cls}`}>
                          {st.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-gray-500 text-sm">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-20 text-center">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
              <FileText className="w-10 h-10" />
            </div>
            <h3 className="text-gray-900 font-bold text-lg">No referrals found</h3>
            <p className="text-gray-500 max-w-xs mx-auto mt-2">Try adjusting your filters or create a new referral.</p>
          </div>
        )}
      </div>

      {/* Detail Slide-over */}
      <DetailModal
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        title={`Referral ${selected?.referralCode || ''}`}
        subtitle={selected ? `${selected.patientName} · ${selected.status?.toUpperCase()}` : ''}
      >
        {selected && (() => {
          const st  = statusConfig[selected.status]  || statusConfig.pending;
          const urg = urgencyConfig[selected.urgency] || urgencyConfig.routine;
          return (
            <div className="space-y-6">
              {/* Status banner */}
              <div className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm ${st.cls}`}>
                <Activity size={17} />
                {st.label}
                <span className={`ml-auto text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${urg}`}>
                  {selected.urgency}
                </span>
              </div>

              {/* Patient */}
              <div>
                <div className="flex items-center gap-2 text-slate-700 font-bold text-sm mb-3">
                  <User size={15} /> Patient Information
                </div>
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl">
                  <Field label="Full Name"      value={selected.patientName} />
                  <Field label="Age"            value={selected.age ? `${selected.age} years` : null} />
                  <Field label="Gender"         value={selected.gender} />
                  <Field label="Phone"          value={selected.phone} />
                  <Field label="Area / Locality" value={selected.area} />
                  {selected.cnic && <Field label="CNIC" value={selected.cnic} />}
                </div>
              </div>

              {/* Clinical */}
              <div className="border-t border-slate-100 pt-5">
                <div className="flex items-center gap-2 text-slate-700 font-bold text-sm mb-3">
                  <FileText size={15} /> Clinical Details
                </div>
                <div className="bg-slate-50 p-4 rounded-xl space-y-3">
                  <Field label="Department"           value={selected.department} />
                  <Field label="Provisional Diagnosis" value={selected.diagnosisText} />
                  <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Symptoms</p>
                    <p className="text-sm text-slate-700">{selected.symptomsText || '—'}</p>
                  </div>
                  {selected.notes && (
                    <div>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Clinical Notes</p>
                      <p className="text-sm text-slate-700">{selected.notes}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Hospital */}
              {selected.targetHospitalId && (
                <div className="border-t border-slate-100 pt-5">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Target Hospital</p>
                  <div className="bg-teal-50 p-4 rounded-xl">
                    <p className="font-bold text-slate-900">{selected.targetHospitalId.hospitalName}</p>
                    {selected.targetHospitalId.address && (
                      <p className="text-sm text-slate-600 mt-1">{selected.targetHospitalId.address}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Timeline */}
              <div className="border-t border-slate-100 pt-5">
                <div className="flex items-center gap-2 text-slate-700 font-bold text-sm mb-3">
                  <Clock size={15} /> Submission Info
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Submitted" value={new Date(selected.createdAt).toLocaleString('en-PK')} />
                  {selected.promoCode && <Field label="Promo Code" value={selected.promoCode} />}
                </div>
              </div>
            </div>
          );
        })()}
      </DetailModal>
    </div>
  );
};

export default ReferralsList;
