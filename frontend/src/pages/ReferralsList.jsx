import { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import api from '../utils/api';
import { SOCKET_URL } from '../config';
import DetailModal from '../components/DetailModal';
import ClinicalNotesLog from '../components/ClinicalNotesLog';
import { FileText, User, Clock, Activity, Pencil, X } from 'lucide-react';
import toast from 'react-hot-toast';
import Loader from '../components/Loader';

const EDITABLE_STATUSES = ['pending', 'accepted', 'rejected'];

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
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);

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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchReferrals();
  }, [fetchReferrals]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return undefined;
    const socket = io(SOCKET_URL, { transports: ['websocket'] });
    socket.emit('join_consultant', { token });
    const refresh = () => fetchReferrals();
    socket.on('STATUS_UPDATE', refresh);
    socket.on('REFERRAL_ESCALATED', refresh);
    socket.on('NEW_CLINICAL_NOTE', (data) => {
      // If the selected referral is the one that got a note, we might want to refresh or toast
      if (selected?._id === data.referralId) {
        // Option to refresh the specific referral detail if needed
      }
      fetchReferrals();
    });
    return () => socket.disconnect();
  }, [fetchReferrals, selected]);

  const filteredReferrals = filter === 'all' 
    ? referrals 
    : filter === 'emergency' 
      ? referrals.filter(r => r.urgency === 'emergency') 
      : referrals.filter(r => r.status === filter);

  const openEdit = (ref) => {
    setEditForm({
      patientName: ref.patientName || '',
      age: ref.age ?? '',
      gender: ref.gender || 'male',
      phone: ref.phone || '',
      area: ref.area || '',
      cnic: ref.cnic || '',
      guardianName: ref.guardianName || '',
      guardianCnic: ref.guardianCnic || '',
      urgency: ref.urgency || 'routine',
      department: ref.department || '',
      symptomsText: ref.symptomsText || '',
      summaryNotes: ref.summaryNotes || '',
      diagnosisText: ref.diagnosisText || '',
      notes: ref.notes || '',
    });
    setIsEditing(true);
  };

  const saveEdit = async () => {
    if (!selected?._id) return;
    setSavingEdit(true);
    try {
      const res = await api.patch(`/referrals/${selected._id}`, {
        ...editForm,
        age: Number(editForm.age),
      });
      if (res.data.success) {
        toast.success('Referral updated');
        setIsEditing(false);
        const updated = res.data.data;
        setSelected((prev) => ({ ...prev, ...updated }));
        await fetchReferrals();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update referral');
    } finally {
      setSavingEdit(false);
    }
  };

  if (loading) return <Loader message="Fetching referral history..." />;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Referrals</h1>
          <p className="text-gray-500 text-sm mt-0.5">Click any row to view full referral details.</p>
        </div>
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-gray-100 shadow-sm">
          {['all', 'emergency', 'pending', 'accepted', 'rejected', 'admitted'].map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                filter === f ? (f === 'emergency' ? 'bg-red-600 text-white shadow-sm' : 'bg-blue-600 text-white shadow-sm') : 'text-gray-500 hover:bg-gray-50'
              }`}
            >{f}</button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {filteredReferrals.length > 0 ? (
          <div className="overflow-x-auto font-sans">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-[10px] uppercase font-bold tracking-wider">
                  <th className="px-5 py-4">Referral ID</th>
                  <th className="px-5 py-4">Patient</th>
                  <th className="px-5 py-4">Department</th>
                  <th className="px-5 py-4">Hospital</th>
                  <th className="px-5 py-4">Urgency</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Admission</th>
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
                      onClick={async () => {
                        setIsEditing(false);
                        setSelected(r);
                        try {
                          const res = await api.get(`/referrals/${r._id}`);
                          if (res.data.success) {
                            setSelected(res.data.data);
                          }
                        } catch (err) {
                          console.error('Failed to load referral details:', err);
                        }
                      }}
                    >
                      <td className="px-5 py-4 font-bold text-blue-600 font-mono text-sm">{r.referralCode}</td>
                      <td className="px-5 py-4">
                        <div className="font-semibold text-gray-900">{r.patientName}</div>
                        <div className="text-xs text-gray-500">{r.age}y · {r.gender} · {r.phone}</div>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-700">{r.department || '—'}</td>
                      <td className="px-5 py-4">
                        <div className="text-sm font-medium text-gray-900">{r.targetHospitalId?.hospitalName || 'N/A'}</div>
                        {r.targetDoctorId && (
                          <div className="text-xs text-blue-600 font-semibold mt-0.5">Dr. {r.targetDoctorId.name.replace(/^Dr\.\s*/i, '')}</div>
                        )}
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
                      <td className="px-5 py-4 text-xs text-gray-600 max-w-[140px]">
                        {r.admission ? (
                          <span>
                            {r.admission.admissionDepartment}
                            <br />
                            <span className="text-gray-400">
                              R{r.admission.roomNumber} · B{r.admission.bedNumber}
                            </span>
                          </span>
                        ) : (
                          '—'
                        )}
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
        onClose={() => { setSelected(null); setIsEditing(false); }}
        title={`Referral ${selected?.referralCode || ''}`}
        subtitle={selected ? `${selected.patientName} · ${selected.status?.toUpperCase()}` : ''}
      >
        {selected && (() => {
          const st  = statusConfig[selected.status]  || statusConfig.pending;
          const urg = urgencyConfig[selected.urgency] || urgencyConfig.routine;
          const canEdit = EDITABLE_STATUSES.includes(selected.status);
          return (
            <div className="space-y-6">
              {/* Status banner */}
              <div className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm ${st.cls}`}>
                <Activity size={17} />
                {st.label}
                <span className={`ml-auto text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${urg}`}>
                  {selected.urgency}
                </span>
                {canEdit && !isEditing && (
                  <button
                    type="button"
                    onClick={() => openEdit(selected)}
                    className="ml-2 flex items-center gap-1 px-3 py-1 rounded-lg bg-white/80 text-slate-700 text-xs font-bold hover:bg-white"
                  >
                    <Pencil size={14} /> Edit
                  </button>
                )}
              </div>

              {isEditing && (
                <div className="border border-blue-200 rounded-2xl p-4 bg-blue-50/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-800 text-sm">Edit referral</h3>
                    <button type="button" onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-slate-600">
                      <X size={18} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input className="rounded-lg border px-3 py-2 text-sm" placeholder="Patient name" value={editForm.patientName} onChange={(e) => setEditForm({ ...editForm, patientName: e.target.value })} />
                    <input className="rounded-lg border px-3 py-2 text-sm" type="number" placeholder="Age" value={editForm.age} onChange={(e) => setEditForm({ ...editForm, age: e.target.value })} />
                    <select className="rounded-lg border px-3 py-2 text-sm" value={editForm.gender} onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                    <input className="rounded-lg border px-3 py-2 text-sm" placeholder="Phone" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
                    <input className="rounded-lg border px-3 py-2 text-sm col-span-2" placeholder="Patient CNIC" value={editForm.cnic} onChange={(e) => setEditForm({ ...editForm, cnic: e.target.value })} />
                    <input className="rounded-lg border px-3 py-2 text-sm" placeholder="Guardian name" value={editForm.guardianName} onChange={(e) => setEditForm({ ...editForm, guardianName: e.target.value })} />
                    <input className="rounded-lg border px-3 py-2 text-sm" placeholder="Guardian CNIC" value={editForm.guardianCnic} onChange={(e) => setEditForm({ ...editForm, guardianCnic: e.target.value })} />
                    <select className="rounded-lg border px-3 py-2 text-sm" value={editForm.urgency} onChange={(e) => setEditForm({ ...editForm, urgency: e.target.value })}>
                      <option value="emergency">Emergency</option>
                      <option value="urgent">Urgent</option>
                      <option value="routine">Routine</option>
                    </select>
                    <input className="rounded-lg border px-3 py-2 text-sm" placeholder="Department" value={editForm.department} onChange={(e) => setEditForm({ ...editForm, department: e.target.value })} />
                  </div>
                  <textarea className="w-full rounded-lg border px-3 py-2 text-sm" rows={2} placeholder="Symptoms" value={editForm.symptomsText} onChange={(e) => setEditForm({ ...editForm, symptomsText: e.target.value })} />
                  <textarea className="w-full rounded-lg border px-3 py-2 text-sm" rows={2} placeholder="Clinical summary" value={editForm.summaryNotes} onChange={(e) => setEditForm({ ...editForm, summaryNotes: e.target.value })} />
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 text-sm font-semibold text-slate-500">Cancel</button>
                    <button type="button" onClick={saveEdit} disabled={savingEdit} className="px-4 py-2 text-sm font-bold text-white bg-blue-600 rounded-xl disabled:opacity-50">
                      {savingEdit ? 'Saving...' : 'Save changes'}
                    </button>
                  </div>
                </div>
              )}

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
                  <Field label="Patient CNIC"   value={selected.cnic} />
                  <Field label="Guardian"       value={selected.guardianName} />
                  <Field label="Guardian CNIC"  value={selected.guardianCnic} />
                  <Field label="Area / Locality" value={selected.area} />
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
                  {selected.summaryNotes && (
                    <div>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Clinical Summary (Consultant)</p>
                      <p className="text-sm text-slate-700 italic border-l-4 border-blue-200 pl-3 py-1 bg-blue-50/30 rounded-r-lg">{selected.summaryNotes}</p>
                    </div>
                  )}
                  {selected.notes && (
                    <div>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Internal Notes</p>
                      <p className="text-sm text-slate-700">{selected.notes}</p>
                    </div>
                  )}
                  {selected.attachments && selected.attachments.length > 0 && (
                    <div className="pt-3 border-t border-slate-100">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Uploaded Medical Reports & Attachments</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {selected.attachments.map((url, idx) => {
                          const name = url.split('/').pop() || `Attachment_${idx + 1}`;
                          return (
                            <a 
                              key={idx} 
                              href={url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 p-3 bg-white border border-slate-200 rounded-xl hover:border-blue-400 hover:text-blue-600 transition-all font-semibold text-xs text-slate-700 truncate"
                            >
                              📄 {name.slice(-30)}
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Clinical Notes Log (Interactive) */}
              <div className="border-t border-slate-100 pt-5">
                <ClinicalNotesLog 
                  referralId={selected._id} 
                  initialNotes={selected.clinicalNotes} 
                  onNoteAdded={() => fetchReferrals()} 
                />
              </div>

              {/* Hospital & Doctor */}
              {(selected.targetHospitalId || selected.targetDoctorId) && (
                <div className="border-t border-slate-100 pt-5">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Facility & Provider</p>
                  <div className="bg-teal-50 p-4 rounded-xl space-y-3">
                    {selected.targetHospitalId && (
                      <div>
                        <p className="text-[10px] text-teal-600 font-bold uppercase">Hospital</p>
                        <p className="font-bold text-slate-900">{selected.targetHospitalId.hospitalName}</p>
                      </div>
                    )}
                    {selected.targetDoctorId && (
                      <div className="pt-2 border-t border-teal-100/50">
                        <p className="text-[10px] text-teal-600 font-bold uppercase">Targeted Doctor</p>
                        <p className="font-bold text-slate-900">{selected.targetDoctorId.name}</p>
                        <p className="text-xs text-slate-600">{selected.targetDoctorId.specialty}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Admission Details */}
              {selected.admission && (
                <div className="border-t border-slate-100 pt-5">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Admission & Bed Status</p>
                  <div className="bg-blue-50 p-4 rounded-xl space-y-3 border border-blue-100/40">
                    <Field label="Admitted Department" value={selected.admission.admissionDepartment} />
                    <Field label="Treating Doctor" value={selected.admission.treatingDoctorId?.name ? `Dr. ${selected.admission.treatingDoctorId.name.replace(/^Dr\.\s*/i, '')} (${selected.admission.treatingDoctorId.specialty || 'N/A'})` : '—'} />
                    <Field label="Room & Bed Number" value={`Room: ${selected.admission.roomNumber} · Bed: ${selected.admission.bedNumber}`} />
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
