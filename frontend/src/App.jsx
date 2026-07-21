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
  const [analysisLocalPath, setAnalysisLocalPath] = useState(null);
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
    }).catch(err => {
      if (err?.response?.status === 404) {
        localStorage.removeItem('assistant_session_id');
        setSessionId(null);
      }
    });
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
            setAnalysisLocalPath={setAnalysisLocalPath}
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
            localPath={analysisLocalPath}
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
            repoUrl={analysisRepoUrl || migrationRepoUrl}
            workflowState={workflowState}
            setWorkflowState={setWorkflowState}
            analysisResult={analysisResult}
            sessionId={sessionId}
          />
        </div>
        <div className={activeTab === 'project-runner' ? 'block h-full w-full' : 'hidden'}>
          <ProjectRunner
            setActiveTab={setActiveTab}
            repoUrl={analysisRepoUrl || migrationRepoUrl}
            analysisResult={analysisResult}
            sessionId={sessionId}
            workflowState={workflowState}
            setWorkflowState={setWorkflowState}
          />
        </div>
        <div className={(activeTab === 'results' || activeTab === 'testing') ? 'block h-full w-full' : 'hidden'}>
          <FunctionalTesting
            setActiveTab={setActiveTab}
            repoUrl={analysisRepoUrl || migrationRepoUrl}
            analysisResult={analysisResult}
            result={migrationResult}
            workflowState={workflowState}
            setWorkflowState={setWorkflowState}
            sessionId={sessionId}
          />
        </div>
        <div className={activeTab === 'summary' ? 'block h-full w-full' : 'hidden'}>
          <Summary repoUrl={analysisRepoUrl || migrationRepoUrl} sessionId={sessionId} setActiveTab={setActiveTab} workflowState={workflowState} />
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
      <aside className="w-[340px] bg-white border-r border-[#EAECF0] flex flex-col z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)] flex-shrink-0 relative overflow-hidden">
        
        {/* Subtle background pattern */}
        <div className="absolute inset-0 z-0 opacity-40 pointer-events-none" style={{
          backgroundImage: `
            linear-gradient(to right, #f1f5f9 1px, transparent 1px),
            linear-gradient(to bottom, #f1f5f9 1px, transparent 1px)
          `,
          backgroundSize: '24px 24px',
          backgroundPosition: 'center center'
        }}></div>

        <div className="relative z-10 flex flex-col h-full">
          {/* Logo Section */}
          <div className="p-7 pb-4">
            <div className="flex items-center gap-4">
              <div className="w-[52px] h-[52px] rounded-2xl flex items-center justify-center text-white shadow-[0_4px_12px_rgba(91,95,246,0.3)] border border-[#5B5FF6]/20 bg-gradient-to-br from-[#7B61FF] to-[#5B5FF6] relative overflow-hidden">
                 <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white z-10">
                   <path d="M12 1L15 9L23 12L15 15L12 23L9 15L1 12L9 9L12 1Z" fill="currentColor" stroke="rgba(255,255,255,0.8)" strokeWidth="1" strokeLinejoin="round"/>
                 </svg>
              </div>
              <div>
                <h1 className="font-black text-[32px] text-[#101828] leading-none tracking-tight">PROVA</h1>
                <p className="text-[10px] text-[#5B5FF6] uppercase tracking-[0.2em] font-bold mt-1">AI Testing Platform</p>
              </div>
            </div>
          </div>
          
          {/* Dynamic Project Header (Only shows if a repo is connected) */}
          {analysisRepoUrl && (
            <div className="px-6 mb-6 mt-2">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex flex-col gap-2.5 shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between relative z-10">
                  <span className="text-[10px] text-slate-500 font-black uppercase tracking-[0.15em]">Live Project</span>
                  <div className="flex items-center gap-1.5 bg-red-50 px-2 py-0.5 rounded border border-red-100">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div>
                    <span className="text-[9px] text-red-600 font-bold uppercase tracking-wider">Recording</span>
                  </div>
                </div>
                <div className="text-[13px] font-black text-slate-800 truncate tracking-wide relative z-10">
                  {analysisRepoUrl.split('/').pop().replace('.git', '')}
                </div>
              </div>
            </div>
          )}
          
          {/* Workflow Steps */}
          <div className="flex-1 overflow-y-auto px-6 pb-10 flex flex-col custom-scrollbar relative z-10">
            {wizardNodes.map((node, index) => {
              const currentIndex = wizardNodes.findIndex(n => n.id === activeTab);
              const nodeIndex = index;
              
              let state = 'upcoming';
              if (nodeIndex < currentIndex) state = 'completed';
              else if (nodeIndex === currentIndex) state = 'in-progress';
              
              let isLocked = false;
              let lockedReason = '';
              if ((node.id === 'test-recommendation' || node.id === 'project-runner' || node.id === 'results') && !workflowState.analysisCompleted) {
                isLocked = true;
                lockedReason = 'Complete Repository Analysis before accessing this step.';
              }

              const isLast = index === wizardNodes.length - 1;

              // STYLING BASED ON STATE
              let containerStyle = "bg-white border-slate-200";
              let iconBg = "bg-slate-100 border-slate-200 text-slate-400";
              let titleStyle = "text-slate-400";
              let lineStyle = "bg-slate-200";
              let statusText = "UPCOMING";
              let statusColor = "text-slate-400";

              if (state === 'completed') {
                containerStyle = "bg-emerald-50/50 border-emerald-200 shadow-sm";
                iconBg = "bg-emerald-100 border-emerald-300 text-emerald-600";
                titleStyle = "text-emerald-900";
                lineStyle = "bg-emerald-300";
                statusText = "COMPLETED";
                statusColor = "text-emerald-600";
              } else if (state === 'in-progress') {
                containerStyle = "bg-indigo-50/50 border-[#5B5FF6]/30 shadow-[0_4px_20px_rgba(91,95,246,0.1)] transform scale-[1.02]";
                iconBg = "bg-gradient-to-br from-[#7B61FF] to-[#5B5FF6] border-[#5B5FF6] text-white shadow-md";
                titleStyle = "text-[#101828]";
                lineStyle = "bg-slate-200";
                statusText = "IN PROGRESS";
                statusColor = "text-[#5B5FF6]";
              }

              return (
                <div key={node.id} className={`relative mb-5 group ${isLocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`} onClick={() => {
                  if (isLocked) { alert(lockedReason); return; }
                  setActiveTab(node.id);
                }}>
                  {!isLast && (
                    <div className={`absolute top-[48px] bottom-[-24px] left-[27px] w-[2px] z-0 ${lineStyle}`}></div>
                  )}
                  
                  <div className={`relative z-10 backdrop-blur-xl border rounded-[20px] p-4 flex flex-col transition-all duration-300 ${containerStyle}`}>
                    
                    {state === 'in-progress' && (
                      <div className="absolute bottom-0 left-0 h-1 w-full bg-indigo-100 rounded-b-[20px] overflow-hidden">
                        <div className="h-full bg-[#5B5FF6] w-1/3 rounded-full animate-[slideRight_1.5s_ease-in-out_infinite_alternate]"></div>
                      </div>
                    )}

                    <div className="flex items-start justify-between relative z-10">
                       <div className="flex items-center gap-4">
                         <div className={`w-12 h-12 rounded-full border flex items-center justify-center shrink-0 transition-colors ${iconBg}`}>
                           {state === 'completed' ? <Check size={20} strokeWidth={3} /> : <span className="font-black text-[17px]">{node.number}</span>}
                         </div>
                         <span className={`font-black text-[15px] tracking-wide ${titleStyle}`}>{node.label}</span>
                       </div>
                       <div className="flex flex-col items-end gap-1.5 shrink-0 pt-1">
                         <span className={`text-[10px] font-bold tracking-widest uppercase ${statusColor}`}>{statusText}</span>
                         {node.id === 'dashboard' && <BookOpen size={18} className={statusColor} />}
                         {node.id === 'discovery' && <Map size={18} className={statusColor} />}
                         {node.id === 'test-recommendation' && <Target size={18} className={statusColor} />}
                         {node.id === 'project-runner' && <Play size={18} className={statusColor} />}
                         {node.id === 'results' && <FlaskConical size={18} className={statusColor} />}
                         {node.id === 'summary' && <Download size={18} className={statusColor} />}
                       </div>
                    </div>
                  </div>
                </div>
              );
            })}
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

