import React, { useState, useEffect } from 'react';
import { 
  FileText, Download, CheckCircle, FileCode, Server, Play, FolderArchive, ArrowDownToLine, RefreshCw
} from 'lucide-react';
import { motion } from 'framer-motion';
import { 
  getPlaywrightStatus, 
  getBrdDownloadUrl,
  getUiTestCasesDownloadUrl,
  getApiTestCasesDownloadUrl,
  getPlaywrightReportDownloadUrl,
  API_BASE_URL
} from '../api';

export default function Summary({ repoUrl }) {
  const repoName = repoUrl ? repoUrl.split('/').pop().replace('.git', '') : '';
  const [loading, setLoading] = useState(false);
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
    }
  }, [repoName]);

  const handleDownload = (type) => {
    if (!repoName) return;
    setLoading(true);
    let url = '';
    switch(type) {
      case 'brd':
        url = `http://localhost:8000/api/brd/download/${encodeURIComponent(repoUrl)}`;
        break;
      case 'report':
        url = `${API_BASE_URL}/migration/${repoName}/playwright/report/download`;
        break;
      case 'api-tests':
        url = `http://localhost:8000/api/reports/api-test-cases/download/${encodeURIComponent(repoUrl)}`;
        break;
      case 'ui-tests':
        url = `http://localhost:8000/api/reports/ui-functional-test/download/${encodeURIComponent(repoUrl)}`;
        break;
      default:
        break;
    }
    
    if (url) {
      window.open(url, '_blank');
    }
    setTimeout(() => setLoading(false), 1000);
  };

  return (
    <div className="flex flex-col gap-6 animate-fadeIn w-full max-w-7xl mx-auto pb-10">
      
      {/* Header matching Image 6 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#101828] flex items-center gap-3">
            <span className="p-2 bg-indigo-50 text-[#5B5FF6] rounded-xl"><FolderArchive size={24} /></span>
            Artifacts & Reports
          </h1>
          <p className="text-[#667085] mt-2 font-medium">Download generated artifacts, test scripts, and execution reports.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Column: Documents */}
        <div className="flex flex-col gap-6">
          
          {/* BRD Card */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#EAECF0] flex flex-col group hover:border-[#5B5FF6] transition-colors relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[#5B5FF6]/5 to-transparent rounded-bl-full -z-0"></div>
            
            <div className="flex items-start gap-4 mb-6 relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-[#5B5FF6] shrink-0">
                <FileText size={28} />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-bold text-[#101828]">Business Requirements Document (BRD)</h3>
                </div>
                <p className="text-sm text-[#667085] mt-1">AI-generated comprehensive analysis of the repository's business logic and technical architecture.</p>
                <div className="flex items-center gap-2 mt-3">
                  <span className="px-2 py-1 bg-[#F2F4F7] text-[#475467] text-[10px] font-bold uppercase rounded-md">PDF Document</span>
                  <span className="text-xs font-semibold text-[#98A2B3]">• 1.2 MB</span>
                </div>
              </div>
            </div>
            
            <button 
              onClick={() => handleDownload('brd')}
              className="mt-auto w-full py-3 bg-white border border-[#EAECF0] text-[#344054] font-bold rounded-xl shadow-sm hover:bg-[#F9FAFB] hover:text-[#5B5FF6] hover:border-[#5B5FF6] transition-all flex items-center justify-center gap-2"
            >
              <Download size={18} /> Download BRD
            </button>
          </div>

          {/* Test Execution Report Card */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#EAECF0] flex flex-col group hover:border-[#5B5FF6] transition-colors relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[#12B76A]/5 to-transparent rounded-bl-full -z-0"></div>
            
            <div className="flex items-start gap-4 mb-6 relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-[#12B76A] shrink-0">
                <CheckCircle size={28} />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-bold text-[#101828]">Test Execution Report</h3>
                </div>
                <p className="text-sm text-[#667085] mt-1">Detailed HTML report containing test steps, assertions, network logs, and traces.</p>
                <div className="flex items-center gap-2 mt-3">
                  <span className="px-2 py-1 bg-[#F2F4F7] text-[#475467] text-[10px] font-bold uppercase rounded-md">HTML Report</span>
                  <span className="text-xs font-semibold text-[#98A2B3]">• 845 KB</span>
                </div>
              </div>
            </div>
            
            <button 
              onClick={() => handleDownload('report')}
              className="mt-auto w-full py-3 bg-white border border-[#EAECF0] text-[#344054] font-bold rounded-xl shadow-sm hover:bg-[#F9FAFB] hover:text-[#12B76A] hover:border-[#12B76A] transition-all flex items-center justify-center gap-2"
            >
              <Download size={18} /> Download Report
            </button>
          </div>

        </div>

        {/* Right Column: Code Artifacts */}
        <div className="flex flex-col h-full">
          
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#EAECF0] flex-1 flex flex-col">
            <h2 className="text-md font-bold text-[#101828] mb-6 flex items-center gap-2">
              <FileCode size={20} className="text-[#5B5FF6]" /> AI Generated Test Cases
            </h2>
            
            <div className="space-y-4">
              
              {/* API Tests Item */}
              <div className="p-4 rounded-2xl border border-[#EAECF0] hover:border-[#5B5FF6] transition-colors flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                    <Server size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#101828]">API Functional Tests</h4>
                    <p className="text-xs text-[#667085] mt-0.5">Automated REST endpoint validation.</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs font-semibold text-[#98A2B3] hidden sm:block">1.2 MB</span>
                  <button 
                    onClick={() => handleDownload('api-tests')}
                    className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-[#667085] hover:bg-[#5B5FF6] hover:text-white transition-colors"
                    title="Download API Tests"
                  >
                    <ArrowDownToLine size={18} />
                  </button>
                </div>
              </div>

              {/* UI Tests Item */}
              <div className="p-4 rounded-2xl border border-[#EAECF0] hover:border-[#5B5FF6] transition-colors flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                    <Play size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#101828]">Playwright UI Tests</h4>
                    <p className="text-xs text-[#667085] mt-0.5">End-to-end browser automation scripts.</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs font-semibold text-[#98A2B3] hidden sm:block">4.5 MB</span>
                  <button 
                    onClick={() => handleDownload('ui-tests')}
                    className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-[#667085] hover:bg-[#5B5FF6] hover:text-white transition-colors"
                    title="Download UI Tests"
                  >
                    <ArrowDownToLine size={18} />
                  </button>
                </div>
              </div>

            </div>
            
            <div className="mt-8 pt-6 border-t border-[#EAECF0]">
              <div className="flex items-start gap-3 p-4 bg-[#F7F8FC] rounded-xl border border-[#EAECF0]">
                <div className="mt-0.5">
                  <CheckCircle size={16} className="text-[#5B5FF6]" />
                </div>
                <p className="text-xs text-[#475467] leading-relaxed">
                  All test scripts are generated specifically for your architecture. You can execute these tests locally by running <code className="font-mono bg-white px-1 py-0.5 rounded border border-slate-200">npm test</code> or integrate them directly into your CI/CD pipeline using the provided configuration files.
                </p>
              </div>
            </div>
            
          </div>

        </div>

      </div>
    </div>
  );
}
