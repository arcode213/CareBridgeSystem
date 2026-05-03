import { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import { Inbox } from 'lucide-react';
import api from '../utils/api';
import { SOCKET_URL } from '../config';

function formatSlaCountdown(deadline, now) {
  if (!deadline) return '—';
  const end = new Date(deadline).getTime();
  const ms = end - now;
  if (ms <= 0) return 'OVERDUE';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const ReferralInbox = () => {
  const [referrals, setReferrals] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => Date.now());
  const [acceptFor, setAcceptFor] = useState(null);
  const [deptChoice, setDeptChoice] = useState('');

  const fetchInbox = useCallback(async () => {
    try {
      const res = await api.get('/referrals/inbox');
      if (res.data.success) setReferrals(res.data.data);
    } catch (err) {
      console.error('Failed to fetch inbox:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDepartments = useCallback(async () => {
    try {
      const res = await api.get('/hospitals/dashboard');
      if (res.data.success) setDepartments(res.data.data.departments || []);
    } catch {
      setDepartments([]);
    }
  }, []);

  useEffect(() => {
    fetchInbox();
    loadDepartments();
  }, [fetchInbox, loadDepartments]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return undefined;
    const socket = io(SOCKET_URL, { transports: ['websocket'] });
    socket.emit('join_hospital', { token });
    const refresh = () => fetchInbox();
    socket.on('NEW_REFERRAL', refresh);
    socket.on('REFERRAL_ESCALATED', refresh);
    return () => socket.disconnect();
  }, [fetchInbox]);

  const submitAccept = async () => {
    if (!acceptFor) return;
    if (departments.length && !deptChoice) {
      alert('Select a department for routing (FR-23).');
      return;
    }
    try {
      const body = {
        status: 'accepted',
        assignedDepartment: deptChoice || departments[0] || undefined,
      };
      const res = await api.patch(`/referrals/${acceptFor}/status`, body);
      if (res.data.success) {
        setAcceptFor(null);
        setDeptChoice('');
        fetchInbox();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Accept failed');
    }
  };

  const handleReject = async (id) => {
    const reason = prompt('Rejection reason (required):');
    if (!reason) return;
    try {
      const res = await api.patch(`/referrals/${id}/status`, { status: 'rejected', reason });
      if (res.data.success) fetchInbox();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] text-slate-500">
        <Inbox className="w-8 h-8 animate-pulse text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-xl bg-blue-100 text-blue-600">
          <Inbox className="w-7 h-7" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Referral inbox</h1>
          <p className="text-slate-500 text-sm mt-1">SLA countdown and department routing on accept.</p>
        </div>
      </div>

      {acceptFor && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 animate-in slide-in-from-bottom-4">
            <h3 className="font-bold text-lg text-slate-900">Accept referral</h3>
            <p className="text-sm text-slate-600">Assign clinical department for internal routing.</p>
            {departments.length > 0 ? (
              <select
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                value={deptChoice}
                onChange={(e) => setDeptChoice(e.target.value)}
              >
                <option value="">Select department…</option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-xs text-amber-700 bg-amber-50 rounded-lg p-3">
                No departments on profile — add in registration or contact admin.
              </p>
            )}
            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  setAcceptFor(null);
                  setDeptChoice('');
                }}
                className="px-4 py-2 rounded-xl text-slate-600 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitAccept}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold"
              >
                Confirm accept
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {referrals.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-200 text-center text-slate-500">
            No pending referrals in your inbox.
          </div>
        ) : (
          referrals.map((referral) => {
            const consultantName = referral.consultantId?.userId?.name || 'Referring consultant';
            const slaText = formatSlaCountdown(referral.slaDeadline, now);
            const slaClass =
              slaText === 'OVERDUE'
                ? 'text-red-600'
                : referral.urgency === 'emergency'
                  ? 'text-red-600'
                  : 'text-blue-600';

            return (
              <div
                key={referral._id}
                className="bg-white border border-slate-100 rounded-2xl p-5 sm:p-6 shadow-sm hover:border-blue-100 transition-colors"
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex gap-4 sm:gap-6 min-w-0">
                    <div
                      className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex flex-col items-center justify-center font-bold text-[10px] sm:text-xs shrink-0 ${
                        referral.urgency === 'emergency'
                          ? 'bg-red-50 text-red-600'
                          : referral.urgency === 'urgent'
                            ? 'bg-orange-50 text-orange-600'
                            : 'bg-blue-50 text-blue-600'
                      }`}
                    >
                      <span className="uppercase">{referral.urgency}</span>
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-lg font-bold text-slate-900">{referral.patientName}</h3>
                      <p className="text-sm text-slate-600 mt-0.5">
                        From <span className="font-semibold text-slate-800">{consultantName}</span>
                      </p>
                      <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-slate-500 mt-2 flex-wrap">
                        <span>
                          {referral.age} yrs • {referral.gender}
                        </span>
                        <span className="px-2 py-0.5 bg-slate-100 rounded-md font-mono font-medium">
                          {referral.referralCode}
                        </span>
                        {referral.department && (
                          <span className="text-blue-600 font-medium">Dx dept: {referral.department}</span>
                        )}
                      </div>
                      <div className="mt-3">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Symptoms</p>
                        <p className="text-sm text-slate-700">{referral.symptomsText}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-stretch sm:items-end gap-3 w-full sm:w-auto">
                    <div className="text-left sm:text-right">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">SLA</p>
                      <p className={`text-lg font-mono font-bold ${slaClass}`}>{slaText}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleReject(referral._id)}
                        className="flex-1 sm:flex-none px-4 py-2.5 border border-red-200 text-red-600 font-semibold rounded-xl hover:bg-red-50 text-sm"
                      >
                        Reject
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAcceptFor(referral._id);
                          setDeptChoice(referral.department || departments[0] || '');
                        }}
                        className="flex-1 sm:flex-none px-4 py-2.5 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 text-sm shadow-sm"
                      >
                        Accept
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ReferralInbox;
