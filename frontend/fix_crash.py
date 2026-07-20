import re

filepath = 'c:/Users/ST-Balakumaran/Desktop/PROVA/frontend/src/pages/AITestRecommendation.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Insert State
if 'const [dynamicAnalysis' not in content:
    content = content.replace(
        'const [loadingApiData, setLoadingApiData] = useState(false);',
        'const [loadingApiData, setLoadingApiData] = useState(false);\n  const [dynamicAnalysis, setDynamicAnalysis] = useState(null);\n  const [dynamicLoading, setDynamicLoading] = useState(false);'
    )

# 2. Insert Fetcher inside useEffect
old_use_effect = """  useEffect(() => {
    if (repoName && repoName !== 'Repository') {
      const loadTestData = async () => {"""

new_use_effect = """  useEffect(() => {
    if (repoName && repoName !== 'Repository') {
      const fetchDynamicAnalysis = async () => {
        try {
          setDynamicLoading(true);
          const encodedId = encodeURIComponent(repoName);
          const response = await fetch(`${API_BASE_URL}/api/dynamic-analysis/${encodedId}`);
          if (response.ok) {
             const data = await response.json();
             setDynamicAnalysis(data);
             if (data.status === "PROCESSING") {
                setTimeout(fetchDynamicAnalysis, 3000);
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

      const loadTestData = async () => {"""

if 'fetchDynamicAnalysis = async ()' not in content:
    content = content.replace(old_use_effect, new_use_effect)

# 3. Fix the rendering condition
# We want to show the loader if dynamicAnalysis?.status === "PROCESSING"
# My previous patch did inject it: 
#   if (dynamicAnalysis?.status === "PROCESSING") {
# Let's make sure it doesn't crash if dynamicAnalysis is undefined. 
# Wait, I already added dynamicAnalysis to state now.

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("AITestRecommendation.jsx fixed!")
