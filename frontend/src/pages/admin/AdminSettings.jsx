import { useEffect, useState, useCallback } from 'react';
import { Settings } from 'lucide-react';
import api from '../../utils/api';

const AdminSettings = () => {
  const [payout, setPayout] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    const res = await api.get('/admin/settings');
    if (res.data.success) {
      setPayout(String(res.data.data.payoutPaisaPerClosedCase ?? 100000));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (e) => {
    e.preventDefault();
    setMsg('');
    try {
      await api.put('/admin/settings', { payoutPaisaPerClosedCase: Number(payout) });
      setMsg('Saved.');
    } catch (e) {
      setMsg(e.response?.data?.message || 'Failed');
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-xl bg-slate-200 text-slate-700">
          <Settings className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Platform settings</h1>
          <p className="text-slate-500 text-sm mt-1">Default consultant payout per closed case (paisa).</p>
        </div>
      </div>

      <form onSubmit={save} className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Payout per closed case (paisa)</label>
          <input
            type="number"
            min={0}
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5"
            value={payout}
            onChange={(e) => setPayout(e.target.value)}
          />
          <p className="text-xs text-slate-500 mt-1">100000 paisa = PKR 1,000</p>
        </div>
        {msg && <p className="text-sm text-slate-600">{msg}</p>}
        <button type="submit" className="w-full py-3 rounded-xl bg-slate-900 text-white font-semibold">
          Save
        </button>
      </form>
    </div>
  );
};

export default AdminSettings;
