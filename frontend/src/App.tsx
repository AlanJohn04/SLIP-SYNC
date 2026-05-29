import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import Verify from './components/Verify';
import Login from './components/Login';
import EmployeePortal from './components/EmployeePortal';
import { Toaster } from 'react-hot-toast';

// Simple Route Guards
function RequireAdmin({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('slip_sync_token');
  const role = localStorage.getItem('slip_sync_role');
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  if (role !== 'ADMIN') {
    return <Navigate to="/portal" replace />;
  }
  return <>{children}</>;
}

function RequireEmployee({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('slip_sync_token');
  const role = localStorage.getItem('slip_sync_role');
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  if (role !== 'EMPLOYEE') {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

function App() {
  return (
    <div className="min-h-screen bg-[#f3f4f6] text-slate-900 font-sans selection:bg-red-200">
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route 
            path="/" 
            element={
              <RequireAdmin>
                <Dashboard />
              </RequireAdmin>
            } 
          />
          <Route 
            path="/portal" 
            element={
              <RequireEmployee>
                <EmployeePortal />
              </RequireEmployee>
            } 
          />
          <Route path="/verify/:slipId" element={<Verify />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
      <Toaster position="bottom-right" />
    </div>
  );
}

export default App;
