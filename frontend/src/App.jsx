import React, { useState, useEffect } from 'react';
import { 
  Home, RefreshCw, Box, Search, Play, FileText, CheckCircle, Clock, Database, Layers, ArrowRight,
  Shield, Code, Link, Cpu, BarChart, ExternalLink, Moon, Sun, 
  Settings as SettingsIcon, LogOut, Check, ChevronDown, Download, AlertCircle, X, CheckSquare, Sparkles, Server, Map, GitMerge, List, BookOpen, Key, Eye, Layout, File, Target, FlaskConical 
} from 'lucide-react';
import { getStatus, getWorkflowStatus, getSession } from './api';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { motion } from 'framer-motion';

// Import Pages
import Dashboard from './pages/Dashboard';
import Discovery from './pages/Discovery';
import ProjectRunner from './pages/ProjectRunner';
import FunctionalTesting from './pages/FunctionalTesting';
import Settings from './pages/Settings';
import ChatbotWidget from './components/ChatbotWidget';
import Login from './pages/Login';
import AITestRecommendation from './pages/AITestRecommendation';
import Summary from './pages/Summary';

// Design Tokens for App
const T = {
  bg:        '#F7F8FC',
  card:      '#FFFFFF',
  primary:   '#5B5FF6',
  secondary: '#7B61FF',
  success:   '#12B76A',
  danger:    '#F04438',
  textPri:   '#101828',
  textSec:   '#667085',
  border:    '#EAECF0',
  radius:    '24px',
  shadow:    '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
};

