import { useEffect, useState, useCallback } from 'react';
import { Settings, Calculator, Percent, Shield, Wallet, Landmark, RefreshCw, ArrowRightLeft } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import Loader from '../../components/Loader';

const AdminSettings = () => {
  // Financial Engine Settings State
  const [hospPct, setHospPct] = useState(20);
  const [consPct, setConsPct] = useState(60);
  const [thresholdPKR, setThresholdPKR] = useState(10000);
  const [holdPKR, setHoldPKR] = useState(9500);

  // Estimator Slider States
  const [totalAmount, setTotalAmount] = useState(10000); // 10,000 PKR
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/admin/settings');
      if (res.data.success) {
        const d = res.data.data;
        setHospPct(d.defaultHospitalDeductionPercentage ?? 20);
        setConsPct(d.defaultConsultantCommissionPercentage ?? 60);
        setThresholdPKR((d.walletThresholdPaisa ?? 1000000) / 100);
        setHoldPKR((d.walletInitialHoldPaisa ?? 950000) / 100);
      }
    } catch (err) {
      toast.error('Failed to load platform settings');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.put('/admin/settings', {
        defaultHospitalDeductionPercentage: Number(hospPct),
        defaultConsultantCommissionPercentage: Number(consPct),
        walletThresholdPaisa: Number(thresholdPKR) * 100, // back to paisa
        walletInitialHoldPaisa: Number(holdPKR) * 100, // back to paisa
      });
      toast.success('Platform financial engine settings successfully updated!');
      await load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to update platform settings');
    } finally {
      setIsSaving(false);
    }
  };

  // Estimator Calculations based on settings
  const platformCut = Math.round(totalAmount * (hospPct / 100));
  const consultantShare = Math.round(platformCut * (consPct / 100));
  const hospitalNets = totalAmount - platformCut;
  const adminShare = platformCut - consultantShare;

  if (isLoading) {
    return <Loader message="Loading platform financial configuration..." />;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Title Header */}
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-xl shadow-slate-200">
          <Settings className="w-8 h-8 text-blue-400" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Platform Financial Engine</h1>
          <p className="text-slate-500 font-medium mt-1">Configure global percentage splits, wallet payouts, and holding reserves.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Settings Form */}
        <div className="lg:col-span-7 bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm space-y-6">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Percent className="text-blue-600" size={20} />
            Global Financial Settings
          </h2>

          <form onSubmit={save} className="space-y-6">
            {/* Split Percentages */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-xs font-black uppercase text-slate-500 tracking-wider">Default Hospital Cut (%)</label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={hospPct}
                    onChange={(e) => setHospPct(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                    className="w-full rounded-2xl border border-slate-200 px-5 py-4 font-mono text-lg focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">
                    %
                  </div>
                </div>
                <p className="text-[10px] text-slate-400">Fallback platform cut deducted from patient bill.</p>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-black uppercase text-slate-500 tracking-wider">Default Consultant split (%)</label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={consPct}
                    onChange={(e) => setConsPct(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                    className="w-full rounded-2xl border border-slate-200 px-5 py-4 font-mono text-lg focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">
                    %
                  </div>
                </div>
                <p className="text-[10px] text-slate-400">Physician share of the deducted platform cut.</p>
              </div>
            </div>

            {/* Wallet Thresholds */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 border-t border-slate-100 pt-6">
              <div className="space-y-2">
                <label className="block text-xs font-black uppercase text-slate-500 tracking-wider">Wallet Release Threshold (PKR)</label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    required
                    value={thresholdPKR}
                    onChange={(e) => setThresholdPKR(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full rounded-2xl border border-slate-200 px-5 py-4 font-mono text-lg focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs uppercase">
                    PKR
                  </div>
                </div>
                <p className="text-[10px] text-slate-400">Minimum balance to auto-trigger payout release.</p>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-black uppercase text-slate-500 tracking-wider">Initial Reserve Hold (PKR)</label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    required
                    value={holdPKR}
                    onChange={(e) => setHoldPKR(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full rounded-2xl border border-slate-200 px-5 py-4 font-mono text-lg focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs uppercase">
                    PKR
                  </div>
                </div>
                <p className="text-[10px] text-slate-400">Locked reserve amount retained in consultant wallet.</p>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-4 rounded-2xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-slate-200 flex items-center justify-center gap-2"
            >
              {isSaving ? 'Saving Configurations...' : (
                <>
                  <Shield size={18} className="text-blue-400" />
                  Save Financial Configuration
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Side: Real-Time Split Simulator Dashboard */}
        <div className="lg:col-span-5 bg-slate-950 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-blue-100 relative overflow-hidden space-y-6">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-32 -mt-32" />
          
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold flex items-center gap-2">
              <Calculator className="text-blue-400" size={18} />
              Real-Time Commission Simulator
            </h2>
            <span className="bg-white/10 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest text-blue-300">
              Live Flow
            </span>
          </div>

          <div className="space-y-6">
            {/* Total Patient Bill Paid Slider */}
            <div className="space-y-3 bg-white/5 border border-white/10 p-4 rounded-2xl">
              <div className="flex justify-between items-end">
                <span className="text-xs text-slate-400 font-medium">Admission Total Bill</span>
                <span className="text-lg font-black text-white">PKR {Number(totalAmount).toLocaleString()}</span>
              </div>
              <input
                type="range"
                min="1000"
                max="100000"
                step="1000"
                value={totalAmount}
                onChange={(e) => setTotalAmount(Number(e.target.value))}
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>

            {/* Split Flow Visualizer */}
            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Dynamic Distribution Breakdown</p>
              
              <div className="space-y-2">
                {/* Hospital Net */}
                <div className="flex justify-between items-center bg-white/5 border border-white/10 p-3.5 rounded-xl">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
                    <div>
                      <p className="text-xs font-bold">Hospital Receives</p>
                      <p className="text-[9px] text-slate-400">100% - Platform Cut ({100 - hospPct}%)</p>
                    </div>
                  </div>
                  <span className="text-sm font-extrabold text-teal-400">PKR {hospitalNets.toLocaleString()}</span>
                </div>

                {/* Platform Total Cut */}
                <div className="flex justify-between items-center bg-white/5 border border-white/10 p-3.5 rounded-xl">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    <div>
                      <p className="text-xs font-bold">Platform Total Cut</p>
                      <p className="text-[9px] text-slate-400">Deduction Percentage ({hospPct}%)</p>
                    </div>
                  </div>
                  <span className="text-sm font-extrabold text-blue-400">PKR {platformCut.toLocaleString()}</span>
                </div>

                {/* Sub-splits from Platform Cut */}
                <div className="pl-6 border-l-2 border-slate-800 space-y-2 mt-1">
                  {/* Consultant Share */}
                  <div className="flex justify-between items-center bg-white/5 border border-white/10 p-3 rounded-xl">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <div>
                        <p className="text-xs font-bold">Consultant Share</p>
                        <p className="text-[9px] text-slate-400">{consPct}% of Platform Cut</p>
                      </div>
                    </div>
                    <span className="text-xs font-black text-emerald-400">PKR {consultantShare.toLocaleString()}</span>
                  </div>

                  {/* Admin Net Share */}
                  <div className="flex justify-between items-center bg-white/5 border border-white/10 p-3 rounded-xl">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      <div>
                        <p className="text-xs font-bold">Platform Net Share</p>
                        <p className="text-[9px] text-slate-400">Admin Cut ({100 - consPct}%)</p>
                      </div>
                    </div>
                    <span className="text-xs font-black text-amber-400">PKR {adminShare.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Note Panel */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 flex gap-3 items-start text-slate-300">
              <ArrowRightLeft className="text-blue-400 shrink-0 mt-0.5" size={16} />
              <p className="text-[10px] leading-relaxed text-blue-200/90">
                This simulator demonstrates the live split logic. Payouts are computed mathematically to prevent rounding conflicts, automatically applying holding reserves when releasing balances.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
