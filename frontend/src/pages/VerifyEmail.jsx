import { useEffect, useState, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, Activity } from 'lucide-react';
import api from '../utils/api';
import Loader from '../components/Loader';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'error'
  const [message, setMessage] = useState('');
  const token = searchParams.get('token');
  const called = useRef(false);

  useEffect(() => {
    const verify = async () => {
      if (called.current) return;
      called.current = true;
      if (!token) {
        setStatus('error');
        setMessage('No verification token found.');
        return;
      }

      try {
        const res = await api.get(`/auth/verify-email?token=${token}`);
        if (res.data.success) {
          setStatus('success');
          setMessage(res.data.message);
        } else {
          setStatus('error');
          setMessage(res.data.message || 'Verification failed.');
        }
      } catch (err) {
        setStatus('error');
        setMessage(err.response?.data?.message || 'Something went wrong during verification.');
      }
    };

    verify();
  }, [token]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="flex items-center gap-3 mb-12">
        <div className="bg-blue-600 p-2.5 rounded-xl text-white shadow-lg">
          <Activity size={28} />
        </div>
        <span className="text-2xl font-bold tracking-tight text-slate-900">CareBridge<span className="text-blue-600">Health</span></span>
      </div>

      <div className="bg-white rounded-3xl shadow-xl shadow-slate-200 border border-slate-100 p-10 max-w-md w-full text-center">
        {status === 'verifying' && (
          <Loader message="Verifying your email..." />
        )}

        {status === 'success' && (
          <div className="space-y-6">
            <div className="flex justify-center">
              <div className="bg-emerald-100 p-4 rounded-full">
                <CheckCircle className="w-12 h-12 text-emerald-600" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Email Verified!</h2>
            <p className="text-slate-500">{message}</p>
            <Link
              to="/login"
              className="block w-full py-3 px-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-md shadow-blue-100"
            >
              Sign In
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-6">
            <div className="flex justify-center">
              <div className="bg-red-100 p-4 rounded-full">
                <XCircle className="w-12 h-12 text-red-600" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Verification Failed</h2>
            <p className="text-slate-500">{message}</p>
            <div className="space-y-3">
              <Link
                to="/login"
                className="block w-full py-3 px-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all shadow-md"
              >
                Back to Login
              </Link>
              <p className="text-sm text-slate-400">
                If the token has expired, please try logging in to resend the verification email.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
