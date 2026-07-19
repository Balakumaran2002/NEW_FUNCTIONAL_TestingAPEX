import React, { useState, useEffect } from 'react';
import { GitBranch, Play, CheckCircle, Search, Layers, Folder, FolderOpen, File, FileText, FileCode, FileImage, FileArchive, ChevronRight, ChevronDown, Check, Activity, ShieldCheck, Box, Server, Database, Loader2, ArrowRight, Layout, X, AlertCircle, Download, AlertTriangle, Target, Briefcase, Users } from 'lucide-react';
import { analyzeRepository, getRepositoryTree, getRepositoryFileContent, API_BASE_URL } from '../api';
import { motion } from 'framer-motion';
import { JavaIcon, SpringIcon, MavenIcon } from '../components/TechIcons';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

const FileIcon = ({ type, extension, expanded }) => {
  if (type === 'folder') {
    return expanded ? <FolderOpen size={16} className="text-blue-500" /> : <Folder size={16} className="text-blue-500" />;
  }
  
  const ext = (extension || '').toLowerCase();
  if (['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'c', 'cs', 'go', 'rs', 'php', 'rb'].includes(ext)) {
    return <FileCode size={16} className="text-emerald-500" />;
  }
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'ico'].includes(ext)) {
    return <FileImage size={16} className="text-purple-500" />;
  }
  if (['zip', 'tar', 'gz', 'rar', '7z', 'jar', 'war'].includes(ext)) {
    return <FileArchive size={16} className="text-rose-500" />;
  }
  if (['json', 'xml', 'yaml', 'yml', 'md', 'txt', 'csv'].includes(ext)) {
    return <FileText size={16} className="text-amber-500" />;
  }
  
  return <File size={16} className="text-slate-400" />;
};

