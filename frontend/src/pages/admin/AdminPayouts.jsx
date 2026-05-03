import { useEffect, useState, useCallback } from 'react';
import { Banknote } from 'lucide-react';
import api from '../../utils/api';
import { formatPkr } from '../../utils/formatPkr';

const AdminPayouts = () => {
  const [rows, setRows] = useState([]);

  const load = useCallback(async () => {
    const res = await api.get('/admin/payouts');
    if (res.data.success) setRows(res.data.data || []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
          <Banknote className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payout log</h1>
          <p className="text-slate-500 text-sm mt-1">Consultant accruals when cases close (§12.2).</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 text-left">
            <tr>
              <th className="px-4 py-3 font-semibold">Date</th>
              <th className="px-4 py-3 font-semibold">Consultant</th>
              <th className="px-4 py-3 font-semibold">Referral</th>
              <th className="px-4 py-3 font-semibold">Amount</th>
              <th className="px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                  No payouts yet.
                </td>
              </tr>
            ) : (
              rows.map((p) => (
                <tr key={p._id} className="border-t border-slate-100">
                  <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                    {new Date(p.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{p.consultantId?.pmdcNumber || '—'}</td>
                  <td className="px-4 py-3">{p.referralId?.referralCode || '—'}</td>
                  <td className="px-4 py-3 font-medium tabular-nums">{formatPkr(p.amountPaisa)}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-semibold">
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminPayouts;
