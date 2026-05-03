import { useEffect, useState, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Building2, Users, Inbox, Wallet, Activity } from 'lucide-react';
import api from '../../utils/api';
import { formatPkr } from '../../utils/formatPkr';

const AdminOverview = () => {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await api.get('/admin/analytics');
      if (res.data.success) setData(res.data.data);
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed to load analytics');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (err) {
    return <div className="rounded-2xl bg-red-50 text-red-700 p-4 text-sm">{err}</div>;
  }
  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] text-slate-500">
        <Activity className="w-8 h-8 animate-pulse text-blue-500" />
      </div>
    );
  }

  const chartData = (data.topHospitals || []).map((h) => ({
    name: h.name?.length > 14 ? `${h.name.slice(0, 12)}…` : h.name,
    referrals: h.referrals,
  }));

  const cards = [
    { label: 'Total users', value: data.totalUsers, icon: Users, color: 'bg-blue-500' },
    { label: 'Pending approvals', value: data.pendingApprovals, icon: Inbox, color: 'bg-amber-500' },
    { label: 'Referrals (all time)', value: data.totalReferrals, icon: Activity, color: 'bg-violet-500' },
    { label: 'Active hospitals', value: data.activeHospitals, icon: Building2, color: 'bg-emerald-500' },
  ];

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Platform overview</h1>
        <p className="text-slate-500 mt-1 text-sm sm:text-base">Cross-hospital KPIs and referral volume (SRS FR-31).</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="rounded-2xl bg-white border border-slate-100 p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className={`inline-flex p-2 rounded-xl ${color} text-white mb-3`}>
              <Icon className="w-5 h-5" />
            </div>
            <p className="text-xs sm:text-sm font-medium text-slate-500">{label}</p>
            <p className="text-xl sm:text-2xl font-bold text-slate-900 mt-1 tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-white border border-slate-100 p-5 sm:p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Wallet className="w-5 h-5 text-emerald-600" />
            <h2 className="font-bold text-slate-900">Platform revenue (billed admissions)</h2>
          </div>
          <p className="text-3xl font-bold text-emerald-700 tabular-nums">{formatPkr(data.platformRevenuePaisa)}</p>
          <p className="text-sm text-slate-500 mt-2">Sum of finalized bills across hospitals (stored in paisa).</p>
        </div>

        <div className="rounded-2xl bg-white border border-slate-100 p-5 sm:p-6 shadow-sm min-h-[280px]">
          <h2 className="font-bold text-slate-900 mb-4">Top hospitals by referrals</h2>
          {chartData.length === 0 ? (
            <p className="text-slate-500 text-sm">No referral data yet.</p>
          ) : (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#64748b" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#64748b" allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }}
                    labelStyle={{ fontWeight: 600 }}
                  />
                  <Bar dataKey="referrals" fill="#3b82f6" radius={[6, 6, 0, 0]} name="Referrals" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminOverview;
