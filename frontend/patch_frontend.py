import re

filepath = 'c:/Users/ST-Balakumaran/Desktop/PROVA/frontend/src/pages/AITestRecommendation.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Add a state for dynamic analysis
old_state = """  const [testMetrics, setTestMetrics] = useState(null);
  const [uiTestCases, setUiTestCases] = useState([]);
  const [apiTestCases, setApiTestCases] = useState([]);
  const [loadingUiData, setLoadingUiData] = useState(true);
  const [loadingApiData, setLoadingApiData] = useState(true);"""

new_state = """  const [testMetrics, setTestMetrics] = useState(null);
  const [uiTestCases, setUiTestCases] = useState([]);
  const [apiTestCases, setApiTestCases] = useState([]);
  const [loadingUiData, setLoadingUiData] = useState(true);
  const [loadingApiData, setLoadingApiData] = useState(true);
  const [dynamicAnalysis, setDynamicAnalysis] = useState(null);
  const [dynamicLoading, setDynamicLoading] = useState(true);"""
content = content.replace(old_state, new_state)

# Add a fetcher for dynamic analysis
old_fetch = """    const fetchApiTestCases = async () => {
      try {
        setLoadingApiData(true);"""

new_fetch = """    const fetchDynamicAnalysis = async () => {
      try {
        setDynamicLoading(true);
        const encodedId = encodeURIComponent(projectId);
        const response = await fetch(`${API_BASE_URL}/api/dynamic-analysis/${encodedId}`);
        if (response.ok) {
           const data = await response.json();
           setDynamicAnalysis(data);
           if (data.status === "PROCESSING") {
              setTimeout(fetchDynamicAnalysis, 3000); // Poll every 3 seconds
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

    const fetchApiTestCases = async () => {
      try {
        setLoadingApiData(true);"""
content = content.replace(old_fetch, new_fetch)

# Now inject the dynamic values into calculateTestStats
old_calc_stats = """  const calculateTestStats = () => {
    // FILTER OUT OLD FALLBACKS
    const validUiTestCases = uiTestCases.filter(tc => tc.scenario !== "Basic Load Test" && tc.scenario !== "Fallback Scenario");
    const validApiTestCases = apiTestCases.filter(tc => tc.scenario !== "Fallback API Test");

    // UI STATS
    const totalUi = validUiTestCases.length;"""

new_calc_stats = """  const calculateTestStats = () => {
    // FILTER OUT OLD FALLBACKS
    const validUiTestCases = uiTestCases.filter(tc => tc.scenario !== "Basic Load Test" && tc.scenario !== "Fallback Scenario");
    const validApiTestCases = apiTestCases.filter(tc => tc.scenario !== "Fallback API Test");

    // DYNAMIC METRICS FROM BACKGROUND EXECUTION
    const dynUi = dynamicAnalysis?.ui || {};
    const dynApi = dynamicAnalysis?.api || {};
    
    // UI STATS
    const totalUi = dynUi.total !== undefined ? dynUi.total : validUiTestCases.length;"""
content = content.replace(old_calc_stats, new_calc_stats)

old_api_stats = """    // Execution time: Estimate 1.5 mins per functional test
    const estExecMins = totalUi > 0 ? Math.max(1, Math.ceil(totalUi * 1.5)) : 0;
    
    // API STATS
    const totalApi = validApiTestCases.length;"""
new_api_stats = """    // Execution time: Estimate 1.5 mins per functional test
    const estExecMins = totalUi > 0 ? Math.max(1, Math.ceil(totalUi * 1.5)) : 0;
    
    // API STATS
    const totalApi = dynApi.total !== undefined ? dynApi.total : validApiTestCases.length;"""
content = content.replace(old_api_stats, new_api_stats)

# Show loading screen if processing
old_render_start = """  if (!analysisResult) return null;

  return (
    <div className="w-full flex flex-col h-full bg-white relative">
      <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">"""
new_render_start = """  if (!analysisResult) return null;

  if (dynamicAnalysis?.status === "PROCESSING") {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-white">
        <div className="w-16 h-16 border-4 border-[#5B5FF6] border-t-transparent rounded-full animate-spin mb-6"></div>
        <h2 className="text-xl font-black text-slate-800 mb-2">Executing Dynamic Pipeline</h2>
        <p className="text-slate-500 font-medium">Building project, running application internally, and executing AI-generated tests...</p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col h-full bg-white relative">
      <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">"""
content = content.replace(old_render_start, new_render_start)


with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("AITestRecommendation.jsx patched to poll /dynamic-analysis")
