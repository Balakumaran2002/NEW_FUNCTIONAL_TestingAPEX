import re

filepath = 'c:/Users/ST-Balakumaran/Desktop/PROVA/frontend/src/pages/Discovery.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

old_grid = """                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="text-[11px] uppercase font-bold text-slate-500 mb-1">Repository</div>
                    <div className="text-[15px] font-bold text-slate-800 truncate">{repoUrl ? repoUrl.split('/').pop().replace('.git', '') : 'Unknown'}</div>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="text-[11px] uppercase font-bold text-slate-500 mb-1">Total Existing Tests</div>
                    <div className="text-2xl font-black text-slate-800">{testMetrics?.total ?? 0}</div>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="text-[11px] uppercase font-bold text-slate-500 mb-1">Testing Frameworks</div>
                    <div className="text-[15px] font-bold text-slate-800 truncate">{(existingTestDetails?.frameworks || []).join(', ') || 'Not Detected'}</div>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="text-[11px] uppercase font-bold text-slate-500 mb-1">Testing Types</div>
                    <div className="text-[15px] font-bold text-slate-800 truncate">{(existingTestDetails?.testTypes || []).join(', ') || 'Not Detected'}</div>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="text-[11px] uppercase font-bold text-slate-500 mb-1">Test Language</div>
                    <div className="text-[15px] font-bold text-slate-800 truncate">{(existingTestDetails?.languages || []).join(', ') || 'Not Detected'}</div>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="text-[11px] uppercase font-bold text-slate-500 mb-1">Execution Status</div>
                    <div className="text-[15px] font-bold text-slate-800 truncate">{executionStatus}</div>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="text-[11px] uppercase font-bold text-slate-500 mb-1">Passed</div>
                    <div className="text-[15px] font-bold text-emerald-600 truncate">{displayPassed}</div>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="text-[11px] uppercase font-bold text-slate-500 mb-1">Failed</div>
                    <div className="text-[15px] font-bold text-rose-600 truncate">{displayFailed}</div>
                  </div>
                </div>"""

new_grid = """                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-xl p-4 border border-slate-100 flex items-center gap-3 shadow-sm hover:border-slate-300 transition-colors overflow-hidden">
                    <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center shrink-0">
                      <FolderOpen size={18} className="text-slate-600" />
                    </div>
                    <div className="overflow-hidden flex-1">
                      <div className="text-[10px] uppercase font-bold text-[#667085] tracking-wider mb-0.5">Repository</div>
                      <div className="text-[14px] font-bold text-[#101828] truncate">{repoUrl ? repoUrl.split('/').pop().replace('.git', '') : 'Unknown'}</div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl p-4 border border-slate-100 flex items-center gap-3 shadow-sm hover:border-blue-200 transition-colors overflow-hidden">
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                      <Activity size={18} className="text-blue-600" />
                    </div>
                    <div className="overflow-hidden flex-1">
                      <div className="text-[10px] uppercase font-bold text-[#667085] tracking-wider mb-0.5">Total Tests</div>
                      <div className="text-[18px] leading-tight font-black text-[#101828]">{testMetrics?.total ?? 0}</div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl p-4 border border-slate-100 flex items-center gap-3 shadow-sm hover:border-purple-200 transition-colors overflow-hidden">
                    <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center shrink-0">
                      <Layers size={18} className="text-purple-600" />
                    </div>
                    <div className="overflow-hidden flex-1">
                      <div className="text-[10px] uppercase font-bold text-[#667085] tracking-wider mb-0.5">Frameworks</div>
                      <div className="text-[14px] font-bold text-[#101828] truncate">{(existingTestDetails?.frameworks || []).join(', ') || 'Not Detected'}</div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl p-4 border border-slate-100 flex items-center gap-3 shadow-sm hover:border-indigo-200 transition-colors overflow-hidden">
                    <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
                      <Target size={18} className="text-indigo-600" />
                    </div>
                    <div className="overflow-hidden flex-1">
                      <div className="text-[10px] uppercase font-bold text-[#667085] tracking-wider mb-0.5">Testing Types</div>
                      <div className="text-[14px] font-bold text-[#101828] truncate">{(existingTestDetails?.testTypes || []).join(', ') || 'Not Detected'}</div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl p-4 border border-slate-100 flex items-center gap-3 shadow-sm hover:border-amber-200 transition-colors overflow-hidden">
                    <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                      <Code size={18} className="text-amber-600" />
                    </div>
                    <div className="overflow-hidden flex-1">
                      <div className="text-[10px] uppercase font-bold text-[#667085] tracking-wider mb-0.5">Test Language</div>
                      <div className="text-[14px] font-bold text-[#101828] truncate">{(existingTestDetails?.languages || []).join(', ') || 'Not Detected'}</div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl p-4 border border-slate-100 flex items-center gap-3 shadow-sm hover:border-yellow-200 transition-colors overflow-hidden">
                    <div className="w-10 h-10 rounded-full bg-yellow-50 flex items-center justify-center shrink-0">
                      <Zap size={18} className="text-yellow-600" />
                    </div>
                    <div className="overflow-hidden flex-1">
                      <div className="text-[10px] uppercase font-bold text-[#667085] tracking-wider mb-0.5">Exec Status</div>
                      <div className="text-[14px] font-bold text-[#101828] truncate">{executionStatus}</div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl p-4 border border-slate-100 flex items-center gap-3 shadow-sm hover:border-emerald-200 transition-colors overflow-hidden">
                    <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                      <CheckCircle size={18} className="text-emerald-500" />
                    </div>
                    <div className="overflow-hidden flex-1">
                      <div className="text-[10px] uppercase font-bold text-[#667085] tracking-wider mb-0.5">Passed</div>
                      <div className="text-[16px] font-bold text-emerald-600 truncate">{displayPassed}</div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl p-4 border border-slate-100 flex items-center gap-3 shadow-sm hover:border-rose-200 transition-colors overflow-hidden">
                    <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center shrink-0">
                      <X size={18} className="text-rose-500" />
                    </div>
                    <div className="overflow-hidden flex-1">
                      <div className="text-[10px] uppercase font-bold text-[#667085] tracking-wider mb-0.5">Failed</div>
                      <div className="text-[16px] font-bold text-rose-600 truncate">{displayFailed}</div>
                    </div>
                  </div>
                </div>"""

content = content.replace(old_grid, new_grid)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print('Grid updated!')
