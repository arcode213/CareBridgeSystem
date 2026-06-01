import { useQuery } from '@tanstack/react-query';
import { useBranding } from '../context/BrandingContext';
import api from '../utils/api';
import { FlaskConical, TestTubes, ClipboardCheck, AlertTriangle, FileText, Clock } from 'lucide-react';

const statusLabels = {
  order_received: 'Order Received',
  awaiting_collection: 'Awaiting Collection',
  collected: 'Collected',
  in_processing: 'In Processing',
  awaiting_validation: 'Awaiting Validation',
  completed: 'Completed',
  critical_value: 'Critical Value',
  qc_failed: 'QC Failed',
};

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

const LaboratoryDashboard = () => {
  const { effective } = useBranding();
  const brandPrimary = effective.primaryColor || '#7c3aed';

  const { data: profileData } = useQuery({
    queryKey: ['lab-profile'],
    queryFn: async () => {
      const res = await api.get('/laboratory/profile');
      return res.data.data;
    },
  });

  const { data: investigations = [] } = useQuery({
    queryKey: ['lab-investigations-all'],
    queryFn: async () => {
      const res = await api.get('/laboratory/investigations');
      return res.data.data || [];
    },
    refetchInterval: 15000,
  });

  // Compute stats
  const counts = {};
  Object.keys(statusLabels).forEach((s) => { counts[s] = 0; });
  investigations.forEach((inv) => { if (counts[inv.status] !== undefined) counts[inv.status]++; });
  const totalActive = investigations.filter((i) => i.status !== 'completed').length;
  const totalCompleted = counts.completed;
  const criticalCount = counts.critical_value;
  const qcFailedCount = counts.qc_failed;

  const statCards = [
    { label: 'Active Cases', value: totalActive, icon: TestTubes, color: 'text-violet-600 bg-violet-100 dark:bg-violet-900/30 dark:text-violet-400' },
    { label: 'Completed', value: totalCompleted, icon: ClipboardCheck, color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400' },
    { label: 'Critical Values', value: criticalCount, icon: AlertTriangle, color: 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400' },
    { label: 'QC Failures', value: qcFailedCount, icon: FileText, color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400' },
  ];

  // Pipeline stages for the visual tracker
  const pipelineStages = [
    { key: 'order_received', label: 'Orders', icon: '📩' },
    { key: 'awaiting_collection', label: 'Awaiting', icon: '⏳' },
    { key: 'collected', label: 'Collected', icon: '🧪' },
    { key: 'in_processing', label: 'Processing', icon: '⚗️' },
    { key: 'awaiting_validation', label: 'Validation', icon: '🔬' },
    { key: 'completed', label: 'Done', icon: '✅' },
  ];

  // Recent investigations (last 10, non-completed)
  const recentActive = investigations
    .filter((i) => i.status !== 'completed')
    .slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          <FlaskConical className="inline-block mr-2 -mt-1" size={26} style={{ color: brandPrimary }} />
          {profileData?.laboratoryName || 'Laboratory Dashboard'}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {profileData?.city}{profileData?.area ? `, ${profileData.area}` : ''} • License: {profileData?.licenseNumber || '—'}
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2.5 rounded-xl ${card.color}`}>
                <card.icon size={20} />
              </div>
              <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{card.label}</span>
            </div>
            <p className="text-3xl font-black text-slate-900 dark:text-white">{card.value}</p>
          </div>
        ))}
      </div>

      {/* 6-Stage Pipeline Visualizer */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm">
        <h2 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-5">Sample Pipeline</h2>
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {pipelineStages.map((stage, i) => (
            <div key={stage.key} className="flex items-center">
              <div className="flex flex-col items-center min-w-[80px]">
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold shadow-sm transition-all ${
                    counts[stage.key] > 0
                      ? 'bg-violet-100 dark:bg-violet-900/40 ring-2 ring-violet-400'
                      : 'bg-slate-50 dark:bg-slate-800'
                  }`}
                >
                  {stage.icon}
                </div>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400 mt-2">{stage.label}</span>
                <span className={`text-lg font-black mt-0.5 ${counts[stage.key] > 0 ? 'text-violet-600 dark:text-violet-400' : 'text-slate-300 dark:text-slate-600'}`}>
                  {counts[stage.key]}
                </span>
              </div>
              {i < pipelineStages.length - 1 && (
                <div className="w-6 h-0.5 bg-slate-200 dark:bg-slate-700 mx-1 mt-[-18px]"></div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Recent Active Investigations */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
            <Clock size={14} className="inline mr-1.5 -mt-0.5" />
            Active Investigations
          </h2>
        </div>
        {recentActive.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-400 dark:text-slate-500">
            No active investigations. New orders will appear here automatically.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {recentActive.map((inv) => (
              <div key={inv._id} className="px-5 py-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {inv.referralId?.patientName || 'Unknown Patient'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {inv.referralId?.referralCode || '—'} • {inv.section || 'Unassigned'}
                    {inv.isStat && <span className="ml-2 text-red-500 font-bold">⚡ STAT</span>}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusColors[inv.status] || 'bg-slate-100 text-slate-600'}`}>
                  {statusLabels[inv.status] || inv.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LaboratoryDashboard;
