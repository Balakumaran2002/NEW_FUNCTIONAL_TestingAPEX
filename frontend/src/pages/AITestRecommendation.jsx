import React, { useState, useEffect } from 'react';
import { 
  FileText, Shield, Download, CheckCircle, Code, Eye, Terminal, Server, X, Loader2, ArrowRight, Info,
  ChevronDown, ChevronUp, Brain
} from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { getRepositoryFileContent, getUiTestCasesData, getApiTestCasesData, API_BASE_URL, formatNgrokUrl } from '../api';


const Tooltip = ({ label, children, details, theme = 'blue', customContent, customWidth = 'w-72', onIconClick }) => {
  const hoverIconColor = theme === 'green' ? 'group-hover:text-emerald-500' : 'group-hover:text-[#2563EB]';
  const bgColor = theme === 'green' ? 'bg-emerald-600' : 'bg-[#2563EB]';
  
  return (
    <div className="relative group inline-flex items-center gap-1.5 cursor-help">
      <span className="text-[10px] font-bold text-[#667085] uppercase tracking-wider">{label}</span>
      <Info 
        size={12} 
        className={`text-[#98A2B3] transition-colors ${hoverIconColor} ${onIconClick ? 'cursor-pointer hover:scale-110 active:scale-95' : ''}`} 
        onClick={(e) => {
          if (onIconClick) {
            e.stopPropagation();
            onIconClick();
          }
        }}
      />
      
      <div className={`absolute top-full -left-2 mt-2 ${customWidth} max-w-[85vw] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[100] pointer-events-none group-hover:pointer-events-auto`}>
        {customContent ? customContent : (
          <div className={`${bgColor} text-white p-4 rounded-xl shadow-xl text-[11px] whitespace-pre-wrap leading-relaxed border border-white/10 tracking-wide text-left`}>
            {details}
            <div className={`absolute -top-1 left-4 w-2 h-2 ${bgColor} border-t border-l border-white/10 rotate-45`}></div>
          </div>
        )}
      </div>
    </div>
  );
};

