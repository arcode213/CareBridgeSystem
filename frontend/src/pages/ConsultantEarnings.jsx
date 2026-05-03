import { useState, useEffect } from 'react';
import { Wallet, TrendingUp } from 'lucide-react';
import api from '../utils/api';
import { formatPkr } from '../utils/formatPkr';

const ConsultantEarnings = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEarnings = async () => {
      try {
        const res = await api.get('/referrals/earnings');
        if (res.data.success) setData(res.data.data);
      } catch (err) {
        console.error('Failed to fetch earnings:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchEarnings();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] text-slate-500">
        <Wallet className="w-8 h-8 animate-pulse text-blue-500" />
      </div>
    );
  }
  if (!data) {
    return <div className="text-center text-red-600 py-12">Could not load earnings.</div>;
  }

  const payouts = data.payouts || [];

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg">
          <Wallet className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Earnings</h1>
          <p className="text-slate-500 text-sm mt-1">Accrued payouts when hospitals close billed cases (§12.2).</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Total accrued (lifetime)</p>
              <p className="text-2xl sm:text-4xl font-bold mt-2 tabular-nums tracking-tight">{formatPkr(data.totalEarningsPaisa)}</p>
            </div>
            
            <div className="mt-6 pt-4 border-t border-white/20 flex flex-wrap items-center justify-between gap-4 text-sm">
              <div>
                <span className="text-blue-100 block text-xs">This month (running)</span>
                <span className="font-bold tabular-nums text-lg">{formatPkr(data.monthlyEarningsPaisa)}</span>
              </div>
              <button 
                onClick={() => alert('Withdrawal feature coming soon! (TODO)')}
                className="px-5 py-2.5 bg-white text-indigo-700 font-bold rounded-xl text-sm shadow-md hover:bg-blue-50 transition-colors active:scale-95"
              >
                Withdraw Funds
              </button>
            </div>
          </div>
          {/* Decorative background shapes */}
          <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-white opacity-10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -top-12 -left-12 w-32 h-32 bg-blue-400 opacity-20 rounded-full blur-2xl pointer-events-none"></div>
        </div>

        <div className="rounded-2xl bg-white border border-slate-100 p-6 shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow">
          <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-600 shadow-inner">
            <TrendingUp className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium uppercase tracking-wider">Active Outcomes</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">{data.referralCount}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 sm:px-8 py-5 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">Payout history</h2>
          <p className="text-xs text-slate-500 mt-1">Per-case accruals from completed admissions</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[480px]">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-5 sm:px-8 py-3 font-bold">Date</th>
                <th className="px-5 sm:px-8 py-3 font-bold">Referral</th>
                <th className="px-5 sm:px-8 py-3 font-bold">Status</th>
                <th className="px-5 sm:px-8 py-3 font-bold text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {payouts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-8 py-10 text-center text-slate-500">
                    No payouts yet — completed cases will appear here.
                  </td>
                </tr>
              ) : (
                payouts.map((p) => (
                  <tr key={p._id} className="hover:bg-slate-50/80">
                    <td className="px-5 sm:px-8 py-4 text-slate-600 whitespace-nowrap">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 sm:px-8 py-4 font-mono text-xs">{p.referralId?.referralCode || '—'}</td>
                    <td className="px-5 sm:px-8 py-4">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-xs font-bold">
                        {p.status}
                      </span>
                    </td>
                    <td className="px-5 sm:px-8 py-4 text-right font-semibold tabular-nums">
                      {formatPkr(p.amountPaisa)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ConsultantEarnings;
