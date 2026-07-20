import React, { useState, useEffect } from 'react';
import { 
  FileText, Shield, Download, CheckCircle, Code, Eye, Terminal, Server, X, Loader2, ArrowRight, Info,
  ChevronDown, ChevronUp
} from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { getRepositoryFileContent, getUiTestCasesData, getApiTestCasesData, API_BASE_URL } from '../api';


const Tooltip = ({ label, children, details, theme = 'blue' }) => {
  const hoverIconColor = theme === 'green' ? 'group-hover:textemerald-500' : 'group-hover:text-[#2563EB]';
  const bgColor = theme === 'green' ? 'bg-emerald-600' : 'bg-[#2563EB]';
  
  return (
    <div className="relative group inline-flex items-center gap-1.5 cursor-help">
      <span className="text-[10px] font-bold text-[#667085] uppercase tracking-wider">{label}</span>
      <Info size={12} className={`text-[#98A2B3] transition-colors ${hoverIconColor}`} />
      
      <div className="absolute top-full -left-2 mt-2 w-72 max-w-[85vw] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[100] pointer-events-none group-hover:pointer-events-auto">
        <div className={`${bgColor} text-white p-4 rounded-xl shadow-xl text-[11px] whitespace-pre-wrap leading-relaxed border border-white/10 tracking-wide text-left`}>
          {details}
          <div className={`absolute -top-1 left-4 w-2 h-2 ${bgColor} border-t border-l border-white/10 rotate-45`}></div>
        </div>
      </div>
    </div>
  );
};

