import React, { useState, useEffect, useRef } from 'react';
import { 
  API_BASE_URL,
  migrateRepository, getMigrationStatus, startProject, stopProject, getProjectStatus, 
  runPlaywrightTests, getPlaywrightStatus, getPlaywrightReportUrl,
  runSeleniumTests, getSeleniumStatus, getSeleniumReportUrl 
} from '../api';

import ProjectRunnerDashboard from '../components/MigrationCenter/ProjectRunnerDashboard';
import LogConsole from '../components/MigrationCenter/LogConsole';
import LiveApplicationReview from '../components/MigrationCenter/LiveApplicationReview';
import TestSummary from '../components/TestSummary';

export default function MigrationCenter({ 
  setActiveTab, 
  analysisResult,
  repoUrl,
  setRepoUrl,
  targetVersion,
  setTargetVersion,
  loading,
  setLoading,
  result,
  setResult,
  error,
  setError,
  statusText,
  setStatusText,
  history,
  setHistory,
  elapsedTime,
  timeTaken,
  setTimeTaken
}) {
  const repoName = repoUrl ? repoUrl.split('/').pop().replace('.git', '') : '';

  const [runnerStatus, setRunnerStatus] = useState('IDLE');
  const [runnerPort, setRunnerPort] = useState(null);
  const [runnerType, setRunnerType] = useState(null);
  const [runnerPreviewUrl, setRunnerPreviewUrl] = useState(null);
  const [runnerEndpoints, setRunnerEndpoints] = useState([]);
  const [runnerErrorReason, setRunnerErrorReason] = useState(null);
  const [runnerNoUiMessage, setRunnerNoUiMessage] = useState(null);
  const [runnerSwaggerUrl, setRunnerSwaggerUrl] = useState(null);
  const [iframeKey, setIframeKey] = useState(0);
  const [runnerLogs, setRunnerLogs] = useState('');
  const [runnerLoading, setRunnerLoading] = useState(false);
  const [activePreviewTab, setActivePreviewTab] = useState('logs');
  const [copiedPath, setCopiedPath] = useState(null);

  // Testing state
  const [testFramework, setTestFramework] = useState('playwright');
  const [testViewActive, setTestViewActive] = useState(false);
  
  const [playwrightResult, setPlaywrightResult] = useState(null);
  const [playwrightLoading, setPlaywrightLoading] = useState(false);
  
  const [seleniumResult, setSeleniumResult] = useState(null);
  const [seleniumLoading, setSeleniumLoading] = useState(false);

  // SECTION REFS
  const historyRef = useRef(null);
  const buildRef = useRef(null);
  const auditRef = useRef(null);
  const llmRef = useRef(null);

  const scrollToSection = (ref) => {
    if (ref && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const getPreviewSrc = (previewUrl) => {
    if (!previewUrl) return null;
    try {
      const parsed = new URL(previewUrl, window.location.origin);
      if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
        return parsed.pathname + parsed.search + parsed.hash;
      }
    } catch (e) {
      if (previewUrl.startsWith('/')) {
        return previewUrl;
      }
    }
    return previewUrl;
  };

  const previewSrc = getPreviewSrc(runnerPreviewUrl);
  const previewBaseUrl = previewSrc || (runnerPort ? `http://localhost:${runnerPort}` : '');

  const setupLogsWebSocket = () => {
    if (!repoName) return;
    const apiBase = API_BASE_URL;
    let wsUrl;
    if (apiBase.startsWith('http://') || apiBase.startsWith('https://')) {
      const wsScheme = apiBase.startsWith('https') ? 'wss:' : 'ws:';
      const urlObj = new URL(apiBase);
      wsUrl = `${wsScheme}//${urlObj.host}${urlObj.pathname}/ws/run/logs/${repoName}`;
    } else {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      wsUrl = `${protocol}//${window.location.host}${apiBase}/ws/run/logs/${repoName}`;
    }
    const ws = new WebSocket(wsUrl);
    
    ws.onmessage = (event) => {
      setRunnerLogs(prev => prev + event.data);
      const consoleElem = document.getElementById('runner-console');
      if (consoleElem) {
        consoleElem.scrollTop = consoleElem.scrollHeight;
      }
    };
    
    ws.onerror = (err) => {
      console.error("Runner WebSocket error:", err);
    };
    
    return ws;
  };

  const startRunnerPolling = () => {
    if (!repoName) return;
    
    const interval = setInterval(async () => {
      try {
        const data = await getProjectStatus(repoName);
        setRunnerStatus(data.status);
        setRunnerPort(data.port);
        setRunnerType(data.projectType);
        setRunnerPreviewUrl(data.previewUrl);
        setRunnerEndpoints(data.endpoints || []);
        setRunnerErrorReason(data.errorReason);
        setRunnerNoUiMessage(data.noUiMessage || null);
        setRunnerSwaggerUrl(data.swaggerUrl || null);
        
        if (data.status === 'RUNNING' || data.status === 'RUNNING_API') {
          setActivePreviewTab('preview');
        }
        
        if (data.status !== 'STARTING') {
          clearInterval(interval);
        }
      } catch (err) {
        console.error("Error polling project runner:", err);
        clearInterval(interval);
      }
    }, 2000);
    
    return () => clearInterval(interval);
  };

  useEffect(() => {
    let cleanupPoll = () => {};
    if (repoName && result && result.buildStatus === 'Build Success') {
      const checkInitialStatus = async () => {
        try {
          const data = await getProjectStatus(repoName);
          setRunnerStatus(data.status);
          setRunnerPort(data.port);
          setRunnerType(data.projectType);
          setRunnerPreviewUrl(data.previewUrl);
          setRunnerEndpoints(data.endpoints || []);
          setRunnerErrorReason(data.errorReason);
          setRunnerNoUiMessage(data.noUiMessage || null);
          setRunnerSwaggerUrl(data.swaggerUrl || null);
          
          if (data.status === 'STARTING') {
            setupLogsWebSocket();
            cleanupPoll = startRunnerPolling();
          } else if (data.status === 'RUNNING' || data.status === 'RUNNING_API') {
            setupLogsWebSocket();
            setActivePreviewTab('preview');
          }
        } catch (err) {
          console.error(err);
        }
      };
      checkInitialStatus();
    }
    return () => cleanupPoll();
  }, [repoName, result]);

  // Fetch Playwright & Selenium status on load if result exists
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

  const handleRunTest = async () => {
    if (!repoName) return;
    setTestViewActive(true);

    if (testFramework === 'playwright') {
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
    } else {
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
    }
  };

  const handleStartProject = async () => {
    if (!repoName) return;
    setTestViewActive(false);
    setRunnerLoading(true);
    setRunnerLogs('Starting application...\n');
    setRunnerErrorReason(null);
    setActivePreviewTab('logs');
    try {
      const data = await startProject(repoName);
      setRunnerStatus(data.status);
      setRunnerPort(data.port);
      setRunnerType(data.projectType);
      setupLogsWebSocket();
      startRunnerPolling();
    } catch (err) {
      console.error(err);
      setRunnerStatus('FAILED');
      setRunnerErrorReason(err.message || 'Failed to start the application server.');
    } finally {
      setRunnerLoading(false);
    }
  };

  const handleStopProject = async () => {
    if (!repoName) return;
    setRunnerLoading(true);
    try {
      await stopProject(repoName);
      setRunnerStatus('STOPPED');
      setRunnerPreviewUrl(null);
      setRunnerEndpoints([]);
    } catch (err) {
      console.error(err);
    } finally {
      setRunnerLoading(false);
    }
  };

  const handleRestartProject = async () => {
    if (!repoName) return;
    setRunnerLoading(true);
    setRunnerLogs('Restarting application...\n');
    setRunnerErrorReason(null);
    setIframeKey(prev => prev + 1);
    try {
      await stopProject(repoName);
      const data = await startProject(repoName);
      setRunnerStatus(data.status);
      setRunnerPort(data.port);
      setRunnerType(data.projectType);
      setupLogsWebSocket();
      startRunnerPolling();
    } catch (err) {
      setRunnerErrorReason(err.response?.data?.detail || err.message || 'Unknown error');
      setRunnerStatus('FAILED');
    } finally {
      setRunnerLoading(false);
    }
  };

  const handleRefreshPreview = () => {
    setIframeKey(prev => prev + 1);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedPath(text);
    setTimeout(() => setCopiedPath(null), 2000);
  };

  const handleMigrate = async (e) => {
    e.preventDefault();
    if (!repoUrl) {
      setError("Please perform Repository Analysis first to load a repository.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setTimeTaken(null);
    setStatusText('Queuing migration task...');

    const startTime = Date.now();

    try {
      const taskData = await migrateRepository(repoUrl, targetVersion);
      const taskId = taskData.task_id;

      setStatusText('Migration task is running in the background...');

      const pollStatus = async () => {
        try {
          const statusData = await getMigrationStatus(taskId);
          
          if (statusData.status === 'SUCCESS') {
            const data = statusData.result;
            const endTime = Date.now();
            const duration = ((endTime - startTime) / 1000).toFixed(1);

            if (data.errorMessage) {
              setError(data.errorMessage);
            } else {
              setResult(data);
              setTimeTaken(duration);
              localStorage.setItem('last_migration_time', JSON.stringify(duration));
              localStorage.setItem('last_migration', JSON.stringify(data));

              setPlaywrightResult(null);
              const repoNameForPw = repoUrl.split('/').pop().replace('.git', '');
              try {
                setPlaywrightLoading(true);
                const pwRunResult = await runPlaywrightTests(repoNameForPw);
                setPlaywrightResult(pwRunResult);
                if (pwRunResult.status === 'RUNNING') {
                  const pollPw = setInterval(async () => {
                    try {
                      const polled = await getPlaywrightStatus(repoNameForPw);
                      setPlaywrightResult(polled);
                      if (polled.status !== 'RUNNING') {
                        clearInterval(pollPw);
                        setPlaywrightLoading(false);
                      }
                    } catch (_) { clearInterval(pollPw); setPlaywrightLoading(false); }
                  }, 3000);
                } else {
                  setPlaywrightLoading(false);
                }
              } catch (_) {
                setPlaywrightLoading(false);
              }

              const historyEntry = {
                id: Date.now(),
                repoUrl,
                targetVersion: data.targetVersion,
                success: data.success,
                buildStatus: data.buildStatus,
                modifiedFiles: data.modifiedFiles?.length || 0,
                timestamp: new Date().toLocaleString(),
              };
              const updatedHistory = [historyEntry, ...history].slice(0, 20);
              setHistory(updatedHistory);
              localStorage.setItem('migration_history', JSON.stringify(updatedHistory));
              
              const stats = JSON.parse(localStorage.getItem('assistant_stats') || '{"reposAnalyzed":0,"migrationsRun":0,"filesConverted":0}');
              stats.migrationsRun += 1;
              localStorage.setItem('assistant_stats', JSON.stringify(stats));
            }
            setLoading(false);
          } else if (statusData.status === 'FAILURE') {
            setError(statusData.error || 'Migration task failed in the background queue.');
            setLoading(false);
          } else {
            setTimeout(pollStatus, 3000);
          }
        } catch (err) {
          setError(err.response?.data?.message || err.message || 'Error polling migration status.');
          setLoading(false);
        }
      };

      setTimeout(pollStatus, 3000);

    } catch (err) {
      setError(err.response?.data?.message || err.message || 'An error occurred during repository migration queueing.');
      setLoading(false);
    }
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('migration_history');
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Project Runner Dashboard section */}
      <ProjectRunnerDashboard
        runnerStatus={runnerStatus}
        runnerPort={runnerPort}
        runnerType={runnerType}
        handleStartProject={handleStartProject}
        handleStopProject={handleStopProject}
        handleRestartProject={handleRestartProject}
        runnerLoading={runnerLoading}
        testFramework={testFramework}
        setTestFramework={setTestFramework}
        handleRunTest={handleRunTest}
        testLoading={testFramework === 'playwright' ? playwrightLoading : seleniumLoading}
        testStatus={testFramework === 'playwright' ? playwrightResult?.status : seleniumResult?.status}
        setTestViewActive={setTestViewActive}
      />

      {/* Main View Area */}
      <div className={`grid gap-4 h-[600px] mb-8 ${testViewActive ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
        {testViewActive ? (
          <div className="flex flex-col h-full gap-4">
            <TestSummary
              framework={testFramework}
              status={testFramework === 'playwright' ? playwrightResult : seleniumResult}
              loading={testFramework === 'playwright' ? playwrightLoading : seleniumLoading}
              onRun={handleRunTest}
              onViewReport={() => window.open(testFramework === 'playwright' ? getPlaywrightReportUrl(repoName) : getSeleniumReportUrl(repoName), '_blank')}
              onDownloadReport={() => window.open(`/api/migration/${repoName}/${testFramework}/report/download`, '_blank')}
            />
            {/* Embedded HTML Report if available */}
            {((testFramework === 'playwright' && playwrightResult?.htmlReportUrl) || 
              (testFramework === 'selenium' && seleniumResult?.htmlReportUrl)) && (
              <div className="flex-grow border border-slate-200/40 dark:border-dark-900/40 rounded-2xl overflow-hidden bg-white dark:bg-dark-950 shadow-sm relative">
                <iframe
                  src={testFramework === 'playwright' ? getPlaywrightReportUrl(repoName) : getSeleniumReportUrl(repoName)}
                  className="w-full h-full border-none"
                  title={`${testFramework} Report`}
                />
              </div>
            )}
          </div>
        ) : (
          <>
            <LogConsole
              runnerLogs={runnerLogs}
              setRunnerLogs={setRunnerLogs}
              copiedPath={copiedPath}
              copyToClipboard={copyToClipboard}
            />
            
            <LiveApplicationReview
              runnerStatus={runnerStatus}
              runnerPreviewUrl={runnerPreviewUrl}
              handleRefreshPreview={handleRefreshPreview}
              iframeKey={iframeKey}
              repoName={repoName}
              runnerErrorReason={runnerErrorReason}
              runnerPort={runnerPort}
              runnerNoUiMessage={runnerNoUiMessage}
              runnerSwaggerUrl={runnerSwaggerUrl}
              runnerEndpoints={runnerEndpoints}
              copyToClipboard={copyToClipboard}
              copiedPath={copiedPath}
              previewBaseUrl={previewBaseUrl}
              previewSrc={previewSrc}
            />
          </>
        )}
      </div>

    </div>
  );
}
