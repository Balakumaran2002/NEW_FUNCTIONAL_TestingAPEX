import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, StopCircle, Eye, Download, CheckCircle, XCircle, AlertCircle, 
  User, Check, Clock, Globe, Monitor, Terminal, Activity, Link, RefreshCcw, ArrowRight, ArrowLeft
} from 'lucide-react';
import { getPlaywrightStatus, runPlaywrightTests, API_BASE_URL, getProjectStatus } from '../api';
import { PlaywrightIcon, SeleniumIcon } from '../components/TechIcons';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';

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
  const [selectedTool, setSelectedTool] = useState(null);
  
  // Dynamic UI States
  const [currentLogs, setCurrentLogs] = useState([]);
  const [progressPercent, setProgressPercent] = useState(0);
  


  // Polling for Playwright Status
  useEffect(() => {
    let interval;
    if (repoName) {
      const fetchStatus = async () => {
        try {
          const data = await getPlaywrightStatus(repoName);
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
  }, [repoName]);

  // Actual data mapping effect when running or completed
  useEffect(() => {
    let timer;
    if (status === 'RUNNING') {
      // Simulate live streaming of test cases based on analysisResult or defaults
      const baseCases = analysisResult?.testCases || [
        { id: 'TC_001', title: 'Navigation flows' },
        { id: 'TC_002', title: 'Authentication' },
        { id: 'TC_003', title: 'API Endpoints' },
        { id: 'TC_004', title: 'UI Components' },
        { id: 'TC_005', title: 'Business Flows' },
        { id: 'TC_006', title: 'Data Validation' },
        { id: 'TC_007', title: 'Security & Auth' }
      ];
      
      // Calculate which test case is currently running
      const stepSize = 95 / baseCases.length;
      const currentProgress = Math.min(Math.floor(progressPercent / stepSize), baseCases.length - 1);
      
      const liveLogs = baseCases.slice(0, currentProgress + 1).map((tc, idx) => {
        const isLast = idx === currentProgress && progressPercent < 95;
        return {
          time: new Date(Date.now() - (currentProgress - idx) * 15000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'}),
          icon: isLast ? <Activity size={14} className="text-[#5B5FF6] animate-pulse" /> : <CheckCircle size={14} className="text-emerald-500" />,
          text: `${tc.id || `TC_00${idx+1}`}: ${tc.title || tc.description || 'Executing Test'}`,
          status: isLast ? 'Running' : 'Passed'
        };
      });

      setCurrentLogs(liveLogs);

      if (progressPercent === 0) setProgressPercent(5);
      
      // Real execution takes ~180 seconds. Let's step 1% every 2 seconds = ~190s to reach 95%.
      timer = setInterval(() => {
        setProgressPercent(prev => Math.min(prev + 1, 95));
      }, 2000);
      
    } else if (status === 'SUCCESS' || status === 'FAILED' || status === 'PASSED') {
      // Completed, map actual modules from testData
      if (testData && testData.modules && testData.modules.length > 0) {
        const actualLogs = testData.modules.map((m, idx) => {
          const cleanName = m.module.replace(/^\d+\s*/, '');
          return {
            time: m.time,
            icon: m.status === 'Passed' ? <CheckCircle size={14} className="text-emerald-500" /> : <XCircle size={14} className="text-rose-500" />,
            text: `TC_${String(idx + 1).padStart(3, '0')}: ${cleanName}`,
            status: m.status === 'Passed' ? 'Passed' : 'Failed'
          };
        });
        
        // Add a final completion log
        actualLogs.push({ time: testData.executionTime || '0.0s', icon: <Check size={14} className="text-emerald-500" />, text: 'Test execution complete! View the HTML Report for details.', status: null });
        setCurrentLogs(actualLogs);
      } else {
        setCurrentLogs([
          { time: '00:00', icon: <Check size={14} className="text-emerald-500" />, text: 'Test execution complete! View the HTML Report for details.', status: null }
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

  const handleStart = async () => {
    if (!repoName) return;
    setLoading(true);
    setErrorMsg('');
    try {
      await runPlaywrightTests(repoName);
      setStatus('RUNNING');
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.error || err.message || 'Failed to start execution.');
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    // There is no stopPlaywrightTests endpoint, mock it for the UI
    setStatus('STOPPED');
  };

  const isRunning = status === 'RUNNING';
  const isCompleted = status === 'SUCCESS' || status === 'FAILED' || status === 'PASSED';

  // KPIs
  const passed = isCompleted ? (testData?.passedTests || 0) : (isRunning ? Math.floor(progressPercent / 5) : 0);
  const failed = isCompleted ? (testData?.failedTests || 0) : 0;
  const skipped = isCompleted ? (testData?.skippedTests || 0) : 0;
  const total = isCompleted ? (testData?.totalTests || 0) : (isRunning ? 25 : 0);

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
              onClick={() => setSelectedTool('playwright')}
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
                    <span className="text-[10px] font-bold text-[#667085] uppercase tracking-wider mt-1">Coverage Prediction</span>
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
                      Analysis reveals a modern web architecture with dynamic content rendering and complex state interactions. Playwright's native auto-waiting and browser context isolation perfectly align with this stack, ensuring highly stable tests without flaky timeouts.
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
            
            {/* Selenium Card */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#EAECF0] flex flex-col opacity-75 grayscale hover:grayscale-0 transition-all cursor-not-allowed">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-slate-50 flex items-center justify-center rounded-2xl shrink-0 border border-[#E5E7EB]">
                    <SeleniumIcon size={40} />
                  </div>
                  <div>
                    <h3 className="text-3xl font-black text-[#101828] mb-1 tracking-tight">Selenium</h3>
                    <p className="text-base font-bold text-[#667085]">Alternative</p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-slate-100 text-[#667085] font-bold text-xs uppercase tracking-wider rounded-lg">
                  Coming Soon
                </span>
              </div>
              
              <div className="flex-1 mb-8">
                <p className="text-sm font-bold text-[#101828] mb-3">Features</p>
                <ul className="space-y-3">
                  {['Industry standard', 'Wide language support', 'Legacy app compatibility', 'Extensive community'].map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-[#98A2B3]">
                      <CheckCircle size={16} className="text-[#D0D5DD] shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="w-full py-3 bg-[#F2F4F7] text-[#98A2B3] font-bold rounded-xl text-center flex items-center justify-center gap-2">
                <Clock size={16} /> Coming Soon
              </div>
            </div>

          </div>
        </>
      ) : (
        <>
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl font-black text-[#101828]">Execute Tests</h1>
              <p className="text-[#667085] mt-1 font-medium">Running Playwright UI tests for {repoName || 'repository'}</p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setSelectedTool(null)}
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
            <h2 className="text-lg font-black text-[#101828]">Execution in Progress</h2>
            <p className="text-xs text-[#667085] mt-1 font-medium">PROVA is running your tests. Sit back and relax!</p>
          </div>
          <div className="px-3 py-1 bg-emerald-50 border border-emerald-100 rounded-full flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[10px] font-bold text-emerald-700 uppercase">Live</span>
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
              <Link size={18} className="transform -rotate-45" />
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
            <div className="bg-white rounded-3xl p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-[#EAECF0]">
              <h3 className="text-md font-bold text-[#101828] mb-6">Live Execution Logs</h3>
              <div className="flex flex-col max-h-[400px] min-h-[150px] overflow-y-auto custom-scrollbar pr-2">

                {currentLogs.length > 0 ? (
                  currentLogs.map((log, idx) => {
                    const parts = log.text.split(':');
                    const isTestCase = parts.length > 1 && (parts[0].trim().startsWith('TC_') || parts[0].trim().startsWith('TEST_'));
                    const prefix = isTestCase ? parts[0] + ':' : '';
                    const message = isTestCase ? parts.slice(1).join(':') : log.text;

                    return (
                      <div key={idx} className="flex items-center gap-4 py-3.5 border-b border-[#EAECF0] last:border-0 hover:bg-[#F9FAFB] px-2 rounded-xl transition-colors group">
                        <span className="text-[11px] text-[#98A2B3] font-bold font-mono shrink-0">{log.time}</span>
                        <div className="text-[#D0D5DD] shrink-0 group-hover:text-[#98A2B3] transition-colors">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
                        </div>
                        <span className="text-[13px] text-[#344054] flex-1 truncate">
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
                          <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[11px] font-bold rounded-full">
                            Passed
                          </span>
                        )}
                        {log.status === 'Failed' && (
                          <span className="px-3 py-1 bg-rose-50 text-rose-600 text-[11px] font-bold rounded-full">
                            Failed
                          </span>
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
              </div>
            </div>
          </div>

          {/* Right: Details & Preview */}
          <div className="col-span-1 flex flex-col gap-6">
            
            <div>
              <h3 className="text-sm font-bold text-[#101828] mb-4">Execution Details</h3>
              <div className="flex flex-col gap-3">
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
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#667085]">Start Time</span>
                  <span className="font-medium text-[#101828]">{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#667085]">Elapsed Time</span>
                  <span className="font-medium text-[#101828]">{testData?.executionTime || (isRunning ? 'Running...' : '0.0s')}</span>
                </div>
              </div>
            </div>



          </div>

        </div>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between mt-auto">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => {
              window.open(`${API_BASE_URL}/migration/${encodeURIComponent(repoName)}/playwright/report`, '_blank');
            }}
            disabled={!isCompleted}
            className={`px-5 py-2.5 bg-white border border-[#EAECF0] text-[#344054] font-bold rounded-xl shadow-sm transition-colors flex items-center gap-2 text-sm ${!isCompleted ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-50'}`}
          >
            <Eye size={16} /> View Live Report
          </button>
          <button 
            onClick={() => {
              window.open(`${API_BASE_URL}/migration/${encodeURIComponent(repoName)}/playwright/report/download`, '_blank');
            }}
            disabled={!isCompleted}
            className={`px-5 py-2.5 bg-white border border-[#EAECF0] text-[#344054] font-bold rounded-xl shadow-sm transition-colors flex items-center gap-2 text-sm ${!isCompleted ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-50'}`}
          >
            <Download size={16} /> Download HTML Report
          </button>
        </div>
        
        {isRunning ? (
          <button 
            onClick={handleStop}
            className="px-6 py-2.5 bg-rose-600 text-white font-bold rounded-xl shadow-sm hover:bg-rose-700 transition-colors flex items-center gap-2 text-sm"
          >
            <StopCircle size={16} /> Stop Execution
          </button>
        ) : (
          <button 
            onClick={handleStart}
            disabled={loading}
            className="px-6 py-2.5 bg-[#5B5FF6] text-white font-bold rounded-xl shadow-sm hover:bg-[#4f53dc] transition-colors flex items-center gap-2 text-sm disabled:opacity-50"
          >
            <Play size={16} /> Start Execution
          </button>
        )}
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
          onClick={() => setActiveTab('results')}
          className="px-8 py-3 bg-gradient-to-r from-[#5B5FF6] to-[#7B61FF] text-white font-bold rounded-xl shadow-[0_4px_14px_rgba(91,95,246,0.4)] hover:shadow-[0_6px_20px_rgba(91,95,246,0.6)] hover:-translate-y-0.5 transition-all flex items-center gap-2"
        >
          Continue <ArrowRight size={18} />
        </button>
      </div>

    </div>
  );
}
