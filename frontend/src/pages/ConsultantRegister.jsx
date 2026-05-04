import { useState } from 'react';
import { useAuth } from '../features/auth/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';

const ConsultantRegister = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    pmdcNumber: '',
    specialty: 'General Physician',
    clinicName: '',
    clinicAddress: '',
    role: 'consultant'
  });
  const { register, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await register(formData);
    if (result.success) {
      toast.success('Registration successful! Waiting for admin approval.');
      setTimeout(() => navigate('/login'), 3000);
    } else {
      toast.error(result.message || 'Registration failed');
    }
  };

  return (
    <div className="w-full">
      <div className="mb-6">
        <Link to="/register" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors mb-4">
          <ArrowLeft size={16} className="mr-1" /> Back to roles
        </Link>
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Consultant Registration
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Join the CareBridge referral network
        </p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Full Name</label>
            <input name="name" type="text" required value={formData.name} onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
              placeholder="Dr. John Doe" />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">PMDC Number</label>
              <input name="pmdcNumber" type="text" required value={formData.pmdcNumber} onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
                placeholder="12345-P" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Specialty</label>
              <select name="specialty" value={formData.specialty} onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm bg-white">
                <option value="General Physician">General Physician</option>
                <option value="Cardiologist">Cardiologist</option>
                <option value="Neurologist">Neurologist</option>
                <option value="Orthopedic">Orthopedic</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Clinic Name (Optional)</label>
            <input name="clinicName" type="text" value={formData.clinicName} onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
              placeholder="City Health Clinic" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Clinic Address (Optional)</label>
            <input name="clinicAddress" type="text" value={formData.clinicAddress} onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
              placeholder="Street, area, city" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email address</label>
            <input name="email" type="email" required value={formData.email} onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
              placeholder="doctor@example.com" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Phone Number</label>
            <input name="phone" type="tel" required value={formData.phone} onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
              placeholder="+92 300 1234567" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
            <input name="password" type="password" required value={formData.password} onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
              placeholder="••••••••" />
          </div>
        </div>

        <button type="submit" disabled={isLoading}
          className="w-full py-3.5 px-4 border border-transparent rounded-xl shadow-md hover:shadow-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-70 mt-4">
          {isLoading ? 'Creating Account...' : 'Complete Registration'}
        </button>
      </form>

      <div className="mt-8 text-center text-sm">
        <span className="text-slate-600">Already have an account? </span>
        <Link to="/login" className="font-bold text-blue-600 hover:text-blue-500 transition-colors">Sign in</Link>
      </div>
    </div>
  );
};

export default ConsultantRegister;
