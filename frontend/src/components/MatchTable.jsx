// frontend/src/components/MatchTable.jsx

import { AlertTriangle, Award, MessageSquare } from 'lucide-react';

export default function MatchTable({ donors, onOutreachClick }) {
  if (!donors || donors.length === 0) {
    return (
      <div className="glass-panel rounded-2xl p-12 text-center border border-gray-800">
        <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">No Matching Donors</h3>
        <p className="text-gray-400 max-w-md mx-auto">
          Please select a recipient blood group and click Search to find compatible, eligible active donors.
        </p>
      </div>
    );
  }

  // Shorten user ID hash for cleaner display
  const getShortId = (id) => {
    if (!id) return '';
    return id.length > 12 ? `${id.substring(0, 6)}...${id.substring(id.length - 6)}` : id;
  };

  return (
    <div className="glass-panel rounded-2xl overflow-hidden border border-gray-800 shadow-2xl">
      <div className="px-6 py-5 border-b border-gray-800 bg-slate-900/50 flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold text-white">Top Compatible Matches</h3>
          <p className="text-xs text-gray-400">Showing top 10 eligible active donors ranked by AI match score</p>
        </div>
        <span className="px-3 py-1 bg-brand-navy/30 border border-brand-navy/50 text-brand-accent rounded-full text-xs font-semibold">
          {donors.length} Matches Found
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-800 bg-gray-900/30 text-gray-400 text-xs font-semibold uppercase tracking-wider">
              <th className="px-6 py-4">Donor ID</th>
              <th className="px-6 py-4">Role</th>
              <th className="px-6 py-4">Blood Group</th>
              <th className="px-6 py-4">Gender</th>
              <th className="px-6 py-4">Donations</th>
              <th className="px-6 py-4 text-center">Match Score</th>
              <th className="px-6 py-4 text-center">Calls : Donation Ratio</th>
              <th className="px-6 py-4 text-right">Outreach</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/60">
            {donors.map((donor) => {
              const ratio = donor.calls_to_donations_ratio !== undefined 
                ? parseFloat(donor.calls_to_donations_ratio) 
                : 0;
                
              return (
                <tr 
                  key={donor.user_id} 
                  className="hover:bg-slate-900/30 transition-colors group text-sm text-gray-300"
                >
                  {/* Donor ID */}
                  <td className="px-6 py-4 font-mono font-medium text-white group-hover:text-brand-accent transition-colors">
                    <span title={donor.user_id}>{getShortId(donor.user_id)}</span>
                  </td>

                  {/* Role */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2.5 py-1 rounded-md font-medium bg-gray-800/80 text-gray-300 border border-gray-700/50">
                        {donor.role}
                      </span>
                    </div>
                  </td>

                  {/* Blood Group */}
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center justify-center px-3 py-1 text-xs font-bold rounded-full bg-brand-red/10 border border-brand-red/30 text-brand-lightred">
                      {donor.blood_group}
                    </span>
                  </td>

                  {/* Gender */}
                  <td className="px-6 py-4 text-gray-400">
                    {donor.gender || 'Not Specified'}
                  </td>

                  {/* Donations till date */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 font-semibold text-white">
                      <Award className="w-4 h-4 text-amber-500" />
                      <span>{donor.donations_till_date}</span>
                    </div>
                  </td>

                  {/* Match Score */}
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center justify-center px-2.5 py-1 text-xs font-bold rounded-full ${
                      (donor.match_score || 0) >= 70
                        ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                        : (donor.match_score || 0) >= 40
                        ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                        : 'bg-gray-800 border border-gray-700/50 text-gray-400'
                    }`}>
                      {donor.match_score || 0}
                    </span>
                  </td>

                  {/* Calls to Donations Ratio */}
                  <td className="px-6 py-4">
                    <div className="flex flex-col items-center justify-center">
                      <span className="font-mono text-xs font-semibold text-gray-300 mb-1">{ratio.toFixed(2)}</span>
                      <div className="w-24 bg-gray-800 rounded-full h-1.5 overflow-hidden border border-gray-700/30">
                        {/* Higher ratio is less efficient, lower is better. Show color-coded bars */}
                        <div 
                          className={`h-full rounded-full ${
                            ratio <= 1.0 ? 'bg-emerald-500' : ratio <= 3.0 ? 'bg-amber-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(100, (ratio / 5.0) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Action */}
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => onOutreachClick(donor)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-brand-red text-white hover:bg-brand-darkred active:scale-95 transition-all shadow-md shadow-brand-red/10"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>AI Outreach</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
