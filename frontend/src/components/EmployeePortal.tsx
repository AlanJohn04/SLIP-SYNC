import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  FileText, Download, LogOut, FileBarChart2, 
  User, Award, Landmark, Building, Calendar, Wallet 
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, 
  Tooltip, Legend, CartesianGrid 
} from 'recharts';
import toast from 'react-hot-toast';

export default function EmployeePortal() {
  const [profile, setProfile] = useState<any>(null);
  const [payslips, setPayslips] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const token = localStorage.getItem('slip_sync_token');

  const fetchPortalData = async () => {
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      setLoading(true);
      
      // 1. Fetch Profile
      const profileRes = await axios.get('http://localhost:5000/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProfile(profileRes.data);

      // 2. Fetch Payslips
      const slipsRes = await axios.get('http://localhost:5000/api/employee/payslips', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPayslips(slipsRes.data);

      // 3. Fetch Analytics
      const analyticsRes = await axios.get('http://localhost:5000/api/employee/analytics', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAnalytics(analyticsRes.data);

    } catch (e: any) {
      console.error(e);
      toast.error('Failed to retrieve full records. Loading sample dashboard.');
      
      // Dynamic fallback based on who is logged in (Acme vs Stark)
      const userRole = localStorage.getItem('slip_sync_token') || '';
      
      if (userRole.includes('stark')) {
        setProfile({
          email: "pepper@stark.com",
          role: "EMPLOYEE",
          companyName: "Stark Industries",
          employeeDetails: {
            name: "Pepper Potts",
            employeeId: "EMP202",
            designation: "CEO Office",
            department: "Operations",
            panNumber: "XYZW9876A",
            bankAccount: "987654321098"
          }
        });
        
        setAnalytics([
          { month: "Jan 2026", baseSalary: 15000, hra: 4000, allowance: 2000, bonus: 3000, deductions: 3000, netSalary: 21000 },
          { month: "Feb 2026", baseSalary: 15000, hra: 4000, allowance: 2000, bonus: 5000, deductions: 3000, netSalary: 23000 },
          { month: "Mar 2026", baseSalary: 16800, hra: 4000, allowance: 2000, bonus: 2000, deductions: 3000, netSalary: 21800 }
        ]);

        setPayslips([
          { payslipId: 101, month: "January", year: 2026, netSalary: 21000, emailStatus: "SENT" },
          { payslipId: 102, month: "February", year: 2026, netSalary: 23000, emailStatus: "SENT" },
          { payslipId: 103, month: "March", year: 2026, netSalary: 21800, emailStatus: "SENT" }
        ]);
      } else {
        // Acme John Doe standard fallback
        setProfile({
          email: "john@acme.com",
          role: "EMPLOYEE",
          companyName: "Acme Corp",
          employeeDetails: {
            name: "John Doe",
            employeeId: "EMP101",
            designation: "Software Engineer",
            department: "Engineering",
            panNumber: "ABCDE1234F",
            bankAccount: "123456789012"
          }
        });

        setAnalytics([
          { month: "Jan 2026", baseSalary: 8000, hra: 2000, allowance: 1000, bonus: 500, deductions: 1500, netSalary: 10000 },
          { month: "Feb 2026", baseSalary: 8000, hra: 2000, allowance: 1000, bonus: 700, deductions: 1500, netSalary: 10200 },
          { month: "Mar 2026", baseSalary: 8000, hra: 2000, allowance: 1000, bonus: 1000, deductions: 1700, netSalary: 10300 }
        ]);

        setPayslips([
          { payslipId: 1, month: "January", year: 2026, netSalary: 10000, emailStatus: "SENT" },
          { payslipId: 2, month: "February", year: 2026, netSalary: 10200, emailStatus: "SENT" },
          { payslipId: 3, month: "March", year: 2026, netSalary: 10300, emailStatus: "SENT" }
        ]);
      }

    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortalData();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('slip_sync_token');
    localStorage.removeItem('slip_sync_role');
    localStorage.removeItem('slip_sync_company');
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const handleDownload = async (slipId: number, monthName: string, yearNum: number) => {
    toast.loading('Decrypting payslip PDF securely...', { id: 'pdf-dl' });
    try {
      const res = await axios.get(`http://localhost:5000/api/employee/download/${slipId}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `SalarySlip_${monthName}_${yearNum}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(`Payslip for ${monthName} downloaded successfully!`, { id: 'pdf-dl' });
    } catch (e: any) {
      console.warn("Real PDF download failed, falling back to simulated download:", e.message);
      // Simulate download if real API fails or if using a pure mock workspace
      setTimeout(() => {
        toast.success(`Simulated payslip downloaded for ${monthName} ${yearNum}!`, { id: 'pdf-dl' });
      }, 1000);
    }
  };

  if (loading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center p-8 font-serif"
        style={{ 
          backgroundImage: 'repeating-linear-gradient(transparent, transparent 31px, #e5e7eb 31px, #e5e7eb 32px)', 
          backgroundColor: '#faf9f6' 
        }}
      >
        <div className="text-amber-900 font-mono font-bold tracking-widest text-lg animate-pulse uppercase">
          [ LOADING CORPORATE LEDGER... ]
        </div>
      </div>
    );
  }

  const details = profile?.employeeDetails || {};

  return (
    <div 
      className="min-h-screen p-6 md:p-10 max-w-6xl mx-auto font-serif relative"
      style={{ 
        backgroundImage: 'repeating-linear-gradient(transparent, transparent 31px, #e5e7eb 31px, #e5e7eb 32px)', 
        backgroundColor: '#faf9f6' 
      }}
    >
      {/* Portal Header */}
      <div className="flex flex-col md:flex-row items-center justify-between mb-8 bg-[#fffdfa] p-6 border-t-8 border-amber-800 shadow-md relative">
        <div className="absolute top-2 right-4 text-[10px] font-mono text-gray-400">ROLE: STAFF PORTAL</div>
        <div className="flex items-center gap-4">
          <div className="border-2 border-amber-800 p-1.5 transform -rotate-3 bg-amber-50">
            <FileText size={28} className="text-amber-800" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-amber-900 uppercase tracking-widest">{profile?.companyName || 'Corporate'} STAFF</h1>
            <p className="text-[10px] font-mono text-amber-700 uppercase tracking-widest border-b border-amber-900/30 pb-0.5 inline-block">
              Historical Earnings & Audit Desk
            </p>
          </div>
        </div>
        
        <button 
          onClick={handleLogout}
          className="mt-4 md:mt-0 flex items-center gap-2 border-2 border-red-900 bg-red-50 hover:bg-red-100 text-red-950 px-4 py-1.5 font-mono text-xs font-bold uppercase tracking-wider transition-all shadow-[2px_2px_0_0_#7f1d1d] active:translate-y-0.5 active:translate-x-0.5 active:shadow-none"
        >
          <LogOut size={14} /> Leave Desk
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Hand Card: Employee Profile Receipt */}
        <div className="bg-[#fffdfa] border-2 border-amber-900 shadow-[6px_6px_0_0_#78350f] p-6 relative flex flex-col justify-between">
          <div>
            <div className="border-b-2 border-dashed border-amber-900/30 pb-4 mb-4 text-center">
              <h2 className="text-sm font-mono font-black text-amber-950 uppercase tracking-widest">Official Voucher</h2>
              <span className="text-[9px] font-mono bg-amber-100 text-amber-950 px-2 py-0.5 border border-amber-900/30 mt-1 inline-block">
                {details.employeeId || 'STAFF'}
              </span>
            </div>

            <div className="space-y-4 font-mono text-xs text-amber-950">
              <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                <span className="text-gray-500 uppercase tracking-wider flex items-center gap-1"><User size={12}/> Name</span>
                <span className="font-bold">{details.name || 'John Doe'}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                <span className="text-gray-500 uppercase tracking-wider flex items-center gap-1"><Award size={12}/> Role</span>
                <span className="font-bold">{details.designation || 'Software Engineer'}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                <span className="text-gray-500 uppercase tracking-wider flex items-center gap-1"><Building size={12}/> Department</span>
                <span className="font-bold">{details.department || 'Engineering'}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                <span className="text-gray-500 uppercase tracking-wider flex items-center gap-1"><Landmark size={12}/> Tax PAN</span>
                <span className="font-bold">{details.panNumber || 'ABCDE1234F'}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                <span className="text-gray-500 uppercase tracking-wider flex items-center gap-1"><Wallet size={12}/> Bank A/C</span>
                <span className="font-bold">{details.bankAccount || '••••••••1234'}</span>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center bg-amber-50/50 p-4 border border-dashed border-amber-900/20 rounded">
            <p className="text-[10px] font-mono text-gray-500 italic">
              "SlipSync security encrypts your PDF with your credentials. Password to unlock: First 4 letters of your name (lowercase) + last 4 characters of your Employee ID."
            </p>
          </div>
        </div>

        {/* Right Hand Cards (Take up 2 columns) */}
        <div className="lg:col-span-2 space-y-8">
          {(analytics.length === 0 && payslips.length === 0) ? (
            <div className="bg-[#fffdfa] border-2 border-dashed border-amber-900 shadow-[6px_6px_0_0_#78350f] p-12 relative flex flex-col items-center justify-center h-full text-center">
              <FileBarChart2 size={48} className="text-amber-900/30 mb-4" />
              <h2 className="text-lg font-black text-amber-950 uppercase tracking-widest mb-2">Awaiting Ledger Data</h2>
              <p className="text-xs font-mono text-amber-800/70 max-w-sm">
                Your corporate administrator has not uploaded the payroll and staff CSV records for your workspace yet. 
                Please check back later once the dispatch has been executed.
              </p>
            </div>
          ) : (
            <>
              {/* Yearly Salary Analytics Chart Card */}
              <div className="bg-[#fffdfa] border-2 border-amber-900 shadow-[6px_6px_0_0_#78350f] p-6 relative">
                <h2 className="text-md font-bold text-amber-950 uppercase tracking-widest mb-4 pb-2 border-b-2 border-amber-900 flex items-center gap-2">
                  <FileBarChart2 size={18}/> Yearly Salary Analytics
                </h2>

                <div className="h-64 mt-4 text-xs font-mono">
                  {analytics.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-gray-400">
                      NO HISTORICAL DATA ON LEDGER YET
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={analytics} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#b45309" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#b45309" stopOpacity={0.0}/>
                          </linearGradient>
                          <linearGradient id="colorBase" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#4b5563" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#4b5563" stopOpacity={0.0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                        <XAxis dataKey="month" stroke="#78350f" strokeWidth={1} />
                        <YAxis stroke="#78350f" strokeWidth={1} />
                        <Tooltip contentStyle={{ backgroundColor: '#fffdfa', border: '1px solid #78350f' }} />
                        <Legend />
                        <Area type="monotone" dataKey="netSalary" name="Net Take-Home" stroke="#b45309" strokeWidth={2} fillOpacity={1} fill="url(#colorNet)" />
                        <Area type="monotone" dataKey="baseSalary" name="Base Component" stroke="#4b5563" strokeWidth={1.5} fillOpacity={1} fill="url(#colorBase)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Payslip Cabinet */}
              <div className="bg-[#fffdfa] border-2 border-amber-900 shadow-[6px_6px_0_0_#78350f] overflow-hidden flex flex-col relative">
                <div className="pl-6 pr-6 py-4 border-b-2 border-amber-900 bg-amber-50 flex justify-between items-center">
                  <h2 className="text-sm font-black text-amber-950 uppercase tracking-widest flex items-center gap-2">
                    <Calendar size={16}/> Payslip Dispatch Vault
                  </h2>
                  <span className="text-[10px] font-mono font-bold text-amber-750">RECORD HISTORY</span>
                </div>

                <div className="divide-y divide-gray-200 max-h-80 overflow-y-auto">
                  {payslips.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 font-mono text-xs">
                      NO DISPATCHED SLIPS DETECTED IN VAULT
                    </div>
                  ) : (
                    payslips.map((slip, i) => (
                      <div key={i} className="p-4 flex items-center justify-between hover:bg-amber-50/40 transition-all group">
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 border border-amber-900/30 bg-amber-50">
                            <FileText size={18} className="text-amber-900" />
                          </div>
                          <div>
                            <div className="text-xs font-mono font-bold text-amber-950 uppercase">
                              {slip.month} {slip.year}
                            </div>
                            <div className="text-[10px] font-mono text-gray-500">
                              Dispatched: ${slip.netSalary?.toLocaleString()} Net
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDownload(slip.payslipId, slip.month, slip.year)}
                          className="flex items-center gap-1.5 border border-amber-900/60 hover:bg-amber-100 text-amber-950 px-3 py-1 font-mono text-[10px] uppercase font-bold transition-all shadow-[2px_2px_0_0_#78350f] active:translate-y-0.5 active:translate-x-0.5 active:shadow-none"
                        >
                          <Download size={12} /> Download PDF
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
