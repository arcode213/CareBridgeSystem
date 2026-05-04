import { useState } from 'react';
import { useAuth } from '../features/auth/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await login(email, password);
    if (result.success) {
      toast.success('Welcome back!');
      if (result.user.role === 'hospital') {
        navigate('/hospital/dashboard');
      } else if (result.user.role === 'admin') {
        navigate('/admin/overview');
      } else {
        navigate('/dashboard');
      }
    } else {
      toast.error(result.message || 'Login failed');
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div>
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Sign in to your account</h2>
        <p className="mt-2 text-sm text-slate-600">
          Enter your credentials to access your dashboard.
        </p>
      </div>

      <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email address</label>
            <input
              type="email"
              required
              className="appearance-none rounded-xl relative block w-full px-4 py-3 border border-slate-200 placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm transition-all shadow-sm"
              placeholder="doctor@carebridge.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
            <input
              type="password"
              required
              className="appearance-none rounded-xl relative block w-full px-4 py-3 border border-slate-200 placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm transition-all shadow-sm"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <input id="remember-me" name="remember-me" type="checkbox" className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded" />
            <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-600">
              Remember me
            </label>
          </div>
          <div className="text-sm">
            <a href="#" className="font-semibold text-blue-600 hover:text-blue-500 transition-colors">
              Forgot your password?
            </a>
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={isLoading}
            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-70 shadow-md hover:shadow-lg"
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
          </button>
        </div>
        
        <div className="text-center text-sm mt-6">
          <span className="text-slate-600">Don't have an account? </span>
          <Link to="/register" className="font-bold text-blue-600 hover:text-blue-500 transition-colors">
            Register now
          </Link>
        </div>
      </form>
    </div>
  );
};

export default Login;
