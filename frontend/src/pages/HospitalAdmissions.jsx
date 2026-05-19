import { useState } from 'react';
import { ClipboardList, CheckCircle2, Wallet, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../utils/api';
import { formatPkr } from '../utils/formatPkr';
import toast from 'react-hot-toast';
import { useAdmissions, useHospitalPipeline } from '../hooks/useReferrals';
import { useQueryClient } from '@tanstack/react-query';
import Loader from '../components/Loader';

const PAYMENT_OPTIONS = [
  { value: 'cash', label: 'Cash' },
  { value: 'jazzcash', label: 'JazzCash' },
  { value: 'easypaisa', label: 'EasyPaisa' },
  { value: 'bank_transfer', label: 'Bank transfer' },
];

const HospitalAdmissions = () => {
  const queryClient = useQueryClient();
  const { data: pipeline = [], isLoading: pipelineLoading } = useHospitalPipeline();
  const { data: admissions = [], isLoading: admissionsLoading } = useAdmissions();
  
  const [expanded, setExpanded] = useState(null);
  const [form, setForm] = useState({
    serviceDesc: '',
    serviceAmount: '',
    billTotalPaisa: '',
    paymentMethod: 'cash',
    paymentReference: '',
  });

  const startAdmission = async (referralId) => {
    try {
      await api.post('/hospitals/admissions', { referralId });
      toast.success('Admission started!');
      queryClient.invalidateQueries({ queryKey: ['pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['admissions'] });
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not start admission');
    }
  };

  const saveAdmission = async (id) => {
    try {
      const services = [];
      if (form.serviceDesc && form.serviceAmount) {
        services.push({
          description: form.serviceDesc,
          amountPaisa: Math.round(Number(form.serviceAmount) * 100),
        });
      }
      await api.patch(`/hospitals/admissions/${id}`, {
        services,
        billTotalPaisa: Math.round(Number(form.billTotalPaisa) * 100),
        paymentMethod: form.paymentMethod,
        paymentReference: form.paymentReference || undefined,
      });
      toast.success('Billing draft saved.');
      setExpanded(null);
      queryClient.invalidateQueries({ queryKey: ['admissions'] });
    } catch (e) {
      toast.error(e.response?.data?.message || 'Update failed');
    }
  };

  const complete = async (id) => {
    try {
      // 1. Always save current form data first to ensure DB has the latest bill total
      const services = [];
      if (form.serviceDesc && form.serviceAmount) {
        services.push({
          description: form.serviceDesc,
          amountPaisa: Math.round(Number(form.serviceAmount) * 100),
        });
      }
      
      await api.patch(`/hospitals/admissions/${id}`, {
        services,
        billTotalPaisa: Math.round(Number(form.billTotalPaisa) * 100),
        paymentMethod: form.paymentMethod,
        paymentReference: form.paymentReference || undefined,
      });

      // 2. Handle JazzCash specifically
      if (form.paymentMethod === 'jazzcash') {
        const res = await api.get(`/payments/initiate-jazzcash/${id}`);
        if (res.data.success) {
          const { url, params } = res.data.data;
          const formEl = document.createElement('form');
          formEl.method = 'POST';
          formEl.action = url;
          Object.entries(params).forEach(([key, value]) => {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = key;
            input.value = value;
            formEl.appendChild(input);
          });
          document.body.appendChild(formEl);
          formEl.submit();
          return;
        }
      }

      // 3. Finalize for other methods
      await api.post(`/hospitals/admissions/${id}/complete`);
      toast.success('Case closed — consultant payout triggered.');
      setExpanded(null);
      queryClient.invalidateQueries({ queryKey: ['admissions'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline'] });
    } catch (e) {
      console.error('Finalization failed:', e);
      toast.error(e.response?.data?.message || 'Finalization failed. Ensure bill total and payment method are set.');
    }
  };

  if (pipelineLoading || admissionsLoading) {
    return <Loader message="Loading admissions..." />;
  }

  const needsAdmission = pipeline.filter((r) => r.status === 'accepted' && !r.admission);

  return (
    <div className="space-y-10 max-w-4xl mx-auto">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-xl bg-indigo-100 text-indigo-600">
          <ClipboardList className="w-7 h-7" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Admissions & billing</h1>
          <p className="text-slate-500 text-sm mt-1">
            Admit accepted referrals, record services in PKR, confirm payment (SRS §4.1, §12).
          </p>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          Awaiting admission ({needsAdmission.length})
        </h2>
        {needsAdmission.length === 0 ? (
          <p className="text-slate-500 text-sm py-6 bg-white rounded-2xl border border-dashed border-slate-200 text-center">
            No accepted referrals pending admission.
          </p>
        ) : (
          <ul className="space-y-3">
            {needsAdmission.map((r) => (
              <li key={r._id}
                className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden"
              >
                <div className="p-4 sm:p-5 flex flex-wrap justify-between gap-4 items-center">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 font-bold text-base flex items-center justify-center shrink-0">
                      {r.patientName?.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900">{r.patientName}</p>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">{r.referralCode}</p>
                      {r.assignedDepartment && (
                        <span className="inline-block mt-1 text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                          {r.assignedDepartment}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setExpanded(expanded === `pre-${r._id}` ? null : `pre-${r._id}`)}
                      className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors"
                      title="View patient details"
                    >
                      {expanded === `pre-${r._id}` ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => startAdmission(r._id)}
                      className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 shadow-sm"
                    >
                      Start admission
                    </button>
                  </div>
                </div>

                {/* Expandable patient info */}
                {expanded === `pre-${r._id}` && (
                  <div className="border-t border-slate-100 bg-slate-50 px-5 py-4 grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                    <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Age / Gender</p><p className="font-medium text-slate-700">{r.age}y · {r.gender}</p></div>
                    <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Phone</p><p className="font-medium text-slate-700">{r.phone || '—'}</p></div>
                    <div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Urgency</p><p className="font-medium text-slate-700 capitalize">{r.urgency}</p></div>
                    {r.symptomsText && (
                      <div className="col-span-2 sm:col-span-3">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Symptoms</p>
                        <p className="text-slate-700">{r.symptomsText}</p>
                      </div>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          Active & billing
        </h2>
        {admissions.length === 0 ? (
          <p className="text-slate-500 text-sm py-6 text-center">No admission records yet.</p>
        ) : (
          <ul className="space-y-4">
            {admissions.map((a) => (
              <li
                key={a._id}
                className="bg-white border border-slate-100 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3"
              >
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <p className="font-bold text-slate-900">{a.referralId?.patientName}</p>
                    <p className="text-xs font-mono text-slate-500">{a.referralId?.referralCode}</p>
                  </div>
                  <span
                    className={`text-xs font-bold px-2 py-1 rounded-lg ${
                      a.status === 'billed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-50 text-amber-800'
                    }`}
                  >
                    {a.status}
                  </span>
                </div>

                {a.status !== 'billed' && (
                  <>
                    {expanded === a._id ? (
                      <div className="mt-4 p-5 rounded-2xl bg-slate-50 border border-slate-100 shadow-inner">
                        <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-200">
                          <div>
                            <h3 className="font-bold text-slate-800">Finalize Billing & Payout</h3>
                            <p className="text-xs text-slate-500">Record services and confirm payment method</p>
                          </div>
                          <div className="text-right bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
                            <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">Consultant Payout Accrual</p>
                            <p className="font-bold text-blue-700">1,000 PKR <span className="font-normal text-xs text-blue-500">flat rate</span></p>
                          </div>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-600">Service Description</label>
                            <input
                              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                              placeholder="e.g. ICU Stay & Meds"
                              value={form.serviceDesc}
                              onChange={(e) => setForm({ ...form, serviceDesc: e.target.value })}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-600">Line Amount (PKR)</label>
                            <input
                              type="number"
                              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                              placeholder="0.00"
                              value={form.serviceAmount}
                              onChange={(e) => setForm({ ...form, serviceAmount: e.target.value })}
                            />
                          </div>
                          <div className="space-y-1 sm:col-span-2">
                            <label className="text-xs font-semibold text-slate-600">Total Patient Bill (PKR) <span className="text-red-500">*</span></label>
                            <input
                              type="number"
                              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-lg font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none transition-all bg-white shadow-sm"
                              placeholder="0.00"
                              value={form.billTotalPaisa}
                              onChange={(e) => setForm({ ...form, billTotalPaisa: e.target.value })}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-600">Payment Gateway <span className="text-red-500">*</span></label>
                            <select
                              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white"
                              value={form.paymentMethod}
                              onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                            >
                              {PAYMENT_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>
                                  {o.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-600">Transaction Ref (Optional)</label>
                            <input
                              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                              placeholder="e.g. TID-12345"
                              value={form.paymentReference}
                              onChange={(e) => setForm({ ...form, paymentReference: e.target.value })}
                            />
                          </div>
                        </div>

                        <div className="mt-6 flex flex-wrap gap-3 items-center justify-end border-t border-slate-200 pt-4">
                          <button
                            type="button"
                            onClick={() => setExpanded(null)}
                            className="px-4 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-200 rounded-xl transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => saveAdmission(a._id)}
                            className="px-5 py-2.5 rounded-xl bg-slate-800 text-white text-sm font-semibold shadow-md hover:bg-slate-900 transition-colors"
                          >
                            Save Draft
                          </button>
                          <button
                            type="button"
                            onClick={() => complete(a._id)}
                            className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold shadow-md shadow-emerald-200 hover:bg-emerald-700 transition-all flex items-center gap-2"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            Confirm Payment & Close
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setExpanded(a._id);
                          setForm({
                            serviceDesc: '',
                            serviceAmount: '',
                            billTotalPaisa: a.billTotalPaisa ? String(a.billTotalPaisa / 100) : '',
                            paymentMethod: a.paymentMethod || 'cash',
                            paymentReference: a.paymentReference || '',
                          });
                        }}
                        className="mt-3 px-4 py-2 bg-blue-50 text-blue-700 font-semibold rounded-xl text-sm hover:bg-blue-100 transition-colors w-fit flex items-center gap-2"
                      >
                        <Wallet className="w-4 h-4" />
                        Process Payment
                      </button>
                    )}
                  </>
                )}

                {a.billTotalPaisa > 0 && (
                  <p className="text-sm text-slate-600">
                    Bill: <span className="font-bold text-slate-900">{formatPkr(a.billTotalPaisa)}</span>
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default HospitalAdmissions;
