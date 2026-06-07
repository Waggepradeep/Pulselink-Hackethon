// frontend/src/pages/Admin.jsx

import { useState, useEffect, useCallback } from 'react';
import { BarChart3, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../services/api';
import StatsCards from '../components/StatsCards';

export default function Admin({ onViewDashboard }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    total_donors: 0,
    eligible_donors: 0,
    blood_group_distribution: {},
    donor_type_breakdown: {}
  });
  const [requests, setRequests] = useState([]);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getStats();
      setStats(data);
      const reqRes = await api.getRequests();
      setRequests(reqRes.requests || []);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || "Failed to load dashboard statistics. Verify server status.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStats();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchStats]);

  // Format distributions for Recharts
  const formatPieData = (dataMap) => {
    return Object.entries(dataMap || {})
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  };

  const bloodGroupData = formatPieData(stats.blood_group_distribution);
  const donorTypeData = formatPieData(stats.donor_type_breakdown);

  // Premium, harmonious color palettes
  const BLOOD_COLORS = ['#B91C1C', '#DC2626', '#EF4444', '#F87171', '#FCA5A5', '#1E3A8A', '#2563EB', '#3B82F6', '#0D9488', '#059669'];
  const TYPE_COLORS = ['#1D4ED8', '#B91C1C', '#0D9488', '#D97706', '#7C3AED'];

  // Custom tooltips for Recharts


  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-10 pb-6 border-b border-gray-800/80">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-brand-navy/10 border border-brand-navy/30 rounded-2xl text-brand-accent">
            <BarChart3 className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
              Admin Analytics <span className="px-2.5 py-0.5 bg-brand-navy text-white rounded-lg text-xs font-bold uppercase tracking-wider">Dashboard</span>
            </h1>
            <p className="text-sm text-gray-400 mt-1">Aggregated insights and distribution statistics for BloodBridge AI</p>
          </div>
        </div>
        
        {/* Refresh Statistics */}
        <button
          onClick={fetchStats}
          disabled={loading}
          className="p-2.5 rounded-xl bg-gray-900 border border-gray-850 text-gray-400 hover:text-white hover:bg-gray-800/80 transition-all active:scale-95 disabled:opacity-50"
          title="Refresh Statistics"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </header>

      {error && (
        <div className="p-5 rounded-2xl bg-brand-darkred/10 border border-brand-darkred/30 flex items-start gap-3 text-brand-lightred mb-8 animate-fade-in">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-sm">Error Loading Statistics</h4>
            <p className="text-xs mt-1 opacity-90 leading-relaxed">{error}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="glass-panel rounded-2xl p-36 text-center border border-gray-800">
          <Loader2 className="w-12 h-12 text-brand-navy animate-spin mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white mb-1">Loading Analytics</h3>
          <p className="text-gray-400 text-xs">Aggregating records and compiling charts...</p>
        </div>
      ) : (
        <div className="animate-fade-in space-y-8">
          {/* Metrics summary cards */}
          <StatsCards 
            totalDonors={stats.total_donors} 
            eligibleDonors={stats.eligible_donors} 
          />

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Blood Group Distribution Chart */}
            <div className="glass-panel rounded-2xl p-6 border border-gray-800 shadow-xl flex flex-col h-[400px]">
              <div className="mb-4">
                <h3 className="text-md font-bold text-white uppercase tracking-wider">Blood Group Distribution</h3>
                <p className="text-xs text-gray-500">Breakdown of registered donors by blood type</p>
              </div>
              <div className="flex-1 min-h-0 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={bloodGroupData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {bloodGroupData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={BLOOD_COLORS[index % BLOOD_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36} 
                      iconSize={8} 
                      iconType="circle"
                      wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Donor Type Breakdown Chart */}
            <div className="glass-panel rounded-2xl p-6 border border-gray-800 shadow-xl flex flex-col h-[400px]">
              <div className="mb-4">
                <h3 className="text-md font-bold text-white uppercase tracking-wider">Donor Type Breakdown</h3>
                <p className="text-xs text-gray-500">Classification of donors based on commitment/frequency</p>
              </div>
              <div className="flex-1 min-h-0 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donorTypeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={0}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {donorTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={TYPE_COLORS[index % TYPE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36} 
                      iconSize={8} 
                      iconType="circle"
                      wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Blood Requests Log Section */}
          <div className="glass-panel rounded-2xl overflow-hidden border border-gray-800 shadow-xl mt-8">
            <div className="px-6 py-5 border-b border-gray-800 bg-slate-900/50 flex justify-between items-center">
              <div>
                <h3 className="text-md font-bold text-white uppercase tracking-wider">Blood Requests Log</h3>
                <p className="text-xs text-gray-500">Overview of all created blood requests and donor outreach responses</p>
              </div>
              <span className="px-3 py-1 bg-brand-navy/30 border border-brand-navy/50 text-brand-accent rounded-full text-xs font-semibold">
                {requests.length} Total Requests
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-800 bg-gray-900/30 text-gray-400 text-xs font-semibold uppercase tracking-wider">
                    <th className="px-6 py-4">Request ID</th>
                    <th className="px-6 py-4">Patient Name</th>
                    <th className="px-6 py-4">Blood Group</th>
                    <th className="px-6 py-4">Urgency</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-center">Donors Contacted</th>
                    <th className="px-6 py-4 text-center">Responses Received</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60">
                  {requests.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center text-gray-500 text-sm">
                        No requests logged in the database.
                      </td>
                    </tr>
                  ) : (
                    requests.map((req) => {
                      const contactedCount = req.donor_responses ? Object.keys(req.donor_responses).length : 0;
                      const responsesCount = req.donor_responses
                        ? Object.values(req.donor_responses).filter(status => status === 'accepted' || status === 'declined').length
                        : 0;

                      const isFulfilled = req.status === 'fulfilled';

                      return (
                        <tr
                          key={req.request_id}
                          className={`transition-colors text-sm ${
                            isFulfilled
                              ? 'opacity-60 text-gray-500 bg-gray-900/10 hover:bg-gray-900/20'
                              : 'hover:bg-slate-900/30 text-gray-300'
                          }`}
                        >
                          {/* Request ID */}
                          <td className="px-6 py-4 font-mono font-medium truncate max-w-[150px]">
                            <span title={req.request_id}>
                              {req.request_id.length > 8 ? `${req.request_id.substring(0, 8)}...` : req.request_id}
                            </span>
                          </td>

                          {/* Patient Name */}
                          <td className={`px-6 py-4 font-semibold ${isFulfilled ? 'text-gray-500' : 'text-white'}`}>
                            {req.patient_name}
                          </td>

                          {/* Blood Group */}
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center justify-center px-2.5 py-0.5 text-xs font-bold rounded-full ${
                              isFulfilled
                                ? 'bg-gray-800/50 border border-gray-700/50 text-gray-500'
                                : 'bg-brand-red/10 border border-brand-red/30 text-brand-lightred'
                            }`}>
                              {req.blood_group}
                            </span>
                          </td>

                          {/* Urgency */}
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold ${
                              isFulfilled
                                ? 'bg-gray-850 text-gray-500 border border-gray-800'
                                : req.urgency === 'Critical'
                                ? 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
                                : req.urgency === 'High'
                                ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                                : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                            }`}>
                              {req.urgency}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase ${
                              isFulfilled
                                ? 'bg-gray-800 border border-gray-700 text-gray-500'
                                : req.status === 'escalated'
                                ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                                : 'bg-brand-navy/20 border border-brand-navy/30 text-brand-accent'
                            }`}>
                              {req.status || 'open'}
                            </span>
                          </td>

                          {/* Donors Contacted */}
                          <td className="px-6 py-4 text-center font-bold font-mono">
                            {contactedCount}
                          </td>

                          {/* Responses Received */}
                          <td className="px-6 py-4 text-center font-bold font-mono">
                            {responsesCount}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Custom tooltips for Recharts (Declared outside of render to prevent state resets)
const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-950 border border-gray-800 px-3 py-2 rounded-xl text-xs font-semibold text-white shadow-xl">
        <p className="mb-0.5">{payload[0].name}</p>
        <p className="text-brand-accent">{payload[0].value.toLocaleString()} donors</p>
      </div>
    );
  }
  return null;
};
