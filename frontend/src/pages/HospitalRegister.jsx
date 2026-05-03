import { useState } from 'react';
import { useAuth } from '../features/auth/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

const WARDS = ['General', 'Private', 'ICU', 'NICU', 'PICU'];

const DEPT_OPTIONS = [
  'Internal Medicine',
  'Cardiology',
  'Orthopedics',
  'Neurology',
  'Gastroenterology',
  'General Surgery',
  'Pediatrics',
];

const defaultBeds = () =>
  WARDS.map((ward) => ({
    ward,
    totalBeds: ward === 'General' ? 20 : ward === 'ICU' ? 6 : 12,
    availableBeds: ward === 'General' ? 10 : ward === 'ICU' ? 2 : 6,
  }));

const HospitalRegister = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    hospitalName: '',
    registrationNumber: '',
    address: '',
    role: 'hospital',
    lat: '24.8607',
    lng: '67.0099',
  });
  const [departments, setDepartments] = useState(['Internal Medicine']);
  const [bedsInventory, setBedsInventory] = useState(defaultBeds);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { register, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const toggleDepartment = (dept) => {
    setDepartments((prev) =>
      prev.includes(dept) ? prev.filter((d) => d !== dept) : [...prev, dept]
    );
  };

  const updateBed = (ward, field, raw) => {
    const n = raw === '' ? '' : Number(raw);
    setBedsInventory((prev) =>
      prev.map((row) =>
        row.ward === ward ? { ...row, [field]: n === '' ? '' : n } : row
      )
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const bedsPayload = bedsInventory.map((row) => ({
      ward: row.ward,
      totalBeds: Number(row.totalBeds),
      availableBeds: Number(row.availableBeds),
    }));
    const payload = {
      ...formData,
      departments,
      bedsInventory: bedsPayload,
      location: {
        lat: parseFloat(formData.lat),
        lng: parseFloat(formData.lng),
      },
    };
    delete payload.lat;
    delete payload.lng;

    const result = await register(payload);
    if (result.success) {
      setSuccess('Registration successful! Waiting for admin approval.');
      setTimeout(() => navigate('/login'), 3000);
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900">Hospital Registration</h2>
        <p className="mt-2 text-center text-sm text-slate-600">Onboard your facility (departments, beds, and map location required for referrals)</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl">
        <div className="bg-white py-8 px-4 shadow sm:rounded-2xl sm:px-10 border border-slate-100">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && <div className="bg-red-50 text-red-700 p-3 rounded-xl text-sm text-center font-medium">{error}</div>}
            {success && <div className="bg-green-50 text-green-700 p-3 rounded-xl text-sm text-center font-medium">{success}</div>}

            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Facility Details</h3>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Hospital Name</label>
                <input
                  name="hospitalName"
                  type="text"
                  required
                  value={formData.hospitalName}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="City General Hospital"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Reg Number</label>
                  <input
                    name="registrationNumber"
                    type="text"
                    required
                    value={formData.registrationNumber}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    placeholder="H-12345"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Admin Name</label>
                  <input
                    name="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    placeholder="John Admin"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Address</label>
                <input
                  name="address"
                  type="text"
                  required
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="Main Road, Karachi"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Departments served</label>
                <div className="flex flex-wrap gap-2">
                  {DEPT_OPTIONS.map((dept) => (
                    <button
                      key={dept}
                      type="button"
                      onClick={() => toggleDepartment(dept)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                        departments.includes(dept)
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                      }`}
                    >
                      {dept}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-2">Select all departments your hospital accepts for referrals.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Latitude</label>
                  <input
                    name="lat"
                    type="text"
                    required
                    value={formData.lat}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Longitude</label>
                  <input
                    name="lng"
                    type="text"
                    required
                    value={formData.lng}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Bed inventory (all wards required)</label>
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="text-left px-3 py-2">Ward</th>
                        <th className="text-left px-3 py-2">Total beds</th>
                        <th className="text-left px-3 py-2">Available</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bedsInventory.map((row) => (
                        <tr key={row.ward} className="border-t border-slate-100">
                          <td className="px-3 py-2 font-medium">{row.ward}</td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min={0}
                              required
                              value={row.totalBeds}
                              onChange={(e) => updateBed(row.ward, 'totalBeds', e.target.value)}
                              className="w-24 px-2 py-1 rounded-lg border border-slate-200"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min={0}
                              required
                              value={row.availableBeds}
                              onChange={(e) => updateBed(row.ward, 'availableBeds', e.target.value)}
                              className="w-24 px-2 py-1 rounded-lg border border-slate-200"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-2 border-t border-slate-100">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Account Credentials</h3>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Email address</label>
                <input
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="admin@hospital.com"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Phone</label>
                  <input
                    name="phone"
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    placeholder="021-3456789"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Password</label>
                  <input
                    name="password"
                    type="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || departments.length === 0}
              className="w-full py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-70"
            >
              {isLoading ? 'Processing...' : 'Register Hospital'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-slate-600">Already have an account? </span>
            <Link to="/login" className="font-bold text-blue-600 hover:text-blue-500">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HospitalRegister;
