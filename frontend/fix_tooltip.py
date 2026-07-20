import re

filepath = 'c:/Users/ST-Balakumaran/Desktop/PROVA/frontend/src/pages/AITestRecommendation.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update Tooltip Positioning (left-0 instead of left-1/2)
old_tooltip = """const Tooltip = ({ label, children, details, theme = 'blue' }) => {
  const hoverIconColor = theme === 'green' ? 'group-hover:text-emerald-500' : 'group-hover:text-[#2563EB]';
  const bgColor = theme === 'green' ? 'bg-emerald-600' : 'bg-[#2563EB]';
  
  return (
    <div className="relative group inline-flex items-center gap-1.5 cursor-help">
      <span className="text-[10px] font-bold text-[#667085] uppercase tracking-wider">{label}</span>
      <Info size={12} className={`text-[#98A2B3] transition-colors ${hoverIconColor}`} />
      
      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-80 max-w-[90vw] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[100] pointer-events-none group-hover:pointer-events-auto">
        <div className={`${bgColor} text-white p-4 rounded-xl shadow-xl text-[11px] whitespace-pre-wrap leading-relaxed border border-white/10 tracking-wide text-left`}>
          {details}
          <div className={`absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 ${bgColor} border-t border-l border-white/10 rotate-45`}></div>
        </div>
      </div>
    </div>
  );
};"""

new_tooltip = """const Tooltip = ({ label, children, details, theme = 'blue' }) => {
  const hoverIconColor = theme === 'green' ? 'group-hover:textemerald-500' : 'group-hover:text-[#2563EB]';
  const bgColor = theme === 'green' ? 'bg-emerald-600' : 'bg-[#2563EB]';
  
  return (
    <div className="relative group inline-flex items-center gap-1.5 cursor-help">
      <span className="text-[10px] font-bold text-[#667085] uppercase tracking-wider">{label}</span>
      <Info size={12} className={`text-[#98A2B3] transition-colors ${hoverIconColor}`} />
      
      <div className="absolute top-full -left-2 mt-2 w-72 max-w-[85vw] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[100] pointer-events-none group-hover:pointer-events-auto">
        <div className={`${bgColor} text-white p-4 rounded-xl shadow-xl text-[11px] whitespace-pre-wrap leading-relaxed border border-white/10 tracking-wide text-left`}>
          {details}
          <div className={`absolute -top-1 left-4 w-2 h-2 ${bgColor} border-t border-l border-white/10 rotate-45`}></div>
        </div>
      </div>
    </div>
  );
};"""
content = content.replace(old_tooltip, new_tooltip)

# 2. Filter out fake test cases in calculateTestStats
old_calc_start = """  const calculateTestStats = () => {
    // UI STATS
    const totalUi = uiTestCases.length;
    
    // Extract unique modules (routes)
    const uniqueUiRoutes = [...new Set(uiTestCases.map(tc => tc.route || tc.scenario || 'Unknown'))].filter(Boolean);"""

new_calc_start = """  const calculateTestStats = () => {
    // FILTER OUT OLD FALLBACKS
    const validUiTestCases = uiTestCases.filter(tc => tc.scenario !== "Basic Load Test" && tc.scenario !== "Fallback Scenario");
    const validApiTestCases = apiTestCases.filter(tc => tc.scenario !== "Fallback API Test");

    // UI STATS
    const totalUi = validUiTestCases.length;
    
    // Extract unique modules (routes)
    const uniqueUiRoutes = [...new Set(validUiTestCases.map(tc => tc.route || tc.scenario || 'Unknown'))].filter(Boolean);"""
content = content.replace(old_calc_start, new_calc_start)

# We also need to replace `uiTestCases` with `validUiTestCases` in the loop
old_ui_loop = """    let high = 0, medium = 0, low = 0;
    uiTestCases.forEach(tc => {"""
new_ui_loop = """    let high = 0, medium = 0, low = 0;
    validUiTestCases.forEach(tc => {"""
content = content.replace(old_ui_loop, new_ui_loop)

# And for API STATS
old_api_stats = """    // API STATS
    const totalApi = apiTestCases.length;
    
    // Extract unique endpoints
    const uniqueApiEndpoints = [...new Set(apiTestCases.map(tc => tc.path || tc.scenario || 'Unknown'))].filter(Boolean);
    const endpoints = uniqueApiEndpoints.length;
    
    // Coverage Scope
    const methods = [...new Set(apiTestCases.map(tc => tc.method?.toUpperCase() || 'GET'))];"""
new_api_stats = """    // API STATS
    const totalApi = validApiTestCases.length;
    
    // Extract unique endpoints
    const uniqueApiEndpoints = [...new Set(validApiTestCases.map(tc => tc.path || tc.scenario || 'Unknown'))].filter(Boolean);
    const endpoints = uniqueApiEndpoints.length;
    
    // Coverage Scope
    const methods = [...new Set(validApiTestCases.map(tc => tc.method?.toUpperCase() || 'GET'))];"""
content = content.replace(old_api_stats, new_api_stats)

old_data_mocks = """    const dataMocks = apiTestCases.length > 0 ? "Ready" : "Pending";"""
new_data_mocks = """    const dataMocks = validApiTestCases.length > 0 ? "Ready" : "Pending";"""
content = content.replace(old_data_mocks, new_data_mocks)


with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("AITestRecommendation tooltip and fallback filter updated successfully!")
