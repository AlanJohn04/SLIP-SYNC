import { useState, useEffect } from 'react';
import axios from 'axios';
import { UploadCloud, CheckCircle, XCircle, Clock, FileText, Send, FileBarChart2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

const API_BASE = 'http://localhost:5000/api';

export default function Dashboard() {
  const [statuses, setStatuses] = useState([]);
  
  const currentDate = new Date();
  const currentMonthName = currentDate.toLocaleString('default', { month: 'long' });
  const currentYearStr = currentDate.getFullYear().toString();
  
  const [month, setMonth] = useState(currentMonthName);
  const [year, setYear] = useState(currentYearStr);
  const [loading, setLoading] = useState(false);
  const [empFile, setEmpFile] = useState('');
  const [payFile, setPayFile] = useState('');
  const [showLedger, setShowLedger] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await axios.get(`${API_BASE}/payroll/status`);
      setStatuses(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Real-time polling every 1 second
    const interval = setInterval(fetchStatus, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'employees' | 'payroll') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === 'employees') setEmpFile(file.name);
    else setPayFile(file.name);

    const formData = new FormData();
    formData.append('file', file);

    try {
      setLoading(true);
      const res = await axios.post(`${API_BASE}/upload/${type}`, formData);
      toast.success(res.data.message || `${type} uploaded successfully`);
      fetchStatus();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Upload failed');
      if (type === 'employees') setEmpFile('');
      else setPayFile('');
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  const triggerGeneration = async () => {
    try {
      setLoading(true);
      const res = await axios.post(`${API_BASE}/payroll/generate`, { month, year });
      toast.success(`Processing ${res.data.queuedCount} slips in real-time...`);
      setShowLedger(true);
      fetchStatus();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to trigger generation');
    } finally {
      setLoading(false);
    }
  };

  // Used to reset the DB statuses to easily re-test
  const resetFailures = async () => {
    // Hidden feature for testing: Re-trigger all failed jobs
    triggerGeneration();
  };

  return (
    <div className="min-h-screen p-8 max-w-5xl mx-auto font-serif" style={{ backgroundImage: 'repeating-linear-gradient(transparent, transparent 31px, #e5e7eb 31px, #e5e7eb 32px)', backgroundColor: '#faf9f6' }}>
      
      {/* Paper Slip Header */}
      <div className="flex flex-col md:flex-row items-center justify-between mb-8 bg-[#fffdfa] p-8 border-t-8 border-amber-600 shadow-md relative">
        <div className="absolute top-2 right-4 text-xs font-mono text-gray-400">NO. {Math.floor(Math.random() * 10000).toString().padStart(5, '0')}</div>
        <div className="flex items-center gap-6 mb-6 md:mb-0">
          <div className="border-4 border-amber-800 p-2 transform -rotate-3">
            <FileText size={40} className="text-amber-800" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-amber-900 uppercase tracking-widest" style={{ letterSpacing: '0.1em' }}>SlipSync</h1>
            <p className="text-amber-700 font-mono text-sm mt-1 uppercase tracking-widest border-b border-amber-900 inline-block pb-1">Payroll Dispatch Engine</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center border-2 border-amber-900 bg-[#fffdfa] p-1 font-mono uppercase shadow-[4px_4px_0_0_#78350f]">
            <span className="pl-3 pr-2 text-amber-900 font-bold">Period:</span>
            <input 
              type="text" value={month} onChange={e => setMonth(e.target.value)}
              className="bg-transparent px-2 py-1 text-sm font-bold text-black focus:outline-none w-16 text-center placeholder-gray-400"
              placeholder="Month"
            />
            <div className="w-px h-5 bg-amber-900 mx-1"></div>
            <input 
              type="text" value={year} onChange={e => setYear(e.target.value)}
              className="bg-transparent px-2 py-1 text-sm font-bold text-black focus:outline-none w-16 text-center placeholder-gray-400"
              placeholder="Year"
            />
          </div>
          <button 
            onClick={triggerGeneration} disabled={loading}
            className="flex items-center gap-2 border-2 border-amber-900 bg-amber-100 hover:bg-amber-200 active:translate-y-1 active:translate-x-1 text-amber-950 px-6 py-2 font-black uppercase tracking-widest transition-all shadow-[4px_4px_0_0_#78350f] active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={18} /> Execute
          </button>
        </div>
      </div>

      {/* Step 1: Upload Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div className="bg-[#fffdfa] border-2 border-dashed border-amber-800 p-6 shadow-sm relative group transition-all hover:bg-amber-50">
          <h2 className="text-md font-bold text-amber-950 uppercase tracking-widest mb-4 flex items-center justify-center gap-2 border-b-2 border-amber-800 pb-2">
            <FileText size={18}/> 1. Master Data
          </h2>
          <label className="block w-full cursor-pointer p-6 text-center">
            <div className="flex flex-col items-center justify-center gap-3">
              <UploadCloud size={32} className={empFile ? 'text-amber-800' : 'text-amber-600/50'} />
              <span className={`text-sm font-mono ${empFile ? 'text-amber-950 font-bold' : 'text-amber-800/70'}`}>
                {empFile ? empFile : 'Attach Employee CSV'}
              </span>
            </div>
            <input type="file" className="hidden" accept=".csv,.xlsx" onChange={e => handleFileUpload(e, 'employees')} />
          </label>
          {empFile && (
            <button onClick={() => setEmpFile('')} className="absolute top-4 right-4 text-xs font-bold text-red-600 hover:text-red-800 uppercase tracking-wider">
              [X]
            </button>
          )}
        </div>

        <div className="bg-[#fffdfa] border-2 border-dashed border-amber-800 p-6 shadow-sm relative group transition-all hover:bg-amber-50">
          <h2 className="text-md font-bold text-amber-950 uppercase tracking-widest mb-4 flex items-center justify-center gap-2 border-b-2 border-amber-800 pb-2">
            <FileBarChart2 size={18}/> 2. Salary Data
          </h2>
          <label className="block w-full cursor-pointer p-6 text-center">
            <div className="flex flex-col items-center justify-center gap-3">
              <UploadCloud size={32} className={payFile ? 'text-amber-800' : 'text-amber-600/50'} />
              <span className={`text-sm font-mono ${payFile ? 'text-amber-950 font-bold' : 'text-amber-800/70'}`}>
                {payFile ? payFile : 'Attach Payroll CSV'}
              </span>
            </div>
            <input type="file" className="hidden" accept=".csv,.xlsx" onChange={e => handleFileUpload(e, 'payroll')} />
          </label>
          {payFile && (
            <button onClick={() => setPayFile('')} className="absolute top-4 right-4 text-xs font-bold text-red-600 hover:text-red-800 uppercase tracking-wider">
              [X]
            </button>
          )}
        </div>
      </div>

      {/* Step 2 & 3: Only show if executed in current session */}
      {showLedger && (
        <>
          {/* Step 2: Live Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[
              { label: 'Total Logs', value: statuses.length, icon: FileBarChart2, color: 'text-amber-900', border: 'border-amber-900' },
              { label: 'Dispatched', value: statuses.filter((s:any) => s.emailStatus === 'SENT').length, icon: CheckCircle, color: 'text-green-800', border: 'border-green-800' },
              { label: 'Pending', value: statuses.filter((s:any) => s.emailStatus === 'PENDING').length, icon: Clock, color: 'text-blue-800', border: 'border-blue-800' },
              { label: 'Failed', value: statuses.filter((s:any) => s.emailStatus === 'FAILED').length, icon: XCircle, color: 'text-red-800', border: 'border-red-800' },
            ].map((stat, i) => (
              <motion.div 
                initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                key={i} className={`bg-[#fffdfa] border-2 ${stat.border} p-6 shadow-[4px_4px_0_0_rgba(0,0,0,0.1)] relative overflow-hidden`}
              >
                <div className="relative z-10 flex flex-col items-center text-center">
                  <stat.icon size={28} className={`${stat.color} mb-3`} />
                  <p className="text-black font-mono text-xs font-bold uppercase tracking-widest mb-2 border-b border-gray-300 pb-1">{stat.label}</p>
                  <p className={`text-4xl font-black ${stat.color}`}>{stat.value}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Step 3: Tracker Table */}
          <div className="bg-[#fffdfa] border-2 border-amber-900 shadow-[6px_6px_0_0_#78350f] overflow-hidden flex flex-col h-[600px] relative">
            {/* Decorative Binder Holes */}
            <div className="absolute left-4 top-0 bottom-0 w-8 flex flex-col justify-evenly pointer-events-none">
              {[1,2,3,4,5,6].map(i => <div key={i} className="w-5 h-5 rounded-full bg-[#f4f4f5] border border-gray-300 shadow-inner"></div>)}
            </div>

            <div className="pl-14 pr-6 py-6 border-b-2 border-amber-900 bg-amber-50 flex justify-between items-center">
              <h2 className="text-xl font-black text-amber-950 uppercase tracking-widest">Official Ledger</h2>
              <span className="text-xs font-mono font-bold text-red-700 border-2 border-red-700 px-2 py-1 transform rotate-2">LIVE RECORD</span>
            </div>
            <div className="overflow-y-auto flex-1 pl-14 pr-2 custom-scrollbar">
              <table className="w-full text-left text-sm font-mono mt-4">
                <thead className="sticky top-0 bg-[#fffdfa] border-b-2 border-black text-black z-10 shadow-sm">
                  <tr>
                    <th className="py-3 px-4 font-bold uppercase tracking-widest border-r border-gray-200">Name</th>
                    <th className="py-3 px-4 font-bold uppercase tracking-widest border-r border-gray-200">Address</th>
                    <th className="py-3 px-4 font-bold uppercase tracking-widest border-r border-gray-200">Status</th>
                    <th className="py-3 px-4 font-bold uppercase tracking-widest">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {statuses.length === 0 && (
                    <tr><td colSpan={4} className="py-12 text-center text-gray-500 font-bold uppercase tracking-widest">Ledger Empty.</td></tr>
                  )}
                  {statuses.map((s: any, i) => (
                    <motion.tr 
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}
                      key={s._id} className="hover:bg-amber-50 transition-colors group"
                    >
                      <td className="py-4 px-4 font-bold text-black border-r border-gray-100">{s.employeeName}</td>
                      <td className="py-4 px-4 text-gray-600 text-xs border-r border-gray-100">{s.employeeEmail}</td>
                      <td className="py-4 px-4 border-r border-gray-100">
                        <span className={`px-2 py-1 text-[10px] font-black uppercase tracking-widest border-2 ${
                          s.emailStatus === 'SENT' ? 'text-green-700 border-green-700 rotate-1 inline-block' :
                          s.emailStatus === 'PENDING' ? 'text-blue-700 border-blue-700 -rotate-1 inline-block' :
                          'text-red-700 border-red-700 rotate-2 inline-block'
                        }`}>
                          {s.emailStatus}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-gray-400 text-[10px] font-medium">
                        {s.sentAt ? new Date(s.sentAt).toLocaleTimeString() : '-'}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
