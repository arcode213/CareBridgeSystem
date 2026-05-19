import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bed, AlertCircle, RefreshCw, Search } from 'lucide-react';
import api from '../../utils/api';
import Loader from '../../components/Loader';

const AdminBeds = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: hospitals, isLoading, error } = useQuery({
    queryKey: ['admin-beds'],
    queryFn: async () => {
      const res = await api.get('/admin/beds');
      return res.data.data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return <Loader message="Loading beds status..." />;
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-2">
        <AlertCircle className="w-5 h-5" />
        Failed to load beds data
      </div>
    );
  }

  const filteredHospitals = hospitals?.filter((h) =>
    h.hospitalName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    h.city?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderBedCell = (bedData) => {
    if (!bedData) return <span className="text-slate-400">-</span>;
    const { total = 0, occupied = 0 } = bedData;
    const available = total - occupied;
    const occupancyRate = total > 0 ? (occupied / total) * 100 : 0;
    
    let colorClass = 'text-green-600';
    if (occupancyRate > 85) colorClass = 'text-red-600';
    else if (occupancyRate > 70) colorClass = 'text-orange-500';

    return (
      <div className="flex flex-col">
        <span className="font-medium text-slate-900">{occupied} / {total}</span>
        <span className={`text-xs ${colorClass}`}>{available} available</span>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Bed className="w-6 h-6 text-blue-600" />
            Live Bed Management Center
          </h1>
          <p className="text-slate-500 text-sm mt-1">Cross-hospital bed occupancy and capacity monitoring.</p>
        </div>
        
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search hospitals or cities..."
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
                <th className="px-4 py-3 font-medium">Hospital Name</th>
                <th className="px-4 py-3 font-medium">City</th>
                <th className="px-4 py-3 font-medium">ICU</th>
                <th className="px-4 py-3 font-medium">NICU</th>
                <th className="px-4 py-3 font-medium">PICU</th>
                <th className="px-4 py-3 font-medium">HDU</th>
                <th className="px-4 py-3 font-medium">General</th>
                <th className="px-4 py-3 font-medium">Emergency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredHospitals?.map((h) => (
                <tr key={h._id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900">{h.hospitalName}</td>
                  <td className="px-4 py-3 text-slate-600">{h.city}</td>
                  <td className="px-4 py-3">{renderBedCell(h.bedsInventory?.icu)}</td>
                  <td className="px-4 py-3">{renderBedCell(h.bedsInventory?.nicu)}</td>
                  <td className="px-4 py-3">{renderBedCell(h.bedsInventory?.picu)}</td>
                  <td className="px-4 py-3">{renderBedCell(h.bedsInventory?.hdu)}</td>
                  <td className="px-4 py-3">{renderBedCell(h.bedsInventory?.general)}</td>
                  <td className="px-4 py-3">{renderBedCell(h.bedsInventory?.emergency)}</td>
                </tr>
              ))}
              {filteredHospitals?.length === 0 && (
                <tr>
                  <td colSpan="8" className="px-4 py-8 text-center text-slate-500">
                    No hospitals found matching your search.
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

export default AdminBeds;
