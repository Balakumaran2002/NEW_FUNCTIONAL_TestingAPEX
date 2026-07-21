import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, Activity, FileText, Download, BarChart2, CheckCircle2, XCircle, ArrowRight
} from 'lucide-react';
import { API_BASE_URL, getPlaywrightStatus, getSeleniumStatus, formatNgrokUrl } from '../api';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';

export default function FunctionalTesting({ setActiveTab, repoUrl, result, workflowState }) {
  const repoName = repoUrl ? repoUrl.split('/').pop().replace('.git', '') : '';
  const selectedTool = workflowState?.selectedTool || 'playwright';
  const isSelenium = selectedTool === 'selenium';
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
      const interval = setInterval(fetchStatus, 3000);
      return () => clearInterval(interval);
    }
  }, [repoName, isSelenium]);

  // Dynamic data from backend
  const passedTests = testResult?.passedTests || 0;
  const failedTests = testResult?.failedTests || 0;
  const totalTests = testResult?.totalTests || (passedTests + failedTests);
  const passRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;
  
  const testResults = testResult?.modules || [];
  const toolLabel = isSelenium ? 'Selenium' : 'Playwright';

  return (
    <div className="flex flex-col gap-6 animate-fadeIn w-full pb-10 h-full">
      
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#101828] flex items-center gap-3">
            <span className="p-2 bg-indigo-50 text-[#5B5FF6] rounded-xl"><CheckCircle size={24} /></span>
            {toolLabel} UI Functional Testing Results
          </h1>
          <p className="text-[#667085] mt-2 font-medium">Test execution completed for {repoName || 'repository'} using {toolLabel}</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              if (testResult?.htmlReportUrl) {
                window.open(formatNgrokUrl(`${API_BASE_URL}${testResult.htmlReportUrl}`), '_blank');
              } else {
                alert("HTML Report not available yet. Run tests first.");
              }
            }}
            className="px-6 py-3 bg-white border border-[#EAECF0] text-[#344054] font-bold rounded-xl shadow-sm hover:bg-[#F9FAFB] transition-colors flex items-center gap-2"
          >
            <FileText size={18} /> View Raw HTML Report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Pass vs Fail Donut Chart */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-[#EAECF0] flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500/5 to-transparent rounded-bl-full -z-0"></div>
          
          <h2 className="text-md font-bold text-[#101828] mb-6 self-start w-full text-left relative z-10">Pass vs Fail Rate</h2>
          <div className="relative w-44 h-44 mb-8 z-10 drop-shadow-md">
            <CircularProgressbar
              value={passRate}
              strokeWidth={14}
              styles={buildStyles({
                pathColor: '#12B76A',
                trailColor: '#F04438',
                strokeLinecap: 'round',
              })}
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-black text-[#101828]">{passRate}%</span>
              <span className="text-[10px] font-bold text-[#667085] uppercase tracking-wider mt-1">Pass Rate</span>
            </div>
          </div>
          <div className="flex justify-between w-full mt-auto relative z-10 px-4">
            <div className="flex flex-col items-center bg-emerald-50/50 px-6 py-3 rounded-2xl border border-emerald-50">
              <div className="flex items-center gap-1.5 text-emerald-600 font-bold mb-1 text-xs uppercase tracking-wide">
                <CheckCircle2 size={14} /> Passed
              </div>
              <span className="text-3xl font-black text-[#101828]">{passedTests}</span>
            </div>
            <div className="flex flex-col items-center bg-rose-50/50 px-6 py-3 rounded-2xl border border-rose-50">
              <div className="flex items-center gap-1.5 text-rose-600 font-bold mb-1 text-xs uppercase tracking-wide">
                <XCircle size={14} /> Failed
              </div>
              <span className="text-3xl font-black text-[#101828]">{failedTests}</span>
            </div>
          </div>
        </div>

        {/* Execution Time Bar Chart */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-8 shadow-sm border border-[#EAECF0] flex flex-col">
          <h2 className="text-md font-bold text-[#101828] mb-8">Execution Time by Module</h2>
          
          <div className="flex-1 flex items-end gap-6 relative pt-8 pb-6 border-b border-[#EAECF0] px-2 h-[300px]">
            
            {(() => {
              if (!testResults || testResults.length === 0) {
                return (
                  <div className="absolute inset-0 flex items-center justify-center text-[#667085] text-sm font-medium">
                    No data to visualize. Run tests first.
                  </div>
                );
              }

              const maxRaw = Math.max(...testResults.map(r => r.rawTime || 0), 100);
              // Calculate a clean scale maximum (e.g. 500ms, 1000ms, 2000ms, etc.)
              let maxScale = 100;
              while (maxScale < maxRaw) {
                if (maxScale < 1000) maxScale += 100;
                else if (maxScale < 5000) maxScale += 500;
                else maxScale += 1000;
              }
              
              return (
                <>
                  {/* Y Axis labels */}
                  <div className="absolute left-0 top-0 bottom-6 flex flex-col justify-between text-[10px] text-[#98A2B3] font-bold py-1 pr-4 border-r border-[#EAECF0] h-[calc(100%-24px)] min-w-[45px] text-right bg-white z-20">
                    <span>{(maxScale / 1000).toFixed(1)}s</span>
                    <span>{(maxScale * 0.75 / 1000).toFixed(1)}s</span>
                    <span>{(maxScale * 0.5 / 1000).toFixed(1)}s</span>
                    <span>{(maxScale * 0.25 / 1000).toFixed(1)}s</span>
                    <span>0.0s</span>
                  </div>

                  {/* Grid lines */}
                  <div className="absolute left-[45px] right-0 top-1 h-px bg-[#F2F4F7] z-0"></div>
                  <div className="absolute left-[45px] right-0 top-[calc(25%+1px)] h-px bg-[#F2F4F7] z-0"></div>
                  <div className="absolute left-[45px] right-0 top-[calc(50%+1px)] h-px bg-[#F2F4F7] z-0"></div>
                  <div className="absolute left-[45px] right-0 top-[calc(75%+1px)] h-px bg-[#F2F4F7] z-0"></div>

                  {/* Bars */}
                  {testResults.map((result, idx) => {
                    const heightPercent = Math.max(Math.min(((result.rawTime || 0) / maxScale) * 100, 100), 2);
                    const isFailed = result.status === 'Failed';
                    const gradientClass = isFailed ? 'from-rose-500 to-rose-400' : 'from-[#5B5FF6] to-[#8184fa]';
                    const shadowClass = isFailed ? 'shadow-[0_8px_20px_rgba(244,63,94,0.3)]' : 'shadow-[0_8px_20px_rgba(91,95,246,0.3)]';
                    
                    const shortLabel = result.module.split(' ').slice(0, 2).join(' ') || `Test ${idx+1}`;

                    return (
                      <div key={result.id || idx} className={`flex-1 flex flex-col items-center gap-4 relative z-10 ${idx === 0 ? 'ml-[45px]' : ''} group h-full justify-end`}>
                        
                        <div 
                          className={`w-full max-w-[64px] bg-gradient-to-t ${gradientClass} rounded-t-xl transition-all duration-500 ${shadowClass} relative cursor-pointer hover:opacity-90 group-hover:scale-y-[1.02] transform origin-bottom`} 
                          style={{ height: `${heightPercent}%` }}
                        >
                          <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-[#101828] text-white text-xs font-bold px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none drop-shadow-lg after:content-[''] after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-[5px] after:border-transparent after:border-t-[#101828]">
                            {result.time}
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-[#667085] text-center w-full truncate px-1 uppercase tracking-wider" title={result.module}>{shortLabel}</span>
                      </div>
                    );
                  })}
                </>
              );
            })()}
            
          </div>
        </div>
      </div>

      {/* Test Execution Results Table */}
      <div className="bg-white rounded-3xl p-0 shadow-sm border border-[#EAECF0] overflow-hidden">
        <div className="p-6 border-b border-[#EAECF0] flex justify-between items-center bg-[#F9FAFB]">
          <h2 className="text-md font-bold text-[#101828] flex items-center gap-2">
            <BarChart2 size={18} className="text-[#5B5FF6]" /> Test Execution Results
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-[#EAECF0] text-xs font-bold text-[#667085] uppercase tracking-wider">
                <th className="py-4 px-6 font-semibold">Test Module</th>
                <th className="py-4 px-6 font-semibold">Status</th>
                <th className="py-4 px-6 font-semibold">Execution Time</th>
                <th className="py-4 px-6 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {testResults.length > 0 ? testResults.map((test, idx) => (
                <tr key={test.id || idx} className="border-b border-[#EAECF0] hover:bg-[#F9FAFB] transition-colors">
                  <td className="py-4 px-6 font-bold text-[#101828]">{test.module}</td>
                  <td className="py-4 px-6">
                    {test.status === 'Passed' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px] uppercase border border-emerald-100">
                        <CheckCircle2 size={12} /> Passed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 font-bold text-[10px] uppercase border border-rose-100">
                        <XCircle size={12} /> Failed
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-6 font-medium text-[#475467]">{test.time}</td>
                  <td className="py-4 px-6 text-right">
                    <button 
                      className="text-[#5B5FF6] font-bold text-xs hover:underline"
                      onClick={() => {
                        if (testResult?.htmlReportUrl) {
                          window.open(formatNgrokUrl(`${API_BASE_URL}${testResult.htmlReportUrl}`), '_blank');
                        } else {
                          alert("HTML Report not available yet. Run tests first.");
                        }
                      }}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="4" className="py-8 text-center text-sm font-medium text-[#667085]">
                    No test results available. Click "Run Automated Tests" to execute.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between mt-8 pb-10">
        <button 
          onClick={() => setActiveTab('project-runner')}
          className="px-6 py-3 bg-white text-slate-700 font-bold rounded-xl shadow-sm border border-slate-200 hover:bg-slate-50 hover:shadow transition-all"
        >
          Back
        </button>
        <button 
          onClick={() => setActiveTab('summary')}
          className="px-8 py-3 bg-gradient-to-r from-[#5B5FF6] to-[#7B61FF] text-white font-bold rounded-xl shadow-[0_4px_14px_rgba(91,95,246,0.4)] hover:shadow-[0_6px_20px_rgba(91,95,246,0.6)] hover:-translate-y-0.5 transition-all flex items-center gap-2"
        >
          Continue <ArrowRight size={18} />
        </button>
      </div>

    </div>
  );
}