const TreeNode = ({ node, level = 0, onSelect, selectedPath, currentPath = '' }) => {
  const [expanded, setExpanded] = useState(level < 1);
  const isFolder = node.type === 'folder';
  const path = node.path || (currentPath ? `${currentPath}/${node.name}` : node.name);
  
  const isSelected = selectedPath === path;

  return (
    <div className="select-none">
      <div 
        onClick={() => {
          if (isFolder) {
            setExpanded(!expanded);
          } else {
            if (onSelect) onSelect(node, path);
          }
        }}
        className={`flex items-center gap-1.5 py-1.5 px-2 rounded-md transition-colors ${
          isSelected ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50 text-slate-700'
        } ${isFolder ? 'cursor-pointer' : 'cursor-pointer'}`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
      >
        <span className="w-4 h-4 flex items-center justify-center shrink-0">
          {isFolder && (
            expanded ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />
          )}
        </span>
        <FileIcon type={node.type} extension={node.extension} expanded={expanded} />
        <span className="text-base truncate font-medium">{node.name}</span>
      </div>
      
      {isFolder && expanded && node.children && (
        <div className="flex flex-col">
          {node.children.map((child, idx) => (
            <TreeNode 
              key={idx} 
              node={child} 
              level={level + 1} 
              onSelect={onSelect}
              selectedPath={selectedPath}
              currentPath={path}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default function Discovery({ 
  setActiveTab, 
  repoUrl, 
  loading, 
  setLoading, 
  result, 
  setResult, 
  error, 
  setError, 
  statusText, 
  setStatusText,
  timeTaken,
  setTimeTaken,
  workflowState,
  setWorkflowState,
  sessionId,
  setSessionId
}) {
  const [treeData, setTreeData] = useState(null);
  const [treeLoading, setTreeLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const [activeRightTab, setActiveRightTab] = useState('business');
  const [showRepoExplorer, setShowRepoExplorer] = useState(false);
  const [showTestingStrategy, setShowTestingStrategy] = useState(false);
  const [showTestCoverage, setShowTestCoverage] = useState(false);

  const fetchTreeData = async (repositoryId) => {
    setTreeLoading(true);
    try {
      const data = await getRepositoryTree(repositoryId);
      setTreeData({
        type: 'folder',
        name: repositoryId,
        children: data.nodes || []
      });
    } catch (err) {
      console.error('Failed to load repository tree.', err);
    } finally {
      setTreeLoading(false);
    }
  };

  const handleFileSelect = async (node, path) => {
    setSelectedFile({ node, path });
    setLoadingContent(true);
    try {
      const repositoryId = repoUrl.split('/').pop().replace('.git', '');
      const content = await getRepositoryFileContent(repositoryId, path);
      setFileContent(content?.content || '');
    } catch(err) {
      setFileContent('Error loading file content.');
    } finally {
      setLoadingContent(false);
    }
  };

  const handleAnalyze = async () => {
    if (!repoUrl) return;
    setLoading(true);
    setError(null);
    setStatusText('Initializing repository...');
    
    try {
      const startTime = Date.now();
      const payload = await analyzeRepository(repoUrl, (status) => {
        setStatusText(status);
      });
      const endTime = Date.now();
      
      setResult(payload.analysis);
      setSessionId(payload.sessionId);
      setTimeTaken(((endTime - startTime) / 1000).toFixed(1));
      
      if (typeof setWorkflowState === 'function') {
        setWorkflowState(prev => ({ ...prev, analysisCompleted: true }));
      }
      
      const repositoryId = repoUrl.split('/').pop().replace('.git', '');
      fetchTreeData(repositoryId);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Analysis failed');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (repoUrl && !result && !loading && !error) {
      handleAnalyze();
    } else if (result && !treeData && !treeLoading) {
       const repositoryId = repoUrl.split('/').pop().replace('.git', '');
       fetchTreeData(repositoryId);
    }
  }, [repoUrl, result]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full min-h-[60vh] relative overflow-hidden">
        {/* Ambient Glow */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[500px] h-[500px] bg-[#5B5FF6]/10 rounded-full blur-[120px] animate-pulse"></div>
        </div>

        <div className="relative flex flex-col items-center z-10">
          <div className="relative w-40 h-40 mb-12 flex items-center justify-center">
            
            {/* Outer Spinning Ring - Dash */}
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 rounded-full border-[1.5px] border-dashed border-[#5B5FF6]/30"
            ></motion.div>
            
            {/* Middle Spinning Ring - Solid with Gradient */}
            <motion.div 
              animate={{ rotate: -360 }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              className="absolute inset-4 rounded-full border-[3px] border-transparent border-t-[#5B5FF6] border-r-indigo-300"
            ></motion.div>
            
            {/* Inner Pulsing Core Glow */}
            <motion.div 
              animate={{ scale: [1, 1.25, 1], opacity: [0.4, 0.8, 0.4] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-8 bg-gradient-to-br from-[#5B5FF6] to-[#7B61FF] rounded-full blur-md"
            ></motion.div>
            
            {/* Center Orb */}
            <motion.div 
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-10 bg-white rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(91,95,246,0.4)] z-20"
            >
              <Search size={34} className="text-[#5B5FF6]" strokeWidth={2.5} />
            </motion.div>

            {/* Orbiting Satellite 1 */}
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0"
            >
              <div className="w-3.5 h-3.5 bg-indigo-400 rounded-full shadow-[0_0_12px_rgba(99,102,241,0.9)] absolute -top-1.5 left-1/2 -translate-x-1/2"></div>
            </motion.div>

            {/* Orbiting Satellite 2 */}
            <motion.div 
              animate={{ rotate: -360 }}
              transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
              className="absolute inset-[-12px]"
            >
              <div className="w-2 h-2 bg-blue-400 rounded-full shadow-[0_0_10px_rgba(96,165,250,0.9)] absolute top-1/2 -right-1 -translate-y-1/2"></div>
            </motion.div>
          </div>

          <motion.h2 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-black text-[#101828] mb-6 text-center tracking-tight drop-shadow-sm"
          >
            Analyzing Repository
          </motion.h2>
          
          <div className="relative overflow-hidden rounded-full px-8 py-3 bg-indigo-50/80 backdrop-blur-sm border border-indigo-100 shadow-inner min-w-[300px]">
            <motion.p 
              key={statusText}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-[#5B5FF6] font-bold text-center text-base uppercase tracking-wider"
            >
              {statusText || 'Mapping business logic...'}
            </motion.p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-6">
          <AlertTriangle size={32} className="text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-[#101828] mb-3">Analysis Failed</h2>
        <p className="text-red-500 mb-8 max-w-lg text-center bg-red-50 p-4 rounded-xl border border-red-100 font-medium">
          {error}
        </p>
        <button 
          onClick={handleAnalyze} 
          className="px-8 py-3 bg-[#5B5FF6] text-white rounded-xl font-bold shadow-sm hover:bg-[#4a4fcc] transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!result) return null;

  const repoName = repoUrl.split('/').pop().replace('.git', '');
  const appPurpose = result.fullBrdReport?.appPurposeDesc || result.description || 'Application purpose mapped successfully.';
  const bizComponents = result.fullBrdReport?.bizComponents || result.detectedComponents || ['Authentication', 'User Management', 'Data Processing'];
  const techStack = result.fullBrdReport?.techStackSummary || result.dependencies || ['Java', 'Spring', 'Maven', 'JUnit'];
  
  const testMetrics = result.testMetrics || { total: 0, passed: 'Not Executed', failed: 'Not Executed', type: 'Not Detected' };
  const existingTestDetails = result.existingTestDetails || { frameworks: [], languages: [], testTypes: [], testCases: [] };
  
  const uiComponents = result.fullBrdReport?.uiComponents || [];
  const testSuites = result.fullBrdReport?.testSuites && result.fullBrdReport.testSuites.length > 0 
    ? result.fullBrdReport.testSuites
    : (uiComponents.length > 0 
      ? uiComponents.map(ui => ({ name: typeof ui === 'string' ? ui : ui.name || 'Component Suite', desc: (typeof ui !== 'string' && ui.description) ? ui.description : 'UI Functional Tests' }))
      : [
          { name: 'Authentication Suite', desc: 'Login, Registration, Password Reset, JWT validation' },
          { name: 'Dashboard Analytics', desc: 'Chart rendering, Data aggregation, Date filtering' },
          { name: 'Settings Configuration', desc: 'User preferences, Role assignments, API keys' },
          { name: 'Data Export Engine', desc: 'CSV/PDF generation, Background jobs, Email delivery' }
        ]);

  const testingScope = result.fullBrdReport?.testingScope || 'The AI has formulated a comprehensive end-to-end testing strategy encompassing UI functional workflows, backend API contract verification, integration handshakes, and database transaction consistency checks.';
  const testingRecommendations = result.fullBrdReport?.testingRecommendations || `Due to complex data structures in ${repoName.replace(/_/g, ' ')}, we highly recommend executing the API functional test suite first before proceeding to UI automation.`;

  const getDynamicWorkflowSteps = () => {
    const brd = result.fullBrdReport;
    if (!brd) return null;
    
    const extractName = (obj) => {
      if (typeof obj === 'string') return obj;
      return obj?.title || obj?.name || obj?.screen || obj?.step || obj?.process || obj?.program || obj?.code || 'Business Step';
    };

    const extractDesc = (obj, defaultDesc) => {
      if (typeof obj === 'string') return defaultDesc;
      return obj?.description || obj?.desc || obj?.actor ? `Actor: ${obj?.actor}` : defaultDesc;
    };

    if (brd.keyScreenFlows && brd.keyScreenFlows.length > 0) {
      return brd.keyScreenFlows.map(flow => ({ title: extractName(flow), desc: extractDesc(flow, 'Screen Flow') }));
    }
    if (brd.activityFlows && brd.activityFlows.length > 0) {
      return brd.activityFlows.map(flow => ({ title: extractName(flow), desc: extractDesc(flow, 'Activity Flow') }));
    }
    if (brd.useCases && brd.useCases.length > 0) {
      return brd.useCases.map(uc => ({ title: extractName(uc), desc: extractDesc(uc, 'Use Case') }));
    }
    if (brd.keyTransactions && brd.keyTransactions.length > 0) {
      return brd.keyTransactions.map(t => ({ title: extractName(t), desc: extractDesc(t, 'Transaction') }));
    }
    if (brd.onlineTransactions && brd.onlineTransactions.length > 0) {
      return brd.onlineTransactions.map(t => ({ title: extractName(t), desc: extractDesc(t, 'Process') }));
    }
    
    // Fallback to synthesizing from UI components
    const uic = brd.uiComponents || [];
    if (uic.length > 0) {
      return uic.map(c => ({ title: extractName(c), desc: 'Application View' }));
    }
    return null;
  };
  
  const dynamicSteps = getDynamicWorkflowSteps();
  const workflowSteps = dynamicSteps && dynamicSteps.length > 0 ? dynamicSteps : [
      { title: 'Login', desc: 'Authenticate User' },
      { title: 'Dashboard', desc: 'View Summary & Analytics' },
      { title: 'Student Management', desc: 'Add / Update Students' },
      { title: 'Course Management', desc: 'Manage Courses & Subjects' },
      { title: 'Attendance', desc: 'Track Student Attendance' },
      { title: 'Reports', desc: 'Generate Reports' }
  ];

  const stepStyles = [
    { bg: 'bg-[#F4F3FF]', text: 'text-[#7B61FF]', icon: <Users size={20} /> },
    { bg: 'bg-[#EFF8FF]', text: 'text-[#2E90FA]', icon: <Layout size={20} /> },
    { bg: 'bg-[#ECFDF3]', text: 'text-[#12B76A]', icon: <Users size={20} /> },
    { bg: 'bg-[#FFFAEB]', text: 'text-[#F79009]', icon: <FileText size={20} /> },
    { bg: 'bg-[#FEF3F2]', text: 'text-[#F04438]', icon: <CheckCircle size={20} /> },
    { bg: 'bg-[#F9F5FF]', text: 'text-[#9E77ED]', icon: <FileText size={20} /> }
  ];

  const handleDownload = (type) => {
    let url = '';
    if (type === 'brd') {
      url = `${API_BASE_URL}/brd/download/${encodeURIComponent(repoName)}`;
    } else if (type === 'test-plan') {
      url = `${API_BASE_URL}/reports/ui-functional-test/download/${encodeURIComponent(repoName)}`;
    }
    
    if (url) {
      window.open(url, '_blank');
    }
  };
  
  return (
    <div className="flex flex-col gap-6 animate-fadeIn w-full pb-10">
      
      <div className="mb-8 mt-4">
        <h2 className="text-[22px] font-bold text-[#101828] mb-5 tracking-tight">
           Project Overview
        </h2>
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex flex-col gap-5">
            {/* Row 1 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="rounded-xl border border-slate-200 p-4 flex items-center gap-4 hover:border-[#5B5FF6] transition-colors">
                 <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                   {(!result.language || result.language.toLowerCase().includes('java')) ? <JavaIcon size={24} /> : <FileCode size={24} className="text-[#3B82F6]" />}
                 </div>
                 <div>
                   <div className="text-[11px] font-bold text-[#667085] uppercase tracking-wider mb-0.5">Language</div>
                   <div className="text-[16px] font-bold text-[#101828]">{result.language || 'Java 17'}</div>
                 </div>
              </div>
              
              <div className="rounded-xl border border-slate-200 p-4 flex items-center gap-4 hover:border-[#5B5FF6] transition-colors">
                 <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                   {(!result.framework || result.framework.toLowerCase().includes('spring')) ? <SpringIcon size={24} /> : <div className="w-6 h-6 rounded-full border-[4px] border-[#10B981]"></div>}
                 </div>
                 <div>
                   <div className="text-[11px] font-bold text-[#667085] uppercase tracking-wider mb-0.5">Framework</div>
                   <div className="text-[16px] font-bold text-[#101828]">{result.framework || 'Spring Boot / Thymeleaf 3.2.3'}</div>
                 </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4 flex items-center gap-4 hover:border-[#5B5FF6] transition-colors">
                 <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center shrink-0">
                   {(techStack.some(t => t.toLowerCase().includes('maven')) || !techStack.find(t => ['Gradle', 'npm', 'yarn'].includes(t))) ? <MavenIcon size={24} /> : <Layers size={24} className="text-[#F43F5E]" />}
                 </div>
                 <div>
                   <div className="text-[11px] font-bold text-[#667085] uppercase tracking-wider mb-0.5">Build Tool</div>
                   <div className="text-[16px] font-bold text-[#101828]">{techStack.find(t => ['Maven', 'Gradle', 'npm', 'yarn'].includes(t)) || 'Maven'}</div>
                 </div>
              </div>
            </div>
            
            {/* Row 2 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
              <div className="rounded-xl border border-slate-200 p-4 flex items-center gap-4 hover:border-[#5B5FF6] transition-colors">
                 <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
                   <Layout size={24} className="text-[#6366F1]" />
                 </div>
                 <div className="overflow-hidden">
                   <div className="text-[11px] font-bold text-[#667085] uppercase tracking-wider mb-0.5">Application Name</div>
                   <div className="text-[16px] font-bold text-[#101828] truncate w-full" title={repoName.replace(/_/g, ' ')}>{repoName.replace(/_/g, ' ') || 'Student Management System'}</div>
                 </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4 flex items-center gap-4 hover:border-[#5B5FF6] transition-colors">
                 <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center shrink-0">
                   <Box size={24} className="text-[#A855F7]" />
                 </div>
                 <div>
                   <div className="text-[11px] font-bold text-[#667085] uppercase tracking-wider mb-0.5">Packaging</div>
                   <div className="text-[16px] font-bold text-[#101828]">{result.packagingType || 'jar'}</div>
                 </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4 flex items-center gap-4 hover:border-[#5B5FF6] transition-colors">
                 <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                   <Layers size={24} className="text-[#3B82F6]" />
                 </div>
                 <div>
                   <div className="text-[11px] font-bold text-[#667085] uppercase tracking-wider mb-0.5">Module Type</div>
                   <div className="text-[16px] font-bold text-[#101828]">{result.isMultiModule ? 'Multi Module' : 'Single Module'}</div>
                 </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4 flex items-center gap-4 hover:border-[#5B5FF6] transition-colors">
                 <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                   <ShieldCheck size={24} className="text-[#10B981]" />
                 </div>
                 <div>
                   <div className="text-[11px] font-bold text-[#667085] uppercase tracking-wider mb-0.5">Risk Level</div>
                   <div className="text-[16px] font-bold text-emerald-600">{result.riskLevel || 'Low'}</div>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid Container for Side-by-Side Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8 items-stretch">
        
        {/* Business Report Summary Card */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col animate-fadeIn">
          <div className="p-6 pb-4">
            <h3 className="text-[18px] font-bold text-[#101828] flex items-center gap-2">
              <FileText size={20} className="text-[#9E77ED]" /> Business Report Summary
            </h3>
            <div className="h-0.5 w-full bg-indigo-100 mt-4 rounded-full"></div>
          </div>
          
          <div className="px-6 pb-6 flex flex-col flex-1">
               {/* EXECUTIVE SUMMARY */}
               <div className="mb-6">
                 <h4 className="text-[12px] uppercase tracking-wider font-bold text-[#667085] flex items-center gap-2 mb-3">
                   <Target size={16} className="text-[#667085]" /> EXECUTIVE SUMMARY
                 </h4>
                 <div className="bg-[#F8F5FF] rounded-2xl p-5">
                   <p className="text-[#51369B] text-[14px] leading-relaxed font-semibold">
                     {appPurpose || 'The Student Management System is designed to provide a web-based interface for educational institutions to efficiently manage student records, including their personal details and basic administrative information.'}
                   </p>
                 </div>
               </div>
               
               {/* CORE BUSINESS MODULES */}
               <div className="mb-6 flex-1">
                 <h4 className="text-[12px] uppercase tracking-wider font-bold text-[#667085] flex items-center gap-2 mb-3">
                   <Layers size={16} className="text-[#667085]" /> CORE BUSINESS MODULES
                 </h4>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                   {bizComponents.slice(0, 6).map((module, idx) => {
                     const iconMap = [<Box />, <Users />, <FileText />, <Layout />, <ShieldCheck />, <Activity />];
                     return (
                     <div key={idx} className="border border-slate-100 rounded-xl p-3.5 bg-white flex items-start gap-3 hover:border-indigo-200 transition-colors">
                       <div className="w-8 h-8 rounded-lg bg-slate-50 text-[#5B5FF6] flex items-center justify-center shrink-0">
                         {React.cloneElement(iconMap[idx % iconMap.length], { size: 16 })}
                       </div>
                       <div>
                         <div className="text-[13px] font-bold text-[#101828] leading-tight mb-1">
                           {typeof module === 'string' ? module : module.name}
                         </div>
                         <div className="text-[11px] text-[#667085] leading-snug line-clamp-2">
                           {typeof module === 'string' ? 'Critical business capability' : (module.desc || module.description || 'Critical business capability')}
                         </div>
                       </div>
                     </div>
                     )
                   })}
                 </div>
               </div>
               
               <div className="pt-4 flex justify-center">
                  <button onClick={() => handleDownload('brd')} className="px-6 py-2.5 bg-white border border-slate-200 text-[#5B5FF6] text-[14px] font-bold rounded-full hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-sm hover:shadow">
                    View Full Business Report <ChevronRight size={16} />
                  </button>
               </div>
          </div>
        </div>

        
        {/* Functional Testing Summary Card */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col animate-fadeIn">
          <div className="p-6 pb-4">
            <h3 className="text-[18px] font-bold text-[#101828] flex items-center gap-2">
              <Activity size={20} className="text-emerald-500" /> Functional Testing Summary
            </h3>
            <div className="h-0.5 w-full bg-emerald-100 mt-4 rounded-full"></div>
          </div>
          
          <div className="px-6 pb-6 flex flex-col flex-1">
               {/* EXISTING TEST COVERAGE */}
               <div className="mb-6">
                 <h4 className="text-[12px] uppercase tracking-wider font-bold text-[#667085] flex items-center gap-2 mb-3">
                   <FolderOpen size={16} className="text-[#667085]" /> EXISTING TEST COVERAGE
                 </h4>
                 <div className="grid grid-cols-2 gap-4">
                   <div className="bg-white rounded-xl p-4 border border-slate-100 flex items-center gap-4 shadow-sm hover:border-indigo-100 transition-colors">
                     <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                       <Activity size={20} className="text-[#5B5FF6]" />
                     </div>
                     <div>
                       <div className="text-[11px] uppercase font-bold text-[#667085] tracking-wider mb-0.5">Total Tests</div>
                       <div className="text-lg font-bold text-[#101828]">{testMetrics?.total ?? 0}</div>
                     </div>
                   </div>
                   <div className="bg-white rounded-xl p-4 border border-slate-100 flex items-center gap-4 shadow-sm hover:border-emerald-100 transition-colors">
                     <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                       <CheckCircle size={20} className="text-emerald-500" />
                     </div>
                     <div>
                       <div className="text-[11px] uppercase font-bold text-[#667085] tracking-wider mb-0.5">Passed</div>
                       <div className="text-lg font-bold text-[#101828]">{testMetrics?.passed ?? 'Not Available'}</div>
                     </div>
                   </div>
                   <div className="bg-white rounded-xl p-4 border border-slate-100 flex items-center gap-4 shadow-sm hover:border-rose-100 transition-colors">
                     <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center shrink-0">
                       <X size={20} className="text-rose-500" />
                     </div>
                     <div>
                       <div className="text-[11px] uppercase font-bold text-[#667085] tracking-wider mb-0.5">Failed</div>
                       <div className="text-lg font-bold text-[#101828]">{testMetrics?.failed ?? 'Not Available'}</div>
                     </div>
                   </div>
                   <div className="bg-white rounded-xl p-4 border border-slate-100 flex items-center gap-4 shadow-sm hover:border-purple-100 transition-colors">
                     <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center shrink-0">
                       <Database size={20} className="text-purple-500" />
                     </div>
                     <div className="overflow-hidden">
                       <div className="text-[11px] uppercase font-bold text-[#667085] tracking-wider mb-0.5">Testing Types</div>
                       <div className="text-[14px] font-bold text-[#101828] truncate">{testMetrics?.type ?? 'Not Detected'}</div>
                     </div>
                   </div>
                 </div>
               </div>

               {/* GENERATED TESTING SCOPE */}
               <div className="mb-6 flex-1">
                 <h4 className="text-[12px] uppercase tracking-wider font-bold text-[#667085] flex items-center gap-2 mb-3">
                   <Search size={16} className="text-[#667085]" /> GENERATED TESTING SCOPE
                 </h4>
                 <p className="text-[#344054] text-[14px] leading-relaxed font-medium">
                   {testMetrics?.aiStrategy?.testingScope || 'Testing scope is currently unavailable or AI analysis is pending.'}
                 </p>
               </div>
               
               <div className="pt-4 flex justify-center">
                  <button onClick={() => setShowTestingStrategy(true)} className="px-6 py-2.5 bg-white border border-slate-200 text-[#5B5FF6] text-[14px] font-bold rounded-full hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-sm hover:shadow">
                    View Testing Strategy <ChevronRight size={16} />
                  </button>
               </div>
          </div>
        </div>
      </div>

      <div className="flex justify-start mb-10 pl-2">
        <button 
          onClick={() => setShowRepoExplorer(true)}
          className="px-6 py-3 bg-white border border-[#E5E7EB] text-[#374151] font-bold rounded-xl shadow-sm hover:border-[#5B5FF6] hover:text-[#5B5FF6] hover:shadow-md transition-all flex items-center gap-2"
        >
          <Folder size={18} /> Open Repository Explorer
        </button>
      </div>

      <div className="flex items-center justify-between pb-10">
        <button 
          onClick={() => setActiveTab('connect')}
          className="px-6 py-3 bg-white text-slate-700 font-bold rounded-xl shadow-sm border border-slate-200 hover:bg-slate-50 hover:shadow transition-all"
        >
          Back
        </button>
        <button 
          onClick={() => setActiveTab('test-recommendation')}
          className="px-8 py-3 bg-gradient-to-r from-[#5B5FF6] to-[#7B61FF] text-white font-bold rounded-xl shadow-[0_4px_14px_rgba(91,95,246,0.4)] hover:shadow-[0_6px_20px_rgba(91,95,246,0.6)] hover:-translate-y-0.5 transition-all flex items-center gap-2"
        >
          Continue <ArrowRight size={18} />
        </button>
      </div>

      {showRepoExplorer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl w-11/12 max-w-5xl h-[80vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-white to-slate-50/50 shrink-0">
              <h2 className="text-lg font-bold text-[#101828] flex items-center gap-2">
                <Folder size={20} className="text-[#5B5FF6]" /> Repository Explorer
              </h2>
              <button 
                onClick={() => setShowRepoExplorer(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="flex-1 flex overflow-hidden relative">
              <div className={`flex-1 overflow-y-auto p-4 custom-scrollbar ${selectedFile ? 'hidden md:block w-1/3 border-r border-slate-100 bg-slate-50/30' : 'w-full bg-slate-50/30'}`}>
                {treeLoading ? (
                   <div className="flex items-center justify-center h-full text-[#667085] text-base font-medium gap-2">
                     <Loader2 size={16} className="animate-spin text-[#5B5FF6]" /> Loading structure...
                   </div>
                 ) : treeData && treeData.children ? (
                   <TreeNode node={treeData} onSelect={handleFileSelect} selectedPath={selectedFile?.path} />
                 ) : (
                   <div className="flex items-center justify-center h-full text-[#667085] text-base">
                     Structure not available
                   </div>
                 )}
              </div>

              {selectedFile && (
                <div className="flex-[2] flex flex-col overflow-hidden bg-[#0d1117]">
                  <div className="flex items-center justify-between px-4 py-3 bg-[#161b22] border-b border-[#30363d] shadow-sm">
                    <div className="flex items-center gap-2 text-slate-200 text-base font-medium tracking-wide">
                       <FileCode size={16} className="text-emerald-400" /> {selectedFile.node.name}
                    </div>
                    <button onClick={() => setSelectedFile(null)} className="text-slate-400 hover:text-white transition-colors bg-[#21262d] p-1 rounded-md border border-[#30363d]">
                      <X size={14} />
                    </button>
                  </div>
                  <div className="flex-1 overflow-auto text-base custom-scrollbar">
                    {loadingContent ? (
                       <div className="flex items-center justify-center h-full text-slate-400 text-base gap-2">
                         <Loader2 size={16} className="animate-spin text-[#5B5FF6]" /> Loading file...
                       </div>
                    ) : (
                      <SyntaxHighlighter
                        language={selectedFile.node.extension || 'javascript'}
                        style={vscDarkPlus}
                        customStyle={{ margin: 0, background: 'transparent', fontSize: '13px', padding: '16px' }}
                        showLineNumbers={true}
                      >
                        {fileContent || '// Empty file'}
                      </SyntaxHighlighter>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Detailed Testing Strategy Modal */}
      {showTestingStrategy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl w-11/12 max-w-5xl h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0 sticky top-0 z-10">
              <h2 className="text-xl font-bold text-[#101828] flex items-center gap-3">
                <Target size={24} className="text-[#5B5FF6]" /> Detailed Testing Strategy
              </h2>
              <button 
                onClick={() => setShowTestingStrategy(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50/30">
              
              {/* 1. EXISTING TESTING ANALYSIS */}
              <div className="mb-10">
                <h3 className="text-[13px] uppercase tracking-wider font-bold text-[#5B5FF6] flex items-center gap-2 mb-4 border-b border-slate-200 pb-2">
                  <Activity size={16} /> 1. Existing Testing Analysis
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="text-[11px] uppercase font-bold text-slate-500 mb-1">Repository</div>
                    <div className="text-[15px] font-bold text-slate-800 truncate">{repoUrl ? repoUrl.split('/').pop().replace('.git', '') : 'Unknown'}</div>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="text-[11px] uppercase font-bold text-slate-500 mb-1">Total Existing Tests</div>
                    <div className="text-2xl font-black text-slate-800">{testMetrics?.total ?? 0}</div>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="text-[11px] uppercase font-bold text-slate-500 mb-1">Testing Frameworks</div>
                    <div className="text-[15px] font-bold text-slate-800 truncate">{(existingTestDetails?.frameworks || []).join(', ') || 'Not Detected'}</div>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="text-[11px] uppercase font-bold text-slate-500 mb-1">Testing Types</div>
                    <div className="text-[15px] font-bold text-slate-800 truncate">{(existingTestDetails?.testTypes || []).join(', ') || 'Not Detected'}</div>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="text-[11px] uppercase font-bold text-slate-500 mb-1">Test Language</div>
                    <div className="text-[15px] font-bold text-slate-800 truncate">{(existingTestDetails?.languages || []).join(', ') || 'Not Detected'}</div>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="text-[11px] uppercase font-bold text-slate-500 mb-1">Execution Status</div>
                    <div className="text-[15px] font-bold text-slate-800 truncate">{testMetrics?.passed === 'Not Available' ? 'Not Available' : 'Available'}</div>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="text-[11px] uppercase font-bold text-slate-500 mb-1">Passed</div>
                    <div className="text-[15px] font-bold text-emerald-600 truncate">{testMetrics?.passed ?? 'Not Available'}</div>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="text-[11px] uppercase font-bold text-slate-500 mb-1">Failed</div>
                    <div className="text-[15px] font-bold text-rose-600 truncate">{testMetrics?.failed ?? 'Not Available'}</div>
                  </div>
                </div>
              </div>

              {/* 2. EXISTING TEST CASES */}
              <div className="mb-10">
                <h3 className="text-[13px] uppercase tracking-wider font-bold text-[#5B5FF6] flex items-center gap-2 mb-4 border-b border-slate-200 pb-2">
                  <FileCode size={16} /> 2. Existing Test Cases
                </h3>
                {(existingTestDetails?.testCases || []).length > 0 ? (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="py-3 px-4 text-[12px] font-bold text-slate-600 uppercase">Test Name</th>
                          <th className="py-3 px-4 text-[12px] font-bold text-slate-600 uppercase">Test File</th>
                          <th className="py-3 px-4 text-[12px] font-bold text-slate-600 uppercase">Framework</th>
                          <th className="py-3 px-4 text-[12px] font-bold text-slate-600 uppercase">Test Type</th>
                          <th className="py-3 px-4 text-[12px] font-bold text-slate-600 uppercase">Module</th>
                          <th className="py-3 px-4 text-[12px] font-bold text-slate-600 uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {existingTestDetails.testCases.map((tc, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 transition-colors">
                            <td className="py-3 px-4 text-[13px] font-bold text-slate-800">{tc.name}</td>
                            <td className="py-3 px-4 text-[13px] text-slate-500 font-mono">{tc.file}</td>
                            <td className="py-3 px-4 text-[13px] text-slate-600">{tc.framework}</td>
                            <td className="py-3 px-4 text-[13px] text-slate-600">{tc.type}</td>
                            <td className="py-3 px-4 text-[13px] text-slate-600">{tc.module}</td>
                            <td className="py-3 px-4 text-[13px]">
                              <span className={`px-2 py-1 rounded text-xs font-bold ${tc.status === 'Not Available' ? 'bg-slate-100 text-slate-600' : (tc.status === 'Failed' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700')}`}>
                                {tc.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-slate-500 italic text-sm py-2">No existing test definitions found in repository.</div>
                )}
              </div>

              {/* 3. EXISTING COVERAGE */}
              <div className="mb-10">
                <h3 className="text-[13px] uppercase tracking-wider font-bold text-[#5B5FF6] flex items-center gap-2 mb-4 border-b border-slate-200 pb-2">
                  <ShieldCheck size={16} /> 3. Existing Coverage
                </h3>
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                  {bizComponents.map((module, idx) => {
                    const modName = typeof module === 'string' ? module : module.name;
                    const covered = (existingTestDetails?.testCases || []).some(t => t.module.toLowerCase().includes(modName.toLowerCase()));
                    
                    return (
                      <div key={idx} className="p-4 border-b border-slate-100 last:border-0 flex flex-col gap-2 hover:bg-slate-50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="font-bold text-slate-800">{modName}</div>
                          {covered ? (
                            <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center gap-1"><CheckCircle size={12}/> Covered</span>
                          ) : (
                            <span className="px-2 py-1 rounded bg-rose-100 text-rose-700 text-xs font-bold flex items-center gap-1"><AlertCircle size={12}/> Not Covered</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* 4. COVERAGE GAPS */}
              <div className="mb-10">
                <h3 className="text-[13px] uppercase tracking-wider font-bold text-[#5B5FF6] flex items-center gap-2 mb-4 border-b border-slate-200 pb-2">
                  <AlertTriangle size={16} /> 4. Coverage Gaps
                </h3>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
                  <ul className="list-disc pl-5 text-amber-900 text-sm font-medium flex flex-col gap-2">
                    {(testMetrics?.aiStrategy?.coverageGaps || []).map((gap, idx) => (
                      <li key={idx}>{gap}</li>
                    ))}
                    {!(testMetrics?.aiStrategy?.coverageGaps || []).length && (
                      <li>No significant coverage gaps identified.</li>
                    )}
                  </ul>
                </div>
              </div>

              {/* 5. AI RECOMMENDED TESTING STRATEGY */}
              <div className="mb-10">
                <h3 className="text-[13px] uppercase tracking-wider font-bold text-[#5B5FF6] flex items-center gap-2 mb-4 border-b border-slate-200 pb-2">
                  <Search size={16} /> 5. AI Recommended Testing Strategy
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl">
                    <div className="text-[11px] uppercase font-bold text-indigo-500 mb-1">Recommended Tool</div>
                    <div className="text-[15px] font-bold text-indigo-900">{testMetrics?.aiStrategy?.recommendedStrategy?.recommendedTool || 'N/A'}</div>
                  </div>
                  <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl">
                    <div className="text-[11px] uppercase font-bold text-indigo-500 mb-1">Testing Type</div>
                    <div className="text-[15px] font-bold text-indigo-900">{testMetrics?.aiStrategy?.recommendedStrategy?.testingType || 'N/A'}</div>
                  </div>
                  <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl">
                    <div className="text-[11px] uppercase font-bold text-indigo-500 mb-1">Priority</div>
                    <div className="text-[15px] font-bold text-indigo-900">{testMetrics?.aiStrategy?.recommendedStrategy?.priority || 'N/A'}</div>
                  </div>
                  <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl">
                    <div className="text-[11px] uppercase font-bold text-indigo-500 mb-1">Target</div>
                    <div className="text-[15px] font-bold text-indigo-900">{testMetrics?.aiStrategy?.recommendedStrategy?.target || 'N/A'}</div>
                  </div>
                  <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl md:col-span-2">
                    <div className="text-[11px] uppercase font-bold text-indigo-500 mb-1">Reason</div>
                    <div className="text-[14px] font-medium text-indigo-900">{testMetrics?.aiStrategy?.recommendedStrategy?.reason || 'N/A'}</div>
                  </div>
                </div>
              </div>

              {/* 6. NEW AI-GENERATED TEST SCOPE */}
              <div className="mb-4">
                <h3 className="text-[13px] uppercase tracking-wider font-bold text-[#5B5FF6] flex items-center gap-2 mb-4 border-b border-slate-200 pb-2">
                  <Layers size={16} /> 6. New AI-Generated Test Scope
                </h3>
                <div className="bg-white border border-slate-200 rounded-xl p-6">
                  <div className="text-xs uppercase font-bold text-slate-500 mb-3 tracking-wider">NEW AI-GENERATED TEST CASES</div>
                  <ul className="flex flex-col gap-3">
                    {(testMetrics?.aiStrategy?.newTestScope || []).map((tc, idx) => (
                      <li key={idx} className="bg-slate-50 border border-slate-200 p-4 rounded-lg list-none">
                        <div className="font-bold text-slate-800 text-[15px]">{idx + 1}. {typeof tc === 'string' ? tc : (tc.name || 'Untitled Test')}</div>
                        {typeof tc === 'object' && (
                          <>
                            {tc.description && <div className="text-[13px] text-slate-600 mt-1">{tc.description}</div>}
                            <div className="flex gap-4 mt-3 text-[12px] font-semibold">
                              {tc.priority && <span className="text-indigo-600">Priority: {tc.priority}</span>}
                              {tc.type && <span className="text-emerald-600">Type: {tc.type}</span>}
                              {tc.tool && <span className="text-blue-600">Tool: {tc.tool}</span>}
                            </div>
                          </>
                        )}
                      </li>
                    ))}
                    {!(testMetrics?.aiStrategy?.newTestScope || []).length && (
                      <li className="text-slate-400 italic list-none">No new tests recommended at this time.</li>
                    )}
                  </ul>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
