// frontend/src/pages/DonorPortal.jsx

import { useState } from 'react';
import { ArrowLeft, PauseCircle, MapPin, CheckCircle, AlertCircle, User, Loader2 } from 'lucide-react';
import api from '../services/api';

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan',
  'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
  'Uttarakhand', 'West Bengal',
];

export default function DonorPortal({ onViewDashboard }) {
  // Section A: Pause Donations state
  const [pauseId, setPauseId] = useState('');
  const [pauseReason, setPauseReason] = useState('');
  const [pauseLoading, setPauseLoading] = useState(false);
  const [pauseResult, setPauseResult] = useState(null);
  const [pauseError, setPauseError] = useState(null);

  // Section B: Update Location state
  const [locId, setLocId] = useState('');
  const [locCity, setLocCity] = useState('');
  const [locState, setLocState] = useState('');
  const [locLoading, setLocLoading] = useState(false);
  const [locResult, setLocResult] = useState(null);
  const [locError, setLocError] = useState(null);

  const handlePause = async (e) => {
    e.preventDefault();
    setPauseLoading(true);
    setPauseError(null);
    setPauseResult(null);
    try {
      const res = await api.optOutDonor(pauseId.trim(), pauseReason.trim());
      if (res.success) {
        setPauseResult(res.message);
      } else {
        setPauseError(res.message || 'Failed to pause donations.');
      }
    } catch (err) {
      setPauseError(err.response?.data?.detail || 'Donor not found or an error occurred.');
    } finally {
      setPauseLoading(false);
    }
  };

  const handleUpdateLocation = async (e) => {
    e.preventDefault();
    setLocLoading(true);
    setLocError(null);
    setLocResult(null);
    try {
      const res = await api.updateDonorLocation(locId.trim(), locCity.trim(), locState);
      if (res.success) {
        setLocResult(res.message);
      } else {
        setLocError(res.message || 'Failed to update location.');
      }
    } catch (err) {
      setLocError(err.response?.data?.detail || 'Donor not found or an error occurred.');
    } finally {
      setLocLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Back button */}
      <button
        onClick={onViewDashboard}
        className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-6 group transition-colors cursor-pointer bg-transparent border-0"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        <span>Back to Dashboard</span>
      </button>

      {/* Page Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 rounded-2xl bg-brand-red/10 border border-brand-red/30 text-brand-lightred">
          <User className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-white">Donor Self-Service Portal</h1>
          <p className="text-sm text-gray-400">Manage your donation preferences and update your information</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ====== Section A: Pause Donations ====== */}
        <div className="glass-panel rounded-2xl overflow-hidden border border-gray-800 shadow-xl">
          <div className="px-6 py-5 border-b border-gray-800 bg-slate-900/50 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <PauseCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Pause Donations</h2>
              <p className="text-xs text-gray-400">Temporarily opt out of receiving donation requests</p>
            </div>
          </div>

          <div className="p-6">
            {pauseResult ? (
              <div className="text-center py-6">
                <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-white mb-2">Donations Paused</h3>
                <p className="text-gray-400 text-sm mb-6">{pauseResult}</p>
                <button
                  onClick={() => { setPauseResult(null); setPauseId(''); setPauseReason(''); }}
                  className="px-5 py-2 text-xs font-semibold rounded-xl border border-gray-700 text-gray-300 hover:text-white transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handlePause} className="space-y-4">
                {pauseError && (
                  <div className="p-3 bg-brand-red/10 border border-brand-red/20 text-brand-lightred rounded-xl text-xs font-medium flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{pauseError}</span>
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <label htmlFor="pause-id" className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Donor Reference ID
                  </label>
                  <input
                    type="text"
                    id="pause-id"
                    required
                    placeholder="Enter your donor ID"
                    value={pauseId}
                    onChange={(e) => setPauseId(e.target.value)}
                    className="w-full bg-slate-900/60 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="pause-reason" className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Reason <span className="text-gray-600">(optional)</span>
                  </label>
                  <textarea
                    id="pause-reason"
                    placeholder="e.g., Health reasons, traveling, etc."
                    value={pauseReason}
                    onChange={(e) => setPauseReason(e.target.value)}
                    rows={3}
                    className="w-full bg-slate-900/60 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={pauseLoading || !pauseId.trim()}
                  className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-amber-600/10 flex justify-center items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {pauseLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <PauseCircle className="w-4 h-4" />
                  )}
                  <span>{pauseLoading ? 'Processing...' : 'Pause My Donations'}</span>
                </button>
              </form>
            )}
          </div>
        </div>

        {/* ====== Section B: Update Current Location ====== */}
        <div className="glass-panel rounded-2xl overflow-hidden border border-gray-800 shadow-xl">
          <div className="px-6 py-5 border-b border-gray-800 bg-slate-900/50 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-brand-accent/10 border border-brand-accent/30 text-brand-accent">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Update Location</h2>
              <p className="text-xs text-gray-400">Moved to a new city? Update your current location</p>
            </div>
          </div>

          <div className="p-6">
            {locResult ? (
              <div className="text-center py-6">
                <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-white mb-2">Location Updated</h3>
                <p className="text-gray-400 text-sm mb-6">{locResult}</p>
                <button
                  onClick={() => { setLocResult(null); setLocId(''); setLocCity(''); setLocState(''); }}
                  className="px-5 py-2 text-xs font-semibold rounded-xl border border-gray-700 text-gray-300 hover:text-white transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleUpdateLocation} className="space-y-4">
                {locError && (
                  <div className="p-3 bg-brand-red/10 border border-brand-red/20 text-brand-lightred rounded-xl text-xs font-medium flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{locError}</span>
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <label htmlFor="loc-id" className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Donor Reference ID
                  </label>
                  <input
                    type="text"
                    id="loc-id"
                    required
                    placeholder="Enter your donor ID"
                    value={locId}
                    onChange={(e) => setLocId(e.target.value)}
                    className="w-full bg-slate-900/60 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-brand-accent transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="loc-city" className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Current City
                  </label>
                  <input
                    type="text"
                    id="loc-city"
                    required
                    placeholder="e.g., Gurugram"
                    value={locCity}
                    onChange={(e) => setLocCity(e.target.value)}
                    className="w-full bg-slate-900/60 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-accent transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="loc-state" className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Current State
                  </label>
                  <select
                    id="loc-state"
                    required
                    value={locState}
                    onChange={(e) => setLocState(e.target.value)}
                    className="w-full bg-slate-900/60 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-accent transition-colors cursor-pointer"
                  >
                    <option value="" disabled>Select state</option>
                    {INDIAN_STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={locLoading || !locId.trim() || !locCity.trim() || !locState}
                  className="w-full py-3 bg-brand-red hover:bg-brand-darkred text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-brand-red/15 flex justify-center items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {locLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <MapPin className="w-4 h-4" />
                  )}
                  <span>{locLoading ? 'Updating...' : 'Update My Location'}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