export default function AITestRecommendation({ setActiveTab, repoUrl, workflowState, setWorkflowState, analysisResult }) {
  const repoName = repoUrl ? repoUrl.split('/').pop().replace('.git', '') : 'Repository';

  const [loading, setLoading] = useState(false);
  const [viewingFile, setViewingFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [loadingFile, setLoadingFile] = useState(false);
  
  // Accordion UI States for Dynamic Test Cases
  const [uiTestCases, setUiTestCases] = useState([]);
  const [apiTestCases, setApiTestCases] = useState([]);
  const [showUiAccordion, setShowUiAccordion] = useState(false);
  const [showApiAccordion, setShowApiAccordion] = useState(false);
  const [loadingUiData, setLoadingUiData] = useState(false);
  const [loadingApiData, setLoadingApiData] = useState(false);
  const [dynamicAnalysis, setDynamicAnalysis] = useState(null);
  const [dynamicLoading, setDynamicLoading] = useState(false);

  useEffect(() => {
    if (repoName && repoName !== 'Repository') {
      const fetchDynamicAnalysis = async () => {
        try {
          setDynamicLoading(true);
          const encodedId = encodeURIComponent(repoName);
          const response = await fetch(`${API_BASE_URL}/dynamic-analysis/${encodedId}`);
          if (response.ok) {
             const data = await response.json();
             setDynamicAnalysis(data);
             if (data.status === "PROCESSING") {
                setTimeout(fetchDynamicAnalysis, 3000);
             } else {
                setDynamicLoading(false);
             }
          } else {
             setDynamicLoading(false);
          }
        } catch (e) {
          setDynamicLoading(false);
        }
      };
      fetchDynamicAnalysis();

      const loadTestData = async () => {
        setLoadingUiData(true);
        setLoadingApiData(true);
        try {
          const uiData = await getUiTestCasesData(repoName);
          setUiTestCases(uiData.test_cases || []);
        } catch (e) {
          console.error("Error loading UI test cases:", e);
        } finally {
          setLoadingUiData(false);
        }
        
        try {
          const apiData = await getApiTestCasesData(repoName);
          setApiTestCases(Array.isArray(apiData) ? apiData : (apiData.test_cases || []));
        } catch (e) {
          console.error("Error loading API test cases:", e);
        } finally {
          setLoadingApiData(false);
        }
      };
      loadTestData();
    }
  }, [repoName]);

  const handleViewFile = async (file) => {
    setViewingFile(file);
    setLoadingFile(true);
    setFileContent('');
    try {
      const content = await getRepositoryFileContent(repoName, file.path);
      setFileContent(content?.content || 'Error loading file content.');
    } catch (err) {
      setFileContent('Error loading file content.');
    } finally {
      setLoadingFile(false);
    }
  };

  const handleDownload = (type) => {
    if (!repoName || repoName === 'Repository') return;
    let url = '';
    if (type === 'ui-tests') {
      url = `${API_BASE_URL}/reports/ui-functional-test/download/${encodeURIComponent(repoName)}`;
    } else if (type === 'api-tests') {
      url = `${API_BASE_URL}/reports/api-test-cases/download/${encodeURIComponent(repoName)}`;
    }
    
    if (url) {
      window.open(url, '_blank');
    }
  };

  // Dynamic calculation logic from actual test case state
  const calculateTestStats = () => {
    // FILTER OUT OLD FALLBACKS
    const validUiTestCases = uiTestCases.filter(tc => tc.scenario !== "Basic Load Test" && tc.scenario !== "Fallback Scenario");
    const validApiTestCases = apiTestCases.filter(tc => tc.scenario !== "Fallback API Test");

    // DYNAMIC METRICS FROM BACKGROUND EXECUTION
    const dynUi = dynamicAnalysis?.ui || {};
    const dynApi = dynamicAnalysis?.api || {};
    
    // UI STATS
    const totalUi = dynUi.total !== undefined ? dynUi.total : validUiTestCases.length;
    
    // Extract unique modules (routes)
    const uniqueUiRoutes = [...new Set(validUiTestCases.map(tc => tc.route || tc.scenario || 'Unknown'))].filter(Boolean);
    const modules = uniqueUiRoutes.length;
    
    // Calculate Complexity based on steps
    let high = 0, medium = 0, low = 0;
    validUiTestCases.forEach(tc => {
      const stepCount = tc.steps ? (typeof tc.steps === 'string' ? tc.steps.split('\n').length : tc.steps.length) : 0;
      if (stepCount > 5) high++;
      else if (stepCount >= 3) medium++;
      else low++;
    });
    
    let avgComplexity = "Low";
    if (high > medium && high > low) avgComplexity = "High";
    else if (medium > low || high > 0) avgComplexity = "Medium-High";
    
    // Execution time: Estimate 1.5 mins per functional test
    const estExecMins = totalUi > 0 ? Math.max(1, Math.ceil(totalUi * 1.5)) : 0;
    
    // API STATS
    const totalApi = dynApi.total !== undefined ? dynApi.total : validApiTestCases.length;
    
    // Extract unique endpoints
    const uniqueApiEndpoints = [...new Set(validApiTestCases.map(tc => tc.path || tc.scenario || 'Unknown'))].filter(Boolean);
    const endpoints = uniqueApiEndpoints.length;
    
    // Coverage Scope
    const methods = [...new Set(validApiTestCases.map(tc => tc.method?.toUpperCase() || 'GET'))];
    let coverageScope = "Basic Endpoints";
    if (methods.includes('GET') && methods.includes('POST') && methods.includes('DELETE')) coverageScope = "E2E Workflows";
    else if (methods.includes('GET') && methods.includes('POST')) coverageScope = "Read & Write";
    else if (methods.includes('GET')) coverageScope = "Read-Only";
    if (totalApi === 0) coverageScope = "None";
    
    const dataMocks = validApiTestCases.length > 0 ? "Ready" : "Pending";

    // Extract UI and API files dynamically for the file viewer (Fallback logic if empty BRD)
    let uiFiles = [];
    let apiFiles = [];
    if (analysisResult?.fullBrdReport) {
      const brd = analysisResult.fullBrdReport;
      if (brd.sourceFiles && brd.sourceFiles.length > 0) {
        uiFiles = brd.sourceFiles.filter(f => typeof f === 'string' && f.match(/\.(html|jsx|tsx|vue|jsp|css)$/i)).map(f => ({ name: f.split('/').pop() || f.split('\\').pop(), path: f }));
        apiFiles = brd.sourceFiles.filter(f => typeof f === 'string' && f.match(/controller|api|route|handler/i) && f.match(/\.(java|py|js|ts|go|cs)$/i)).map(f => ({ name: f.split('/').pop() || f.split('\\').pop(), path: f }));
      }
    }
    
    // Construct Tooltip Data
    const tooltips = {
      uiTotal: `Total UI Test Cases: ${totalUi}\n\nDetected from ${uiFiles.length} existing UI/frontend files.\n\n${totalUi} unique UI test scenarios were identified across:\n\n${uniqueUiRoutes.length > 0 ? uniqueUiRoutes.slice(0, 4).join('\n') : 'No modules detected'}\n\nThe count is calculated from the actual test cases detected in the connected repository.`,
      uiModules: `Based on unique application routes/modules detected.\n\nRoutes:\n• ${uniqueUiRoutes.slice(0, 3).join('\n• ')}${uniqueUiRoutes.length > 3 ? `\n...and ${uniqueUiRoutes.length - 3} more` : ''}`,
      uiComplexity: `Derived dynamically from execution steps per test case.\n\nBreakdown:\n• Low (1-2 steps): ${low}\n• Medium (3-5 steps): ${medium}\n• High (>5 steps): ${high}`,
      uiExecution: `Estimated at ~1.5 minutes per end-to-end UI workflow execution.\n\nCalculation: ${totalUi} cases × 1.5 mins = ~${estExecMins} mins total execution.`,
      
      apiTotal: `Total API Test Cases: ${totalApi}\n\nDetected from ${apiFiles.length} existing API/backend files.\n\n${totalApi} unique API test scenarios were identified across ${endpoints} endpoints.\n\nHTTP Methods covered:\n${methods.length > 0 ? methods.join(', ') : 'None detected'}\n\nThe count is calculated from the actual test cases detected in the connected repository.`,
      apiEndpoints: `Based on unique API endpoints/paths detected.\n\nEndpoints:\n• ${uniqueApiEndpoints.slice(0, 3).join('\n• ')}${uniqueApiEndpoints.length > 3 ? `\n...and ${uniqueApiEndpoints.length - 3} more` : ''}`,
      apiScope: `Derived dynamically from the diversity of HTTP methods tested.\n\nMethods tested: ${methods.length > 0 ? methods.join(', ') : 'None'}\nScope categorized as: ${coverageScope}`,
      apiMocks: `Mock payload availability status based on test generation.\n\nStatus: ${dataMocks === "Ready" ? "Mock data parameters and assertions successfully formulated." : "Pending generation."}`
    };
    
    return { totalUi, modules, avgComplexity, estExecMins, tooltips, totalApi, endpoints, coverageScope, dataMocks, uiFiles, apiFiles };
  };

  const { totalUi, modules, avgComplexity, estExecMins, tooltips, totalApi, endpoints, coverageScope, dataMocks, uiFiles, apiFiles } = calculateTestStats();
  const currentDate = new Date().toLocaleDateString();

  if (!analysisResult) return null;

  if (dynamicAnalysis?.status === "PROCESSING") {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-white mt-10">
        <div className="w-16 h-16 border-4 border-[#5B5FF6] border-t-transparent rounded-full animate-spin mb-6"></div>
        <h2 className="text-xl font-black text-slate-800 mb-2">Executing Dynamic Pipeline</h2>
        <p className="text-slate-500 font-medium">Building project, running application internally, and executing AI-generated tests...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 animate-fadeIn w-full pb-10 h-full mt-4">
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* UI Test Case Summary */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#EAECF0] flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-[#101828] flex items-center gap-2">
              <FileText size={20} className="text-[#2563EB]" />
              UI Test Case Summary
            </h2>
            <button 
              onClick={() => handleDownload('ui-tests')}
              className="flex items-center gap-2 px-4 py-2 bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors"
            >
              <Download size={14} /> Download Tests
            </button>
          </div>

          {totalUi === 0 && !loadingUiData ? (
            <div className="flex-1 flex flex-col items-center justify-center py-10 px-4 text-center">
               <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                 <FileText size={20} className="text-slate-400" />
               </div>
               <p className="text-[14px] font-bold text-[#101828]">No existing test cases detected in this repository.</p>
               <p className="text-xs text-[#667085] mt-1 font-medium">The analyzer could not find any UI/functional test definitions.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-[#F9FAFB] rounded-2xl border border-[#EAECF0]">
                  <div className="mb-1"><Tooltip label="TOTAL TEST CASES" details={tooltips.uiTotal} /></div>
                  <p className="text-3xl font-black text-[#5B5FF6]">{totalUi}</p>
                </div>
                <div className="p-4 bg-[#F9FAFB] rounded-2xl border border-[#EAECF0]">
                  <div className="mb-1"><Tooltip label="MODULES COVERED" details={tooltips.uiModules} /></div>
                  <p className="text-3xl font-black text-[#101828]">{modules}</p>
                </div>
                <div className="p-4 bg-[#F9FAFB] rounded-2xl border border-[#EAECF0]">
                  <div className="mb-1"><Tooltip label="AVG. COMPLEXITY" details={tooltips.uiComplexity} /></div>
                  <p className="text-lg font-bold text-[#101828]">{avgComplexity}</p>
                </div>
                <div className="p-4 bg-[#F9FAFB] rounded-2xl border border-[#EAECF0]">
                  <div className="mb-1"><Tooltip label="EST. EXECUTION" details={tooltips.uiExecution} /></div>
                  <p className="text-lg font-bold text-[#101828]">~{estExecMins} mins</p>
                </div>
              </div>
            </>
          )}

          {/* Accordion Trigger for UI Test Cases */}
          <div className="border-t border-[#EAECF0] pt-4 mt-auto mb-4">
            <button 
              onClick={() => setShowUiAccordion(!showUiAccordion)}
              className="flex items-center justify-between w-full text-xs font-bold text-[#2563EB] hover:text-blue-700 transition-colors"
            >
              <span>{showUiAccordion ? 'Hide Generated Test Cases' : 'View Generated Test Cases'}</span>
              {showUiAccordion ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            
            {showUiAccordion && (
              <div className="mt-4 max-h-[220px] overflow-y-auto custom-scrollbar border border-[#EAECF0] rounded-xl p-3 bg-[#F9FAFB] flex flex-col gap-2">
                {loadingUiData ? (
                  <div className="flex items-center justify-center py-6 text-slate-400 gap-2 text-xs">
                    <Loader2 size={14} className="animate-spin text-[#5B5FF6]" /> Loading test cases...
                  </div>
                ) : uiTestCases.length > 0 ? (
                  uiTestCases.map((tc, idx) => (
                    <div key={idx} className="bg-white border border-[#EAECF0] rounded-xl p-3 shadow-sm text-xs">
                      <div className="flex items-center justify-between font-bold text-[#101828] mb-1">
                        <span className="truncate pr-2">{tc.scenario || 'Test Case'}</span>
                        <span className="text-[9px] uppercase text-[#667085] bg-slate-100 px-1.5 py-0.5 rounded shrink-0">{tc.type || 'UI Component'}</span>
                      </div>
                      <div className="text-[#667085] mb-2 font-semibold">Route: <span className="font-mono text-[9px] bg-slate-50 px-1 py-0.5 rounded">{tc.route || '/'}</span></div>
                      <div className="text-[#344054] leading-relaxed"><span className="font-bold text-[#101828]">Steps:</span> {tc.steps}</div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-xs text-[#667085] font-medium">No UI test cases generated yet.</div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-[#EAECF0]">
            <div className="flex items-center gap-2 text-emerald-600">
              <CheckCircle size={16} />
              <span className="text-xs font-bold">Generated Successfully</span>
            </div>
            <span className="text-xs text-[#98A2B3] font-medium">{currentDate}</span>
          </div>
        </div>

        {/* API Test Case Summary */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#EAECF0] flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-[#101828] flex items-center gap-2">
              <Shield size={20} className="text-emerald-500" />
              API Test Case Summary
            </h2>
            <button 
              onClick={() => handleDownload('api-tests')}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg shadow-sm transition-colors"
            >
              <Download size={14} /> Download Tests
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-[#F9FAFB] rounded-2xl border border-[#EAECF0]">
              <div className="mb-1"><Tooltip theme="green" label="TOTAL API TESTS" details={tooltips.apiTotal} /></div>
              <p className="text-3xl font-black text-emerald-500">{totalApi}</p>
            </div>
            <div className="p-4 bg-[#F9FAFB] rounded-2xl border border-[#EAECF0]">
              <div className="mb-1"><Tooltip theme="green" label="ENDPOINTS COVERED" details={tooltips.apiEndpoints} /></div>
              <p className="text-3xl font-black text-[#101828]">{endpoints}</p>
            </div>
            <div className="p-4 bg-[#F9FAFB] rounded-2xl border border-[#EAECF0]">
              <div className="mb-1"><Tooltip theme="green" label="COVERAGE SCOPE" details={tooltips.apiScope} /></div>
              <p className="text-lg font-bold text-[#101828]">{coverageScope}</p>
            </div>
            <div className="p-4 bg-[#F9FAFB] rounded-2xl border border-[#EAECF0]">
              <div className="mb-1"><Tooltip theme="green" label="DATA MOCKS" details={tooltips.apiMocks} /></div>
              <p className="text-lg font-bold text-[#101828]">{dataMocks}</p>
            </div>
          </div>

          {/* Accordion Trigger for API Test Cases */}
          <div className="border-t border-[#EAECF0] pt-4 mt-auto mb-4">
            <button 
              onClick={() => setShowApiAccordion(!showApiAccordion)}
              className="flex items-center justify-between w-full text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
            >
              <span>{showApiAccordion ? 'Hide Generated Test Cases' : 'View Generated Test Cases'}</span>
              {showApiAccordion ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            
            {showApiAccordion && (
              <div className="mt-4 max-h-[220px] overflow-y-auto custom-scrollbar border border-[#EAECF0] rounded-xl p-3 bg-[#F9FAFB] flex flex-col gap-2">
                {loadingApiData ? (
                  <div className="flex items-center justify-center py-6 text-slate-400 gap-2 text-xs">
                    <Loader2 size={14} className="animate-spin text-emerald-500" /> Loading test cases...
                  </div>
                ) : apiTestCases.length > 0 ? (
                  apiTestCases.map((tc, idx) => (
                    <div key={idx} className="bg-white border border-[#EAECF0] rounded-xl p-3 shadow-sm text-xs">
                      <div className="flex items-center justify-between font-bold text-[#101828] mb-1">
                        <span className="truncate pr-2">{tc.scenario || 'API Test Case'}</span>
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded shrink-0 ${
                          tc.method?.toUpperCase() === 'GET' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                          tc.method?.toUpperCase() === 'POST' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                          'bg-amber-50 text-amber-700 border border-amber-100'
                        }`}>{tc.method || 'GET'}</span>
                      </div>
                      <div className="text-[#667085] mb-2 font-semibold">Path: <span className="font-mono text-[9px] bg-slate-50 px-1 py-0.5 rounded">{tc.path || '/'}</span></div>
                      <div className="text-[#344054] leading-relaxed"><span className="font-bold text-[#101828]">Assertions:</span> {tc.assertions}</div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-xs text-[#667085] font-medium">No API test cases generated yet.</div>
                )}
              </div>
            )}
          </div>

          <div className="mt-auto flex items-center justify-between pt-4 border-t border-[#EAECF0]">
            <div className="flex items-center gap-2 text-emerald-600">
              <CheckCircle size={16} />
              <span className="text-xs font-bold">Generated Successfully</span>
            </div>
            <span className="text-xs text-[#98A2B3] font-medium">{currentDate}</span>
          </div>
        </div>

      </div>

      {/* File Lists */}
      <div className="flex flex-col gap-6">
        
        {/* Detected UI / Frontend Files */}
        <div>
          <h3 className="text-sm font-bold text-[#101828] mb-4 flex items-center gap-2">
            <Code size={18} className="text-[#2563EB]" /> Detected UI / Frontend Files ({uiFiles.length})
          </h3>
          <div className="bg-white rounded-2xl border border-[#EAECF0] overflow-hidden shadow-sm">
            {uiFiles.map((file, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 border-b border-[#EAECF0] last:border-0 hover:bg-[#F9FAFB] transition-colors">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                    <FileText size={16} className="text-[#2563EB]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#101828] truncate">{file.name}</p>
                    <p className="text-xs text-[#667085] truncate max-w-lg mt-0.5">{file.path}</p>
                  </div>
                </div>
                <button 
                  onClick={() => handleViewFile(file)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#EAECF0] text-[#667085] hover:text-[#101828] text-xs font-bold rounded-lg shadow-sm transition-colors shrink-0"
                >
                  <Eye size={14} /> View
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Detected Backend API Files */}
        <div className="mb-8">
          <h3 className="text-sm font-bold text-[#101828] mb-4 flex items-center gap-2">
            <Server size={18} className="text-emerald-500" /> Detected Backend API Files ({apiFiles.length})
          </h3>
          <div className="bg-white rounded-2xl border border-[#EAECF0] overflow-hidden shadow-sm">
            {apiFiles.map((file, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 border-b border-[#EAECF0] last:border-0 hover:bg-[#F9FAFB] transition-colors">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                    <Terminal size={16} className="text-emerald-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#101828] truncate">{file.name}</p>
                    <p className="text-xs text-[#667085] truncate max-w-lg mt-0.5">{file.path}</p>
                  </div>
                </div>
                <button 
                  onClick={() => handleViewFile(file)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#EAECF0] text-[#667085] hover:text-[#101828] text-xs font-bold rounded-lg shadow-sm transition-colors shrink-0"
                >
                  <Eye size={14} /> View
                </button>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* File Viewer Modal */}
      {viewingFile && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-50 flex items-center justify-center p-4 sm:p-6" onClick={() => setViewingFile(null)}>
          <div 
            className="bg-[#0f111a] rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-[0_0_50px_rgba(91,95,246,0.2)] animate-scaleIn overflow-hidden border border-slate-800"
            onClick={e => e.stopPropagation()}
          >
            {/* IDE-like Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#1a1d27] border-b border-slate-800 relative select-none">
              <div className="flex items-center gap-2 z-10 w-24">
                <div className="w-3 h-3 rounded-full bg-rose-500 hover:bg-rose-600 cursor-pointer transition-colors" onClick={() => setViewingFile(null)}></div>
                <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              </div>
              
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="flex items-center gap-2 px-4 py-1.5 bg-black/20 rounded-lg border border-white/5">
                  <Code size={14} className="text-[#2563EB]" />
                  <span className="text-xs font-mono text-slate-300">{viewingFile.name}</span>
                </div>
              </div>

              <div className="flex items-center justify-end z-10 w-24">
                <button 
                  onClick={() => setViewingFile(null)}
                  className="text-slate-400 hover:text-white transition-colors p-1"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            
            {/* File Path Bar */}
            <div className="bg-[#13151f] px-5 py-2.5 border-b border-slate-800/50 flex items-center gap-2 text-xs text-slate-500 font-mono tracking-wide">
              <span className="text-[#2563EB]">~</span> / {viewingFile.path.split('/').map((part, i, arr) => (
                <React.Fragment key={i}>
                  <span className={i === arr.length - 1 ? 'text-slate-200 font-bold' : ''}>{part}</span>
                  {i < arr.length - 1 && <span className="mx-1.5 opacity-40">/</span>}
                </React.Fragment>
              ))}
            </div>
            
            <div className="flex-1 overflow-auto bg-[#0f111a] relative custom-scrollbar">
              {/* Background Ambient Glow */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-[#5B5FF6]/5 rounded-full blur-[120px] pointer-events-none"></div>
              
              <div className="relative z-10 p-2 min-h-full">
                {loadingFile ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-4 mt-32">
                    <Loader2 size={32} className="animate-spin text-[#5B5FF6]" /> 
                    <span className="font-mono text-xs tracking-widest uppercase text-[#5B5FF6]">Loading Source...</span>
                  </div>
                ) : (
                  <SyntaxHighlighter
                    language={viewingFile.name.split('.').pop() === 'html' ? 'html' : viewingFile.name.split('.').pop() === 'jsx' || viewingFile.name.split('.').pop() === 'js' ? 'javascript' : viewingFile.name.split('.').pop()}
                    style={vscDarkPlus}
                    customStyle={{
                      margin: 0,
                      padding: '1.5rem',
                      background: 'transparent',
                      fontSize: '13.5px',
                      lineHeight: '1.6',
                      fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace"
                    }}
                    showLineNumbers={true}
                    wrapLines={true}
                  >
                    {fileContent}
                  </SyntaxHighlighter>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between mt-8 pb-10">
        <button 
          onClick={() => setActiveTab('discovery')}
          className="px-6 py-3 bg-white text-slate-700 font-bold rounded-xl shadow-sm border border-slate-200 hover:bg-slate-50 hover:shadow transition-all"
        >
          Back
        </button>
        <button 
          onClick={() => setActiveTab('project-runner')}
          className="px-8 py-3 bg-gradient-to-r from-[#5B5FF6] to-[#7B61FF] text-white font-bold rounded-xl shadow-[0_4px_14px_rgba(91,95,246,0.4)] hover:shadow-[0_6px_20px_rgba(91,95,246,0.6)] hover:-translate-y-0.5 transition-all flex items-center gap-2"
        >
          Continue <ArrowRight size={18} />
        </button>
      </div>
      
    </div>
  );
}
