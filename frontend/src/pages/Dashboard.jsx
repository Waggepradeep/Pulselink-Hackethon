// frontend/src/pages/Dashboard.jsx

import { useState } from 'react';
import { Search, RotateCcw, ShieldCheck, HeartHandshake, Loader2, AlertCircle, BarChart3 } from 'lucide-react';
import api from '../services/api';
import MatchTable from '../components/MatchTable';
import OutreachModal from '../components/OutreachModal';

export default function Dashboard({ onViewAdmin }) {
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [donors, setDonors] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedDonor, setSelectedDonor] = useState(null);

  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setHasSearched(true);
    try {
      const data = await api.matchDonors(bloodGroup);
      setDonors(data.matches || []);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || "An error occurred while matching donors. Check database connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setBloodGroup('O+');
    setDonors([]);
    setHasSearched(false);
    setError(null);
  };

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-10 pb-6 border-b border-gray-800/80">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-brand-red/10 border border-brand-red/30 rounded-2xl text-brand-red heart-pulse">
            <HeartHandshake className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
              BloodBridge <span className="px-2.5 py-0.5 bg-brand-red text-white rounded-lg text-xs font-bold uppercase tracking-wider">AI</span>
            </h1>
            <p className="text-sm text-gray-400 mt-1">Smart Donor Matching Assistant for Thalassemia Coordinators</p>
          </div>
        </div>
        
        {/* Navigation to Admin */}
        <button
          onClick={onViewAdmin}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-brand-navy/30 border border-brand-navy/50 text-brand-accent hover:bg-brand-navy/50 hover:text-white transition-all shadow-md active:scale-95"
        >
          <BarChart3 className="w-4 h-4" />
          <span>Admin Insights</span>
        </button>
      </header>

      {/* Main Panel grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Side: Search & Filter panel */}
        <div className="lg:col-span-1">
          <div className="glass-panel rounded-2xl p-6 border border-gray-800 shadow-xl sticky top-6">
            <div className="flex items-center gap-2 mb-6">
              <ShieldCheck className="w-5 h-5 text-brand-red" />
              <h2 className="text-md font-bold text-white uppercase tracking-wider">Donor Matching</h2>
            </div>
            
            <form onSubmit={handleSearch} className="space-y-6">
              <div>
                <label htmlFor="blood-group" className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Recipient Blood Group
                </label>
                <select
                  id="blood-group"
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-gray-950 border border-gray-800 text-white font-bold text-lg focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red transition-all cursor-pointer"
                >
                  {bloodGroups.map((bg) => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl text-sm font-bold bg-brand-red text-white hover:bg-brand-darkred active:scale-95 transition-all shadow-lg shadow-brand-red/10 disabled:opacity-50 disabled:pointer-events-none"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  <span>Search Donors</span>
                </button>

                {hasSearched && (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs font-semibold bg-gray-900 border border-gray-850 text-gray-400 hover:text-white hover:bg-gray-800/60 active:scale-95 transition-all"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Filter</span>
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* Right Side: Results */}
        <div className="lg:col-span-3 space-y-6">
          {error && (
            <div className="p-5 rounded-2xl bg-brand-darkred/10 border border-brand-darkred/30 flex items-start gap-3 text-brand-lightred animate-fade-in">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm">Error matching compatible donors</h4>
                <p className="text-xs mt-1 opacity-90 leading-relaxed">{error}</p>
              </div>
            </div>
          )}

          {loading ? (
            <div className="glass-panel rounded-2xl p-24 text-center border border-gray-800">
              <Loader2 className="w-12 h-12 text-brand-red animate-spin mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white mb-1">Scanning Database</h3>
              <p className="text-gray-400 text-xs">Finding active, eligible donors matching compatibility rules...</p>
            </div>
          ) : (
            <MatchTable 
              donors={donors} 
              onOutreachClick={(donor) => setSelectedDonor(donor)} 
            />
          )}
        </div>
      </div>

      {/* Outreach modal overlay */}
      {selectedDonor && (
        <OutreachModal 
          donor={selectedDonor} 
          onClose={() => setSelectedDonor(null)} 
        />
      )}
    </div>
  );
}
