// frontend/src/pages/Dashboard.jsx

import { useState, useEffect, useCallback } from 'react';
import { Search, RotateCcw, ShieldCheck, HeartHandshake, Loader2, AlertCircle, Send, X, Globe, Copy, Check } from 'lucide-react';
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

  // Geolocation states
  const [useNearbyGPS, setUseNearbyGPS] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);

  // Urgency state
  const [urgency, setUrgency] = useState('Critical');

  // Bulk outreach state
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResults, setBulkResults] = useState(null);
  const [bulkCopied, setBulkCopied] = useState(null);

  // Request Context states
  const [requests, setRequests] = useState([]);
  const [activeRequestId, setActiveRequestId] = useState('');
  const [activeRequest, setActiveRequest] = useState(null);
  const [escalating, setEscalating] = useState(false);

  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  const loadRequests = useCallback(async () => {
    try {
      const res = await api.getRequests();
      setRequests(res.requests || []);
    } catch (err) {
      console.error("Failed to load requests:", err);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    if (activeRequestId) {
      const req = requests.find(r => r.request_id === activeRequestId);
      setActiveRequest(req || null);
    } else {
      setActiveRequest(null);
    }
  }, [requests, activeRequestId]);

  const handleRequestChange = async (reqId) => {
    setActiveRequestId(reqId);
    setBulkResults(null);
    if (!reqId) {
      setActiveRequest(null);
      handleReset();
      return;
    }
    
    const req = requests.find(r => r.request_id === reqId);
    if (req) {
      setActiveRequest(req);
      setBloodGroup(req.blood_group);
      setUrgency(req.urgency);
      if (req.latitude !== undefined && req.latitude !== null && req.longitude !== undefined && req.longitude !== null) {
        setLatitude(parseFloat(req.latitude));
        setLongitude(parseFloat(req.longitude));
        setUseNearbyGPS(true);
      } else {
        setLatitude(null);
        setLongitude(null);
        setUseNearbyGPS(false);
      }
      
      // Auto search for this request
      setLoading(true);
      setError(null);
      setHasSearched(true);
      try {
        const data = await api.matchDonors(
          req.blood_group,
          req.latitude !== undefined && req.latitude !== null ? parseFloat(req.latitude) : null,
          req.longitude !== undefined && req.longitude !== null ? parseFloat(req.longitude) : null,
          req.urgency
        );
        setDonors(data.matches || []);
      } catch (err) {
        console.error(err);
        setError("Failed to fetch matches for this request.");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleResponseChange = async (donorId, responseValue) => {
    if (!activeRequestId) return;
    try {
      await api.updateOutreachResponse(activeRequestId, donorId, responseValue);
      await loadRequests();
    } catch (err) {
      console.error("Failed to update response:", err);
    }
  };

  const handleEscalate = async () => {
    if (!activeRequestId) return;
    setEscalating(true);
    try {
      const res = await api.escalateRequest(activeRequestId);
      if (res.success) {
        setDonors(res.matched_donors || []);
        await loadRequests();
      }
    } catch (err) {
      console.error("Failed to escalate request:", err);
    } finally {
      setEscalating(false);
    }
  };

  const handleOutreachInitiated = async (donor) => {
    setSelectedDonor(donor);
    if (activeRequestId) {
      try {
        await api.updateOutreachResponse(activeRequestId, donor.user_id, 'no_response');
        await loadRequests();
      } catch (err) {
        console.error("Failed to register outreach attempt:", err);
      }
    }
  };

  const handleGPSToggle = () => {
    if (activeRequestId) return; // Locked when request is active
    if (useNearbyGPS) {
      setUseNearbyGPS(false);
      setLatitude(null);
      setLongitude(null);
      return;
    }

    setGpsLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      setGpsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
        setUseNearbyGPS(true);
        setGpsLoading(false);
      },
      (err) => {
        console.error(err);
        setError("Failed to retrieve browser location. Please enable location permissions.");
        setGpsLoading(false);
        setUseNearbyGPS(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);
    setHasSearched(true);
    setBulkResults(null);
    try {
      const data = await api.matchDonors(
        bloodGroup, 
        useNearbyGPS ? latitude : null, 
        useNearbyGPS ? longitude : null,
        urgency
      );
      setDonors(data.matches || []);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || "An error occurred while matching donors. Check database connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setActiveRequestId('');
    setActiveRequest(null);
    setBloodGroup('O+');
    setDonors([]);
    setHasSearched(false);
    setError(null);
    setBulkResults(null);
    setUseNearbyGPS(false);
    setLatitude(null);
    setLongitude(null);
    setUrgency('Critical');
  };

  const handleBulkOutreach = async () => {
    if (!donors || donors.length === 0) return;
    setBulkLoading(true);
    setBulkResults(null);
    try {
      const userIds = donors.map(d => d.user_id);
      const data = await api.bulkOutreach(userIds);
      setBulkResults(data.results || []);

      // If we have an active request, register all matched donors as "no_response"
      if (activeRequestId) {
        for (const donor of donors) {
          try {
            await api.updateOutreachResponse(activeRequestId, donor.user_id, 'no_response');
          } catch (e) {
            console.error("Error setting bulk outreach status:", e);
          }
        }
        await loadRequests();
      }
    } catch (err) {
      console.error(err);
      setError("Failed to generate bulk outreach messages.");
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkCopy = (idx, message) => {
    navigator.clipboard.writeText(message);
    setBulkCopied(idx);
    setTimeout(() => setBulkCopied(null), 2000);
  };

  const getShortId = (id) => {
    if (!id) return '';
    return id.length > 12 ? `${id.substring(0, 6)}...${id.substring(id.length - 6)}` : id;
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
      </header>

      {/* Main Panel grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Side: Search & Filter panel */}
        <div className="lg:col-span-1">
          <div className="glass-panel rounded-2xl p-6 border border-gray-800 shadow-xl sticky top-6">
            {/* Active Request Context Selector */}
            <div className="mb-6 pb-6 border-b border-gray-800">
              <label htmlFor="active-request" className="block text-[10px] font-bold text-brand-accent uppercase tracking-wider mb-2">
                Active Blood Request Context
              </label>
              <select
                id="active-request"
                value={activeRequestId}
                onChange={(e) => handleRequestChange(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-gray-950 border border-gray-800 text-xs text-white focus:outline-none focus:border-brand-red cursor-pointer font-semibold"
              >
                <option value="">-- General Search (No Request) --</option>
                {requests.map((req) => (
                  <option key={req.request_id} value={req.request_id}>
                    {req.patient_name} ({req.blood_group}) - {req.urgency}
                  </option>
                ))}
              </select>

              {activeRequest && (
                <div className="mt-3 p-3 rounded-xl bg-gray-950/50 border border-gray-850 text-xs space-y-1.5 animate-fade-in text-gray-300">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Patient:</span>
                    <span className="font-bold text-white">{activeRequest.patient_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Hospital:</span>
                    <span className="text-gray-400 font-medium truncate max-w-[120px]">{activeRequest.hospital_name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Status:</span>
                    <span className={`font-mono text-[9px] font-bold uppercase px-2 py-0.5 rounded-md ${
                      activeRequest.status === 'fulfilled'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : activeRequest.status === 'escalated'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'bg-brand-navy/30 text-brand-accent border border-brand-navy/20'
                    }`}>
                      {activeRequest.status}
                    </span>
                  </div>
                </div>
              )}
            </div>

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
                  disabled={!!activeRequestId}
                  className="w-full px-4 py-3 rounded-xl bg-gray-950 border border-gray-800 text-white font-bold text-lg focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {bloodGroups.map((bg) => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </div>

              {/* Urgency Level Selector */}
              <div>
                <label htmlFor="urgency-level" className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Urgency Level
                </label>
                <select
                  id="urgency-level"
                  value={urgency}
                  onChange={(e) => setUrgency(e.target.value)}
                  disabled={!!activeRequestId}
                  className="w-full px-4 py-3 rounded-xl bg-gray-950 border border-gray-800 text-white font-bold text-sm focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red transition-all cursor-pointer font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <option value="Critical">Critical (Strict Eligibility)</option>
                  <option value="High">High (Strict Eligibility)</option>
                  <option value="Routine">Routine (Soft Eligibility)</option>
                </select>
              </div>

              {/* Nearby Match Proximity Toggle */}
              <div className="bg-gray-900/40 border border-gray-800/80 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-300">Nearby Matches (GPS)</span>
                  <button
                    type="button"
                    onClick={handleGPSToggle}
                    disabled={gpsLoading || !!activeRequestId}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
                      useNearbyGPS ? 'bg-brand-red' : 'bg-gray-800'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        useNearbyGPS ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
                {gpsLoading && (
                  <div className="flex items-center gap-2 text-[10px] text-brand-accent animate-pulse">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Detecting browser location...</span>
                  </div>
                )}
                {useNearbyGPS && latitude && (
                  <div className="text-[10px] text-emerald-400 font-mono flex flex-col gap-0.5">
                    <span>✓ Coordinates locked:</span>
                    <span className="opacity-80">Lat: {latitude.toFixed(4)}, Lon: {longitude.toFixed(4)}</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <button
                  type="submit"
                  disabled={loading || !!activeRequestId}
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

            {/* Bulk Outreach Button */}
            {donors.length > 0 && !bulkResults && (
              <div className="mt-6 pt-6 border-t border-gray-800">
                <button
                  onClick={handleBulkOutreach}
                  disabled={bulkLoading}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-lg shadow-emerald-600/10 active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {bulkLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  <span>{bulkLoading ? 'Generating...' : `Outreach All ${donors.length} Donors`}</span>
                </button>
                <p className="text-[10px] text-gray-500 text-center mt-2">Generate AI messages for all matched donors at once</p>
              </div>
            )}
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

          {/* Active Request Alert & Escalation Panel */}
          {activeRequest && (
            <div className="glass-panel p-5 rounded-2xl border border-gray-800 bg-slate-900/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-lg animate-fade-in">
              <div className="space-y-1.5 flex-1">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-brand-red animate-pulse" />
                  Active Request: {activeRequest.patient_name}
                </h3>
                <p className="text-xs text-gray-400">
                  Target Group: <strong className="text-brand-lightred">{activeRequest.blood_group}</strong> | Urgency: <strong className="text-brand-accent">{activeRequest.urgency}</strong> | Units: <strong className="text-white">{activeRequest.units_required}</strong>
                </p>
                {/* Escalation history display */}
                {activeRequest.escalation_history && activeRequest.escalation_history.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-800/80 space-y-1.5">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Escalation Logs</span>
                    {activeRequest.escalation_history.map((event, i) => {
                      const responded = event.contacted_count - event.no_response_count;
                      return (
                        <div key={i} className="text-xs font-semibold text-brand-accent flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-brand-navy shrink-0" />
                          Escalation {event.escalation_level} - {event.contacted_count} donor{event.contacted_count !== 1 ? 's' : ''} contacted, {responded >= 0 ? responded : 0} responded
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              
              {activeRequest.status !== 'fulfilled' && (
                (() => {
                  const noResponseCount = activeRequest.donor_responses
                    ? Object.values(activeRequest.donor_responses).filter(status => status === 'no_response').length
                    : 0;
                  const showEscalate = noResponseCount >= 3;
                  if (showEscalate) {
                    return (
                      <button
                        onClick={handleEscalate}
                        disabled={escalating}
                        className="px-5 py-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all active:scale-95 shadow-lg shadow-amber-650/15 flex items-center gap-2 shrink-0 cursor-pointer"
                      >
                        {escalating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        <span>{escalating ? 'Escalating...' : 'Escalate Request'}</span>
                      </button>
                    );
                  }
                  return null;
                })()
              )}
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
              onOutreachClick={handleOutreachInitiated}
              activeRequest={activeRequest}
              onResponseChange={handleResponseChange}
            />
          )}

          {/* Bulk Outreach Results Panel */}
          {bulkResults && bulkResults.length > 0 && (
            <div className="glass-panel rounded-2xl overflow-hidden border border-gray-800 shadow-2xl animate-fade-in">
              <div className="px-6 py-5 border-b border-gray-800 bg-slate-900/50 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Send className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-lg font-bold text-white">Bulk Outreach Messages</h3>
                  <span className="px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full text-xs font-bold">
                    {bulkResults.length} Language{bulkResults.length > 1 ? 's' : ''}
                  </span>
                </div>
                <button
                  onClick={() => setBulkResults(null)}
                  className="p-1.5 rounded-lg bg-gray-800/80 hover:bg-gray-700/80 text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="max-h-[600px] overflow-y-auto divide-y divide-gray-800/60">
                {bulkResults.map((group, idx) => (
                  <div key={group.language} className="p-5 hover:bg-slate-900/20 transition-colors">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5 text-xs text-brand-accent">
                            <Globe className="w-4 h-4" />
                            <span className="px-2 py-0.5 bg-brand-navy/30 border border-brand-navy/50 rounded-full text-xs font-bold">
                              {group.language}
                            </span>
                          </div>
                          <span className="text-[10px] text-gray-500 font-semibold">
                            {group.donor_ids?.length || 0} donor{(group.donor_ids?.length || 0) > 1 ? 's' : ''}
                          </span>
                        </div>
                        <button
                          onClick={() => handleBulkCopy(idx, group.message)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                            bulkCopied === idx
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                              : 'border-gray-700/50 text-gray-400 hover:text-white hover:bg-gray-800'
                          }`}
                        >
                          {bulkCopied === idx ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          <span>{bulkCopied === idx ? 'Copied!' : 'Copy'}</span>
                        </button>
                      </div>
                      <div className="p-4 rounded-xl bg-gray-950/80 border border-gray-800/50 text-gray-300 text-sm leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto">
                        {group.message}
                      </div>
                      {/* Donor IDs chips */}
                      <div className="flex flex-wrap gap-1.5">
                        {(group.donor_ids || []).map(uid => (
                          <span key={uid} className="text-[10px] font-mono px-2 py-0.5 bg-gray-900 border border-gray-800 rounded-md text-gray-500" title={uid}>
                            {getShortId(uid)}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
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
