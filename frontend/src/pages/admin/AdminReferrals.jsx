import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Activity, AlertCircle, RefreshCw, Search, Edit2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import Loader from '../../components/Loader';

const AdminReferrals = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');

  const { data: referrals, isLoading, error } = useQuery({
    queryKey: ['admin-referrals'],
    queryFn: async () => {
      const res = await api.get('/admin/referrals');
      return res.data.data;
    },
    refetchInterval: 30000,
  });

  const overrideMutation = useMutation({
    mutationFn: async ({ id, status, priority }) => {
      const res = await api.patch(`/admin/referrals/${id}/override`, { status, priority });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Referral updated successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-referrals'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update referral');
    },
  });

  if (isLoading) {
    return <Loader message="Loading referrals..." />;
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-2">
        <AlertCircle className="w-5 h-5" />
        Failed to load referrals
      </div>
    );
  }

  const filteredReferrals = referrals?.filter((r) =>
    r.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.referralCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.targetHospitalId?.hospitalName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.consultantId?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status) => {
    switch (status) {
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-amber-100 text-amber-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'escalated': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'emergency': return 'bg-red-500 text-white animate-pulse';
      case 'urgent': return 'bg-orange-500 text-white';
      default: return 'bg-blue-500 text-white';
    }
  };

  const handleOverride = (id) => {
    const action = window.prompt('Enter new status (pending, accepted, rejected, completed, escalated, frozen):');
    if (action) {
      overrideMutation.mutate({ id, status: action });
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Activity className="w-6 h-6 text-blue-600" />
            Referral Management Center
          </h1>
          <p className="text-slate-500 text-sm mt-1">Live monitoring and override controls for all network referrals.</p>
        </div>
        
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search referrals..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Patient</th>
                <th className="px-4 py-3 font-medium">Consultant</th>
                <th className="px-4 py-3 font-medium">Target Hospital</th>
                <th className="px-4 py-3 font-medium">Priority</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredReferrals?.map((ref) => (
                <tr key={ref._id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-blue-600">{ref.referralCode}</td>
                  <td className="px-4 py-3 text-slate-900">{ref.patientName}</td>
                  <td className="px-4 py-3 text-slate-600">{ref.consultantId?.name || 'Unknown'}</td>
                  <td className="px-4 py-3 text-slate-600">{ref.targetHospitalId?.hospitalName || 'Pending Assignment'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(ref.priority)}`}>
                      {ref.priority?.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(ref.status)}`}>
                      {ref.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleOverride(ref._id)}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Override Status"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Override
                    </button>
                  </td>
                </tr>
              ))}
              {filteredReferrals?.length === 0 && (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-slate-500">
                    No referrals found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminReferrals;
