import { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import api from '../utils/api';
import { SOCKET_URL } from '../config';

const ReferralsList = () => {
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const fetchReferrals = useCallback(async () => {
    try {
      const res = await api.get('/referrals/mine');
      if (res.data.success) {
        setReferrals(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch referrals:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReferrals();
  }, [fetchReferrals]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return undefined;
    const socket = io(SOCKET_URL, { transports: ['websocket'] });
    socket.emit('join_consultant', { token });
    const refresh = () => fetchReferrals();
    socket.on('STATUS_UPDATE', refresh);
    socket.on('REFERRAL_ESCALATED', refresh);
    return () => socket.disconnect();
  }, [fetchReferrals]);

  const filteredReferrals = filter === 'all' 
    ? referrals 
    : referrals.filter(r => r.status === filter);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Referrals</h1>
          <p className="text-gray-500">View and track all your patient referrals.</p>
        </div>
        
        <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-gray-100 shadow-sm">
          {['all', 'pending', 'accepted', 'rejected', 'admitted'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-lg text-sm font-bold capitalize transition-all ${
                filter === f ? 'bg-blue-600 text-white' : 'bg-transparent text-gray-500 hover:bg-gray-50'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500 italic">Fetching your referral history...</div>
        ) : filteredReferrals.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-[10px] uppercase font-bold tracking-wider">
                  <th className="px-6 py-4">Referral ID</th>
                  <th className="px-6 py-4">Patient Details</th>
                  <th className="px-6 py-4">Specialty</th>
                  <th className="px-6 py-4">Target Hospital</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Submission Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredReferrals.map((r) => (
                  <tr key={r._id} className="hover:bg-gray-50/50 transition-all cursor-pointer">
                    <td className="px-6 py-4 font-bold text-blue-600 font-mono text-sm">{r.referralCode}</td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">{r.patientName}</div>
                      <div className="text-xs text-gray-500">{r.age}y • {r.gender} • {r.phone}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{r.department}</td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{r.targetHospitalId?.hospitalName || 'N/A'}</div>
                      <div className="text-[10px] text-gray-400 uppercase">{r.area}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold capitalize ${
                        r.status === 'pending' ? 'bg-yellow-50 text-yellow-600' :
                        r.status === 'accepted' ? 'bg-green-50 text-green-600' :
                        r.status === 'rejected' ? 'bg-red-50 text-red-600' :
                        'bg-blue-50 text-blue-600'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-sm">
                      {new Date(r.createdAt).toLocaleDateString()}
                      <div className="text-[10px] text-gray-400">{new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-20 text-center">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
               <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
               </svg>
            </div>
            <h3 className="text-gray-900 font-bold text-lg">No referrals found</h3>
            <p className="text-gray-500 max-w-xs mx-auto mt-2">Try adjusting your filters or create a new referral to see it here.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReferralsList;
