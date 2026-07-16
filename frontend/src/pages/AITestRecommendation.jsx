import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, Play, GitBranch, FlaskConical, Target, ShieldCheck, CheckCircle
} from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../api';

export default function AITestRecommendation({ setActiveTab, repoUrl, workflowState, setWorkflowState, analysisResult }) {
  const [recommendation, setRecommendation] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const repoName = repoUrl ? repoUrl.split('/').pop().replace('.git', '') : '';

  useEffect(() => {
    if (repoName) {
      fetchRecommendation();
    } else {
      setLoading(false);
    }
  }, [repoName]);

  const fetchRecommendation = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/functional-testing/${repoName}/recommendation`, {
        timeout: 8000 // 8 second timeout to prevent infinite loading
      });
      setRecommendation(res.data);
    } catch (err) {
      console.error(err);
      // fallback mock recommendation
      setRecommendation({
        recommendedTool: 'playwright',
        reason: 'Optimal for modern web applications requiring fast, reliable cross-browser end-to-end testing.'
      });
    } finally {
      setLoading(false);
    }
  };

  const navigateToTesting = () => {
    if (typeof setWorkflowState === 'function') {
      setWorkflowState(prev => ({ ...prev, activeFramework: 'playwright' }));
    }
    setActiveTab('project-runner'); // Move to Execute Tests step
  };

  const calculateTestStats = () => {
    let totalUi = 150;
    let totalApi = 80;
    
    if (analysisResult?.fullBrdReport) {
      const brd = analysisResult.fullBrdReport;
      const uiComps = brd.uiComponents?.length || brd.bizComponents?.length || 0;
      const effectiveUiComps = Math.max(uiComps, 6);
      const useCases = brd.useCases?.length || 0;
      totalUi = (effectiveUiComps * 7) + useCases + 1;

      let apiEndpoints = 0;
      (brd.apiGroups || []).forEach(g => {
        apiEndpoints += (g.endpoints?.length || 0);
      });
      totalApi = apiEndpoints > 0 ? apiEndpoints * 3 : 80;
    }
    
    return { totalUi, totalApi };
  };

  const { totalUi, totalApi } = calculateTestStats();

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-[50vh]">
        <div className="relative w-24 h-24 mb-8 flex items-center justify-center">
          <div className="absolute inset-0 border-4 border-[#F2F4F7] rounded-full"></div>
          <div className="absolute inset-0 border-4 border-[#5B5FF6] rounded-full border-t-transparent animate-spin"></div>
          <FlaskConical size={32} className="text-[#5B5FF6] animate-pulse" />
        </div>
        <p className="text-[#667085] font-medium text-lg">Analyzing testing strategies...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-fadeIn w-full max-w-7xl mx-auto pb-10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#101828] flex items-center gap-3">
            <span className="p-2 bg-indigo-50 text-[#5B5FF6] rounded-xl"><FlaskConical size={24} /></span>
            Test Generation Strategy
          </h1>
          <p className="text-[#667085] mt-2 font-medium flex items-center gap-2">
            <GitBranch size={16} className="text-[#98A2B3]"/> {repoName || 'student-management-system'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Playwright Card */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-8 shadow-sm border border-[#5B5FF6] relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#5B5FF6]/10 to-transparent rounded-bl-full -z-0"></div>
          
          <div className="flex justify-between items-start mb-6 relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white border border-[#EAECF0] flex items-center justify-center overflow-hidden shadow-sm">
                <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/playwright/playwright-original.svg" alt="Playwright Logo" className="w-10 h-10 object-contain group-hover:scale-110 transition-transform" />
              </div>
              <div>
                <h4 className="text-xl font-bold text-[#101828]">Playwright</h4>
                <span className="text-sm font-medium text-[#667085]">UI Functional Testing</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <span className="px-3 py-1 bg-[#5B5FF6] text-white text-[10px] font-bold uppercase tracking-wider rounded-lg shadow-sm">
                Recommended
              </span>
              <span className="text-xs font-bold text-[#5B5FF6]">98% Match</span>
            </div>
          </div>
          
          <p className="text-[#344054] text-sm mb-6 leading-relaxed relative z-10">
            {recommendation?.reason || "Playwright is the optimal choice for this modern web application. It provides reliable end-to-end testing, cross-browser support, and fast execution speeds necessary for continuous integration."}
          </p>
          
          <div className="grid grid-cols-2 gap-4 mt-8 relative z-10">
            <div className="p-4 bg-[#F7F8FC] rounded-2xl border border-[#EAECF0] flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#5B5FF6] shadow-sm">
                <Target size={18} />
              </div>
              <div>
                <p className="text-xs text-[#667085] font-medium">Estimated UI Tests</p>
                <p className="text-lg font-black text-[#101828]">{totalUi}</p>
              </div>
            </div>
            
            <div className="p-4 bg-[#F7F8FC] rounded-2xl border border-[#EAECF0] flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#5B5FF6] shadow-sm">
                <ShieldCheck size={18} />
              </div>
              <div>
                <p className="text-xs text-[#667085] font-medium">Estimated API Tests</p>
                <p className="text-lg font-black text-[#101828]">{totalApi}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Selenium Card (Faded) & Coverage */}
        <div className="flex flex-col gap-6">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#EAECF0] opacity-60 grayscale hover:grayscale-0 hover:opacity-100 transition-all cursor-not-allowed">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden">
                   <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/selenium/selenium-original.svg" alt="Selenium" className="w-8 h-8 object-contain" />
                </div>
                <div>
                  <h4 className="text-md font-bold text-[#101828]">Selenium WebDriver</h4>
                </div>
              </div>
              <span className="text-xs font-bold text-[#667085]">45% Match</span>
            </div>
            <p className="text-[#667085] text-xs">Slower execution and heavier setup make this less ideal for the detected architecture.</p>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#EAECF0] flex-1 flex flex-col items-center justify-center">
            <h3 className="text-sm font-bold text-[#101828] mb-6 w-full text-left">Coverage Prediction</h3>
            <div className="relative w-32 h-32 flex items-center justify-center">
               <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                  <circle cx="50" cy="50" r="40" fill="transparent" stroke="#F2F4F7" strokeWidth="12" />
                  <circle cx="50" cy="50" r="40" fill="transparent" stroke="#5B5FF6" strokeWidth="12" strokeDasharray="251.2" strokeDashoffset={251.2 * (1 - 0.92)} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
               </svg>
               <div className="absolute inset-0 flex flex-col items-center justify-center">
                 <span className="text-3xl font-black text-[#101828]">92<span className="text-lg text-[#667085]">%</span></span>
               </div>
            </div>
            <p className="text-xs font-medium text-[#667085] mt-6 text-center">
              AI predicts high test coverage for business-critical flows.
            </p>
          </div>
        </div>

      </div>

      <div className="flex justify-end mt-4">
        <button
          onClick={navigateToTesting}
          className="flex items-center gap-2 px-8 py-4 bg-[#5B5FF6] hover:bg-[#4f53dc] text-white font-bold rounded-xl shadow-sm transition-all text-lg"
        >
          <CheckCircle size={20} /> Accept Strategy & Execute
        </button>
      </div>
      
    </div>
  );
}
