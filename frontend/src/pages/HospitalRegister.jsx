import { useState } from 'react';
import { useAuth } from '../features/auth/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import api from '../utils/api';

const WARDS = ['General', 'Private', 'ICU', 'NICU', 'PICU', 'HDU', 'Burns', 'Maternity', 'Psychiatric', 'Cardiac'];

const DEPT_OPTIONS = [
  'Internal Medicine',
  'Cardiology',
  'Orthopedics',
  'Neurology',
  'Gastroenterology',
  'General Surgery',
  'Pediatrics',
  'Psychiatry',
  'Gynae/Obs',
  'Radiology',
  'Anesthesiology',
  'Pathology',
];

const defaultBeds = () =>
  WARDS.map((ward) => ({
    ward,
    totalBeds: ward === 'General' ? 20 : ward === 'ICU' ? 6 : 0,
    availableBeds: ward === 'General' ? 10 : ward === 'ICU' ? 2 : 0,
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
  const [showPassword, setShowPassword] = useState(false);
  const [departments, setDepartments] = useState(['Internal Medicine']);
  const [bedsInventory, setBedsInventory] = useState(defaultBeds);
  const [registrationDocuments, setRegistrationDocuments] = useState([]);
  const { register, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleFileUpload = async (e, docName) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        
        const res = await api.post('/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        
        if (res.data.success) {
          const fileUrl = res.data.url;
          setRegistrationDocuments(prev => [
            ...prev.filter(d => d.name !== docName),
            { name: docName, url: fileUrl }
          ]);
          toast.success(`${docName} uploaded successfully`);
        }
      } catch (err) {
        console.error('Upload failed:', err);
        toast.error(`Failed to upload ${docName}`);
      }
    }
  };

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
    if (departments.length === 0) {
      toast.error('Please select at least one department.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      return toast.error('Please enter a valid email address');
    }
    const phoneClean = formData.phone.replace(/[\s\-()]/g, '');
    const phoneRegex = /^((\+92)|(0092)|0)?3\d{9}$/;
    // Wait, hospital phone number can also be landline (e.g. 021-3456789).
    // Let's support both mobile and landline for hospital: /^((\+92)|(0092)|0)?(3\d{9}|\d{2,3}\d{7,8})$/
    const hospitalPhoneRegex = /^((\+92)|(0092)|0)?(3\d{9}|(21|42|51|91|81|61|22|71)\d{7})$/;
    if (!hospitalPhoneRegex.test(phoneClean)) {
      return toast.error('Please enter a valid Pakistani phone/landline number');
    }
    if (formData.password.length < 8) {
      return toast.error('Password must be at least 8 characters long');
    }
    const bedsPayload = bedsInventory.map((row) => ({
      ward: row.ward,
      totalBeds: Number(row.totalBeds),
      availableBeds: Number(row.availableBeds),
    }));
    const payload = {
      ...formData,
      phone: phoneClean,
      departments,
      bedsInventory: bedsPayload,
      registrationDocuments,
      location: {
        lat: parseFloat(formData.lat),
        lng: parseFloat(formData.lng),
      },
    };
    delete payload.lat;
    delete payload.lng;

    const result = await register(payload);
    if (result.success) {
      toast.success(result.message || 'Hospital registered! Please check your email for verification.', { duration: 6000 });
      setTimeout(() => navigate('/login'), 4000);
    } else {
      toast.error(result.message || 'Registration failed');
    }
  };

  const inputClass = "w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm text-sm";

  return (
    <div className="w-full">
      <div className="mb-6">
        <Link to="/register" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors mb-4">
          <ArrowLeft size={16} className="mr-1" /> Back to roles
        </Link>
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Hospital Registration
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Onboard your facility — departments, beds, and location are required for referrals.
        </p>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit}>
        {/* Section 1: Facility Details */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-1">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Facility Details</h3>
            <div className="flex-1 h-px bg-slate-100"></div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Hospital Name</label>
            <input name="hospitalName" type="text" required value={formData.hospitalName}
              onChange={handleChange} className={inputClass} placeholder="City General Hospital" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Registration Number</label>
              <input name="registrationNumber" type="text" required value={formData.registrationNumber}
                onChange={handleChange} className={inputClass} placeholder="H-12345" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Admin Full Name</label>
              <input name="name" type="text" required value={formData.name}
                onChange={handleChange} className={inputClass} placeholder="John Admin" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Hospital Address</label>
            <input name="address" type="text" required value={formData.address}
              onChange={handleChange} className={inputClass} placeholder="Main Road, Karachi" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Departments Served</label>
            <div className="flex flex-wrap gap-2">
              {DEPT_OPTIONS.map((dept) => (
                <button key={dept} type="button" onClick={() => toggleDepartment(dept)}
                  className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-all ${
                    departments.includes(dept)
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-blue-400 hover:text-blue-600'
                  }`}>
                  {dept}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-2">Select all departments your hospital accepts for referrals.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Latitude</label>
              <input name="lat" type="text" required value={formData.lat}
                onChange={handleChange} className={inputClass} placeholder="24.8607" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Longitude</label>
              <input name="lng" type="text" required value={formData.lng}
                onChange={handleChange} className={inputClass} placeholder="67.0099" />
            </div>
          </div>
        </div>

        {/* Section 2: Bed Inventory */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-1">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Bed Inventory</h3>
            <div className="flex-1 h-px bg-slate-100"></div>
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Ward</th>
                  <th className="text-left px-4 py-3 font-semibold">Total Beds</th>
                  <th className="text-left px-4 py-3 font-semibold">Available</th>
                </tr>
              </thead>
              <tbody>
                {bedsInventory.map((row) => (
                  <tr key={row.ward} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-semibold text-slate-700">
                      <span className={`inline-block px-2.5 py-0.5 rounded-md text-xs font-bold ${
                        row.ward === 'ICU' || row.ward === 'NICU' || row.ward === 'PICU'
                          ? 'bg-red-50 text-red-600'
                          : 'bg-slate-100 text-slate-600'
                      }`}>{row.ward}</span>
                    </td>
                    <td className="px-4 py-3">
                      <input type="number" min={0} required value={row.totalBeds}
                        onChange={(e) => updateBed(row.ward, 'totalBeds', e.target.value)}
                        className="w-24 px-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                    </td>
                    <td className="px-4 py-3">
                      <input type="number" min={0} required value={row.availableBeds}
                        onChange={(e) => updateBed(row.ward, 'availableBeds', e.target.value)}
                        className="w-24 px-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 3: Supporting Documents (Q3) */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-1">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Supporting Documents</h3>
            <div className="flex-1 h-px bg-slate-100"></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
              <label className="block text-sm font-semibold text-slate-700 mb-1">SHCC Professional License</label>
              <input type="file" onChange={(e) => handleFileUpload(e, 'SHCC License')} 
                className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
            </div>
            <div className="p-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
              <label className="block text-sm font-semibold text-slate-700 mb-1">Billing Rate List (Softcopy)</label>
              <input type="file" onChange={(e) => handleFileUpload(e, 'Rate List')}
                className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
            </div>
          </div>
          <p className="text-xs text-slate-400">Mandatory for verification (TAT: 24-48 hours).</p>
        </div>

        {/* Section 4: Account Credentials */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-1">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Account Credentials</h3>
            <div className="flex-1 h-px bg-slate-100"></div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email Address</label>
            <input name="email" type="email" required value={formData.email}
              onChange={handleChange} className={inputClass} placeholder="admin@hospital.com" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Phone Number</label>
              <input name="phone" type="tel" required value={formData.phone}
                onChange={handleChange} className={inputClass} placeholder="021-3456789" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <input name="password" type={showPassword ? "text" : "password"} required value={formData.password}
                  onChange={handleChange} className={`${inputClass} pr-10`} placeholder="••••••••" />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        <button type="submit" disabled={isLoading || departments.length === 0}
          className="w-full py-3.5 px-4 border border-transparent rounded-xl shadow-md hover:shadow-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-70">
          {isLoading ? 'Processing...' : 'Register Hospital'}
        </button>
      </form>

      <div className="mt-8 text-center text-sm">
        <span className="text-slate-600">Already have an account? </span>
        <Link to="/login" className="font-bold text-blue-600 hover:text-blue-500 transition-colors">Sign in</Link>
      </div>
    </div>
  );
};

export default HospitalRegister;

