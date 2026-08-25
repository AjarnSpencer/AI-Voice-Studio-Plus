import React, { useState, useEffect } from 'react';
import { ArrowDownTrayIcon, TrashIcon, KeyIcon } from './icons';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (googleKey: string, resembleKey: string, resembleProjectId: string, elevenLabsKey: string, amnesiac: boolean) => void;
  onShred: () => void;
  initialResembleKey?: string;
  initialResembleProjectId?: string;
  initialElevenLabsKey?: string;
  initialAmnesiac?: boolean;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  onShred,
  initialResembleKey = '',
  initialResembleProjectId = '',
  initialElevenLabsKey = '',
  initialAmnesiac = true
}) => {
  const [googleKey, setGoogleKey] = useState('');
  const [resembleKey, setResembleKey] = useState(initialResembleKey);
  const [resembleProjectId, setResembleProjectId] = useState(initialResembleProjectId);
  const [elevenLabsKey, setElevenLabsKey] = useState(initialElevenLabsKey);
  const [isAmnesiac, setIsAmnesiac] = useState(initialAmnesiac);
  const [isAIStudioEnv, setIsAIStudioEnv] = useState(false);
  const [hasAIStudioKey, setHasAIStudioKey] = useState(false);

  useEffect(() => {
    setResembleKey(initialResembleKey);
    setResembleProjectId(initialResembleProjectId);
    setElevenLabsKey(initialElevenLabsKey);
    setIsAmnesiac(initialAmnesiac);
    
    const storedGoogle = localStorage.getItem('gemini_api_key');
    if (storedGoogle) setGoogleKey(storedGoogle);

    if (typeof window.aistudio !== 'undefined') {
      setIsAIStudioEnv(true);
      window.aistudio.hasSelectedApiKey().then(has => {
        const revoked = sessionStorage.getItem('gemini_key_revoked') === 'true';
        setHasAIStudioKey(has && !revoked);
      });
    } else {
      setIsAIStudioEnv(false);
    }
  }, [initialResembleKey, initialElevenLabsKey, initialAmnesiac, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(googleKey.trim(), resembleKey.trim(), resembleProjectId.trim(), elevenLabsKey.trim(), isAmnesiac);
    onClose();
  };

  const handleOpenGoogleSelect = async () => {
    if (typeof window.aistudio !== 'undefined') {
       await window.aistudio.openSelectKey();
       sessionStorage.removeItem('gemini_key_revoked');
       const hasKeyNow = await window.aistudio.hasSelectedApiKey();
       setHasAIStudioKey(hasKeyNow);
    }
  };

  const handleRevokeGoogle = () => {
    if (isAIStudioEnv) {
      sessionStorage.setItem('gemini_key_revoked', 'true');
      setHasAIStudioKey(false);
    } else {
      setGoogleKey('');
    }
  };

  const exportDotEnv = () => {
    let envKey = '';
    try {
      if (typeof process !== 'undefined' && process.env) {
        envKey = process.env.API_KEY || process.env.GEMINI_API_KEY || '';
      }
    } catch (e) {
      console.warn("Env access failed", e);
    }
    const envContent = `# AUTO-GENERATED PRODUCTION CREDENTIALS\n# Pipeline Master Polyglot Matrix\n\nGEMINI_API_KEY=${googleKey || envKey}\nELEVENLABS_API_KEY=${elevenLabsKey}\nRESEMBLE_API_KEY=${resembleKey}\nRESEMBLE_PROJECT_ID=${resembleProjectId}\nAMNESIAC_DEFAULT=TRUE`;
    const blob = new Blob([envContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '.env';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleIndividualRevoke = (engine: 'eleven' | 'resemble') => {
    if (engine === 'eleven') setElevenLabsKey('');
    else setResembleKey('');
  };

  return (
    <div className="fixed inset-0 bg-black/95 flex items-start justify-center z-[200] p-0 sm:p-4 backdrop-blur-2xl transition-all overflow-y-auto" onClick={onClose}>
      <div className="bg-[#0a0a0a] sm:rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.8)] w-full max-w-xl min-h-screen sm:min-h-0 sm:my-8 border border-teal-500/10 flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Terminal Header */}
        <div className="p-6 bg-gray-900/80 border-b border-gray-800 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/50"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-green-500/50"></div>
            </div>
            <div className="ml-2">
              <h2 className="text-xl font-black text-teal-300 font-orbitron tracking-tighter uppercase">Text Narrator Polyglot Pro Terminal</h2>
              <p className="text-[10px] text-gray-600 uppercase tracking-[0.3em] font-bold">Credential Management Layer • Restricted Access</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-white transition-all text-3xl font-light">&times;</button>
        </div>
        
        <div className="p-8 space-y-6">
          {/* Persistence Policy Selection */}
          <div className="flex flex-col gap-3">
             <div className="flex justify-between items-end mb-1">
               <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Global Persistence Strategy</label>
               <span className="text-[9px] text-teal-500/40 uppercase font-black">Status: {isAmnesiac ? 'Volatile' : 'Persistent'}</span>
             </div>
             <div className="grid grid-cols-2 gap-3 bg-black/60 p-2 rounded-2xl border border-gray-800">
                <button 
                  onClick={() => setIsAmnesiac(true)}
                  className={`py-4 text-xs font-black uppercase rounded-xl transition-all flex items-center justify-center gap-2 border ${isAmnesiac ? 'bg-teal-600/10 border-teal-500/40 text-teal-300 shadow-[0_0_15px_rgba(20,184,166,0.1)]' : 'bg-transparent border-transparent text-gray-600 hover:text-gray-400'}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.826L7.04 9.302a6.002 6.002 0 0110.796 4.47l-1.102 1.101m-.758-4.826l1.218-1.217a2 2 0 012.828 0l2.828 2.828a2 2 0 010 2.828l-1.01 1.01" /></svg>
                  Ghost Mode
                </button>
                <button 
                  onClick={() => setIsAmnesiac(false)}
                  className={`py-4 text-xs font-black uppercase rounded-xl transition-all flex items-center justify-center gap-2 border ${!isAmnesiac ? 'bg-gray-800 border-gray-700 text-teal-100' : 'bg-transparent border-transparent text-gray-600 hover:text-gray-400'}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                  Stay Active
                </button>
             </div>
             <p className="text-[8px] text-gray-600 text-center uppercase tracking-widest mt-1">
               Ghost Mode ensures keys never touch local storage. Slate is wiped on session termination.
             </p>
          </div>

          <div className="space-y-6">
            {/* Gemini Section - Adaptive UI for AI Studio vs Standalone */}
            {isAIStudioEnv ? (
              <div className="bg-black/40 p-6 rounded-2xl border border-teal-500/5 hover:border-teal-500/20 transition-all flex items-center justify-between gap-4 group">
                <div className="flex-grow">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-1.5 h-1.5 rounded-full transition-all duration-1000 ${hasAIStudioKey ? 'bg-teal-500 shadow-[0_0_10px_#14b8a6]' : 'bg-red-950 border border-red-500/20'}`}></span>
                    <label className="text-xs font-black text-teal-500/60 uppercase tracking-widest group-hover:text-teal-500 transition-colors">Neural Integration (Standard)</label>
                  </div>
                  <p className="text-[10px] text-gray-600 font-bold uppercase tracking-tighter">{hasAIStudioKey ? 'Internal Account Verified' : 'External Authentication Required'}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleOpenGoogleSelect} className="px-6 py-3 bg-gray-900 border border-gray-800 hover:border-teal-500/40 rounded-xl text-xs font-black uppercase text-teal-300 transition-all">
                    {hasAIStudioKey ? 'Re-Sync' : 'Connect'}
                  </button>
                  {hasAIStudioKey && (
                    <button onClick={handleRevokeGoogle} className="px-4 py-3 bg-red-950/20 border border-red-500/30 rounded-xl text-xs font-black uppercase text-red-500 hover:bg-red-600 hover:text-white transition-all">Revoke</button>
                  )}
                </div>
              </div>
            ) : (
              // Standalone / Electron UI
              <div className="bg-black/40 p-6 rounded-2xl border border-teal-500/10 hover:border-teal-500/30 transition-all flex items-center justify-between gap-4">
                 <div className="flex-grow">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`w-1.5 h-1.5 rounded-full transition-all duration-1000 ${googleKey ? 'bg-teal-500 shadow-[0_0_10px_#14b8a6]' : 'bg-red-950 border border-red-500/20'}`}></span>
                      <label className="text-xs font-black text-teal-500/60 uppercase tracking-widest">Gemini API Key (Required)</label>
                    </div>
                    <input
                      type="password"
                      value={googleKey}
                      onChange={(e) => setGoogleKey(e.target.value)}
                      placeholder="AIzaSy..."
                      className="w-full bg-transparent border-b border-gray-800 text-sm text-teal-100 outline-none focus:border-teal-500 transition-all font-mono py-2 placeholder:text-gray-800"
                    />
                 </div>
                 <button onClick={handleRevokeGoogle} className="px-5 py-3 bg-gray-900 hover:bg-red-950/30 border border-gray-800 rounded-xl text-xs font-black uppercase text-gray-600 hover:text-red-400 transition-all">Clear</button>
              </div>
            )}

            {/* ElevenLabs Section - Bio-LED Active */}
            <div className="bg-black/40 p-5 rounded-2xl border border-gray-800 flex items-center justify-between gap-4 hover:border-gray-700 transition-all">
               <div className="flex-grow">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-1.5 h-1.5 rounded-full transition-all duration-1000 ${elevenLabsKey ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : 'bg-gray-800'}`}></span>
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">ElevenLabs Studio Key</label>
                  </div>
                  <input
                    type="password"
                    value={elevenLabsKey}
                    onChange={(e) => setElevenLabsKey(e.target.value)}
                    placeholder="xi-api-key-xxxx..."
                    className="w-full bg-transparent border-b border-gray-800 text-xs text-teal-100 outline-none focus:border-teal-500 transition-all font-mono py-1 placeholder:text-gray-800"
                  />
               </div>
               <button onClick={() => handleIndividualRevoke('eleven')} className="px-4 py-2.5 bg-gray-900 hover:bg-red-950/30 border border-gray-800 rounded-xl text-[9px] font-black uppercase text-gray-600 hover:text-red-400 transition-all">Clear</button>
            </div>

            {/* Resemble AI Section - Bio-LED Active */}
            <div className="bg-black/40 p-5 rounded-2xl border border-gray-800 flex flex-col gap-4 hover:border-gray-700 transition-all">
               <div className="flex items-center justify-between gap-4">
                 <div className="flex-grow">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`w-1.5 h-1.5 rounded-full transition-all duration-1000 ${resembleKey ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : 'bg-gray-800'}`}></span>
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Resemble AI Authentication</label>
                    </div>
                    <input
                      type="password"
                      value={resembleKey}
                      onChange={(e) => setResembleKey(e.target.value)}
                      placeholder="Bearer Token..."
                      className="w-full bg-transparent border-b border-gray-800 text-xs text-teal-100 outline-none focus:border-teal-500 transition-all font-mono py-1 placeholder:text-gray-800"
                    />
                 </div>
                 <button onClick={() => handleIndividualRevoke('resemble')} className="px-4 py-2.5 bg-gray-900 hover:bg-red-950/30 border border-gray-800 rounded-xl text-[9px] font-black uppercase text-gray-600 hover:text-red-400 transition-all">Clear</button>
               </div>
               <div className="flex flex-col">
                  <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-1">Resemble Project ID</label>
                  <input
                    type="text"
                    value={resembleProjectId}
                    onChange={(e) => setResembleProjectId(e.target.value)}
                    placeholder="Project UUID..."
                    className="w-full bg-transparent border-b border-gray-800 text-xs text-teal-100 outline-none focus:border-teal-500 transition-all font-mono py-1 placeholder:text-gray-800"
                  />
               </div>
            </div>
          </div>

          <div className="pt-6 flex flex-col gap-4">
              <button 
                onClick={handleSave} 
                className="w-full py-5 bg-teal-600 hover:bg-teal-500 text-black font-black uppercase text-xs tracking-[0.2em] rounded-2xl transition-all shadow-[0_20px_40px_rgba(20,184,166,0.1)] border border-teal-400/40 active:scale-[0.98]"
              >
                Execute Master Sync
              </button>
              
              <div className="grid grid-cols-2 gap-3 pb-8">
                  <button 
                    onClick={exportDotEnv}
                    className="flex items-center justify-center gap-2 py-3.5 bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-2xl text-[9px] font-black uppercase text-gray-500 hover:text-teal-300 tracking-widest transition-all"
                  >
                    <ArrowDownTrayIcon className="w-4 h-4" />
                    Export Local .env
                  </button>
                  <button 
                    onClick={() => { if(confirm('SHREDDER ACTIVATED: This will purge all local data, cached voices, and scripts from the browser. Proceed with total data annihilation?')) onShred(); }}
                    className="flex items-center justify-center gap-2 py-3.5 bg-red-950/10 hover:bg-red-600 border border-red-900/40 hover:border-red-400 rounded-2xl text-[9px] font-black uppercase text-red-700 hover:text-white tracking-widest transition-all"
                  >
                    <TrashIcon className="w-4 h-4" />
                    Shred All Data
                  </button>
              </div>
          </div>
        </div>
      </div>
    </div>
  );
};