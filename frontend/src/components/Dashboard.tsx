import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  UploadCloud, CheckCircle, XCircle, Clock, FileText, Send, 
  FileBarChart2, LogOut, Bot, Mic, MicOff, AlertCircle 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

const API_BASE = 'http://localhost:5000/api';

export default function Dashboard() {
  const [statuses, setStatuses] = useState<any[]>([]);
  const navigate = useNavigate();

  const currentDate = new Date();
  const currentMonthName = currentDate.toLocaleString('default', { month: 'long' });
  const currentYearStr = currentDate.getFullYear().toString();
  
  const [month, setMonth] = useState(currentMonthName);
  const [year, setYear] = useState(currentYearStr);
  const [loading, setLoading] = useState(false);
  const [empFile, setEmpFile] = useState('');
  const [payFile, setPayFile] = useState('');
  const [showLedger, setShowLedger] = useState(false);
  
  // New SaaS states
  const [companyName, setCompanyName] = useState('My Company');
  const [insights, setInsights] = useState<any>(null);
  
  // Voice states
  const [isListening, setIsListening] = useState(false);
  const [voiceText, setVoiceText] = useState('');

  const token = localStorage.getItem('slip_sync_token');
  const headers = { Authorization: `Bearer ${token}` };

  const fetchStatus = async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API_BASE}/payroll/status`, { headers });
      setStatuses(res.data);
      // Auto show ledger if we have statuses
      if (res.data.length > 0) {
        setShowLedger(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchInsights = async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API_BASE}/payroll/insights`, { headers });
      setInsights(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const verifyAuth = async () => {
    if (!token) {
      navigate('/login');
      return;
    }
    try {
      const res = await axios.get(`${API_BASE}/auth/me`, { headers });
      setCompanyName(res.data.companyName);
    } catch (e) {
      localStorage.removeItem('slip_sync_token');
      navigate('/login');
    }
  };

  useEffect(() => {
    verifyAuth();
    fetchStatus();
    fetchInsights();
    
    // Polling every 2 seconds for ledger updates
    const interval = setInterval(fetchStatus, 2000);
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
      const res = await axios.post(`${API_BASE}/upload/${type}`, formData, { headers });
      toast.success(res.data.message || `${type} uploaded successfully`);
      fetchStatus();
      fetchInsights();
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
    await triggerGenerationWithParams(month, year);
  };

  const triggerGenerationWithParams = async (m: string, y: string) => {
    try {
      setLoading(true);
      const res = await axios.post(`${API_BASE}/payroll/generate`, { month: m, year: y }, { headers });
      toast.success(`Processing ${res.data.queuedCount} slips in real-time...`);
      setShowLedger(true);
      fetchStatus();
      fetchInsights();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || err.response?.data?.error || 'Failed to trigger generation');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('slip_sync_token');
    localStorage.removeItem('slip_sync_role');
    localStorage.removeItem('slip_sync_company');
    toast.success('Logged out successfully');
    navigate('/login');
  };

  // --- Voice Recognition Logic ---
  const startVoiceAssistant = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Web Speech API is not supported on this browser. Try Google Chrome.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setVoiceText('Listening for your command...');
    };

    recognition.onresult = (event: any) => {
      const result = event.results[0][0].transcript.toLowerCase();
      setVoiceText(`Heard: "${result}"`);
      processVoiceCommand(result);
    };

    recognition.onerror = () => {
      setIsListening(false);
      setVoiceText('Voice capture failed.');
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const processVoiceCommand = (command: string) => {
    const months = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
    let matchedMonth = "";
    
    for (const m of months) {
      if (command.includes(m)) {
        matchedMonth = m.charAt(0).toUpperCase() + m.slice(1);
        break;
      }
    }

    const yearMatch = command.match(/\b(20\d{2})\b/);
    const matchedYear = yearMatch ? yearMatch[1] : year;

    if (command.includes('generate') || command.includes('execute') || command.includes('run')) {
      if (matchedMonth) {
        setMonth(matchedMonth);
        if (yearMatch) setYear(matchedYear);
        
        speakBack(`Generating ${matchedMonth} ${matchedYear} payroll files. Processing dispatch logs now.`);
        toast.success(`Voice Command: Generate ${matchedMonth} ${matchedYear} payroll`);
        
        setTimeout(() => {
          triggerGenerationWithParams(matchedMonth, matchedYear);
        }, 1200);
      } else {
        speakBack("Please specify a month. Try saying: 'Generate March payroll'.");
      }
    } else if (command.includes('bonus') && insights?.hasData) {
      speakBack(`According to the ledger, ${insights.topBonusDepartment}`);
    } else if ((command.includes('expense') || command.includes('salary change')) && insights?.hasData) {
      speakBack(`The analysis shows that ${insights.salaryExpenseChange}`);
    } else if ((command.includes('deduction') || command.includes('anomaly')) && insights?.hasData) {
      speakBack(`I found ${insights.unusualDeductions}. Scrolling to the audit panel now.`);
      const panel = document.getElementById("ai-insights-panel");
      if (panel) {
        panel.scrollIntoView({ behavior: 'smooth' });
      }
    } else if (command.includes('insight') || command.includes('stats') || command.includes('pattern')) {
      speakBack("Sourcing AI payroll insight checklist.");
      const panel = document.getElementById("ai-insights-panel");
      if (panel) {
        panel.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      speakBack("Command not recognized. You can say 'Generate March payroll', 'Who got the highest bonus?', or 'Show unusual deductions'.");
    }
  };

  const speakBack = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // cancel any active speech
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.pitch = 1.05;
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div 
      className="min-h-screen p-6 md:p-8 max-w-5xl mx-auto font-serif relative" 
      style={{ 
        backgroundImage: 'repeating-linear-gradient(transparent, transparent 31px, #e5e7eb 31px, #e5e7eb 32px)', 
        backgroundColor: '#faf9f6' 
      }}
    >
      {/* SaaS Tenant Indicator & Logout */}
      <div className="flex justify-between items-center mb-4 px-4">
        <div className="flex items-center gap-2 bg-[#fffdfa] border border-amber-900/30 px-3 py-1 font-mono text-[10px] text-amber-950 uppercase shadow-sm">
          <span className="font-black text-red-800">ORGANIZATION:</span> {companyName}
        </div>
        <button 
          onClick={handleLogout}
          className="flex items-center gap-1.5 border border-red-900/40 bg-[#fffdfa] hover:bg-red-50 text-red-950 px-3 py-1 font-mono text-[10px] font-bold uppercase transition-all shadow-sm active:translate-y-0.5"
        >
          <LogOut size={12} /> Leave Ledger
        </button>
      </div>

      {/* Paper Slip Header */}
      <div className="flex flex-col md:flex-row items-center justify-between mb-8 bg-[#fffdfa] p-8 border-t-8 border-amber-800 shadow-md relative">
        <div className="absolute top-2 right-4 text-[9px] font-mono text-gray-400">NO. {Math.floor(Math.random() * 10000).toString().padStart(5, '0')}</div>
        <div className="flex items-center gap-6 mb-6 md:mb-0">
          <div className="border-4 border-amber-800 p-2 transform -rotate-3 bg-amber-50 shadow-sm">
            <FileText size={40} className="text-amber-800" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-amber-900 uppercase tracking-widest" style={{ letterSpacing: '0.05em' }}>SlipSync</h1>
            <p className="text-amber-700 font-mono text-xs mt-1 uppercase tracking-widest border-b border-amber-900 inline-block pb-0.5 font-bold">
              Dispatch Console
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          {/* Period selector */}
          <div className="flex items-center border-2 border-amber-900 bg-[#fffdfa] p-1 font-mono uppercase shadow-[4px_4px_0_0_#78350f]">
            <span className="pl-3 pr-2 text-amber-900 font-bold text-xs">Period:</span>
            <input 
              type="text" value={month} onChange={e => setMonth(e.target.value)}
              className="bg-transparent px-1 py-0.5 text-xs font-bold text-black focus:outline-none w-16 text-center placeholder-gray-400"
              placeholder="Month"
            />
            <div className="w-px h-4 bg-amber-900 mx-1"></div>
            <input 
              type="text" value={year} onChange={e => setYear(e.target.value)}
              className="bg-transparent px-1 py-0.5 text-xs font-bold text-black focus:outline-none w-14 text-center placeholder-gray-400"
              placeholder="Year"
            />
          </div>

          <button 
            onClick={triggerGeneration} disabled={loading}
            className="flex items-center gap-2 border-2 border-amber-900 bg-amber-100 hover:bg-amber-200 active:translate-y-0.5 active:translate-x-0.5 text-amber-950 px-5 py-2 font-black uppercase text-xs tracking-widest transition-all shadow-[4px_4px_0_0_#78350f] active:shadow-none disabled:opacity-50"
          >
            <Send size={14} /> Execute
          </button>
        </div>
      </div>

      {/* Voice Assistant Widget */}
      {insights?.hasData && (
      <div className="bg-[#fffdfa] border-2 border-amber-900 shadow-[4px_4px_0_0_#78350f] p-4 mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 border border-amber-900/30 bg-amber-50 rounded-full">
            <Bot size={20} className="text-amber-950 animate-bounce" />
          </div>
          <div>
            <h3 className="text-xs font-mono font-black text-amber-950 uppercase tracking-wider">Voice Control Operator</h3>
            <p className="text-[10px] font-mono text-gray-500">
              {voiceText || "Say: 'Highest bonus?', 'Salary expense?', or 'Generate March payroll'"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isListening && (
            <div className="flex items-center gap-1 px-3">
              <span className="w-1.5 h-3 bg-red-600 animate-pulse rounded-full"></span>
              <span className="w-1.5 h-5 bg-red-600 animate-pulse rounded-full delay-75"></span>
              <span className="w-1.5 h-2.5 bg-red-600 animate-pulse rounded-full delay-150"></span>
            </div>
          )}
          
          <button
            onClick={startVoiceAssistant}
            disabled={isListening}
            className={`flex items-center gap-1.5 border-2 border-amber-900 px-4 py-1.5 font-mono text-[10px] font-bold uppercase transition-all shadow-[2px_2px_0_0_#78350f] active:translate-y-0.5 active:shadow-none ${
              isListening ? 'bg-red-50 text-red-950 border-red-900' : 'bg-amber-50 text-amber-950'
            }`}
          >
            {isListening ? <MicOff size={12}/> : <Mic size={12}/>}
            {isListening ? 'Listening...' : 'Open Mic'}
          </button>
        </div>
      </div>
      )}

      {/* Upload Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div className="bg-[#fffdfa] border-2 border-dashed border-amber-800 p-6 shadow-sm relative group transition-all hover:bg-amber-50/50">
          <h2 className="text-xs font-bold text-amber-950 uppercase tracking-widest mb-4 flex items-center justify-center gap-2 border-b border-amber-800 pb-2">
            <FileText size={16}/> 1. Master Staff Data
          </h2>
          <label className="block w-full cursor-pointer p-6 text-center">
            <div className="flex flex-col items-center justify-center gap-2">
              <UploadCloud size={28} className={empFile ? 'text-amber-800' : 'text-amber-600/40'} />
              <span className={`text-[11px] font-mono ${empFile ? 'text-amber-950 font-bold' : 'text-amber-800/70'}`}>
                {empFile ? empFile : 'Attach Employee CSV'}
              </span>
            </div>
            <input type="file" className="hidden" accept=".csv,.xlsx" onChange={e => handleFileUpload(e, 'employees')} />
          </label>
        </div>

        <div className="bg-[#fffdfa] border-2 border-dashed border-amber-800 p-6 shadow-sm relative group transition-all hover:bg-amber-50/50">
          <h2 className="text-xs font-bold text-amber-950 uppercase tracking-widest mb-4 flex items-center justify-center gap-2 border-b border-amber-800 pb-2">
            <FileBarChart2 size={16}/> 2. Monthly Salary Data
          </h2>
          <label className="block w-full cursor-pointer p-6 text-center">
            <div className="flex flex-col items-center justify-center gap-2">
              <UploadCloud size={28} className={payFile ? 'text-amber-800' : 'text-amber-600/40'} />
              <span className={`text-[11px] font-mono ${payFile ? 'text-amber-950 font-bold' : 'text-amber-800/70'}`}>
                {payFile ? payFile : 'Attach Payroll CSV'}
              </span>
            </div>
            <input type="file" className="hidden" accept=".csv,.xlsx" onChange={e => handleFileUpload(e, 'payroll')} />
          </label>
        </div>
      </div>

      {/* AI Payroll Insights Block */}
      {insights?.hasData && (
        <motion.div 
          id="ai-insights-panel"
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#fffdfa] border-2 border-amber-900 shadow-[6px_6px_0_0_#78350f] p-6 mb-8 relative overflow-hidden"
        >
          {/* Futuristic / Vintage stamp overlap */}
          <div className="absolute top-2 right-4 text-[8px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 border border-emerald-900/30 flex items-center gap-1 uppercase tracking-wider font-bold">
            <Bot size={10}/> AI INSIGHT CHECKED
          </div>

          <h2 className="text-md font-bold text-amber-950 uppercase tracking-widest mb-4 pb-2 border-b-2 border-amber-900 flex items-center gap-2">
            <Bot size={20} className="text-amber-900" /> AI Payroll Insights
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono text-xs">
            {/* MoM Expense Change */}
            <div className="p-4 bg-amber-50 border border-amber-900/20 relative">
              <span className="text-[9px] font-bold text-amber-700 uppercase tracking-wider block mb-1">MoM EXPENSES</span>
              <p className="text-amber-950 font-bold leading-relaxed">{insights.salaryExpenseChange}</p>
            </div>
            {/* Top Bonus Dept */}
            <div className="p-4 bg-amber-50 border border-amber-900/20 relative">
              <span className="text-[9px] font-bold text-amber-700 uppercase tracking-wider block mb-1">BONUS ALLOCATION</span>
              <p className="text-amber-950 font-bold leading-relaxed">{insights.topBonusDepartment}</p>
            </div>
            {/* Unusual Deductions */}
            <div className="p-4 bg-amber-50 border border-amber-900/20 relative">
              <span className="text-[9px] font-bold text-red-800 uppercase tracking-wider block mb-1">DEDUCTION AUDIT</span>
              <p className="text-red-950 font-bold leading-relaxed flex items-center gap-1">
                <AlertCircle size={14} className="text-red-700 shrink-0" />
                {insights.unusualDeductions}
              </p>
            </div>
          </div>

          {/* Collapsible/Drawer for deduction anomalies */}
          {insights.deductionAnomalies && insights.deductionAnomalies.length > 0 && (
            <div className="mt-5 pt-4 border-t border-dashed border-amber-900/20">
              <h4 className="text-[10px] font-mono font-black text-amber-900 uppercase tracking-wider mb-2">
                Flagged Audit Records (Deductions Exceeding 15% Base)
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[10px] font-mono">
                {insights.deductionAnomalies.map((an: any, idx: number) => (
                  <div key={idx} className="p-2.5 bg-[#faf9f6] border border-red-900/20 rounded">
                    <span className="font-bold text-amber-950 block">{an.employeeName}</span>
                    <span className="text-gray-500 block">Base: ${an.base}</span>
                    <span className="text-red-800 font-bold">Deduct: ${an.deductions} ({an.ratio})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Step 2 & 3: Only show if ledger has records */}
      {insights?.hasData && (showLedger || statuses.length > 0) && (
        <>
          {/* Live Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total Logs', value: statuses.length, icon: FileBarChart2, color: 'text-amber-900', border: 'border-amber-900' },
              { label: 'Dispatched', value: statuses.filter((s:any) => s.emailStatus === 'SENT').length, icon: CheckCircle, color: 'text-green-800', border: 'border-green-800' },
              { label: 'Pending', value: statuses.filter((s:any) => s.emailStatus === 'PENDING').length, icon: Clock, color: 'text-blue-800', border: 'border-blue-800' },
              { label: 'Failed', value: statuses.filter((s:any) => s.emailStatus === 'FAILED').length, icon: XCircle, color: 'text-red-800', border: 'border-red-800' },
            ].map((stat, i) => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                key={i} className={`bg-[#fffdfa] border-2 ${stat.border} p-4 shadow-[3px_3px_0_0_rgba(0,0,0,0.1)]`}
              >
                <div className="flex flex-col items-center text-center">
                  <stat.icon size={22} className={`${stat.color} mb-2`} />
                  <p className="text-black font-mono text-[9px] font-bold uppercase tracking-widest mb-1.5 border-b border-gray-300 pb-0.5">{stat.label}</p>
                  <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Tracker Table */}
          <div className="bg-[#fffdfa] border-2 border-amber-900 shadow-[6px_6px_0_0_#78350f] overflow-hidden flex flex-col h-[500px] relative">
            <div className="absolute left-3 top-0 bottom-0 w-6 flex flex-col justify-evenly pointer-events-none">
              {[1,2,3,4,5].map(i => <div key={i} className="w-4 h-4 rounded-full bg-[#f4f4f5] border border-gray-300 shadow-inner"></div>)}
            </div>

            <div className="pl-12 pr-6 py-4 border-b-2 border-amber-900 bg-amber-50 flex justify-between items-center">
              <h2 className="text-lg font-black text-amber-950 uppercase tracking-widest">Official Ledger</h2>
              <span className="text-[9px] font-mono font-bold text-red-700 border border-red-750 px-2 py-0.5 transform rotate-1">LIVE DISPATCH</span>
            </div>
            <div className="overflow-y-auto flex-1 pl-12 pr-2">
              <table className="w-full text-left text-[11px] font-mono mt-4">
                <thead className="sticky top-0 bg-[#fffdfa] border-b-2 border-black text-black z-10">
                  <tr>
                    <th className="py-2.5 px-4 font-bold uppercase tracking-wider border-r border-gray-200">Name</th>
                    <th className="py-2.5 px-4 font-bold uppercase tracking-wider border-r border-gray-200">Address</th>
                    <th className="py-2.5 px-4 font-bold uppercase tracking-wider border-r border-gray-200">Status</th>
                    <th className="py-2.5 px-4 font-bold uppercase tracking-wider">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {statuses.map((s: any) => (
                    <tr key={s._id} className="hover:bg-amber-50/50 transition-colors">
                      <td className="py-3 px-4 font-bold text-black border-r border-gray-100">{s.employeeName}</td>
                      <td className="py-3 px-4 text-gray-600 border-r border-gray-100">{s.employeeEmail}</td>
                      <td className="py-3 px-4 border-r border-gray-100">
                        <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-wider border ${
                          s.emailStatus === 'SENT' ? 'text-green-700 border-green-700 rotate-1 inline-block' :
                          s.emailStatus === 'PENDING' ? 'text-blue-700 border-blue-700 -rotate-1 inline-block' :
                          'text-red-700 border-red-700 rotate-2 inline-block'
                        }`}>
                          {s.emailStatus}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-400 text-[9px]">
                        {s.sentAt ? new Date(s.sentAt).toLocaleTimeString() : '-'}
                      </td>
                    </tr>
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
