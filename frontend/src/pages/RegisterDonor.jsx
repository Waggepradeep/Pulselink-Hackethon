// frontend/src/pages/RegisterDonor.jsx

import { useState } from 'react';
import { UserPlus, CheckCircle, ArrowLeft, Heart, Shield } from 'lucide-react';
import api from '../services/api';

const STATE_COORDINATES = {
  "Telangana": { lat: 17.3850, lon: 78.4867 },
  "Andhra Pradesh": { lat: 16.5062, lon: 80.6480 },
  "Karnataka": { lat: 12.9716, lon: 77.5946 },
  "Tamil Nadu": { lat: 13.0827, lon: 80.2707 },
  "Maharashtra": { lat: 19.0760, lon: 72.8777 },
  "Delhi": { lat: 28.7041, lon: 77.1025 },
  "West Bengal": { lat: 22.5726, lon: 88.3639 },
  "Gujarat": { lat: 23.0225, lon: 72.5714 },
  "Rajasthan": { lat: 26.9124, lon: 75.7873 },
  "Uttar Pradesh": { lat: 26.8467, lon: 80.9462 },
  "Kerala": { lat: 8.5241, lon: 76.9366 }
};

const DEFAULT_COORDINATES = { lat: 20.5937, lon: 78.9629 }; // India Centroid

export default function RegisterDonor({ onViewDashboard }) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    blood_group: '',
    gender: '',
    city: '',
    state: '',
    language_preference: '',
    consent_to_contact: false
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [registeredId, setRegisteredId] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Basic validation
    if (!formData.blood_group) {
      setError("Please select a blood group.");
      setLoading(false);
      return;
    }
    if (!formData.state) {
      setError("Please select your state.");
      setLoading(false);
      return;
    }
    if (!formData.gender) {
      setError("Please select your gender.");
      setLoading(false);
      return;
    }
    if (!formData.language_preference) {
      setError("Please select your preferred language.");
      setLoading(false);
      return;
    }

    // Resolve coordinates based on selected state
    const coords = STATE_COORDINATES[formData.state] || DEFAULT_COORDINATES;

    const payload = {
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      blood_group: formData.blood_group,
      gender: formData.gender,
      city: formData.city.trim(),
      state: formData.state,
      latitude: coords.lat,
      longitude: coords.lon,
      language_preference: formData.language_preference,
      consent_to_contact: formData.consent_to_contact
    };

    try {
      const response = await api.registerDonor(payload);
      if (response.success) {
        setSuccess(true);
        setRegisteredId(response.user_id);
        setFormData({
          name: '',
          phone: '',
          blood_group: '',
          gender: '',
          city: '',
          state: '',
          language_preference: '',
          consent_to_contact: false
        });
      } else {
        setError(response.message || "Failed to register donor.");
      }
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.detail || "An error occurred during registration. Please try again.";
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Back button */}
      <button 
        onClick={onViewDashboard}
        className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-6 group transition-colors cursor-pointer bg-transparent border-0"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        <span>Back to Coordinator Dashboard</span>
      </button>

      <div className="glass-panel rounded-3xl overflow-hidden border border-gray-800 shadow-2xl">
        <div className="px-8 py-6 border-b border-gray-800 bg-slate-900/50 flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-brand-red/10 border border-brand-red/30 text-brand-lightred">
            <UserPlus className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Register as a Blood Donor</h2>
            <p className="text-xs text-gray-400">Join BloodBridge AI to support thalassemia children in need of regular transfusions.</p>
          </div>
        </div>

        <div className="p-8">
          {success ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Registration Successful!</h3>
              <p className="text-gray-400 text-sm max-w-md mx-auto mb-6">
                Thank you for registering. You are now added to the registry as an active eligible donor.
              </p>
              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 max-w-sm mx-auto mb-8 text-left">
                <div className="text-xs text-gray-400 mb-1 font-semibold">DONOR REFERENCE ID</div>
                <div className="font-mono text-sm text-brand-accent truncate" title={registeredId}>
                  {registeredId}
                </div>
              </div>
              <div className="flex gap-4 justify-center">
                <button 
                  onClick={() => setSuccess(false)}
                  className="px-6 py-2.5 rounded-xl border border-gray-700 text-sm text-gray-300 hover:text-white transition-colors"
                >
                  Register Another
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
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-4 bg-brand-red/10 border border-brand-red/20 text-brand-lightred rounded-xl text-sm font-medium">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Full Name */}
                <div className="flex flex-col gap-2">
                  <label htmlFor="name" className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    placeholder="Enter full name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full bg-slate-900/60 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-red transition-colors"
                  />
                </div>

                {/* Phone Number */}
                <div className="flex flex-col gap-2">
                  <label htmlFor="phone" className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    required
                    placeholder="Enter phone number"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full bg-slate-900/60 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-red transition-colors"
                  />
                </div>

                {/* Blood Group */}
                <div className="flex flex-col gap-2">
                  <label htmlFor="blood_group" className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Blood Group
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

                {/* Gender */}
                <div className="flex flex-col gap-2">
                  <label htmlFor="gender" className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Gender
                  </label>
                  <select
                    id="gender"
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className="w-full bg-slate-900/60 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-red transition-colors cursor-pointer"
                  >
                    <option value="" disabled>Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>

                {/* City */}
                <div className="flex flex-col gap-2">
                  <label htmlFor="city" className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    City / Town
                  </label>
                  <input
                    type="text"
                    id="city"
                    name="city"
                    required
                    placeholder="Enter city"
                    value={formData.city}
                    onChange={handleChange}
                    className="w-full bg-slate-900/60 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-red transition-colors"
                  />
                </div>

                {/* State */}
                <div className="flex flex-col gap-2">
                  <label htmlFor="state" className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    State
                  </label>
                  <select
                    id="state"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    className="w-full bg-slate-900/60 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-red transition-colors cursor-pointer"
                  >
                    <option value="" disabled>Select State</option>
                    {Object.keys(STATE_COORDINATES).map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>

                {/* Language Preference */}
                <div className="flex flex-col gap-2">
                  <label htmlFor="language_preference" className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Preferred Language
                  </label>
                  <select
                    id="language_preference"
                    name="language_preference"
                    value={formData.language_preference}
                    onChange={handleChange}
                    className="w-full bg-slate-900/60 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-red transition-colors cursor-pointer"
                  >
                    <option value="" disabled>Select Language</option>
                    <option value="English">English</option>
                    <option value="Hindi">Hindi</option>
                    <option value="Telugu">Telugu</option>
                    <option value="Kannada">Kannada</option>
                    <option value="Tamil">Tamil</option>
                    <option value="Marathi">Marathi</option>
                  </select>
                </div>
              </div>

              {/* Consent Checkbox */}
              <div className="p-4 bg-slate-900/40 rounded-xl border border-gray-800/80 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="consent_to_contact"
                  name="consent_to_contact"
                  checked={formData.consent_to_contact}
                  onChange={handleChange}
                  className="mt-1 w-4 h-4 text-brand-red focus:ring-brand-red border-gray-800 rounded cursor-pointer"
                />
                <div className="flex flex-col gap-0.5">
                  <label htmlFor="consent_to_contact" className="text-sm font-semibold text-white cursor-pointer flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-brand-accent" />
                    Consent to Contact
                  </label>
                  <span className="text-xs text-gray-400">
                    I consent to receive urgent blood donation request messages on my phone number.
                  </span>
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
                    <span>Registering Donor...</span>
                  </>
                ) : (
                  <>
                    <Heart className="w-5 h-5 fill-white" />
                    <span>Register as Donor</span>
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
