import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star } from 'lucide-react';
import api from '../utils/api';

const BUDGET_BRACKETS = [
  { label: '5k - 10k PKR', value: '5k-10k' },
  { label: '10k - 50k PKR', value: '10k-50k' },
  { label: '50k - 1lac PKR', value: '50k-1lac' },
  { label: '1lac - 3lac PKR', value: '1lac-3lac' },
  { label: '3lac+ PKR', value: '3lac+' },
];

const SmartIntakeForm = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    patientName: '',
    cnic: '',
    guardianName: '',
    guardianCnic: '',
    age: '',
    gender: 'male',
    phone: '',
    symptoms: '',
    summaryNotes: '',
    urgency: 'routine',
    budgetMax: '50000',
    budgetBracket: '10k-50k',
    targetDoctorId: '',
    area: 'Karachi',
    patientLat: '24.8607',
    patientLng: '67.0011',
    diagnosisText: '',
    treatment: '',
    bedType: 'general',
    attachments: [],
  });
  const [suggestions, setSuggestions] = useState([]);
  const [doctors, setDoctors] = useState({}); // { hospitalId: [doctors] }
  const [expandedHospitalId, setExpandedHospitalId] = useState(null);
  const [detectedDept, setDetectedDept] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const navigate = useNavigate();

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const data = new FormData();
    data.append('file', file);

    setUploading(true);
    try {
      const res = await api.post('/upload', data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      if (res.data.success) {
        setFormData((prev) => ({
          ...prev,
          attachments: [...prev.attachments, res.data.url],
        }));
      }
    } catch (err) {
      console.error('File upload failed:', err);
      alert('Failed to upload file. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = (index) => {
    setFormData((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index),
    }));
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get('/profile/me');
        if (res.data.success && res.data.data.profile?.preferredHospitals) {
          setFavorites(res.data.data.profile.preferredHospitals);
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
      }
    };
    fetchProfile();
  }, []);

  const toggleFavorite = async (e, hospitalId) => {
    e.stopPropagation();
    try {
      const res = await api.post('/profile/favorites', { hospitalId });
      if (res.data.success) {
        setFavorites(res.data.data);
      }
    } catch (err) {
      console.error('Failed to toggle favorite', err);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const fetchDoctors = async (hospitalId) => {
    if (doctors[hospitalId]) return;
    try {
      const res = await api.get(`/referrals/hospitals/${hospitalId}/doctors`);
      if (res.data.success) {
        setDoctors(prev => ({ ...prev, [hospitalId]: res.data.data }));
      }
    } catch (err) {
      console.error('Failed to fetch doctors:', err);
    }
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
    setIsSubmitting(true);
    try {
      const rankedHospitalIds = suggestions.map((s) => s.hospitalId).filter(Boolean);
      // Map budget brackets to numbers (in paisa)
      const bracketMap = {
        '5k-10k':   { min: 500000,   max: 1000000 },
        '10k-50k':  { min: 1000000,  max: 5000000 },
        '50k-1lac': { min: 5000000,  max: 10000000 },
        '1lac-3lac':{ min: 10000000, max: 30000000 },
        '3lac+':    { min: 30000000, max: 100000000 },
      };
      const bracket = bracketMap[formData.budgetBracket] || bracketMap['10k-50k'];

      const payload = {
        ...formData,
        targetHospitalId: hospital.hospitalId,
        rankedHospitalIds,
        department: detectedDept,
        scoringData: hospital.breakdown,
        budgetBracket: formData.budgetBracket,
        budgetMin: bracket.min,
        budgetMax: bracket.max,
      };

      const res = await api.post('/referrals', payload);
      
      if (res.data.success) {
        alert('Referral Submitted Successfully! Referral Code: ' + res.data.data.referralCode);
        navigate('/referrals');
      }
    } catch (err) {
      console.error('Referral submission failed:', err);
      const msg = err.response?.data?.message || 'Failed to submit referral. Please try again.';
      alert(msg);
    } finally {
      setIsSubmitting(false);
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
                <label className="text-sm font-semibold text-gray-700">Patient CNIC</label>
                <input 
                  type="text" name="cnic" value={formData.cnic} onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="42101-XXXXXXX-X"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Guardian Name</label>
                <input 
                  type="text" name="guardianName" value={formData.guardianName} onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="Father/Guardian Name"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Guardian CNIC</label>
                <input 
                  type="text" name="guardianCnic" value={formData.guardianCnic} onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="42101-XXXXXXX-X"
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
              <div className="space-y-2 col-span-2">
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
                disabled={!formData.patientName || !formData.age || !formData.phone || !formData.cnic || !formData.guardianName || !formData.guardianCnic}
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
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all h-24"
                placeholder="e.g. chest pain, shortness of breath, fever"
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Provisional Diagnosis</label>
                <input 
                  type="text" name="diagnosisText" value={formData.diagnosisText} onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="e.g. Acute Coronary Syndrome"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Recommended Treatment / Procedure</label>
                <input 
                  type="text" name="treatment" value={formData.treatment} onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="e.g. Angiography / PCI"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Required Bed / Ward Type</label>
                <select 
                  name="bedType" value={formData.bedType} onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                >
                  <option value="general">General Ward</option>
                  <option value="private">Private Room</option>
                  <option value="icu">ICU (Intensive Care Unit)</option>
                  <option value="nicu">NICU (Neonatal ICU)</option>
                  <option value="picu">PICU (Pediatric ICU)</option>
                  <option value="hdu">HDU (High Dependency Unit)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Urgency Level</label>
                <div className="grid grid-cols-3 gap-2">
                  {['routine', 'urgent', 'emergency'].map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setFormData({...formData, urgency: level})}
                      className={`py-3 rounded-xl border font-bold text-sm capitalize transition-all ${formData.urgency === level ? 'bg-blue-50 border-blue-600 text-blue-600' : 'bg-white border-gray-200 text-gray-500'}`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Patient Summary Notes (Detailed Clinical Notes)</label>
              <textarea 
                name="summaryNotes" value={formData.summaryNotes} onChange={handleInputChange}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all h-28"
                placeholder="Detailed clinical history, current stability, and reason for routing..."
              />
            </div>

            {/* File Upload (SCR-07 Report Upload) */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Upload Medical Reports / Lab PDFs (Optional)</label>
              <div className="flex items-center gap-4">
                <label className={`cursor-pointer px-6 py-3 rounded-xl border font-bold text-sm transition-all flex items-center gap-2 ${uploading ? 'bg-gray-50 border-gray-200 text-gray-400' : 'bg-white border-gray-300 hover:border-blue-500 text-gray-700'}`}>
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  {uploading ? 'Uploading...' : 'Choose File'}
                  <input type="file" onChange={handleFileUpload} disabled={uploading} className="hidden" accept=".pdf,.png,.jpg,.jpeg" />
                </label>
                {uploading && (
                  <div className="text-xs text-gray-500 flex items-center gap-1.5">
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    Streaming securely to cloud storage...
                  </div>
                )}
              </div>

              {/* Uploaded attachments list */}
              {formData.attachments.length > 0 && (
                <div className="grid grid-cols-2 gap-3 mt-3">
                  {formData.attachments.map((url, idx) => {
                    const filename = url.split('/').pop() || `report_${idx + 1}`;
                    return (
                      <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-xl">
                        <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-blue-600 hover:underline truncate max-w-[200px]" title={filename}>
                          📄 {filename.slice(-30)}
                        </a>
                        <button type="button" onClick={() => removeAttachment(idx)} className="text-red-500 hover:text-red-700 font-bold text-sm focus:outline-none">
                          Remove
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
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
              <label className="text-sm font-semibold text-gray-700">Estimated Budget Bracket (PKR)</label>
              <select 
                name="budgetBracket" value={formData.budgetBracket} onChange={handleInputChange}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              >
                {BUDGET_BRACKETS.map(b => (
                  <option key={b.value} value={b.value}>{b.label}</option>
                ))}
              </select>
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
            <p className="text-sm text-gray-500">Based on your assessment, these are the top 10 hospitals ranked by our scoring engine.</p>
            
            <div className="space-y-4">
              {suggestions.map((hospital, idx) => (
                <div key={idx} className="group relative bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:border-blue-300 transition-all cursor-pointer overflow-hidden">
                    <div className="flex items-center justify-between relative z-10">
                      <div className="flex items-center gap-4 cursor-pointer flex-1" onClick={() => {
                        const next = expandedHospitalId === hospital.hospitalId ? null : hospital.hospitalId;
                        setExpandedHospitalId(next);
                        if (next) fetchDoctors(next);
                      }}>
                        <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 font-bold text-xl">
                          {idx + 1}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-gray-900 text-lg">{hospital.hospitalName}</h3>
                            <button 
                              onClick={(e) => toggleFavorite(e, hospital.hospitalId)} 
                              className="text-yellow-400 hover:scale-110 transition-transform focus:outline-none"
                              title="Toggle Favorite"
                            >
                              <Star className={`w-5 h-5 ${favorites.includes(hospital.hospitalId) ? 'fill-current' : 'text-gray-300'}`} />
                            </button>
                          </div>
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
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => submitReferral(hospital)}
                          disabled={isSubmitting}
                          className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-all disabled:opacity-50"
                        >
                          {isSubmitting ? 'Submitting...' : 'Confirm Referral'}
                        </button>
                      </div>
                    </div>
                    
                    {expandedHospitalId === hospital.hospitalId && (
                      <div className="mt-6 pt-6 border-t border-gray-100 animate-in fade-in slide-in-from-top-2 duration-300">
                        <h4 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                          <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          Select Specific Doctor (Optional)
                        </h4>
                        
                        {!doctors[hospital.hospitalId] ? (
                          <div className="text-sm text-gray-400 italic py-2">Loading available doctors...</div>
                        ) : doctors[hospital.hospitalId].length === 0 ? (
                          <div className="text-sm text-gray-400 italic py-2">No specific doctors listed for this facility.</div>
                        ) : (
                          <div className="grid grid-cols-2 gap-3">
                            {doctors[hospital.hospitalId].map((doc) => (
                              <button
                                key={doc._id}
                                onClick={() => setFormData({...formData, targetDoctorId: formData.targetDoctorId === doc._id ? '' : doc._id})}
                                className={`flex flex-col items-start p-4 rounded-xl border text-left transition-all ${formData.targetDoctorId === doc._id ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}
                              >
                                <span className="font-bold text-gray-900 text-sm">{doc.name}</span>
                                <span className="text-xs text-gray-500">{doc.specialty}</span>
                                {doc.consultationFee && (
                                  <span className="text-[10px] font-bold text-blue-600 mt-2">Fee: {doc.consultationFee / 100} PKR</span>
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                   
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