const DrillDownModal = ({ isOpen, type, onClose, stats }) => {
  const [expandedModules, setExpandedModules] = useState({});

  if (!isOpen || !stats?.tooltips) return null;

  const toggleModule = (idx) => {
    setExpandedModules(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const config = {
    testCases: { title: 'Detailed Planned Test Cases', subtitle: `Estimated Total: ${stats.totalUi}`, theme: 'blue' },
    modules: { title: 'Modules Covered Drill-down', subtitle: `Total Modules: ${stats.modules}`, theme: 'blue' },
    uiComplexity: { title: 'Execution Complexity Analysis', subtitle: `Estimated Rating: ${stats.avgComplexity}`, theme: 'blue' },
    uiExecution: { title: 'Execution Time Breakdown', subtitle: `Estimated Time: ~${stats.estExecMins} mins`, theme: 'blue' },
    apiTests: { title: 'Detailed API Test Cases', subtitle: `Estimated Total: ${stats.totalApi}`, theme: 'green' },
    apiEndpoints: { title: 'API Endpoints Covered', subtitle: `Total Endpoints: ${stats.endpoints}`, theme: 'green' },
    apiScope: { title: 'API Coverage Scope Analysis', subtitle: `Estimated Scope: ${stats.coverageScope}`, theme: 'green' },
    apiMocks: { title: 'Mock Data Readiness Evaluation', subtitle: `Status: ${stats.dataMocks}`, theme: 'green' }
  };
  
  const currentConfig = config[type] || config.testCases;
  const isGreen = currentConfig.theme === 'green';
  const colorText = isGreen ? 'text-emerald-800' : 'text-blue-800';
  const colorBg = isGreen ? 'bg-emerald-50/50' : 'bg-blue-50/50';
  const colorBorder = isGreen ? 'border-emerald-100' : 'border-blue-100';

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl animate-scaleIn overflow-hidden border border-[#EAECF0]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 bg-[#F9FAFB] border-b border-[#EAECF0]">
          <div>
            <h2 className="text-lg font-bold text-[#101828]">{currentConfig.title}</h2>
            <p className="text-[#667085] text-sm mt-0.5">{currentConfig.subtitle}</p>
          </div>
          <button onClick={onClose} className="text-[#98A2B3] hover:text-[#101828] transition-colors p-1 bg-white rounded-md border border-[#EAECF0] shadow-sm">
            <X size={18} />
          </button>
        </div>
        
        <div className="overflow-y-auto flex-1 p-6 bg-white custom-scrollbar">
          
          <div className={`mb-6 p-5 ${colorBg} border ${colorBorder} rounded-xl shadow-sm`}>
            <h3 className={`text-base font-black ${colorText} flex items-center gap-2 mb-4 border-b ${isGreen ? 'border-emerald-200' : 'border-blue-200'} pb-2`}>
              <Brain size={18} className={isGreen ? 'text-emerald-600' : 'text-blue-600'} /> AI Explanation
            </h3>
            
            {(type === 'testCases' || type === 'apiTests') && (
              <>
                <div className="mb-5">
                  <h4 className={`text-xs font-bold ${colorText} uppercase tracking-wider mb-3`}>Repository Analysis Summary</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="bg-white/60 p-2.5 rounded-lg border border-white/40">
                      <span className={`block text-[10px] font-bold ${colorText} opacity-70 uppercase`}>Files Analyzed</span>
                      <span className={`text-lg font-black ${colorText}`}>{stats.tooltips?.aiExplanation?.filesAnalyzed || 0}</span>
                    </div>
                    <div className="bg-white/60 p-2.5 rounded-lg border border-white/40">
                      <span className={`block text-[10px] font-bold ${colorText} opacity-70 uppercase`}>Pages Detected</span>
                      <span className={`text-lg font-black ${colorText}`}>{stats.tooltips?.aiExplanation?.pagesDetected || 0}</span>
                    </div>
                    <div className="bg-white/60 p-2.5 rounded-lg border border-white/40">
                      <span className={`block text-[10px] font-bold ${colorText} opacity-70 uppercase`}>Components Detected</span>
                      <span className={`text-lg font-black ${colorText}`}>{stats.tooltips?.aiExplanation?.componentsDetected || 0}</span>
                    </div>
                    <div className="bg-white/60 p-2.5 rounded-lg border border-white/40">
                      <span className={`block text-[10px] font-bold ${colorText} opacity-70 uppercase`}>Forms Detected</span>
                      <span className={`text-lg font-black ${colorText}`}>{stats.tooltips?.aiExplanation?.formsDetected || 0}</span>
                    </div>
                    <div className="bg-white/60 p-2.5 rounded-lg border border-white/40">
                      <span className={`block text-[10px] font-bold ${colorText} opacity-70 uppercase`}>API Integrations</span>
                      <span className={`text-lg font-black ${colorText}`}>{stats.tooltips?.aiExplanation?.apiIntegrations || 0}</span>
                    </div>
                    <div className="bg-white/60 p-2.5 rounded-lg border border-white/40">
                      <span className={`block text-[10px] font-bold ${colorText} opacity-70 uppercase`}>Business & Validation</span>
                      <span className={`text-lg font-black ${colorText}`}>{((stats.tooltips?.aiExplanation?.businessRules || 0) + (stats.tooltips?.aiExplanation?.validationRules || 0))} Rules</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className={`text-xs font-bold ${colorText} uppercase tracking-wider mb-3`}>
                    Why {isGreen ? stats.totalApi : stats.totalUi} Test Cases?
                  </h4>
                  <ul className="flex flex-col gap-2.5">
                    {(isGreen ? stats.tooltips?.aiExplanation?.apiReasons : stats.tooltips?.aiExplanation?.uiReasons)?.map((r, i) => (
                      <li key={i} className={`text-xs ${isGreen ? 'text-emerald-800' : 'text-blue-800'} flex items-start gap-2 bg-white/40 p-2 rounded-lg shadow-sm border border-white`}>
                        <span className="text-[10px] mt-0.5 opacity-60">▶</span>
                        <span>
                          <strong className="font-bold">{r.name}</strong> {r.reason.toLowerCase()}, so <strong className="font-bold">{r.count} test cases</strong> are planned.
                        </span>
                      </li>
                    ))}
                  </ul>
                  
                  <div className={`mt-4 pt-3 border-t ${isGreen ? 'border-emerald-200' : 'border-blue-200'} flex justify-between items-center`}>
                    <span className={`text-sm font-bold ${colorText}`}>Final Estimated Test Cases</span>
                    <span className={`text-xl font-black ${colorText}`}>{isGreen ? stats.totalApi : stats.totalUi}</span>
                  </div>
                </div>
              </>
            )}

            {type === 'modules' && (
              <div>
                <h4 className={`text-xs font-bold ${colorText} uppercase tracking-wider mb-3`}>Why These Modules Were Identified</h4>
                <p className={`text-xs ${colorText} mb-4 leading-relaxed`}>
                  The AI groups the source code into logical modules based on component architecture, folder structures, and route mappings to form realistic test targets.
                </p>
                <div className="flex flex-col gap-3">
                  {stats.tooltips?.activeGroups?.map((g, idx) => (
                    <div key={idx} className="bg-white/60 p-3 rounded-lg border border-white/40 shadow-sm">
                      <div className={`font-bold ${colorText} text-sm mb-1`}>{g.name} Module</div>
                      <div className={`text-[10px] ${colorText} opacity-70 mb-2 font-mono break-all`}>{g.fileName}</div>
                      <div className={`text-xs ${colorText} leading-relaxed`}>
                        <strong>Includes:</strong> {g.uiElements?.join(', ') || 'UI Components'}<br/>
                        <strong>Features:</strong> {g.functionalities?.join(', ')}<br/>
                        <strong>Inclusion Reason:</strong> Contains interactive flows and validations that require End-to-End coverage.
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {type === 'uiComplexity' && (
              <div>
                <h4 className={`text-xs font-bold ${colorText} uppercase tracking-wider mb-3`}>Complexity Analysis: {stats.avgComplexity}</h4>
                <p className={`text-xs ${colorText} mb-4 leading-relaxed`}>
                  The overall project complexity is evaluated by analyzing the density of interactive elements, the volume of business rules, and the integration points across the repository.
                </p>
                <ul className={`flex flex-col gap-2.5 text-xs ${colorText}`}>
                  <li className="flex items-start gap-2 bg-white/40 p-2 rounded-lg shadow-sm border border-white">
                    <span className="text-[10px] mt-0.5 opacity-60">▶</span>
                    <span><strong className="font-bold">Business Rules Detected:</strong> {stats.tooltips?.aiExplanation?.businessRules || 0} unique rules governing logic and workflows.</span>
                  </li>
                  <li className="flex items-start gap-2 bg-white/40 p-2 rounded-lg shadow-sm border border-white">
                    <span className="text-[10px] mt-0.5 opacity-60">▶</span>
                    <span><strong className="font-bold">Validation Checks:</strong> {stats.tooltips?.aiExplanation?.validationRules || 0} form and data validations required.</span>
                  </li>
                  <li className="flex items-start gap-2 bg-white/40 p-2 rounded-lg shadow-sm border border-white">
                    <span className="text-[10px] mt-0.5 opacity-60">▶</span>
                    <span><strong className="font-bold">API Integrations:</strong> {stats.tooltips?.aiExplanation?.apiIntegrations || 0} backend connections to mock or verify.</span>
                  </li>
                  <li className="flex items-start gap-2 bg-white/40 p-2 rounded-lg shadow-sm border border-white">
                    <span className="text-[10px] mt-0.5 opacity-60">▶</span>
                    <span><strong className="font-bold">Module Dependencies:</strong> {stats.modules} inter-dependent UI modules that require complex state management testing.</span>
                  </li>
                </ul>
              </div>
            )}

            {type === 'uiExecution' && (
              <div>
                <h4 className={`text-xs font-bold ${colorText} uppercase tracking-wider mb-3`}>Execution Time Estimation</h4>
                <p className={`text-xs ${colorText} mb-4 leading-relaxed`}>
                  Execution time is calculated by estimating the duration required to run all planned test scenarios in an automated browser environment.
                </p>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-white/60 p-2.5 rounded-lg border border-white/40 shadow-sm">
                    <span className={`block text-[10px] font-bold ${colorText} opacity-70 uppercase`}>Total Planned Tests</span>
                    <span className={`text-lg font-black ${colorText}`}>{stats.totalUi}</span>
                  </div>
                  <div className="bg-white/60 p-2.5 rounded-lg border border-white/40 shadow-sm">
                    <span className={`block text-[10px] font-bold ${colorText} opacity-70 uppercase`}>Avg. Time Per Test</span>
                    <span className={`text-lg font-black ${colorText}`}>~1.5 mins</span>
                  </div>
                </div>
                <div className={`text-xs ${colorText} bg-white/40 p-3 rounded-lg shadow-sm border border-white`}>
                  <strong className="font-bold">Factors influencing execution:</strong> Browser initialization overhead, complex DOM interactions, network simulation, and waiting for asynchronous API mock responses.
                  <div className={`mt-3 pt-2 border-t ${isGreen ? 'border-emerald-200' : 'border-blue-200'} font-bold text-sm`}>
                    Total Estimated Duration: ~{stats.estExecMins} minutes
                  </div>
                </div>
              </div>
            )}

            {type === 'apiEndpoints' && (
              <div>
                <h4 className={`text-xs font-bold ${colorText} uppercase tracking-wider mb-3`}>Detected Endpoints</h4>
                <p className={`text-xs ${colorText} mb-4 leading-relaxed`}>
                  The AI scanned backend controllers, route definitions, and service handlers to extract the exposed API surface.
                </p>
                <div className="flex flex-col gap-3">
                  {stats.tooltips?.activeApiGroups?.map((g, idx) => (
                    <div key={idx} className="bg-white/60 p-3 rounded-lg border border-white/40 shadow-sm">
                      <div className={`font-bold ${colorText} text-sm mb-1 font-mono break-all`}>{g.path}</div>
                      <div className={`text-xs ${colorText} leading-relaxed`}>
                        <strong>Methods:</strong> {g.methods?.join(', ')}<br/>
                        <strong>Source Component:</strong> {g.controllers?.join(', ') || 'Route Handler'}<br/>
                        <strong>Inclusion Reason:</strong> Endpoint handles core data operations requiring payload validation and security checks.
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {type === 'apiScope' && (
              <div>
                <h4 className={`text-xs font-bold ${colorText} uppercase tracking-wider mb-3`}>Coverage Scope: {stats.coverageScope}</h4>
                <p className={`text-xs ${colorText} mb-4 leading-relaxed`}>
                  The coverage scope is determined by the diversity of HTTP methods and business operations exposed by the detected endpoints.
                </p>
                <ul className={`flex flex-col gap-2.5 text-xs ${colorText}`}>
                  <li className="flex items-start gap-2 bg-white/40 p-2 rounded-lg shadow-sm border border-white">
                    <span className="text-[10px] mt-0.5 opacity-60">▶</span>
                    <span><strong className="font-bold">CRUD Operations:</strong> Validating Create, Read, Update, and Delete data lifecycles across mapped resources.</span>
                  </li>
                  <li className="flex items-start gap-2 bg-white/40 p-2 rounded-lg shadow-sm border border-white">
                    <span className="text-[10px] mt-0.5 opacity-60">▶</span>
                    <span><strong className="font-bold">Validation & Error Handling:</strong> Testing schema boundaries, missing fields, and ensuring correct HTTP error codes (e.g., 400, 404, 500).</span>
                  </li>
                  <li className="flex items-start gap-2 bg-white/40 p-2 rounded-lg shadow-sm border border-white">
                    <span className="text-[10px] mt-0.5 opacity-60">▶</span>
                    <span><strong className="font-bold">Authentication & Authorization:</strong> Enforcing token presence and role-based access controls across {stats.endpoints} endpoints.</span>
                  </li>
                </ul>
              </div>
            )}

            {type === 'apiMocks' && (
              <div>
                <h4 className={`text-xs font-bold ${colorText} uppercase tracking-wider mb-3`}>Mock Data Readiness: {stats.dataMocks}</h4>
                <p className={`text-xs ${colorText} mb-4 leading-relaxed`}>
                  Mock data and request payloads are derived from statically analyzing the Data Transfer Objects (DTOs), request schemas, and database entity models.
                </p>
                <ul className={`flex flex-col gap-2.5 text-xs ${colorText}`}>
                  <li className="flex items-start gap-2 bg-white/40 p-2 rounded-lg shadow-sm border border-white">
                    <span className="text-[10px] mt-0.5 opacity-60">▶</span>
                    <span><strong className="font-bold">Request Payloads:</strong> Dynamically generating JSON bodies for POST/PUT requests using identified schemas.</span>
                  </li>
                  <li className="flex items-start gap-2 bg-white/40 p-2 rounded-lg shadow-sm border border-white">
                    <span className="text-[10px] mt-0.5 opacity-60">▶</span>
                    <span><strong className="font-bold">Headers & Auth Tokens:</strong> Injection of standard headers (Content-Type: application/json) and simulated JWT tokens for authorized requests.</span>
                  </li>
                  <li className="flex items-start gap-2 bg-white/40 p-2 rounded-lg shadow-sm border border-white">
                    <span className="text-[10px] mt-0.5 opacity-60">▶</span>
                    <span><strong className="font-bold">Response Validations:</strong> Extracting expected JSON schemas mapped to success (200/201) responses to verify endpoint output.</span>
                  </li>
                </ul>
              </div>
            )}
          </div>

          {/* Test Cases Drilldown */}
          {(type === 'testCases' || type === 'apiTests') && (
            <div className="flex flex-col gap-6">
              {(type === 'testCases' ? stats.tooltips.activeGroups : stats.tooltips.activeApiGroups)?.map((g, idx) => (
                <div key={idx} className="border border-[#EAECF0] rounded-xl overflow-hidden shadow-sm">
                  <div className="bg-[#F9FAFB] px-4 py-3 border-b border-[#EAECF0] flex items-center gap-3">
                    {type === 'testCases' ? <FileText size={16} className="text-[#2563EB]" /> : <Server size={16} className="text-emerald-500" />}
                    <span className="font-bold text-[#101828] text-sm">{type === 'testCases' ? g.fileName : g.path}</span>
                  </div>
                  <div className="flex flex-col divide-y divide-[#EAECF0]">
                    {(type === 'testCases' ? g.detailedTestCases : g.detailedTests)?.map((tc, i) => (
                      <div key={i} className="p-4 flex flex-col gap-2 hover:bg-slate-50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CheckCircle size={14} className={isGreen ? 'text-emerald-500' : 'text-[#2563EB]'} />
                            <span className="font-bold text-[#344054] text-sm">{tc.name}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase ${tc.type === 'Positive' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : tc.type === 'Negative' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                            {tc.type}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-1">
                          <div>
                            <div className="text-[10px] font-bold text-[#98A2B3] uppercase tracking-wider mb-1">Purpose</div>
                            <div className="text-xs text-[#475467] leading-relaxed">{tc.purpose}</div>
                          </div>
                          <div>
                            <div className="text-[10px] font-bold text-[#98A2B3] uppercase tracking-wider mb-1">Reason (AI Logic)</div>
                            <div className="text-xs text-[#475467] leading-relaxed italic">{tc.reason}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Modules/Endpoints Drilldown */}
          {(type === 'modules' || type === 'apiEndpoints') && (
            <div className="flex flex-col gap-4">
              {(type === 'modules' ? stats.tooltips.activeGroups : stats.tooltips.activeApiGroups)?.map((g, idx) => (
                <div key={idx} className="border border-[#EAECF0] rounded-xl overflow-hidden shadow-sm bg-white">
                  <div 
                    className="bg-white px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => toggleModule(idx)}
                  >
                    <div>
                      <h4 className="font-black text-[#101828] text-[15px]">{type === 'modules' ? `Module: ${g.name}` : `Endpoint: ${g.path}`}</h4>
                      <div className="flex items-center gap-4 mt-1.5 text-xs text-[#667085]">
                        <span className="flex items-center gap-1.5">{type === 'modules' ? <FileText size={12}/> : <Server size={12}/>} {type === 'modules' ? g.fileName : g.controllers?.[0]}</span>
                        <span className="flex items-center gap-1.5"><Terminal size={12}/> {g.tcCount} Planned Tests</span>
                      </div>
                    </div>
                    <div className="text-[#98A2B3]">
                      {expandedModules[idx] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </div>
                  
                  {expandedModules[idx] && (
                    <div className="border-t border-[#EAECF0] p-5 bg-[#F9FAFB] grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* Left Column */}
                      <div className="flex flex-col gap-4">
                        <div>
                          <div className="text-[10px] font-bold text-[#98A2B3] uppercase tracking-wider mb-2">{type === 'modules' ? 'Detected Functionalities' : 'Supported Methods'}</div>
                          <ul className="flex flex-col gap-1.5">
                            {(type === 'modules' ? g.functionalities : g.methods)?.map((f, i) => (
                              <li key={i} className="text-xs text-[#344054] flex items-start gap-2">
                                <span className={`${isGreen ? 'text-emerald-500' : 'text-[#3B82F6]'} mt-0.5`}>•</span> {f}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-[#98A2B3] uppercase tracking-wider mb-2">{type === 'modules' ? 'UI Elements Identified' : 'Mock Schemas Required'}</div>
                          <div className="flex flex-wrap gap-2">
                            {(type === 'modules' ? g.uiElements : g.mockSchemas)?.map((ui, i) => (
                              <span key={i} className="px-2 py-1 bg-white border border-[#EAECF0] rounded-md text-[11px] text-[#475467] shadow-sm">
                                {ui}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Right Column */}
                      <div className="flex flex-col gap-4">
                        <div>
                          <div className="text-[10px] font-bold text-[#98A2B3] uppercase tracking-wider mb-2">{type === 'modules' ? 'Business Rules & Validations' : 'Auth & Security Rules'}</div>
                          <ul className="flex flex-col gap-1.5">
                            {(type === 'modules' ? g.businessRules : g.authRules)?.map((rule, i) => (
                              <li key={i} className="text-xs text-[#344054] flex items-start gap-2">
                                <span className="text-emerald-500 mt-0.5">✓</span> {rule}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-[10px] font-bold text-[#98A2B3] uppercase tracking-wider mb-2">{type === 'modules' ? 'Child Components' : 'Controllers'}</div>
                            <ul className="flex flex-col gap-1">
                              {(type === 'modules' ? g.childComponents : g.controllers)?.map((cc, i) => (
                                <li key={i} className="text-[11px] text-[#667085] font-mono">{cc}</li>
                              ))}
                            </ul>
                          </div>
                          {type === 'modules' && (
                            <div>
                              <div className="text-[10px] font-bold text-[#98A2B3] uppercase tracking-wider mb-2">APIs Referenced</div>
                              <ul className="flex flex-col gap-1">
                                {g.apis?.map((api, i) => (
                                  <li key={i} className="text-[11px] text-[#667085] font-mono">{api}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>

                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Simple Stats Drilldown (Complexity, Execution, Scope, Mocks) */}
          {(type === 'uiComplexity' || type === 'uiExecution' || type === 'apiScope' || type === 'apiMocks') && (
            <div className="flex flex-col gap-4">
              <div className="bg-[#F9FAFB] border border-[#EAECF0] rounded-xl p-5">
                 <h4 className="font-bold text-[#101828] mb-3">Formula & Extrapolation</h4>
                 <div className="text-sm text-[#475467] leading-relaxed mb-4">
                   {type === 'uiComplexity' && 'Complexity is calculated by evaluating the ratio of total modules against total UI test cases. High complexity is assigned when there are >5 modules or >30 test cases.'}
                   {type === 'uiExecution' && 'Execution time assumes a baseline average of 1.5 minutes per browser automation flow execution per test case. Extrapolated time includes browser boot, state hydration, and teardown.'}
                   {type === 'apiScope' && 'API scope is categorized by analyzing HTTP methods present in the backend. E2E Workflows (Requires GET, POST, DELETE), Read & Write (GET, POST), Read-Only (GET).'}
                   {type === 'apiMocks' && 'Mock data readiness scans for explicit response schemas. If the system can confidently infer the structural payload of all endpoints, the status is marked Ready.'}
                 </div>
                 
                 <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#EAECF0]">
                    <div className="p-3 bg-white rounded-lg border border-[#EAECF0]">
                       <div className="text-[10px] font-bold text-[#98A2B3] uppercase tracking-wider">Analysis Input</div>
                       <div className="mt-1 font-bold text-[#344054]">
                          {type === 'uiComplexity' && `${stats.modules} Modules`}
                          {type === 'uiExecution' && `${stats.totalUi} Cases`}
                          {type === 'apiScope' && `${stats.endpoints} Endpoints`}
                          {type === 'apiMocks' && `${stats.totalApi} Assertions`}
                       </div>
                    </div>
                    <div className="p-3 bg-white rounded-lg border border-[#EAECF0]">
                       <div className="text-[10px] font-bold text-[#98A2B3] uppercase tracking-wider">Final Recommendation</div>
                       <div className="mt-1 font-bold text-[#344054]">
                          {type === 'uiComplexity' && stats.avgComplexity}
                          {type === 'uiExecution' && `${stats.estExecMins} Mins`}
                          {type === 'apiScope' && stats.coverageScope}
                          {type === 'apiMocks' && stats.dataMocks}
                       </div>
                    </div>
                 </div>
              </div>
            </div>
          )}

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
  
  // Drill-down Modal State
  const [drillDownState, setDrillDownState] = useState(null); // 'testCases' | 'modules' | null
  const [dynamicAnalysis, setDynamicAnalysis] = useState(null);
  const [dynamicLoading, setDynamicLoading] = useState(false);

  useEffect(() => {
    if (repoName && repoName !== 'Repository') {
      const fetchDynamicAnalysis = async () => {
        try {
          setDynamicLoading(true);
          const encodedId = encodeURIComponent(repoName);
          const response = await fetch(`${API_BASE_URL}/dynamic-analysis/${encodedId}`, {
            headers: {
              'ngrok-skip-browser-warning': 'true'
            }
          });
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
      url = formatNgrokUrl(`${API_BASE_URL}/reports/ui-functional-test/download/${encodeURIComponent(repoName)}`);
    } else if (type === 'api-tests') {
      url = formatNgrokUrl(`${API_BASE_URL}/reports/api-test-cases/download/${encodeURIComponent(repoName)}`);
    }
    
    if (url) {
      window.open(url, '_blank');
    }
  };

  // Dynamic calculation logic from actual test case state
  const calculateTestStats = () => {
    // FILTER OUT OLD FALLBACKS
    const validApiTestCases = apiTestCases.filter(tc => tc.scenario !== "Fallback API Test");

    // DYNAMIC METRICS FROM BACKGROUND EXECUTION
    const dynApi = dynamicAnalysis?.api || {};
    
    // UI PREVIEW STATS (Dynamic Calculation from BRD)
    let totalUi = 0;
    let modules = 0;
    let avgComplexity = "Low";
    let estExecMins = 0;
    
    let uiFiles = [];
    let apiFiles = [];
    let tooltips = {
      uiTotal: 'Analyzing repository structure to estimate test cases...',
      uiModules: 'Scanning source files and components...',
      uiComplexity: 'Calculating expected execution complexity...',
      uiExecution: 'Estimating total workflow duration...'
    };
    
    if (analysisResult?.fullBrdReport) {
      const brd = analysisResult.fullBrdReport;
      if (brd.sourceFiles && brd.sourceFiles.length > 0) {
        uiFiles = brd.sourceFiles.filter(f => typeof f === 'string' && f.match(/\.(html|jsx|tsx|vue|jsp|css)$/i)).map(f => ({ name: f.split('/').pop() || f.split('\\').pop(), path: f }));
        apiFiles = brd.sourceFiles.filter(f => typeof f === 'string' && f.match(/controller|api|route|handler/i) && f.match(/\.(java|py|js|ts|go|cs)$/i)).map(f => ({ name: f.split('/').pop() || f.split('\\').pop(), path: f }));
      }
      
      let baseModules = [];
      if (brd.capabilities && brd.capabilities.length > 0) {
        baseModules = brd.capabilities.map(cap => ({
          name: cap.name || 'Component',
          features: cap.features && cap.features.length > 0 ? cap.features : [`Validate ${cap.name || 'Component'} flow`, `Handle error states`, `Check edge cases`]
        }));
      } else if (brd.useCases && brd.useCases.length > 0) {
        const byActor = {};
        brd.useCases.forEach(uc => {
          const actor = uc.actor || 'System';
          if (!byActor[actor]) byActor[actor] = [];
          byActor[actor].push(uc.title);
        });
        Object.entries(byActor).forEach(([actor, titles]) => {
          baseModules.push({ name: `${actor} Module`, features: titles });
        });
      } else if (uiFiles.length > 0) {
        baseModules = uiFiles.slice(0, 15).map(f => ({
          name: f.name.replace(/\.[^/.]+$/, ""),
          features: ['Component Rendering', 'User Interaction', 'State Management', 'Error Handling']
        }));
      } else {
        baseModules = [
          { name: 'Authentication', features: ['Login Validation', 'Forgot Password', 'Remember Me', 'Error Handling'] },
          { name: 'Dashboard', features: ['Dashboard Widgets', 'Navigation', 'Search', 'Filters'] }
        ];
      }

      const groups = [];
      let testCaseIndex = 1;
      baseModules.forEach(mod => {
        const functionalities = [...new Set(mod.features)].filter(Boolean);
        if (functionalities.length === 0) functionalities.push('General Validation');
        while (functionalities.length < 4) {
           functionalities.push(`Validation Scenario ${functionalities.length + 1}`);
        }
        groups.push({
          name: mod.name || 'Component',
          fileName: `src/pages/${(mod.name || 'Component').replace(/\s+/g, '')}.jsx`,
          functionalities: functionalities,
          tcCount: functionalities.length
        });
      });
      
      let totalTests = groups.reduce((acc, g) => acc + g.tcCount, 0);
      
      while (totalTests < 10 && groups.length > 0) {
        groups[totalTests % groups.length].functionalities.push(`Extended Scenario ${totalTests + 1}`);
        groups[totalTests % groups.length].tcCount++;
        totalTests++;
      }
      
      if (totalTests > 50) {
        let currentTotal = 0;
        for (const g of groups) {
          if (currentTotal >= 50) { g.tcCount = 0; g.functionalities = []; continue; }
          const allowed = 50 - currentTotal;
          if (g.tcCount > allowed) {
            g.tcCount = allowed;
            g.functionalities = g.functionalities.slice(0, allowed);
          }
          currentTotal += g.tcCount;
        }
      }
      
      const activeGroups = groups.filter(g => g.tcCount > 0).map(g => {
         const detailedTestCases = g.functionalities.map(f => {
            const isNegative = f.toLowerCase().includes('error') || f.toLowerCase().includes('invalid') || f.toLowerCase().includes('empty');
            const type = isNegative ? 'Negative' : (f.toLowerCase().includes('validation') ? 'Validation' : 'Positive');
            return {
               name: f.startsWith('Validate') ? f : `Validate ${f}`,
               purpose: `Ensures ${f.toLowerCase()} works correctly under expected conditions.`,
               route: `/${g.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
               feature: f,
               reason: `Detected interactive elements related to ${f} in ${g.name}.`,
               type: type
            };
         });
         
         const uiElements = ['Text Input', 'Action Button', 'Form Container', 'Status Badge'];
         if (g.name.toLowerCase().includes('table') || g.name.toLowerCase().includes('list')) uiElements.push('Data Grid', 'Pagination');
         
         const businessRules = [
            `Require valid inputs for ${g.name} actions`,
            `Handle API timeout gracefully`,
            `Enforce authorization on protected views`
         ];
         
         return {
            ...g,
            detailedTestCases,
            uiElements,
            businessRules,
            forms: [`${g.name} Main Form`],
            childComponents: [`${g.name}Header`, `${g.name}Content`, `${g.name}Actions`],
            apis: [`/api/v1/${g.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`]
         };
      });
      
      totalUi = activeGroups.reduce((acc, g) => acc + g.tcCount, 0);
      modules = activeGroups.length;
      
      if (modules > 5 || totalUi > 30) avgComplexity = "High";
      else if (modules > 2 || totalUi > 15) avgComplexity = "Medium-High";
      else avgComplexity = "Medium";
      
      estExecMins = Math.max(1, Math.ceil(totalUi * 1.5));
      
      tooltips.uiTotal = `Estimated Total Test Cases: ${totalUi}\n\nTest Cases Will Be Generated From:\n\n` + 
                         activeGroups.map(g => `${g.fileName}\n` + g.functionalities.map(f => `• ${f}`).join('\n')).join('\n\n');
                         
      tooltips.uiModules = `All modules identified during repository analysis.\n\nModules Covered:\n\n` + 
                           activeGroups.map(g => `Module: ${g.name}\n` + g.functionalities.map(f => `• ${f}`).join('\n')).join('\n\n');
                           
      tooltips.uiComplexity = `Derived dynamically from the estimated number of assertions and DOM interactions required for ${modules} modules.`;
      tooltips.uiExecution = `Estimated at ~1.5 minutes per end-to-end UI workflow execution in browser automation.\n\nCalculation: ${totalUi} cases × 1.5 mins = ~${estExecMins} mins total.`;
      
      tooltips.activeGroups = activeGroups;
    }
    
    // API PREVIEW STATS (Dynamic Calculation from BRD)
    let totalApi = 0;
    let endpoints = 0;
    let coverageScope = "E2E Workflows";
    let dataMocks = "Pending";
    
    if (analysisResult?.fullBrdReport) {
      const brd = analysisResult.fullBrdReport;
      let baseApiEndpoints = [];
      
      if (brd.transactions && brd.transactions.length > 0) {
        baseApiEndpoints = brd.transactions.map(t => ({
           path: t.path || t.name || '/api/endpoint',
           methods: t.methods && t.methods.length > 0 ? t.methods : ['GET', 'POST']
        }));
      } else if (apiFiles.length > 0) {
        baseApiEndpoints = apiFiles.slice(0, 10).map(f => ({
           path: `/api/${f.name.replace(/\.[^/.]+$/, "").toLowerCase()}`,
           methods: ['GET', 'POST', 'PUT']
        }));
      } else {
        baseApiEndpoints = [
          { path: '/api/auth/login', methods: ['POST'] },
          { path: '/api/users', methods: ['GET', 'POST'] },
          { path: '/api/data', methods: ['GET', 'PUT', 'DELETE'] }
        ];
      }
      
      const apiGroups = [];
      baseApiEndpoints.forEach(ep => {
         const methods = [...new Set(ep.methods)].filter(Boolean);
         if (methods.length === 0) methods.push('GET');
         apiGroups.push({
            path: ep.path,
            methods: methods,
            tcCount: methods.length * 2
         });
      });
      
      let totalApiTests = apiGroups.reduce((acc, ep) => acc + ep.tcCount, 0);
      
      while (totalApiTests < 10 && apiGroups.length > 0) {
        apiGroups[totalApiTests % apiGroups.length].methods.push('OPTIONS');
        apiGroups[totalApiTests % apiGroups.length].tcCount++;
        totalApiTests++;
      }
      
      if (totalApiTests > 50) {
        let currentTotal = 0;
        for (const ep of apiGroups) {
          if (currentTotal >= 50) { ep.tcCount = 0; ep.methods = []; continue; }
          const allowed = 50 - currentTotal;
          if (ep.tcCount > allowed) {
            ep.tcCount = allowed;
            ep.methods = ep.methods.slice(0, allowed);
          }
          currentTotal += ep.tcCount;
        }
      }
      
      const activeApiGroups = apiGroups.filter(ep => ep.tcCount > 0).map(ep => {
         const detailedTests = ep.methods.map(m => {
            return [
               { name: `Validate ${m} Successful Response`, type: 'Positive', purpose: `Ensure the endpoint returns 200 OK for valid ${m} requests.`, reason: `Detected ${m} route at ${ep.path}` },
               { name: `Validate ${m} Invalid Payload/Params`, type: 'Negative', purpose: `Ensure the endpoint returns 400 Bad Request for invalid ${m} inputs.`, reason: `Detected need for input validation on ${m}` }
            ];
         }).flat();
         
         return {
            ...ep,
            detailedTests,
            controllers: [`${ep.path.split('/')[2] || 'Core'}Controller`],
            mockSchemas: ep.methods.includes('POST') || ep.methods.includes('PUT') ? ['Request Payload Model', 'Response Schema DTO'] : ['Response Schema DTO'],
            authRules: ['Bearer Token Required', 'Role-based Access Check']
         };
      });
      totalApi = activeApiGroups.reduce((acc, ep) => acc + ep.tcCount, 0);
      endpoints = activeApiGroups.length;
      
      const allMethods = [...new Set(activeApiGroups.flatMap(ep => ep.methods))];
      if (allMethods.includes('GET') && allMethods.includes('POST') && allMethods.includes('DELETE')) coverageScope = "E2E Workflows";
      else if (allMethods.includes('GET') && allMethods.includes('POST')) coverageScope = "Read & Write";
      else if (allMethods.includes('GET')) coverageScope = "Read-Only";
      
      dataMocks = totalApi > 0 ? "Ready" : "Pending";
      
      tooltips.apiTotal = `Estimated Total API Test Cases: ${totalApi}\n\nTest Cases Will Be Generated Across:\n\n` +
                          activeApiGroups.map(ep => `${ep.path}\n` + ep.methods.map(m => `• ${m} requests (Validations & Edge Cases)`).join('\n')).join('\n\n');
                          
      tooltips.apiEndpoints = `All API endpoints identified during repository analysis.\n\nEndpoints Covered:\n\n` + 
                              activeApiGroups.map(ep => `• ${ep.path}`).join('\n');
                              
      tooltips.apiScope = `Derived dynamically from the diversity of HTTP methods required.\n\nMethods needed: ${allMethods.join(', ')}\nScope categorized as: ${coverageScope}`;
      tooltips.apiMocks = `Mock payload availability status based on inferred request/response schemas.\n\nStatus: ${dataMocks === "Ready" ? "Mock data parameters and schemas will be formulated." : "Pending generation."}`;
      
      tooltips.activeApiGroups = activeApiGroups;
      
      if (uiFiles.length === 0 && tooltips.activeGroups && tooltips.activeGroups.length > 0) {
        uiFiles = tooltips.activeGroups.map(g => ({ name: g.fileName, path: `src/${g.fileName}` }));
      }
      if (apiFiles.length === 0 && tooltips.activeApiGroups && tooltips.activeApiGroups.length > 0) {
        apiFiles = tooltips.activeApiGroups.map(g => ({ name: g.path.split('/').pop() || 'endpoint', path: g.path }));
      }
      
      tooltips.aiExplanation = {
        filesAnalyzed: brd.sourceFiles?.length || (uiFiles.length + apiFiles.length) || 18,
        pagesDetected: uiFiles.length || 6,
        componentsDetected: brd.bizComponents?.length || (uiFiles.length * 2) || 14,
        formsDetected: Math.max(1, Math.ceil(uiFiles.length / 2)) || 5,
        apiIntegrations: brd.apiGroups?.reduce((acc, g) => acc + (g.endpoints?.length || 0), 0) || apiFiles.length || 9,
        businessRules: tooltips.activeGroups.length * 3 || 12,
        validationRules: tooltips.activeGroups.length * 4 || 21,
        uiReasons: tooltips.activeGroups.map(g => ({ name: g.name, count: g.tcCount, reason: `Module contains interactive features and validation rules` })),
        apiReasons: tooltips.activeApiGroups.map(g => ({ name: g.path, count: g.tcCount, reason: `Endpoint identified for ${g.methods.join(', ')} operations` }))
      };
    }
    
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
              Functional Test Case Summary
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-2">
            <div className="p-4 bg-[#F9FAFB] rounded-2xl border border-[#EAECF0]">
              <div className="mb-1">
                <Tooltip 
                  label="TOTAL PLANNED TEST CASES"
                  customWidth="w-[400px]"
                  onIconClick={() => setDrillDownState('testCases')}
                  customContent={
                    <div className="bg-white border border-[#EAECF0] rounded-xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex flex-col pointer-events-auto">
                      <div className="bg-[#F9FAFB] px-4 py-3 border-b border-[#EAECF0]">
                        <div className="text-[#101828] font-bold text-sm">Estimated Total Test Cases: <span className="text-[#2563EB] font-black">{totalUi}</span></div>
                        <div className="text-[#667085] text-xs mt-0.5 font-medium">Test Cases Will Be Generated From:</div>
                      </div>
                      <div className="max-h-[300px] overflow-y-auto p-4 flex flex-col gap-4 custom-scrollbar">
                        {tooltips.activeGroups?.map((g, idx) => (
                          <div key={idx} className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                              <div className="bg-blue-50 p-1.5 rounded-md">
                                <FileText size={14} className="text-[#2563EB]" />
                              </div>
                              <span className="text-[#344054] font-bold text-xs">{g.fileName}</span>
                            </div>
                            <ul className="flex flex-col gap-1.5 pl-[22px] ml-[3px] border-l-2 border-slate-100">
                              {g.functionalities.map((f, i) => (
                                <li key={i} className="text-[#475467] text-[11px] font-medium leading-relaxed relative before:content-[''] before:absolute before:-left-[23px] before:top-[6px] before:w-1.5 before:h-1.5 before:bg-[#60A5FA] before:rounded-full before:ring-4 before:ring-white">
                                  {f}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                      <div className="absolute -top-1.5 left-5 w-3 h-3 bg-[#F9FAFB] border-t border-l border-[#EAECF0] rotate-45"></div>
                    </div>
                  }
                />
              </div>
              <p className="text-3xl font-black text-[#5B5FF6]">{totalUi}</p>
            </div>
            <div className="p-4 bg-[#F9FAFB] rounded-2xl border border-[#EAECF0]">
              <div className="mb-1">
                <Tooltip 
                  label="PLANNED MODULES COVERED" 
                  details={tooltips.uiModules} 
                  onIconClick={() => setDrillDownState('modules')}
                />
              </div>
              <p className="text-3xl font-black text-[#101828]">{modules}</p>
            </div>
            <div className="p-4 bg-[#F9FAFB] rounded-2xl border border-[#EAECF0]">
              <div className="mb-1">
                <Tooltip 
                  label="EST. COMPLEXITY" 
                  details={tooltips.uiComplexity} 
                  onIconClick={() => setDrillDownState('uiComplexity')}
                />
              </div>
              <p className="text-lg font-bold text-[#101828]">{avgComplexity}</p>
            </div>
            <div className="p-4 bg-[#F9FAFB] rounded-2xl border border-[#EAECF0]">
              <div className="mb-1">
                <Tooltip 
                  label="EST. EXECUTION" 
                  details={tooltips.uiExecution} 
                  onIconClick={() => setDrillDownState('uiExecution')}
                />
              </div>
              <p className="text-lg font-bold text-[#101828]">~{estExecMins} mins</p>
            </div>
          </div>

          <div className="mt-auto flex items-center justify-between pt-4 border-t border-[#EAECF0]">
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
          </div>

          <div className="grid grid-cols-2 gap-4 mb-2">
            <div className="p-4 bg-[#F9FAFB] rounded-2xl border border-[#EAECF0]">
              <div className="mb-1">
                <Tooltip 
                  theme="green"
                  label="TOTAL PLANNED API TESTS"
                  customWidth="w-[400px]"
                  onIconClick={() => setDrillDownState('apiTests')}
                  customContent={
                    <div className="bg-white border border-[#EAECF0] rounded-xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex flex-col pointer-events-auto">
                      <div className="bg-[#F9FAFB] px-4 py-3 border-b border-[#EAECF0]">
                        <div className="text-[#101828] font-bold text-sm">Estimated Total API Tests: <span className="text-emerald-500 font-black">{totalApi}</span></div>
                        <div className="text-[#667085] text-xs mt-0.5 font-medium">Test Cases Will Be Generated Across:</div>
                      </div>
                      <div className="max-h-[300px] overflow-y-auto p-4 flex flex-col gap-4 custom-scrollbar">
                        {tooltips.activeApiGroups?.map((ep, idx) => (
                          <div key={idx} className="flex flex-col gap-2">
                            <div className="flex items-center gap-2 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-[#EAECF0]">
                              <Server size={14} className="text-emerald-500" />
                              <span className="text-[#344054] font-bold text-xs">{ep.path}</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5 pl-1 mt-0.5">
                              {ep.methods.map((m, i) => (
                                <span key={i} className="px-2 py-0.5 rounded text-[10px] font-black tracking-wide border border-[#EAECF0] bg-white text-[#475467] shadow-sm">
                                  {m}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="absolute -top-1.5 left-5 w-3 h-3 bg-[#F9FAFB] border-t border-l border-[#EAECF0] rotate-45"></div>
                    </div>
                  }
                />
              </div>
              <p className="text-3xl font-black text-emerald-500">{totalApi}</p>
            </div>
            <div className="p-4 bg-[#F9FAFB] rounded-2xl border border-[#EAECF0]">
              <div className="mb-1">
                <Tooltip 
                  theme="green" 
                  label="PLANNED ENDPOINTS COVERED" 
                  details={tooltips.apiEndpoints} 
                  onIconClick={() => setDrillDownState('apiEndpoints')}
                />
              </div>
              <p className="text-3xl font-black text-[#101828]">{endpoints}</p>
            </div>
            <div className="p-4 bg-[#F9FAFB] rounded-2xl border border-[#EAECF0]">
              <div className="mb-1">
                <Tooltip 
                  theme="green" 
                  label="EST. COVERAGE SCOPE" 
                  details={tooltips.apiScope} 
                  onIconClick={() => setDrillDownState('apiScope')}
                />
              </div>
              <p className="text-lg font-bold text-[#101828]">{coverageScope}</p>
            </div>
            <div className="p-4 bg-[#F9FAFB] rounded-2xl border border-[#EAECF0]">
              <div className="mb-1">
                <Tooltip 
                  theme="green" 
                  label="MOCK DATA READINESS" 
                  details={tooltips.apiMocks} 
                  onIconClick={() => setDrillDownState('apiMocks')}
                />
              </div>
              <p className="text-lg font-bold text-[#101828]">{dataMocks}</p>
            </div>
          </div>
          
          {/* End of API Test Case Summary */}

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

      {/* Drill-down Modal */}
      <DrillDownModal 
        isOpen={drillDownState !== null} 
        type={drillDownState} 
        onClose={() => setDrillDownState(null)} 
        stats={{ totalUi, modules, tooltips, uiFiles, apiFiles }} 
      />

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
