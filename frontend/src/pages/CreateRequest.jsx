// frontend/src/pages/CreateRequest.jsx

import { useState } from 'react';
import { FileHeart, CheckCircle, ArrowLeft, AlertTriangle, Award, Droplets, Clock, Zap, MapPin, Compass, Loader2 } from 'lucide-react';
import api from '../services/api';

const URGENCY_CONFIG = {
  Critical: { color: 'bg-red-500/10 border-red-500/30 text-red-400', icon: Zap, label: 'Critical — Immediate Need' },
  High: { color: 'bg-amber-500/10 border-amber-500/30 text-amber-400', icon: AlertTriangle, label: 'High — Within 24 hours' },
  Routine: { color: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400', icon: Clock, label: 'Routine — Scheduled transfusion' },
};

export default function CreateRequest({ onViewDashboard }) {
  const [formData, setFormData] = useState({
    patient_name: '',
    blood_group: '',
    urgency: '',
    hospital_name: '',
    hospital_city: '',
    hospital_state: '',
    contact_phone: '',
    units_required: 1,
    latitude: null,
    longitude: null,
  });

  const [loading, setLoading] = useState(false);
  const [gpsLocating, setGpsLocating] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null); // holds { request_id, matched_donors }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'units_required' ? parseInt(value) || 1 : value,
    }));
  };

  const detectGPS = () => {
    setGpsLocating(true);
    setError(null);
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      setGpsLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData((prev) => ({
          ...prev,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }));
        setGpsLocating(false);
      },
      (err) => {
        console.error(err);
        setError("Failed to retrieve browser location coordinates. Please verify permission settings.");
        setGpsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!formData.blood_group) {
      setError('Please select a blood group.');
      setLoading(false);
      return;
    }
    if (!formData.urgency) {
      setError('Please select an urgency level.');
      setLoading(false);
      return;
    }

    try {
      const response = await api.createBloodRequest(formData);
      if (response.success) {
        setResult({
          request_id: response.request_id,
          message: response.message,
          matched_donors: response.matched_donors || [],
        });
      } else {
        setError(response.message || 'Failed to create blood request.');
      }
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.detail || 'An error occurred. Please try again.';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setResult(null);
    setError(null);
    setFormData({
      patient_name: '',
      blood_group: '',
      urgency: '',
      hospital_name: '',
      hospital_city: '',
      hospital_state: '',
      contact_phone: '',
      units_required: 1,
      latitude: null,
      longitude: null,
    });
  };

  // Shorten user ID hash for cleaner display
  const getShortId = (id) => {
    if (!id) return '';
    return id.length > 12 ? `${id.substring(0, 6)}...${id.substring(id.length - 6)}` : id;
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Back button */}
      <button
        onClick={onViewDashboard}
        className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-6 group transition-colors cursor-pointer bg-transparent border-0"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        <span>Back to Coordinator Dashboard</span>
      </button>

      <div className="glass-panel rounded-3xl overflow-hidden border border-gray-800 shadow-2xl">
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-800 bg-slate-900/50 flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-brand-red/10 border border-brand-red/30 text-brand-lightred">
            <FileHeart className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Create Blood Request</h2>
            <p className="text-xs text-gray-400">Submit a request and instantly find compatible donors from the BloodBridge network.</p>
          </div>
        </div>

        <div className="p-8">
          {result ? (
            /* ======= SUCCESS: Show result + matched donors ======= */
            <div>
              {/* Success Banner */}
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-5">
                  <CheckCircle className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Request Submitted!</h3>
                <p className="text-gray-400 text-sm max-w-md mx-auto">{result.message}</p>
              </div>

              {/* Request ID Card */}
              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 max-w-sm mx-auto mb-8 text-left">
                <div className="text-xs text-gray-400 mb-1 font-semibold">REQUEST ID</div>
                <div className="font-mono text-sm text-brand-accent truncate" title={result.request_id}>
                  {result.request_id}
                </div>
              </div>

              {/* Matched Donors Table */}
              {result.matched_donors.length > 0 ? (
                <div className="glass-panel rounded-2xl overflow-hidden border border-gray-800 shadow-xl mb-8">
                  <div className="px-6 py-4 border-b border-gray-800 bg-slate-900/50 flex justify-between items-center">
                    <div>
                      <h4 className="text-lg font-bold text-white">Top Compatible Donors</h4>
                      <p className="text-xs text-gray-400">Best matches based on blood compatibility and donation history</p>
                    </div>
                    <span className="px-3 py-1 bg-brand-navy/30 border border-brand-navy/50 text-brand-accent rounded-full text-xs font-semibold">
                      {result.matched_donors.length} Matches
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-gray-800 bg-gray-900/30 text-gray-400 text-xs font-semibold uppercase tracking-wider">
                          <th className="px-6 py-3">#</th>
                          <th className="px-6 py-3">Donor ID</th>
                          <th className="px-6 py-3">Blood Group</th>
                          <th className="px-6 py-3">Gender</th>
                          <th className="px-6 py-3">Distance</th>
                          <th className="px-6 py-3">Donations</th>
                          <th className="px-6 py-3">Type</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800/60">
                        {result.matched_donors.map((donor, idx) => (
                          <tr
                            key={donor.user_id}
                            className="hover:bg-slate-900/30 transition-colors group text-sm text-gray-300"
                          >
                            <td className="px-6 py-3 font-semibold text-gray-500">{idx + 1}</td>
                            <td className="px-6 py-3 font-mono font-medium text-white group-hover:text-brand-accent transition-colors">
                              <span title={donor.user_id}>{getShortId(donor.user_id)}</span>
                            </td>
                            <td className="px-6 py-3">
                              <span className="inline-flex items-center justify-center px-3 py-1 text-xs font-bold rounded-full bg-brand-red/10 border border-brand-red/30 text-brand-lightred">
                                {donor.blood_group}
                              </span>
                            </td>
                            <td className="px-6 py-3 text-gray-400">{donor.gender || 'N/A'}</td>
                            <td className="px-6 py-3 text-gray-400">
                              {donor.distance_km !== undefined && donor.distance_km !== null ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-brand-navy/40 text-brand-accent border border-brand-navy/30">
                                  {donor.distance_km} km
                                </span>
                              ) : (
                                <span className="text-gray-600">—</span>
                              )}
                            </td>
                            <td className="px-6 py-3">
                              <div className="flex items-center gap-1.5 font-semibold text-white">
                                <Award className="w-4 h-4 text-amber-500" />
                                <span>{donor.donations_till_date}</span>
                              </div>
                            </td>
                            <td className="px-6 py-3">
                              <span className="text-xs px-2.5 py-1 rounded-md font-medium bg-gray-800/80 text-gray-300 border border-gray-700/50">
                                {donor.donor_type || 'N/A'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="glass-panel rounded-2xl p-8 text-center border border-gray-800 mb-8">
                  <AlertTriangle className="w-10 h-10 text-yellow-500 mx-auto mb-3" />
                  <h4 className="text-lg font-bold text-white mb-2">No Matching Donors Found</h4>
                  <p className="text-gray-400 text-sm">No active eligible donors with compatible blood groups are currently available.</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4 justify-center">
                <button
                  onClick={resetForm}
                  className="px-6 py-2.5 rounded-xl border border-gray-700 text-sm text-gray-300 hover:text-white transition-colors cursor-pointer"
                >
                  Create Another Request
                </button>
                <button
                  onClick={onViewDashboard}
                  className="px-6 py-2.5 bg-brand-red text-white text-sm font-semibold rounded-xl hover:bg-brand-darkred active:scale-95 transition-all shadow-lg shadow-brand-red/15 cursor-pointer"
                >
                  Go to Dashboard
                </button>
              </div>
            </div>
          ) : (
            /* ======= FORM ======= */
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-4 bg-brand-red/10 border border-brand-red/20 text-brand-lightred rounded-xl text-sm font-medium">
                  {error}
                </div>
              )}

              {/* Urgency Selection */}
              <div className="flex flex-col gap-3">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Urgency Level
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {Object.entries(URGENCY_CONFIG).map(([key, cfg]) => {
                    const Icon = cfg.icon;
                    const isSelected = formData.urgency === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, urgency: key }))}
                        className={`flex items-center gap-3 p-4 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? `${cfg.color} ring-1 ring-current`
                            : 'border-gray-800 bg-slate-900/40 text-gray-400 hover:border-gray-700'
                        }`}
                      >
                        <Icon className="w-5 h-5 shrink-0" />
                        <div>
                          <div className={`text-sm font-semibold ${isSelected ? '' : 'text-gray-300'}`}>{key}</div>
                          <div className="text-xs opacity-70">{cfg.label.split('—')[1]?.trim()}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Patient Name */}
                <div className="flex flex-col gap-2">
                  <label htmlFor="patient_name" className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Patient Name
                  </label>
                  <input
                    type="text"
                    id="patient_name"
                    name="patient_name"
                    required
                    placeholder="Enter patient name"
                    value={formData.patient_name}
                    onChange={handleChange}
                    className="w-full bg-slate-900/60 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-red transition-colors"
                  />
                </div>

                {/* Blood Group */}
                <div className="flex flex-col gap-2">
                  <label htmlFor="blood_group" className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Blood Group Needed
                  </label>
                  <select
                    id="blood_group"
                    name="blood_group"
                    value={formData.blood_group}
                    onChange={handleChange}
                    className="w-full bg-slate-900/60 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-red transition-colors cursor-pointer"
                  >
                    <option value="" disabled>Select Blood Group</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>

                {/* Hospital Name */}
                <div className="flex flex-col gap-2">
                  <label htmlFor="hospital_name" className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Hospital Name
                  </label>
                  <input
                    type="text"
                    id="hospital_name"
                    name="hospital_name"
                    required
                    placeholder="Enter hospital name"
                    value={formData.hospital_name}
                    onChange={handleChange}
                    className="w-full bg-slate-900/60 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-red transition-colors"
                  />
                </div>

                {/* Hospital City */}
                <div className="flex flex-col gap-2">
                  <label htmlFor="hospital_city" className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Hospital City
                  </label>
                  <input
                    type="text"
                    id="hospital_city"
                    name="hospital_city"
                    required
                    placeholder="Enter city name"
                    value={formData.hospital_city}
                    onChange={handleChange}
                    className="w-full bg-slate-900/60 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-red transition-colors"
                  />
                </div>

                {/* Hospital State */}
                <div className="flex flex-col gap-2">
                  <label htmlFor="hospital_state" className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Hospital State
                  </label>
                  <select
                    id="hospital_state"
                    name="hospital_state"
                    required
                    value={formData.hospital_state}
                    onChange={handleChange}
                    className="w-full bg-slate-900/60 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-red transition-colors cursor-pointer"
                  >
                    <option value="" disabled>Select State</option>
                    <option value="Karnataka">Karnataka</option>
                    <option value="Telangana">Telangana</option>
                    <option value="Tamil Nadu">Tamil Nadu</option>
                    <option value="Andhra Pradesh">Andhra Pradesh</option>
                    <option value="Maharashtra">Maharashtra</option>
                  </select>
                </div>

                {/* Units Required */}
                <div className="flex flex-col gap-2">
                  <label htmlFor="units_required" className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Units Required
                  </label>
                  <div className="relative">
                    <Droplets className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-red/60" />
                    <input
                      type="number"
                      id="units_required"
                      name="units_required"
                      required
                      min="1"
                      max="50"
                      value={formData.units_required}
                      onChange={handleChange}
                      className="w-full bg-slate-900/60 border border-gray-800 rounded-xl pl-11 pr-4 py-3 text-sm text-white focus:outline-none focus:border-brand-red transition-colors"
                    />
                  </div>
                </div>

                {/* Contact Phone */}
                <div className="flex flex-col gap-2">
                  <label htmlFor="contact_phone" className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    id="contact_phone"
                    name="contact_phone"
                    required
                    placeholder="Enter your phone number"
                    value={formData.contact_phone}
                    onChange={handleChange}
                    className="w-full bg-slate-900/60 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-red transition-colors"
                  />
                </div>
              </div>

              {/* Geolocation Section */}
              <div className="bg-gray-900/40 border border-gray-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-brand-red" />
                    <span>Hospital Coordinates (GPS)</span>
                  </h4>
                  <p className="text-xs text-gray-400 mt-1 max-w-md">
                    Pinpoint exact GPS location to search for nearest donors. If disabled, defaults to state centroid fallback.
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={detectGPS}
                    disabled={gpsLocating}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      formData.latitude
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : 'bg-brand-navy/30 border-brand-navy/50 text-brand-accent hover:bg-brand-navy/50'
                    }`}
                  >
                    {gpsLocating ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Compass className="w-3.5 h-3.5" />
                    )}
                    <span>{formData.latitude ? 'Location Locked' : 'Detect Coords'}</span>
                  </button>
                  {formData.latitude && (
                    <div className="text-[10px] font-mono text-emerald-400 opacity-90">
                      {formData.latitude.toFixed(4)}, {formData.longitude.toFixed(4)}
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-brand-red hover:bg-brand-darkred text-white text-sm font-bold rounded-xl active:scale-[0.99] transition-all shadow-lg shadow-brand-red/15 flex justify-center items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Creating Request & Matching Donors...</span>
                  </>
                ) : (
                  <>
                    <FileHeart className="w-5 h-5" />
                    <span>Submit Request & Find Donors</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
