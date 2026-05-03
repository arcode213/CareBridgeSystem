import { createContext, useContext, useState, useEffect } from 'react';
import { API_BASE } from '../../config';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUser({ id: payload.id, role: payload.role, name: payload.name });
      } catch {
        setToken(null);
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
      }
    } else {
      setUser(null);
    }
  }, [token]);

  const login = async (email, password) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (data.success) {
        setToken(data.data.accessToken);
        localStorage.setItem('token', data.data.accessToken);
        if (data.data.refreshToken) {
          localStorage.setItem('refreshToken', data.data.refreshToken);
        }
        setUser(data.data.user);
        return { success: true, user: data.data.user };
      }
      return { success: false, message: data.message };
    } catch {
      return { success: false, message: 'Server error' };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });
      const data = await response.json();
      return {
        success: data.success,
        message: data.message || data.error || 'Registration failed',
      };
    } catch {
      return { success: false, message: 'Server error' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
  };

  const isConsultant = user?.role === 'consultant';
  const isHospital = user?.role === 'hospital';
  const isAdmin = user?.role === 'admin';
  const hasRole = (roles = []) => !!user && roles.includes(user.role);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
        isConsultant,
        isHospital,
        isAdmin,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
