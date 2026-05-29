import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { CheckCircle, ShieldAlert, FileText, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

const API_BASE = 'http://localhost:5000/api';

export default function Verify() {
  const { slipId } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchVerification = async () => {
      try {
        const res = await axios.get(`${API_BASE}/payroll/verify/${slipId}`);
        setData(res.data);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Verification failed. Document may be tampered or not found.');
      } finally {
        setLoading(false);
      }
    };
    fetchVerification();
  }, [slipId]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 font-serif" style={{ backgroundImage: 'repeating-linear-gradient(transparent, transparent 31px, #e5e7eb 31px, #e5e7eb 32px)', backgroundColor: '#faf9f6' }}>
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="bg-[#fffdfa] border-2 border-amber-900 shadow-[8px_8px_0_0_#78350f] max-w-lg w-full relative overflow-hidden"
      >
        <div className="pl-8 pr-6 py-4 border-b-2 border-amber-900 bg-amber-50 flex justify-between items-center">
          <h2 className="text-xl font-black text-amber-950 uppercase tracking-widest">Verification Dept.</h2>
          <span className="text-xs font-mono font-bold text-red-700 border-2 border-red-700 px-2 py-1 transform -rotate-2">CONFIDENTIAL</span>
        </div>
        
        <div className="p-8 text-center relative">
          <div className="absolute top-0 bottom-0 left-4 w-px bg-red-200"></div>
          
          <div className="inline-flex items-center justify-center border-2 border-amber-900 bg-[#fffdfa] p-3 shadow-[3px_3px_0_0_#78350f] mb-6 transform rotate-3">
            <FileText size={32} className="text-amber-900" />
          </div>
          <h1 className="text-2xl font-black text-amber-950 uppercase tracking-widest border-b border-amber-200 inline-block pb-2 mb-8">Certificate of Authenticity</h1>

          {loading ? (
            <div className="flex flex-col items-center py-12">
              <Loader2 className="animate-spin text-amber-800 mb-4" size={32} />
              <p className="text-amber-900 font-mono text-sm uppercase tracking-widest font-bold">Querying official records...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center py-8 text-center">
              <div className="border-2 border-red-800 bg-red-50 p-4 transform -rotate-1 shadow-[4px_4px_0_0_#991b1b] mb-6">
                <ShieldAlert size={48} className="text-red-800" />
              </div>
              <h2 className="text-xl font-black text-red-900 uppercase tracking-widest mb-3">Verification Failed</h2>
              <p className="text-red-700 font-mono text-sm border-t border-b border-red-200 py-2 inline-block px-4">{error}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center">
              <div className="border-2 border-green-800 bg-green-50 p-4 transform rotate-2 shadow-[4px_4px_0_0_#166534] mb-6">
                <CheckCircle size={48} className="text-green-800" />
              </div>
              <h2 className="text-xl font-black text-green-900 uppercase tracking-widest mb-3">Document Verified</h2>
              <p className="text-amber-900 font-mono text-xs uppercase tracking-widest mb-8 border-y border-amber-200 py-2">
                This document is authentic and unaltered.
              </p>
              
              <div className="w-full bg-[#fffdfa] border-2 border-amber-900 shadow-[4px_4px_0_0_rgba(0,0,0,0.1)] p-6 text-left relative">
                {/* Vintage Watermark stamp */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 -rotate-12 opacity-5 pointer-events-none">
                   <CheckCircle size={150} />
                </div>
                
                <div className="grid grid-cols-2 gap-6 relative z-10">
                  <div>
                    <p className="text-xs font-bold text-amber-800 font-mono uppercase tracking-widest border-b border-gray-300 pb-1 mb-2">Employee Name</p>
                    <p className="font-black text-amber-950 text-lg">{data.employeeName}</p>
                  </div>
                  
                  <div>
                    <p className="text-xs font-bold text-amber-800 font-mono uppercase tracking-widest border-b border-gray-300 pb-1 mb-2">Period</p>
                    <p className="font-black text-amber-950 text-lg">{data.month} {data.year}</p>
                  </div>
                  
                  <div className="col-span-2 mt-2">
                    <p className="text-xs font-bold text-amber-800 font-mono uppercase tracking-widest border-b border-gray-300 pb-1 mb-2">Cryptographic Hash</p>
                    <p className="font-mono text-xs text-black break-all bg-amber-50 p-3 border border-amber-900 shadow-inner">
                      {data.documentHash}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="bg-amber-900 text-amber-50 py-2 px-6 flex justify-between font-mono text-[10px] uppercase tracking-widest">
          <span>SlipSync Security Engine</span>
          <span>ID: {slipId.padStart(8, '0')}</span>
        </div>
      </motion.div>
    </div>
  );
}
