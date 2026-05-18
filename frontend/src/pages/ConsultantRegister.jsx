import { useState } from 'react';
import { useAuth } from '../features/auth/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, FileCheck } from 'lucide-react';
import api from '../utils/api';

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
  const [verificationDocuments, setVerificationDocuments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const { register, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleFileUpload = async (e, docName) => {
    const file = e.target.files[0];
    if (file) {
      try {
        setIsUploading(true);
        const uploadData = new FormData();
        uploadData.append('file', file);
        
        const res = await api.post('/upload', uploadData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        
        if (res.data.success) {
          const fileUrl = res.data.url;
          setVerificationDocuments(prev => [
            ...prev.filter(d => d.name !== docName),
            { name: docName, url: fileUrl }
          ]);
          toast.success(`${docName} uploaded successfully`);
        }
      } catch (err) {
        console.error('Upload failed:', err);
        toast.error(`Failed to upload ${docName}`);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (verificationDocuments.length === 0) {
      return toast.error('Please upload your PMDC Certificate for verification');
    }
    const result = await register({ ...formData, verificationDocuments });
    if (result.success) {
      toast.success(result.message || 'Registration successful! Please check your email for verification.', { duration: 6000 });
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

          <div className="pt-4 border-t border-slate-100">
            <label className="block text-sm font-bold text-slate-800 mb-3 uppercase tracking-wider">Verification Documents</label>
            <div className="bg-blue-50 rounded-2xl p-5 border border-blue-100">
              <p className="text-xs text-blue-600 font-medium mb-4">
                Please upload a clear copy of your PMDC Registration Certificate. This is required for account activation.
              </p>
              
              <div className="relative group">
                <input 
                  type="file" 
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => handleFileUpload(e, 'PMDC Certificate')}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  disabled={isUploading}
                />
                <div className={`flex items-center justify-between p-4 bg-white rounded-xl border-2 border-dashed ${verificationDocuments.find(d => d.name === 'PMDC Certificate') ? 'border-emerald-500 bg-emerald-50' : 'border-blue-200 group-hover:border-blue-400'} transition-all`}>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${verificationDocuments.find(d => d.name === 'PMDC Certificate') ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                      <ArrowLeft className={`w-5 h-5 transform rotate-90`} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">
                        {verificationDocuments.find(d => d.name === 'PMDC Certificate') ? 'Certificate Uploaded' : 'Upload PMDC Certificate'}
                      </p>
                      <p className="text-xs text-slate-500">PDF, JPG, PNG (Max 5MB)</p>
                    </div>
                  </div>
                  {verificationDocuments.find(d => d.name === 'PMDC Certificate') && (
                    <div className="flex items-center gap-2 text-emerald-600">
                      <span className="text-xs font-bold uppercase">Ready</span>
                    </div>
                  )}
                </div>
              </div>
              {isUploading && (
                <div className="mt-3 flex items-center justify-center gap-2 text-blue-600">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs font-bold uppercase tracking-wider">Uploading...</span>
                </div>
              )}
            </div>
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
