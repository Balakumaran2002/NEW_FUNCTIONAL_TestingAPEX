import React, { useState } from 'react';
import { GitBranch, Play, CheckCircle, AlertTriangle, ShieldAlert, BookOpen, ArrowRight, Shield, Code, Server, Zap, Search, Activity, Package, List, Database, Globe, Layers, FlaskConical } from 'lucide-react';
import { analyzeRepository, getPlaywrightStatus, API_BASE_URL } from '../api';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

export default function RepositoryAnalysis({ 
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
  setTimeTaken
}) {
  const [viewMode, setViewMode] = useState('overview');
  const [playwrightStatus, setPlaywrightStatus] = useState(null);
  
  const [sourceType, setSourceType] = useState('remote');
  const [githubToken, setGithubToken] = useState('');
  const [localPath, setLocalPath] = useState('');
  const [isDownloadingBrd, setIsDownloadingBrd] = useState(false);

  const handleDownloadBrd = async () => {
    setIsDownloadingBrd(true);
    try {
      const targetRepo = sourceType === 'remote' ? repoUrl : localPath;
      if (!targetRepo || !result?.fullBrdReport) {
        throw new Error('Technical document is available after repository analysis completes.');
      }

      const title = result.fullBrdReport.appName || result.projectType || 'Technical Document';
      const createResponse = await fetch(`${API_BASE_URL}/technical-documents/from-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...result,
          repoUrl: sourceType === 'remote' ? targetRepo : result.repoUrl || '',
          localPath: sourceType === 'local' ? targetRepo : result.localPath || '',
        }),
      });
      const createdDocument = await createResponse.json();
      if (!createResponse.ok) {
        throw new Error(createdDocument.detail || 'Failed to generate technical document');
      }

      const htmlResponse = await fetch(`${API_BASE_URL}/technical-documents/${createdDocument.id}/download-html`);
      if (!htmlResponse.ok) {
        throw new Error('Failed to download technical document HTML');
      }
      const blob = await htmlResponse.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title.replace(/[^a-z0-9]+/gi, '_')}.html`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error(err);
      alert(err.message || 'Error downloading technical document');
    } finally {
      setIsDownloadingBrd(false);
    }
  };

  React.useEffect(() => {
    if (result && repoUrl) {
      const repoName = repoUrl.split('/').pop().replace('.git', '');
      getPlaywrightStatus(repoName).then(pwStatus => {
        setPlaywrightStatus(pwStatus);
      }).catch(err => {
        // Optional
      });
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
          // Playwright detection is optional Ã¢â‚¬â€ don't block the UI
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

  // --- DYNAMIC DATA FOR GRAPHICAL VIEW ---
  const getDynamicScore = (label) => {
    if (!result) return 0;
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

  const overallScore = result ? Math.round(
    (getDynamicScore('Maintainability') + 
     getDynamicScore('Reliability') + 
     getDynamicScore('Security') + 
     getDynamicScore('Performance') + 
     getDynamicScore('Test Coverage')) / 5
  ) : 0;

  const complexityData = result ? [
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

  const codeSmells = result ? [
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
  if (result) {
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
      <div className="bg-white dark:bg-dark-900 border border-slate-100 dark:border-dark-800 rounded-2xl p-5 shadow-sm flex flex-col">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-6">Code Quality Score</h3>
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
            <div className="absolute top-[65%] left-1/2 -translate-x-1/2 text-[10px] text-slate-500 font-bold">/100</div>
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
                <span className="w-20 font-semibold text-slate-600 dark:text-slate-400">{item.label}</span>
                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${item.score}%`, backgroundColor: item.color }} />
                </div>
                <span className="w-8 text-right text-slate-500">{item.score}/100</span>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-auto flex items-center gap-2">
          <span className="font-bold text-sm" style={{ color: getScoreColor(overallScore) }}>
            {overallScore >= 80 ? 'Good' : overallScore >= 60 ? 'Fair' : overallScore > 0 ? 'Needs Refactoring' : 'No Data'}
          </span>
          <span className="text-xs text-slate-400 flex items-center gap-1">
            {result ? 'Calculated from analysis facts' : 'Run an analysis to score'}
          </span>
        </div>
      </div>

      {/* 2. Complexity Analysis */}
      <div className="bg-white dark:bg-dark-900 border border-slate-100 dark:border-dark-800 rounded-2xl p-5 shadow-sm relative flex flex-col">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-2">Complexity Analysis</h3>
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
        <div className="absolute bottom-4 left-0 w-full flex justify-center gap-4 text-[10px] text-slate-500 font-semibold">
          <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-orange-500" /> Current</span>
          <span className="flex items-center gap-1 text-slate-400 border-b border-dashed border-slate-400 pb-0.5">Recommended</span>
        </div>
      </div>

      {/* 3. Code Smells */}
      <div className="bg-white dark:bg-dark-900 border border-slate-100 dark:border-dark-800 rounded-2xl p-5 shadow-sm flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Code Smells</h3>
        </div>
        <div className="flex-1 space-y-3.5 flex flex-col justify-center">
          {codeSmells.length > 0 ? codeSmells.map(smell => (
            <div key={smell.label} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${smell.bg}`}>
                  {smell.icon}
                </div>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{smell.label}</span>
              </div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{smell.count}</span>
            </div>
          )) : (
            <span className="text-xs text-slate-400">No code smells detected yet.</span>
          )}
        </div>
        <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
          <span className="text-xs font-bold text-slate-500">Total Code Smells</span>
          <span className="text-sm font-black text-slate-800">{totalCodeSmells}</span>
        </div>
      </div>

      {/* 4. Dependency Graph */}
      <div className="bg-white dark:bg-dark-900 border border-slate-100 dark:border-dark-800 rounded-2xl p-5 shadow-sm flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Dependency Graph</h3>
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
                <div className="w-14 h-14 bg-white rounded-full border-[3px] border-orange-400 shadow-md flex items-center justify-center z-10">
                  <Package size={22} className="text-orange-500" />
                </div>
                <span className="text-[10px] font-bold mt-1 text-slate-800 bg-white border border-slate-200 rounded-full px-2 py-0.5 shadow-sm text-center max-w-[90px] leading-tight">Project</span>
              </div>
              
              {result.dependencies[0] && (
                <div className="absolute top-[30px] left-[120px] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                  <div className="w-9 h-9 bg-white rounded-full border border-slate-200 shadow-sm flex items-center justify-center z-10">
                    <Database size={16} className="text-slate-500" />
                  </div>
                  <span className="text-[8px] font-bold mt-1 text-slate-600 dark:text-slate-300 bg-white dark:bg-dark-900 border border-slate-150 dark:border-dark-800 rounded-full px-2 py-0.5 shadow-sm text-center whitespace-normal max-w-[110px] leading-tight">{result.dependencies[0]}</span>
                </div>
              )}
              {result.dependencies[1] && (
                <div className="absolute top-[80px] left-[190px] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                  <div className="w-9 h-9 bg-white rounded-full border border-slate-200 shadow-sm flex items-center justify-center z-10">
                    <Server size={16} className="text-slate-500" />
                  </div>
                  <span className="text-[8px] font-bold mt-1 text-slate-600 dark:text-slate-300 bg-white dark:bg-dark-900 border border-slate-150 dark:border-dark-800 rounded-full px-2 py-0.5 shadow-sm text-center whitespace-normal max-w-[110px] leading-tight">{result.dependencies[1]}</span>
                </div>
              )}
              {result.dependencies[2] && (
                <div className="absolute top-[180px] left-[170px] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                  <div className="w-9 h-9 bg-white rounded-full border border-slate-200 shadow-sm flex items-center justify-center z-10">
                    <Globe size={16} className="text-slate-500" />
                  </div>
                  <span className="text-[8px] font-bold mt-1 text-slate-600 dark:text-slate-300 bg-white dark:bg-dark-900 border border-slate-150 dark:border-dark-800 rounded-full px-2 py-0.5 shadow-sm text-center whitespace-normal max-w-[110px] leading-tight">{result.dependencies[2]}</span>
                </div>
              )}
              {result.dependencies[3] && (
                <div className="absolute top-[180px] left-[70px] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                  <div className="w-9 h-9 bg-white rounded-full border border-slate-200 shadow-sm flex items-center justify-center z-10">
                    <Code size={16} className="text-slate-500" />
                  </div>
                  <span className="text-[8px] font-bold mt-1 text-slate-600 dark:text-slate-300 bg-white dark:bg-dark-900 border border-slate-150 dark:border-dark-800 rounded-full px-2 py-0.5 shadow-sm text-center whitespace-normal max-w-[110px] leading-tight">{result.dependencies[3]}</span>
                </div>
              )}
              {result.dependencies[4] && (
                <div className="absolute top-[80px] left-[50px] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                  <div className="w-9 h-9 bg-white rounded-full border border-slate-200 shadow-sm flex items-center justify-center z-10">
                    <Shield size={16} className="text-slate-500" />
                  </div>
                  <span className="text-[8px] font-bold mt-1 text-slate-600 dark:text-slate-300 bg-white dark:bg-dark-900 border border-slate-150 dark:border-dark-800 rounded-full px-2 py-0.5 shadow-sm text-center whitespace-normal max-w-[110px] leading-tight">{result.dependencies[4]}</span>
                </div>
              )}
            </div>
          ) : (
            <span className="text-xs text-slate-400">Run an analysis to map dependencies.</span>
          )}
        </div>
        <div className="flex justify-center gap-5 text-[9px] font-semibold text-slate-400 mt-auto pt-2">
          <span className="flex items-center gap-1.5"><div className="w-5 border-b-2 border-slate-300" /> Direct Dependency</span>
          <span className="flex items-center gap-1.5"><div className="w-5 border-b-2 border-dashed border-slate-300" /> Transitive Dependency</span>
        </div>
      </div>

      {/* 5. Java Version Distribution */}
      <div className="bg-white dark:bg-dark-900 border border-slate-100 dark:border-dark-800 rounded-2xl p-5 shadow-sm flex flex-col">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-4">Java Version Distribution</h3>
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
              <div className="text-xl font-bold text-slate-800">{javaVersionData.length > 0 ? '100%' : '0'}</div>
            </div>
          </div>
          <div className="flex-1 flex flex-col gap-3.5 ml-4">
            {javaVersionData.length > 0 ? javaVersionData.map(v => (
              <div key={v.name} className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: v.color }} />
                  <span className="font-semibold text-slate-700">{v.name}</span>
                </div>
                <span className="text-slate-500 font-medium">{v.value}%</span>
              </div>
            )) : (
              <span className="text-xs text-slate-400">No data available</span>
            )}
          </div>
        </div>
        {result?.detectedJavaVersion === '8' && (
          <div className="mt-auto bg-orange-50 p-3.5 rounded-xl border border-orange-100 flex items-start gap-2.5">
            <AlertTriangle size={15} className="text-orange-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-[11px] font-semibold text-slate-800 m-0">This repository is primarily using Java 8.</p>
              <p className="text-[10px] text-slate-500 m-0 mt-1 font-medium">Recommended upgrade path: Java 8 Ã¢â€ â€™ Java 17 Ã¢â€ â€™ Java 21</p>
            </div>
          </div>
        )}
      </div>

      {/* 6. Recommended Actions */}
      <div className="bg-white dark:bg-dark-900 border border-slate-100 dark:border-dark-800 rounded-2xl p-5 shadow-sm flex flex-col">
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Recommended Actions</h3>
        </div>
        <div className="flex flex-col gap-4 flex-1">
          {recommendations.length > 0 ? recommendations.map(rec => (
            <div key={rec.title} className="flex items-start justify-between pb-3.5 border-b border-slate-50 last:border-0 last:pb-0">
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${rec.bg}`}>
                  {rec.icon}
                </div>
                <div>
                  <h4 className="text-[12px] font-bold text-slate-800 m-0">{rec.title}</h4>
                  <p className="text-[10px] text-slate-500 m-0 leading-tight mt-1 max-w-[170px]">{rec.desc}</p>
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
              <span className="text-xs text-slate-400">Run an analysis to see recommendations.</span>
            </div>
          )}
        </div>
      </div>
    </div>
      {result && result.migrationRecommendation !== 'This project is already using the latest Java version. No migration is required.' && (
        <div className="flex justify-end">
          <button
            onClick={() => setActiveTab('migration')}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl text-xs transition-all shadow-md"
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
        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-2">
          <GitBranch className="text-brand-500" size={22} />
          Repository Analysis
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          Submit a GitHub repository link or provide a local folder path to inspect project properties and run a complete code audit.
        </p>

        <div className="flex items-center gap-4 mb-4">
          <label className="flex items-center gap-2 text-sm cursor-pointer text-slate-700 dark:text-slate-300 font-medium">
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
          <label className="flex items-center gap-2 text-sm cursor-pointer text-slate-700 dark:text-slate-300 font-medium">
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
                className="flex-[2] px-4 py-3 rounded-xl border border-slate-200 dark:border-dark-800 bg-white/50 dark:bg-dark-950/50 focus:ring-2 focus:ring-brand-500 focus:outline-none transition-all text-sm"
              />
              <input
                type="password"
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                placeholder="PAT Token (optional)"
                disabled={loading}
                className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-dark-800 bg-white/50 dark:bg-dark-950/50 focus:ring-2 focus:ring-brand-500 focus:outline-none transition-all text-sm"
              />
              <button
                type="submit"
                disabled={loading}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm whitespace-nowrap"
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
                className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-dark-800 bg-white/50 dark:bg-dark-950/50 focus:ring-2 focus:ring-brand-500 focus:outline-none transition-all text-sm"
              />
              <button
                type="submit"
                disabled={loading}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm whitespace-nowrap"
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

        {loading && (
          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-indigo-700 dark:text-indigo-300">
                {statusText}
              </span>
              <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                {elapsedTime}s elapsed
              </span>
            </div>
            <div className="rocket-progress-container">
              <div className="rocket-progress-fill" style={{ width: `${Math.min(95, (parseFloat(elapsedTime) || 0) * 2)}%` }}></div>
              <div className="rocket-icon-animated" style={{ left: `${Math.min(90, (parseFloat(elapsedTime) || 0) * 2)}%` }}>
                Ã°Å¸Å¡â‚¬
              </div>
              <div className="rocket-smoke" style={{ left: `calc(${Math.min(90, (parseFloat(elapsedTime) || 0) * 2)}% - 22px)` }}></div>
            </div>
            <div className="p-4 rounded-xl border border-indigo-100 dark:border-indigo-950 bg-indigo-50/30 dark:bg-indigo-950/20 text-sm text-indigo-700 dark:text-indigo-300 font-semibold animate-pulse">
              Status: {statusText} ({elapsedTime}s)
            </div>
          </div>
        )}

        {timeTaken && result && !loading && (
          <div className="mt-6 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-sm font-semibold flex items-center gap-2 font-sans">
            <CheckCircle size={18} className="text-emerald-500" />
            Repository analysis completed in {timeTaken}s.
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-dark-900 rounded-xl w-fit">
        <button
          onClick={() => setViewMode('overview')}
          className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${
            viewMode === 'overview' 
              ? 'bg-white dark:bg-dark-800 text-brand-600 shadow-sm' 
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setViewMode('graphical')}
          className={`px-5 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
            viewMode === 'graphical' 
              ? 'bg-white dark:bg-dark-800 text-brand-600 shadow-sm' 
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Graphical View
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 glass-card flex gap-3 items-start">
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
        result && (
          <div className="space-y-8 animate-fadeIn">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-6">
                  <div className="p-6 glass-card">
                    <h3 className="text-md font-bold text-slate-900 dark:text-white mb-4">Project Parameters</h3>
                    <table className="w-full text-xs text-left">
                      <tbody>
                        <tr className="border-b border-slate-100 dark:border-dark-800">
                          <td className="py-3 font-semibold text-slate-400">Language</td>
                          <td className="py-3 font-bold text-slate-800 dark:text-slate-200">{result.projectType || 'Java'}</td>
                        </tr>
                        {result.detectedJavaVersion && (
                        <tr className="border-b border-slate-100 dark:border-dark-800">
                          <td className="py-3 font-semibold text-slate-400">Java Version</td>
                          <td className="py-3 font-bold text-brand-600 dark:text-brand-400">Java {result.detectedJavaVersion}</td>
                        </tr>
                        )}
                        <tr className="border-b border-slate-100 dark:border-dark-800">
                          <td className="py-3 font-semibold text-slate-400">Build Tool / PM</td>
                          <td className="py-3 font-bold text-slate-800 dark:text-slate-200">{result.buildTool || 'Not Detected'}</td>
                        </tr>
                        <tr className="border-b border-slate-100 dark:border-dark-800">
                          <td className="py-3 font-semibold text-slate-400">Framework</td>
                          <td className="py-3 font-bold text-slate-800 dark:text-slate-200">{result.frameworkType || (result.frameworkVersions && result.frameworkVersions["Spring Boot"] ? `Spring Boot ${result.frameworkVersions["Spring Boot"]}` : 'Not Detected')}</td>
                        </tr>
                        <tr className="border-b border-slate-100 dark:border-dark-800">
                          <td className="py-3 font-semibold text-slate-400">Database</td>
                          <td className="py-3 font-bold text-slate-800 dark:text-slate-200">{result.database || 'None'}</td>
                        </tr>
                        <tr className="border-b border-slate-100 dark:border-dark-800">
                          <td className="py-3 font-semibold text-slate-400">Packaging</td>
                          <td className="py-3 font-bold text-slate-800 dark:text-slate-200 uppercase">{result.packagingType || 'jar'}</td>
                        </tr>
                        <tr className="border-b border-slate-100 dark:border-dark-800">
                          <td className="py-3 font-semibold text-slate-400">Multi-module</td>
                          <td className={`py-3 font-bold ${result.isMultiModule ? 'text-amber-600 dark:text-amber-400' : 'text-slate-800 dark:text-slate-200'}`}>
                            {result.isMultiModule ? 'Yes' : 'No'}
                          </td>
                        </tr>
                        <tr className="border-b border-slate-100 dark:border-dark-800">
                          <td className="py-3 font-semibold text-slate-400">Frontend</td>
                          <td className="py-3 font-bold text-slate-800 dark:text-slate-200">{result.frontendFramework || (result.hasFrontend ? 'Detected' : 'None')}</td>
                        </tr>
                        <tr className="border-b border-slate-100 dark:border-dark-800">
                          <td className="py-3 font-semibold text-slate-400">API Endpoints</td>
                          <td className="py-3 font-bold text-indigo-600 dark:text-indigo-400">{result.endpointCount ?? 0} detected</td>
                        </tr>
                        <tr>
                          <td className="py-3 font-semibold text-slate-400">Risk Level</td>
                          <td className="py-3">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              result.riskLevel === 'High' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                              : result.riskLevel === 'Medium' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            }`}>{result.riskLevel || 'Low'}</span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  {result.deprecatedApis && result.deprecatedApis.length > 0 && (
                    <div className="p-6 glass-card border-l-4 border-amber-500">
                      <h3 className="text-md font-bold text-amber-700 dark:text-amber-400 mb-3 flex items-center gap-2">
                        <ShieldAlert size={16} /> Deprecated APIs Found
                      </h3>
                      <ul className="space-y-1.5">
                        {result.deprecatedApis.map((api, idx) => (
                          <li key={idx} className="text-[10px] text-amber-700 dark:text-amber-300 bg-amber-500/5 rounded-lg px-3 py-2 font-mono leading-relaxed">
                            Ã¢Å¡Â  {api}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="p-6 glass-card">
                    <h3 className="text-md font-bold text-slate-900 dark:text-white mb-4">Core Dependencies</h3>
                    <div className="flex flex-wrap gap-2">
                      {result.dependencies.length > 0 ? (
                        result.dependencies.map((dep, idx) => (
                          <span key={idx} className="px-2.5 py-1 bg-slate-100 dark:bg-dark-800 rounded-lg text-[10px] font-semibold text-slate-600 dark:text-slate-400">
                            {dep}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400 italic">No standard frameworks detected</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="lg:col-span-2 h-full">
                  <div className="p-6 glass-card h-full flex flex-col">
                    <div className="flex justify-between items-center mb-6 shrink-0">
                      <h3 className="text-md font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <BookOpen className="text-indigo-500" size={18} />
                        BRD Report Summary
                      </h3>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={handleDownloadBrd}
                          disabled={isDownloadingBrd || !result.fullBrdReport}
                          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg shadow-sm transition-all"
                        >
                          {isDownloadingBrd || !result.fullBrdReport ? 'Generating Technical Document HTML...' : 'Technical Document HTML'}
                        </button>
                      </div>
                    </div>
                    
                    {result.fullBrdReport ? (
                      <div className="relative flex-1 min-h-[300px] overflow-y-auto pr-2">
                        <div className="space-y-6 text-sm text-slate-700 dark:text-slate-300">
                          
                          <div>
                            <h4 className="font-bold text-slate-900 dark:text-white mb-2">Application Purpose</h4>
                            <p className="leading-relaxed bg-slate-50 dark:bg-dark-900 p-3 rounded-lg border border-slate-100 dark:border-dark-800">
                              {result.fullBrdReport.appPurposeDesc}
                            </p>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <h4 className="font-bold text-slate-900 dark:text-white mb-2">Key Business Capabilities</h4>
                              <ul className="list-disc pl-5 space-y-1">
                                {result.fullBrdReport.capabilities?.map((cap, idx) => (
                                  <li key={idx}>{cap.name}</li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-900 dark:text-white mb-2">Business Components</h4>
                              <ul className="list-disc pl-5 space-y-1">
                                {result.fullBrdReport.bizComponents?.map((item, idx) => (
                                  <li key={idx}>{item}</li>
                                ))}
                              </ul>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <h4 className="font-bold text-slate-900 dark:text-white mb-2">Technology Stack</h4>
                              <div className="flex flex-wrap gap-2">
                                {result.fullBrdReport.techStackSummary?.map((item, idx) => (
                                  <span key={idx} className="px-2 py-1 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 rounded text-[10px] font-semibold">
                                    {item}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-900 dark:text-white mb-2">API Groups</h4>
                              <div className="inline-flex items-center justify-center w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-bold rounded-full">
                                {result.fullBrdReport.apiGroups?.length || 0}
                              </div>
                            </div>
                          </div>

                          <div>
                            <h4 className="font-bold text-slate-900 dark:text-white mb-2">Primary Data Stores</h4>
                            <ul className="list-disc pl-5 space-y-1 bg-slate-50 dark:bg-dark-900 p-3 rounded-lg border border-slate-100 dark:border-dark-800">
                                {result.fullBrdReport.primaryDataStores?.map((ds, idx) => (
                                  <li key={idx}>{ds.name}: {ds.description}</li>
                                ))}
                            </ul>
                          </div>

                          <div>
                            <h4 className="font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                              <AlertTriangle size={16} className="text-amber-500" /> Technical Risks
                            </h4>
                            <ul className="list-disc pl-5 space-y-1 text-amber-700 dark:text-amber-400">
                              {result.fullBrdReport.technicalRisks?.map((item, idx) => (
                                <li key={idx}>{item.title}</li>
                              ))}
                            </ul>
                          </div>

                          <div>
                            <h4 className="font-bold text-slate-900 dark:text-white mb-2">Testing & Comprehension Context</h4>
                            <p className="leading-relaxed bg-indigo-50 dark:bg-indigo-900/20 text-indigo-800 dark:text-indigo-300 p-3 rounded-lg border border-indigo-100 dark:border-indigo-800">
                              {result.fullBrdReport.modernizationContext}
                            </p>
                          </div>

                        </div>
                      </div>
                    ) : (
                      <div className="relative flex-1 min-h-[300px]">
                        <div className="absolute inset-0 flex items-center justify-center flex-col text-slate-400">
                          <BookOpen size={48} className="mb-4 opacity-20" />
                          <p>BRD Summary not available.</p>
                        </div>
                      </div>
                    )}
                    
                  </div>
                </div>
              </div>
          </div>
        )
      )}
    </div>
  );
}

