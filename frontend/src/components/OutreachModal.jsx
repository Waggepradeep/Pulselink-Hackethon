// frontend/src/components/OutreachModal.jsx

import { useState, useEffect, useCallback } from 'react';
import { X, Copy, Check, RefreshCw, Send, MessageSquare, Globe, AlertCircle } from 'lucide-react';
import api from '../services/api';

export default function OutreachModal({ donor, onClose }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [outreachData, setOutreachData] = useState({ language: '', message: '' });
  const [copied, setCopied] = useState(false);

  const fetchOutreachMessage = useCallback(async () => {
    setLoading(true);
    setError(null);
    setCopied(false);
    try {
      const data = await api.generateOutreach(donor.user_id);
      setOutreachData(data);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || "Failed to generate AI outreach message. Please verify Bedrock access.");
    } finally {
      setLoading(false);
    }
  }, [donor.user_id]);

  useEffect(() => {
    if (donor) {
      const timer = setTimeout(() => {
        fetchOutreachMessage();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [donor, fetchOutreachMessage]);

  if (!donor) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(outreachData.message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsAppShare = () => {
    const encodedText = encodeURIComponent(outreachData.message);
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodedText}`;
    window.open(whatsappUrl, '_blank');
  };

  const getShortId = (id) => {
    if (!id) return '';
    return id.length > 12 ? `${id.substring(0, 6)}...${id.substring(id.length - 6)}` : id;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div className="glass-panel w-full max-w-xl rounded-3xl overflow-hidden border border-gray-800 shadow-2xl relative">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-800 bg-slate-900/50 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-brand-red heart-pulse" />
            <h3 className="text-lg font-bold text-white">AI Outreach Assistant</h3>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-lg bg-gray-800/80 hover:bg-gray-700/80 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Donor Context Summary */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-gray-950/60 border border-gray-800/50 mb-6 text-sm">
            <div>
              <span className="text-gray-500 block text-xs uppercase tracking-wider mb-0.5">Recipient Match</span>
              <span className="font-mono text-white">{getShortId(donor.user_id)}</span>
            </div>
            <div>
              <span className="text-gray-500 block text-xs uppercase tracking-wider mb-0.5">Donor Blood Group</span>
              <span className="inline-block px-2.5 py-0.5 bg-brand-red/10 border border-brand-red/30 text-brand-lightred rounded-full text-xs font-bold mt-0.5">
                {donor.blood_group}
              </span>
            </div>
          </div>

          {/* AI Result Container */}
          <div className="min-h-[220px] flex flex-col justify-between">
            {loading ? (
              /* Loading State */
              <div className="flex flex-col items-center justify-center py-12">
                <RefreshCw className="w-10 h-10 text-brand-red animate-spin mb-4" />
                <p className="text-gray-400 text-sm">Generating outreach message using Claude Haiku...</p>
                <p className="text-gray-600 text-xs mt-1">Analyzing location & translating to local script</p>
              </div>
            ) : error ? (
              /* Error State */
              <div className="p-5 rounded-2xl bg-brand-darkred/10 border border-brand-darkred/30 flex items-start gap-3 text-brand-lightred my-4">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm">Message Generation Failed</h4>
                  <p className="text-xs mt-1 opacity-90 leading-relaxed">{error}</p>
                  <button 
                    onClick={fetchOutreachMessage}
                    className="mt-3 px-4 py-1.5 bg-brand-red text-white text-xs font-semibold rounded-lg hover:bg-brand-darkred transition-colors inline-flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Try Again</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Content State */
              <div className="space-y-4">
                {/* Language Identified */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-gray-400">
                    <Globe className="w-4 h-4 text-brand-accent" />
                    <span>Donor Language:</span>
                    <span className="px-2 py-0.5 bg-brand-navy/30 border border-brand-navy/50 text-brand-accent rounded-full text-xs font-bold">
                      {outreachData.language}
                    </span>
                  </div>
                  <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-ping" />
                    WhatsApp Ready
                  </span>
                </div>

                {/* Message display textarea */}
                <textarea
                  readOnly
                  value={outreachData.message}
                  className="w-full h-40 p-4 rounded-2xl bg-gray-950/80 border border-gray-800 text-gray-200 text-sm font-normal focus:outline-none focus:border-brand-red leading-relaxed resize-none"
                />

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3 pt-2">
                  {/* Copy Button */}
                  <button
                    onClick={handleCopy}
                    className={`flex-1 min-w-[130px] inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs font-bold transition-all border ${
                      copied 
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                        : 'bg-gray-850 hover:bg-gray-800 border-gray-700/50 text-white'
                    }`}
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? 'Copied!' : 'Copy Message'}</span>
                  </button>

                  {/* Regenerate Button */}
                  <button
                    onClick={fetchOutreachMessage}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs font-bold bg-gray-850 hover:bg-gray-800 border border-gray-700/50 text-white transition-all"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Regenerate</span>
                  </button>

                  {/* Direct WhatsApp Share */}
                  <button
                    onClick={handleWhatsAppShare}
                    className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-lg shadow-emerald-600/10 active:scale-95"
                  >
                    <Send className="w-4 h-4" />
                    <span>Open in WhatsApp</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-900/10 border-t border-gray-850 flex justify-end text-xs text-gray-500">
          Powered by Claude Haiku AI via AWS Bedrock
        </div>

      </div>
    </div>
  );
}
