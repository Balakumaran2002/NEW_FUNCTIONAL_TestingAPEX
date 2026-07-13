import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  PlayCircle, RefreshCw, Lock, FlaskConical, Beaker
} from 'lucide-react';
import {
  API_BASE_URL,
  getPlaywrightStatus, runPlaywrightTests,
  getSeleniumStatus, runSeleniumTests
} from '../api';
import TestSummary from '../components/TestSummary';

export default function FunctionalTesting({ 
  setActiveTab, 
  repoUrl, 
  result, 
  workflowState 
}) {
  const repoName = repoUrl ? repoUrl.split('/').pop().replace('.git', '') : '';

  const [activeFramework, setActiveFramework] = useState('playwright');
  
  const [playwrightResult, setPlaywrightResult] = useState(null);
  const [playwrightLoading, setPlaywrightLoading] = useState(false);
  
  const [seleniumResult, setSeleniumResult] = useState(null);
  const [seleniumLoading, setSeleniumLoading] = useState(false);

  useEffect(() => {
    if (repoName && result) {
      const fetchTestStatuses = async () => {
        try {
          const pwStatus = await getPlaywrightStatus(repoName);
          setPlaywrightResult(pwStatus);
          if (pwStatus.status === 'RUNNING') {
            setPlaywrightLoading(true);
            const pollPw = setInterval(async () => {
              try {
                const polled = await getPlaywrightStatus(repoName);
                setPlaywrightResult(polled);
                if (polled.status !== 'RUNNING') {
                  clearInterval(pollPw);
                  setPlaywrightLoading(false);
                }
              } catch (_) { clearInterval(pollPw); setPlaywrightLoading(false); }
            }, 3000);
          }
        } catch (err) { console.error(err); }

        try {
          const selStatus = await getSeleniumStatus(repoName);
          setSeleniumResult(selStatus);
          if (selStatus.status === 'RUNNING') {
            setSeleniumLoading(true);
            const pollSel = setInterval(async () => {
              try {
                const polled = await getSeleniumStatus(repoName);
                setSeleniumResult(polled);
                if (polled.status !== 'RUNNING') {
                  clearInterval(pollSel);
                  setSeleniumLoading(false);
                }
              } catch (_) { clearInterval(pollSel); setSeleniumLoading(false); }
            }, 3000);
          }
        } catch (err) { console.error(err); }
      };
      fetchTestStatuses();
    }
  }, [repoName, result]);

  const handleRunPlaywright = async () => {
    if (!repoName) return;
    setPlaywrightLoading(true);
    try {
      const res = await runPlaywrightTests(repoName);
      setPlaywrightResult(res);
      if (res.status === 'RUNNING') {
        const poll = setInterval(async () => {
          try {
            const polled = await getPlaywrightStatus(repoName);
            setPlaywrightResult(polled);
            if (polled.status !== 'RUNNING') { clearInterval(poll); setPlaywrightLoading(false); }
          } catch (_) { clearInterval(poll); setPlaywrightLoading(false); }
        }, 3000);
      } else { setPlaywrightLoading(false); }
    } catch (_) { setPlaywrightLoading(false); }
  };

  const handleRunSelenium = async () => {
    if (!repoName) return;
    setSeleniumLoading(true);
    try {
      const res = await runSeleniumTests(repoName);
      setSeleniumResult(res);
      if (res.status === 'RUNNING') {
        const poll = setInterval(async () => {
          try {
            const polled = await getSeleniumStatus(repoName);
            setSeleniumResult(polled);
            if (polled.status !== 'RUNNING') { clearInterval(poll); setSeleniumLoading(false); }
          } catch (_) { clearInterval(poll); setSeleniumLoading(false); }
        }, 3000);
      } else { setSeleniumLoading(false); }
    } catch (_) { setSeleniumLoading(false); }
  };

  const handleDownloadReport = (framework) => {
    window.open(`${API_BASE_URL}/migration/${repoName}/${framework}/report/download`, '_blank');
  };

  if (!workflowState?.runnerCompleted) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center animate-fadeIn">
        <Lock size={48} className="text-slate-300 mb-4" />
        <h2 className="text-xl font-bold text-slate-700 mb-2">Functional Testing Locked</h2>
        <p className="text-slate-500 mb-6 max-w-md">
          Complete Project Runner before accessing Functional Testing.
        </p>
        <button
          onClick={() => setActiveTab('runner')}
          className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors"
        >
          Go to Project Runner
        </button>
      </div>
    );
  }

  const isPlaywright = activeFramework === 'playwright';
  const activeResult = isPlaywright ? playwrightResult : seleniumResult;
  const activeLoading = isPlaywright ? playwrightLoading : seleniumLoading;
  const handleRun = isPlaywright ? handleRunPlaywright : handleRunSelenium;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Card exact match to user's screenshot */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6"
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center shrink-0">
            <FlaskConical size={26} className="text-purple-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              Functional Test Suite
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Select a framework and run automated E2E testing for the application's UI.
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          {/* Framework Toggle */}
          <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-200 shadow-inner">
            <button 
              onClick={() => setActiveFramework('playwright')} 
              className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${isPlaywright ? 'bg-white shadow text-purple-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Playwright
            </button>
            <button 
              onClick={() => setActiveFramework('selenium')} 
              className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${!isPlaywright ? 'bg-white shadow text-purple-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Selenium
            </button>
          </div>
          
          {/* Status Badge */}
          {activeLoading && (
            <div className="flex items-center gap-1.5 px-4 py-2.5 bg-yellow-50 text-yellow-600 rounded-xl text-xs font-bold border border-yellow-200/50 shadow-sm">
              <RefreshCw size={14} className="animate-spin" /> TESTING
            </div>
          )}

          {/* Run Button */}
          <button 
            onClick={handleRun}
            disabled={activeLoading || !repoName}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all
              ${activeLoading || !repoName 
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed' 
                : 'bg-purple-600 hover:bg-purple-700 text-white'}`}
          >
            <Beaker size={16} /> Run Test
          </button>
        </div>
      </motion.div>

      <div className="flex flex-col gap-6">
        {/* Test Summary Box */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: 'easeOut' }}
        >
          {activeResult && (activeLoading || activeResult.status !== 'NOT_RUN') && (
            <TestSummary 
              framework={activeFramework}
              status={activeResult}
              loading={activeLoading}
              onViewReport={() => window.open(`${API_BASE_URL}${activeResult.htmlReportUrl}`, '_blank')}
              onDownloadReport={() => handleDownloadReport(activeFramework)}
            />
          )}
        </motion.div>

        {/* HTML Report Iframe shown downward */}
        {activeResult && activeResult.htmlReportUrl && activeResult.status !== 'RUNNING' && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2, ease: 'easeOut' }}
            className="w-full bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm h-[800px]"
          >
            <iframe 
              src={`${API_BASE_URL}${activeResult.htmlReportUrl}`}
              className="w-full h-full border-0"
              title={`${activeFramework} Report`}
            />
          </motion.div>
        )}
      </div>
    </div>
  );
}
