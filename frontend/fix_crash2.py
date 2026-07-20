import re

filepath = 'c:/Users/ST-Balakumaran/Desktop/PROVA/frontend/src/pages/AITestRecommendation.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

old_return_start = """  const currentDate = new Date().toLocaleDateString();

  return (
    <div className="flex flex-col gap-8 animate-fadeIn w-full pb-10 h-full mt-4">"""

new_return_start = """  const currentDate = new Date().toLocaleDateString();

  if (!analysisResult) return null;

  if (dynamicAnalysis?.status === "PROCESSING") {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-white mt-10">
        <div className="w-16 h-16 border-4 border-[#5B5FF6] border-t-transparent rounded-full animate-spin mb-6"></div>
        <h2 className="text-xl font-black text-slate-800 mb-2">Executing Dynamic Pipeline</h2>
        <p className="text-slate-500 font-medium">Building project, running application internally, and executing AI-generated tests...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 animate-fadeIn w-full pb-10 h-full mt-4">"""

if "Executing Dynamic Pipeline" not in content:
    content = content.replace(old_return_start, new_return_start)

# Let's also bulletproof the stepCount split just in case!
content = content.replace(
    "const stepCount = tc.steps ? tc.steps.split('\\n').length : 0;",
    "const stepCount = tc.steps ? (typeof tc.steps === 'string' ? tc.steps.split('\\n').length : tc.steps.length) : 0;"
)

# And bulletproof uiFiles.match
content = content.replace(
    "uiFiles = brd.sourceFiles.filter(f => f.match(/\\.(html|jsx|tsx|vue|jsp|css)$/i))",
    "uiFiles = brd.sourceFiles.filter(f => typeof f === 'string' && f.match(/\\.(html|jsx|tsx|vue|jsp|css)$/i))"
)
content = content.replace(
    "apiFiles = brd.sourceFiles.filter(f => f.match(/controller|api|route|handler/i) && f.match(/\\.(java|py|js|ts|go|cs)$/i))",
    "apiFiles = brd.sourceFiles.filter(f => typeof f === 'string' && f.match(/controller|api|route|handler/i) && f.match(/\\.(java|py|js|ts|go|cs)$/i))"
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("AITestRecommendation.jsx patched successfully")
