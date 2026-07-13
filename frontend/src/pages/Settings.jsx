import React, { useState, useEffect } from 'react';
import { 
  Key, Plus, Trash2, Edit2, CheckCircle2, Circle, AlertCircle, RefreshCw, Cpu,
  Settings as SettingsIcon, Shield
} from 'lucide-react';
import { 
  getActiveProvider, setActiveProvider, getApiKeys, addApiKey, 
  editApiKey, deleteApiKey, toggleApiKeyStatus, setDefaultApiKey 
} from '../api';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('api-management');
  
  // ==========================================
  // API MANAGEMENT STATE
  // ==========================================
  const [provider, setProvider] = useState('groq');
  const [globalProvider, setGlobalProvider] = useState('groq');
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  const [formData, setFormData] = useState({ id: '', name: '', key: '', is_default: false });

  const providers = [
    { id: 'groq', name: 'Groq', desc: 'Default ultra-fast inference' },
    { id: 'openai', name: 'OpenAI', desc: 'Fallback provider' },
    { id: 'gemini', name: 'Gemini', desc: 'Alternative fallback' }
  ];

  // ==========================================
  // SYSTEM MODEL STATE
  // ==========================================
  const [sysProvider, setSysProvider] = useState('gemini');
  const [sysApiKey, setSysApiKey] = useState('');
  const [sysModelName, setSysModelName] = useState('gemini-2.5-flash');
  const [sysSaveSuccess, setSysSaveSuccess] = useState(false);

  // Load configuration from local storage for System Model
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

    setSysProvider(loadedProvider);
    if (savedSettings.apiKey) setSysApiKey(savedSettings.apiKey);
    if (loadedModelName) setSysModelName(loadedModelName);
  }, []);

  const handleSaveSystemModel = (e) => {
    e.preventDefault();
    localStorage.setItem('assistant_settings', JSON.stringify({ 
        provider: sysProvider, 
        apiKey: sysApiKey, 
        modelName: sysModelName 
    }));
    setSysSaveSuccess(true);
    setTimeout(() => setSysSaveSuccess(false), 3000);
  };

  // ==========================================
  // API MANAGEMENT LOGIC
  // ==========================================
  const fetchState = async () => {
    setLoading(true);
    setError(null);
    try {
      const activeData = await getActiveProvider();
      setGlobalProvider(activeData.active_provider || 'groq');
      const keysData = await getApiKeys(provider);
      setKeys(keysData.keys || []);
    } catch (err) {
      setError('Failed to connect to backend key manager. Please ensure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'api-management') {
      fetchState();
    }
  }, [provider, activeTab]);

  const handleGlobalProviderChange = async (newProvider) => {
    try {
      await setActiveProvider(newProvider);
      setGlobalProvider(newProvider);
    } catch (e) {
      setError('Failed to update active provider.');
    }
  };

  const openAddModal = () => {
    setFormData({ id: '', name: '', key: '', is_default: keys.length === 0 });
    setIsAddModalOpen(true);
  };

  const openEditModal = (keyObj) => {
    setFormData({ id: keyObj.id, name: keyObj.name, key: '', is_default: keyObj.is_default });
    setIsEditModalOpen(true);
  };

  const handleSaveAdd = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.key) return;
    try {
      await addApiKey(provider, formData.name, formData.key, formData.is_default);
      setIsAddModalOpen(false);
      fetchState();
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to add key');
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!formData.name) return;
    try {
      await editApiKey(provider, formData.id, formData.name, formData.key ? formData.key : null);
      setIsEditModalOpen(false);
      fetchState();
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to update key');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this API Key?')) return;
    try {
      await deleteApiKey(provider, id);
      fetchState();
    } catch (e) {
      setError('Failed to delete key');
    }
  };

  const handleToggle = async (id, currentStatus) => {
    try {
      await toggleApiKeyStatus(provider, id, !currentStatus);
      fetchState();
    } catch (e) {
      setError('Failed to toggle key status');
    }
  };

  const handleSetDefault = async (id) => {
    try {
      await setDefaultApiKey(provider, id);
      fetchState();
    } catch (e) {
      setError('Failed to set default key');
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#F7F8FC]/50 overflow-y-auto">
      <div className="max-w-6xl w-full mx-auto p-6 lg:p-10 space-y-8 animate-fadeIn">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl font-black text-[#101828] flex items-center gap-3">
            <SettingsIcon className="text-brand-500" size={32} />
            Settings
          </h1>
          <p className="text-[#667085] mt-2">
            Configure system models and manage provider API keys securely.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 p-1.5 bg-[#F2F4F7] rounded-2xl w-fit">
          <button
            onClick={() => setActiveTab('api-management')}
            className={`px-5 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === 'api-management' 
                ? 'bg-white text-brand-600 shadow-card' 
                : 'text-[#667085] hover:text-[#344054]'
            }`}
          >
            <Key size={16} /> API Management
          </button>
          <button
            onClick={() => setActiveTab('system-model')}
            className={`px-5 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === 'system-model' 
                ? 'bg-white text-brand-600 shadow-card' 
                : 'text-[#667085] hover:text-[#344054]'
            }`}
          >
            <Cpu size={16} /> System Model
          </button>
        </div>

        {activeTab === 'api-management' && (
          <div className="space-y-8 animate-fadeIn">
            {error && (
              <div className="bg-red-50 border border-red-200 p-4 rounded-2xl flex items-start gap-3">
                <AlertCircle className="text-red-500 flex-shrink-0" size={20} />
                <p className="text-sm text-red-600 font-medium">{error}</p>
              </div>
            )}

            {/* Global Provider Selector */}
            <div className="bg-white border border-[#EAECF0]/60 rounded-2xl p-6 shadow-card">
              <h2 className="text-lg font-bold text-[#101828] flex items-center gap-2 mb-4">
                <Shield className="text-blue-500" size={20} />
                Global Active Provider
              </h2>
              <p className="text-sm text-[#667085] mb-6">
                Select which provider the system should use by default for all tasks.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {providers.map(p => (
                  <button
                    key={p.id}
                    onClick={() => handleGlobalProviderChange(p.id)}
                    className={`relative flex flex-col items-start p-4 border rounded-2xl transition-all ${
                      globalProvider === p.id 
                        ? 'border-blue-500 bg-blue-50 shadow-card' 
                        : 'border-[#EAECF0] hover:border-blue-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className={`font-bold ${globalProvider === p.id ? 'text-blue-700' : 'text-[#344054]'}`}>
                        {p.name}
                      </span>
                      {globalProvider === p.id && <CheckCircle2 size={18} className="text-blue-500" />}
                    </div>
                    <span className="text-xs text-[#667085] text-left">{p.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Key Management Area */}
            <div className="bg-white border border-[#EAECF0]/60 rounded-2xl shadow-card overflow-hidden flex flex-col">
              
              {/* Provider Tabs */}
              <div className="flex border-b border-[#EAECF0] bg-[#F7F8FC]">
                {providers.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setProvider(p.id)}
                    className={`px-6 py-4 text-sm font-bold transition-all border-b-2 ${
                      provider === p.id 
                        ? 'border-brand-500 text-brand-600 bg-white' 
                        : 'border-transparent text-[#667085] hover:text-[#344054]'
                    }`}
                  >
                    {p.name} Keys
                  </button>
                ))}
              </div>

              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-[#101828]">
                    Manage {providers.find(p => p.id === provider)?.name} Keys
                  </h3>
                  <button
                    onClick={openAddModal}
                    className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-2xl text-sm font-bold shadow-soft shadow-brand-500/20 transition-all"
                  >
                    <Plus size={16} />
                    Add New Key
                  </button>
                </div>

                {loading ? (
                  <div className="flex flex-col items-center justify-center py-12 text-[#98A2B3]">
                    <RefreshCw className="animate-spin mb-3 text-brand-500" size={24} />
                    <p>Loading keys...</p>
                  </div>
                ) : keys.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-[#EAECF0] rounded-2xl">
                    <Key className="mx-auto text-slate-300 mb-3" size={32} />
                    <h4 className="text-base font-bold text-[#344054] mb-1">No API Keys Configured</h4>
                    <p className="text-sm text-[#667085] mb-4 max-w-sm mx-auto">
                      You haven't added any {providers.find(p => p.id === provider)?.name} API keys yet. The system will fall back to environment variables.
                    </p>
                    <button
                      onClick={openAddModal}
                      className="text-brand-600 text-sm font-bold hover:underline"
                    >
                      + Add your first key
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-[#EAECF0] text-xs uppercase tracking-wider text-[#667085]">
                          <th className="pb-3 px-4 font-semibold">Key Name</th>
                          <th className="pb-3 px-4 font-semibold">API Key</th>
                          <th className="pb-3 px-4 font-semibold text-center">Status</th>
                          <th className="pb-3 px-4 font-semibold text-center">Default</th>
                          <th className="pb-3 px-4 font-semibold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {keys.map((k) => (
                          <tr key={k.id} className={`hover:bg-[#F7F8FC] transition-colors ${!k.is_active ? 'opacity-60' : ''}`}>
                            <td className="py-4 px-4 font-medium text-[#101828]">
                              {k.name}
                            </td>
                            <td className="py-4 px-4 font-mono text-xs text-[#667085] bg-[#F7F8FC] rounded px-2 py-1 inline-block mt-3">
                              {k.key}
                            </td>
                            <td className="py-4 px-4 text-center">
                              <button
                                onClick={() => handleToggle(k.id, k.is_active)}
                                className={`px-3 py-1 text-xs font-bold rounded-full ${
                                  k.is_active 
                                    ? 'bg-emerald-100 text-emerald-700' 
                                    : 'bg-[#F2F4F7] text-[#667085]'
                                }`}
                              >
                                {k.is_active ? 'Active' : 'Disabled'}
                              </button>
                            </td>
                            <td className="py-4 px-4 text-center">
                              <button
                                onClick={() => handleSetDefault(k.id)}
                                disabled={!k.is_active}
                                className={`p-1 rounded-full ${!k.is_active && 'opacity-50 cursor-not-allowed'}`}
                              >
                                {k.is_default ? (
                                  <CheckCircle2 size={20} className="text-brand-500" />
                                ) : (
                                  <Circle size={20} className="text-slate-300 hover:text-brand-400" />
                                )}
                              </button>
                            </td>
                            <td className="py-4 px-4 text-right">
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => openEditModal(k)}
                                  className="p-2 text-[#98A2B3] hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-colors"
                                  title="Edit Key"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button
                                  onClick={() => handleDelete(k.id)}
                                  className="p-2 text-[#98A2B3] hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                                  title="Delete Key"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
            
             {/* Add Modal */}
            {isAddModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsAddModalOpen(false)}></div>
                <div className="relative w-full max-w-md bg-white border border-[#EAECF0] rounded-3xl p-6 shadow-2xl animate-scaleIn z-55">
                  <h3 className="text-lg font-bold text-[#101828] mb-6">Add New {providers.find(p => p.id === provider)?.name} Key</h3>
                  <form onSubmit={handleSaveAdd} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#667085] mb-1">Key Name Alias</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Primary Production Key"
                        className="w-full bg-[#F7F8FC] border border-[#EAECF0] text-[#101828] rounded-2xl px-4 py-2.5 outline-none focus:border-brand-500 transition-colors"
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#667085] mb-1">API Key Secret</label>
                      <input
                        type="text"
                        required
                        placeholder="sk-..."
                        className="w-full bg-[#F7F8FC] border border-[#EAECF0] text-[#101828] rounded-2xl px-4 py-2.5 outline-none focus:border-brand-500 transition-colors font-mono text-sm"
                        value={formData.key}
                        onChange={e => setFormData({...formData, key: e.target.value})}
                      />
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <input
                        type="checkbox"
                        id="is_default"
                        checked={formData.is_default}
                        onChange={e => setFormData({...formData, is_default: e.target.checked})}
                        className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
                      />
                      <label htmlFor="is_default" className="text-sm font-medium text-[#344054]">
                        Set as default fallback key
                      </label>
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-[#F2F4F7] mt-6">
                      <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-sm font-bold text-[#475467] hover:bg-[#F2F4F7] rounded-2xl transition-colors">Cancel</button>
                      <button type="submit" className="px-4 py-2 text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-2xl shadow-soft transition-colors">Save API Key</button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Edit Modal */}
            {isEditModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsEditModalOpen(false)}></div>
                <div className="relative w-full max-w-md bg-white border border-[#EAECF0] rounded-3xl p-6 shadow-2xl animate-scaleIn z-55">
                  <h3 className="text-lg font-bold text-[#101828] mb-6">Edit {providers.find(p => p.id === provider)?.name} Key</h3>
                  <form onSubmit={handleSaveEdit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#667085] mb-1">Key Name Alias</label>
                      <input
                        type="text"
                        required
                        className="w-full bg-[#F7F8FC] border border-[#EAECF0] text-[#101828] rounded-2xl px-4 py-2.5 outline-none focus:border-brand-500 transition-colors"
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#667085] mb-1">New API Key Secret (Optional)</label>
                      <input
                        type="text"
                        placeholder="Leave blank to keep existing key"
                        className="w-full bg-[#F7F8FC] border border-[#EAECF0] text-[#101828] rounded-2xl px-4 py-2.5 outline-none focus:border-brand-500 transition-colors font-mono text-sm"
                        value={formData.key}
                        onChange={e => setFormData({...formData, key: e.target.value})}
                      />
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-[#F2F4F7] mt-6">
                      <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-sm font-bold text-[#475467] hover:bg-[#F2F4F7] rounded-2xl transition-colors">Cancel</button>
                      <button type="submit" className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-2xl shadow-soft transition-colors">Update Key</button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'system-model' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-white border border-[#EAECF0]/60 rounded-2xl p-6 shadow-card max-w-2xl">
              <h2 className="text-lg font-bold text-[#101828] flex items-center gap-2 mb-4">
                <Cpu className="text-blue-500" size={20} />
                System Model Configuration
              </h2>
              <p className="text-sm text-[#667085] mb-6">
                Configure the local environment settings for AI integrations.
              </p>

              {sysSaveSuccess && (
                <div className="mb-6 p-4 rounded-xl bg-emerald-50 text-emerald-700 text-sm font-bold flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-emerald-500" />
                  Settings saved successfully!
                </div>
              )}

              <form onSubmit={handleSaveSystemModel} className="space-y-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Select AI Provider
                  </label>
                  <select
                    value={sysProvider}
                    onChange={(e) => {
                      const newProvider = e.target.value;
                      setSysProvider(newProvider);
                      if (newProvider === 'gemini') setSysModelName('gemini-2.5-flash');
                      else if (newProvider === 'groq') setSysModelName('llama-3.3-70b-versatile');
                      else if (newProvider === 'openai') setSysModelName('gpt-4o-mini');
                    }}
                    className="w-full px-4 py-3 rounded-xl border border-[#EAECF0] bg-[#F7F8FC] focus:outline-none focus:border-brand-500 text-sm"
                  >
                    <option value="gemini">Google Gemini API (Default)</option>
                    <option value="groq">Groq API (llama-3.3-70b-versatile)</option>
                    <option value="openai">OpenAI API (gpt-4o-mini)</option>
                    <option value="ollama">Ollama (Local Llama3)</option>
                  </select>
                </div>

                {sysProvider !== 'ollama' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                        Enter API Key
                      </label>
                      <input
                        type="password"
                        value={sysApiKey}
                        onChange={(e) => setSysApiKey(e.target.value)}
                        placeholder="sk-..."
                        className="w-full px-4 py-3 rounded-xl border border-[#EAECF0] bg-[#F7F8FC] focus:outline-none focus:border-brand-500 text-sm font-mono"
                      />
                      <p className="text-xs text-slate-400 mt-1">If blank, it will fall back to server environment variables or Key Management setup.</p>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                        Model Name
                      </label>
                      <input
                        type="text"
                        value={sysModelName}
                        onChange={(e) => setSysModelName(e.target.value)}
                        placeholder="e.g. gemini-2.5-flash"
                        required
                        className="w-full px-4 py-3 rounded-xl border border-[#EAECF0] bg-[#F7F8FC] focus:outline-none focus:border-brand-500 text-sm font-mono"
                      />
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-[#EAECF0]">
                  <button
                    type="submit"
                    className="px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl text-sm transition-all shadow-md w-full sm:w-auto"
                  >
                    Save System Settings
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
