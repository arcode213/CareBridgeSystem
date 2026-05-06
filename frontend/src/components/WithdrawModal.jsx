import { useState } from 'react';
import { X, Landmark, Smartphone, ArrowRight } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { formatPkr } from '../utils/formatPkr';

const WithdrawModal = ({ isOpen, onClose, balancePaisa, onRefresh }) => {
  const [step, setStep] = useState(1);
  const [method, setMethod] = useState('jazzcash');
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    const amountPaisa = Math.round(Number(amount) * 100);
    if (amountPaisa < 50000) {
      return toast.error('Minimum withdrawal is 500 PKR');
    }
    if (amountPaisa > balancePaisa) {
      return toast.error('Insufficient balance');
    }
    if (!phone) {
      return toast.error('Please enter your mobile number');
    }

    setLoading(true);
    try {
      const res = await api.post('/referrals/withdraw', {
        amountPaisa,
        paymentMethod: method,
        mobileNumber: phone
      });
      if (res.data.success) {
        toast.success('Withdrawal request submitted!');
        onRefresh();
        onClose();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-900">Withdraw Funds</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        <div className="p-8 space-y-6">
          {step === 1 ? (
            <>
              <div className="space-y-4">
                <p className="text-sm font-medium text-slate-500">Select payout method</p>
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => setMethod('jazzcash')}
                    className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${method === 'jazzcash' ? 'border-blue-600 bg-blue-50/50 text-blue-700' : 'border-slate-100 hover:border-slate-200 text-slate-500'}`}
                  >
                    <Smartphone size={24} />
                    <span className="text-sm font-bold">JazzCash</span>
                  </button>
                  <button 
                    onClick={() => setMethod('easypaisa')}
                    className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${method === 'easypaisa' ? 'border-emerald-600 bg-emerald-50/50 text-emerald-700' : 'border-slate-100 hover:border-slate-200 text-slate-500'}`}
                  >
                    <Smartphone size={24} />
                    <span className="text-sm font-bold">EasyPaisa</span>
                  </button>
                </div>
              </div>
              <button 
                onClick={() => setStep(2)}
                className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl shadow-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
              >
                Next Step <ArrowRight size={18} />
              </button>
            </>
          ) : (
            <>
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Amount to Withdraw (PKR)</label>
                  <div className="relative">
                    <input 
                      type="number"
                      autoFocus
                      placeholder="500.00"
                      className="w-full px-5 py-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-blue-500 text-2xl font-black text-slate-900"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      Balance: {formatPkr(balancePaisa)}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{method === 'jazzcash' ? 'JazzCash' : 'EasyPaisa'} Mobile Number</label>
                  <input 
                    type="tel"
                    placeholder="03001234567"
                    className="w-full px-5 py-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-blue-500 text-lg font-bold text-slate-900"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setStep(1)}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all"
                >
                  Back
                </button>
                <button 
                  disabled={loading}
                  onClick={handleSubmit}
                  className="flex-[2] py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'Request Payout'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default WithdrawModal;