const Card = ({ children, style, className = '', ...props }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, ease: 'easeOut' }}
    style={{
      background: T.card,
      borderRadius: T.radius,
      boxShadow: T.shadow,
      border: `1px solid ${T.border}`,
      ...style,
    }}
    className={className}
    {...props}
  >
    {children}
  </motion.div>
);

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [darkMode, setDarkMode] = useState(true);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  const [sessionId, setSessionId] = useState(null);
  const [sessionData, setSessionData] = useState(null);

  // Repository Analysis Page states
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisRepoUrl, setAnalysisRepoUrl] = useState('');
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);
  const [analysisStatusText, setAnalysisStatusText] = useState('');
  const [analysisElapsedTime, setAnalysisElapsedTime] = useState(0);
  const [analysisTimeTaken, setAnalysisTimeTaken] = useState(null);

  // Migration Center Page states
  const [migrationResult, setMigrationResult] = useState(null);
  const [migrationRepoUrl, setMigrationRepoUrl] = useState('');
  const [migrationTargetVersion, setMigrationTargetVersion] = useState('21');
  const [migrationLoading, setMigrationLoading] = useState(false);
  const [migrationError, setMigrationError] = useState(null);
  const [migrationStatusText, setMigrationStatusText] = useState('');
  const [migrationHistory, setMigrationHistory] = useState([]);
  const [migrationElapsedTime, setMigrationElapsedTime] = useState(0);
  const [migrationTimeTaken, setMigrationTimeTaken] = useState(null);

  // Ticking effect for analysis loading timer
  useEffect(() => {
    let intervalId;
    if (analysisLoading) {
      const startTime = Date.now();
      setAnalysisElapsedTime(0);
      intervalId = setInterval(() => {
        setAnalysisElapsedTime(((Date.now() - startTime) / 1000).toFixed(1));
      }, 100);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [analysisLoading]);

  // Ticking effect for migration loading timer
  useEffect(() => {
    let intervalId;
    if (migrationLoading) {
      const startTime = Date.now();
      setMigrationElapsedTime(0);
      intervalId = setInterval(() => {
        setMigrationElapsedTime(((Date.now() - startTime) / 1000).toFixed(1));
      }, 100);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [migrationLoading]);


  // Auto sync migration details when analysis result updates
  useEffect(() => {
    if (analysisResult && analysisResult.repoUrl) {
      setAnalysisRepoUrl(analysisResult.repoUrl);
      setMigrationRepoUrl(analysisResult.repoUrl);
      if (analysisResult.migrationRecommendation) {
        if (analysisResult.migrationRecommendation.includes('21')) {
          setMigrationTargetVersion('21');
        } else if (analysisResult.migrationRecommendation.includes('17')) {
          setMigrationTargetVersion('17');
        }
      }
    }
  }, [analysisResult]);

  // KPI STATE for persistent cards
  const [status, setStatus] = useState({ ragInitialized: false, ragMessage: '', provider: '' });
  const [stats, setStats] = useState({ reposAnalyzed: 0, migrationsRun: 0, filesConverted: 0 });
  const [migrations, setMigrations] = useState([]);

  const [workflowState, setWorkflowState] = useState({ analysisCompleted: false, runnerCompleted: false });

  // Session Hydration
  useEffect(() => {
    if (!sessionId) return;
    getSession(sessionId).then(data => {
      if (data) {
        setSessionData(data);
        if (data.analysisResult) setAnalysisResult(data.analysisResult);
        if (data.repoUrl) {
          setAnalysisRepoUrl(data.repoUrl);
          setMigrationRepoUrl(data.repoUrl);
        }
        if (data.workflowState) {
          setWorkflowState(prev => ({
             ...prev, 
             analysisCompleted: data.workflowState.analysisCompleted || prev.analysisCompleted,
             runnerCompleted: data.workflowState.runnerCompleted || prev.runnerCompleted
          }));
        }
        if (data.migrationResult) setMigrationResult(data.migrationResult);
        if (data.stats) setStats(data.stats);
        if (data.migrations) setMigrations(data.migrations);
      }
    }).catch(console.error);
  }, [sessionId, activeTab]);

  useEffect(() => {
    const fetchStatus = () => {
      getStatus()
        .then(data => setStatus(data))
        .catch(() => setStatus({ ragInitialized: false, ragMessage: 'Disconnected', provider: '' }));
    };
    
    const fetchWorkflow = async () => {
      if (analysisRepoUrl) {
        const repoName = analysisRepoUrl.split('/').pop().replace('.git', '');
        try {
          const ws = await getWorkflowStatus(repoName);
          setWorkflowState(prev => ({
            ...prev,
            analysisCompleted: ws.analysisCompleted || prev.analysisCompleted,
            runnerCompleted: ws.runnerCompleted || prev.runnerCompleted
          }));
        } catch (e) {
          // Ignore
        }
      }
    };

    fetchStatus();
    fetchWorkflow();
    const interval = setInterval(() => {
      fetchStatus();
      fetchWorkflow();
    }, 5000);
    return () => clearInterval(interval);
  }, [analysisRepoUrl, activeTab]);

  // Compute KPI values
  const normalizedMigrations = migrations.map(m => {
    if (m.repoUrl && !m.repo) {
      const repoName = m.repoUrl.split('/').pop()?.replace('.git', '') || m.repoUrl;
      const statusStr = (m.success || m.buildStatus === 'Success' || m.buildStatus === 'Build Success') ? 'Success' : (m.buildStatus === 'Running' || m.buildStatus === 'PENDING' ? 'Running' : 'Failed');
      return {
        ...m,
        repo: repoName,
        status: statusStr,
      };
    }
    return m;
  });

  const applied = normalizedMigrations.filter(m => m.status === 'Success').length || 0;
  const failed = normalizedMigrations.filter(m => m.status === 'Failed').length || 0;
  const inProgress = normalizedMigrations.filter(m => m.status === 'Running').length || 0;
  const total = applied + failed + inProgress;
  const successRate = total > 0 ? Math.round((applied / total) * 100) : 0;

  // Wizard Nodes for Sidebar
  const wizardNodes = [
    { id: 'dashboard', label: 'Connect Repository', number: '1' },
    { id: 'discovery', label: 'Project Discovery', number: '2' },
    { id: 'test-recommendation', label: 'Testing Strategy', number: '3' },
    { id: 'project-runner', label: 'Execute Tests', number: '4' },
    { id: 'results', label: 'Test Results', number: '5' },
    { id: 'summary', label: 'Reports & Downloads', number: '6' }
  ];

  const renderContent = () => {
    return (
      <>
        <div className={activeTab === 'dashboard' ? 'block h-full w-full' : 'hidden'}>
          <Dashboard 
            setActiveTab={setActiveTab} 
            setAnalysisRepoUrl={setAnalysisRepoUrl}
            setAnalysisResult={setAnalysisResult}
            sessionId={sessionId}
            setSessionId={setSessionId}
          />
        </div>
        <div className={activeTab === 'settings' ? 'block h-full w-full' : 'hidden'}>
          <Settings />
        </div>
        <div className={activeTab === 'discovery' ? 'block h-full w-full' : 'hidden'}>
          <Discovery
            setActiveTab={setActiveTab}
            repoUrl={analysisRepoUrl}
            setRepoUrl={setAnalysisRepoUrl}
            loading={analysisLoading}
            setLoading={setAnalysisLoading}
            result={analysisResult}
            setResult={setAnalysisResult}
            error={analysisError}
            setError={setAnalysisError}
            statusText={analysisStatusText}
            setStatusText={setAnalysisStatusText}
            elapsedTime={analysisElapsedTime}
            timeTaken={analysisTimeTaken}
            setTimeTaken={setAnalysisTimeTaken}
            workflowState={workflowState}
            setWorkflowState={setWorkflowState}
            sessionId={sessionId}
            setSessionId={setSessionId}
          />
        </div>
        <div className={activeTab === 'test-recommendation' ? 'block h-full w-full' : 'hidden'}>
          <AITestRecommendation
            setActiveTab={setActiveTab}
            repoUrl={migrationRepoUrl}
            workflowState={workflowState}
            setWorkflowState={setWorkflowState}
            analysisResult={analysisResult}
            sessionId={sessionId}
          />
        </div>
        <div className={activeTab === 'project-runner' ? 'block h-full w-full' : 'hidden'}>
          <ProjectRunner
            setActiveTab={setActiveTab}
            repoUrl={migrationRepoUrl}
            analysisResult={analysisResult}
            sessionId={sessionId}
          />
        </div>
        <div className={(activeTab === 'results' || activeTab === 'testing') ? 'block h-full w-full' : 'hidden'}>
          <FunctionalTesting
            setActiveTab={setActiveTab}
            repoUrl={migrationRepoUrl}
            analysisResult={analysisResult}
            result={migrationResult}
            workflowState={workflowState}
            setWorkflowState={setWorkflowState}
            sessionId={sessionId}
          />
        </div>
        <div className={activeTab === 'summary' ? 'block h-full w-full' : 'hidden'}>
          <Summary repoUrl={analysisRepoUrl || migrationRepoUrl} sessionId={sessionId} setActiveTab={setActiveTab} />
        </div>
      </>
    );
  };

  if (!isLoggedIn) {
    return <Login onLogin={(user) => { setIsLoggedIn(true); setCurrentUser(user); }} />;
  }

  return (
    <div className="flex h-screen bg-[#F7F8FC] font-sans text-[#101828] overflow-hidden">
      
      {/* ── LEFT SIDEBAR ── */}
      <aside className="w-64 bg-white border-r border-[#EAECF0] flex flex-col z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)] flex-shrink-0">
        <div className="p-6 pb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#5B5FF6] rounded-xl flex items-center justify-center text-white shadow-sm">
              <Sparkles size={20} />
            </div>
            <div>
              <h1 className="font-black text-2xl text-[#101828] leading-tight tracking-tight">PROVA</h1>
              <p className="text-[9px] text-[#667085] uppercase tracking-[0.15em] font-bold">AI Testing Platform</p>
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto px-4 flex flex-col gap-2 custom-scrollbar">
          {wizardNodes.map((node, index) => {
            const isActive = activeTab === node.id;
            
            // Allow clicking based on workflow state. We preserve the original lock logic.
            const currentIndex = wizardNodes.findIndex(n => n.id === activeTab);
            let isLocked = false;
            let lockedReason = '';
            if ((node.id === 'test-recommendation' || node.id === 'project-runner' || node.id === 'results') && !workflowState.analysisCompleted) {
              isLocked = true;
              lockedReason = 'Complete Repository Analysis before accessing this step.';
            }

            let nodeStyle = isActive 
              ? "bg-[#F7F8FF] text-[#5B5FF6]" 
              : "bg-transparent text-[#475467] hover:bg-[#F9FAFB]";

            let iconStyle = isActive
              ? "bg-[#5B5FF6] text-white"
              : "bg-[#F2F4F7] text-[#667085]";
              
            return (
              <div 
                key={node.id}
                onClick={() => {
                  if (isLocked) {
                    alert(lockedReason);
                    return;
                  }
                  setActiveTab(node.id);
                }}
                className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl cursor-pointer transition-colors ${nodeStyle} ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                title={isLocked ? lockedReason : ''}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${iconStyle}`}>
                  {node.number}
                </div>
                <span className={`font-bold text-[13px] ${isActive ? 'text-[#5B5FF6]' : 'text-[#344054]'}`}>{node.label}</span>
              </div>
            );
          })}
        </div>

        <div className="p-6 mt-auto">
          <div className="bg-[#F9FAFB] rounded-2xl p-5 border border-[#EAECF0]">
            <h4 className="text-[13px] font-black text-[#101828] mb-1.5">Need Help?</h4>
            <p className="text-xs text-[#667085] mb-4 leading-relaxed font-medium">
              We're here to help you at every step.
            </p>
            <button className="w-full py-2.5 bg-white border border-[#EAECF0] rounded-xl text-xs font-bold text-[#344054] shadow-sm hover:text-[#5B5FF6] hover:border-[#5B5FF6] transition-colors">
              Contact Support
            </button>
          </div>
        </div>
      </aside>

      {/* ── MAIN CONTENT PANE ── */}
      <main className="flex-1 h-full overflow-y-auto bg-[#F7F8FC] flex flex-col relative">
        {/* Top Header / Actions */}
        <header className="h-16 flex items-center justify-between px-8 border-b border-[#EAECF0] bg-white sticky top-0 z-10">
          <div className="flex-1"></div>
          
          <div className="flex-1 flex justify-center">
            {/* Heading tag removed as requested */}
          </div>

          <div className="flex-1 flex items-center justify-end gap-5">
             <button className="text-[#667085] hover:text-[#5B5FF6] transition-colors">
               <Clock size={18} />
             </button>
             <button className="text-[#667085] hover:text-[#5B5FF6] transition-colors relative">
               <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
               <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
             </button>
             
             <div className="relative">
               <div 
                 className="flex items-center gap-3 cursor-pointer pl-4 border-l border-[#EAECF0] hover:bg-slate-50 py-1.5 px-2 rounded-lg transition-colors"
                 onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
               >
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#A5B4FC] to-[#5B5FF6] flex items-center justify-center text-white font-bold text-xs shadow-sm uppercase shrink-0">
                  {currentUser ? currentUser.substring(0, 2) : 'A'}
                </div>
                <div className="flex-col min-w-0 hidden md:flex">
                  <p className="text-xs font-bold text-[#101828] leading-tight capitalize truncate">{currentUser || 'Admin'}</p>
                  <p className="text-[10px] font-medium text-[#667085] truncate">Administrator</p>
                </div>
                <ChevronDown size={14} className={`text-[#667085] transition-transform ${isProfileDropdownOpen ? 'rotate-180' : ''}`} />
               </div>

               {/* Dropdown Menu */}
               {isProfileDropdownOpen && (
                 <>
                   <div 
                     className="fixed inset-0 z-40" 
                     onClick={() => setIsProfileDropdownOpen(false)}
                   ></div>
                   <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-[#EAECF0] py-2 z-50 animate-scaleIn origin-top-right">
                     <div className="px-4 py-3 border-b border-[#EAECF0]">
                       <p className="text-sm font-bold text-[#101828] truncate">{currentUser || 'Admin'}</p>
                       <p className="text-xs text-[#667085] truncate mt-0.5">{currentUser ? `${currentUser.toLowerCase()}@prova.ai` : 'admin@prova.ai'}</p>
                     </div>
                     <div className="py-2">
                       <button 
                         onClick={() => { setIsProfileDropdownOpen(false); setActiveTab('settings'); }} 
                         className="w-full text-left px-4 py-2 text-sm text-[#344054] hover:bg-[#F9FAFB] hover:text-[#5B5FF6] flex items-center gap-2 transition-colors"
                       >
                         <SettingsIcon size={16} /> Settings
                       </button>
                     </div>
                     <div className="border-t border-[#EAECF0] py-2">
                       <button 
                         onClick={() => { setIsProfileDropdownOpen(false); setIsLoggedIn(false); setCurrentUser(''); }} 
                         className="w-full text-left px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors font-semibold"
                       >
                         <LogOut size={16} /> Sign out
                       </button>
                     </div>
                   </div>
                 </>
               )}
             </div>
          </div>
        </header>

        <div className="flex-1 p-6 w-full flex flex-col">
          {renderContent()}
        </div>
        <ChatbotWidget sessionId={sessionId} />
      </main>
    </div>
  );
}

