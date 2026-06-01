import { useState } from 'react';
import { useAuth } from '../features/auth/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Eye, EyeOff, FileCheck } from 'lucide-react';
import api from '../utils/api';

const LAB_DEPT_OPTIONS = [
  'Biochemistry',
  'Haematology',
  'Microbiology',
  'Histopathology',
  'Immunology',
  'Molecular Biology',
  'Radiology',
  'Serology',
  'Cytology',
  'Toxicology',
  'Clinical Pathology',
  'Genetics',
];

const LaboratoryRegister = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    laboratoryName: '',
    licenseNumber: '',
    representativeCnic: '',
    address: '',
    city: 'Karachi',
    area: '',
    role: 'laboratory',
    lat: '24.8607',
    lng: '67.0099',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [departments, setDepartments] = useState(['Biochemistry']);
  const [registrationDocuments, setRegistrationDocuments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const { register, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleFileUpload = async (e, docName) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setIsUploading(true);
      const uploadData = new FormData();
      uploadData.append('file', file);
      const res = await api.post('/upload', uploadData, {
        // Let Axios handle the boundary automatically
        // headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data.success) {
        setRegistrationDocuments((prev) => [
          ...prev.filter((d) => d.name !== docName),
          { name: docName, url: res.data.url },
        ]);
        toast.success(`${docName} uploaded successfully`);
      }
    } catch (err) {
      console.error('Upload failed:', err);
      toast.error(`Failed to upload ${docName}`);
    } finally {
      setIsUploading(false);
      e.target.value = '';
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (departments.length === 0) {
      toast.error('Please select at least one department.');
      return;
    }
    if (!registrationDocuments.find((d) => d.name === 'SHCC License')) {
      toast.error('Please upload your SHCC License for verification.');
      return;
    }
    if (!registrationDocuments.find((d) => d.name === 'CNIC')) {
      toast.error('Please upload your CNIC copy for verification.');
      return;
    }
    const cnicRegex = /^\d{5}-\d{7}-\d{1}$/;
    if (!cnicRegex.test(formData.representativeCnic)) {
      return toast.error('Representative CNIC must be in the format XXXXX-XXXXXXX-X');
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      return toast.error('Please enter a valid email address');
    }
    const phoneClean = formData.phone.replace(/[\s\-()]/g, '');
    const hospitalPhoneRegex = /^((\+92)|(0092)|0)?(3\d{9}|(21|42|51|91|81|61|22|71)\d{7})$/;
    if (!hospitalPhoneRegex.test(phoneClean)) {
      return toast.error('Please enter a valid Pakistani phone/landline number');
    }
    if (formData.password.length < 8) {
      return toast.error('Password must be at least 8 characters long');
    }

    const payload = {
      ...formData,
      phone: phoneClean,
      departments,
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
      toast.success(result.message || 'Laboratory registered! A verification code was sent to your WhatsApp.', { duration: 6000, icon: '📱' });
      navigate('/verify-phone', { state: { phone: phoneClean } });
    } else {
      toast.error(result.message || 'Registration failed');
    }
  };

  const inputClass = "w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-violet-500 outline-none transition-all shadow-sm text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white";

  return (
    <div className="w-full">
      <div className="mb-6">
        <Link to="/register" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-violet-600 transition-colors mb-4">
          <ArrowLeft size={16} className="mr-1" /> Back to roles
        </Link>
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Laboratory Registration
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Onboard your diagnostic facility — departments and location are required for referrals.
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
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Laboratory Name</label>
            <input name="laboratoryName" type="text" required value={formData.laboratoryName}
              onChange={handleChange} className={inputClass} placeholder="City Diagnostic Lab" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">License Number</label>
              <input name="licenseNumber" type="text" required value={formData.licenseNumber}
                onChange={handleChange} className={inputClass} placeholder="LAB-12345" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Admin Full Name</label>
              <input name="name" type="text" required value={formData.name}
                onChange={handleChange} className={inputClass} placeholder="John Admin" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Representative CNIC Number</label>
            <input
              name="representativeCnic"
              type="text"
              required
              value={formData.representativeCnic}
              onChange={handleChange}
              className={inputClass}
              placeholder="42101-XXXXXXX-X"
            />
            <p className="text-xs text-slate-400 mt-1">CNIC of the authorized laboratory representative.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">City</label>
              <input name="city" type="text" required value={formData.city}
                onChange={handleChange} className={inputClass} placeholder="Karachi" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Area</label>
              <input name="area" type="text" value={formData.area}
                onChange={handleChange} className={inputClass} placeholder="Gulshan-e-Iqbal" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Full Address</label>
            <input name="address" type="text" required value={formData.address}
              onChange={handleChange} className={inputClass} placeholder="Plot 123, Main Boulevard, Karachi" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Departments / Sections</label>
            <div className="flex flex-wrap gap-2">
              {LAB_DEPT_OPTIONS.map((dept) => (
                <button key={dept} type="button" onClick={() => toggleDepartment(dept)}
                  className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-all ${departments.includes(dept)
                      ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-violet-400 hover:text-violet-600'
                    }`}>
                  {dept}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-2">Select all sections your laboratory operates.</p>
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

        {/* Section 2: Supporting Documents */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-1">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Verification Documents</h3>
            <div className="flex-1 h-px bg-slate-100"></div>
          </div>
          <div className="bg-violet-50 rounded-2xl p-5 border border-violet-100 space-y-4">
            <p className="text-xs text-violet-800 font-medium">
              Upload SHCC license, CNIC copy of the representative, and optional rate list. All are reviewed during admin approval.
            </p>

            {['SHCC License', 'CNIC', 'Rate List'].map((docName) => {
              const required = docName !== 'Rate List';
              const uploaded = registrationDocuments.find((d) => d.name === docName);
              return (
                <div key={docName} className="relative group">
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => handleFileUpload(e, docName)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    disabled={isUploading}
                  />
                  <div
                    className={`flex items-center justify-between p-4 bg-white rounded-xl border-2 border-dashed transition-all ${uploaded ? 'border-emerald-500 bg-emerald-50' : 'border-violet-200 group-hover:border-violet-400'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${uploaded ? 'bg-emerald-100 text-emerald-600' : 'bg-violet-100 text-violet-600'}`}>
                        <FileCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">
                          {uploaded ? `${docName} uploaded` : `Upload ${docName}`}
                          {required && <span className="text-red-500 ml-1">*</span>}
                        </p>
                        <p className="text-xs text-slate-500">PDF, JPG, PNG (max 5MB)</p>
                      </div>
                    </div>
                    {uploaded && <span className="text-xs font-bold text-emerald-600 uppercase">Ready</span>}
                  </div>
                </div>
              );
            })}

            {isUploading && (
              <p className="text-xs text-center text-violet-700 font-semibold animate-pulse">Uploading document…</p>
            )}
          </div>
        </div>

        {/* Section 3: Account Credentials */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-1">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Account Credentials</h3>
            <div className="flex-1 h-px bg-slate-100"></div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email Address</label>
            <input name="email" type="email" required value={formData.email}
              onChange={handleChange} className={inputClass} placeholder="admin@laboratory.com" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Phone Number</label>
              <input name="phone" type="tel" required value={formData.phone}
                onChange={handleChange} className={inputClass} placeholder="0300-1234567" />
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
          className="w-full py-3.5 px-4 border border-transparent rounded-xl shadow-md hover:shadow-lg text-sm font-bold text-white bg-violet-600 hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 transition-all disabled:opacity-70">
          {isLoading ? 'Processing...' : 'Register Laboratory'}
        </button>
      </form>

      <div className="mt-8 text-center text-sm">
        <span className="text-slate-600">Already have an account? </span>
        <Link to="/login" className="font-bold text-violet-600 hover:text-violet-500 transition-colors">Sign in</Link>
      </div>
    </div>
  );
};

export default LaboratoryRegister;
