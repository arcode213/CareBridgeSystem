import { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import api from '../utils/api';
import { SOCKET_URL } from '../config';
import {
  FlaskConical, Plus, X, Search, ChevronRight, AlertCircle,
  Clock, CheckCircle2, Beaker, Loader2, Activity, User,
  FileText, ChevronDown, ChevronUp, RotateCcw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Loader from '../components/Loader';

// ── Status Config ─────────────────────────────────────────────────────────────
const INV_STATUS = {
  order_received:       { label: 'Order Received',      cls: 'bg-blue-50 text-blue-600',      dot: 'bg-blue-500' },
  awaiting_collection:  { label: 'Awaiting Collection',  cls: 'bg-amber-50 text-amber-600',    dot: 'bg-amber-500' },
  collected:            { label: 'Sample Collected',     cls: 'bg-orange-50 text-orange-600',  dot: 'bg-orange-500' },
  in_processing:        { label: 'Processing',           cls: 'bg-cyan-50 text-cyan-700',      dot: 'bg-cyan-500' },
  awaiting_validation:  { label: 'Awaiting Validation',  cls: 'bg-violet-50 text-violet-700',  dot: 'bg-violet-500' },
  completed:            { label: 'Completed',            cls: 'bg-emerald-50 text-emerald-700',dot: 'bg-emerald-500' },
  critical_value:       { label: 'Critical Value!',      cls: 'bg-red-50 text-red-700',        dot: 'bg-red-500 animate-pulse' },
  qc_failed:            { label: 'QC Failed',            cls: 'bg-slate-100 text-slate-500',   dot: 'bg-slate-400' },
};

const URGENCY = {
  routine:   { label: 'Routine',   cls: 'bg-blue-50 text-blue-600' },
  urgent:    { label: 'Urgent',    cls: 'bg-orange-50 text-orange-600' },
  emergency: { label: 'STAT',      cls: 'bg-red-50 text-red-700 font-black' },
};

// ── Test Catalogue ────────────────────────────────────────────────────────────
const TEST_CATALOGUE = {
  Biochemistry: [
    'Complete Blood Count (CBC)', 'Blood Sugar (Fasting)', 'Blood Sugar (Random)',
    'HbA1c', 'Lipid Profile', 'Liver Function Tests (LFT)', 'Renal Function Tests (RFT)',
    'Serum Electrolytes', 'Thyroid Profile (TSH, T3, T4)', 'Serum Iron Studies',
    'Vitamin B12', 'Vitamin D (25-OH)', 'Uric Acid', 'CRP', 'Serum Calcium',
  ],
  Haematology: [
    'Erythrocyte Sedimentation Rate (ESR)', 'Blood Group & Rh Typing',
    'Coagulation Profile (PT/APTT/INR)', 'Peripheral Blood Film', 'Reticulocyte Count',
    'Haemoglobin Electrophoresis', 'Dengue NS1 Antigen', 'Malaria Parasite Screen',
  ],
  Serology: [
    'Hepatitis B Surface Antigen (HBsAg)', 'Hepatitis C Antibody (Anti-HCV)',
    'HIV 1 & 2 Antibody', 'VDRL / RPR (Syphilis)', 'Widal Test',
    'Anti-Streptolysin O (ASO) Titre', 'Rheumatoid Factor (RF)',
    'Anti-Nuclear Antibodies (ANA)', 'H. Pylori Antigen',
  ],
  Microbiology: [
    'Urine Culture & Sensitivity', 'Blood Culture & Sensitivity',
    'Sputum Culture & Sensitivity', 'Throat Swab Culture',
    'Wound Swab Culture', 'Stool Culture',
  ],
  Urine: [
    'Urine Routine Examination (R/E)', '24-Hour Urine Protein',
    '24-Hour Urine Creatinine', 'Microalbuminuria', 'Urine Drug Screen',
  ],
  Radiology: [
    'Chest X-Ray (PA)', 'Abdomen X-Ray', 'Ultrasound Abdomen & Pelvis',
    'Echocardiography (Echo)', 'CT Scan Chest', 'CT Scan Abdomen',
    'MRI Brain', 'MRI Spine', 'Doppler Ultrasound',
  ],
  Histopathology: [
    'Biopsy — Skin', 'Biopsy — Core Needle', 'Fine Needle Aspiration Cytology (FNAC)',
    'Pap Smear', 'Bone Marrow Trephine Biopsy',
  ],
  Cardiac: [
    '12-Lead ECG', 'Troponin I (cTnI)', 'CK-MB', 'BNP / NT-proBNP', 'D-Dimer',
  ],
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const Field = ({ label, value }) => (
  <div>
    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
    <p className="text-sm font-medium text-slate-800">{value || '—'}</p>
  </div>
);

const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
      <Icon className="w-6 h-6" />
    </div>
    <div>
      <p className="text-2xl font-black text-slate-900">{value}</p>
      <p className="text-xs font-semibold text-slate-500 mt-0.5">{label}</p>
    </div>
  </div>
);

// ══════════════════════════════════════════════════════════════════════════════
const ConsultantLabReferrals = () => {
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [expanded, setExpanded] = useState(null);

  // ── Form state ──
  const [labs, setLabs] = useState([]);
  const [labSearch, setLabSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [openDepts, setOpenDepts] = useState({});
  const [form, setForm] = useState({
    patientName: '', age: '', gender: 'male',
    phone: '', cnic: '', area: '',
    guardianName: '', guardianCnic: '',
    urgency: 'routine',
    symptomsText: '', summaryNotes: '', diagnosisText: '',
    targetLaboratoryId: '',
    selectedTests: [],   // [{ dept, testName }]
    preferredDate: '',
  });

  // ── Fetch ────────────────────────────────────────────────────────────────────
  const fetchReferrals = useCallback(async () => {
    try {
      const res = await api.get('/referrals/my-lab-referrals');
      if (res.data.success) setReferrals(res.data.data);
    } catch (err) {
      console.error('Failed to fetch lab referrals:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLabs = useCallback(async () => {
    try {
      const res = await api.get('/referrals/available-laboratories');
      if (res.data.success) setLabs(res.data.data);
    } catch (err) {
      console.error('Failed to fetch labs:', err);
    }
  }, []);

  useEffect(() => { fetchReferrals(); }, [fetchReferrals]);

  useEffect(() => {
    if (!showModal) return;
    fetchLabs();
  }, [showModal, fetchLabs]);

  // ── Real-time ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return undefined;
    const socket = io(SOCKET_URL, { transports: ['websocket'] });
    socket.emit('join_consultant', { token });
    socket.on('STATUS_UPDATE', fetchReferrals);
    return () => socket.disconnect();
  }, [fetchReferrals]);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = {
    total: referrals.length,
    pending: referrals.filter(r => r.investigation && !['completed', 'qc_failed'].includes(r.investigation.status)).length,
    completed: referrals.filter(r => r.investigation?.status === 'completed').length,
    stat: referrals.filter(r => r.urgency === 'emergency').length,
  };

  // ── Form helpers ──────────────────────────────────────────────────────────
  const setF = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const toggleTest = (dept, testName) => {
    setForm(f => {
      const exists = f.selectedTests.some(t => t.dept === dept && t.testName === testName);
      return {
        ...f,
        selectedTests: exists
          ? f.selectedTests.filter(t => !(t.dept === dept && t.testName === testName))
          : [...f.selectedTests, { dept, testName }],
      };
    });
  };

  const toggleDept = (dept) => setOpenDepts(d => ({ ...d, [dept]: !d[dept] }));

  const resetForm = () => {
    setForm({
      patientName: '', age: '', gender: 'male',
      phone: '', cnic: '', area: '',
      guardianName: '', guardianCnic: '',
      urgency: 'routine',
      symptomsText: '', summaryNotes: '', diagnosisText: '',
      targetLaboratoryId: '',
      selectedTests: [],
      preferredDate: '',
    });
    setLabSearch('');
    setOpenDepts({});
  };

  const filteredLabs = labs.filter(l =>
    `${l.laboratoryName} ${l.city} ${l.area}`.toLowerCase().includes(labSearch.toLowerCase())
  );

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.targetLaboratoryId) { toast.error('Please select a laboratory'); return; }
    if (form.selectedTests.length === 0) { toast.error('Please select at least one test'); return; }
    if (!form.patientName.trim()) { toast.error('Patient name is required'); return; }

    // Determine primary department from selected tests
    const deptCounts = {};
    form.selectedTests.forEach(t => { deptCounts[t.dept] = (deptCounts[t.dept] || 0) + 1; });
    const primaryDept = Object.entries(deptCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'General';

    setSubmitting(true);
    try {
      const payload = {
        referralType: 'laboratory',
        targetLaboratoryId: form.targetLaboratoryId,
        patientName: form.patientName.trim(),
        age: Number(form.age),
        gender: form.gender,
        phone: form.phone.trim(),
        cnic: form.cnic.trim(),
        area: form.area.trim(),
        guardianName: form.guardianName.trim(),
        guardianCnic: form.guardianCnic.trim(),
        urgency: form.urgency,
        symptomsText: form.symptomsText.trim(),
        summaryNotes: [
          form.summaryNotes,
          form.selectedTests.length > 0
            ? `Requested Tests: ${form.selectedTests.map(t => t.testName).join(', ')}`
            : '',
          form.preferredDate ? `Preferred Sample Date: ${form.preferredDate}` : '',
        ].filter(Boolean).join('\n\n'),
        diagnosisText: form.diagnosisText.trim(),
        department: primaryDept,
      };

      const res = await api.post('/referrals', payload);
      if (res.data.success) {
        toast.success(`Lab referral ${res.data.data.referralCode} created successfully!`);
        setShowModal(false);
        resetForm();
        fetchReferrals();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create lab referral');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loader message="Loading lab referrals..." />;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <FlaskConical className="w-7 h-7 text-violet-600" />
            Lab Referrals
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Create and track all your laboratory investigation orders.
          </p>
        </div>
        <button
          id="create-lab-referral-btn"
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-violet-600/25 hover:shadow-violet-600/40"
        >
          <Plus className="w-4 h-4" /> Create Lab Referral
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={FlaskConical} label="Total Orders"  value={stats.total}     color="bg-violet-50 text-violet-600" />
        <StatCard icon={Clock}        label="In Progress"   value={stats.pending}   color="bg-amber-50 text-amber-600" />
        <StatCard icon={CheckCircle2} label="Completed"     value={stats.completed} color="bg-emerald-50 text-emerald-600" />
        <StatCard icon={AlertCircle}  label="STAT / Emergency" value={stats.stat}   color="bg-red-50 text-red-600" />
      </div>

      {/* Referrals list */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {referrals.length === 0 ? (
          <div className="p-20 text-center">
            <div className="w-20 h-20 bg-violet-50 rounded-full flex items-center justify-center mx-auto mb-4 text-violet-300">
              <Beaker className="w-10 h-10" />
            </div>
            <h3 className="text-slate-900 font-bold text-lg">No lab referrals yet</h3>
            <p className="text-slate-500 max-w-xs mx-auto mt-2">
              Click <strong>Create Lab Referral</strong> to send your first laboratory investigation order.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {referrals.map((ref) => {
              const inv = ref.investigation;
              const invSt = inv ? (INV_STATUS[inv.status] || INV_STATUS.order_received) : null;
              const urgSt = URGENCY[ref.urgency] || URGENCY.routine;
              const isOpen = expanded === ref._id;

              return (
                <div key={ref._id}>
                  {/* Row */}
                  <button
                    id={`lab-ref-row-${ref._id}`}
                    type="button"
                    className="w-full text-left px-5 py-4 hover:bg-violet-50/40 transition-colors flex items-center gap-4"
                    onClick={() => setExpanded(isOpen ? null : ref._id)}
                  >
                    {/* Referral code */}
                    <div className="font-mono font-black text-violet-600 text-sm w-28 shrink-0">
                      {ref.referralCode}
                    </div>

                    {/* Patient */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{ref.patientName}</p>
                      <p className="text-xs text-slate-500">{ref.age}y · {ref.gender} · {ref.phone}</p>
                    </div>

                    {/* Lab */}
                    <div className="hidden sm:block flex-1 min-w-0">
                      <p className="font-medium text-slate-800 text-sm truncate">
                        {ref.targetLaboratoryId?.laboratoryName || '—'}
                      </p>
                      <p className="text-[10px] text-slate-400 uppercase">{ref.targetLaboratoryId?.city}</p>
                    </div>

                    {/* Urgency */}
                    <span className={`hidden md:inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${urgSt.cls}`}>
                      {urgSt.label}
                    </span>

                    {/* Investigation status */}
                    {invSt ? (
                      <span className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${invSt.cls}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${invSt.dot}`} />
                        {invSt.label}
                      </span>
                    ) : (
                      <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-50 text-slate-400">
                        No Update Yet
                      </span>
                    )}

                    {/* Date */}
                    <span className="hidden lg:block text-xs text-slate-400 shrink-0">
                      {new Date(ref.createdAt).toLocaleDateString('en-PK')}
                    </span>

                    {/* Chevron */}
                    <div className="text-slate-400 shrink-0">
                      {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {isOpen && (
                    <div className="px-5 pb-5 bg-slate-50/50 border-t border-slate-100">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">

                        {/* Patient Info */}
                        <div>
                          <div className="flex items-center gap-2 text-slate-700 font-bold text-xs mb-3 uppercase tracking-wider">
                            <User className="w-3.5 h-3.5" /> Patient Information
                          </div>
                          <div className="bg-white rounded-xl border border-slate-100 p-4 grid grid-cols-2 gap-3">
                            <Field label="Full Name"     value={ref.patientName} />
                            <Field label="Age / Gender"  value={`${ref.age} yrs · ${ref.gender}`} />
                            <Field label="Phone"         value={ref.phone} />
                            <Field label="CNIC"          value={ref.cnic} />
                            <Field label="Guardian"      value={ref.guardianName} />
                            <Field label="Area"          value={ref.area} />
                          </div>
                        </div>

                        {/* Clinical + Lab */}
                        <div className="space-y-3">
                          <div>
                            <div className="flex items-center gap-2 text-slate-700 font-bold text-xs mb-3 uppercase tracking-wider">
                              <FileText className="w-3.5 h-3.5" /> Clinical Details
                            </div>
                            <div className="bg-white rounded-xl border border-slate-100 p-4 space-y-3">
                              <Field label="Diagnosis"     value={ref.diagnosisText} />
                              <Field label="Symptoms"      value={ref.symptomsText} />
                              {ref.summaryNotes && (
                                <div>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Clinical Summary & Tests</p>
                                  <p className="text-sm text-slate-700 whitespace-pre-line">{ref.summaryNotes}</p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Investigation status card */}
                          {inv && (
                            <div>
                              <div className="flex items-center gap-2 text-slate-700 font-bold text-xs mb-3 uppercase tracking-wider">
                                <Activity className="w-3.5 h-3.5" /> Investigation Status
                              </div>
                              <div className={`rounded-xl border p-4 ${invSt?.cls || ''}`}>
                                <div className="flex items-center gap-2 font-bold text-sm mb-2">
                                  <span className={`w-2 h-2 rounded-full ${invSt?.dot}`} />
                                  {invSt?.label}
                                  {inv.isStat && <span className="ml-auto px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-[10px] font-black">STAT</span>}
                                </div>
                                {inv.barcode && <p className="text-xs">Barcode: <strong>{inv.barcode}</strong></p>}
                                {inv.section && <p className="text-xs">Section: <strong>{inv.section}</strong></p>}
                                {inv.status === 'qc_failed' && inv.qcFailureReason && (
                                  <p className="text-xs text-red-600 mt-1">⚠️ {inv.qcFailureReason}</p>
                                )}
                                {inv.reportFileUrl && (
                                  <a
                                    href={inv.reportFileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-current/20 rounded-lg text-xs font-bold hover:opacity-80 transition-opacity"
                                  >
                                    📄 View Final Report
                                  </a>
                                )}

                                {/* Validated test results */}
                                {inv.investigations?.length > 0 && (
                                  <div className="mt-3 bg-white/60 rounded-lg overflow-hidden">
                                    <table className="w-full text-xs">
                                      <thead className="bg-white/80">
                                        <tr>
                                          <th className="px-3 py-2 text-left font-semibold">Test</th>
                                          <th className="px-3 py-2 text-left font-semibold">Result</th>
                                          <th className="px-3 py-2 text-left font-semibold">Ref Range</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-white/40">
                                        {inv.investigations.map((t, i) => (
                                          <tr key={i}>
                                            <td className="px-3 py-2 font-medium">{t.testName}</td>
                                            <td className={`px-3 py-2 font-bold ${t.isCritical ? 'text-red-600' : ''}`}>{t.resultValue}</td>
                                            <td className="px-3 py-2 opacity-70">{t.referenceRange || '—'}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Create Lab Referral Modal ──────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col">

            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-violet-100 rounded-xl flex items-center justify-center">
                  <FlaskConical className="w-5 h-5 text-violet-600" />
                </div>
                <div>
                  <h2 className="font-black text-slate-900 text-lg">Create Lab Referral</h2>
                  <p className="text-xs text-slate-500">Send an investigation order to a registered laboratory</p>
                </div>
              </div>
              <button
                type="button"
                id="close-lab-modal-btn"
                onClick={() => { setShowModal(false); resetForm(); }}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable form body */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <form id="lab-referral-form" onSubmit={handleSubmit} className="space-y-6">

                {/* ── Section 1: Patient Information ── */}
                <div>
                  <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <User className="w-3.5 h-3.5" /> Patient Information
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      id="lab-patient-name"
                      className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent"
                      placeholder="Patient Full Name *"
                      value={form.patientName}
                      onChange={e => setF('patientName', e.target.value)}
                      required
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        id="lab-patient-age"
                        type="number"
                        min="0"
                        max="120"
                        className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent"
                        placeholder="Age"
                        value={form.age}
                        onChange={e => setF('age', e.target.value)}
                      />
                      <select
                        id="lab-patient-gender"
                        className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent"
                        value={form.gender}
                        onChange={e => setF('gender', e.target.value)}
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <input
                      id="lab-patient-phone"
                      className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent"
                      placeholder="Mobile Number (03xxxxxxxxx) *"
                      value={form.phone}
                      onChange={e => setF('phone', e.target.value)}
                      required
                    />
                    <input
                      id="lab-patient-cnic"
                      className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent"
                      placeholder="Patient CNIC (XXXXX-XXXXXXX-X) *"
                      value={form.cnic}
                      onChange={e => setF('cnic', e.target.value)}
                      required
                    />
                    <input
                      id="lab-guardian-name"
                      className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent"
                      placeholder="Guardian Name *"
                      value={form.guardianName}
                      onChange={e => setF('guardianName', e.target.value)}
                      required
                    />
                    <input
                      id="lab-guardian-cnic"
                      className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent"
                      placeholder="Guardian CNIC (XXXXX-XXXXXXX-X) *"
                      value={form.guardianCnic}
                      onChange={e => setF('guardianCnic', e.target.value)}
                      required
                    />
                    <input
                      id="lab-patient-area"
                      className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent sm:col-span-2"
                      placeholder="Area / Locality"
                      value={form.area}
                      onChange={e => setF('area', e.target.value)}
                    />
                  </div>
                </div>

                {/* ── Section 2: Test Selection ── */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      <Beaker className="w-3.5 h-3.5" /> Tests to Order *
                    </h3>
                    {form.selectedTests.length > 0 && (
                      <span className="px-2.5 py-1 bg-violet-100 text-violet-700 text-xs font-black rounded-full">
                        {form.selectedTests.length} selected
                      </span>
                    )}
                  </div>

                  {/* Selected pills */}
                  {form.selectedTests.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3 p-3 bg-violet-50 rounded-xl">
                      {form.selectedTests.map(t => (
                        <span
                          key={`${t.dept}:${t.testName}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-violet-200 text-violet-700 rounded-full text-xs font-semibold"
                        >
                          {t.testName}
                          <button
                            type="button"
                            onClick={() => toggleTest(t.dept, t.testName)}
                            className="text-violet-400 hover:text-violet-700"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Department accordions */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                    {Object.entries(TEST_CATALOGUE).map(([dept, tests]) => {
                      const countInDept = form.selectedTests.filter(t => t.dept === dept).length;
                      return (
                        <div key={dept}>
                          <button
                            type="button"
                            id={`dept-toggle-${dept.toLowerCase().replace(/\s+/g, '-')}`}
                            onClick={() => toggleDept(dept)}
                            className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                          >
                            <span className="flex items-center gap-2">
                              {dept}
                              {countInDept > 0 && (
                                <span className="px-1.5 py-0.5 bg-violet-100 text-violet-700 text-[10px] font-black rounded-full">
                                  {countInDept}
                                </span>
                              )}
                            </span>
                            {openDepts[dept] ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                          </button>
                          {openDepts[dept] && (
                            <div className="px-4 pb-3 grid grid-cols-1 sm:grid-cols-2 gap-1.5 bg-slate-50/50">
                              {tests.map(test => {
                                const checked = form.selectedTests.some(t => t.dept === dept && t.testName === test);
                                return (
                                  <label
                                    key={test}
                                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-colors text-sm ${
                                      checked ? 'bg-violet-100 text-violet-800 font-semibold' : 'hover:bg-white text-slate-700'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      className="accent-violet-600 w-4 h-4"
                                      checked={checked}
                                      onChange={() => toggleTest(dept, test)}
                                    />
                                    {test}
                                  </label>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ── Section 3: Laboratory Selection ── */}
                <div>
                  <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Search className="w-3.5 h-3.5" /> Select Laboratory *
                  </h3>
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      id="lab-search-input"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent"
                      placeholder="Search by name, city, area..."
                      value={labSearch}
                      onChange={e => setLabSearch(e.target.value)}
                    />
                  </div>

                  {filteredLabs.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-sm">
                      {labs.length === 0 ? 'Loading laboratories...' : 'No laboratories match your search.'}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                      {filteredLabs.map(lab => {
                        const selected = form.targetLaboratoryId === lab._id;
                        return (
                          <button
                            key={lab._id}
                            type="button"
                            id={`lab-select-${lab._id}`}
                            onClick={() => setF('targetLaboratoryId', lab._id)}
                            className={`text-left p-3 rounded-xl border-2 transition-all ${
                              selected
                                ? 'border-violet-500 bg-violet-50'
                                : 'border-slate-100 hover:border-violet-200 bg-white'
                            }`}
                          >
                            <p className="font-bold text-sm text-slate-900">{lab.laboratoryName}</p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {lab.city}{lab.area ? ` · ${lab.area}` : ''}
                            </p>
                            {lab.departments?.length > 0 && (
                              <p className="text-[10px] text-violet-600 mt-1 truncate">
                                {lab.departments.slice(0, 4).join(' · ')}
                              </p>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* ── Section 4: Urgency & Clinical Notes ── */}
                <div>
                  <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5" /> Urgency & Clinical Notes
                  </h3>
                  <div className="space-y-3">

                    {/* Urgency radio */}
                    <div className="flex gap-2">
                      {[
                        { value: 'routine',   label: 'Routine',   color: 'border-blue-400 bg-blue-50 text-blue-700' },
                        { value: 'urgent',    label: 'Urgent',    color: 'border-orange-400 bg-orange-50 text-orange-700' },
                        { value: 'emergency', label: 'STAT',      color: 'border-red-500 bg-red-50 text-red-700' },
                      ].map(opt => (
                        <label
                          key={opt.value}
                          className={`flex-1 text-center border-2 rounded-xl py-2.5 cursor-pointer font-bold text-sm transition-all ${
                            form.urgency === opt.value ? opt.color : 'border-slate-200 text-slate-500 hover:border-slate-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="urgency"
                            value={opt.value}
                            className="sr-only"
                            checked={form.urgency === opt.value}
                            onChange={() => setF('urgency', opt.value)}
                          />
                          {opt.label}
                        </label>
                      ))}
                    </div>

                    <input
                      id="lab-preferred-date"
                      type="date"
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent"
                      min={new Date().toISOString().split('T')[0]}
                      value={form.preferredDate}
                      onChange={e => setF('preferredDate', e.target.value)}
                      placeholder="Preferred Sample Date (optional)"
                    />

                    <textarea
                      id="lab-diagnosis"
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent resize-none"
                      rows={2}
                      placeholder="Provisional Diagnosis"
                      value={form.diagnosisText}
                      onChange={e => setF('diagnosisText', e.target.value)}
                    />

                    <textarea
                      id="lab-symptoms"
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent resize-none"
                      rows={2}
                      placeholder="Symptoms / Presenting Complaints"
                      value={form.symptomsText}
                      onChange={e => setF('symptomsText', e.target.value)}
                    />

                    <textarea
                      id="lab-summary-notes"
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent resize-none"
                      rows={2}
                      placeholder="Additional clinical notes for the laboratory (optional)"
                      value={form.summaryNotes}
                      onChange={e => setF('summaryNotes', e.target.value)}
                    />
                  </div>
                </div>

              </form>
            </div>

            {/* Modal footer */}
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors"
              >
                <RotateCcw className="w-4 h-4" /> Reset form
              </button>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="lab-referral-form"
                  id="submit-lab-referral-btn"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-violet-600/25"
                >
                  {submitting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                  ) : (
                    <><ChevronRight className="w-4 h-4" /> Submit Referral</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConsultantLabReferrals;
