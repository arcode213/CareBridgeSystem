import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  FlaskConical, CheckCircle2, Ban, Save, FileText, Upload, Receipt, Users, ClipboardList, Wallet, X, Eye,
} from 'lucide-react';
import api from '../../utils/api';
import { formatPkr } from '../../utils/formatPkr';
import toast from 'react-hot-toast';
import Loader from '../../components/Loader';
import LabReferralDetailModal from '../../components/LabReferralDetailModal';

const SUBTABS = [
  { key: 'labs', label: 'Labs', icon: FlaskConical },
  { key: 'referrals', label: 'Lab Referrals', icon: ClipboardList },
  { key: 'settlements', label: 'Settlements', icon: Receipt },
  { key: 'payouts', label: 'Payouts', icon: Wallet },
];

const uploadFile = async (file) => {
  const fd = new FormData();
  fd.append('file', file);
  const res = await api.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  if (!res.data.success) throw new Error('Upload failed');
  return res.data.url;
};

const inputClass = 'px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-sky-500 outline-none w-20';
const fullInput = 'w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-sky-500 outline-none';

// ── Full lab detail (profile edit + earnings + referrals) ───────────────────────
const LabDetailModal = ({ labId, onClose, onSaved }) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [referralDetailId, setReferralDetailId] = useState(null);

  const { data: lab } = useQuery({ queryKey: ['admin-lab', labId], queryFn: async () => (await api.get(`/admin/labs/${labId}`)).data.data });
  const { data: referrals = [] } = useQuery({ queryKey: ['admin-lab-refs', labId], queryFn: async () => (await api.get('/admin/labs/referrals', { params: { laboratoryId: labId } })).data.data });
  const { data: payoutsRes } = useQuery({ queryKey: ['admin-lab-pay', labId], queryFn: async () => (await api.get('/admin/labs/payouts', { params: { laboratoryId: labId } })).data });

  useEffect(() => {
    if (lab && !form) {
      setForm({
        labName: lab.labName || '', registrationNumber: lab.registrationNumber || '', city: lab.city || '', area: lab.area || '',
        address: lab.address || '', deductionPercentage: lab.deductionPercentage, maxConsultantDiscountPercentage: lab.maxConsultantDiscountPercentage,
      });
    }
  }, [lab, form]);
  const setF = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const save = async () => {
    try {
      setSaving(true);
      await api.patch(`/admin/labs/${labId}`, form);
      toast.success('Laboratory updated');
      queryClient.invalidateQueries({ queryKey: ['admin-lab', labId] });
      onSaved?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update lab');
    } finally {
      setSaving(false);
    }
  };

  const summary = payoutsRes?.summary || {};

  return (
    <div className="fixed inset-0 z-40 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-slate-50">{lab?.labName || 'Laboratory'}</h2>
            <p className="text-xs text-slate-500">{lab?.userId?.email} • {lab?.userId?.status}</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"><X size={18} /></button>
        </div>

        {!lab || !form ? (
          <div className="p-10 text-center text-slate-400 text-sm">Loading…</div>
        ) : (
          <div className="p-5 space-y-6">
            {/* Earnings summary */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-900 text-white rounded-xl p-4"><p className="text-[10px] text-slate-400 font-bold uppercase">Commission Total</p><p className="text-lg font-black text-sky-400 tabular-nums">{formatPkr(summary.totalPaisa || 0)}</p></div>
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-4"><p className="text-[10px] text-slate-400 font-bold uppercase">Paid</p><p className="text-lg font-black text-emerald-600 tabular-nums">{formatPkr(summary.paidPaisa || 0)}</p></div>
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-4"><p className="text-[10px] text-slate-400 font-bold uppercase">Accrued</p><p className="text-lg font-black text-amber-600 tabular-nums">{formatPkr(summary.accruedPaisa || 0)}</p></div>
            </div>

            {/* Editable profile */}
            <section className="space-y-3">
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-50">Profile & Economics</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className="text-xs font-bold text-slate-500">Lab name</label><input className={fullInput} value={form.labName} onChange={(e) => setF('labName', e.target.value)} /></div>
                <div><label className="text-xs font-bold text-slate-500">Registration #</label><input className={fullInput} value={form.registrationNumber} onChange={(e) => setF('registrationNumber', e.target.value)} /></div>
                <div><label className="text-xs font-bold text-slate-500">City</label><input className={fullInput} value={form.city} onChange={(e) => setF('city', e.target.value)} /></div>
                <div><label className="text-xs font-bold text-slate-500">Area</label><input className={fullInput} value={form.area} onChange={(e) => setF('area', e.target.value)} /></div>
                <div className="sm:col-span-2"><label className="text-xs font-bold text-slate-500">Address</label><input className={fullInput} value={form.address} onChange={(e) => setF('address', e.target.value)} /></div>
                <div><label className="text-xs font-bold text-slate-500">Platform deduction %</label><input type="number" className={fullInput} value={form.deductionPercentage} onChange={(e) => setF('deductionPercentage', Number(e.target.value))} /></div>
                <div><label className="text-xs font-bold text-slate-500">Max consultant discount %</label><input type="number" className={fullInput} value={form.maxConsultantDiscountPercentage} onChange={(e) => setF('maxConsultantDiscountPercentage', Number(e.target.value))} /></div>
              </div>
              <div className="flex justify-end">
                <button onClick={save} disabled={saving} className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-lg disabled:opacity-60"><Save size={15} /> Save</button>
              </div>
            </section>

            {/* Test catalog */}
            {lab.testCatalog?.length > 0 && (
              <section>
                <h3 className="text-sm font-black text-slate-900 dark:text-slate-50 mb-2">Test Catalog</h3>
                <div className="flex flex-wrap gap-1.5">
                  {lab.testCatalog.map((t, i) => <span key={i} className="px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-300 text-xs font-semibold">{t.testName} • {formatPkr(t.price)}</span>)}
                </div>
              </section>
            )}

            {/* Referrals */}
            <section>
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-50 mb-2">Referrals ({referrals.length})</h3>
              {referrals.length === 0 ? (
                <p className="text-xs text-slate-400">No referrals for this lab.</p>
              ) : (
                <div className="border border-slate-100 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800 max-h-64 overflow-y-auto">
                  {referrals.map((r) => (
                    <div key={r._id} onClick={() => setReferralDetailId(r._id)} className="flex items-center justify-between gap-2 px-4 py-2.5 text-xs cursor-pointer hover:bg-sky-50/50 dark:hover:bg-sky-950/10">
                      <div><span className="font-mono font-bold text-sky-600">{r.referralCode}</span><span className="text-slate-600 dark:text-slate-300 ml-2">{r.patientName}</span></div>
                      <div className="flex items-center gap-3"><span className="capitalize font-bold text-slate-500">{r.status}</span><span className="tabular-nums font-bold">{r.billTotalPaisa ? formatPkr(r.billTotalPaisa) : '—'}</span></div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>

      {referralDetailId && (
        <LabReferralDetailModal
          referralId={referralDetailId}
          editable
          onClose={() => setReferralDetailId(null)}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ['admin-lab-refs', labId] })}
        />
      )}
    </div>
  );
};

// ── Labs management ─────────────────────────────────────────────────────────────
const LabsPanel = () => {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [edits, setEdits] = useState({});
  const [detailLabId, setDetailLabId] = useState(null);

  const { data: labs = [], isLoading } = useQuery({
    queryKey: ['admin-labs', statusFilter],
    queryFn: async () => (await api.get('/admin/labs', { params: statusFilter ? { status: statusFilter } : {} })).data.data,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin-labs'] });

  const setStatus = async (id, status) => {
    try {
      await api.patch(`/admin/labs/${id}/status`, { status });
      toast.success(`Lab ${status === 'active' ? 'approved' : 'suspended'}`);
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const saveEconomics = async (lab) => {
    const e = edits[lab._id] || {};
    try {
      await api.patch(`/admin/labs/${lab._id}`, {
        deductionPercentage: e.deductionPercentage ?? lab.deductionPercentage,
        maxConsultantDiscountPercentage: e.maxConsultantDiscountPercentage ?? lab.maxConsultantDiscountPercentage,
      });
      toast.success('Updated');
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  if (isLoading) return <Loader message="Loading laboratories..." />;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {['', 'pending', 'active', 'suspended'].map((s) => (
          <button key={s || 'all'} onClick={() => setStatusFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-colors ${statusFilter === s ? 'bg-sky-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
            {s || 'all'}
          </button>
        ))}
      </div>

      {labs.length === 0 ? (
        <p className="text-sm text-slate-400 py-8 text-center">No laboratories.</p>
      ) : (
        labs.map((lab) => {
          const e = edits[lab._id] || {};
          const status = lab.userId?.status;
          return (
            <div key={lab._id} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-black text-slate-900 dark:text-slate-50">{lab.labName}</p>
                  <p className="text-xs text-slate-500">{lab.userId?.email} • {lab.city}{lab.area ? `, ${lab.area}` : ''} • Reg: {lab.registrationNumber || '—'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setDetailLabId(lab._id)} className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-sky-200 text-sky-700 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/20 font-bold text-xs rounded-lg"><Eye size={13} /> Details</button>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${status === 'active' ? 'bg-emerald-100 text-emerald-700' : status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{status}</span>
                </div>
              </div>

              {lab.registrationDocuments?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {lab.registrationDocuments.map((d, i) => (
                    <a key={i} href={d.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-2.5 py-1 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800"><FileText size={12} className="text-sky-600" /> {d.name}</a>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap items-end gap-4 border-t border-slate-50 dark:border-slate-800 pt-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Platform deduction %</label>
                  <input type="number" className={inputClass} defaultValue={lab.deductionPercentage} onChange={(ev) => setEdits((s) => ({ ...s, [lab._id]: { ...s[lab._id], deductionPercentage: Number(ev.target.value) } }))} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Max consultant discount %</label>
                  <input type="number" className={inputClass} defaultValue={lab.maxConsultantDiscountPercentage} onChange={(ev) => setEdits((s) => ({ ...s, [lab._id]: { ...s[lab._id], maxConsultantDiscountPercentage: Number(ev.target.value) } }))} />
                </div>
                <button onClick={() => saveEconomics(lab)} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 font-bold text-xs rounded-lg hover:bg-slate-200"><Save size={13} /> Save</button>

                <div className="ml-auto flex gap-2">
                  {status !== 'active' && (
                    <button onClick={() => setStatus(lab._id, 'active')} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg"><CheckCircle2 size={13} /> Approve</button>
                  )}
                  {status === 'active' && (
                    <button onClick={() => setStatus(lab._id, 'suspended')} className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 font-bold text-xs rounded-lg"><Ban size={13} /> Suspend</button>
                  )}
                </div>
              </div>
            </div>
          );
        })
      )}

      {detailLabId && (
        <LabDetailModal
          labId={detailLabId}
          onClose={() => setDetailLabId(null)}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ['admin-labs'] })}
        />
      )}
    </div>
  );
};

// ── Referrals oversight ─────────────────────────────────────────────────────────
const ReferralsPanel = () => {
  const queryClient = useQueryClient();
  const [detailId, setDetailId] = useState(null);
  const { data: referrals = [], isLoading } = useQuery({
    queryKey: ['admin-lab-referrals'],
    queryFn: async () => (await api.get('/admin/labs/referrals')).data.data,
  });
  if (isLoading) return <Loader message="Loading lab referrals..." />;
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-x-auto shadow-sm">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 dark:bg-slate-950/40 text-slate-500">
          <tr>
            <th className="text-left px-4 py-3 font-semibold">Code</th>
            <th className="text-left px-4 py-3 font-semibold">Patient</th>
            <th className="text-left px-4 py-3 font-semibold">Consultant</th>
            <th className="text-left px-4 py-3 font-semibold">Lab</th>
            <th className="text-left px-4 py-3 font-semibold">Status</th>
            <th className="text-left px-4 py-3 font-semibold">Bill</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {referrals.map((r) => (
            <tr key={r._id} onClick={() => setDetailId(r._id)} className="cursor-pointer hover:bg-sky-50/50 dark:hover:bg-sky-950/10 transition-colors">
              <td className="px-4 py-3 font-mono text-xs font-bold text-sky-600">{r.referralCode}</td>
              <td className="px-4 py-3">{r.patientName}</td>
              <td className="px-4 py-3">{r.consultantId?.userId?.name || '—'}</td>
              <td className="px-4 py-3">{r.targetLaboratoryId?.labName || '—'}</td>
              <td className="px-4 py-3"><span className="text-xs font-bold capitalize">{r.status}</span></td>
              <td className="px-4 py-3 tabular-nums">{r.billTotalPaisa ? formatPkr(r.billTotalPaisa) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {detailId && (
        <LabReferralDetailModal
          referralId={detailId}
          editable
          onClose={() => setDetailId(null)}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ['admin-lab-referrals'] })}
        />
      )}
    </div>
  );
};

// Per-status label + admin guidance for the settlement queue.
const SETTLEMENT_STATUS = {
  pending_payment: {
    label: 'Awaiting Lab Payment',
    cls: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
    hint: 'Waiting for the lab to pay the platform fee and upload its payment receipt. No admin action needed yet.',
  },
  pending_admin_verification: {
    label: 'Awaiting Your Verification',
    cls: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',
    hint: 'The lab uploaded a payment receipt — review it below, then approve or reject.',
  },
  paid_pending_consultant_payout: {
    label: 'Pay Consultants',
    cls: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400',
    hint: 'Payment verified. Upload a payout receipt for each consultant below.',
  },
  paid_pending_consultant_verification: {
    label: 'Awaiting Consultant Confirmation',
    cls: 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400',
    hint: 'Payouts dispatched. Waiting for consultants to confirm they received their payment.',
  },
  completed: {
    label: 'Completed',
    cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
    hint: 'All consultants confirmed their payouts. This settlement is closed.',
  },
};

// ── Settlements queue ───────────────────────────────────────────────────────────
const SettlementsPanel = () => {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState({});
  const { data: settlements = [], isLoading } = useQuery({
    queryKey: ['admin-lab-settlements'],
    queryFn: async () => (await api.get('/lab-settlements/admin')).data.data,
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin-lab-settlements'] });

  const verify = async (id, action) => {
    let rejectionReason;
    if (action === 'reject') {
      rejectionReason = window.prompt('Rejection reason:');
      if (!rejectionReason) return;
    }
    try {
      setBusy((b) => ({ ...b, [id]: true }));
      await api.post(`/lab-settlements/${id}/verify`, { action, rejectionReason });
      toast.success(`Settlement ${action}d`);
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setBusy((b) => ({ ...b, [id]: false }));
    }
  };

  const uploadPayout = async (settlementId, consultantId, file) => {
    if (!file) return;
    const key = `${settlementId}-${consultantId}`;
    try {
      setBusy((b) => ({ ...b, [key]: true }));
      const url = await uploadFile(file);
      await api.post(`/lab-settlements/${settlementId}/payout`, { consultantId, payoutReceiptFileUrl: url });
      toast.success('Payout receipt uploaded');
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setBusy((b) => ({ ...b, [key]: false }));
    }
  };

  if (isLoading) return <Loader message="Loading lab settlements..." />;

  if (settlements.length === 0) return <p className="text-sm text-slate-400 py-8 text-center">No lab settlements.</p>;

  return (
    <div className="space-y-4">
      {settlements.map((s) => (
        <div key={s._id} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-black text-slate-900 dark:text-slate-50">{s.laboratoryId?.labName}</p>
              <p className="text-xs text-slate-500">{new Date(s.billingPeriodStart).toLocaleDateString()} → {new Date(s.billingPeriodEnd).toLocaleDateString()} • {s.labReferralIds?.length || 0} cases</p>
            </div>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${(SETTLEMENT_STATUS[s.status] || {}).cls || 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>{(SETTLEMENT_STATUS[s.status] || {}).label || s.status?.replaceAll('_', ' ')}</span>
          </div>

          {SETTLEMENT_STATUS[s.status]?.hint && (
            <p className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/40 rounded-lg px-3 py-2">{SETTLEMENT_STATUS[s.status].hint}</p>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div><span className="text-slate-400 font-bold uppercase block">Gross</span><span className="font-extrabold tabular-nums">{formatPkr(s.grossAmountPaisa)}</span></div>
            <div><span className="text-slate-400 font-bold uppercase block">Platform Fee</span><span className="font-black text-sky-600 tabular-nums">{formatPkr(s.calculatedPlatformCutPaisa)}</span></div>
            <div><span className="text-slate-400 font-bold uppercase block">Deduction</span><span className="font-bold">{s.deductionPercentage}%</span></div>
          </div>

          <div className="flex flex-wrap gap-2">
            {s.billSummaryFileUrl && <a href={s.billSummaryFileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800"><FileText size={12} className="text-sky-600" /> Bill Summary</a>}
            {s.labReceiptFileUrl && <a href={s.labReceiptFileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800"><FileText size={12} className="text-sky-600" /> Payment Receipt</a>}
          </div>

          {s.status === 'pending_admin_verification' && (
            <div className="flex gap-2">
              <button onClick={() => verify(s._id, 'approve')} disabled={busy[s._id]} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg disabled:opacity-60">Approve Payment</button>
              <button onClick={() => verify(s._id, 'reject')} disabled={busy[s._id]} className="px-3 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 font-bold text-xs rounded-lg disabled:opacity-60">Reject</button>
            </div>
          )}

          {['paid_pending_consultant_payout', 'paid_pending_consultant_verification', 'completed'].includes(s.status) && s.consultantPayouts?.length > 0 && (
            <div className="border-t border-slate-50 dark:border-slate-800 pt-3 space-y-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Users size={12} /> Consultant Payouts</p>
              {s.consultantPayouts.map((pay) => {
                const key = `${s._id}-${pay.consultantId?._id || pay.consultantId}`;
                const cId = pay.consultantId?._id || pay.consultantId;
                return (
                  <div key={cId} className="flex items-center justify-between gap-3 bg-slate-50/60 dark:bg-slate-950/20 rounded-xl p-3 text-xs">
                    <div>
                      <p className="font-bold text-slate-700 dark:text-slate-300">Dr. {pay.consultantId?.userId?.name || 'Consultant'}</p>
                      <p className="text-slate-400">{formatPkr(pay.amountPaisa)} ({pay.commissionPercentage}%)</p>
                    </div>
                    {pay.status === 'verified' ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 font-bold"><CheckCircle2 size={13} /> Verified</span>
                    ) : pay.status === 'pending_verification' ? (
                      <span className="font-bold text-amber-600">Paid, awaiting consultant</span>
                    ) : (
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg cursor-pointer">
                        <Upload size={12} /> {busy[key] ? 'Uploading…' : 'Upload payout'}
                        <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(ev) => uploadPayout(s._id, cId, ev.target.files[0])} className="hidden" />
                      </label>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// ── Payouts ledger ──────────────────────────────────────────────────────────────
const PayoutsPanel = () => {
  const { data: payouts = [], isLoading } = useQuery({
    queryKey: ['admin-lab-payouts'],
    queryFn: async () => (await api.get('/admin/labs/payouts')).data.data,
  });
  if (isLoading) return <Loader message="Loading lab payouts..." />;
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-x-auto shadow-sm">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 dark:bg-slate-950/40 text-slate-500">
          <tr>
            <th className="text-left px-4 py-3 font-semibold">Consultant</th>
            <th className="text-left px-4 py-3 font-semibold">Lab</th>
            <th className="text-left px-4 py-3 font-semibold">Case</th>
            <th className="text-left px-4 py-3 font-semibold">Bill</th>
            <th className="text-left px-4 py-3 font-semibold">Commission</th>
            <th className="text-left px-4 py-3 font-semibold">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {payouts.map((p) => (
            <tr key={p._id}>
              <td className="px-4 py-3">{p.consultantId?.userId?.name || '—'}</td>
              <td className="px-4 py-3">{p.laboratoryId?.labName || '—'}</td>
              <td className="px-4 py-3 font-mono text-xs">{p.labReferralId?.referralCode || '—'}</td>
              <td className="px-4 py-3 tabular-nums">{formatPkr(p.totalBillPaisa)}</td>
              <td className="px-4 py-3 tabular-nums font-bold">{formatPkr(p.amountPaisa)}</td>
              <td className="px-4 py-3"><span className="text-xs font-bold capitalize">{p.status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const AdminLaboratory = () => {
  const [tab, setTab] = useState('labs');
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-start gap-3 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-600 text-white shadow-md">
          <FlaskConical className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-50">Laboratory</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Approve labs, set economics, oversee referrals, settlements, and payouts.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl w-fit">
        {SUBTABS.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.key} onClick={() => setTab(t.key)} className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${tab === t.key ? 'bg-white dark:bg-slate-900 text-sky-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
              <Icon size={15} /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'labs' && <LabsPanel />}
      {tab === 'referrals' && <ReferralsPanel />}
      {tab === 'settlements' && <SettlementsPanel />}
      {tab === 'payouts' && <PayoutsPanel />}
    </div>
  );
};

export default AdminLaboratory;
