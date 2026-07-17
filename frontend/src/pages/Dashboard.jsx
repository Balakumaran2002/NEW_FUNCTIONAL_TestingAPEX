import React, { useState } from 'react';
import { 
  GitBranch, ShieldAlert, CheckCircle, AlertTriangle, ArrowRight, Server, Play, Search, FileText, Layers, Download, Lock, Check, Activity, Clock, FolderGit2, MapPin, Cloud, Code, GitMerge, Database, ChevronRight
} from 'lucide-react';
import { validateRepository } from '../api';
import { motion } from 'framer-motion';

export default function Dashboard({ setActiveTab, setAnalysisRepoUrl, setAnalysisResult, sessionId, setSessionId }) {
  const [repoUrl, setRepoUrl] = useState('');
  const [patToken, setPatToken] = useState('');
  const [validationState, setValidationState] = useState('initial'); 
  const [validationMessage, setValidationMessage] = useState('');
  const [isValidated, setIsValidated] = useState(false);

  const handleValidate = async (e) => {
    if (e) e.preventDefault();
    if (isValidated) {
      handleContinue();
      return;
    }
    if (!repoUrl.trim()) return;

    setValidationState('loading');
    setValidationMessage('');
    setIsValidated(false);

    try {
      const data = await validateRepository(repoUrl, patToken || null);
      
      if (data.requiresPat && !patToken) {
        setValidationState('requires_auth');
        setValidationMessage('This repository is private or requires authentication. Please provide a PAT token to continue.');
      } else if (data.isValid) {
        setValidationState('success');
        setValidationMessage(data.message || 'Repository successfully validated.');
        setIsValidated(true);
        setTimeout(() => {
          if (setAnalysisRepoUrl) setAnalysisRepoUrl(repoUrl);
          if (setAnalysisResult) setAnalysisResult(null);
          if (setSessionId) setSessionId(null);
          setActiveTab('discovery');
        }, 800);
      } else {
        setValidationState('error');
        setValidationMessage(data.message || 'Failed to validate repository.');
      }
    } catch (err) {
      setValidationState('error');
      setValidationMessage('Network error or unable to connect to validation service.');
    }
  };

  const handleUrlChange = (e) => {
    setRepoUrl(e.target.value);
    setValidationState('initial');
    setValidationMessage('');
    setPatToken('');
    setIsValidated(false);
  };

  const handleContinue = () => {
    if (isValidated) {
      if (setAnalysisRepoUrl) setAnalysisRepoUrl(repoUrl);
      if (setAnalysisResult) setAnalysisResult(null);
      if (setSessionId) setSessionId(null);
      setActiveTab('discovery');
    }
  };

  const steps = [
    { title: 'Connect Repository', icon: <GitBranch size={20} />, subtext: 'Link your GitHub repository', num: 1, color: 'bg-[#5B5FF6]', textColor: 'text-[#5B5FF6]', shadow: 'shadow-indigo-100', lightColor: 'bg-indigo-50/50' },
    { title: 'Project Discovery', icon: <Search size={20} />, subtext: 'AI analyzes your project', num: 2, color: 'bg-blue-500', textColor: 'text-blue-500', shadow: 'shadow-blue-100', lightColor: 'bg-blue-50/50' },
    { title: 'Generate Test Cases', icon: <FileText size={20} />, subtext: 'Create UI & API test cases', num: 3, color: 'bg-amber-500', textColor: 'text-amber-500', shadow: 'shadow-amber-100', lightColor: 'bg-amber-50/50' },
    { title: 'Execute Tests', icon: <Play size={20} />, subtext: 'Run tests in real browsers', num: 4, color: 'bg-emerald-500', textColor: 'text-emerald-500', shadow: 'shadow-emerald-100', lightColor: 'bg-emerald-50/50' },
    { title: 'View Results', icon: <Activity size={20} />, subtext: 'Get graphical data & analytics', num: 5, color: 'bg-rose-500', textColor: 'text-rose-500', shadow: 'shadow-rose-100', lightColor: 'bg-rose-50/50' },
    { title: 'Download Reports', icon: <Download size={20} />, subtext: 'Share professional reports', num: 6, color: 'bg-purple-500', textColor: 'text-purple-500', shadow: 'shadow-purple-100', lightColor: 'bg-purple-50/50' },
  ];

  return (
    <div className="flex flex-col gap-8 animate-fadeIn w-full pb-10 h-full mt-4">
      
      {/* Top Section with Title and 3D Icon */}
      <div className="flex items-center justify-between mb-2">
        <div className="max-w-2xl">
          <h1 className="text-3xl md:text-4xl font-black text-[#101828] tracking-tight mb-3">
            AI Functional Testing Platform
          </h1>
          <p className="text-[#667085] text-sm leading-relaxed font-medium">
            Let PROVA analyze your application, generate smart test cases automatically<br/>and deliver professional test reports
          </p>
        </div>
        
        <div className="hidden md:flex relative items-center justify-center w-64 h-64 perspective-1000">
           
           {/* Soft Background Glow */}
           <div className="absolute inset-0 bg-[#5B5FF6]/20 rounded-full blur-[40px] opacity-80 animate-pulse"></div>
           
           {/* Floating Background Orbs */}
           <motion.div 
             animate={{ y: [0, -12, 0], opacity: [0.6, 1, 0.6] }} 
             transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
             className="absolute top-12 right-12 w-4 h-4 rounded-full bg-indigo-400 shadow-[0_0_15px_rgba(129,140,248,0.6)]"
           ></motion.div>
           <motion.div 
             animate={{ y: [0, 15, 0], opacity: [0.5, 0.9, 0.5] }} 
             transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
             className="absolute top-28 left-8 w-6 h-6 rounded-full bg-blue-400 shadow-[0_0_20px_rgba(96,165,250,0.6)]"
             style={{ background: 'radial-gradient(circle at 30% 30%, #60A5FA, #3B82F6)' }}
           ></motion.div>

           {/* Main 3D Glassy Card */}
           <motion.div 
             animate={{ y: [-8, 8, -8] }} 
             transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
             className="relative z-10 w-36 h-36 rounded-[2.2rem] flex items-center justify-center shadow-[0_20px_50px_rgba(91,95,246,0.3)] border border-white/40"
             style={{
               background: 'linear-gradient(135deg, rgba(91,95,246,0.85) 0%, rgba(123,97,255,0.95) 100%)',
               backdropFilter: 'blur(20px)',
               WebkitBackdropFilter: 'blur(20px)',
               boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -4px 8px rgba(0,0,0,0.15), 0 20px 40px rgba(91,95,246,0.4)',
               transformStyle: 'preserve-3d',
             }}
           >
             {/* Glossy Edge Highlight */}
             <div className="absolute inset-0 rounded-[2.2rem] border-[1.5px] border-white/30 pointer-events-none"></div>
             {/* Surface Glare */}
             <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent rounded-t-[2.2rem] pointer-events-none"></div>
             
             <Code size={64} className="text-white drop-shadow-lg" strokeWidth={2.5} />
           </motion.div>

           {/* GitHub Badge (3D/Glassy) */}
           <motion.div 
             animate={{ y: [0, -6, 0] }} 
             transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
             className="absolute bottom-10 right-6 z-20 w-16 h-16 rounded-full flex items-center justify-center border border-white/80"
             style={{
               background: 'rgba(255,255,255,0.9)',
               backdropFilter: 'blur(12px)',
               WebkitBackdropFilter: 'blur(12px)',
               boxShadow: 'inset 0 2px 6px rgba(255,255,255,1), inset 0 -2px 4px rgba(0,0,0,0.05), 0 12px 24px rgba(0,0,0,0.12)',
             }}
           >
             {/* Glare for badge */}
             <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/50 to-white/90 pointer-events-none"></div>
             <svg width="34" height="34" viewBox="0 0 98 96" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-sm relative z-10">
               <path fillRule="evenodd" clipRule="evenodd" d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.868 0 48.854 0z" fill="#101828"/>
             </svg>
           </motion.div>
        </div>
      </div>

      {/* Main Connection Card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut', delay: 0.1 }}
        className="bg-white rounded-3xl p-8 shadow-sm border border-[#EAECF0]"
      >
        <h2 className="text-lg font-bold text-[#101828] mb-1">
          Connect
        </h2>
        <p className="text-sm text-[#667085] mb-6">
          Start by connecting your repository, PROVA will analyze your project and understand its structure.
        </p>

        <form onSubmit={handleValidate} className="space-y-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 font-mono text-sm">
                <GitBranch size={16} className="text-[#98A2B3] mr-2" />
              </div>
              <input
                type="url"
                value={repoUrl}
                onChange={handleUrlChange}
                placeholder="https://github.com/username/repository.git"
                required
                disabled={validationState === 'loading'}
                className="w-full pl-12 pr-5 py-3 rounded-xl border border-[#EAECF0] bg-white focus:ring-2 focus:ring-[#5B5FF6] focus:border-transparent outline-none transition-all text-sm shadow-sm font-medium"
              />
            </div>
            
            {validationState !== 'requires_auth' && (
              <button
                type="submit"
                disabled={!repoUrl.trim() || validationState === 'loading'}
                className="flex items-center justify-center gap-2 px-10 py-3 bg-[#5B5FF6] hover:bg-[#4f53dc] text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shadow-sm text-sm"
              >
                {validationState === 'loading' ? (
                  <span className="animate-pulse">Checking...</span>
                ) : isValidated ? (
                  'Connect'
                ) : (
                  'Connect'
                )}
              </button>
            )}
          </div>

          {/* Status Messages */}
          {validationState === 'error' && (
            <div className="flex items-center gap-2 mt-2">
              <div className="w-4 h-4 rounded-full border border-red-500 flex items-center justify-center text-red-500 font-bold text-[10px]">!</div>
              <p className="text-xs font-medium text-red-500">{validationMessage}</p>
            </div>
          )}

          {validationState === 'success' && (
            <div className="flex items-center gap-2 mt-2">
              <CheckCircle size={14} className="text-emerald-500" />
              <p className="text-xs font-medium text-emerald-600">{validationMessage}</p>
            </div>
          )}

          {/* Features below input */}
          <div className="flex flex-wrap items-center gap-4 mt-6">
            <div className="flex items-center gap-2 text-[11px] font-bold text-[#101828] bg-emerald-50/50 border border-emerald-100 px-4 py-2 rounded-[20px]">
              <MapPin size={12} className="text-emerald-600" />
              Public & Private Repositories
            </div>
            <div className="flex items-center gap-2 text-[11px] font-bold text-[#101828] bg-blue-50/50 border border-blue-100 px-4 py-2 rounded-[20px]">
              <Lock size={12} className="text-blue-500" />
              Secure Connection
            </div>
            <div className="flex items-center gap-2 text-[11px] font-bold text-[#101828] bg-orange-50/50 border border-orange-100 px-4 py-2 rounded-[20px]">
              <Cloud size={12} className="text-orange-500" />
              Read-Only Access
            </div>
          </div>

          {/* Private Repo Auth Field */}
          {validationState === 'requires_auth' && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="pt-6 mt-6 border-t border-[#F2F4F7]"
            >
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 flex items-start gap-3">
                <AlertTriangle className="text-amber-600 flex-shrink-0 mt-0.5" size={18} />
                <div>
                  <h4 className="text-sm font-bold text-amber-800">Authentication Required</h4>
                  <p className="text-xs text-amber-700 mt-1">{validationMessage}</p>
                </div>
              </div>

              <label className="block text-sm font-bold text-[#344054] mb-2">Personal Access Token (PAT)</label>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="password"
                  value={patToken}
                  onChange={(e) => setPatToken(e.target.value)}
                  placeholder="ghp_..."
                  required
                  className="flex-1 px-4 py-3 rounded-xl border border-[#EAECF0] bg-[#F9FAFB] focus:ring-2 focus:ring-[#5B5FF6] outline-none transition-all font-mono text-sm"
                />
                <button
                  type="submit"
                  disabled={!patToken.trim() || validationState === 'loading'}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-[#101828] hover:bg-[#344054] text-white font-bold rounded-xl transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {validationState === 'loading' ? 'Validating...' : 'Validate Token'}
                </button>
              </div>
            </motion.div>
          )}
        </form>
      </motion.div>

      {/* How PROVA Works Stepper */}
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-[#EAECF0] mt-2">
        <h3 className="text-sm font-bold text-[#101828] mb-8">How PROVA Works (Step-by-Step)</h3>
        <div className="flex justify-between relative mt-4">
          {steps.map((step, idx) => {
            return (
              <div key={idx} className="relative z-10 flex flex-col items-center bg-white w-full">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm mb-4 ${step.color} ${step.shadow}`}>
                  {step.num}
                </div>
                <div className={`relative w-14 h-14 rounded-full flex items-center justify-center shadow-sm border border-transparent ${step.lightColor} ${step.textColor}`}>
                  {step.icon}
                  {idx < steps.length - 1 && (
                    <div className="absolute top-1/2 -right-[50%] -translate-y-1/2 translate-x-[40%] hidden md:block z-0 text-[#EAECF0]">
                      <ChevronRight size={14} />
                    </div>
                  )}
                </div>
                <div className="text-center mt-4">
                  <span className="block text-[10px] font-bold mb-1 text-[#101828]">
                    {step.title}
                  </span>
                  <span className="block text-[9px] leading-tight max-w-[90px] mx-auto text-[#667085]">
                    {step.subtext}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
