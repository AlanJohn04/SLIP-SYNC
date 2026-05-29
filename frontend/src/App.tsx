import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import Verify from './components/Verify';
import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <div className="min-h-screen bg-[#f3f4f6] text-slate-900 font-sans selection:bg-red-200">
      <Router>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/verify/:slipId" element={<Verify />} />
        </Routes>
      </Router>
      <Toaster position="bottom-right" />
    </div>
  );
}

export default App;
