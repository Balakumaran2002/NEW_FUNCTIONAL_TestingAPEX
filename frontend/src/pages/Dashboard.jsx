import React, { useState } from 'react';
import { 
  GitBranch, ShieldAlert, CheckCircle, AlertTriangle, ArrowRight, Server, Play, Search, FileText, Layers, Download, Lock, Check, Activity, Clock, FolderGit2, MapPin, Cloud, Code, GitMerge, Database
} from 'lucide-react';
import { validateRepository } from '../api';
import { motion } from 'framer-motion';

export default function Dashboard({ setActiveTab, setAnalysisRepoUrl, setAnalysisResult, sessionId, setSessionId }) {
  const [repoUrl, setRepoUrl] = useState('');
  const [patToken, setPatToken] = useState('');
  const [validationState, setValidationState] = useState('initial'); // 'initial' | 'loading' | 'success' | 'error' | 'requires_auth'
  const [validationMessage, setValidationMessage] = useState('');
  const [isValidated, setIsValidated] = useState(false);

  // Trigger validation either automatically or by user action
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
        // Automatically continue to next step on success for smoother UX
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
    { title: 'Connect Repository', icon: <GitBranch size={20} />, subtext: 'Link your GitHub repository', num: 1, color: 'bg-[#5B5FF6]', textColor: 'text-[#5B5FF6]', shadow: 'shadow-indigo-100' },
    { title: 'Project Discovery', icon: <Search size={20} />, subtext: 'AI analyzes your project', num: 2, color: 'bg-blue-500', textColor: 'text-blue-500', shadow: 'shadow-blue-100' },
    { title: 'Generate Test Cases', icon: <FileText size={20} />, subtext: 'Create UI & API test cases', num: 3, color: 'bg-amber-500', textColor: 'text-amber-500', shadow: 'shadow-amber-100' },
    { title: 'Execute Tests', icon: <Play size={20} />, subtext: 'Run tests in real browsers', num: 4, color: 'bg-emerald-500', textColor: 'text-emerald-500', shadow: 'shadow-emerald-100' },
    { title: 'View Results', icon: <Activity size={20} />, subtext: 'Get pass/fail status & analytics', num: 5, color: 'bg-rose-500', textColor: 'text-rose-500', shadow: 'shadow-rose-100' },
    { title: 'Download Reports', icon: <Download size={20} />, subtext: 'Share professional reports', num: 6, color: 'bg-purple-500', textColor: 'text-purple-500', shadow: 'shadow-purple-100' },
  ];

  return (
    <div className="flex flex-col gap-6 animate-fadeIn w-full max-w-7xl mx-auto pb-10 h-full">
      
      {/* Banner Section */}
      <div className="relative overflow-hidden rounded-3xl bg-white border border-[#EAECF0] shadow-sm">
        <div className="absolute top-0 right-0 w-1/3 h-full overflow-hidden hidden md:block">
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-50 rounded-full blur-3xl opacity-50"></div>
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
             <div className="relative">
               <div className="w-24 h-24 bg-gradient-to-br from-[#5B5FF6] to-[#7B61FF] rounded-2xl flex items-center justify-center shadow-lg transform -rotate-6">
                 <Code size={40} className="text-white" />
               </div>
               <div className="absolute -bottom-4 -right-4 w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-md border border-slate-100">
                 <GitMerge size={24} className="text-[#101828]" />
               </div>
             </div>
           </div>
        </div>
        
        <div className="p-8 md:p-12 md:pr-1/3 relative z-10">
          <h1 className="text-3xl md:text-4xl font-extrabold text-[#101828] tracking-tight mb-4">
            AI Functional Testing Platform
          </h1>
          <p className="text-[#667085] text-lg max-w-2xl leading-relaxed">
            Let PROVA analyze your application, generate smart test cases automatically and deliver professional test reports.
          </p>
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
          Connect Your GitHub Repository
        </h2>
        <p className="text-sm text-[#667085] mb-6">
          Start by connecting your repository, PROVA will analyze your project and understand its structure.
        </p>

        <form onSubmit={handleValidate} className="space-y-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search size={18} className="text-[#98A2B3]" />
              </div>
              <input
                type="url"
                value={repoUrl}
                onChange={handleUrlChange}
                placeholder="https://github.com/username/repository"
                required
                disabled={validationState === 'loading'}
                className="w-full pl-11 pr-5 py-3.5 rounded-xl border border-[#EAECF0] bg-white focus:ring-2 focus:ring-[#5B5FF6] focus:border-transparent outline-none transition-all text-sm font-medium shadow-sm"
              />
            </div>
            
            {validationState !== 'requires_auth' && (
              <button
                type="submit"
                disabled={!repoUrl.trim() || validationState === 'loading'}
                className="flex items-center justify-center gap-2 px-8 py-3.5 bg-[#5B5FF6] hover:bg-[#4f53dc] text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shadow-sm"
              >
                {validationState === 'loading' ? (
                  <span className="animate-pulse">Checking...</span>
                ) : isValidated ? (
                  <>Continue <ArrowRight size={18} /></>
                ) : (
                  'Connect Repository'
                )}
              </button>
            )}
          </div>

          {/* Features below input */}
          <div className="flex flex-wrap items-center gap-6 mt-4">
            <div className="flex items-center gap-2 text-xs font-bold text-[#475467] bg-[#F2F4F7] px-3 py-1.5 rounded-full">
              <MapPin size={14} className="text-emerald-600" />
              Public & Private Repositories
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-[#475467] bg-[#F2F4F7] px-3 py-1.5 rounded-full">
              <Lock size={14} className="text-blue-600" />
              Secure Connection
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-[#475467] bg-[#F2F4F7] px-3 py-1.5 rounded-full">
              <Cloud size={14} className="text-amber-500" />
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

          {/* Status Messages */}
          {validationState === 'error' && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3 mt-4">
              <ShieldAlert className="text-rose-500 flex-shrink-0 mt-0.5" size={18} />
              <p className="text-sm font-medium text-rose-700">{validationMessage}</p>
            </div>
          )}

          {validationState === 'success' && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between gap-3 mt-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="text-emerald-500 flex-shrink-0" size={20} />
                <p className="text-sm font-bold text-emerald-800">{validationMessage}</p>
              </div>
              <button 
                onClick={handleContinue}
                className="text-emerald-700 hover:text-emerald-900 font-bold text-sm underline"
              >
                Continue Now
              </button>
            </div>
          )}
        </form>
      </motion.div>

      {/* How PROVA Works Stepper */}
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-[#EAECF0]">
        <h3 className="text-lg font-bold text-[#101828] mb-8">How PROVA Works (Step-by-Step)</h3>
        <div className="flex justify-between relative mt-4">
          {steps.map((step, idx) => {
            const isActiveOrCompleted = idx === 0; // On Dashboard, only step 1 is active
            return (
              <div key={idx} className="relative z-10 flex flex-col items-center bg-white w-full">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm mb-4 ${isActiveOrCompleted ? step.color + ' ' + step.shadow : 'bg-[#D0D5DD]'}`}>
                  {step.num}
                </div>
                <div className={`relative w-14 h-14 rounded-full bg-white border flex items-center justify-center shadow-sm ${isActiveOrCompleted ? step.textColor + ' border-[#EAECF0]' : 'text-[#D0D5DD] border-[#F2F4F7]'}`}>
                  {step.icon}
                  {idx < steps.length - 1 && (
                    <div className="absolute top-1/2 -right-[50%] -translate-y-1/2 translate-x-[40%] hidden md:block z-0 text-[#D0D5DD]">
                      <ArrowRight size={14} />
                    </div>
                  )}
                </div>
                <div className="text-center mt-5">
                  <span className={`block text-xs font-bold mb-1 ${isActiveOrCompleted ? 'text-[#101828]' : 'text-[#98A2B3]'}`}>
                    {step.title}
                  </span>
                  <span className={`block text-[10px] leading-tight max-w-[90px] mx-auto ${isActiveOrCompleted ? 'text-[#667085]' : 'text-[#D0D5DD]'}`}>
                    {step.subtext}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Grids */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-4">
        
        {/* Recent Projects */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-[#EAECF0] flex flex-col">
          <h3 className="text-lg font-bold text-[#101828] mb-6">Recent Projects</h3>
          <div className="flex flex-col gap-4 flex-1">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-[#5B5FF6] font-bold text-lg shadow-sm border border-indigo-100">
                E
              </div>
              <div>
                <p className="text-sm font-bold text-[#101828]">E-Commerce Platform</p>
                <p className="text-xs text-[#667085]">Analyzed on May 16, 2025</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-lg shadow-sm border border-blue-100">
                S
              </div>
              <div>
                <p className="text-sm font-bold text-[#101828]">Student Management System</p>
                <p className="text-xs text-[#667085]">Analyzed on May 14, 2025</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Statistics */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-[#EAECF0]">
          <h3 className="text-lg font-bold text-[#101828] mb-6">Quick Statistics</h3>
          <div className="grid grid-cols-2 gap-4">
            
            <div className="p-4 rounded-2xl border border-[#EAECF0] flex flex-col items-start gap-2 bg-white">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                  <Database size={14} />
                </div>
                <span className="text-2xl font-black text-[#101828]">12</span>
              </div>
              <p className="text-[10px] font-bold text-[#667085] leading-tight uppercase tracking-wider">Repositories<br/>Analyzed</p>
            </div>

            <div className="p-4 rounded-2xl border border-[#EAECF0] flex flex-col items-start gap-2 bg-white">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-cyan-50 flex items-center justify-center text-cyan-600">
                  <FileText size={14} />
                </div>
                <span className="text-2xl font-black text-[#101828]">1,256</span>
              </div>
              <p className="text-[10px] font-bold text-[#667085] leading-tight uppercase tracking-wider">Text Cases<br/>Generated</p>
            </div>

            <div className="p-4 rounded-2xl border border-[#EAECF0] flex flex-col items-start gap-2 bg-white">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-fuchsia-50 flex items-center justify-center text-fuchsia-600">
                  <Play size={14} />
                </div>
                <span className="text-2xl font-black text-[#101828]">1,198</span>
              </div>
              <p className="text-[10px] font-bold text-[#667085] leading-tight uppercase tracking-wider">Tests<br/>Executed</p>
            </div>

            <div className="p-4 rounded-2xl border border-[#EAECF0] flex flex-col items-start gap-2 bg-white">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <CheckCircle size={14} />
                </div>
                <span className="text-2xl font-black text-[#101828]">98.5%</span>
              </div>
              <p className="text-[10px] font-bold text-[#667085] leading-tight uppercase tracking-wider">Success<br/>Rate</p>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
