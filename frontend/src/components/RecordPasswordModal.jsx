import { useState } from 'react';
import { Lock, Unlock, Key, ShieldCheck, X, Eye, EyeOff } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';

export const SetRecordPasswordModal = ({ isOpen, onClose, user, onSuccess, customEndpoint }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen || !user) return null;

  const endpoint = customEndpoint || `/admin/users/${user._id}`;

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await api.post(`${endpoint}/record-password`, { password });
      if (res.data.success) {
        toast.success(res.data.message);
        if (onSuccess) onSuccess(res.data.hasRecordPassword);
        onClose();
        setPassword('');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to set record password');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!window.confirm('Are you sure you want to remove password protection for this record?')) return;
    try {
      setLoading(true);
      const res = await api.post(`${endpoint}/record-password`, { password: '' });
      if (res.data.success) {
        toast.success('Password protection removed');
        if (onSuccess) onSuccess(false);
        onClose();
        setPassword('');
      }
    } catch (err) {
      toast.error('Failed to remove password protection');
    } finally {
      setLoading(false);
    }
  };

  const name = user.name || user.profile?.hospitalName || user.profile?.clinicName || 'User Record';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden space-y-0 transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Lock size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base">
                Record Password Protection
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                {name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
            {user.hasRecordPassword ? (
              <>
                <ShieldCheck className="text-emerald-500 shrink-0" size={18} />
                <span className="text-slate-600 dark:text-slate-300 font-semibold">
                  This record is currently <strong className="text-emerald-600 dark:text-emerald-400">Password Protected</strong>.
                </span>
              </>
            ) : (
              <>
                <Unlock className="text-slate-400 shrink-0" size={18} />
                <span className="text-slate-600 dark:text-slate-400">
                  No access password set for this record.
                </span>
              </>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Set Access Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter access password..."
                className="w-full px-3.5 py-2.5 pr-10 text-sm font-medium bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
              If set, viewing details, editing, suspending, or deleting this record will require this password.
            </p>
          </div>

          <div className="flex items-center gap-2.5 pt-2">
            <button
              type="submit"
              disabled={loading || !password.trim()}
              className="flex-1 py-2.5 px-4 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-extrabold text-sm rounded-xl shadow-md cursor-pointer transition-all active:scale-98 flex items-center justify-center gap-2"
            >
              <Key size={16} />
              {user.hasRecordPassword ? 'Update Password' : 'Set Password'}
            </button>
            {user.hasRecordPassword && (
              <button
                type="button"
                onClick={handleRemove}
                disabled={loading}
                className="py-2.5 px-3 bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 font-bold text-xs rounded-xl border border-red-200 dark:border-red-900/50 transition-all"
              >
                Remove
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export const VerifyRecordPasswordModal = ({ isOpen, onClose, user, onSuccess, actionName = 'access this record', customEndpoint }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen || !user) return null;

  const endpoint = customEndpoint || `/admin/users/${user._id}`;

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!password) {
      toast.error('Password is required');
      return;
    }
    try {
      setLoading(true);
      const res = await api.post(`${endpoint}/verify-record-password`, { password });
      if (res.data.success && res.data.verified) {
        toast.success('Password verified successfully');
        if (onSuccess) onSuccess();
        onClose();
        setPassword('');
      } else {
        toast.error(res.data.message || 'Incorrect password');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Incorrect record password');
    } finally {
      setLoading(false);
    }
  };

  const name = user.name || user.profile?.hospitalName || user.profile?.clinicName || 'User Record';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden space-y-0 transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-amber-500/5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-400">
              <Lock size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base">
                Password Protected Record
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleVerify} className="p-6 space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
            This record is protected with an access password. Please enter the record password to <strong className="text-slate-900 dark:text-white capitalize">{actionName}</strong>.
          </p>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Record Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter record password..."
                autoFocus
                className="w-full px-3.5 py-2.5 pr-10 text-sm font-medium bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !password}
              className="py-2.5 px-5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer transition-all active:scale-95 flex items-center gap-1.5"
            >
              <Key size={14} /> Verify & Proceed
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
