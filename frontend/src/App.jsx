import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, GitBranch, RefreshCw, Terminal, FileText, 
  Settings, Sparkles, ChevronRight, Cpu, LogOut, Menu, X, Folder, Key, FlaskConical, Search, HelpCircle, Bell, User, ArrowRight
} from 'lucide-react';

// Import Pages
import Dashboard from './pages/Dashboard';
import RepositoryAnalysis from './pages/RepositoryAnalysis';
import MigrationCenter from './pages/MigrationCenter';

import ApiKeyManagement from './pages/ApiKeyManagement';
import ChatbotWidget from './components/ChatbotWidget';
import Login from './pages/Login';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [darkMode, setDarkMode] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // Helper to get from localstorage safely
  const getLocalItem = (key, fallback) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : fallback;
    } catch (e) {
      return fallback;
    }
  };

  // Repository Analysis Page states
  const [analysisResult, setAnalysisResult] = useState(() => getLocalItem('last_analysis', null));
  const [analysisRepoUrl, setAnalysisRepoUrl] = useState(() => {
    const last = getLocalItem('last_analysis', null);
    return last ? last.repoUrl : '';
  });
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);
  const [analysisStatusText, setAnalysisStatusText] = useState('');
  const [analysisElapsedTime, setAnalysisElapsedTime] = useState(0);
  const [analysisTimeTaken, setAnalysisTimeTaken] = useState(() => getLocalItem('last_analysis_time', null));

  // Ticking effect for repository analysis loading timer
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

  // Migration Center Page states
  const [migrationResult, setMigrationResult] = useState(() => getLocalItem('last_migration', null));
  const [migrationRepoUrl, setMigrationRepoUrl] = useState(() => {
    const last = getLocalItem('last_analysis', null);
    return last ? last.repoUrl : '';
  });
  const [migrationTargetVersion, setMigrationTargetVersion] = useState('21');
  const [migrationLoading, setMigrationLoading] = useState(false);
  const [migrationError, setMigrationError] = useState(null);
  const [migrationStatusText, setMigrationStatusText] = useState('');
  const [migrationHistory, setMigrationHistory] = useState(() => getLocalItem('migration_history', []));
  const [migrationElapsedTime, setMigrationElapsedTime] = useState(0);
  const [migrationTimeTaken, setMigrationTimeTaken] = useState(() => getLocalItem('last_migration_time', null));

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

  // Settings state
  const [provider, setProvider] = useState('gemini');
  const [apiKey, setApiKey] = useState('');
  const [modelName, setModelName] = useState('gemini-2.5-flash');

  // Load configuration from local storage
  useEffect(() => {
    const savedSettings = JSON.parse(localStorage.getItem('assistant_settings') || '{}');
    let loadedProvider = savedSettings.provider || 'gemini';
    let loadedModelName = savedSettings.modelName;

    if (loadedProvider === 'groq') {
      if (!loadedModelName || loadedModelName === 'llama3-70b-8192' || loadedModelName.includes('gemini') || loadedModelName.includes('gpt')) {
        loadedModelName = 'llama-3.3-70b-versatile';
      }
    } else if (loadedProvider === 'gemini') {
      if (!loadedModelName || loadedModelName.includes('llama') || loadedModelName.includes('gpt')) {
        loadedModelName = 'gemini-2.5-flash';
      }
    } else if (loadedProvider === 'openai') {
      if (!loadedModelName || loadedModelName.includes('llama') || loadedModelName.includes('gemini')) {
        loadedModelName = 'gpt-4o-mini';
      }
    }

    setProvider(loadedProvider);
    if (savedSettings.apiKey) setApiKey(savedSettings.apiKey);
    if (loadedModelName) setModelName(loadedModelName);

    localStorage.setItem('assistant_settings', JSON.stringify({
      provider: loadedProvider,
      apiKey: savedSettings.apiKey || '',
      modelName: loadedModelName
    }));

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
      setDarkMode(false);
      document.body.classList.remove('dark');
    } else {
      setDarkMode(true);
      document.body.classList.add('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    const nextTheme = !darkMode;
    setDarkMode(nextTheme);
    if (nextTheme) {
      document.body.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const handleSaveSettings = (e) => {
    e.preventDefault();
    localStorage.setItem('assistant_settings', JSON.stringify({ provider, apiKey, modelName }));
    setSettingsOpen(false);
  };


  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { id: 'analysis', label: 'Repository Analysis', icon: <GitBranch size={18} /> },
    { id: 'migration', label: 'Project Runner', icon: <RefreshCw size={18} /> },

    { id: 'apikeys', label: 'API Keys', icon: <Key size={18} /> },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard setActiveTab={setActiveTab} />;
      case 'apikeys':
        return <ApiKeyManagement />;
      case 'analysis':
        return (
          <RepositoryAnalysis
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
          />
        );
      case 'migration':
        return (
          <MigrationCenter
            setActiveTab={setActiveTab}
            analysisResult={analysisResult}
            repoUrl={migrationRepoUrl}
            setRepoUrl={setMigrationRepoUrl}
            targetVersion={migrationTargetVersion}
            setTargetVersion={setMigrationTargetVersion}
            loading={migrationLoading}
            setLoading={setMigrationLoading}
            result={migrationResult}
            setResult={setMigrationResult}
            error={migrationError}
            setError={setMigrationError}
            statusText={migrationStatusText}
            setStatusText={setMigrationStatusText}
            history={migrationHistory}
            setHistory={setMigrationHistory}
            elapsedTime={migrationElapsedTime}
            timeTaken={migrationTimeTaken}
            setTimeTaken={setMigrationTimeTaken}
          />
        );

      default:
        return <Dashboard setActiveTab={setActiveTab} />;
    }
  };

  if (!isLoggedIn) {
    return <Login onLogin={() => setIsLoggedIn(true)} />;
  }

  return (
    <div className="flex h-screen bg-[#F7F8FC] font-sans text-[#101828] overflow-hidden">
      
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-64 flex-shrink-0 bg-white border-r border-[#EAECF0] relative z-30">
        <div className="p-6 pb-4 flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-[#5B5FF6] to-[#7B61FF] rounded-xl text-white shadow-soft">
            <Sparkles size={24} />
          </div>
          <div>
            <h1 className="font-extrabold text-xl text-[#101828] leading-tight tracking-tight">PROVA</h1>
            <span className="text-[10px] font-semibold text-[#667085] uppercase tracking-wider">AI Functional Testing</span>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-[14px] text-sm font-semibold transition-all ${
                activeTab === item.id
                  ? 'bg-gradient-to-r from-[#5B5FF6] to-[#7B61FF] text-white shadow-soft'
                  : 'text-[#667085] hover:bg-slate-50'
              }`}
            >
              {item.icon}
              {item.label}
              {activeTab === item.id && <ChevronRight size={16} className="ml-auto opacity-70" />}
            </button>
          ))}
        </nav>

        <div className="p-4 mx-4 mb-6 bg-[#EEF2FF] rounded-[16px] border border-[#E0E7FF]">
          <h4 className="text-sm font-bold text-[#3730A3] mb-1">AI-Powered Testing</h4>
          <p className="text-[11px] text-[#4F46E5] mb-3 leading-relaxed">Generate tests, execute and get AI insights in minutes.</p>
          <button
            onClick={() => setSettingsOpen(true)}
            className="w-full py-2 bg-white text-[#4F46E5] text-xs font-bold rounded-lg shadow-sm border border-[#E0E7FF] hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
          >
            Learn More <ArrowRight size={12} />
          </button>
        </div>
      </aside>

      {/* Main View Container */}
      <div className="flex flex-col flex-1 h-full overflow-hidden">
        {/* Navbar */}
        <header className="flex items-center justify-between px-8 py-4 bg-white border-b border-[#EAECF0] relative z-20 flex-shrink-0 h-[72px]">
          <div className="flex items-center gap-3 lg:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-[#667085] hover:bg-slate-50 rounded-xl"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <span className="font-extrabold text-sm text-[#101828]">PROVA</span>
          </div>
          
          <div className="hidden lg:flex items-center gap-2">
            <h2 className="text-xl font-bold text-[#101828]">
              {menuItems.find(m => m.id === activeTab)?.label || 'Dashboard'}
            </h2>
          </div>

          <div className="flex items-center gap-5">
            <div className="hidden md:flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg border border-[#EAECF0]">
              <Search size={16} className="text-[#667085]" />
              <input 
                type="text" 
                placeholder="Search projects..." 
                className="bg-transparent border-none outline-none text-sm w-48 text-[#101828] placeholder-[#98A2B3]"
              />
            </div>
            
            <button className="text-[#667085] hover:text-[#101828] transition-colors flex items-center gap-1.5 text-sm font-medium">
              <HelpCircle size={18} /> Help
            </button>
            
            <div className="relative">
              <button className="text-[#667085] hover:text-[#101828] transition-colors p-1">
                <Bell size={20} />
              </button>
              <span className="absolute top-0 right-0 w-2 h-2 bg-[#F04438] rounded-full border border-white"></span>
            </div>
            
            <div className="h-8 w-[1px] bg-[#EAECF0] mx-1"></div>
            
            <div className="flex items-center gap-3 cursor-pointer">
              <div className="w-9 h-9 rounded-full bg-gradient-to-r from-[#A5B4FC] to-[#818CF8] flex items-center justify-center text-white font-bold text-sm shadow-sm">
                AJ
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-semibold text-[#101828] leading-tight">Alex Johnson</p>
                <p className="text-xs text-[#667085]">Admin</p>
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic page contents scroll frame */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-6xl mx-auto">
            {renderContent()}
          </div>
        </main>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}></div>
          <div className="relative w-64 max-w-xs bg-white dark:bg-dark-900 h-full flex flex-col z-50 border-r border-slate-200/50 dark:border-dark-800 animate-slideRight">
            <div className="p-6 border-b border-slate-200 dark:border-dark-800 flex items-center gap-3">
              <div className="p-2 bg-brand-500 rounded-xl text-white">
                <Sparkles size={20} />
              </div>
              <div>
                <h1 className="font-extrabold text-sm text-slate-900 dark:text-white">Laura- The Test Assistant</h1>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Java Assistant</span>
              </div>
            </div>

            <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                    activeTab === item.id
                      ? 'bg-brand-500 text-white shadow-md'
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-800/40'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </nav>

            <div className="p-4 border-t border-slate-200 dark:border-dark-800">
              <button
                onClick={() => {
                  setSettingsOpen(true);
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 rounded-xl transition-all"
              >
                <Settings size={18} />
                Configure AI Layer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Dialog Drawer */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSettingsOpen(false)}></div>
          <div className="relative w-full max-w-md bg-white dark:bg-dark-900 border border-slate-200/50 dark:border-dark-800 rounded-3xl p-6 shadow-2xl animate-scaleIn z-55">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Cpu size={20} className="text-brand-500" />
                Configure AI Migration Layer
              </h3>
              <button
                onClick={() => setSettingsOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-6">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Select AI Provider
                </label>
                <select
                  value={provider}
                  onChange={(e) => {
                    const newProvider = e.target.value;
                    setProvider(newProvider);
                    if (newProvider === 'gemini') setModelName('gemini-2.5-flash');
                    else if (newProvider === 'groq') setModelName('llama-3.3-70b-versatile');
                    else if (newProvider === 'openai') setModelName('gpt-4-turbo');
                  }}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-dark-800 bg-white/50 dark:bg-dark-950/50 focus:outline-none text-xs"
                >
                  <option value="gemini">Google Gemini API (Default)</option>
                  <option value="groq">Groq API (llama-3.3-70b-versatile)</option>
                  <option value="openai">OpenAI API (gpt-4o-mini)</option>
                  <option value="ollama">Ollama (Local Llama3)</option>
                </select>
              </div>

              {provider !== 'ollama' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Enter API Key
                    </label>
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="sk-..."
                      required
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-dark-800 bg-white/50 dark:bg-dark-950/50 focus:outline-none text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Model Name
                    </label>
                    <input
                      type="text"
                      value={modelName}
                      onChange={(e) => setModelName(e.target.value)}
                      placeholder="e.g. gemini-2.5-flash or gemini-3.5-flash"
                      required
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-dark-800 bg-white/50 dark:bg-dark-950/50 focus:outline-none text-xs font-mono"
                    />
                    <p className="text-[10px] text-slate-400 mt-2">
                      Recommended: <code className="bg-slate-100 dark:bg-dark-800 px-1.5 py-0.5 rounded text-[9px]">gemini-2.5-flash</code> or <code className="bg-slate-100 dark:bg-dark-800 px-1.5 py-0.5 rounded text-[9px]">gemini-3.5-flash</code>.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 border-t border-slate-100 dark:border-dark-800 pt-4">
                <button
                  type="button"
                  onClick={() => setSettingsOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-dark-800 dark:hover:bg-dark-700 text-slate-800 dark:text-slate-200 font-semibold rounded-xl text-xs transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl text-xs transition-all shadow-md"
                >
                  Save Settings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ChatbotWidget />
    </div>
  );
}
