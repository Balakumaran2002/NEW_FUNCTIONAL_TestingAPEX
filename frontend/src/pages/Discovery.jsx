import React, { useState, useEffect } from 'react';
import { GitBranch, Play, CheckCircle, AlertTriangle, ShieldAlert, BookOpen, ArrowRight, Shield, Code, Server, Zap, Search, Activity, Package, List, Database, Globe, Layers, FlaskConical, Folder, FolderOpen, File, FileText, FileCode, FileImage, FileArchive, ChevronRight, ChevronDown, Terminal, Loader2 } from 'lucide-react';
import { analyzeRepository, getPlaywrightStatus, getRepositoryTree, getRepositoryFileContent } from '../api';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
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

const TreeNode = ({ node, level = 0, onSelectFile, selectedPath }) => {
  const [expanded, setExpanded] = useState(false);
  const isFolder = node.type === 'folder';
  const isSelected = selectedPath === node.path;

  const handleClick = (e) => {
    e.stopPropagation();
    if (isFolder) {
      setExpanded(!expanded);
    } else {
      onSelectFile(node);
    }
  };

  return (
    <div className="select-none">
      <div 
        onClick={handleClick}
        className={`flex items-center gap-1.5 py-1.5 px-2 rounded-md cursor-pointer transition-colors ${isSelected ? 'bg-brand-50 text-brand-700' : 'hover:bg-slate-50 text-slate-700'}`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
      >
        <span className="w-4 h-4 flex items-center justify-center shrink-0">
          {isFolder && (
            expanded ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />
          )}
        </span>
        <FileIcon type={node.type} extension={node.extension} expanded={expanded} />
        <span className={`text-sm truncate ${isSelected ? 'font-semibold' : ''}`}>{node.name}</span>
      </div>
      
      {isFolder && expanded && node.children && (
        <div className="flex flex-col">
          {node.children.map((child, idx) => (
            <TreeNode 
              key={idx} 
              node={child} 
              level={level + 1} 
              onSelectFile={onSelectFile}
              selectedPath={selectedPath}
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
 setRepoUrl, 
 loading, 
 setLoading, 
 result, 
 setResult, 
 error, 
 setError, 
 statusText, 
 setStatusText,
 elapsedTime,
 timeTaken,
 setTimeTaken,
 workflowState,
 setWorkflowState
}) {
 const hasAutoTriggeredRef = React.useRef(false);
 const [viewMode, setViewMode] = useState('overview');
 const [playwrightStatus, setPlaywrightStatus] = useState(null);
  const [treeData, setTreeData] = useState(null);
  const [treeLoading, setTreeLoading] = useState(false);
  const [treeError, setTreeError] = useState(null);
  
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [fileError, setFileError] = useState(null);
  const [previewSupported, setPreviewSupported] = useState(true);

  const fetchTreeData = async (repositoryId) => {
    setTreeLoading(true);
    setTreeError(null);
    try {
      const data = await getRepositoryTree(repositoryId);
      setTreeData(data);
    } catch (err) {
      setTreeError(err.response?.data?.error || err.message || 'Failed to load repository tree.');
    } finally {
      setTreeLoading(false);
    }
  };

  const handleSelectFile = async (node) => {
    setSelectedFile(node);
    setFileLoading(true);
    setFileError(null);
    setFileContent(null);
    setPreviewSupported(true);
    
    try {
      const repositoryId = repoUrl.split('/').pop().replace('.git', '');
      const data = await getRepositoryFileContent(repositoryId, node.path);
      setPreviewSupported(data.previewSupported);
      if (data.previewSupported) {
        setFileContent(data.content);
      }
    } catch (err) {
      setFileError(err.response?.data?.error || err.message || 'Failed to load file content.');
    } finally {
      setFileLoading(false);
    }
  };

 
 

 const [sourceType, setSourceType] = useState('remote');
 const [githubToken, setGithubToken] = useState('');
 const [localPath, setLocalPath] = useState('');
 const [isDownloadingBrd, setIsDownloadingBrd] = useState(false);
 const [isDownloadingApiTests, setIsDownloadingApiTests] = useState(false);
 const [isDownloadingUiTests, setIsDownloadingUiTests] = useState(false);

  // Removed UI/API test downloads from here

 const handleDownloadBrd = async () => {
 setIsDownloadingBrd(true);
 try {
 const targetRepo = sourceType === 'remote' ? repoUrl : localPath;
 if (!targetRepo) return;
 const repoName = targetRepo.split('/').pop().replace('.git', '');
 
 const response = await fetch(`http://localhost:8000/api/brd/download/${encodeURIComponent(targetRepo)}`);
 if (!response.ok) {
 throw new Error('Failed to download BRD report');
 }
 const blob = await response.blob();
 const url = window.URL.createObjectURL(blob);
 const a = document.createElement('a');
 a.href = url;
 a.download = `BRD_${repoName}.pdf`;
 document.body.appendChild(a);
 a.click();
 window.URL.revokeObjectURL(url);
 document.body.removeChild(a);
 } catch (err) {
 console.error(err);
 alert('Error downloading BRD report');
 } finally {
 setIsDownloadingBrd(false);
 }
 };

 
  React.useEffect(() => {
    if (result?.projectType && repoUrl) {
      const repoName = repoUrl.split('/').pop().replace('.git', '');
      getPlaywrightStatus(repoName).then(pwStatus => {
        setPlaywrightStatus(pwStatus);
      }).catch(err => {
        // Optional
      });
      fetchTreeData(repoName);
    }
  }, [result, repoUrl]);


 const handleAnalyze = async (e) => {
 e.preventDefault();
 if (sourceType === 'remote' && !repoUrl.trim()) return;
 if (sourceType === 'local' && !localPath.trim()) return;

 setLoading(true);
 setError(null);
 setResult(null);
 setTimeTaken(null);
 setStatusText('Connecting to repository...');

 const startTime = Date.now();

 const timer = setTimeout(() => setStatusText('Cloning repository files...'), 1500);
 const timer2 = setTimeout(() => setStatusText('Detecting project properties and files...'), 3500);
 const timer3 = setTimeout(() => setStatusText('Extracting dependency tree...'), 5500);
 const timer4 = setTimeout(() => setStatusText('Querying local RAG knowledge base & consult AI...'), 7500);

 try {
 const data = await analyzeRepository(
 sourceType === 'remote' ? repoUrl : '', 
 sourceType === 'remote' ? githubToken : '', 
 sourceType === 'local' ? localPath : ''
 );
 clearTimeout(timer);
 clearTimeout(timer2);
 clearTimeout(timer3);
 clearTimeout(timer4);
 
 const endTime = Date.now();
 const duration = ((endTime - startTime) / 1000).toFixed(1);

 if (data.errorMessage) {
 setError(data.errorMessage);
 } else {
 
      setResult(data);
      if (repoUrl) {
         fetchTreeData(repoUrl.split('/').pop().replace('.git', ''));
      }

 setTimeTaken(duration);
 
 localStorage.setItem('last_analysis', JSON.stringify(data));
 localStorage.setItem('last_analysis_time', JSON.stringify(duration));
 
 const stats = JSON.parse(localStorage.getItem('assistant_stats') || '{"reposAnalyzed":0,"migrationsRun":0,"filesConverted":0}');
 stats.reposAnalyzed += 1;
 localStorage.setItem('assistant_stats', JSON.stringify(stats));

 // Detect Playwright in the cloned project workspace (best-effort)
 try {
 const repoName = repoUrl.split('/').pop().replace('.git', '');
 const pwStatus = await getPlaywrightStatus(repoName);
 setPlaywrightStatus(pwStatus);
 } catch (_) {
 // Playwright detection is optional â€” don't block the UI
 }
 }
 } catch (err) {
 clearTimeout(timer);
 clearTimeout(timer2);
 clearTimeout(timer3);
 clearTimeout(timer4);
 setError(err.response?.data?.message || err.message || 'An error occurred during repository analysis.');
 } finally {
 setLoading(false);
 }
 };

 React.useEffect(() => {
   if (repoUrl && !result?.projectType && !loading && !error && !hasAutoTriggeredRef.current) {
     hasAutoTriggeredRef.current = true;
     handleAnalyze({ preventDefault: () => {} });
   }
 }, [repoUrl, result, loading, error]);

 // --- DYNAMIC DATA FOR GRAPHICAL VIEW ---
 const getDynamicScore = (label) => {
 if (!result || !result.projectType) return 0;
 const version = parseInt(result.detectedJavaVersion || '8');
 const deprecatedCount = result.deprecatedApis?.length || 0;
 const isHighRisk = result.riskLevel === 'High';
 const isMediumRisk = result.riskLevel === 'Medium';
 
 let base = 85;
 if (isHighRisk) base -= 25;
 else if (isMediumRisk) base -= 12;
 
 if (version < 11) base -= 10;
 base -= Math.min(deprecatedCount * 4, 20);
 
 switch(label) {
 case 'Maintainability':
 return Math.max(30, Math.min(95, base));
 case 'Reliability':
 return Math.max(40, Math.min(98, base + (isHighRisk ? -5 : 5)));
 case 'Security':
 return Math.max(35, Math.min(95, base + (deprecatedCount > 0 ? -8 : 6)));
 case 'Performance':
 return Math.max(50, Math.min(99, 78 + (version >= 17 ? 12 : 0)));
 case 'Test Coverage':
 return Math.max(20, Math.min(90, 50 + (result.isJava ? 15 : 5) + (isHighRisk ? -15 : 10)));
 default:
 return base;
 }
 };

 const getScoreColor = (score) => {
 if (score >= 80) return '#10B981'; // Emerald
 if (score >= 60) return '#F59E0B'; // Amber
 return '#EF4444'; // Rose
 };

 const overallScore = result?.projectType ? Math.round(
 (getDynamicScore('Maintainability') + 
 getDynamicScore('Reliability') + 
 getDynamicScore('Security') + 
 getDynamicScore('Performance') + 
 getDynamicScore('Test Coverage')) / 5
 ) : 0;

 const complexityData = result?.projectType ? [
 { subject: 'Cyclomatic Complexity', A: Math.round(55 + (result.endpointCount > 20 ? 25 : result.endpointCount * 1.2)), B: 30, fullMark: 100 },
 { subject: 'Cognitive Complexity', A: Math.round(45 + (result.isMultiModule ? 20 : 0) + (result.deprecatedApis?.length > 2 ? 15 : 0)), B: 25, fullMark: 100 },
 { subject: 'Class Complexity', A: Math.round(50 + (result.isMultiModule ? 15 : 0)), B: 35, fullMark: 100 },
 { subject: 'Method Complexity', A: Math.round(40 + (result.detectedJavaVersion === '8' ? 15 : 0)), B: 25, fullMark: 100 },
 { subject: 'Package Stability', A: Math.round(65 + (result.isMultiModule ? -15 : 15)), B: 85, fullMark: 100 },
 ] : [
 { subject: 'Cyclomatic Complexity', A: 0, B: 0, fullMark: 100 },
 { subject: 'Cognitive Complexity', A: 0, B: 0, fullMark: 100 },
 { subject: 'Class Complexity', A: 0, B: 0, fullMark: 100 },
 { subject: 'Method Complexity', A: 0, B: 0, fullMark: 100 },
 { subject: 'Package Stability', A: 0, B: 0, fullMark: 100 },
 ];

 const codeSmells = result?.projectType ? [
 { 
 label: 'Deprecated API Usage', 
 count: result.deprecatedApis?.length || 0, 
 icon: <AlertTriangle size={14} className="text-amber-500" />, 
 bg: 'bg-amber-500/10' 
 },
 { 
 label: 'Legacy Dependencies', 
 count: result.dependencies?.filter(d => d.includes('starter') || d.includes('hibernate')).length || 0, 
 icon: <ShieldAlert size={14} className="text-rose-500" />, 
 bg: 'bg-rose-500/10' 
 },
 { 
 label: 'High Cognitive Complexity', 
 count: result.isMultiModule ? 4 : 1, 
 icon: <Layers size={14} className="text-indigo-500" />, 
 bg: 'bg-indigo-500/10' 
 },
 ] : [];

 const totalCodeSmells = codeSmells.reduce((acc, curr) => acc + curr.count, 0);

 const javaVersionData = result?.detectedJavaVersion ? [
 { name: `Java ${result.detectedJavaVersion}`, value: 100, color: '#3B82F6' },
 ] : [];

 const recommendations = [];
 if (result?.projectType) {
 if (result.migrationRecommendation && result.migrationRecommendation !== 'This project is already using the latest Java version. No migration is required.') {
 recommendations.push({
 title: 'Upgrade Java Runtime',
 desc: result.migrationRecommendation,
 level: result.riskLevel || 'Medium',
 icon: <BookOpen size={18} className="text-blue-500" />,
 bg: 'bg-blue-50',
 actionType: 'migrate'
 });
 }
 
 if (result.deprecatedApis && result.deprecatedApis.length > 0) {
 recommendations.push({
 title: 'Heal Deprecated APIs',
 desc: `Fix ${result.deprecatedApis.length} legacy namespace usages.`,
 level: 'High',
 icon: <ShieldAlert size={18} className="text-rose-500" />,
 bg: 'bg-rose-50',
 actionType: 'migrate'
 });
 }

 if (result.isJava) {
 recommendations.push({
 title: 'Transpile Java Source',
 desc: 'Convert legacy classes and controllers to clean Python code.',
 level: 'Low',
 icon: <Code size={18} className="text-emerald-500" />,
 bg: 'bg-emerald-50',
 actionType: 'convert'
 });
 }
 }


 const renderGraphicalView = () => (
 <div className="space-y-6">
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fadeIn mt-6">
 {/* 1. Code Quality Score */}
 <div className="bg-white border border-[#F2F4F7] rounded-2xl p-5 shadow-card flex flex-col">
 <h3 className="text-sm font-bold text-[#101828] mb-6">Code Quality Score</h3>
 <div className="flex items-center gap-6 mb-4">
 <div className="w-32 h-32 relative flex-shrink-0">
 <CircularProgressbar
 value={overallScore}
 text={overallScore > 0 ? `${overallScore}%` : '--'}
 styles={buildStyles({
 textSize: '24px',
 textColor: result ? '#111827' : '#9CA3AF',
 pathColor: getScoreColor(overallScore),
 trailColor: '#F3F4F6',
 })}
 />
 <div className="absolute top-[65%] left-1/2 -translate-x-1/2 text-[10px] text-[#667085] font-bold">/100</div>
 </div>
 <div className="flex-1 space-y-3.5 w-full">
 {[
 { label: 'Maintainability', score: getDynamicScore('Maintainability'), color: getScoreColor(getDynamicScore('Maintainability')) },
 { label: 'Reliability', score: getDynamicScore('Reliability'), color: getScoreColor(getDynamicScore('Reliability')) },
 { label: 'Security', score: getDynamicScore('Security'), color: getScoreColor(getDynamicScore('Security')) },
 { label: 'Performance', score: getDynamicScore('Performance'), color: getScoreColor(getDynamicScore('Performance')) },
 { label: 'Test Coverage', score: getDynamicScore('Test Coverage'), color: getScoreColor(getDynamicScore('Test Coverage')) },
 ].map(item => (
 <div key={item.label} className="flex items-center text-[10px] gap-2">
 <span className="w-20 font-semibold text-[#475467]">{item.label}</span>
 <div className="flex-1 h-1.5 bg-[#F2F4F7] rounded-full overflow-hidden">
 <div className="h-full rounded-full" style={{ width: `${item.score}%`, backgroundColor: item.color }} />
 </div>
 <span className="w-8 text-right text-[#667085]">{item.score}/100</span>
 </div>
 ))}
 </div>
 </div>
 <div className="mt-auto flex items-center gap-2">
 <span className="font-bold text-sm" style={{ color: getScoreColor(overallScore) }}>
 {overallScore >= 80 ? 'Good' : overallScore >= 60 ? 'Fair' : overallScore > 0 ? 'Needs Refactoring' : 'No Data'}
 </span>
 <span className="text-xs text-[#98A2B3] flex items-center gap-1">
 {result?.projectType ? 'Calculated from analysis facts' : 'Run an analysis to score'}
 </span>
 </div>
 </div>

 {/* 2. Complexity Analysis */}
 <div className="bg-white border border-[#F2F4F7] rounded-2xl p-5 shadow-card relative flex flex-col">
 <h3 className="text-sm font-bold text-[#101828] mb-2">Complexity Analysis</h3>
 <div className="flex-1 min-h-[220px]">
 <ResponsiveContainer width="100%" height="100%">
 <RadarChart cx="50%" cy="50%" outerRadius="48%" margin={{ top: 10, right: 30, bottom: 10, left: 30 }} data={complexityData}>
 <PolarGrid stroke="#E5E7EB" />
 <PolarAngleAxis dataKey="subject" tick={{ fill: '#6B7280', fontSize: 8, fontWeight: 700 }} />
 <Radar name="Current" dataKey="A" stroke="#F97316" fill="#F97316" fillOpacity={0.25} />
 <Radar name="Recommended" dataKey="B" stroke="#10B981" fill="#10B981" fillOpacity={0.15} strokeDasharray="3 3" />
 </RadarChart>
 </ResponsiveContainer>
 </div>
 <div className="absolute bottom-4 left-0 w-full flex justify-center gap-4 text-[10px] text-[#667085] font-semibold">
 <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-orange-500" /> Current</span>
 <span className="flex items-center gap-1 text-[#98A2B3] border-b border-dashed border-slate-400 pb-0.5">Recommended</span>
 </div>
 </div>

 {/* 3. Code Smells */}
 <div className="bg-white border border-[#F2F4F7] rounded-2xl p-5 shadow-card flex flex-col">
 <div className="flex justify-between items-center mb-4">
 <h3 className="text-sm font-bold text-[#101828]">Code Smells</h3>
 </div>
 <div className="flex-1 space-y-3.5 flex flex-col justify-center">
 {codeSmells.length > 0 ? codeSmells.map(smell => (
 <div key={smell.label} className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${smell.bg}`}>
 {smell.icon}
 </div>
 <span className="text-xs font-semibold text-[#344054]">{smell.label}</span>
 </div>
 <span className="text-xs font-bold text-[#101828]">{smell.count}</span>
 </div>
 )) : (
 <span className="text-xs text-[#98A2B3]">No code smells detected yet.</span>
 )}
 </div>
 <div className="mt-4 pt-4 border-t border-[#F2F4F7] flex justify-between items-center">
 <span className="text-xs font-bold text-[#667085]">Total Code Smells</span>
 <span className="text-sm font-black text-[#101828]">{totalCodeSmells}</span>
 </div>
 </div>

 {/* 4. Dependency Graph */}
 <div className="bg-white border border-[#F2F4F7] rounded-2xl p-5 shadow-card flex flex-col">
 <div className="flex justify-between items-center mb-6">
 <h3 className="text-sm font-bold text-[#101828]">Dependency Graph</h3>
 </div>
 <div className="relative flex-1 flex items-center justify-center min-h-[220px]">
 {result?.dependencies?.length > 0 ? (
 <div className="absolute w-[240px] h-[240px]">
 <svg width="240" height="240" className="absolute top-0 left-0">
 {result.dependencies.length >= 1 && <line x1="120" y1="120" x2="120" y2="40" stroke="#CBD5E1" strokeWidth="1.5" />}
 {result.dependencies.length >= 2 && <line x1="120" y1="120" x2="190" y2="80" stroke="#CBD5E1" strokeWidth="1.5" />}
 {result.dependencies.length >= 3 && <line x1="120" y1="120" x2="170" y2="180" stroke="#CBD5E1" strokeWidth="1.5" />}
 {result.dependencies.length >= 4 && <line x1="120" y1="120" x2="70" y2="180" stroke="#CBD5E1" strokeWidth="1.5" />}
 {result.dependencies.length >= 5 && <line x1="120" y1="120" x2="50" y2="80" stroke="#CBD5E1" strokeWidth="1.5" />}
 </svg>
 
 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
 <div className="w-14 h-14 bg-white rounded-full border-[3px] border-orange-400 shadow-soft flex items-center justify-center z-10">
 <Package size={22} className="text-orange-500" />
 </div>
 <span className="text-[10px] font-bold mt-1 text-[#101828] bg-white border border-[#EAECF0] rounded-full px-2 py-0.5 shadow-card text-center max-w-[90px] leading-tight">Project</span>
 </div>
 
 {result.dependencies[0] && (
 <div className="absolute top-[30px] left-[120px] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
 <div className="w-9 h-9 bg-white rounded-full border border-[#EAECF0] shadow-card flex items-center justify-center z-10">
 <Database size={16} className="text-[#667085]" />
 </div>
 <span className="text-[8px] font-bold mt-1 text-[#475467] bg-white border border-slate-150 rounded-full px-2 py-0.5 shadow-card text-center whitespace-normal max-w-[110px] leading-tight">{result.dependencies[0]}</span>
 </div>
 )}
 {result.dependencies[1] && (
 <div className="absolute top-[80px] left-[190px] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
 <div className="w-9 h-9 bg-white rounded-full border border-[#EAECF0] shadow-card flex items-center justify-center z-10">
 <Server size={16} className="text-[#667085]" />
 </div>
 <span className="text-[8px] font-bold mt-1 text-[#475467] bg-white border border-slate-150 rounded-full px-2 py-0.5 shadow-card text-center whitespace-normal max-w-[110px] leading-tight">{result.dependencies[1]}</span>
 </div>
 )}
 {result.dependencies[2] && (
 <div className="absolute top-[180px] left-[170px] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
 <div className="w-9 h-9 bg-white rounded-full border border-[#EAECF0] shadow-card flex items-center justify-center z-10">
 <Globe size={16} className="text-[#667085]" />
 </div>
 <span className="text-[8px] font-bold mt-1 text-[#475467] bg-white border border-slate-150 rounded-full px-2 py-0.5 shadow-card text-center whitespace-normal max-w-[110px] leading-tight">{result.dependencies[2]}</span>
 </div>
 )}
 {result.dependencies[3] && (
 <div className="absolute top-[180px] left-[70px] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
 <div className="w-9 h-9 bg-white rounded-full border border-[#EAECF0] shadow-card flex items-center justify-center z-10">
 <Code size={16} className="text-[#667085]" />
 </div>
 <span className="text-[8px] font-bold mt-1 text-[#475467] bg-white border border-slate-150 rounded-full px-2 py-0.5 shadow-card text-center whitespace-normal max-w-[110px] leading-tight">{result.dependencies[3]}</span>
 </div>
 )}
 {result.dependencies[4] && (
 <div className="absolute top-[80px] left-[50px] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
 <div className="w-9 h-9 bg-white rounded-full border border-[#EAECF0] shadow-card flex items-center justify-center z-10">
 <Shield size={16} className="text-[#667085]" />
 </div>
 <span className="text-[8px] font-bold mt-1 text-[#475467] bg-white border border-slate-150 rounded-full px-2 py-0.5 shadow-card text-center whitespace-normal max-w-[110px] leading-tight">{result.dependencies[4]}</span>
 </div>
 )}
 </div>
 ) : (
 <span className="text-xs text-[#98A2B3]">Run an analysis to map dependencies.</span>
 )}
 </div>
 <div className="flex justify-center gap-5 text-[9px] font-semibold text-[#98A2B3] mt-auto pt-2">
 <span className="flex items-center gap-1.5"><div className="w-5 border-b-2 border-[#D0D5DD]" /> Direct Dependency</span>
 <span className="flex items-center gap-1.5"><div className="w-5 border-b-2 border-dashed border-[#D0D5DD]" /> Transitive Dependency</span>
 </div>
 </div>

 {/* 5. Java Version Distribution */}
 <div className="bg-white border border-[#F2F4F7] rounded-2xl p-5 shadow-card flex flex-col">
 <h3 className="text-sm font-bold text-[#101828] mb-4">Java Version Distribution</h3>
 <div className="flex items-center h-[160px] mb-4">
 <div className="w-[140px] h-full relative">
 <ResponsiveContainer width="100%" height="100%">
 <PieChart>
 <Pie data={javaVersionData} cx="50%" cy="50%" innerRadius={50} outerRadius={68} paddingAngle={2} dataKey="value" stroke="none">
 {javaVersionData.map((entry, index) => (
 <Cell key={`cell-${index}`} fill={entry.color} />
 ))}
 </Pie>
 </PieChart>
 </ResponsiveContainer>
 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
 <div className="text-xl font-bold text-[#101828]">{javaVersionData.length > 0 ? '100%' : '0'}</div>
 </div>
 </div>
 <div className="flex-1 flex flex-col gap-3.5 ml-4">
 {javaVersionData.length > 0 ? javaVersionData.map(v => (
 <div key={v.name} className="flex items-center justify-between text-[11px]">
 <div className="flex items-center gap-2">
 <div className="w-2 h-2 rounded-full" style={{ backgroundColor: v.color }} />
 <span className="font-semibold text-[#344054]">{v.name}</span>
 </div>
 <span className="text-[#667085] font-medium">{v.value}%</span>
 </div>
 )) : (
 <span className="text-xs text-[#98A2B3]">No data available</span>
 )}
 </div>
 </div>
 {result?.detectedJavaVersion === '8' && (
 <div className="mt-auto bg-orange-50 p-3.5 rounded-2xl border border-orange-100 flex items-start gap-2.5">
 <AlertTriangle size={15} className="text-orange-500 mt-0.5 flex-shrink-0" />
 <div>
 <p className="text-[11px] font-semibold text-[#101828] m-0">This repository is primarily using Java 8.</p>
 <p className="text-[10px] text-[#667085] m-0 mt-1 font-medium">Recommended upgrade path: Java 8 â†’ Java 17 â†’ Java 21</p>
 </div>
 </div>
 )}
 </div>

 {/* 6. Recommended Actions */}
 <div className="bg-white border border-[#F2F4F7] rounded-2xl p-5 shadow-card flex flex-col">
 <div className="flex justify-between items-center mb-5">
 <h3 className="text-sm font-bold text-[#101828]">Recommended Actions</h3>
 </div>
 <div className="flex flex-col gap-4 flex-1">
 {recommendations.length > 0 ? recommendations.map(rec => (
 <div key={rec.title} className="flex items-start justify-between pb-3.5 border-b border-slate-50 last:border-0 last:pb-0">
 <div className="flex items-start gap-3">
 <div className={`w-9 h-9 rounded-2xl flex items-center justify-center ${rec.bg}`}>
 {rec.icon}
 </div>
 <div>
 <h4 className="text-[12px] font-bold text-[#101828] m-0">{rec.title}</h4>
 <p className="text-[10px] text-[#667085] m-0 leading-tight mt-1 max-w-[170px]">{rec.desc}</p>
 </div>
 </div>
 <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
 <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wide
 ${rec.level === 'High' ? 'bg-rose-50 text-rose-600' : rec.level === 'Medium' ? 'bg-orange-50 text-orange-600' : 'bg-emerald-50 text-emerald-600'}
 `}>
 {rec.level}
 </span>
 <button
 onClick={() => {
 if (rec.actionType === 'migrate') setActiveTab('migration');
 else if (rec.actionType === 'convert') setActiveTab('conversion');
 }}
 className="text-[9px] font-bold text-brand-600 hover:text-brand-700 bg-brand-500/10 hover:bg-brand-500/20 px-2 py-0.5 rounded-md transition-all"
 >
 Take Action
 </button>
 </div>
 </div>
 )) : (
 <div className="flex items-center justify-center h-full">
 <span className="text-xs text-[#98A2B3]">Run an analysis to see recommendations.</span>
 </div>
 )}
 </div>
 </div>
 </div>
 {result && result.migrationRecommendation !== 'This project is already using the latest Java version. No migration is required.' && (
 <div className="flex justify-end">
 <button
 onClick={() => setActiveTab('migration')}
 className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-2xl text-xs transition-all shadow-soft"
 >
 Proceed to Migration Center <ArrowRight size={14} />
 </button>
 </div>
 )}
 </div>
 );

 return (
 <div className="space-y-6 animate-fadeIn">
 {/* Banner / Input Area */}
 <div className="p-6 glass-card relative z-10">
 {(!repoUrl || error) && (
 <>
 <div className="flex items-center gap-4 mb-4">
 <label className="flex items-center gap-2 text-sm cursor-pointer text-[#344054] font-medium">
 <input 
 type="radio" 
 name="sourceType" 
 value="remote" 
 checked={sourceType === 'remote'} 
 onChange={() => setSourceType('remote')}
 className="text-brand-500 focus:ring-brand-500"
 />
 Remote Repository (GitHub)
 </label>
 <label className="flex items-center gap-2 text-sm cursor-pointer text-[#344054] font-medium">
 <input 
 type="radio" 
 name="sourceType" 
 value="local" 
 checked={sourceType === 'local'} 
 onChange={() => setSourceType('local')}
 className="text-brand-500 focus:ring-brand-500"
 />
 Local Folder
 </label>
 </div>

 <form onSubmit={handleAnalyze} className="flex flex-col gap-3">
 {sourceType === 'remote' ? (
 <div className="flex flex-col sm:flex-row gap-3 w-full">
 <input
 type="url"
 value={repoUrl}
 onChange={(e) => setRepoUrl(e.target.value)}
 placeholder="https://github.com/username/project-repo"
 required={sourceType === 'remote'}
 disabled={loading}
 className="flex-[2] px-4 py-3 rounded-2xl border border-[#EAECF0] bg-white/50 focus:ring-2 focus:ring-brand-500 focus:outline-none transition-all text-sm"
 />
 <input
 type="password"
 value={githubToken}
 onChange={(e) => setGithubToken(e.target.value)}
 placeholder="PAT Token (optional)"
 disabled={loading}
 className="flex-1 px-4 py-3 rounded-2xl border border-[#EAECF0] bg-white/50 focus:ring-2 focus:ring-brand-500 focus:outline-none transition-all text-sm"
 />
 <button
 type="submit"
 disabled={loading}
 className="flex items-center justify-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-2xl shadow-soft disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm whitespace-nowrap"
 >
 {loading ? (
 <>
 <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
 </svg>
 Analyzing... ({elapsedTime}s)
 </>
 ) : (
 <>
 <Play size={16} /> Run Audit
 </>
 )}
 </button>
 </div>
 ) : (
 <div className="flex flex-col sm:flex-row gap-3 w-full">
 <input
 type="text"
 value={localPath}
 onChange={(e) => setLocalPath(e.target.value)}
 placeholder="Absolute path (e.g., C:\Projects\MyJavaApp)"
 required={sourceType === 'local'}
 disabled={loading}
 className="flex-1 px-4 py-3 rounded-2xl border border-[#EAECF0] bg-white/50 focus:ring-2 focus:ring-brand-500 focus:outline-none transition-all text-sm"
 />
 <button
 type="submit"
 disabled={loading}
 className="flex items-center justify-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-2xl shadow-soft disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm whitespace-nowrap"
 >
 {loading ? (
 <>
 <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
 </svg>
 Analyzing... ({elapsedTime}s)
 </>
 ) : (
 <>
 <Play size={16} /> Run Audit
 </>
 )}
 </button>
 </div>
 )}
 </form>
 </>
 )}

 {loading && (
 <div className="mt-6 space-y-3">
 <div className="flex items-center justify-between text-sm">
 <span className="font-semibold text-indigo-700">
 {statusText}
 </span>
 <span className="font-mono text-xs text-[#667085]">
 {elapsedTime}s elapsed
 </span>
 </div>
 <div className="rocket-progress-container">
 <div className="rocket-progress-fill" style={{ width: `${Math.min(95, (parseFloat(elapsedTime) || 0) * 2)}%` }}></div>
 <div className="rocket-icon-animated" style={{ left: `${Math.min(90, (parseFloat(elapsedTime) || 0) * 2)}%` }}>
 🚀
 </div>
 <div className="rocket-smoke" style={{ left: `calc(${Math.min(90, (parseFloat(elapsedTime) || 0) * 2)}% - 22px)` }}></div>
 </div>
 <div className="p-4 rounded-2xl border border-indigo-100 bg-indigo-50/30 text-sm text-indigo-700 font-semibold animate-pulse">
 Status: {statusText} ({elapsedTime}s)
 </div>
 </div>
 )}

 
 </div>

 
      {/* Tree View Section */}
      {result?.projectType && (
        <div className={`flex flex-col lg:flex-row gap-6 mb-6 ${selectedFile ? 'h-[600px]' : ''}`}>
          {/* Left Panel - File Tree (Dynamic Width & Height) */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`bg-white rounded-2xl border border-[#EAECF0] flex flex-col shadow-sm overflow-hidden shrink-0 transition-all duration-300 ${
              selectedFile ? 'w-full lg:w-1/3 xl:w-[30%] h-64 lg:h-full' : 'w-full max-h-[600px]'
            }`}
          >
            <div className="px-4 py-3 border-b border-[#EAECF0] bg-slate-50 flex items-center gap-2">
              <Folder size={18} className="text-brand-500" />
              <span className="font-bold text-[#101828] text-sm truncate">{treeData?.repositoryName || (repoUrl ? repoUrl.split('/').pop().replace('.git', '') : '')}</span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
              {treeLoading ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
                  <Loader2 className="animate-spin" size={24} />
                  <span className="text-sm">Loading structure...</span>
                </div>
              ) : treeError ? (
                <div className="p-4 bg-rose-50 rounded-xl flex items-start gap-2 text-rose-700 m-2">
                  <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                  <span className="text-sm">{treeError}</span>
                </div>
              ) : treeData?.nodes?.length ? (
                <div className="pb-4">
                  {treeData.nodes.map((node, idx) => (
                    <TreeNode 
                      key={idx} 
                      node={node} 
                      onSelectFile={handleSelectFile}
                      selectedPath={selectedFile?.path}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                  No files found.
                </div>
              )}
            </div>
          </motion.div>

          {/* Right Panel - Content Viewer (70%) - Only visible if a file is selected */}
          {selectedFile && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="w-full lg:w-2/3 xl:w-[70%] bg-white rounded-2xl border border-[#EAECF0] flex flex-col shadow-sm overflow-hidden h-full"
            >
              <>
                <div className="px-4 py-3 border-b border-[#EAECF0] bg-slate-50 flex justify-between items-center shrink-0">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <FileText size={18} className="text-slate-500 shrink-0" />
                    <span className="font-mono text-sm text-[#344054] truncate">{selectedFile.path}</span>
                  </div>
                </div>
                
                <div className="flex-1 overflow-hidden bg-[#1E1E1E]">
                  {fileLoading ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
                      <Loader2 className="animate-spin" size={24} />
                      <span className="text-sm">Loading file content...</span>
                    </div>
                  ) : fileError ? (
                    <div className="flex items-center justify-center h-full bg-white">
                      <div className="p-4 bg-rose-50 rounded-xl flex items-center gap-2 text-rose-700">
                        <AlertTriangle size={18} />
                        <span className="text-sm font-medium">{fileError}</span>
                      </div>
                    </div>
                  ) : !previewSupported ? (
                    <div className="flex items-center justify-center h-full bg-white">
                      <div className="text-center p-6 max-w-md">
                        <FileArchive size={48} className="mx-auto text-slate-300 mb-4" />
                        <h3 className="text-lg font-bold text-slate-800 mb-1">Preview not available</h3>
                        <p className="text-sm text-slate-500">
                          This file appears to be a binary, archive, or unsupported format and cannot be rendered as text.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full overflow-auto custom-scrollbar">
                      <SyntaxHighlighter
                        language={selectedFile.extension || 'text'}
                        style={vscDarkPlus}
                        showLineNumbers={true}
                        customStyle={{
                          margin: 0,
                          padding: '1rem',
                          fontSize: '13px',
                          background: 'transparent',
                          minHeight: '100%'
                        }}
                      >
                        {fileContent || ''}
                      </SyntaxHighlighter>
                    </div>
                  )}
                </div>
              </>
            </motion.div>
          )}
        </div>
      )}
    

      {/* Tabs */}
 <div className="flex items-center gap-2 p-1.5 bg-[#F2F4F7] rounded-2xl w-fit">
 <button
 onClick={() => setViewMode('overview')}
 className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${
 viewMode === 'overview' 
 ? 'bg-white text-brand-600 shadow-card' 
 : 'text-[#667085] hover:text-[#344054] :text-slate-300'
 }`}
 >
 Overview
 </button>
 <button
 onClick={() => setViewMode('graphical')}
 className={`px-5 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
 viewMode === 'graphical' 
 ? 'bg-white text-brand-600 shadow-card' 
 : 'text-[#667085] hover:text-[#344054] :text-slate-300'
 }`}
 >
 Graphical View
 </button>
 </div>

 {/* Error State */}
 {error && (
 <div className="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 glass-card flex gap-3 items-start">
 <ShieldAlert size={24} className="flex-shrink-0" />
 <div>
 <h4 className="font-bold text-sm">Analysis Failed</h4>
 <p className="mt-1 text-xs leading-relaxed">{error}</p>
 </div>
 </div>
 )}

 {/* Views */}
 {viewMode === 'graphical' ? renderGraphicalView() : (
 // OVERVIEW UI (Old content)
 result?.projectType && (
 <div className="space-y-8 animate-fadeIn">
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 <div className="lg:col-span-1 space-y-6">
 <div className="p-6 glass-card">
 <h3 className="text-md font-bold text-[#101828] mb-4">Project Parameters</h3>
 <table className="w-full text-xs text-left">
 <tbody>
 <tr className="border-b border-[#F2F4F7]">
 <td className="py-3 font-semibold text-[#98A2B3]">Language</td>
 <td className="py-3 font-bold text-[#101828]">{result.projectType || 'Java'}</td>
 </tr>
 {result.detectedJavaVersion && (
 <tr className="border-b border-[#F2F4F7]">
 <td className="py-3 font-semibold text-[#98A2B3]">Java Version</td>
 <td className="py-3 font-bold text-brand-600">Java {result.detectedJavaVersion}</td>
 </tr>
 )}
 <tr className="border-b border-[#F2F4F7]">
 <td className="py-3 font-semibold text-[#98A2B3]">Build Tool / PM</td>
 <td className="py-3 font-bold text-[#101828]">{result.buildTool || 'Not Detected'}</td>
 </tr>
 <tr className="border-b border-[#F2F4F7]">
 <td className="py-3 font-semibold text-[#98A2B3]">Framework</td>
 <td className="py-3 font-bold text-[#101828]">{result.frameworkType || (result.frameworkVersions && result.frameworkVersions["Spring Boot"] ? `Spring Boot ${result.frameworkVersions["Spring Boot"]}` : 'Not Detected')}</td>
 </tr>
 <tr className="border-b border-[#F2F4F7]">
 <td className="py-3 font-semibold text-[#98A2B3]">Database</td>
 <td className="py-3 font-bold text-[#101828]">{result.database || 'None'}</td>
 </tr>
 <tr className="border-b border-[#F2F4F7]">
 <td className="py-3 font-semibold text-[#98A2B3]">Packaging</td>
 <td className="py-3 font-bold text-[#101828] uppercase">{result.packagingType || 'jar'}</td>
 </tr>
 <tr className="border-b border-[#F2F4F7]">
 <td className="py-3 font-semibold text-[#98A2B3]">Multi-module</td>
 <td className={`py-3 font-bold ${result.isMultiModule ? 'text-amber-600 ' : 'text-[#101828] '}`}>
 {result.isMultiModule ? 'Yes' : 'No'}
 </td>
 </tr>
 <tr className="border-b border-[#F2F4F7]">
 <td className="py-3 font-semibold text-[#98A2B3]">Frontend</td>
 <td className="py-3 font-bold text-[#101828]">{result.frontendFramework || (result.hasFrontend ? 'Detected' : 'None')}</td>
 </tr>
 <tr className="border-b border-[#F2F4F7]">
 <td className="py-3 font-semibold text-[#98A2B3]">API Endpoints</td>
 <td className="py-3 font-bold text-indigo-600">{result.endpointCount ?? 0} detected</td>
 </tr>
 <tr>
 <td className="py-3 font-semibold text-[#98A2B3]">Risk Level</td>
 <td className="py-3">
 <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
 result.riskLevel === 'High' ? 'bg-rose-500/10 text-rose-600 '
 : result.riskLevel === 'Medium' ? 'bg-amber-500/10 text-amber-600 '
 : 'bg-emerald-500/10 text-emerald-600 '
 }`}>{result.riskLevel || 'Low'}</span>
 </td>
 </tr>
 </tbody>
 </table>
 </div>
 {result.deprecatedApis && result.deprecatedApis.length > 0 && (
 <div className="p-6 glass-card border-l-4 border-amber-500">
 <h3 className="text-md font-bold text-amber-700 mb-3 flex items-center gap-2">
 <ShieldAlert size={16} /> Deprecated APIs Found
 </h3>
 <ul className="space-y-1.5">
 {result.deprecatedApis.map((api, idx) => (
 <li key={idx} className="text-[10px] text-amber-700 bg-amber-500/5 rounded-xl px-3 py-2 font-mono leading-relaxed">
 ⚠️ {api}
 </li>
 ))}
 </ul>
 </div>
 )}
 <div className="p-6 glass-card">
 <h3 className="text-md font-bold text-[#101828] mb-4">Core Dependencies</h3>
 <div className="flex flex-wrap gap-2">
 {result.dependencies.length > 0 ? (
 result.dependencies.map((dep, idx) => (
 <span key={idx} className="px-2.5 py-1 bg-[#F2F4F7] rounded-xl text-[10px] font-semibold text-[#475467]">
 {dep}
 </span>
 ))
 ) : (
 <span className="text-xs text-[#98A2B3] italic">No standard frameworks detected</span>
 )}
 </div>
 </div>
 </div>
 <div className="lg:col-span-2">
 <div className="p-6 glass-card flex flex-col lg:h-[720px]">
 <div className="flex justify-between items-center mb-6 shrink-0">
 <h3 className="text-md font-bold text-[#101828] flex items-center gap-2">
 <BookOpen className="text-indigo-500" size={18} />
 BRD Report Summary
 </h3>
 <div className="flex items-center gap-3">
 <button
 onClick={handleDownloadBrd}
 disabled={isDownloadingBrd || !result.fullBrdReport}
 className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-card transition-all"
 >
 {isDownloadingBrd || !result.fullBrdReport ? 'Generating...' : 'Download BRD Report'}
 </button>
 </div>
 </div>
 
 {result.fullBrdReport ? (
 <div className="relative flex-1 min-h-[300px] overflow-y-auto pr-2">
 <div className="space-y-6 text-sm text-[#344054]">
 
 <div>
 <h4 className="font-bold text-[#101828] mb-2">Application Purpose</h4>
 <p className="leading-relaxed bg-[#F7F8FC] p-3 rounded-xl border border-[#F2F4F7]">
 {result.fullBrdReport.appPurposeDesc}
 </p>
 </div>
 
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div>
 <h4 className="font-bold text-[#101828] mb-2">Key Business Capabilities</h4>
 <ul className="list-disc pl-5 space-y-1">
 {result.fullBrdReport.capabilities?.map((cap, idx) => (
 <li key={idx}>{cap.name}</li>
 ))}
 </ul>
 </div>
 <div>
 <h4 className="font-bold text-[#101828] mb-2">Business Components</h4>
 <ul className="list-disc pl-5 space-y-1">
 {result.fullBrdReport.bizComponents?.map((item, idx) => (
 <li key={idx}>{item}</li>
 ))}
 </ul>
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div>
 <h4 className="font-bold text-[#101828] mb-2">Technology Stack</h4>
 <div className="flex flex-wrap gap-2">
 {result.fullBrdReport.techStackSummary?.map((item, idx) => (
 <span key={idx} className="px-2 py-1 bg-brand-50 text-brand-700 rounded text-[10px] font-semibold">
 {item}
 </span>
 ))}
 </div>
 </div>
 <div>
 <h4 className="font-bold text-[#101828] mb-2">API Groups</h4>
 <div className="inline-flex items-center justify-center w-8 h-8 bg-emerald-100 text-emerald-700 font-bold rounded-full">
 {result.fullBrdReport.apiGroups?.length || 0}
 </div>
 </div>
 </div>

 <div>
 <h4 className="font-bold text-[#101828] mb-2">Primary Data Stores</h4>
 <ul className="list-disc pl-5 space-y-1 bg-[#F7F8FC] p-3 rounded-xl border border-[#F2F4F7]">
 {result.fullBrdReport.primaryDataStores?.map((ds, idx) => (
 <li key={idx}>{ds.name}: {ds.description}</li>
 ))}
 </ul>
 </div>

 <div>
 <h4 className="font-bold text-[#101828] mb-2">Testing & Comprehension Context</h4>
 <p className="leading-relaxed bg-indigo-50 text-indigo-800 p-3 rounded-xl border border-indigo-100">
 {result.fullBrdReport.modernizationContext}
 </p>
 </div>

 </div>
 </div>
 ) : (
 <div className="relative flex-1 min-h-[300px]">
 <div className="absolute inset-0 flex items-center justify-center flex-col text-[#98A2B3]">
 <BookOpen size={48} className="mb-4 opacity-20" />
 <p>BRD Summary not available.</p>
 </div>
 </div>
 )}
 
 </div>
 </div>
 </div>
 
 {/* ── CONTINUE TO PROJECT RUNNER ── */}
 {result?.projectType && (
 <div className="flex justify-end mt-8">
 <button
 onClick={() => {
 if (result) {
 if (typeof setWorkflowState === 'function') {
 setWorkflowState(prev => ({ ...prev, analysisCompleted: true }));
 }
 setActiveTab('runner');
 }
 }}
 disabled={!result || loading || result.buildStatus === 'FAILED' || error}
 className="flex items-center gap-2 px-6 py-3 bg-[#5B5FF6] hover:bg-[#4F54D8] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl shadow-card transition-all"
 >
 Continue to Project Runner <ArrowRight size={18} />
 </button>
 </div>
 )}
 </div>
 )
 )}
 </div>
 );
}