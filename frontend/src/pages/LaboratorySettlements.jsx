import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { Receipt, Upload, CheckCircle, Clock, AlertCircle, ChevronDown, ChevronUp, FileText } from 'lucide-react';

const statusLabels = {
  pending_payment: 'Pending Payment',
  pending_admin_verification: 'Awaiting Verification',
  paid_pending_consultant_payout: 'Paid — Consultant Payout Pending',
  paid_pending_consultant_verification: 'Paid — Awaiting Consultant Verification',
  completed: 'Completed',
};

const statusColors = {
  pending_payment: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  pending_admin_verification: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  paid_pending_consultant_payout: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  paid_pending_consultant_verification: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
};

const LaboratorySettlements = () => {
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Create form state
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [billSummaryUrl, setBillSummaryUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedInvIds, setSelectedInvIds] = useState([]);

  // Receipt upload state
  const [receiptUrl, setReceiptUrl] = useState('');
  const [uploadSettlementId, setUploadSettlementId] = useState(null);
  
  const [isUploadingBill, setIsUploadingBill] = useState(false);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);

  const handleBillUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setIsUploadingBill(true);
      const uploadData = new FormData();
      uploadData.append('file', file);
      const res = await api.post('/upload', uploadData);
      if (res.data.success) {
        setBillSummaryUrl(res.data.url);
        toast.success('Bill summary uploaded');
      }
    } catch (err) {
      toast.error('Failed to upload bill summary');
    } finally {
      setIsUploadingBill(false);
    }
  };

  const handleReceiptUpload = async (e, settlementId) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setIsUploadingReceipt(true);
      setUploadSettlementId(settlementId);
      const uploadData = new FormData();
      uploadData.append('file', file);
      const res = await api.post('/upload', uploadData);
      if (res.data.success) {
        setReceiptUrl(res.data.url);
        toast.success('Receipt uploaded');
      }
    } catch (err) {
      toast.error('Failed to upload receipt');
    } finally {
      setIsUploadingReceipt(false);
    }
  };

  // Pending investigations (eligible for settlement)
  const { data: pendingInvestigations = [] } = useQuery({
    queryKey: ['lab-pending-investigations'],
    queryFn: async () => {
      const res = await api.get('/settlements/lab/pending-investigations');
      return res.data.data || [];
    },
    enabled: showCreateForm,
  });

  // Lab settlements list
  const { data: settlements = [], isLoading } = useQuery({
    queryKey: ['lab-settlements'],
    queryFn: async () => {
      const res = await api.get('/settlements/lab');
      return res.data.data || [];
    },
  });

  // Create settlement mutation
  const createMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post('/settlements/lab', payload);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Settlement created!');
      setShowCreateForm(false);
      setPeriodStart('');
      setPeriodEnd('');
      setBillSummaryUrl('');
      setNotes('');
      setSelectedInvIds([]);
      queryClient.invalidateQueries({ queryKey: ['lab-settlements'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to create settlement');
    },
  });

  // Upload receipt mutation
  const receiptMutation = useMutation({
    mutationFn: async ({ id, laboratoryReceiptFileUrl }) => {
      const res = await api.post(`/settlements/lab/${id}/upload-receipt`, { laboratoryReceiptFileUrl });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Receipt uploaded!');
      setReceiptUrl('');
      setUploadSettlementId(null);
      queryClient.invalidateQueries({ queryKey: ['lab-settlements'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to upload receipt');
    },
  });

  const toggleInv = (id) => {
    setSelectedInvIds((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
  };

  const handleCreate = () => {
    if (!periodStart || !periodEnd || !billSummaryUrl || selectedInvIds.length === 0) {
      return toast.error('Please fill all fields and select at least one investigation');
    }
    createMutation.mutate({
      billingPeriodStart: periodStart,
      billingPeriodEnd: periodEnd,
      labInvestigationIds: selectedInvIds,
      billSummaryFileUrl: billSummaryUrl,
      notes,
    });
  };

  const inputClass = "w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-violet-500 outline-none text-sm";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            <Receipt className="inline-block mr-2 -mt-1 text-violet-600" size={24} />
            Weekly Settlements
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Create and manage billing settlement cycles</p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-5 py-2.5 rounded-xl bg-violet-600 text-white font-bold text-sm hover:bg-violet-700 transition-all shadow-md"
        >
          {showCreateForm ? 'Cancel' : '+ New Settlement'}
        </button>
      </div>

      {/* Create Settlement Form */}
      {showCreateForm && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-violet-200 dark:border-violet-800 p-6 space-y-5 shadow-sm">
          <h2 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Create New Settlement</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Billing Period Start</label>
              <input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Billing Period End</label>
              <input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className={inputClass} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Bill Summary File</label>
            {billSummaryUrl ? (
              <div className="flex items-center justify-between p-3 rounded-xl border border-violet-200 bg-violet-50 dark:bg-violet-900/20 dark:border-violet-800">
                <a href={billSummaryUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-violet-700 dark:text-violet-400 font-bold underline truncate max-w-[200px]">
                  Bill Uploaded
                </a>
                <button onClick={() => setBillSummaryUrl('')} className="text-xs text-rose-500 font-bold hover:text-rose-700">Remove</button>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleBillUpload}
                  disabled={isUploadingBill}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100 disabled:opacity-50 cursor-pointer"
                />
                {isUploadingBill && <p className="text-xs text-violet-500 mt-2 animate-pulse">Uploading document...</p>}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Notes (optional)</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={`${inputClass} h-20 resize-none`} placeholder="Any additional notes..." />
          </div>

          {/* Eligible investigations */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Select Completed Investigations ({selectedInvIds.length} selected)
            </label>
            {pendingInvestigations.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No completed investigations available for settlement.</p>
            ) : (
              <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800">
                {pendingInvestigations.map((inv) => (
                  <label key={inv._id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={selectedInvIds.includes(inv._id)}
                      onChange={() => toggleInv(inv._id)}
                      className="rounded text-violet-600"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                        {inv.referralId?.patientName || 'Patient'} — {inv.referralId?.referralCode || '—'}
                      </p>
                      <p className="text-xs text-slate-500">
                        Bill: PKR {((inv.billTotalPaisa || 0) / 100).toLocaleString()}
                        {inv.calculatedPlatformCutPaisa && <span className="ml-2">• Platform: PKR {(inv.calculatedPlatformCutPaisa / 100).toLocaleString()}</span>}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={handleCreate}
            disabled={createMutation.isPending}
            className="w-full py-3 rounded-xl bg-violet-600 text-white font-bold text-sm hover:bg-violet-700 disabled:opacity-50 transition-all"
          >
            {createMutation.isPending ? 'Creating...' : 'Submit Settlement'}
          </button>
        </div>
      )}

      {/* Settlements List */}
      {isLoading ? (
        <div className="text-center py-16 text-sm text-slate-400">Loading settlements...</div>
      ) : settlements.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
          <Receipt size={48} className="mx-auto text-slate-200 dark:text-slate-700 mb-3" />
          <p className="text-sm text-slate-400 dark:text-slate-500">No settlements yet. Create your first settlement cycle above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {settlements.map((s) => {
            const isExpanded = expandedId === s._id;
            return (
              <div key={s._id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : s._id)}
                  className="w-full text-left px-5 py-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusColors[s.status] || 'bg-slate-100 text-slate-600'}`}>
                        {statusLabels[s.status] || s.status}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {new Date(s.billingPeriodStart).toLocaleDateString()} — {new Date(s.billingPeriodEnd).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white mt-1.5">
                      Gross: PKR {((s.grossAmountPaisa || 0) / 100).toLocaleString()}
                      <span className="text-slate-400 font-normal ml-3">
                        Platform: PKR {((s.calculatedPlatformCutPaisa || 0) / 100).toLocaleString()} ({s.deductionPercentage}%)
                      </span>
                    </p>
                  </div>
                  {isExpanded ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                </button>

                {isExpanded && (
                  <div className="px-5 pb-5 space-y-4 border-t border-slate-100 dark:border-slate-800 pt-4">
                    {/* Investigation count */}
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      <FileText size={12} className="inline mr-1" />
                      {s.labInvestigationIds?.length || 0} investigations included
                    </p>

                    {/* Bill summary */}
                    {s.billSummaryFileUrl && (
                      <a href={s.billSummaryFileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-violet-600 underline">
                        View Bill Summary
                      </a>
                    )}

                    {/* Rejection reason */}
                    {s.rejectionReason && (
                      <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                        <p className="text-xs font-bold text-red-700 dark:text-red-400">
                          <AlertCircle size={12} className="inline mr-1" />
                          Rejected: {s.rejectionReason}
                        </p>
                      </div>
                    )}

                    {/* Upload receipt if pending_payment */}
                    {s.status === 'pending_payment' && (
                      <div className="space-y-3">
                        <p className="text-xs font-bold text-amber-600 dark:text-amber-400">Upload payment receipt to proceed</p>
                        {uploadSettlementId === s._id && receiptUrl ? (
                          <div className="flex items-center justify-between p-3 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800">
                            <a href={receiptUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-amber-700 dark:text-amber-400 font-bold underline truncate max-w-[200px]">
                              Receipt Uploaded
                            </a>
                            <button onClick={() => setReceiptUrl('')} className="text-xs text-rose-500 font-bold hover:text-rose-700">Remove</button>
                          </div>
                        ) : (
                          <div className="relative">
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              onChange={(e) => handleReceiptUpload(e, s._id)}
                              disabled={isUploadingReceipt}
                              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100 disabled:opacity-50 cursor-pointer"
                            />
                            {isUploadingReceipt && uploadSettlementId === s._id && <p className="text-xs text-violet-500 mt-2 animate-pulse">Uploading receipt...</p>}
                          </div>
                        )}
                        <button
                          onClick={() => receiptMutation.mutate({ id: s._id, laboratoryReceiptFileUrl: receiptUrl })}
                          disabled={!receiptUrl.trim() || receiptMutation.isPending}
                          className="px-5 py-2.5 rounded-xl bg-violet-600 text-white font-bold text-sm hover:bg-violet-700 disabled:opacity-50 transition-all"
                        >
                          <Upload size={14} className="inline mr-1.5" />
                          {receiptMutation.isPending ? 'Uploading...' : 'Upload Receipt'}
                        </button>
                      </div>
                    )}

                    {/* Receipt uploaded */}
                    {s.laboratoryReceiptFileUrl && (
                      <a href={s.laboratoryReceiptFileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-600 underline">
                        <CheckCircle size={12} className="inline mr-1" />
                        View Payment Receipt
                      </a>
                    )}

                    {s.notes && <p className="text-xs text-slate-400 italic">Notes: {s.notes}</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LaboratorySettlements;
