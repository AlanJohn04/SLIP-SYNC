import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Shield, User } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { auth } from '../lib/firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [employeeIdInput, setEmployeeIdInput] = useState('');
  const navigate = useNavigate();

  const handleEmployeeIdLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeIdInput.trim()) {
      toast.error('Please enter your Employee ID or corporate email');
      return;
    }
    
    setLoading(true);
    const token = `mock_token_employee_${employeeIdInput.trim()}`;
    
    try {
      toast.loading('Validating Employee ID against database...', { id: 'emp-auth' });
      localStorage.setItem('slip_sync_token', token);
      
      const res = await axios.get('http://localhost:5000/api/auth/me', {
        headers: { 
          Authorization: `Bearer ${token}`,
          'X-Requested-Role': 'EMPLOYEE'
        }
      });
      
      const user = res.data;
      localStorage.setItem('slip_sync_role', user.role);
      localStorage.setItem('slip_sync_company', user.companyName);
      
      toast.success(`Welcome back, ${user.employeeDetails?.name || 'Employee'}!`, { id: 'emp-auth' });
      navigate('/portal');
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Authentication failed. Please verify your Employee ID.', { id: 'emp-auth' });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async (requestedRole: string) => {
    setLoading(true);
    let token = "";
    try {
      toast.loading('Contacting Google Auth...', { id: 'fb-auth' });
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      token = await userCredential.user.getIdToken();
      toast.success('Google Authenticated!', { id: 'fb-auth' });
    } catch (fbErr: any) {
      console.warn("Google Auth failed, entering local mock-token mode:", fbErr.message);
      // Seamless local fallback if offline or Google Auth not enabled in console
      const fallbackEmail = "admin@acme.com"; // default fallback for testing
      token = `mock_token_custom_${fallbackEmail.replace('@','_')}`;
      toast.success('Offline Dev Ledger Mode Activated', { id: 'fb-auth' });
    }

    try {
      localStorage.setItem('slip_sync_token', token);
      
      // Verify login with backend to get role and company info
      const res = await axios.get('http://localhost:5000/api/auth/me', {
        headers: { 
          Authorization: `Bearer ${token}`,
          'X-Requested-Role': requestedRole
        }
      });
      
      const user = res.data;
      localStorage.setItem('slip_sync_role', user.role);
      localStorage.setItem('slip_sync_company', user.companyName);
      
      toast.success(`Welcome back, ${user.employeeDetails?.name || 'Administrator'}!`);
      
      if (user.role === 'ADMIN') {
        navigate('/');
      } else {
        navigate('/portal');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-6 font-serif relative"
      style={{ 
        backgroundImage: 'repeating-linear-gradient(transparent, transparent 31px, #e5e7eb 31px, #e5e7eb 32px)', 
        backgroundColor: '#faf9f6' 
      }}
    >
      {/* Decorative Stamp */}
      <div className="absolute top-12 right-12 border-4 border-red-700/30 text-red-700/30 font-mono font-bold text-sm px-4 py-2 transform rotate-12 uppercase pointer-events-none select-none tracking-widest hidden md:block">
        AUTHENTICATED PORTAL
      </div>

      <div className="w-full max-w-md bg-[#fffdfa] border-2 border-amber-900 shadow-[8px_8px_0_0_#78350f] p-8 relative flex flex-col items-center">
        {/* Binder holes at the top of the paper slip */}
        <div className="absolute -top-3 left-0 right-0 flex justify-evenly pointer-events-none">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="w-6 h-6 rounded-full bg-[#f4f4f5] border border-gray-300 shadow-inner"></div>
          ))}
        </div>

        {/* Logo and Header */}
        <div className="text-center mt-4 mb-8">
          <div className="inline-block border-2 border-amber-800 p-2 transform -rotate-2 mb-3 bg-amber-50">
            <FileText size={32} className="text-amber-800" />
          </div>
          <h1 className="text-3xl font-black text-amber-900 uppercase tracking-widest">SLIPSYNC</h1>
          <p className="text-amber-700 font-mono text-xs uppercase tracking-wider mt-1 pb-2 border-b border-amber-950/20">
            Secure Multi-Company Payroll Ledger
          </p>
        </div>

        <div className="w-full space-y-6 text-center">
          <p className="text-sm font-mono text-amber-950">
            Please authenticate using your official corporate Google account to access your designated workspace.
          </p>

          {!showEmployeeForm ? (
            <div className="flex flex-col gap-3">
              <button
                onClick={() => handleGoogleLogin('ADMIN')}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 border-2 border-amber-900 bg-amber-100 hover:bg-amber-200 active:translate-y-0.5 active:translate-x-0.5 text-amber-950 py-3 font-mono font-bold uppercase tracking-widest transition-all shadow-[4px_4px_0_0_#78350f] active:shadow-none disabled:opacity-50"
              >
                <Shield size={18} />
                {loading ? 'Authenticating...' : 'Sign in as Admin'}
              </button>

              <button
                onClick={() => setShowEmployeeForm(true)}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 border-2 border-amber-900 bg-[#fffdfa] hover:bg-gray-50 active:translate-y-0.5 active:translate-x-0.5 text-amber-950 py-3 font-mono font-bold uppercase tracking-widest transition-all shadow-[4px_4px_0_0_#78350f] active:shadow-none disabled:opacity-50"
              >
                <User size={18} />
                Sign in as Employee
              </button>
            </div>
          ) : (
            <div className="w-full border-2 border-amber-900 bg-amber-50/50 p-5 space-y-4 shadow-[4px_4px_0_0_#78350f] transition-all duration-300">
              <h3 className="font-mono font-bold text-amber-900 uppercase text-xs tracking-wider text-left border-b border-amber-950/20 pb-1">
                Employee Verification Terminal
              </h3>
              <form onSubmit={handleEmployeeIdLogin} className="space-y-3 text-left">
                <div>
                  <label className="block text-[10px] font-mono font-bold text-amber-800 uppercase mb-1">
                    Employee ID or Corporate Email
                  </label>
                  <input
                    type="text"
                    value={employeeIdInput}
                    onChange={(e) => setEmployeeIdInput(e.target.value)}
                    placeholder="e.g. NT-0001 or employee@company.com"
                    disabled={loading}
                    className="w-full px-3 py-2 border-2 border-amber-900 bg-[#fffdfa] text-amber-950 font-mono text-sm placeholder-amber-900/30 focus:outline-none focus:ring-1 focus:ring-amber-900 transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 border-2 border-amber-900 bg-amber-800 hover:bg-amber-950 active:translate-y-0.5 active:translate-x-0.5 text-[#fffdfa] py-2.5 font-mono font-bold uppercase tracking-wider text-xs transition-all shadow-[2px_2px_0_0_#451a03] active:shadow-none disabled:opacity-50"
                >
                  {loading ? 'Verifying...' : 'Validate ID'}
                </button>
              </form>
              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-amber-950/20"></div>
                <span className="flex-shrink mx-2 text-[10px] font-mono text-amber-800 uppercase tracking-widest">or</span>
                <div className="flex-grow border-t border-amber-950/20"></div>
              </div>
              <button
                onClick={() => handleGoogleLogin('EMPLOYEE')}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 border border-amber-950 bg-[#fffdfa] hover:bg-gray-50 text-amber-950 py-2.5 font-mono font-bold text-xs uppercase tracking-wider transition-all"
              >
                <User size={14} />
                Sign in with Google Account
              </button>
              <button
                type="button"
                onClick={() => setShowEmployeeForm(false)}
                className="w-full text-center font-mono text-[10px] text-amber-700 hover:underline uppercase tracking-wider mt-1"
              >
                ← Back to Selection
              </button>
            </div>
          )}
        </div>

        {/* Receipt Tear Effect at the bottom */}
        <div className="absolute -bottom-2.5 left-0 right-0 flex pointer-events-none">
          {Array.from({ length: 22 }).map((_, i) => (
            <div 
              key={i} 
              className="w-5 h-2.5 bg-[#f3f4f6]"
              style={{ clipPath: 'polygon(50% 100%, 0 0, 100% 0)' }}
            ></div>
          ))}
        </div>
      </div>
    </div>
  );
}
