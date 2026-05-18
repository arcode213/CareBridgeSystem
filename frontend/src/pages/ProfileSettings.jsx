import { useState, useEffect } from 'react';
import { User, CreditCard, ShieldCheck, Save, Loader2, KeyRound, Eye, Link, Building2 } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { useAuth } from '../features/auth/AuthContext';

const ProfileSettings = () => {
  const { user: authUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  
  const [data, setData] = useState({
    user: { name: '', phone: '' },
    profile: {}
  });

  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await api.get('/profile/me');
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (err) {
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: data.user.name,
        phone: data.user.phone,
        ...data.profile
      };
      const res = await api.put('/profile/me', payload);
      if (res.data.success) {
        toast.success('Profile settings updated successfully');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!passwords.currentPassword) {
      toast.error('Please enter your current password');
      return;
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (passwords.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setChangingPassword(true);
    try {
      const res = await api.post('/profile/change-password', {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword
      });
      if (res.data.success) {
        toast.success('Password changed successfully');
        setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Profile & Security</h1>
        <p className="text-slate-500 text-sm mt-1">Manage your professional credentials, update profile details, and maintain secure access.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: Basic Info & Direct Change Password */}
        <div className="lg:col-span-1 space-y-8">
          
          {/* Basic Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-xs uppercase tracking-wider">
              <User size={16} className="text-blue-600" />
              Account Identity
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase">Full Name</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-100 focus:border-blue-600 focus:bg-white outline-none transition-all text-sm font-medium text-slate-800"
                  value={data.user.name}
                  onChange={(e) => setData({ ...data, user: { ...data.user, name: e.target.value } })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase">Email Address</label>
                <input 
                  type="email" disabled
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-100 border border-slate-100 text-slate-400 outline-none text-sm font-medium cursor-not-allowed"
                  value={data.user.email}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase">Phone Number</label>
                <input 
                  type="text"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-100 focus:border-blue-600 focus:bg-white outline-none transition-all text-sm font-medium text-slate-800"
                  value={data.user.phone}
                  onChange={(e) => setData({ ...data, user: { ...data.user, phone: e.target.value } })}
                />
              </div>
            </div>
          </div>

          {/* Change Password Card */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-xs uppercase tracking-wider">
              <KeyRound size={16} className="text-indigo-600" />
              Security & Credentials
            </div>
            <form onSubmit={handleChangePassword} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase">Current Password</label>
                <input 
                  type="password"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-100 focus:border-indigo-600 focus:bg-white outline-none transition-all text-sm font-medium"
                  placeholder="••••••••"
                  value={passwords.currentPassword}
                  onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase">New Password</label>
                <input 
                  type="password"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-100 focus:border-indigo-600 focus:bg-white outline-none transition-all text-sm font-medium"
                  placeholder="••••••••"
                  value={passwords.newPassword}
                  onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase">Confirm New Password</label>
                <input 
                  type="password"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-100 focus:border-indigo-600 focus:bg-white outline-none transition-all text-sm font-medium"
                  placeholder="••••••••"
                  value={passwords.confirmPassword}
                  onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                />
              </div>
              <button
                type="submit"
                disabled={changingPassword}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-100 text-xs disabled:opacity-50"
              >
                {changingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound size={14} />}
                Update Password
              </button>
            </form>
          </div>

        </div>

        {/* RIGHT COLUMN: Role-Specific Settings (Consultant or Hospital) */}
        <div className="lg:col-span-2 space-y-8">
          
          <form onSubmit={handleSaveProfile} className="space-y-8">
            
            {/* Consultant Profile Details */}
            {authUser.role === 'consultant' && (
              <>
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-xs uppercase tracking-wider">
                    <User size={16} className="text-teal-600" />
                    Clinical Credentials & Practice Details
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-5">
                    
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 uppercase">PMDC Number (Read-only)</label>
                        <input 
                          type="text" disabled
                          className="w-full px-4 py-2.5 rounded-xl bg-slate-100 border border-slate-100 text-slate-400 outline-none text-sm font-mono cursor-not-allowed"
                          value={data.profile.pmdcNumber || ''}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 uppercase">CNIC (Read-only)</label>
                        <input 
                          type="text" disabled
                          className="w-full px-4 py-2.5 rounded-xl bg-slate-100 border border-slate-100 text-slate-400 outline-none text-sm font-mono cursor-not-allowed"
                          value={data.profile.cnic || ''}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 uppercase">Specialization</label>
                        <input 
                          type="text"
                          className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-100 focus:border-blue-600 focus:bg-white outline-none transition-all text-sm font-medium"
                          value={data.profile.specialty || ''}
                          onChange={(e) => setData({
                            ...data,
                            profile: { ...data.profile, specialty: e.target.value }
                          })}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 uppercase">City</label>
                        <input 
                          type="text"
                          className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-100 focus:border-blue-600 focus:bg-white outline-none transition-all text-sm font-medium"
                          value={data.profile.city || ''}
                          onChange={(e) => setData({
                            ...data,
                            profile: { ...data.profile, city: e.target.value }
                          })}
                        />
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <label className="text-xs font-bold text-slate-400 uppercase">Clinic Address(es)</label>
                        <textarea 
                          rows={2}
                          className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-100 focus:border-blue-600 focus:bg-white outline-none transition-all text-sm font-medium resize-none"
                          value={data.profile.clinicAddress || ''}
                          onChange={(e) => setData({
                            ...data,
                            profile: { ...data.profile, clinicAddress: e.target.value }
                          })}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Consultant Wallet / Payout Settings */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-xs uppercase tracking-wider">
                    <CreditCard size={16} className="text-emerald-600" />
                    Preferred Payout Account
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-5">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-1 sm:col-span-2">
                        <label className="text-xs font-bold text-slate-400 uppercase">Account Type</label>
                        <div className="flex gap-3">
                          {['jazzcash', 'easypaisa', 'bank'].map(type => (
                            <button
                              key={type}
                              type="button"
                              onClick={() => setData({
                                ...data,
                                profile: {
                                  ...data.profile,
                                  payoutAccount: { ...data.profile.payoutAccount, accountType: type }
                                }
                              })}
                              className={`flex-1 py-2.5 rounded-xl text-xs font-bold uppercase transition-all ${
                                data.profile.payoutAccount?.accountType === type 
                                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' 
                                  : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                              }`}
                            >
                              {type}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 uppercase">Account Number</label>
                        <input 
                          type="text"
                          className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-100 focus:border-blue-600 focus:bg-white outline-none transition-all text-sm font-medium"
                          placeholder="e.g. 03XXXXXXXXX"
                          value={data.profile.payoutAccount?.accountNumber || ''}
                          onChange={(e) => setData({
                            ...data,
                            profile: {
                              ...data.profile,
                              payoutAccount: { ...data.profile.payoutAccount, accountNumber: e.target.value }
                            }
                          })}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 uppercase">Account Holder Name</label>
                        <input 
                          type="text"
                          className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-100 focus:border-blue-600 focus:bg-white outline-none transition-all text-sm font-medium"
                          placeholder="Full name as on account"
                          value={data.profile.payoutAccount?.accountHolder || ''}
                          onChange={(e) => setData({
                            ...data,
                            profile: {
                              ...data.profile,
                              payoutAccount: { ...data.profile.payoutAccount, accountHolder: e.target.value }
                            }
                          })}
                        />
                      </div>
                      {data.profile.payoutAccount?.accountType === 'bank' && (
                        <div className="space-y-1 sm:col-span-2">
                          <label className="text-xs font-bold text-slate-400 uppercase">Bank Name & Branch</label>
                          <input 
                            type="text"
                            className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-100 focus:border-blue-600 focus:bg-white outline-none transition-all text-sm font-medium"
                            placeholder="e.g. HBL - I.I Chundrigar Road"
                            value={data.profile.payoutAccount?.bankName || ''}
                            onChange={(e) => setData({
                              ...data,
                              profile: {
                                ...data.profile,
                                payoutAccount: { ...data.profile.payoutAccount, bankName: e.target.value }
                              }
                            })}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Consultant Verification Documents Viewer (READ-ONLY) */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-xs uppercase tracking-wider">
                    <ShieldCheck size={16} className="text-rose-600" />
                    Official Verification Documents (Read-only)
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                    <p className="text-xs text-slate-400 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      🔒 Uploaded official regulatory documents are strictly read-only after submission. To update your documents, please file an official support ticket.
                    </p>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {(data.profile.verificationDocuments || []).map((doc, idx) => (
                        <a 
                          key={idx}
                          href={doc.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-blue-600 hover:bg-blue-50/20 transition-all text-xs font-semibold text-slate-700"
                        >
                          <span className="truncate">{doc.name || 'Credential Attachment'}</span>
                          <Eye size={14} className="text-slate-400 hover:text-blue-600 shrink-0 ml-2" />
                        </a>
                      ))}
                      {(data.profile.verificationDocuments || []).length === 0 && (
                        <p className="text-xs text-slate-400 italic">No verification documents uploaded.</p>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Hospital Profile Details */}
            {authUser.role === 'hospital' && (
              <>
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-xs uppercase tracking-wider">
                    <Building2 size={16} className="text-teal-600" />
                    Facility Details & Registrations
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-5">
                    
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 uppercase">Hospital Name</label>
                        <input 
                          type="text"
                          className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-100 focus:border-blue-600 focus:bg-white outline-none transition-all text-sm font-medium"
                          value={data.profile.hospitalName || ''}
                          onChange={(e) => setData({
                            ...data,
                            profile: { ...data.profile, hospitalName: e.target.value }
                          })}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 uppercase">Registration Number</label>
                        <input 
                          type="text"
                          className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-100 focus:border-blue-600 focus:bg-white outline-none transition-all text-sm font-medium"
                          value={data.profile.registrationNumber || ''}
                          onChange={(e) => setData({
                            ...data,
                            profile: { ...data.profile, registrationNumber: e.target.value }
                          })}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 uppercase">City</label>
                        <input 
                          type="text"
                          className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-100 focus:border-blue-600 focus:bg-white outline-none transition-all text-sm font-medium"
                          value={data.profile.city || ''}
                          onChange={(e) => setData({
                            ...data,
                            profile: { ...data.profile, city: e.target.value }
                          })}
                        />
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <label className="text-xs font-bold text-slate-400 uppercase">Physical Address</label>
                        <textarea 
                          rows={2}
                          className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-100 focus:border-blue-600 focus:bg-white outline-none transition-all text-sm font-medium resize-none"
                          value={data.profile.address || ''}
                          onChange={(e) => setData({
                            ...data,
                            profile: { ...data.profile, address: e.target.value }
                          })}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Hospital JazzCash Credentials */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-xs uppercase tracking-wider">
                    <ShieldCheck size={16} className="text-emerald-600" />
                    Merchant Payment Gateway (JazzCash)
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-5">
                    <p className="text-xs text-slate-500 leading-relaxed bg-blue-50/50 p-3 rounded-xl border border-blue-100/50">
                      Configure your individual Merchant account credentials to receive patient payments directly.
                    </p>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 uppercase">Merchant ID</label>
                        <input 
                          type="text"
                          className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-100 focus:border-blue-600 focus:bg-white outline-none transition-all text-sm font-medium"
                          placeholder="e.g. MC12345"
                          value={data.profile.paymentGatewayCredentials?.merchantId || ''}
                          onChange={(e) => setData({
                            ...data,
                            profile: {
                              ...data.profile,
                              paymentGatewayCredentials: {
                                ...data.profile.paymentGatewayCredentials,
                                merchantId: e.target.value
                              }
                            }
                          })}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 uppercase">Password</label>
                        <input 
                          type="password"
                          className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-100 focus:border-blue-600 focus:bg-white outline-none transition-all text-sm font-medium"
                          placeholder="••••••••"
                          value={data.profile.paymentGatewayCredentials?.password || ''}
                          onChange={(e) => setData({
                            ...data,
                            profile: {
                              ...data.profile,
                              paymentGatewayCredentials: {
                                ...data.profile.paymentGatewayCredentials,
                                password: e.target.value
                              }
                            }
                          })}
                        />
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <label className="text-xs font-bold text-slate-400 uppercase">Integrity Salt</label>
                        <input 
                          type="text"
                          className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-100 focus:border-blue-600 focus:bg-white outline-none transition-all text-sm font-mono text-xs"
                          placeholder="32-character salt provided by JazzCash"
                          value={data.profile.paymentGatewayCredentials?.integritySalt || ''}
                          onChange={(e) => setData({
                            ...data,
                            profile: {
                              ...data.profile,
                              paymentGatewayCredentials: {
                                ...data.profile.paymentGatewayCredentials,
                                integritySalt: e.target.value
                              }
                            }
                          })}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Hospital Registration Documents Viewer (READ-ONLY) */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-xs uppercase tracking-wider">
                    <ShieldCheck size={16} className="text-rose-600" />
                    Official Registration Documents (Read-only)
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                    <p className="text-xs text-slate-400 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      🔒 Uploaded official regulatory documents are strictly read-only after submission. To update your documents, please file an official support ticket.
                    </p>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {(data.profile.registrationDocuments || []).map((doc, idx) => (
                        <a 
                          key={idx}
                          href={doc.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-blue-600 hover:bg-blue-50/20 transition-all text-xs font-semibold text-slate-700"
                        >
                          <span className="truncate">{doc.name || 'Registration Attachment'}</span>
                          <Eye size={14} className="text-slate-400 hover:text-blue-600 shrink-0 ml-2" />
                        </a>
                      ))}
                      {(data.profile.registrationDocuments || []).length === 0 && (
                        <p className="text-xs text-slate-400 italic">No registration documents uploaded.</p>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Admin Badge */}
            {authUser.role === 'admin' && (
              <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <ShieldCheck size={32} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Administrator Privilege Active</h3>
                  <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
                    You have complete master administrator credentials. To secure your account, ensure your password remains highly complex and unique.
                  </p>
                </div>
              </div>
            )}

            {/* Save Profile Button */}
            {authUser.role !== 'admin' && (
              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-200 disabled:opacity-50 text-sm"
                >
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save size={18} />}
                  Save Profile Changes
                </button>
              </div>
            )}

          </form>

        </div>

      </div>
    </div>
  );
};

export default ProfileSettings;
