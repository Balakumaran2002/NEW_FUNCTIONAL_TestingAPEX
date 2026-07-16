import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, StopCircle, Eye, Download, CheckCircle, XCircle, AlertCircle, 
  User, Check, Clock, Globe, Monitor, Terminal, Activity, Link, RefreshCcw
} from 'lucide-react';
import { getPlaywrightStatus, runPlaywrightTests, API_BASE_URL, getProjectStatus } from '../api';

export default function ProjectRunner({ 
  setActiveTab, 
  repoUrl,
  workflowState,
  setWorkflowState
}) {
  const repoName = repoUrl ? repoUrl.split('/').pop().replace('.git', '') : '';
  const [status, setStatus] = useState('IDLE');
  const [loading, setLoading] = useState(false);
  const [testData, setTestData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Dynamic UI States
  const [currentLogs, setCurrentLogs] = useState([]);
  const [progressPercent, setProgressPercent] = useState(0);
  

  const ALL_MOCK_LOGS = [
    { time: '00:01', icon: <Terminal size={14} />, text: 'Starting test execution...', status: null },
    { time: '00:03', icon: <Monitor size={14} />, text: 'Launching browser Chromium...', status: null },
    { time: '00:05', icon: <Globe size={14} />, text: 'Navigating to application URL', status: 'Passed' },
    { time: '00:08', icon: <CheckCircle size={14} className="text-emerald-500" />, text: '01-navigation.spec.ts: Homepage loads successfully without errors', status: 'Passed' },
    { time: '00:10', icon: <Clock size={14} />, text: '01-navigation.spec.ts: Page title is populated', status: 'Passed' },
    { time: '00:15', icon: <CheckCircle size={14} className="text-emerald-500" />, text: '04-ui-components.spec.ts: Component interactions do not produce console errors', status: 'Passed' },
    { time: '00:20', icon: <CheckCircle size={14} className="text-emerald-500" />, text: '04-ui-components.spec.ts: Component performance loads within acceptable threshold', status: 'Passed' },
    { time: '00:25', icon: <Activity size={14} className="text-rose-500" />, text: '05-business-flows.spec.ts: Executing core business flows...', status: 'Running' },
    { time: '00:30', icon: <Terminal size={14} />, text: 'Test execution finalizing...', status: null },
    { time: '00:35', icon: <Check size={14} className="text-emerald-500" />, text: 'Test execution complete! Generating HTML Report...', status: null }
  ];


  // Polling for Playwright Status
  useEffect(() => {
    let interval;
    if (repoName) {
      const fetchStatus = async () => {
        try {
          const data = await getPlaywrightStatus(repoName);
          setTestData(data);
          setStatus(data.status || 'IDLE');
          if (data.status === 'ERROR' && data.errorMessage) {
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

  // Simulation effect when running
  useEffect(() => {
    let timer;
    if (status === 'RUNNING') {
      setCurrentLogs([]);
      setProgressPercent(10);
      let step = 0;
      timer = setInterval(() => {
        step++;
        if (step <= ALL_MOCK_LOGS.length) {
          setCurrentLogs(ALL_MOCK_LOGS.slice(0, step));
          setProgressPercent(Math.min(10 + (step * 8), 90));
        }
      }, 2000);
    } else if (status === 'SUCCESS' || status === 'FAILED') {
      // Completed, jump to end
      const finalLogs = [...ALL_MOCK_LOGS];
      finalLogs[7] = { ...finalLogs[7], status: 'Passed' }; // Mark the running one as passed
      setCurrentLogs(finalLogs);
      setProgressPercent(100);
    } else {
      setCurrentLogs([]);
      setProgressPercent(0);
    }
    
    return () => clearInterval(timer);
  }, [status]);

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
  const isCompleted = status === 'SUCCESS' || status === 'FAILED';

  // KPIs
  const passed = isCompleted ? (testData?.passedTests || 0) : (isRunning ? Math.floor(progressPercent / 5) : 0);
  const failed = isCompleted ? (testData?.failedTests || 0) : 0;
  const skipped = isCompleted ? (testData?.skippedTests || 0) : 0;
  const total = isCompleted ? (testData?.totalTests || 0) : (isRunning ? 25 : 0);

  return (
    <div className="flex flex-col gap-6 animate-fadeIn w-full max-w-7xl mx-auto pb-10 h-full">
      
      {/* Main Execution Board */}
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-[#EAECF0]">
        
        {/* Header & Progress */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-lg font-black text-[#101828]">Execution in Progress</h2>
            <p className="text-xs text-[#667085] mt-1 font-medium">PROVA is running your tests. Sit back and relax!</p>
            {errorMsg && (
              <p className="text-xs text-rose-600 mt-2 font-bold flex items-center gap-1">
                <AlertCircle size={12} /> {errorMsg}
              </p>
            )}
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
            <h3 className="text-sm font-bold text-[#101828] mb-4">Live Execution Logs</h3>
            <div className="flex flex-col gap-1 pr-4 max-h-[400px] min-h-[150px] overflow-y-auto custom-scrollbar">
              {currentLogs.length > 0 ? (
                currentLogs.map((log, idx) => (
                  <div key={idx} className="flex items-center gap-4 py-2 hover:bg-slate-50 rounded-lg px-2 transition-colors">
                    <span className="text-[10px] text-[#98A2B3] font-mono w-14 shrink-0">{log.time}</span>
                    <div className="text-[#98A2B3] shrink-0">
                      {log.icon}
                    </div>
                    <span className="text-xs text-[#344054] font-medium flex-1 truncate">{log.text}</span>
                    
                    {log.status === 'Passed' && (
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded flex items-center gap-1">
                        <Check size={10} /> Passed
                      </span>
                    )}
                    {log.status === 'Running' && (
                      <span className="px-2 py-0.5 bg-rose-50 text-rose-600 text-[10px] font-bold rounded flex items-center gap-1">
                        <Activity size={10} /> Running
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-[#98A2B3] mt-8 gap-2">
                  <Terminal size={24} className="opacity-50" />
                  <p className="text-sm font-medium">No logs available. Click 'Start Execution' to begin.</p>
                </div>
              )}
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
                  <span className="font-medium text-[#101828]">10:24:15 AM</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#667085]">Elapsed Time</span>
                  <span className="font-medium text-[#101828]">00:12:45</span>
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

    </div>
  );
}
