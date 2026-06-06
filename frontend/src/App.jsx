// frontend/src/App.jsx

import { useState } from 'react';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';
import RegisterDonor from './pages/RegisterDonor';
import CreateRequest from './pages/CreateRequest';
import DonorPortal from './pages/DonorPortal';
import { HeartHandshake, BarChart3, UserPlus, Home, FileHeart, User } from 'lucide-react';

function App() {
  const [currentView, setCurrentView] = useState('dashboard');

  return (
    <div className="text-slate-100 min-h-screen selection:bg-brand-red selection:text-white bg-slate-950">
      {/* Global Navbar */}
      <nav className="border-b border-gray-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCurrentView('dashboard')}>
              <div className="p-1.5 bg-brand-red/10 border border-brand-red/30 rounded-lg text-brand-red">
                <HeartHandshake className="w-5 h-5" />
              </div>
              <span className="font-bold text-white text-lg tracking-tight">
                BloodBridge <span className="text-xs bg-brand-red px-1.5 py-0.5 rounded text-white font-bold align-middle">AI</span>
              </span>
            </div>
            
            {/* Links */}
            <div className="flex items-center gap-2 sm:gap-4">
              <button
                onClick={() => setCurrentView('dashboard')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  currentView === 'dashboard'
                    ? 'bg-brand-red text-white shadow-md shadow-brand-red/10'
                    : 'text-gray-400 hover:text-white hover:bg-slate-900/50'
                }`}
              >
                <Home className="w-3.5 h-3.5" />
                <span>Dashboard</span>
              </button>
              
              <button
                onClick={() => setCurrentView('register')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  currentView === 'register'
                    ? 'bg-brand-red text-white shadow-md shadow-brand-red/10'
                    : 'text-gray-400 hover:text-white hover:bg-slate-900/50'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Register Donor</span>
              </button>

              <button
                onClick={() => setCurrentView('request')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  currentView === 'request'
                    ? 'bg-brand-red text-white shadow-md shadow-brand-red/10'
                    : 'text-gray-400 hover:text-white hover:bg-slate-900/50'
                }`}
              >
                <FileHeart className="w-3.5 h-3.5" />
                <span>Blood Request</span>
              </button>
              
              <button
                onClick={() => setCurrentView('admin')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  currentView === 'admin'
                    ? 'bg-brand-red text-white shadow-md shadow-brand-red/10'
                    : 'text-gray-400 hover:text-white hover:bg-slate-900/50'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Admin Insights</span>
              </button>

              <button
                onClick={() => setCurrentView('portal')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  currentView === 'portal'
                    ? 'bg-brand-red text-white shadow-md shadow-brand-red/10'
                    : 'text-gray-400 hover:text-white hover:bg-slate-900/50'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Donor Portal</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="py-6">
        {currentView === 'dashboard' ? (
          <Dashboard onViewAdmin={() => setCurrentView('admin')} />
        ) : currentView === 'admin' ? (
          <Admin onViewDashboard={() => setCurrentView('dashboard')} />
        ) : currentView === 'request' ? (
          <CreateRequest onViewDashboard={() => setCurrentView('dashboard')} />
        ) : currentView === 'portal' ? (
          <DonorPortal onViewDashboard={() => setCurrentView('dashboard')} />
        ) : (
          <RegisterDonor onViewDashboard={() => setCurrentView('dashboard')} />
        )}
      </div>
    </div>
  );
}

export default App;
