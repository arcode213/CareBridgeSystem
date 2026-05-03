import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './features/auth/AuthContext';
import AuthLayout from './layouts/AuthLayout';
import DashboardLayout from './layouts/DashboardLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import ConsultantRegister from './pages/ConsultantRegister';
import HospitalRegister from './pages/HospitalRegister';
import Landing from './pages/Landing';
import ConsultantDashboard from './pages/ConsultantDashboard';
import SmartIntakeForm from './pages/SmartIntakeForm';
import ReferralsList from './pages/ReferralsList';
import HospitalDashboard from './pages/HospitalDashboard';
import ReferralInbox from './pages/ReferralInbox';
import BedManagement from './pages/BedManagement';
import HospitalAdmissions from './pages/HospitalAdmissions';
import ConsultantEarnings from './pages/ConsultantEarnings';
import AdminOverview from './pages/admin/AdminOverview';
import AdminApprovals from './pages/admin/AdminApprovals';
import AdminScoring from './pages/admin/AdminScoring';
import AdminDepartments from './pages/admin/AdminDepartments';
import AdminPayouts from './pages/admin/AdminPayouts';
import AdminSettings from './pages/admin/AdminSettings';
import { useAuth } from './features/auth/AuthContext';

const RoleGuard = ({ children, roles }) => {
  const { user, token } = useAuth();

  if (!token) return <Navigate to="/login" replace />;
  if (user && roles && !roles.includes(user.role)) return <Navigate to="/" replace />;

  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Landing />} />

          <Route element={<AuthLayout />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/register/consultant" element={<ConsultantRegister />} />
            <Route path="/register/hospital" element={<HospitalRegister />} />
          </Route>

          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<RoleGuard roles={['consultant']}><ConsultantDashboard /></RoleGuard>} />
            <Route path="/referrals/new" element={<RoleGuard roles={['consultant']}><SmartIntakeForm /></RoleGuard>} />
            <Route path="/referrals" element={<RoleGuard roles={['consultant']}><ReferralsList /></RoleGuard>} />
            <Route path="/earnings" element={<RoleGuard roles={['consultant']}><ConsultantEarnings /></RoleGuard>} />

            <Route path="/hospital/dashboard" element={<RoleGuard roles={['hospital']}><HospitalDashboard /></RoleGuard>} />
            <Route path="/hospital/inbox" element={<RoleGuard roles={['hospital']}><ReferralInbox /></RoleGuard>} />
            <Route path="/hospital/admissions" element={<RoleGuard roles={['hospital']}><HospitalAdmissions /></RoleGuard>} />
            <Route path="/hospital/beds" element={<RoleGuard roles={['hospital']}><BedManagement /></RoleGuard>} />

            <Route path="/admin/overview" element={<RoleGuard roles={['admin']}><AdminOverview /></RoleGuard>} />
            <Route path="/admin/approvals" element={<RoleGuard roles={['admin']}><AdminApprovals /></RoleGuard>} />
            <Route path="/admin/scoring" element={<RoleGuard roles={['admin']}><AdminScoring /></RoleGuard>} />
            <Route path="/admin/departments" element={<RoleGuard roles={['admin']}><AdminDepartments /></RoleGuard>} />
            <Route path="/admin/payouts" element={<RoleGuard roles={['admin']}><AdminPayouts /></RoleGuard>} />
            <Route path="/admin/settings" element={<RoleGuard roles={['admin']}><AdminSettings /></RoleGuard>} />
            <Route path="/admin" element={<Navigate to="/admin/overview" replace />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
