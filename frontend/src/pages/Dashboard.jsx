import React, { useState } from 'react';
import { 
  GitBranch, ShieldAlert, CheckCircle, AlertTriangle, ArrowRight, Server, Play, Search, FileText, Layers, Download, Lock, Check, Activity, Clock, FolderGit2, MapPin, Cloud, Code, GitMerge, Database, ChevronRight, Folder, FolderOpen
} from 'lucide-react';
import { validateRepository, validateLocalPath } from '../api';
import { motion, AnimatePresence } from 'framer-motion';

export default function Dashboard({ setActiveTab, setAnalysisRepoUrl, setAnalysisResult, sessionId, setSessionId, setAnalysisLocalPath }) {
  const [activeMode, setActiveMode] = useState('github'); // 'github' | 'local'

  // GitHub state
  const [repoUrl, setRepoUrl] = useState('');
  const [patToken, setPatToken] = useState('');
  const [validationState, setValidationState] = useState('initial');
  const [validationMessage, setValidationMessage] = useState('');
  const [isValidated, setIsValidated] = useState(false);

  // Local folder state
  const [localPath, setLocalPath] = useState('');
  const [localValidationState, setLocalValidationState] = useState('initial');
  const [localValidationMessage, setLocalValidationMessage] = useState('');
  const [localProjectName, setLocalProjectName] = useState('');
  const [localDetectedFiles, setLocalDetectedFiles] = useState([]);

  // ─── GitHub handlers ─────────────────────────────────────────────────────
  const handleValidate = async (e) => {
    if (e) e.preventDefault();
    if (isValidated) { handleContinue(); return; }
    if (!repoUrl.trim()) return;

    setValidationState('loading');
    setValidationMessage('');
    setIsValidated(false);

    try {
      const data = await validateRepository(repoUrl, patToken || null);
      if (data.requiresPat && !patToken) {
        setValidationState('requires_auth');
        setValidationMessage('This repository is private or requires authentication. Please provide a PAT token.');
      } else if (data.isValid) {
        setValidationState('success');
        setValidationMessage(data.message || 'Repository successfully validated.');
        setIsValidated(true);
        setTimeout(() => {
          if (setAnalysisRepoUrl) setAnalysisRepoUrl(repoUrl);
          if (setAnalysisLocalPath) setAnalysisLocalPath(null);
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
      if (setAnalysisLocalPath) setAnalysisLocalPath(null);
      if (setAnalysisResult) setAnalysisResult(null);
      if (setSessionId) setSessionId(null);
      setActiveTab('discovery');
    }
  };

  // ─── Local folder handlers ────────────────────────────────────────────────
  const handleLocalValidate = async (e) => {
    if (e) e.preventDefault();
    if (!localPath.trim()) return;

    setLocalValidationState('loading');
    setLocalValidationMessage('');

    try {
      const data = await validateLocalPath(localPath.trim());
      if (data.isValid) {
        setLocalValidationState('success');
        setLocalValidationMessage(data.message);
        setLocalProjectName(data.projectName || localPath.split(/[/\\]/).pop());
        setLocalDetectedFiles(data.detectedFiles || []);
        setTimeout(() => {
          // For local paths, we set localPath and use folder name as repoUrl placeholder
          const folderName = localPath.trim().split(/[/\\]/).filter(Boolean).pop();
          if (setAnalysisRepoUrl) setAnalysisRepoUrl(folderName);
          if (setAnalysisLocalPath) setAnalysisLocalPath(localPath.trim());
          if (setAnalysisResult) setAnalysisResult(null);
          if (setSessionId) setSessionId(null);
          setActiveTab('discovery');
        }, 800);
      } else {
        setLocalValidationState('error');
        setLocalValidationMessage(data.message || 'Invalid local path.');
      }
    } catch (err) {
      setLocalValidationState('error');
      setLocalValidationMessage('Could not validate path. Make sure the backend server is running.');
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
        
        <div className="hidden md:flex relative items-center justify-center w-64 h-64 perspective-1000 -translate-x-[192px]">
           <div className="absolute inset-0 bg-[#5B5FF6]/20 rounded-full blur-[40px] opacity-80 animate-pulse"></div>
           <motion.div animate={{ y: [0, -12, 0], opacity: [0.6, 1, 0.6] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} className="absolute top-12 right-12 w-4 h-4 rounded-full bg-indigo-400 shadow-[0_0_15px_rgba(129,140,248,0.6)]"></motion.div>
           <motion.div animate={{ y: [0, 15, 0], opacity: [0.5, 0.9, 0.5] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }} className="absolute top-28 left-8 w-6 h-6 rounded-full bg-blue-400 shadow-[0_0_20px_rgba(96,165,250,0.6)]" style={{ background: 'radial-gradient(circle at 30% 30%, #60A5FA, #3B82F6)' }}></motion.div>
           <motion.div animate={{ y: [-8, 8, -8] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} className="relative z-10 w-36 h-36 rounded-[2.2rem] flex items-center justify-center shadow-[0_20px_50px_rgba(91,95,246,0.3)] border border-white/40" style={{ background: 'linear-gradient(135deg, rgba(91,95,246,0.85) 0%, rgba(123,97,255,0.95) 100%)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -4px 8px rgba(0,0,0,0.15), 0 20px 40px rgba(91,95,246,0.4)', transformStyle: 'preserve-3d' }}>
             <div className="absolute inset-0 rounded-[2.2rem] border-[1.5px] border-white/30 pointer-events-none"></div>
             <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent rounded-t-[2.2rem] pointer-events-none"></div>
             <Code size={64} className="text-white drop-shadow-lg" strokeWidth={2.5} />
           </motion.div>
           <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }} className="absolute bottom-10 right-6 z-20 w-16 h-16 rounded-full flex items-center justify-center border border-white/80" style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', boxShadow: 'inset 0 2px 6px rgba(255,255,255,1), inset 0 -2px 4px rgba(0,0,0,0.05), 0 12px 24px rgba(0,0,0,0.12)' }}>
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
        <h2 className="text-lg font-bold text-[#101828] mb-1">Connect</h2>
        <p className="text-sm text-[#667085] mb-6">
          Start by connecting your repository or local project folder. PROVA will analyze your project and understand its structure.
        </p>

        {/* Mode Tabs */}
        <div className="flex items-center gap-1 bg-[#F9FAFB] border border-[#EAECF0] p-1 rounded-xl w-fit mb-6">
          <button
            onClick={() => { setActiveMode('github'); setValidationState('initial'); setValidationMessage(''); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeMode === 'github' ? 'bg-white shadow-sm text-[#101828] border border-[#EAECF0]' : 'text-[#667085] hover:text-[#344054]'}`}
          >
            <svg width="14" height="14" viewBox="0 0 98 96" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" clipRule="evenodd" d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.868 0 48.854 0z" fill="currentColor"/>
            </svg>
            GitHub Repository
          </button>
          <button
            onClick={() => { setActiveMode('local'); setLocalValidationState('initial'); setLocalValidationMessage(''); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeMode === 'local' ? 'bg-white shadow-sm text-[#101828] border border-[#EAECF0]' : 'text-[#667085] hover:text-[#344054]'}`}
          >
            <Folder size={14} />
            Local Folder
          </button>
        </div>

        <AnimatePresence mode="wait">
          {/* ── GitHub Tab ── */}
          {activeMode === 'github' && (
            <motion.form key="github" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.2 }} onSubmit={handleValidate} className="space-y-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <GitBranch size={16} className="text-[#98A2B3]" />
                  </div>
                  <input
                    type="url"
                    value={repoUrl}
                    onChange={handleUrlChange}
                    placeholder="https://github.com/username/repository.git"
                    required
                    disabled={validationState === 'loading'}
                    className="w-full pl-11 pr-5 py-3 rounded-xl border border-[#EAECF0] bg-white focus:ring-2 focus:ring-[#5B5FF6] focus:border-transparent outline-none transition-all text-sm shadow-sm font-medium"
                  />
                </div>
                {validationState !== 'requires_auth' && (
                  <button
                    type="submit"
                    disabled={!repoUrl.trim() || validationState === 'loading'}
                    className="flex items-center justify-center gap-2 px-10 py-3 bg-[#5B5FF6] hover:bg-[#4f53dc] text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shadow-sm text-sm"
                  >
                    {validationState === 'loading' ? <span className="animate-pulse">Checking...</span> : 'Connect'}
                  </button>
                )}
              </div>

              {validationState === 'error' && (
                <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full border border-red-500 flex items-center justify-center text-red-500 font-bold text-[10px]">!</div><p className="text-xs font-medium text-red-500">{validationMessage}</p></div>
              )}
              {validationState === 'success' && (
                <div className="flex items-center gap-2"><CheckCircle size={14} className="text-emerald-500" /><p className="text-xs font-medium text-emerald-600">{validationMessage}</p></div>
              )}

              <div className="flex flex-wrap items-center gap-4 mt-2">
                <div className="flex items-center gap-2 text-[11px] font-bold text-[#101828] bg-emerald-50/50 border border-emerald-100 px-4 py-2 rounded-[20px]"><MapPin size={12} className="text-emerald-600" />Public &amp; Private Repositories</div>
                <div className="flex items-center gap-2 text-[11px] font-bold text-[#101828] bg-blue-50/50 border border-blue-100 px-4 py-2 rounded-[20px]"><Lock size={12} className="text-blue-500" />Secure Connection</div>
                <div className="flex items-center gap-2 text-[11px] font-bold text-[#101828] bg-orange-50/50 border border-orange-100 px-4 py-2 rounded-[20px]"><Cloud size={12} className="text-orange-500" />Read-Only Access</div>
              </div>

              {validationState === 'requires_auth' && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="pt-6 mt-6 border-t border-[#F2F4F7]">
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 flex items-start gap-3">
                    <AlertTriangle className="text-amber-600 flex-shrink-0 mt-0.5" size={18} />
                    <div><h4 className="text-sm font-bold text-amber-800">Authentication Required</h4><p className="text-xs text-amber-700 mt-1">{validationMessage}</p></div>
                  </div>
                  <label className="block text-sm font-bold text-[#344054] mb-2">Personal Access Token (PAT)</label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input type="password" value={patToken} onChange={(e) => setPatToken(e.target.value)} placeholder="ghp_..." required className="flex-1 px-4 py-3 rounded-xl border border-[#EAECF0] bg-[#F9FAFB] focus:ring-2 focus:ring-[#5B5FF6] outline-none transition-all font-mono text-sm" />
                    <button type="submit" disabled={!patToken.trim() || validationState === 'loading'} className="flex items-center justify-center gap-2 px-6 py-3 bg-[#101828] hover:bg-[#344054] text-white font-bold rounded-xl transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap">
                      {validationState === 'loading' ? 'Validating...' : 'Validate Token'}
                    </button>
                  </div>
                </motion.div>
              )}
            </motion.form>
          )}

          {/* ── Local Folder Tab ── */}
          {activeMode === 'local' && (
            <motion.form key="local" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.2 }} onSubmit={handleLocalValidate} className="space-y-6">
              <div className="bg-[#F8F9FF] border border-[#E5E7FF] rounded-xl p-4 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#5B5FF6]/10 flex items-center justify-center shrink-0">
                  <Folder size={16} className="text-[#5B5FF6]" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[#344054] mb-0.5">Local Project Folder</p>
                  <p className="text-xs text-[#667085]">Enter the absolute path to your project folder on this machine. The backend server must have access to this path.</p>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <FolderOpen size={16} className="text-[#98A2B3]" />
                  </div>
                  <input
                    type="text"
                    value={localPath}
                    onChange={(e) => { setLocalPath(e.target.value); setLocalValidationState('initial'); setLocalValidationMessage(''); }}
                    placeholder="C:\Users\username\projects\my-app  or  /home/user/projects/my-app"
                    disabled={localValidationState === 'loading'}
                    className="w-full pl-11 pr-5 py-3 rounded-xl border border-[#EAECF0] bg-white focus:ring-2 focus:ring-[#5B5FF6] focus:border-transparent outline-none transition-all text-sm shadow-sm font-medium font-mono"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!localPath.trim() || localValidationState === 'loading'}
                  className="flex items-center justify-center gap-2 px-10 py-3 bg-[#5B5FF6] hover:bg-[#4f53dc] text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shadow-sm text-sm"
                >
                  {localValidationState === 'loading' ? <span className="animate-pulse">Validating...</span> : 'Connect'}
                </button>
              </div>

              {localValidationState === 'error' && (
                <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl border border-red-100">
                  <div className="w-5 h-5 rounded-full border border-red-500 flex items-center justify-center text-red-500 font-bold text-[10px] shrink-0">!</div>
                  <p className="text-xs font-medium text-red-600">{localValidationMessage}</p>
                </div>
              )}
              {localValidationState === 'success' && (
                <div className="flex items-start gap-3 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                  <CheckCircle size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-emerald-700">{localProjectName}</p>
                    <p className="text-xs text-emerald-600 mt-0.5">{localValidationMessage}</p>
                    {localDetectedFiles.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {localDetectedFiles.map(f => (
                          <span key={f} className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">{f}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-4 mt-2">
                <div className="flex items-center gap-2 text-[11px] font-bold text-[#101828] bg-purple-50/50 border border-purple-100 px-4 py-2 rounded-[20px]"><Folder size={12} className="text-purple-600" />No Clone Required</div>
                <div className="flex items-center gap-2 text-[11px] font-bold text-[#101828] bg-blue-50/50 border border-blue-100 px-4 py-2 rounded-[20px]"><Lock size={12} className="text-blue-500" />Works Offline</div>
                <div className="flex items-center gap-2 text-[11px] font-bold text-[#101828] bg-emerald-50/50 border border-emerald-100 px-4 py-2 rounded-[20px]"><MapPin size={12} className="text-emerald-600" />Any Project Type</div>
              </div>

              <div className="bg-[#FAFAFA] rounded-xl border border-[#EAECF0] p-4">
                <p className="text-[11px] font-bold text-[#344054] mb-2">Example paths:</p>
                <div className="space-y-1">
                  {['C:\\Users\\john\\projects\\spring-app', '/home/john/projects/react-app', 'D:\\work\\java-service'].map(ex => (
                    <button key={ex} type="button" onClick={() => { setLocalPath(ex); setLocalValidationState('initial'); }} className="block text-[11px] font-mono text-[#5B5FF6] hover:underline text-left">{ex}</button>
                  ))}
                </div>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>

      {/* How PROVA Works Stepper */}
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-[#EAECF0] mt-2">
        <h3 className="text-sm font-bold text-[#101828] mb-8">How PROVA Works (Step-by-Step)</h3>
        <div className="flex justify-between relative mt-4">
          {steps.map((step, idx) => (
            <div key={idx} className="relative z-10 flex flex-col items-center bg-white w-full">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm mb-4 ${step.color} ${step.shadow}`}>{step.num}</div>
              <div className={`relative w-14 h-14 rounded-full flex items-center justify-center shadow-sm border border-transparent ${step.lightColor} ${step.textColor}`}>
                {step.icon}
                {idx < steps.length - 1 && (
                  <div className="absolute top-1/2 -right-[50%] -translate-y-1/2 translate-x-[40%] hidden md:block z-0 text-[#EAECF0]"><ChevronRight size={14} /></div>
                )}
              </div>
              <div className="text-center mt-4">
                <span className="block text-[10px] font-bold mb-1 text-[#101828]">{step.title}</span>
                <span className="block text-[9px] leading-tight max-w-[90px] mx-auto text-[#667085]">{step.subtext}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
