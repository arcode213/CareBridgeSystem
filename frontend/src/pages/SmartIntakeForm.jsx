import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const SmartIntakeForm = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    patientName: '',
    age: '',
    gender: 'male',
    phone: '',
    symptoms: '',
    urgency: 'routine',
    budgetMax: '50000',
    area: 'Karachi',
    patientLat: '24.8607',
    patientLng: '67.0011',
  });
  const [suggestions, setSuggestions] = useState([]);
  const [detectedDept, setDetectedDept] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const getSuggestions = async () => {
    setLoading(true);
    try {
      const params = {
        symptoms: formData.symptoms || '',
        urgency: formData.urgency,
        budgetMax: formData.budgetMax,
        lat: formData.patientLat,
        lng: formData.patientLng,
      };
      
      const res = await api.get('/referrals/suggestions', { params });
      
      if (res.data.success) {
        setSuggestions(res.data.suggestions);
        setDetectedDept(res.data.detectedDept);
        setStep(4);
      }
    } catch (err) {
      console.error('Failed to fetch suggestions:', err);
      alert('Error fetching hospital suggestions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const submitReferral = async (hospital) => {
    try {
      const rankedHospitalIds = suggestions.map((s) => s.hospitalId).filter(Boolean);
      const payload = {
        ...formData,
        targetHospitalId: hospital.hospitalId,
        rankedHospitalIds,
        department: detectedDept,
        scoringData: hospital.breakdown,
      };

      // Note: The backend response also includes 'detectedDept'. 
      // We should probably store that from the getSuggestions response.
      
      const res = await api.post('/referrals', payload);
      
      if (res.data.success) {
        alert('Referral Submitted Successfully! Referral Code: ' + res.data.data.referralCode);
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Referral submission failed:', err);
      alert('Failed to submit referral. Please try again.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">New Patient Referral</h1>
        <p className="text-gray-500">Follow the steps to find the best hospital for your patient.</p>
        
        {/* Progress Bar */}
        <div className="flex items-center gap-4 mt-6">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex-1 flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step >= s ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                {s}
              </div>
              <div className={`flex-1 h-1 rounded-full ${step > s ? 'bg-blue-600' : 'bg-gray-200'}`} />
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900">Patient Information</h2>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Full Name</label>
                <input 
                  type="text" name="patientName" value={formData.patientName} onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="Enter patient name"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Age</label>
                <input 
                  type="number" name="age" value={formData.age} onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="Patient age"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Gender</label>
                <select 
                  name="gender" value={formData.gender} onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Phone Number</label>
                <input 
                  type="text" name="phone" value={formData.phone} onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="+92 XXX XXXXXXX"
                />
              </div>
            </div>
            <div className="flex justify-end pt-4">
              <button 
                onClick={() => setStep(2)}
                disabled={!formData.patientName || !formData.age}
                className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all disabled:opacity-50"
              >
                Next Step
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900">Clinical Assessment</h2>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Symptoms (Comma separated)</label>
              <textarea 
                name="symptoms" value={formData.symptoms} onChange={handleInputChange}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all h-32"
                placeholder="e.g. chest pain, shortness of breath, fever"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Urgency Level</label>
              <div className="grid grid-cols-3 gap-4">
                {['routine', 'urgent', 'emergency'].map((level) => (
                  <button
                    key={level}
                    onClick={() => setFormData({...formData, urgency: level})}
                    className={`py-3 rounded-xl border font-bold capitalize transition-all ${formData.urgency === level ? 'bg-blue-50 border-blue-600 text-blue-600' : 'bg-white border-gray-200 text-gray-500'}`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-between pt-4">
              <button onClick={() => setStep(1)} className="text-gray-500 font-bold px-8 py-3">Back</button>
              <button onClick={() => setStep(3)} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold">Next Step</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900">Preferences & Location</h2>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Max Budget (PKR)</label>
              <input 
                type="number" name="budgetMax" value={formData.budgetMax} onChange={handleInputChange}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Patient Area (Karachi)</label>
              <input 
                type="text" name="area" value={formData.area} onChange={handleInputChange}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Patient location latitude</label>
                <input
                  type="text"
                  name="patientLat"
                  value={formData.patientLat}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="24.8607"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Patient location longitude</label>
                <input
                  type="text"
                  name="patientLng"
                  value={formData.patientLng}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="67.0011"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500">Used for distance scoring; adjust if the patient is outside central Karachi.</p>
            <div className="flex justify-between pt-4">
              <button onClick={() => setStep(2)} className="text-gray-500 font-bold px-8 py-3">Back</button>
              <button onClick={getSuggestions} disabled={loading} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2">
                {loading ? 'Analyzing Hospitals...' : 'Find Best Hospitals'}
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900">Smart Recommendations</h2>
            <p className="text-sm text-gray-500">Based on your assessment, these are the top 5 hospitals ranked by our scoring engine.</p>
            
            <div className="space-y-4">
              {suggestions.map((hospital, idx) => (
                <div key={idx} className="group relative bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:border-blue-300 transition-all cursor-pointer overflow-hidden">
                   <div className="flex items-center justify-between relative z-10">
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 font-bold text-xl">
                          {idx + 1}
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 text-lg">{hospital.hospitalName}</h3>
                          <div className="flex items-center gap-4 mt-1">
                            <span className="text-sm text-gray-500 flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              {hospital.distance}
                            </span>
                            <span className="text-sm font-bold text-green-600">{hospital.totalScore}% Match Score</span>
                          </div>
                        </div>
                     </div>
                     <button 
                        onClick={() => submitReferral(hospital)}
                        className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold opacity-0 group-hover:opacity-100 transition-all"
                     >
                       Confirm Referral
                     </button>
                   </div>
                   
                   {/* Score Breakdown visualization */}
                   <div className="mt-4 pt-4 border-t border-gray-50 grid grid-cols-5 gap-2">
                     {Object.entries(hospital.breakdown).map(([key, val]) => (
                       <div key={key} className="text-center">
                         <div className="text-[10px] uppercase font-bold text-gray-400 mb-1">{key}</div>
                         <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                           <div className="h-full bg-blue-500" style={{ width: `${(val / (key === 'beds' ? 25 : 20)) * 100}%` }} />
                         </div>
                       </div>
                     ))}
                   </div>
                </div>
              ))}
            </div>
            
            <div className="flex justify-start pt-4">
              <button onClick={() => setStep(3)} className="text-gray-500 font-bold px-8 py-3">Back to Edit</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SmartIntakeForm;
