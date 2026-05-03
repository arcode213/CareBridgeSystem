import { useState, useEffect } from 'react';
import api from '../utils/api';

const BedManagement = () => {
  const [beds, setBeds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBeds();
  }, []);

  const fetchBeds = async () => {
    try {
      const res = await api.get('/hospitals/beds');
      if (res.data.success) {
        setBeds(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch beds:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateBeds = async (ward, current, delta) => {
    const newValue = Math.max(0, current + delta);
    try {
      const res = await api.patch('/hospitals/beds', { ward, availableBeds: newValue });
      if (res.data.success) {
        setBeds(res.data.data);
      }
    } catch (err) {
      alert('Failed to update beds');
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64">Loading Beds...</div>;

  return (
    <div className="max-w-4xl space-y-6 animate-in slide-in-from-left-4 duration-500">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Live Bed Management</h1>
        <p className="text-gray-500">Update available beds across different wards in real-time.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-8 py-4 font-bold text-gray-700">Ward Name</th>
              <th className="px-8 py-4 font-bold text-gray-700">Total Capacity</th>
              <th className="px-8 py-4 font-bold text-gray-700">Available Beds</th>
              <th className="px-8 py-4 font-bold text-gray-700 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {beds.map((ward) => (
              <tr key={ward._id} className="hover:bg-gray-50/50 transition-all">
                <td className="px-8 py-5 font-bold text-gray-900">{ward.ward}</td>
                <td className="px-8 py-5 text-gray-600">{ward.totalBeds}</td>
                <td className="px-8 py-5">
                  <span className={`px-3 py-1 rounded-full font-bold text-sm ${ward.availableBeds > 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {ward.availableBeds} Available
                  </span>
                </td>
                <td className="px-8 py-5 text-right">
                  <div className="flex justify-end gap-2">
                    <button 
                      onClick={() => updateBeds(ward.ward, ward.availableBeds, -1)}
                      className="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-100 font-bold"
                    >
                      -
                    </button>
                    <button 
                      onClick={() => updateBeds(ward.ward, ward.availableBeds, 1)}
                      className="w-10 h-10 flex items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-bold"
                    >
                      +
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BedManagement;
