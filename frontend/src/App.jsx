import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import { AuthProvider, useAuth } from './features/auth/AuthContext';
import { Toaster } from 'react-hot-toast';
import { SOCKET_URL } from './config';
import AuthLayout from './layouts/AuthLayout';
import DashboardLayout from './layouts/DashboardLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import ConsultantRegister from './pages/ConsultantRegister';
import HospitalRegister from './pages/HospitalRegister';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
import ConsultantDashboard from './pages/ConsultantDashboard';
import SmartIntakeForm from './pages/SmartIntakeForm';
import ReferralsList from './pages/ReferralsList';
import HospitalDashboard from './pages/HospitalDashboard';
import ReferralInbox from './pages/ReferralInbox';
import BedManagement from './pages/BedManagement';
import HospitalAdmissions from './pages/HospitalAdmissions';
import DoctorManagement from './pages/DoctorManagement';
import HospitalEmergencyCenter from './pages/HospitalEmergencyCenter';
import HospitalDepartments from './pages/HospitalDepartments';
import ConsultantEarnings from './pages/ConsultantEarnings';
import HospitalLedger from './pages/HospitalLedger';
import AdminOverview from './pages/admin/AdminOverview';
import AdminApprovals from './pages/admin/AdminApprovals';
import AdminConsultants from './pages/admin/AdminConsultants';
import AdminHospitals from './pages/admin/AdminHospitals';
import AdminScoring from './pages/admin/AdminScoring';
import AdminDepartments from './pages/admin/AdminDepartments';
import AdminPayouts from './pages/admin/AdminPayouts';
import AdminSettings from './pages/admin/AdminSettings';
import AdminReferrals from './pages/admin/AdminReferrals';
import AdminBeds from './pages/admin/AdminBeds';
import AdminAudit from './pages/admin/AdminAudit';
const RoleGuard = ({ children, roles }) => {
  const { user, token } = useAuth();

  if (!token) return <Navigate to="/login" replace />;
  if (user && roles && !roles.includes(user.role)) return <Navigate to="/" replace />;

  return children;
};

/** Global Socket Listener to invalidate TanStack queries on real-time events */
const SocketListener = () => {
  const { token, user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!token || !user) return undefined;

    const socket = io(SOCKET_URL, { transports: ['websocket'] });

    if (user.role === 'hospital') {
      socket.emit('join_hospital', { token });
      socket.on('NEW_REFERRAL', () => {
        queryClient.invalidateQueries({ queryKey: ['inbox'] });
        queryClient.invalidateQueries({ queryKey: ['pipeline'] });
      });
      socket.on('REFERRAL_ESCALATED', () => {
        queryClient.invalidateQueries({ queryKey: ['inbox'] });
        queryClient.invalidateQueries({ queryKey: ['pipeline'] });
      });
      socket.on('STATUS_UPDATE', () => {
        queryClient.invalidateQueries({ queryKey: ['inbox'] });
        queryClient.invalidateQueries({ queryKey: ['admissions'] });
        queryClient.invalidateQueries({ queryKey: ['pipeline'] });
      });
      socket.on('BED_UPDATE', () => {
        queryClient.invalidateQueries({ queryKey: ['beds'] });
      });
    }

    if (user.role === 'consultant') {
      socket.emit('join_consultant', { token });
      socket.on('STATUS_UPDATE', () => {
        queryClient.invalidateQueries({ queryKey: ['referrals'] });
        queryClient.invalidateQueries({ queryKey: ['earnings'] });
      });
      socket.on('REFERRAL_ESCALATED', () => {
        queryClient.invalidateQueries({ queryKey: ['referrals'] });
      });
    }

    return () => socket.disconnect();
  }, [token, user, queryClient]);

  return null;
};

import ProfileSettings from './pages/ProfileSettings';

function App() {
  return (
    <AuthProvider>
      <SocketListener />
      <Toaster position="top-right" />
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/verify-email" element={<VerifyEmail />} />

          <Route element={<AuthLayout />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/register/consultant" element={<ConsultantRegister />} />
            <Route path="/register/hospital" element={<HospitalRegister />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
          </Route>

          <Route element={<DashboardLayout />}>
            <Route path="/profile" element={<ProfileSettings />} />
            <Route path="/dashboard" element={<RoleGuard roles={['consultant']}><ConsultantDashboard /></RoleGuard>} />
            <Route path="/referrals/new" element={<RoleGuard roles={['consultant']}><SmartIntakeForm /></RoleGuard>} />
            <Route path="/referrals" element={<RoleGuard roles={['consultant']}><ReferralsList /></RoleGuard>} />
            <Route path="/earnings" element={<RoleGuard roles={['consultant']}><ConsultantEarnings /></RoleGuard>} />

            <Route path="/hospital/dashboard" element={<RoleGuard roles={['hospital']}><HospitalDashboard /></RoleGuard>} />
            <Route path="/hospital/inbox" element={<RoleGuard roles={['hospital']}><ReferralInbox /></RoleGuard>} />
            <Route path="/hospital/admissions" element={<RoleGuard roles={['hospital']}><HospitalAdmissions /></RoleGuard>} />
            <Route path="/hospital/beds" element={<RoleGuard roles={['hospital']}><BedManagement /></RoleGuard>} />
            <Route path="/hospital/doctors" element={<RoleGuard roles={['hospital']}><DoctorManagement /></RoleGuard>} />
            <Route path="/hospital/emergency" element={<RoleGuard roles={['hospital']}><HospitalEmergencyCenter /></RoleGuard>} />
            <Route path="/hospital/departments" element={<RoleGuard roles={['hospital']}><HospitalDepartments /></RoleGuard>} />
            <Route path="/hospital/ledger" element={<RoleGuard roles={['hospital']}><HospitalLedger /></RoleGuard>} />

            <Route path="/admin/overview" element={<RoleGuard roles={['admin']}><AdminOverview /></RoleGuard>} />
            <Route path="/admin/approvals" element={<RoleGuard roles={['admin']}><AdminApprovals /></RoleGuard>} />
            <Route path="/admin/consultants" element={<RoleGuard roles={['admin']}><AdminConsultants /></RoleGuard>} />
            <Route path="/admin/hospitals" element={<RoleGuard roles={['admin']}><AdminHospitals /></RoleGuard>} />
            <Route path="/admin/scoring" element={<RoleGuard roles={['admin']}><AdminScoring /></RoleGuard>} />
            <Route path="/admin/departments" element={<RoleGuard roles={['admin']}><AdminDepartments /></RoleGuard>} />
            <Route path="/admin/payouts" element={<RoleGuard roles={['admin']}><AdminPayouts /></RoleGuard>} />
            <Route path="/admin/settings" element={<RoleGuard roles={['admin']}><AdminSettings /></RoleGuard>} />
            <Route path="/admin/referrals" element={<RoleGuard roles={['admin']}><AdminReferrals /></RoleGuard>} />
            <Route path="/admin/beds" element={<RoleGuard roles={['admin']}><AdminBeds /></RoleGuard>} />
            <Route path="/admin/audit" element={<RoleGuard roles={['admin']}><AdminAudit /></RoleGuard>} />
            <Route path="/admin" element={<Navigate to="/admin/overview" replace />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
