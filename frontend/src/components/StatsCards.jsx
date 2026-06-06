// frontend/src/components/StatsCards.jsx

import { Users, Heart, Activity } from 'lucide-react';

export default function StatsCards({ totalDonors = 0, eligibleDonors = 0 }) {
  const eligibilityRate = totalDonors > 0 
    ? ((eligibleDonors / totalDonors) * 100).toFixed(1) 
    : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {/* Total Donors Card */}
      <div className="glass-panel glass-panel-hover rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-navy/10 rounded-full blur-2xl -mr-8 -mt-8" />
        <div className="flex items-center justify-between mb-4">
          <span className="text-gray-400 text-sm font-medium uppercase tracking-wider">Total Registered Donors</span>
          <div className="p-3 bg-brand-navy/20 border border-brand-navy/30 rounded-xl text-brand-accent">
            <Users className="w-6 h-6" />
          </div>
        </div>
        <div>
          <h3 className="text-4xl font-bold tracking-tight text-white mb-1">{totalDonors.toLocaleString()}</h3>
          <p className="text-sm text-gray-500">Donors registered in database</p>
        </div>
      </div>

      {/* Eligible Donors Card */}
      <div className="glass-panel glass-panel-hover rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-red/10 rounded-full blur-2xl -mr-8 -mt-8" />
        <div className="flex items-center justify-between mb-4">
          <span className="text-gray-400 text-sm font-medium uppercase tracking-wider">Eligible Donors</span>
          <div className="p-3 bg-brand-red/20 border border-brand-red/30 rounded-xl text-brand-lightred heart-pulse">
            <Heart className="w-6 h-6 fill-current" />
          </div>
        </div>
        <div>
          <h3 className="text-4xl font-bold tracking-tight text-white mb-1">{eligibleDonors.toLocaleString()}</h3>
          <p className="text-sm text-gray-500">Currently eligible for donation</p>
        </div>
      </div>

      {/* Eligibility Rate Card */}
      <div className="glass-panel glass-panel-hover rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl -mr-8 -mt-8" />
        <div className="flex items-center justify-between mb-4">
          <span className="text-gray-400 text-sm font-medium uppercase tracking-wider">Eligibility Rate</span>
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
            <Activity className="w-6 h-6" />
          </div>
        </div>
        <div>
          <h3 className="text-4xl font-bold tracking-tight text-white mb-1">{eligibilityRate}%</h3>
          <p className="text-sm text-gray-500">Percentage of active ready donors</p>
        </div>
      </div>
    </div>
  );
}
