import React, { useState } from 'react';
import { GitBranch, ShieldAlert, CheckCircle, AlertTriangle, ArrowRight, Server, Play } from 'lucide-react';
import { validateRepository } from '../api';
import { motion } from 'framer-motion';

const T = {
  bg:        '#F7F8FC',
  card:      '#FFFFFF',
  primary:   '#5B5FF6',
  secondary: '#7B61FF',
  success:   '#12B76A',
  warning:   '#F79009',
  danger:    '#F04438',
  textPri:   '#101828',
  textSec:   '#667085',
  border:    '#EAECF0',
  radius:    '24px',
  shadow:    '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
};

export default function Dashboard({ setActiveTab, setAnalysisRepoUrl, setAnalysisResult }) {
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
      // Pass patToken only if we know we are authenticating (so the backend can check)
      const data = await validateRepository(repoUrl, patToken || null);
      
      if (data.requiresPat && !patToken) {
        setValidationState('requires_auth');
        setValidationMessage('This repository is private or requires authentication. Please provide a PAT token to continue.');
      } else if (data.isValid) {
        setValidationState('success');
        setValidationMessage(data.message || 'Repository successfully validated.');
        setIsValidated(true);
      } else {
        setValidationState('error');
        setValidationMessage(data.message || 'Failed to validate repository.');
      }
    } catch (err) {
      setValidationState('error');
      setValidationMessage('Network error or unable to connect to validation service.');
    }
  };

  // If user changes URL, reset validation
  const handleUrlChange = (e) => {
    setRepoUrl(e.target.value);
    setValidationState('initial');
    setValidationMessage('');
    setPatToken('');
    setIsValidated(false);
  };

  const handleContinue = () => {
    if (isValidated) {
      // Store in local storage for the next step
      localStorage.setItem('last_analysis', JSON.stringify({ repoUrl, githubToken: patToken }));
      if (setAnalysisRepoUrl) setAnalysisRepoUrl(repoUrl);
      if (setAnalysisResult) setAnalysisResult(null);
      setActiveTab('discovery');
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fadeIn w-full">
      <div className="w-full mt-4">
        
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="bg-white rounded-3xl p-8 lg:p-10 shadow-card border border-[#EAECF0]"
        >
          <div className="mb-8">
            <h2 className="text-2xl font-black text-[#101828] flex items-center gap-3 mb-3">
              <GitBranch className="text-brand-500" size={28} />
              Connect to GitHub
            </h2>
            <p className="text-base text-[#667085]">
              Connect your GitHub repository to begin code analysis and test generation.
            </p>
          </div>

          <form onSubmit={handleValidate} className="space-y-6">
            
            {/* Repo URL Input */}
            <div>
              <label className="block text-sm font-bold text-[#344054] mb-2">GitHub Repository URL</label>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="url"
                  value={repoUrl}
                  onChange={handleUrlChange}
                  placeholder="https://github.com/username/repository"
                  required
                  disabled={validationState === 'loading'}
                  className="flex-1 px-4 py-3 rounded-2xl border border-[#EAECF0] bg-[#F7F8FC] focus:ring-2 focus:ring-brand-500 focus:outline-none transition-all text-sm font-medium"
                />
                
                {/* The "Check" or "Validate" button next to URL if not requiring auth yet */}
                {validationState !== 'requires_auth' && (
                  <button
                    type="submit"
                    disabled={!repoUrl.trim() || validationState === 'loading'}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-brand-100 hover:bg-brand-200 text-brand-700 font-bold rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {validationState === 'loading' ? (
                      <span className="animate-pulse">Checking...</span>
                    ) : (
                      'Check Access'
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Private Repo Auth Field */}
            {validationState === 'requires_auth' && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="pt-4 border-t border-[#F2F4F7]"
              >
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5 flex items-start gap-3">
                  <AlertTriangle className="text-amber-500 flex-shrink-0 mt-0.5" size={18} />
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
                    className="flex-1 px-4 py-3 rounded-2xl border border-[#EAECF0] bg-[#F7F8FC] focus:ring-2 focus:ring-brand-500 focus:outline-none transition-all font-mono text-sm"
                  />
                  <button
                    type="submit"
                    disabled={!patToken.trim() || validationState === 'loading'}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-2xl transition-all shadow-soft disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {validationState === 'loading' ? 'Validating...' : 'Validate Token'}
                  </button>
                </div>
              </motion.div>
            )}

            {/* Status Messages */}
            {validationState === 'error' && (
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-3 animate-fadeIn">
                <ShieldAlert className="text-rose-500 flex-shrink-0 mt-0.5" size={18} />
                <p className="text-sm font-medium text-rose-700">{validationMessage}</p>
              </div>
            )}

            {validationState === 'success' && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3 animate-fadeIn">
                <CheckCircle className="text-emerald-500 flex-shrink-0" size={20} />
                <p className="text-sm font-bold text-emerald-800">{validationMessage}</p>
              </div>
            )}

            {/* Action Bar */}
            <div className="pt-6 border-t border-[#EAECF0] flex justify-end">
              <button
                type="button"
                onClick={handleContinue}
                disabled={!isValidated}
                className="flex items-center gap-2 px-8 py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-2xl transition-all shadow-soft disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue to Discovery <ArrowRight size={18} />
              </button>
            </div>

          </form>
        </motion.div>

        {/* System Status Footnote */}
        <div className="mt-8 text-center flex items-center justify-center gap-2 text-xs font-semibold text-[#98A2B3]">
          <Server size={14} /> System Modules Online & Ready
        </div>

      </div>
    </div>
  );
}
