import axios from 'axios';

let apiBase = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';
if (apiBase.startsWith('http') && !apiBase.endsWith('/api')) {
  apiBase = apiBase.replace(/\/$/, '') + '/api';
}
export const API_BASE_URL = apiBase;

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
});

// Interceptor to inject provider and apiKey from local storage
apiClient.interceptors.request.use((config) => {
  const settings = JSON.parse(localStorage.getItem('assistant_settings') || '{}');
  
  if (config.data) {
    let dataObj = config.data;
    const isString = typeof config.data === 'string';
    
    if (isString) {
      try {
        dataObj = JSON.parse(config.data);
      } catch (e) {
        // Fallback if not parsable
      }
    }
    
    if (dataObj && typeof dataObj === 'object') {
      if (!dataObj.apiKey && settings.apiKey) {
        dataObj.apiKey = settings.apiKey;
      }
      if (!dataObj.provider && settings.provider) {
        dataObj.provider = settings.provider;
      }
      if (!dataObj.modelName && settings.modelName) {
        dataObj.modelName = settings.modelName;
      }
      
      if (isString) {
        config.data = JSON.stringify(dataObj);
      } else {
        config.data = dataObj;
      }
    }
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export const getStatus = async () => {
  const response = await apiClient.get('/status');
  return response.data;
};

export const analyzeRepository = async (repoUrl, githubToken, localPath, sessionId = null) => {
  const response = await apiClient.post('/analyze', { repoUrl, githubToken, localPath, sessionId });
  return response.data;
};

export const createSession = async (repoUrl = "", localPath = "") => {
  const response = await apiClient.post('/sessions', { repoUrl, localPath });
  return response.data;
};

export const getSession = async (sessionId) => {
  const response = await apiClient.get(`/sessions/${sessionId}`);
  return response.data;
};

export const updateSession = async (sessionId, updates) => {
  const response = await apiClient.patch(`/sessions/${sessionId}`, { updates });
  return response.data;
};

export const migrateRepository = async (repoUrl, targetVersion) => {
  const response = await apiClient.post('/migrate', { repoUrl, targetVersion });
  return response.data;
};

export const getMigrationStatus = async (taskId) => {
  const response = await apiClient.get(`/migrate/status/${taskId}`);
  return response.data;
};

export const convertCode = async (files) => {
  const response = await apiClient.post('/convert', { files });
  return response.data;
};

export const getMigrationReportUrl = () => {
  return `${API_BASE_URL}/report/migration`;
};

export const getConversionReportUrl = () => {
  return `${API_BASE_URL}/report/conversion`;
};

export const getPythonZipUrl = () => {
  return `${API_BASE_URL}/download/python`;
};

export const askChatbot = async (message) => {
  const response = await apiClient.post('/chat', { message });
  return response.data;
};

export const startProject = async (repoName) => {
  const response = await apiClient.post('/run/start', { repoName });
  return response.data;
};

export const stopProject = async (repoName) => {
  const response = await apiClient.post('/run/stop', { repoName });
  return response.data;
};

export const getProjectStatus = async (repoName) => {
  const response = await apiClient.get(`/run/status/${repoName}`);
  return response.data;
};

export const getProjectLogs = async (repoName) => {
  const response = await apiClient.get(`/run/logs/${repoName}`);
  return response.data;
};

export const getWorkflowStatus = async (repoName) => {
  const response = await apiClient.get(`/workflow/status/${repoName}`);
  return response.data;
};

// --- API Key Management Endpoints ---

export const getActiveProvider = async () => {
  const response = await apiClient.get('/keys/active-provider');
  return response.data;
};

export const setActiveProvider = async (provider) => {
  const response = await apiClient.put('/keys/active-provider', { provider });
  return response.data;
};

export const getApiKeys = async (provider) => {
  const response = await apiClient.get(`/keys/${provider}`);
  return response.data;
};

export const addApiKey = async (provider, name, key, is_default = false) => {
  const response = await apiClient.post(`/keys/${provider}`, { name, key, is_default });
  return response.data;
};

export const editApiKey = async (provider, keyId, name, key = null) => {
  const payload = { name };
  if (key) payload.key = key;
  const response = await apiClient.put(`/keys/${provider}/${keyId}`, payload);
  return response.data;
};

export const deleteApiKey = async (provider, keyId) => {
  const response = await apiClient.delete(`/keys/${provider}/${keyId}`);
  return response.data;
};

export const toggleApiKeyStatus = async (provider, keyId, is_active) => {
  const response = await apiClient.patch(`/keys/${provider}/${keyId}/status`, { is_active });
  return response.data;
};

export const setDefaultApiKey = async (provider, keyId) => {
  const response = await apiClient.patch(`/keys/${provider}/${keyId}/default`);
  return response.data;
};

// --- Playwright Testing Endpoints ---

export const getPlaywrightStatus = async (migrationId) => {
  const response = await apiClient.get(`/migration/${encodeURIComponent(migrationId)}/playwright/status`);
  return response.data;
};

export const runPlaywrightTests = async (migrationId) => {
  const response = await apiClient.post(`/migration/${encodeURIComponent(migrationId)}/playwright/run`);
  return response.data;
};

export const getPlaywrightReportUrl = (migrationId) => {
  return `${API_BASE_URL}/migration/${encodeURIComponent(migrationId)}/playwright/report`;
};

// --- Selenium Testing Endpoints ---

export const getSeleniumStatus = async (migrationId) => {
  const response = await apiClient.get(`/migration/${encodeURIComponent(migrationId)}/selenium/status`);
  return response.data;
};

export const runSeleniumTests = async (migrationId) => {
  const response = await apiClient.post(`/migration/${encodeURIComponent(migrationId)}/selenium/run`);
  return response.data;
};

export const getSeleniumReportUrl = (migrationId) => {
  return `${API_BASE_URL}/migration/${encodeURIComponent(migrationId)}/selenium/report`;
};

export const validateRepository = async (repoUrl, patToken = null) => {
  const response = await apiClient.post('/validate-repo', {
    repoUrl,
    patToken
  });
  return response.data;
};

// --- Discovery Endpoints ---

export const getRepositoryTree = async (repositoryId) => {
  const response = await apiClient.get(`/repositories/${repositoryId}/tree`);
  return response.data;
};

export const getBrdDownloadUrl = (repoName) => {
  return `${API_BASE_URL}/brd/download/${encodeURIComponent(repoName)}`;
};

export const getUiTestCasesDownloadUrl = (repoName) => {
  return `${API_BASE_URL}/reports/ui-functional-test/download/${encodeURIComponent(repoName)}`;
};

export const getApiTestCasesDownloadUrl = (repoName) => {
  return `${API_BASE_URL}/reports/api-test-cases/download/${encodeURIComponent(repoName)}`;
};

export const getPlaywrightReportDownloadUrl = (repoName) => {
  return `${API_BASE_URL}/migration/${encodeURIComponent(repoName)}/playwright/report/download`;
};

export const getSeleniumReportDownloadUrl = (repoName) => {
  return `${API_BASE_URL}/migration/${encodeURIComponent(repoName)}/selenium/report/download`;
};

export const getRepositoryFileContent = async (repositoryId, path) => {
  const response = await apiClient.get(`/repositories/${repositoryId}/files/content?path=${encodeURIComponent(path)}`);
  return response.data;
};

export const getUiTestCasesData = async (repoName) => {
  const response = await apiClient.get(`/reports/ui-functional-test/data/${encodeURIComponent(repoName)}`);
  return response.data;
};

export const getApiTestCasesData = async (repoName) => {
  const response = await apiClient.get(`/reports/api-test-cases/data/${encodeURIComponent(repoName)}`);
  return response.data;
};

export default apiClient;

