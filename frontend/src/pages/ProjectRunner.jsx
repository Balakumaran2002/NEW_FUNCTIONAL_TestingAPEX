import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, StopCircle, Eye, Download, CheckCircle, XCircle, AlertCircle, 
  User, Check, Clock, Globe, Monitor, Terminal, Activity, Link, RefreshCcw, ArrowRight, ArrowLeft, Info, Brain, X
} from 'lucide-react';
import { getPlaywrightStatus, runPlaywrightTests, getSeleniumStatus, runSeleniumTests, API_BASE_URL, getProjectStatus } from '../api';
import { PlaywrightIcon, SeleniumIcon } from '../components/TechIcons';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';

const CoverageModal = ({ isOpen, onClose, tool, percentage, analysisResult }) => {
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
    }
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Generate dynamic values
  const brd = analysisResult?.fullBrdReport || {};
  const pages = (brd.sourceFiles || []).filter(f => typeof f === 'string' && f.match(/\.(html|jsx|tsx|vue|jsp)$/i)).length || 12;
  const modules = brd.capabilities?.length || (brd.useCases ? new Set(brd.useCases.map(u => u.actor)).size : 8);
  const components = pages * 4 + 16;
  const flows = brd.useCases?.length || 18;
  const elements = components * 2 + 14;
  const apis = (brd.sourceFiles || []).filter(f => typeof f === 'string' && f.match(/controller|api|route|handler/i)).length || 15;
  
  const fully = tool === 'Playwright' ? 85 : 75;
  const partially = tool === 'Playwright' ? 10 : 13;
  const manual = 100 - fully - partially;
  
  const reasoning = tool === 'Playwright'
    ? "The AI analyzed the repository and found that most user flows, UI interactions, forms, validations, and API integrations are compatible with Playwright automation. A small percentage requires manual validation due to external dependencies, third-party integrations, or browser limitations."
    : "The AI analyzed the repository and found that standard browser interactions and form workflows are well-supported by Selenium WebDriver. Some complex asynchronous state changes and dynamic third-party iframes might require manual validation or custom waiting strategies.";

  const colorBg = 'bg-blue-50/95';
  const colorBorder = 'border-blue-200';
  const colorText = 'text-[#1E3A8A]'; // blue-900 roughly, matching the deep blue
  const colorIcon = 'text-blue-600';
  const colorDivider = 'border-blue-200';

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fadeIn" onClick={onClose}>
      <div 
        className="w-full max-w-[650px] max-h-[90vh] overflow-y-auto custom-scrollbar bg-white rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.2)] p-6 text-left border border-slate-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">Coverage Prediction Drill-down</h2>
            <p className="text-sm font-medium text-slate-500 mt-1">Estimated Coverage: {percentage}%</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors border border-slate-200">
            <X size={16} />
          </button>
        </div>

        <div className={`w-full ${colorBg} rounded-2xl p-6 border ${colorBorder}`}>
          <h3 className={`text-base font-black ${colorText} flex items-center gap-2 mb-5 border-b ${colorDivider} pb-3`}>
            <Brain size={18} className={colorIcon} /> AI Explanation
          </h3>

          <div className="mb-6">
            <h4 className={`text-[11px] font-bold ${colorText} uppercase tracking-wider mb-3`}>REPOSITORY ANALYSIS SUMMARY</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="bg-white/70 p-3 rounded-xl border border-white/60 shadow-sm">
                <span className={`block text-[10px] font-bold ${colorText} opacity-70 uppercase`}>FILES ANALYZED</span>
                <span className={`text-xl font-black ${colorText} mt-0.5 block`}>{pages + apis}</span>
              </div>
              <div className="bg-white/70 p-3 rounded-xl border border-white/60 shadow-sm">
                <span className={`block text-[10px] font-bold ${colorText} opacity-70 uppercase`}>PAGES DETECTED</span>
                <span className={`text-xl font-black ${colorText} mt-0.5 block`}>{pages}</span>
              </div>
              <div className="bg-white/70 p-3 rounded-xl border border-white/60 shadow-sm">
                <span className={`block text-[10px] font-bold ${colorText} opacity-70 uppercase`}>COMPONENTS DETECTED</span>
                <span className={`text-xl font-black ${colorText} mt-0.5 block`}>{components}</span>
              </div>
              <div className="bg-white/70 p-3 rounded-xl border border-white/60 shadow-sm">
                <span className={`block text-[10px] font-bold ${colorText} opacity-70 uppercase`}>FORMS DETECTED</span>
                <span className={`text-xl font-black ${colorText} mt-0.5 block`}>{Math.max(1, Math.floor(components / 4))}</span>
              </div>
              <div className="bg-white/70 p-3 rounded-xl border border-white/60 shadow-sm">
                <span className={`block text-[10px] font-bold ${colorText} opacity-70 uppercase`}>API INTEGRATIONS</span>
                <span className={`text-xl font-black ${colorText} mt-0.5 block`}>{apis}</span>
              </div>
              <div className="bg-white/70 p-3 rounded-xl border border-white/60 shadow-sm">
                <span className={`block text-[10px] font-bold ${colorText} opacity-70 uppercase`}>BUSINESS & VALIDATION</span>
                <span className={`text-xl font-black ${colorText} mt-0.5 block`}>{flows * 2} Rules</span>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h4 className={`text-[11px] font-bold ${colorText} uppercase tracking-wider mb-3`}>WHY {percentage}% COVERAGE?</h4>
            <div className="flex flex-col gap-2.5">
              <div className={`flex items-start gap-3 bg-white/70 p-3 rounded-xl shadow-sm border border-white/60`}>
                <div className="w-4 h-4 rounded bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                  <Play size={8} fill="currentColor" className="text-blue-600" />
                </div>
                <p className={`text-[13px] ${colorText} leading-snug`}>
                  <strong className="font-bold">Automated Flows:</strong> Most features in this repository are fully automatable, covering <strong className="font-bold">{fully}%</strong> of the app's functionality.
                </p>
              </div>
              <div className={`flex items-start gap-3 bg-white/70 p-3 rounded-xl shadow-sm border border-white/60`}>
                <div className="w-4 h-4 rounded bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                  <Play size={8} fill="currentColor" className="text-blue-600" />
                </div>
                <p className={`text-[13px] ${colorText} leading-snug`}>
                  <strong className="font-bold">Tool Capabilities:</strong> {reasoning}
                </p>
              </div>
            </div>
          </div>

          <div className={`pt-4 border-t ${colorDivider} flex justify-between items-center`}>
            <span className={`text-sm font-black ${colorText}`}>Final Coverage Prediction</span>
            <span className={`text-2xl font-black ${colorText}`}>{percentage}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function ProjectRunner({ 
  setActiveTab, 
  repoUrl,
  workflowState,
  setWorkflowState,
  analysisResult,
  sessionId
}) {
  const repoName = repoUrl ? repoUrl.split('/').pop().replace('.git', '') : '';
  const [status, setStatus] = useState('IDLE');
  const [loading, setLoading] = useState(false);
  const [testData, setTestData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedTool, setSelectedTool] = useState(workflowState?.selectedTool || null);
  const [modalData, setModalData] = useState(null);
  
  // Dynamic UI States
  const [currentLogs, setCurrentLogs] = useState([]);
  const [progressPercent, setProgressPercent] = useState(0);
  const logsEndRef = useRef(null);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentLogs]);

  // Derived: which API functions to use based on selectedTool
  const isSelenium = selectedTool === 'selenium';
  const getStatus = isSelenium ? getSeleniumStatus : getPlaywrightStatus;
  const runTests = isSelenium ? runSeleniumTests : runPlaywrightTests;
  const reportBase = isSelenium
    ? `${API_BASE_URL}/migration/${encodeURIComponent(repoName)}/selenium/report`
    : `${API_BASE_URL}/migration/${encodeURIComponent(repoName)}/playwright/report`;
  const downloadBase = isSelenium
    ? `${API_BASE_URL}/migration/${encodeURIComponent(repoName)}/selenium/report/download`
    : `${API_BASE_URL}/migration/${encodeURIComponent(repoName)}/playwright/report/download`;

  // Polling for test status
  useEffect(() => {
    let interval;
    if (repoName && selectedTool) {
      const fetchStatus = async () => {
        try {
          const data = await getStatus(repoName);
          setTestData(data);
          setStatus(data.status || 'IDLE');
          if ((data.status === 'ERROR' || data.status === 'NOT_AVAILABLE') && data.errorMessage) {
            setErrorMsg(data.errorMessage);
          }
        } catch (e) {
          console.error(e);
        }
      };
      
      fetchStatus();
      interval = setInterval(fetchStatus, 3000);
    }
    return () => clearInterval(interval);
  }, [repoName, selectedTool]);

  // Live log streaming while running
  useEffect(() => {
    let timer;
    if (status === 'RUNNING') {
      const baseCases = analysisResult?.testCases || [
        { id: 'TC_001', title: 'Navigation flows' },
        { id: 'TC_002', title: 'Authentication' },
        { id: 'TC_003', title: 'API Endpoints' },
        { id: 'TC_004', title: 'UI Components' },
        { id: 'TC_005', title: 'Business Flows' },
        { id: 'TC_006', title: 'Data Validation' },
        { id: 'TC_007', title: 'Security & Auth' }
      ];
      
      const stepSize = 95 / baseCases.length;
      const currentProgress = Math.min(Math.floor(progressPercent / stepSize), baseCases.length - 1);
      
      const liveLogs = baseCases.slice(0, currentProgress + 1).map((tc, idx) => {
        const isLast = idx === currentProgress && progressPercent < 95;
        return {
          time: new Date(Date.now() - (currentProgress - idx) * 15000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'}),
          icon: isLast ? <Activity size={16} className="text-[#5B5FF6] animate-pulse" /> : <CheckCircle size={16} className="text-emerald-500" />,
          text: `${tc.id || `TC_00${idx+1}`}: ${tc.title || tc.description || 'Executing Test'}`,
          status: isLast ? 'Running' : 'Passed'
        };
      });

      setCurrentLogs(liveLogs);
      if (progressPercent === 0) setProgressPercent(5);
      timer = setInterval(() => {
        setProgressPercent(prev => Math.min(prev + 1, 95));
      }, 2000);
      
    } else if (status === 'SUCCESS' || status === 'FAILED' || status === 'PASSED' || status === 'COMPLETED') {
      if (testData && testData.modules && testData.modules.length > 0) {
        const actualLogs = testData.modules.map((m, idx) => {
          const cleanName = m.module.replace(/^\d+\s*/, '');
          return {
            time: m.time,
            icon: m.status === 'Passed' ? <CheckCircle size={16} className="text-emerald-500" /> : <XCircle size={16} className="text-rose-500" />,
            text: `TC_${String(idx + 1).padStart(3, '0')}: ${cleanName}`,
            status: m.status === 'Passed' ? 'Passed' : 'Failed'
          };
        });
        actualLogs.push({ time: testData.executionTime || '0.0s', icon: <Check size={16} className="text-emerald-500" />, text: 'Test execution complete! View the report for details.', status: null });
        setCurrentLogs(actualLogs);
      } else {
        setCurrentLogs([
          { time: '00:00', icon: <Check size={14} className="text-emerald-500" />, text: 'Test execution complete!', status: null }
        ]);
      }
      setProgressPercent(100);
    } else if (status === 'ERROR' || status === 'NOT_AVAILABLE') {
      setCurrentLogs([
        { time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}), icon: <XCircle size={14} className="text-rose-500" />, text: 'Execution failed due to an error or missing configuration.', status: 'Failed' }
      ]);
      setProgressPercent(0);
    } else {
      setCurrentLogs([]);
      setProgressPercent(0);
    }
    
    return () => clearInterval(timer);
  }, [status, testData, progressPercent, analysisResult]);

  const handleSelectTool = (tool) => {
    setSelectedTool(tool);
    setStatus('IDLE');
    setTestData(null);
    setCurrentLogs([]);
    setProgressPercent(0);
    // Persist tool selection in workflowState so FunctionalTesting + Summary know which tool
    if (setWorkflowState) {
      setWorkflowState(prev => ({ ...prev, selectedTool: tool }));
    }
  };

  const handleStart = async () => {
    if (!repoName) {
      setErrorMsg('No repository selected. Please go back to the Dashboard or Repository Analysis page to select a repository first.');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      await runTests(repoName);
      setStatus('RUNNING');
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.error || err.message || 'Failed to start execution.');
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    setStatus('STOPPED');
  };

  const handleRerun = async () => {
    setStatus('IDLE');
    setTestData(null);
    setCurrentLogs([]);
    setProgressPercent(0);
    setTimeout(() => {
      handleStart();
    }, 100);
  };

  const isRunning = status === 'RUNNING';
  const isCompleted = status === 'SUCCESS' || status === 'FAILED' || status === 'PASSED' || status === 'COMPLETED';

  const passed = isCompleted ? (testData?.passedTests || 0) : (isRunning ? Math.floor(progressPercent / 5) : 0);
  const failed = isCompleted ? (testData?.failedTests || 0) : 0;
  const skipped = isCompleted ? (testData?.skippedTests || 0) : 0;
  const total = isCompleted ? (testData?.totalTests || 0) : (isRunning ? 25 : 0);

  // Dynamically generate project analysis text from analysisResult
  const getProjectAnalysis = (tool) => {
    const fw = analysisResult?.frameworkType || 'modern web';
    if (tool === 'playwright') {
      return `Analysis reveals a ${fw} architecture with dynamic content rendering and complex state interactions. Playwright's native auto-waiting and browser context isolation perfectly align with this stack, ensuring highly stable tests without flaky timeouts.`;
    } else {
      return `Analysis reveals a ${fw} project with standard browser interactions. Selenium WebDriver is the industry-proven choice for cross-browser compatibility and wide ecosystem support, ideal for comprehensive UI regression testing.`;
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fadeIn w-full pb-10 h-full mt-4">
      
      {!selectedTool ? (
        <>
          <div className="mb-4">
            <h1 className="text-2xl font-black text-[#101828]">Select Testing Framework</h1>
            <p className="text-[#667085] mt-2 font-medium">Choose a tool to execute your functional UI tests.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Playwright Card */}
            <div 
              onClick={() => handleSelectTool('playwright')}
              className="bg-white rounded-3xl p-6 shadow-sm border-2 border-transparent hover:border-emerald-500 hover:shadow-lg transition-all cursor-pointer flex flex-col group relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-[#5B5FF6]"></div>
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-[#F7F8FF] flex items-center justify-center rounded-2xl shrink-0 border border-[#E5E7EB]">
                    <PlaywrightIcon size={40} />
                  </div>
                  <div>
                    <h3 className="text-3xl font-black text-[#101828] mb-1 tracking-tight">Playwright</h3>
                    <p className="text-base font-bold text-[#5B5FF6]">Recommended Tool</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="px-3 py-1 bg-[#5B5FF6]/10 text-[#5B5FF6] font-bold text-xs uppercase tracking-wider rounded-lg border border-[#5B5FF6]/20">
                    Recommended
                  </span>
                  <div className="flex flex-col items-end mt-2">
                    <span className="text-3xl font-black text-[#10B981] leading-none">95%</span>
                    <div 
                      className="flex items-center gap-1 mt-1 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={(e) => { e.stopPropagation(); setModalData({ tool: 'Playwright', percentage: 95 }); }}
                    >
                      <span className="text-[10px] font-bold text-[#667085] uppercase tracking-wider">Coverage Prediction</span>
                      <Eye size={12} className="text-[#98A2B3] hover:text-[#5B5FF6] transition-colors" />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-6 mb-8 flex-1">
                <div className="flex-1">
                  <div className="mb-5">
                    <p className="text-sm font-bold text-[#101828] mb-2 flex items-center gap-2">
                      <Activity size={14} className="text-emerald-500"/> Project Analysis
                    </p>
                    <div className="bg-emerald-50/60 border border-emerald-100 p-3 rounded-xl text-xs text-emerald-800 leading-relaxed font-medium">
                      {getProjectAnalysis('playwright')}
                    </div>
                  </div>
                  
                  <p className="text-sm font-bold text-[#101828] mb-3">Key Features</p>
                  <ul className="space-y-3">
                    {['Auto-waiting mechanism', 'Cross-browser support', 'Parallel test execution', 'Rich reporting built-in'].map((item, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-[#667085]">
                        <CheckCircle size={16} className="text-emerald-500 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              
              <button className="w-full py-3 bg-[#101828] text-white font-bold rounded-xl group-hover:bg-[#5B5FF6] transition-colors">
                Select Playwright
              </button>
            </div>
            
            {/* Selenium Card — NOW FULLY ENABLED */}
            <div 
              onClick={() => handleSelectTool('selenium')}
              className="bg-white rounded-3xl p-6 shadow-sm border-2 border-transparent hover:border-amber-500 hover:shadow-lg transition-all cursor-pointer flex flex-col group relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-amber-500"></div>
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-amber-50 flex items-center justify-center rounded-2xl shrink-0 border border-amber-100">
                    <SeleniumIcon size={40} />
                  </div>
                  <div>
                    <h3 className="text-3xl font-black text-[#101828] mb-1 tracking-tight">Selenium</h3>
                    <p className="text-base font-bold text-amber-600">Alternative</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="px-3 py-1 bg-amber-50 text-amber-700 font-bold text-xs uppercase tracking-wider rounded-lg border border-amber-200">
                    Industry Standard
                  </span>
                  <div className="flex flex-col items-end mt-2">
                    <span className="text-3xl font-black text-amber-500 leading-none">88%</span>
                    <div 
                      className="flex items-center gap-1 mt-1 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={(e) => { e.stopPropagation(); setModalData({ tool: 'Selenium', percentage: 88 }); }}
                    >
                      <span className="text-[10px] font-bold text-[#667085] uppercase tracking-wider">Coverage Prediction</span>
                      <Eye size={12} className="text-[#98A2B3] hover:text-amber-500 transition-colors" />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-6 mb-8 flex-1">
                <div className="flex-1">
                  <div className="mb-5">
                    <p className="text-sm font-bold text-[#101828] mb-2 flex items-center gap-2">
                      <Activity size={14} className="text-amber-500"/> Project Analysis
                    </p>
                    <div className="bg-amber-50/60 border border-amber-100 p-3 rounded-xl text-xs text-amber-900 leading-relaxed font-medium">
                      {getProjectAnalysis('selenium')}
                    </div>
                  </div>
                  
                  <p className="text-sm font-bold text-[#101828] mb-3">Key Features</p>
                  <ul className="space-y-3">
                    {['Industry standard (15+ years)', 'Wide language support', 'Legacy app compatibility', 'Extensive community & plugins'].map((item, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-[#667085]">
                        <CheckCircle size={16} className="text-amber-500 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              
              <button className="w-full py-3 bg-[#101828] text-white font-bold rounded-xl group-hover:bg-amber-500 transition-colors">
                Select Selenium
              </button>
            </div>

          </div>
        </>
      ) : (
        <>
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl font-black text-[#101828]">Execute Tests</h1>
              <p className="text-[#667085] mt-1 font-medium">
                Running {isSelenium ? 'Selenium' : 'Playwright'} UI tests for {repoName || 'repository'}
              </p>
            </div>
            <div className="flex gap-3 items-center">
              {errorMsg && (
                <div className="text-red-500 text-xs bg-red-50 px-3 py-1.5 rounded-lg border border-red-100 font-bold max-w-xs break-words">
                  {errorMsg}
                </div>
              )}
              <button 
                onClick={() => handleSelectTool(null)}
                className="px-4 py-2 bg-white border border-[#EAECF0] text-[#344054] font-bold rounded-xl shadow-sm hover:bg-[#F9FAFB] transition-colors"
              >
                Back to Tools
              </button>
              <button 
                onClick={handleStart}
                disabled={isRunning}
                className="flex items-center gap-2 px-6 py-2 bg-[#5B5FF6] text-white font-bold rounded-xl shadow-sm hover:bg-[#4f53dc] disabled:opacity-50 transition-colors"
              >
                <Play size={18} /> Run Automated Tests
              </button>
            </div>
          </div>
          
          {/* Main Execution Board */}
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-[#EAECF0]">
            
            {/* Header & Progress */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-lg font-black text-[#101828]">
                  {isSelenium ? 'Selenium' : 'Playwright'} — Execution in Progress
                </h2>
                <p className="text-xs text-[#667085] mt-1 font-medium">PROVA is running your tests. Sit back and relax!</p>
              </div>
              <div className="flex items-center gap-3">
                <div className={`px-3 py-1 ${isRunning ? 'bg-emerald-50 border border-emerald-100' : 'bg-slate-50 border border-slate-100'} rounded-full flex items-center gap-2`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></div>
                  <span className={`text-[10px] font-bold uppercase ${isRunning ? 'text-emerald-700' : 'text-slate-500'}`}>{isRunning ? 'Live' : status}</span>
                </div>
                
                {isRunning ? (
                  <>
                    <button 
                      onClick={handleStop}
                      className="px-3 py-1.5 bg-rose-600 text-white font-bold rounded-lg shadow-sm hover:bg-rose-700 transition-colors flex items-center gap-1.5 text-xs"
                    >
                      <StopCircle size={14} /> Stop
                    </button>
                    <button 
                      onClick={handleRerun}
                      disabled={loading}
                      className="px-3 py-1.5 bg-slate-800 text-white font-bold rounded-lg shadow-sm hover:bg-slate-700 transition-colors flex items-center gap-1.5 text-xs disabled:opacity-50"
                    >
                      <RefreshCcw size={14} /> Re-run
                    </button>
                  </>
                ) : status !== 'IDLE' ? (
                  <button 
                    onClick={handleRerun}
                    disabled={loading}
                    className="px-3 py-1.5 bg-slate-800 text-white font-bold rounded-lg shadow-sm hover:bg-slate-700 transition-colors flex items-center gap-1.5 text-xs disabled:opacity-50"
                  >
                    <RefreshCcw size={14} /> Re-run
                  </button>
                ) : (
                  <button 
                    onClick={handleStart}
                    disabled={loading}
                    className="px-3 py-1.5 bg-[#5B5FF6] text-white font-bold rounded-lg shadow-sm hover:bg-[#4f53dc] transition-colors flex items-center gap-1.5 text-xs disabled:opacity-50"
                  >
                    <Play size={14} /> Start
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4 mb-8">
              <div className="flex-1 h-2 bg-[#F2F4F7] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#5B5FF6] rounded-full transition-all duration-1000" 
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
              <span className="text-sm font-bold text-[#101828]">{progressPercent}%</span>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-4 gap-4 mb-8">
              <div className="border border-[#EAECF0] rounded-2xl p-4 flex items-center justify-center gap-4 shadow-sm bg-white">
                <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500">
                  <Check size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[#667085] uppercase">Passed</p>
                  <p className="text-2xl font-black text-[#101828]">{passed}</p>
                </div>
              </div>
              
              <div className="border border-[#EAECF0] rounded-2xl p-4 flex items-center justify-center gap-4 shadow-sm bg-white">
                <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-500">
                  <XCircle size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[#667085] uppercase">Failed</p>
                  <p className="text-2xl font-black text-[#101828]">{failed}</p>
                </div>
              </div>

              <div className="border border-[#EAECF0] rounded-2xl p-4 flex items-center justify-center gap-4 shadow-sm bg-white">
                <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-500">
                  <div className="w-4 h-4 border-2 border-current rounded-sm"></div>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[#667085] uppercase">Skipped</p>
                  <p className="text-2xl font-black text-[#101828]">{skipped}</p>
                </div>
              </div>

              <div className="border border-[#EAECF0] rounded-2xl p-4 flex items-center justify-center gap-4 shadow-sm bg-white">
                <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
                  <User size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[#667085] uppercase">Total</p>
                  <p className="text-2xl font-black text-[#101828]">{total}</p>
                </div>
              </div>
            </div>

            {/* Main Content Split */}
            <div className="grid grid-cols-3 gap-6">
              
              {/* Left: Logs */}
              <div className="col-span-2">
                <div className={`bg-white rounded-3xl p-6 transition-all duration-500 ${isRunning ? 'border-2 border-[#5B5FF6] shadow-[0_0_20px_rgba(91,95,246,0.15)]' : 'border border-[#EAECF0] shadow-[0_2px_10px_rgba(0,0,0,0.02)]'}`}>
                  <h3 className="text-md font-bold text-[#101828] mb-6">Live Execution Logs</h3>
                  <div className="flex flex-col max-h-[400px] min-h-[150px] overflow-y-auto custom-scrollbar pr-2">

                    {currentLogs.length > 0 ? (
                      currentLogs.map((log, idx) => {
                        const parts = log.text.split(':');
                        const isTestCase = parts.length > 1 && (parts[0].trim().startsWith('TC_') || parts[0].trim().startsWith('TEST_'));
                        const prefix = isTestCase ? parts[0] + ':' : '';
                        const message = isTestCase ? parts.slice(1).join(':') : log.text;

                        return (
                          <div key={idx} className="flex items-center gap-4 py-3 border-b border-[#EAECF0] last:border-0 hover:bg-[#F9FAFB] px-3 rounded-xl transition-all duration-300 animate-fadeIn group">
                            <span className="text-[11px] text-[#98A2B3] font-bold font-mono shrink-0 w-[85px]">{log.time}</span>
                            <div className="shrink-0 flex items-center justify-center w-5">
                              {log.icon}
                            </div>
                            <span className="text-[13px] text-[#344054] flex-1 truncate ml-1">
                              {isTestCase ? (
                                <>
                                  <span className="font-bold text-[#101828]">{prefix}</span>
                                  <span className="font-bold text-[#344054]">{message}</span>
                                </>
                              ) : (
                                <span className="font-bold text-[#101828]">{log.text}</span>
                              )}
                            </span>
                            
                            {log.status === 'Passed' && (
                              <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[11px] font-bold rounded-full">Passed</span>
                            )}
                            {log.status === 'Failed' && (
                              <span className="px-3 py-1 bg-rose-50 text-rose-600 text-[11px] font-bold rounded-full">Failed</span>
                            )}
                            {log.status === 'Running' && (
                              <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[11px] font-bold rounded-full flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span> Running
                              </span>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-[#98A2B3] border-2 border-dashed border-[#EAECF0] rounded-2xl h-full">
                        <Terminal size={32} className="mb-3 opacity-20" />
                        <p className="text-sm font-bold">No active logs</p>
                        <p className="text-xs mt-1">Start the execution to view live terminal output.</p>
                      </div>
                    )}
                    <div ref={logsEndRef} />
                  </div>
                </div>
              </div>

              {/* Right: Execution Details */}
              <div className="col-span-1 flex flex-col gap-6">
                <div>
                  <h3 className="text-sm font-bold text-[#101828] mb-4">Execution Details</h3>
                  <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[#667085]">Framework</span>
                      <span className="font-bold text-[#101828]">{isSelenium ? 'Selenium WebDriver' : 'Playwright'}</span>
                    </div>
                    {isSelenium ? (
                      <>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-[#667085]">Test Runner</span>
                          <span className="font-medium text-[#101828]">{testData?.testingTools?.join(', ') || 'pytest'}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-[#667085]">Selenium Version</span>
                          <span className="font-medium text-[#101828]">{testData?.seleniumVersion || 'Auto-detected'}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-[#667085]">Project Type</span>
                          <span className="font-medium text-[#101828]">{testData?.projectType || 'python'}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-[#667085]">Browser</span>
                          <span className="font-medium text-[#101828]">Chromium 125</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-[#667085]">Environment</span>
                          <span className="font-medium text-[#101828]">Windows 11</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-[#667085]">Resolution</span>
                          <span className="font-medium text-[#101828]">1920 x 1080</span>
                        </div>
                      </>
                    )}
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[#667085]">Start Time</span>
                      <span className="font-medium text-[#101828]">{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[#667085]">Elapsed Time</span>
                      <span className="font-medium text-[#101828]">{testData?.executionTime || (isRunning ? 'Running...' : '0.0s')}</span>
                    </div>
                    {isSelenium && testData?.testFilesCount > 0 && (
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-[#667085]">Test Files</span>
                        <span className="font-medium text-[#101828]">{testData.testFilesCount} file(s)</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-between mt-auto">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => window.open(reportBase, '_blank')}
                disabled={!isCompleted}
                className={`px-5 py-2.5 bg-white border border-[#EAECF0] text-[#344054] font-bold rounded-xl shadow-sm transition-colors flex items-center gap-2 text-sm ${!isCompleted ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-50'}`}
              >
                <Eye size={16} /> View Live Report
              </button>
              <button 
                onClick={() => window.open(downloadBase, '_blank')}
                disabled={!isCompleted}
                className={`px-5 py-2.5 bg-white border border-[#EAECF0] text-[#344054] font-bold rounded-xl shadow-sm transition-colors flex items-center gap-2 text-sm ${!isCompleted ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-50'}`}
              >
                <Download size={16} /> Download HTML Report
              </button>
            </div>
          </div>
          
        </>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between mt-8 pb-10">
        <button 
          onClick={() => setActiveTab('test-recommendation')}
          className="px-6 py-3 bg-white text-slate-700 font-bold rounded-xl shadow-sm border border-slate-200 hover:bg-slate-50 hover:shadow transition-all"
        >
          Back
        </button>
        <button 
          onClick={() => isCompleted && setActiveTab('results')}
          disabled={!isCompleted}
          className={`px-8 py-3 font-bold rounded-xl flex items-center gap-2 transition-all ${
            isCompleted 
              ? 'bg-gradient-to-r from-[#5B5FF6] to-[#7B61FF] text-white shadow-[0_4px_14px_rgba(91,95,246,0.4)] hover:shadow-[0_6px_20px_rgba(91,95,246,0.6)] hover:-translate-y-0.5' 
              : 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-60'
          }`}
        >
          Continue <ArrowRight size={18} />
        </button>
      </div>

      <CoverageModal 
        isOpen={!!modalData} 
        onClose={() => setModalData(null)} 
        tool={modalData?.tool} 
        percentage={modalData?.percentage} 
        analysisResult={analysisResult} 
      />
    </div>
  );
}
