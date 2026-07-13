import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, Download, Eye, FileText, Code, 
  Server, RefreshCw, FlaskConical, AlertCircle, AlertTriangle,
  ChevronDown, ChevronUp, ShieldAlert
} from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../api';

export default function AITestRecommendation({ setActiveTab, repoUrl, workflowState, setWorkflowState, analysisResult }) {
  const [recommendation, setRecommendation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [isDownloadingUiTests, setIsDownloadingUiTests] = useState(false);
  const [isDownloadingApiTests, setIsDownloadingApiTests] = useState(false);

  const handleDownloadUiTests = async () => {
    setIsDownloadingUiTests(true);
    try {
      if (!repoUrl) {
        alert("Please analyze repository first.");
        return;
      }
      const response = await fetch(`http://localhost:8000/api/reports/ui-functional-test/download/${encodeURIComponent(repoUrl)}`);
      if (!response.ok) {
        throw new Error('Failed to download UI test cases');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ui-functional-test-scope-${repoName}.html`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      alert('UI Functional Test Cases report downloaded successfully.');
    } catch (err) {
      console.error(err);
      alert('Failed to generate UI Functional Test Case report.');
    } finally {
      setIsDownloadingUiTests(false);
    }
  };

  const handleDownloadApiTests = async () => {
    setIsDownloadingApiTests(true);
    try {
      if (!repoUrl) {
        alert("Please analyze repository first.");
        return;
      }
      const response = await fetch(`http://localhost:8000/api/reports/api-test-cases/download/${encodeURIComponent(repoUrl)}`);
      if (!response.ok) {
        throw new Error('Failed to download API test cases');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `api-functional-test-scope-${repoName}.html`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      alert('API Functional Test Cases report downloaded successfully.');
    } catch (err) {
      console.error(err);
      alert('Failed to generate API Functional Test Case report.');
    } finally {
      setIsDownloadingApiTests(false);
    }
  };

  
  const [uiFiles, setUiFiles] = useState([]);
  const [apiFiles, setApiFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  
  const [uiFilesOpen, setUiFilesOpen] = useState(true);
  const [apiFilesOpen, setApiFilesOpen] = useState(true);

  const [previewFile, setPreviewFile] = useState(null);
  const [previewContent, setPreviewContent] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);

  const repoName = repoUrl ? repoUrl.split('/').pop().replace('.git', '') : '';

  useEffect(() => {
    if (repoName) {
      fetchRecommendation();
      fetchFiles();
    }
  }, [repoName]);

  const fetchRecommendation = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get(`${API_BASE_URL}/functional-testing/${repoName}/recommendation`);
      setRecommendation(res.data);
    } catch (err) {
      console.error(err);
      setError('AI recommendation could not be completed. Retry the analysis.');
    } finally {
      setLoading(false);
    }
  };

  const fetchFiles = async () => {
    try {
      setLoadingFiles(true);
      const [uiRes, apiRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/functional-testing/${repoName}/ui/files`).catch(() => ({ data: [] })),
        axios.get(`${API_BASE_URL}/functional-testing/${repoName}/api/files`).catch(() => ({ data: [] }))
      ]);
      setUiFiles(uiRes.data || []);
      setApiFiles(apiRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingFiles(false);
    }
  };

  useEffect(() => {
    if (previewFile) {
      const fetchPreview = async () => {
        setPreviewLoading(true);
        try {
          const res = await axios.get(`${API_BASE_URL}/repositories/${repoName}/files/content`, {
            params: { path: previewFile.path }
          });
          if (res.data && res.data.content) {
            setPreviewContent(res.data.content);
          } else if (res.data && res.data.previewSupported === false) {
            setPreviewContent('// Binary file preview is not supported.');
          } else {
            setPreviewContent('// No content available');
          }
        } catch (err) {
          console.error(err);
          setPreviewContent('// Error loading file content');
        } finally {
          setPreviewLoading(false);
        }
      };
      fetchPreview();
    } else {
      setPreviewContent('');
    }
  }, [previewFile, repoName]);

  const handleDownload = (fileId) => {
    window.open(`${API_BASE_URL}/functional-testing/${repoName}/files/${encodeURIComponent(fileId)}/download`, '_blank');
  };

  const navigateToTesting = (framework) => {
    if (typeof setWorkflowState === 'function') {
      setWorkflowState(prev => ({ ...prev, activeFramework: framework }));
    }
    setActiveTab('results');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh]">
        <RefreshCw className="animate-spin text-[#5B5FF6] mb-4" size={32} />
        <p className="text-slate-600 font-medium">Analyzing project structure with AI...</p>
      </div>
    );
  }

  const isRecommendedImplemented = recommendation && ['playwright', 'selenium'].includes(recommendation.recommendedTool?.toLowerCase());

  return (
    <div className="space-y-8 animate-fadeIn max-w-6xl mx-auto pb-12">
      
      {/* 1. Testing Tools Section (AI Recommendation Box Removed) */}
      <div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Playwright Card */}
          <div 
            onClick={() => navigateToTesting('playwright')}
            className={`group relative bg-white border ${recommendation?.recommendedTool?.toLowerCase() === 'playwright' ? 'border-[#5B5FF6] shadow-md shadow-[#5B5FF6]/10' : 'border-slate-200 hover:border-[#5B5FF6] hover:shadow-md'} rounded-3xl p-6 transition-all cursor-pointer flex flex-col h-full`}
          >
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden">
                  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/playwright/playwright-original.svg" alt="Playwright Logo" className="w-10 h-10 object-contain group-hover:scale-110 transition-transform" />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-slate-800 group-hover:text-[#5B5FF6] transition-colors">Playwright</h4>
                  <span className="text-sm font-semibold text-slate-500">UI Functional Testing</span>
                </div>
              </div>
              {recommendation?.recommendedTool?.toLowerCase() === 'playwright' ? (
                <div className="flex flex-col items-end gap-1">
                  <span className="px-3 py-1 bg-purple-100 text-[#5B5FF6] text-xs font-bold uppercase rounded-lg border border-purple-200">
                    Recommended
                  </span>
                  <span className="text-[10px] font-bold text-[#5B5FF6]">95% Match</span>
                </div>
              ) : (
                <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold uppercase rounded-lg">
                  Implemented
                </span>
              )}
            </div>
            
            <p className="text-slate-600 text-sm mb-6 flex-1">
              {recommendation?.recommendedTool?.toLowerCase() === 'playwright' 
                ? recommendation.reason 
                : "End-to-end testing for modern web apps. Run automated browser interactions and validate UI workflows quickly."}
            </p>
            
            <button className="w-full py-3 rounded-xl text-sm font-bold bg-slate-100 text-slate-700 group-hover:bg-[#5B5FF6] group-hover:text-white transition-colors flex items-center justify-center gap-2 mt-auto">
              <CheckCircle2 size={18} />
              Run Playwright Tests
            </button>
          </div>

          {/* Selenium Card */}
          {/* Selenium Card (Inactive) */}
          <div 
            className="relative bg-slate-50 border border-slate-200 rounded-3xl p-6 flex flex-col h-full opacity-60 grayscale cursor-not-allowed"
          >
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden opacity-80">
                  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/selenium/selenium-original.svg" alt="Selenium Logo" className="w-10 h-10 object-contain" />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-slate-500">Selenium</h4>
                  <span className="text-sm font-semibold text-slate-400">UI Functional Testing</span>
                </div>
              </div>
              <span className="px-3 py-1 bg-slate-200 text-slate-600 text-xs font-bold uppercase rounded-lg">
                Coming Soon
              </span>
            </div>
            
            <p className="text-slate-500 text-sm mb-6 flex-1">
              Industry-standard tool for automating web applications across browsers. Highly compatible with legacy web apps.
            </p>
            
            <button disabled className="w-full py-3 rounded-xl text-sm font-bold bg-slate-200 text-slate-400 flex items-center justify-center gap-2 mt-auto cursor-not-allowed">
              Run Selenium Tests
            </button>
          </div>

        </div>
      </div>

      {/* 1.5 Test Cases Summary section */}
      {analysisResult?.fullBrdReport && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <FileText className="text-[#5B5FF6]" size={20} />
                UI Test Cases Summary
              </h3>
              <button
                onClick={handleDownloadUiTests}
                disabled={isDownloadingUiTests}
                className="px-4 py-2 bg-[#5B5FF6] hover:bg-[#4F54D8] disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-all"
              >
                {isDownloadingUiTests ? 'Downloading...' : 'Download UI Tests'}
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-slate-500">Total UI test cases generated:</span>
                <span className="text-sm font-semibold text-slate-800">Available</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-500">Main UI modules covered:</span>
                <span className="text-sm font-semibold text-slate-800">{analysisResult.fullBrdReport.bizComponents?.length || 'Multiple'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-500">Generation status:</span>
                <span className="text-sm font-semibold text-emerald-600 flex items-center gap-1"><CheckCircle2 size={14}/> Success</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-500">Generated date and time:</span>
                <span className="text-sm font-semibold text-slate-800">{new Date().toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <ShieldAlert className="text-emerald-500" size={20} />
                API Test Cases Summary
              </h3>
              <button
                onClick={handleDownloadApiTests}
                disabled={isDownloadingApiTests}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-all"
              >
                {isDownloadingApiTests ? 'Downloading...' : 'Download API Tests'}
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-slate-500">Total API test cases generated:</span>
                <span className="text-sm font-semibold text-slate-800">Available</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-500">API endpoints covered:</span>
                <span className="text-sm font-semibold text-slate-800">{analysisResult.fullBrdReport.apiGroups?.length || 'Multiple'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-500">Generation status:</span>
                <span className="text-sm font-semibold text-emerald-600 flex items-center gap-1"><CheckCircle2 size={14}/> Success</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-500">Generated date and time:</span>
                <span className="text-sm font-semibold text-slate-800">{new Date().toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Existing Project Files Layout (With Accordion Logic) */}
      <div className="grid grid-cols-1 gap-6 pt-4">
        
        {/* Left Division: HTML/UI Files */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col h-fit">
          <button 
            onClick={() => setUiFilesOpen(!uiFilesOpen)}
            className="flex items-center justify-between w-full text-left focus:outline-none"
          >
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Code className="text-[#5B5FF6]" size={20} /> Existing HTML / UI Files ({uiFiles.length})
            </h3>
            <div className="p-1 rounded-full hover:bg-slate-100 text-slate-500 transition-colors">
              {uiFilesOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </div>
          </button>
          
          {uiFilesOpen && (
            <div className="mt-6 max-h-[400px] overflow-y-auto pr-2 space-y-3">
              {loadingFiles ? (
                <div className="flex flex-col items-center justify-center text-slate-400 py-10">
                  <RefreshCw className="animate-spin mb-3" size={24} />
                  Loading project UI files...
                </div>
              ) : uiFiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <p className="text-slate-500 text-sm font-medium">No frontend UI files were detected in the repository.</p>
                </div>
              ) : (
                uiFiles.map(file => (
                  <div key={file.id} className="p-3 border border-slate-100 bg-slate-50 rounded-xl flex items-center justify-between group hover:bg-white hover:border-slate-200 transition-colors">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <FileText size={18} className="text-blue-500 flex-shrink-0" />
                      <div className="overflow-hidden">
                        <p className="text-sm font-semibold text-slate-700 truncate">{file.name}</p>
                        <p className="text-xs text-slate-500 truncate" title={file.path}>{file.path}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2">
                      <button onClick={() => setPreviewFile(file)} className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors">
                        <Eye size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Right Division: API Files */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col h-fit">
          <button 
            onClick={() => setApiFilesOpen(!apiFilesOpen)}
            className="flex items-center justify-between w-full text-left focus:outline-none"
          >
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Server className="text-emerald-500" size={20} /> Existing API Files ({apiFiles.length})
            </h3>
            <div className="p-1 rounded-full hover:bg-slate-100 text-slate-500 transition-colors">
              {apiFilesOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </div>
          </button>

          {apiFilesOpen && (
            <div className="mt-6 max-h-[400px] overflow-y-auto pr-2 space-y-3">
              {loadingFiles ? (
                <div className="flex flex-col items-center justify-center text-slate-400 py-10">
                  <RefreshCw className="animate-spin mb-3" size={24} />
                  Loading API endpoints...
                </div>
              ) : apiFiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <p className="text-slate-500 text-sm font-medium">No backend API files were detected.</p>
                </div>
              ) : (
                apiFiles.map(file => (
                  <div key={file.id} className="p-3 border border-slate-100 bg-slate-50 rounded-xl flex items-center justify-between group hover:bg-white hover:border-slate-200 transition-colors">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <FileText size={18} className="text-emerald-500 flex-shrink-0" />
                      <div className="overflow-hidden">
                        <p className="text-sm font-semibold text-slate-700 truncate">{file.name}</p>
                        <p className="text-xs text-slate-500 truncate" title={file.path}>{file.path}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2">
                      <button onClick={() => setPreviewFile(file)} className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors">
                        <Eye size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* File Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-800">{previewFile.name}</h3>
                <p className="text-xs text-slate-500">{previewFile.path}</p>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => setPreviewFile(null)} className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-bold rounded-lg transition-colors">
                  Close
                </button>
              </div>
            </div>
            <div className="flex-1 p-6 overflow-auto bg-slate-50">
              {previewLoading ? (
                <div className="flex items-center justify-center h-full text-slate-400">
                  <RefreshCw className="animate-spin mr-2" size={18} /> Loading file content...
                </div>
              ) : (
                <pre className="text-sm font-mono text-slate-700 whitespace-pre-wrap">
                  {previewContent || `// No content to display`}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
