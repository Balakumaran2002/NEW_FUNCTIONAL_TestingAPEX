import re

filepath = 'c:/Users/ST-Balakumaran/Desktop/PROVA/frontend/src/pages/Discovery.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

replacements = [
    (
        '''                <h3 className="text-[13px] uppercase tracking-wider font-bold text-[#5B5FF6] flex items-center gap-2 mb-4 border-b border-slate-200 pb-2">\n                  <Activity size={16} /> 1. Existing Testing Analysis\n                </h3>''',
        '''                <h3 className="text-[13px] uppercase tracking-wider font-extrabold text-indigo-700 flex items-center gap-2 mb-4 bg-indigo-50/80 px-3 py-2 rounded-lg border border-indigo-100 w-max shadow-sm">\n                  <Activity size={16} className="text-indigo-600" /> 1. EXISTING TESTING ANALYSIS\n                </h3>'''
    ),
    (
        '''                <h3 className="text-[13px] uppercase tracking-wider font-bold text-[#5B5FF6] flex items-center gap-2 mb-4 border-b border-slate-200 pb-2">\n                  <FileCode size={16} /> 2. Existing Test Cases\n                </h3>''',
        '''                <h3 className="text-[13px] uppercase tracking-wider font-extrabold text-indigo-700 flex items-center gap-2 mb-4 bg-indigo-50/80 px-3 py-2 rounded-lg border border-indigo-100 w-max shadow-sm">\n                  <FileCode size={16} className="text-indigo-600" /> 2. EXISTING TEST CASES\n                </h3>'''
    ),
    (
        '''                <h3 className="text-[13px] uppercase tracking-wider font-bold text-[#5B5FF6] flex items-center gap-2 mb-4 border-b border-slate-200 pb-2">\n                  <ShieldCheck size={16} /> 3. Existing Coverage\n                </h3>''',
        '''                <h3 className="text-[13px] uppercase tracking-wider font-extrabold text-indigo-700 flex items-center gap-2 mb-4 bg-indigo-50/80 px-3 py-2 rounded-lg border border-indigo-100 w-max shadow-sm">\n                  <ShieldCheck size={16} className="text-indigo-600" /> 3. EXISTING COVERAGE\n                </h3>'''
    ),
    (
        '''                <h3 className="text-[13px] uppercase tracking-wider font-bold text-[#5B5FF6] flex items-center gap-2 mb-4 border-b border-slate-200 pb-2">\n                  <AlertTriangle size={16} /> 4. Coverage Gaps\n                </h3>''',
        '''                <h3 className="text-[13px] uppercase tracking-wider font-extrabold text-indigo-700 flex items-center gap-2 mb-4 bg-indigo-50/80 px-3 py-2 rounded-lg border border-indigo-100 w-max shadow-sm">\n                  <AlertTriangle size={16} className="text-indigo-600" /> 4. COVERAGE GAPS\n                </h3>'''
    ),
    (
        '''                <h3 className="text-[13px] uppercase tracking-wider font-bold text-[#5B5FF6] flex items-center gap-2 mb-4 border-b border-slate-200 pb-2">\n                  <Search size={16} /> 5. AI Recommended Testing Strategy\n                </h3>''',
        '''                <h3 className="text-[13px] uppercase tracking-wider font-extrabold text-indigo-700 flex items-center gap-2 mb-4 bg-indigo-50/80 px-3 py-2 rounded-lg border border-indigo-100 w-max shadow-sm">\n                  <Search size={16} className="text-indigo-600" /> 5. AI RECOMMENDED TESTING STRATEGY\n                </h3>'''
    ),
    (
        '''                <h3 className="text-[13px] uppercase tracking-wider font-bold text-[#5B5FF6] flex items-center gap-2 mb-4 border-b border-slate-200 pb-2">\n                  <Layers size={16} /> 6. New AI-Generated Test Scope\n                </h3>''',
        '''                <h3 className="text-[13px] uppercase tracking-wider font-extrabold text-indigo-700 flex items-center gap-2 mb-4 bg-indigo-50/80 px-3 py-2 rounded-lg border border-indigo-100 w-max shadow-sm">\n                  <Layers size={16} className="text-indigo-600" /> 6. NEW AI-GENERATED TEST SCOPE\n                </h3>'''
    )
]

for old, new in replacements:
    content = content.replace(old, new)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print('Styles updated!')
