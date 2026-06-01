import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { Search, TestTubes, FlaskConical, Microscope, FileText, AlertTriangle, RefreshCw, ChevronDown, X } from 'lucide-react';

const STAGES = [
  { key: 'all', label: 'All', icon: '📋' },
  { key: 'order_received', label: 'Orders', icon: '📩' },
  { key: 'awaiting_collection', label: 'Awaiting', icon: '⏳' },
  { key: 'collected', label: 'Collected', icon: '🧪' },
  { key: 'in_processing', label: 'Processing', icon: '⚗️' },
  { key: 'awaiting_validation', label: 'Validation', icon: '🔬' },
  { key: 'critical_value', label: 'Critical', icon: '🚨' },
  { key: 'qc_failed', label: 'QC Failed', icon: '❌' },
  { key: 'completed', label: 'Done', icon: '✅' },
];

const statusColors = {
  order_received: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  awaiting_collection: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  collected: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  in_processing: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  awaiting_validation: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  critical_value: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  qc_failed: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
};

const LaboratoryInvestigations = () => {
  const queryClient = useQueryClient();
  const [activeStage, setActiveStage] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedInv, setSelectedInv] = useState(null);
  const [unlockCode, setUnlockCode] = useState('');

  // Action form state
  const [barcode, setBarcode] = useState('');
  const [section, setSection] = useState('');
  const [reportUrl, setReportUrl] = useState('');
  const [billAmount, setBillAmount] = useState('');
  const [testResults, setTestResults] = useState([{ testName: '', resultValue: '', referenceRange: '', isCritical: false }]);
  const [qcFailed, setQcFailed] = useState(false);
  const [qcReason, setQcReason] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setIsUploading(true);
      const uploadData = new FormData();
      uploadData.append('file', file);
      const res = await api.post('/upload', uploadData);
      if (res.data.success) {
        setReportUrl(res.data.url);
        toast.success('File uploaded successfully');
      }
    } catch (err) {
      toast.error('Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  };

  const { data: investigations = [], isLoading } = useQuery({
    queryKey: ['lab-investigations', activeStage],
    queryFn: async () => {
      const params = activeStage !== 'all' ? `?status=${activeStage}` : '';
      const res = await api.get(`/laboratory/investigations${params}`);
      return res.data.data || [];
    },
    refetchInterval: 10000,
  });

  // Unlock patient mutation
  const unlockMutation = useMutation({
    mutationFn: async (referralCode) => {
      const res = await api.post('/laboratory/unlock-patient', { referralCode });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Patient unlocked!');
      setUnlockCode('');
      queryClient.invalidateQueries({ queryKey: ['lab-investigations'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to unlock patient');
    },
  });

  // Collect sample mutation
  const collectMutation = useMutation({
    mutationFn: async ({ id, barcode }) => {
      const res = await api.post(`/laboratory/investigations/${id}/collect`, { barcode });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Sample collected!');
      setBarcode('');
      setSelectedInv(null);
      queryClient.invalidateQueries({ queryKey: ['lab-investigations'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to collect sample');
    },
  });

  // Route to section mutation
  const processMutation = useMutation({
    mutationFn: async ({ id, section }) => {
      const res = await api.post(`/laboratory/investigations/${id}/process`, { section });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Sample routed!');
      setSection('');
      setSelectedInv(null);
      queryClient.invalidateQueries({ queryKey: ['lab-investigations'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to route sample');
    },
  });

  // Validate results mutation
  const validateMutation = useMutation({
    mutationFn: async ({ id, investigations, isCritical, qcFailed, qcFailureReason }) => {
      const res = await api.post(`/laboratory/investigations/${id}/validate`, {
        investigations, isCritical, qcFailed, qcFailureReason,
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Results validated!');
      setTestResults([{ testName: '', resultValue: '', referenceRange: '', isCritical: false }]);
      setQcFailed(false);
      setQcReason('');
      setSelectedInv(null);
      queryClient.invalidateQueries({ queryKey: ['lab-investigations'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Validation failed');
    },
  });

  // Upload report mutation
  const uploadMutation = useMutation({
    mutationFn: async ({ id, reportFileUrl, billTotalPaisa }) => {
      const res = await api.post(`/laboratory/investigations/${id}/upload`, {
        reportFileUrl, billTotalPaisa,
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Report uploaded!');
      setReportUrl('');
      setBillAmount('');
      setSelectedInv(null);
      queryClient.invalidateQueries({ queryKey: ['lab-investigations'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Upload failed');
    },
  });

  const filtered = investigations.filter((inv) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      inv.referralId?.patientName?.toLowerCase().includes(q) ||
      inv.referralId?.referralCode?.toLowerCase().includes(q) ||
      inv.barcode?.toLowerCase().includes(q)
    );
  });

  const addTestRow = () => {
    setTestResults([...testResults, { testName: '', resultValue: '', referenceRange: '', isCritical: false }]);
  };
  const updateTestRow = (idx, field, value) => {
    setTestResults(testResults.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  };
  const removeTestRow = (idx) => {
    if (testResults.length > 1) setTestResults(testResults.filter((_, i) => i !== idx));
  };

  const renderActionPanel = (inv) => {
    if (!inv) return null;
    const s = inv.status;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setSelectedInv(null)}>
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{inv.referralId?.patientName || 'Patient'}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">{inv.referralId?.referralCode} • {inv.section || 'Unassigned'}</p>
            </div>
            <button onClick={() => setSelectedInv(null)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* Stage 2/3: Collect Sample */}
          {(s === 'order_received' || s === 'awaiting_collection') && (
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-600 dark:text-slate-300">🧪 Collect Sample</h4>
              <input
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="Scan or enter barcode"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-violet-500 outline-none text-sm"
              />
              <button
                onClick={() => collectMutation.mutate({ id: inv._id, barcode })}
                disabled={!barcode.trim() || collectMutation.isPending}
                className="w-full py-3 rounded-xl bg-cyan-600 text-white font-bold text-sm hover:bg-cyan-700 disabled:opacity-50 transition-all"
              >
                {collectMutation.isPending ? 'Collecting...' : 'Confirm Collection'}
              </button>
            </div>
          )}

          {/* Stage 4: Route to Section */}
          {s === 'collected' && (
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-600 dark:text-slate-300">⚗️ Route to Section</h4>
              <select
                value={section}
                onChange={(e) => setSection(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-violet-500 outline-none text-sm"
              >
                <option value="">Select Department</option>
                {['Biochemistry', 'Haematology', 'Microbiology', 'Histopathology', 'Immunology', 'Molecular Biology', 'Radiology', 'Serology', 'Cytology', 'Toxicology', 'Clinical Pathology', 'Genetics'].map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <button
                onClick={() => processMutation.mutate({ id: inv._id, section })}
                disabled={!section || processMutation.isPending}
                className="w-full py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 disabled:opacity-50 transition-all"
              >
                {processMutation.isPending ? 'Routing...' : 'Route Sample'}
              </button>
            </div>
          )}

          {/* Stage 5: Validate Results */}
          {s === 'in_processing' && (
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-600 dark:text-slate-300">🔬 Enter & Validate Results</h4>

              {testResults.map((row, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                  <input
                    className="col-span-4 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-xs"
                    placeholder="Test Name"
                    value={row.testName}
                    onChange={(e) => updateTestRow(idx, 'testName', e.target.value)}
                  />
                  <input
                    className="col-span-3 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-xs"
                    placeholder="Result"
                    value={row.resultValue}
                    onChange={(e) => updateTestRow(idx, 'resultValue', e.target.value)}
                  />
                  <input
                    className="col-span-3 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-xs"
                    placeholder="Ref Range"
                    value={row.referenceRange}
                    onChange={(e) => updateTestRow(idx, 'referenceRange', e.target.value)}
                  />
                  <label className="col-span-1 flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={row.isCritical}
                      onChange={(e) => updateTestRow(idx, 'isCritical', e.target.checked)}
                      className="rounded text-red-500"
                    />
                  </label>
                  <button onClick={() => removeTestRow(idx)} className="col-span-1 text-slate-400 hover:text-red-500 text-xs">✕</button>
                </div>
              ))}
              <button onClick={addTestRow} className="text-xs font-bold text-violet-600 hover:text-violet-700">
                + Add Test
              </button>

              <div className="flex items-center gap-3 p-3 bg-rose-50 dark:bg-rose-900/20 rounded-xl border border-rose-200 dark:border-rose-800">
                <label className="flex items-center gap-2 text-sm font-medium text-rose-700 dark:text-rose-400">
                  <input type="checkbox" checked={qcFailed} onChange={(e) => setQcFailed(e.target.checked)} className="rounded" />
                  QC Failed — Request Resample
                </label>
              </div>
              {qcFailed && (
                <input
                  type="text"
                  value={qcReason}
                  onChange={(e) => setQcReason(e.target.value)}
                  placeholder="Reason for QC failure"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-sm"
                />
              )}

              <button
                onClick={() => {
                  const hasCritical = testResults.some((r) => r.isCritical);
                  validateMutation.mutate({
                    id: inv._id,
                    investigations: testResults.filter((r) => r.testName),
                    isCritical: hasCritical,
                    qcFailed,
                    qcFailureReason: qcReason,
                  });
                }}
                disabled={validateMutation.isPending}
                className="w-full py-3 rounded-xl bg-purple-600 text-white font-bold text-sm hover:bg-purple-700 disabled:opacity-50 transition-all"
              >
                {validateMutation.isPending ? 'Validating...' : qcFailed ? 'Submit QC Failure' : 'Validate Results'}
              </button>
            </div>
          )}

          {/* Stage 6: Upload Report */}
          {(s === 'awaiting_validation' || s === 'critical_value') && (
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-600 dark:text-slate-300">📄 Upload Final Report</h4>
              {s === 'critical_value' && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                  <AlertTriangle size={16} className="text-red-600" />
                  <span className="text-xs font-bold text-red-700 dark:text-red-400">Critical value detected — urgent review required</span>
                </div>
              )}
              {reportUrl ? (
                <div className="flex items-center justify-between p-3 rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-800">
                  <a href={reportUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-emerald-700 dark:text-emerald-400 font-bold underline truncate max-w-[200px]">
                    Report Uploaded
                  </a>
                  <button onClick={() => setReportUrl('')} className="text-xs text-rose-500 font-bold hover:text-rose-700">Remove</button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100 disabled:opacity-50 cursor-pointer"
                  />
                  {isUploading && <p className="text-xs text-violet-500 mt-2 animate-pulse">Uploading document...</p>}
                </div>
              )}
              <input
                type="number"
                value={billAmount}
                onChange={(e) => setBillAmount(e.target.value)}
                placeholder="Total bill amount (PKR)"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-sm"
              />
              <button
                onClick={() => uploadMutation.mutate({
                  id: inv._id,
                  reportFileUrl: reportUrl,
                  billTotalPaisa: billAmount ? Number(billAmount) * 100 : undefined,
                })}
                disabled={!reportUrl.trim() || uploadMutation.isPending}
                className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 disabled:opacity-50 transition-all"
              >
                {uploadMutation.isPending ? 'Uploading...' : 'Upload & Finalize'}
              </button>
            </div>
          )}

          {/* Completed — view only */}
          {s === 'completed' && (
            <div className="space-y-3">
              <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">✅ Investigation Completed</p>
                {inv.reportFileUrl && (
                  <a href={inv.reportFileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-600 underline mt-1 block">View Report</a>
                )}
                <p className="text-xs text-slate-500 mt-1">Bill: PKR {((inv.billTotalPaisa || 0) / 100).toLocaleString()}</p>
              </div>
            </div>
          )}

          {/* QC Failed — re-sample needed */}
          {s === 'qc_failed' && (
            <div className="space-y-3">
              <div className="p-4 bg-rose-50 dark:bg-rose-900/20 rounded-xl border border-rose-200 dark:border-rose-800">
                <p className="text-sm font-bold text-rose-700 dark:text-rose-400">❌ QC Failed — Resample Required</p>
                <p className="text-xs text-slate-500 mt-1">Reason: {inv.qcFailureReason || 'Not specified'}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            <Microscope className="inline-block mr-2 -mt-1 text-violet-600" size={24} />
            Investigations Workbench
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage the full diagnostic pipeline</p>
        </div>

        {/* Unlock Patient */}
        <div className="flex gap-2">
          <input
            type="text"
            value={unlockCode}
            onChange={(e) => setUnlockCode(e.target.value.toUpperCase())}
            placeholder="Referral Code"
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-sm w-40 focus:ring-2 focus:ring-violet-500 outline-none"
          />
          <button
            onClick={() => unlockMutation.mutate(unlockCode)}
            disabled={!unlockCode.trim() || unlockMutation.isPending}
            className="px-4 py-2.5 rounded-xl bg-violet-600 text-white font-bold text-sm hover:bg-violet-700 disabled:opacity-50 transition-all whitespace-nowrap"
          >
            {unlockMutation.isPending ? '...' : '🔓 Unlock'}
          </button>
        </div>
      </div>

      {/* Stage Filter Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        {STAGES.map((stage) => (
          <button
            key={stage.key}
            onClick={() => setActiveStage(stage.key)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeStage === stage.key
                ? 'bg-violet-600 text-white shadow-md shadow-violet-600/20'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-violet-400'
            }`}
          >
            {stage.icon} {stage.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by patient name, referral code, or barcode..."
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-sm focus:ring-2 focus:ring-violet-500 outline-none"
        />
      </div>

      {/* Investigation Cards */}
      {isLoading ? (
        <div className="text-center py-16">
          <RefreshCw className="animate-spin mx-auto text-violet-400" size={32} />
          <p className="text-sm text-slate-400 mt-3">Loading investigations...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
          <FlaskConical size={48} className="mx-auto text-slate-200 dark:text-slate-700 mb-3" />
          <p className="text-sm text-slate-400 dark:text-slate-500">No investigations found for this filter.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((inv) => (
            <button
              key={inv._id}
              onClick={() => setSelectedInv(inv)}
              className="w-full text-left bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 hover:shadow-md hover:border-violet-200 dark:hover:border-violet-800 transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {inv.referralId?.patientName || 'Unknown Patient'}
                    </p>
                    {inv.isStat && (
                      <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full text-[10px] font-black">STAT</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {inv.referralId?.referralCode || '—'}
                    {inv.barcode && <span className="ml-2">BC: {inv.barcode}</span>}
                    {inv.section && <span className="ml-2">• {inv.section}</span>}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    Consultant: {inv.consultantId?.userId?.name || '—'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusColors[inv.status] || 'bg-slate-100 text-slate-600'}`}>
                    {STAGES.find((s) => s.key === inv.status)?.label || inv.status}
                  </span>
                  <ChevronDown size={16} className="text-slate-300 group-hover:text-violet-500 transition-colors" />
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Action Modal */}
      {selectedInv && renderActionPanel(selectedInv)}
    </div>
  );
};

export default LaboratoryInvestigations;
