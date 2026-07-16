import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, Activity, FileText, Download, BarChart2, CheckCircle2, XCircle
} from 'lucide-react';
import { API_BASE_URL, getPlaywrightStatus } from '../api';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';

export default function FunctionalTesting({ setActiveTab, repoUrl, result, workflowState }) {
  const repoName = repoUrl ? repoUrl.split('/').pop().replace('.git', '') : '';
  const [playwrightResult, setPlaywrightResult] = useState(null);

  useEffect(() => {
    if (repoName) {
      const fetchStatus = async () => {
        try {
          const pwStatus = await getPlaywrightStatus(repoName);
          setPlaywrightResult(pwStatus);
        } catch (err) { console.error(err); }
      };
      
      fetchStatus();
      const interval = setInterval(fetchStatus, 3000);
      return () => clearInterval(interval);
    }
  }, [repoName]);

  // Dynamic data from backend
  const passedTests = playwrightResult?.passedTests || 0;
  const failedTests = playwrightResult?.failedTests || 0;
  const totalTests = playwrightResult?.totalTests || (passedTests + failedTests);
  const passRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;
  
  const testResults = playwrightResult?.modules || [];

  return (
    <div className="flex flex-col gap-6 animate-fadeIn w-full max-w-7xl mx-auto pb-10 h-full">
      
      {/* Header section matching Image 5 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#101828] flex items-center gap-3">
            <span className="p-2 bg-indigo-50 text-[#5B5FF6] rounded-xl"><CheckCircle size={24} /></span>
            Playwright UI Functional Testing Results
          </h1>
          <p className="text-[#667085] mt-2 font-medium">Test execution completed successfully for {repoName || 'student-management-system'}</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              if (playwrightResult?.htmlReportUrl) {
                window.open(`${API_BASE_URL}${playwrightResult.htmlReportUrl}`, '_blank');
              } else {
                alert("HTML Report not available yet.");
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
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-[#EAECF0] flex flex-col items-center justify-center">
          <h2 className="text-md font-bold text-[#101828] mb-6 self-start w-full text-left">Pass vs Fail Rate</h2>
          <div className="relative w-40 h-40 mb-6">
            <CircularProgressbar
              value={passRate}
              strokeWidth={12}
              styles={buildStyles({
                pathColor: '#12B76A',
                trailColor: '#F04438',
                strokeLinecap: 'round',
              })}
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-black text-[#101828]">{passRate}%</span>
              <span className="text-xs font-bold text-[#667085] uppercase">Pass Rate</span>
            </div>
          </div>
          <div className="flex justify-between w-full mt-4">
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2 text-emerald-600 font-bold mb-1">
                <CheckCircle2 size={16} /> Passed
              </div>
              <span className="text-2xl font-black text-[#101828]">{passedTests}</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2 text-rose-600 font-bold mb-1">
                <XCircle size={16} /> Failed
              </div>
              <span className="text-2xl font-black text-[#101828]">{failedTests}</span>
            </div>
          </div>
        </div>

        {/* Execution Time Bar Chart Placeholder */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-8 shadow-sm border border-[#EAECF0] flex flex-col">
          <h2 className="text-md font-bold text-[#101828] mb-6">Execution Time by Module</h2>
          <div className="flex-1 flex items-end gap-6 relative pt-10 pb-6 border-b border-[#EAECF0] px-4">
            
            {/* Y Axis labels */}
            <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-[10px] text-[#98A2B3] font-bold py-6 pr-2 border-r border-[#EAECF0]">
              <span>4.0s</span>
              <span>3.0s</span>
              <span>2.0s</span>
              <span>1.0s</span>
              <span>0.0s</span>
            </div>

            {/* Grid lines */}
            <div className="absolute left-8 right-0 top-6 h-px bg-[#F2F4F7]"></div>
            <div className="absolute left-8 right-0 top-[calc(25%+6px)] h-px bg-[#F2F4F7]"></div>
            <div className="absolute left-8 right-0 top-[calc(50%+6px)] h-px bg-[#F2F4F7]"></div>
            <div className="absolute left-8 right-0 top-[calc(75%+6px)] h-px bg-[#F2F4F7]"></div>

            {/* Bars */}
            {testResults.map((result, idx) => {
              const maxTime = Math.max(...testResults.map(r => r.rawTime || 4000), 4000);
              const heightPercent = Math.min(((result.rawTime || 0) / maxTime) * 100, 100);
              const bgColor = result.status === 'Failed' ? 'bg-[#F04438] hover:bg-[#d92d20]' : 'bg-[#5B5FF6] hover:bg-[#4f53dc]';
              
              // Extract a short label
              const shortLabel = result.module.split(' ')[0] || `Test ${idx+1}`;

              return (
                <div key={result.id || idx} className={`flex-1 flex flex-col items-center gap-3 relative z-10 ${idx === 0 ? 'ml-8' : ''}`}>
                  <div className={`w-12 ${bgColor} rounded-t-lg transition-all shadow-sm relative group`} style={{ height: `${heightPercent}%`, minHeight: '4px' }}>
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#101828] text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">{result.time}</div>
                  </div>
                  <span className="text-[10px] font-bold text-[#667085] text-center w-full truncate" title={result.module}>{shortLabel}</span>
                </div>
              );
            })}
            
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
                    <button className="text-[#5B5FF6] font-bold text-xs hover:underline">
                      View Details
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="4" className="py-8 text-center text-sm font-medium text-[#667085]">
                    No test results available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
