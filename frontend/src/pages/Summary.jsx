import React, { useState, useEffect } from 'react';
import { 
  FileText, Download, CheckCircle, FileCode, Server, Play, FolderArchive, ArrowDownToLine, RefreshCw
} from 'lucide-react';
import { motion } from 'framer-motion';
import { 
  getPlaywrightStatus,
  getSeleniumStatus,
  getBrdDownloadUrl,
  getUiTestCasesDownloadUrl,
  getApiTestCasesDownloadUrl,
  getPlaywrightReportDownloadUrl,
  getSeleniumReportDownloadUrl,
  API_BASE_URL
} from '../api';


export default function Summary({ repoUrl, setActiveTab, workflowState }) {
  const repoName = repoUrl ? repoUrl.split('/').pop().replace('.git', '') : '';
  const selectedTool = workflowState?.selectedTool || 'playwright';
  const isSelenium = selectedTool === 'selenium';
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState(null);


  useEffect(() => {
    if (repoName) {
      const getStatus = isSelenium ? getSeleniumStatus : getPlaywrightStatus;
      const fetchStatus = async () => {
        try {
          const data = await getStatus(repoName);
          setTestResult(data);
        } catch (err) { console.error(err); }
      };
      fetchStatus();
      
      const intervalId = setInterval(fetchStatus, 3000);
      return () => clearInterval(intervalId);
    }
  }, [repoName, isSelenium]);

  const handleDownload = (type) => {
    if (!repoName) return;
    setLoading(true);
    let url = '';
    switch (type) {
      case 'brd':
        url = `${API_BASE_URL}/brd/download/${encodeURIComponent(repoName)}`;
        break;
      case 'report':
        url = isSelenium
          ? `${API_BASE_URL}/migration/${repoName}/selenium/report/download`
          : `${API_BASE_URL}/migration/${repoName}/playwright/report/download`;
        break;
      case 'selenium-report':
        url = `${API_BASE_URL}/migration/${repoName}/selenium/report/download`;
        break;
      case 'playwright-report':
        url = `${API_BASE_URL}/migration/${repoName}/playwright/report/download`;
        break;
      case 'api-tests':
        url = `${API_BASE_URL}/reports/api-test-cases/download/${encodeURIComponent(repoName)}`;
        break;
      case 'ui-tests':
        url = `${API_BASE_URL}/reports/ui-functional-test/download/${encodeURIComponent(repoName)}`;
        break;
      default:
        break;
    }
    
    if (url) {
      window.open(url, '_blank');
    }
    setTimeout(() => setLoading(false), 1000);
  };

  const passedTests = testResult?.passedTests || 0;
  const failedTests = testResult?.failedTests || 0;
  const totalTests = testResult?.totalTests || (passedTests + failedTests);
  const successRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;
  const toolLabel = isSelenium ? 'Selenium' : 'Playwright';

  return (
    <div className="flex flex-col gap-6 animate-fadeIn w-full pb-10">
      
      {/* Top Section: Metrics Overview */}
      <div className="mb-2">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-2xl p-6 border border-[#EAECF0] flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-[#5B5FF6]">
                <FolderArchive size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-[#667085] mb-1">Total Test Cases</p>
                <p className="text-2xl font-black text-[#101828]">{totalTests}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl p-6 border border-[#EAECF0] flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500">
                <CheckCircle size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-[#667085] mb-1">Passed</p>
                <p className="text-2xl font-black text-[#101828]">{passedTests}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl p-6 border border-[#EAECF0] flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-500">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
              </div>
              <div>
                <p className="text-xs font-bold text-[#667085] mb-1">Failed</p>
                <p className="text-2xl font-black text-[#101828]">{failedTests}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl p-6 border border-[#EAECF0] flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-500">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
              </div>
              <div>
                <p className="text-xs font-bold text-[#667085] mb-1">Success Rate</p>
                <p className="text-2xl font-black text-[#101828]">{successRate}%</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Report Downloads */}
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-[#EAECF0]">
        <h2 className="text-lg font-bold text-[#101828] mb-8 flex items-center gap-2">
          <Download size={20} className="text-[#5B5FF6]" /> Report Downloads
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* BRD Report */}
          <div className="border border-[#EAECF0] rounded-2xl p-6 bg-white hover:border-[#5B5FF6] hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-6">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-[#98A2B3]">
                  <FileText size={20} />
                </div>
                <button 
                  onClick={() => handleDownload('brd')}
                  className="flex items-center justify-center w-8 h-8 bg-indigo-50 text-[#5B5FF6] rounded-lg hover:bg-indigo-100 transition-colors"
                >
                  <Download size={18} />
                </button>
              </div>
              <h3 className="text-sm font-bold text-[#101828] mb-2">BRD Report</h3>
              <p className="text-xs text-[#667085] leading-relaxed">
                Business Requirements Document generated during the Discovery phase outlining project scope and specifications.
              </p>
            </div>
          </div>

          {/* UI Test Cases Summary */}
          <div className="border border-[#EAECF0] rounded-2xl p-6 bg-white hover:border-[#5B5FF6] hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-6">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-[#98A2B3]">
                  <FileText size={20} />
                </div>
                <button 
                  onClick={() => handleDownload('ui-tests')}
                  className="flex items-center justify-center w-8 h-8 bg-indigo-50 text-[#5B5FF6] rounded-lg hover:bg-indigo-100 transition-colors"
                >
                  <Download size={18} />
                </button>
              </div>
              <h3 className="text-sm font-bold text-[#101828] mb-2">UI Test Cases Summary</h3>
              <p className="text-xs text-[#667085] leading-relaxed">
                Comprehensive listing of all generated UI test cases in PDF or ZIP format.
              </p>
            </div>
          </div>

          {/* API Test Cases Summary */}
          <div className="border border-[#EAECF0] rounded-2xl p-6 bg-white hover:border-[#5B5FF6] hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-6">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-[#98A2B3]">
                  <FileText size={20} />
                </div>
                <button 
                  onClick={() => handleDownload('api-tests')}
                  className="flex items-center justify-center w-8 h-8 bg-indigo-50 text-[#5B5FF6] rounded-lg hover:bg-indigo-100 transition-colors"
                >
                  <Download size={18} />
                </button>
              </div>
              <h3 className="text-sm font-bold text-[#101828] mb-2">API Test Cases Summary</h3>
              <p className="text-xs text-[#667085] leading-relaxed">
                Comprehensive listing of all generated API test cases in PDF or ZIP format.
              </p>
            </div>
          </div>


          {/* Primary Tool Execution Report (Playwright or Selenium based on selection) */}
          <div className={`border border-[#EAECF0] rounded-2xl p-6 bg-white flex flex-col justify-between ${isSelenium ? 'opacity-60 blur-[0.5px] select-none pointer-events-none grayscale' : 'hover:border-[#5B5FF6] hover:shadow-md transition-all'}`}>
            <div>
              <div className="flex justify-between items-start mb-6">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-[#98A2B3]">
                  <FileText size={20} />
                </div>
                <button 
                  onClick={() => handleDownload('report')}
                  className="flex items-center justify-center w-8 h-8 bg-indigo-50 text-[#5B5FF6] rounded-lg hover:bg-indigo-100 transition-colors"
                >
                  <Download size={18} />
                </button>
              </div>
              <h3 className="text-sm font-bold text-[#101828] mb-2">{toolLabel} Execution Report</h3>
              <p className="text-xs text-[#667085] leading-relaxed">
                {isSelenium
                  ? 'Detailed HTML report containing logs, pass/fail results, and screenshots of Selenium UI test executions.'
                  : 'Detailed HTML report containing traces, screenshots, and videos of UI test executions.'}
              </p>
            </div>
          </div>

          {/* Secondary Tool Execution Report — always available */}
          <div className={`border border-[#EAECF0] rounded-2xl p-6 bg-white flex flex-col justify-between ${!isSelenium ? 'opacity-60 blur-[0.5px] select-none pointer-events-none grayscale' : 'hover:border-amber-400 hover:shadow-md transition-all'}`}>
            <div>
              <div className="flex justify-between items-start mb-6">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500">
                  <FileText size={20} />
                </div>
                <button 
                  onClick={() => handleDownload(isSelenium ? 'playwright-report' : 'selenium-report')}
                  className="flex items-center justify-center w-8 h-8 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors"
                >
                  <Download size={18} />
                </button>
              </div>
              <h3 className="text-sm font-bold text-[#101828] mb-2">
                {isSelenium ? 'Playwright' : 'Selenium'} Execution Report
              </h3>
              <p className="text-xs text-[#667085] leading-relaxed">
                {isSelenium
                  ? 'Alternative Playwright HTML report with traces, screenshots, and video of UI test executions.'
                  : 'Detailed HTML report containing logs and pass/fail results of Selenium UI test executions.'}
              </p>
            </div>
          </div>


        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-start mt-8 pb-10 pl-2">
        <button 
          onClick={() => setActiveTab('results')}
          className="px-6 py-3 bg-white text-slate-700 font-bold rounded-xl shadow-sm border border-slate-200 hover:bg-slate-50 hover:shadow transition-all"
        >
          Back
        </button>
      </div>

    </div>
  );
}
