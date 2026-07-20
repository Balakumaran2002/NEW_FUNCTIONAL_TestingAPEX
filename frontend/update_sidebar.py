import re

# 1. Update index.css
css_path = 'c:/Users/ST-Balakumaran/Desktop/PROVA/frontend/src/index.css'
with open(css_path, 'r', encoding='utf-8') as f:
    css_content = f.read()

new_animations = """
@keyframes slideRight {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(300%); }
}
@keyframes pulseLine {
  0% { opacity: 0; transform: translateX(-50%); }
  50% { opacity: 1; }
  100% { opacity: 0; transform: translateX(150%); }
}
.animation-delay-1000 { animation-delay: 1s; }
.animation-delay-2000 { animation-delay: 2s; }
.animate-spin-slow { animation: spin 4s linear infinite; }
"""

if "@keyframes slideRight" not in css_content:
    with open(css_path, 'a', encoding='utf-8') as f:
        f.write(new_animations)

# 2. Replace sidebar in App.jsx
app_path = 'c:/Users/ST-Balakumaran/Desktop/PROVA/frontend/src/App.jsx'
with open(app_path, 'r', encoding='utf-8') as f:
    app_content = f.read()

old_sidebar_pattern = r'\{\/\*\s*──\s*LEFT SIDEBAR\s*──\s*\*\/\}.*?(?=\{\/\*\s*──\s*MAIN CONTENT PANE\s*──\s*\*\/})'

new_sidebar = """{/* ── LEFT SIDEBAR ── */}
      <aside className="w-[340px] relative overflow-hidden flex flex-col z-20 flex-shrink-0 text-white shadow-[8px_0_30px_rgba(0,0,0,0.5)] border-r border-indigo-500/20"
        style={{
          background: 'linear-gradient(180deg, #09090E 0%, #171131 40%, #100B29 100%)',
        }}
      >
        {/* Cyber-grid background & pulsing points */}
        <div className="absolute inset-0 z-0 opacity-10" style={{
          backgroundImage: `
            linear-gradient(to right, #8b5cf6 1px, transparent 1px),
            linear-gradient(to bottom, #8b5cf6 1px, transparent 1px)
          `,
          backgroundSize: '32px 32px',
          backgroundPosition: 'center center'
        }}></div>
        
        {/* Floating elements animation */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[10%] left-[20%] w-2 h-2 bg-purple-400 rounded-full animate-ping opacity-30"></div>
          <div className="absolute top-[40%] right-[15%] w-1.5 h-1.5 bg-blue-400 rounded-full animate-ping opacity-20 animation-delay-1000"></div>
          <div className="absolute bottom-[20%] left-[30%] w-2 h-2 bg-emerald-400 rounded-full animate-ping opacity-20 animation-delay-2000"></div>
        </div>

        {/* Content Wrapper */}
        <div className="relative z-10 flex flex-col h-full bg-gradient-to-b from-transparent to-black/40">
          {/* Logo Section */}
          <div className="p-7 pb-4">
            <div className="flex items-center gap-4">
              <div className="w-[52px] h-[52px] rounded-2xl flex items-center justify-center text-white shadow-[0_0_20px_rgba(99,102,241,0.5)] border border-indigo-400/40 bg-indigo-600/40 backdrop-blur-xl relative overflow-hidden">
                 <div className="absolute inset-0 bg-gradient-to-br from-indigo-400/30 to-transparent"></div>
                 {/* Multi-faceted star icon */}
                 <svg width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.9)] z-10">
                   <path d="M12 1L15 9L23 12L15 15L12 23L9 15L1 12L9 9L12 1Z" fill="currentColor" stroke="rgba(255,255,255,0.8)" strokeWidth="1" strokeLinejoin="round"/>
                   <circle cx="5" cy="5" r="1.5" fill="currentColor" opacity="0.8" />
                   <circle cx="19" cy="5" r="1" fill="currentColor" opacity="0.6" />
                   <circle cx="20" cy="19" r="2" fill="currentColor" opacity="0.4" />
                   <circle cx="6" cy="18" r="1.5" fill="currentColor" opacity="0.7" />
                 </svg>
              </div>
              <div>
                <h1 className="font-black text-[32px] text-white leading-none tracking-tight drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">PROVA</h1>
                <p className="text-[10px] text-indigo-200 uppercase tracking-[0.2em] font-bold mt-1 opacity-90 drop-shadow-sm">AI Testing Platform</p>
              </div>
            </div>
          </div>
          
          {/* Dynamic Project Header */}
          <div className="px-6 mb-8 mt-2">
            <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-3.5 flex flex-col gap-2.5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_8px_16px_rgba(0,0,0,0.4)] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-[40px] -mr-10 -mt-10 pointer-events-none"></div>
              
              <div className="flex items-center justify-between relative z-10">
                <span className="text-[10px] text-indigo-300/80 font-black uppercase tracking-[0.15em]">Live Project</span>
                <div className="flex items-center gap-1.5 bg-red-950/40 px-2 py-0.5 rounded border border-red-500/30">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,1)]"></div>
                  <span className="text-[9px] text-red-400 font-bold uppercase tracking-wider">Recording</span>
                </div>
              </div>
              <div className="text-[13px] font-black text-white truncate drop-shadow-md tracking-wide relative z-10">E-COMMERCE BETA v3.1</div>
            </div>
          </div>
          
          {/* Workflow Steps */}
          <div className="flex-1 overflow-y-auto px-6 pb-10 flex flex-col custom-scrollbar relative z-10">
            
            {/* Step 1: Connect Repository (Completed) */}
            <div className="relative mb-5 group">
              <div className="absolute top-[48px] bottom-[-24px] left-[27px] w-[2px] bg-emerald-500/40 z-0 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
              
              <div className="relative z-10 bg-emerald-950/30 backdrop-blur-xl border border-emerald-500/40 rounded-[20px] p-4.5 shadow-[0_4px_20px_rgba(16,185,129,0.1)] flex flex-col transition-all duration-300">
                <div className="absolute inset-0 rounded-[20px] overflow-hidden pointer-events-none">
                  {/* Continuous pulsing Live Sync bar */}
                  <div className="absolute bottom-0 left-0 h-1.5 bg-emerald-900/60 w-full rounded-b-[20px]">
                    <div className="h-full bg-emerald-400 w-1/3 rounded-full animate-[slideRight_1.5s_ease-in-out_infinite_alternate] shadow-[0_0_12px_rgba(52,211,153,1)]"></div>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent rounded-[20px]"></div>
                </div>
                
                <div className="flex items-start justify-between mb-1.5 relative z-10 px-4 pt-4 pb-2">
                   <div className="flex items-center gap-4">
                     <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-400/60 flex items-center justify-center relative shadow-[0_0_20px_rgba(16,185,129,0.4)] shrink-0">
                       <span className="font-black text-emerald-300 text-[15px]">1</span>
                       <div className="absolute -top-1.5 -right-1.5 w-[18px] h-[18px] bg-emerald-500 rounded-full flex items-center justify-center border-2 border-[#0D1117] shadow-sm">
                         <Check size={10} className="text-white font-black" strokeWidth={4} />
                       </div>
                     </div>
                     <span className="font-black text-[15px] text-emerald-50 drop-shadow-sm tracking-wide">Connect Repository</span>
                   </div>
                   <div className="flex flex-col items-end gap-1.5 shrink-0 pt-0.5">
                     <span className="text-[11px] text-emerald-400 font-bold tracking-wide">Completed</span>
                     <BookOpen size={18} className="text-emerald-500/80" />
                   </div>
                </div>
              </div>
            </div>

            {/* Step 2: Project Discovery (In Progress) */}
            <div className="relative mb-5 group cursor-pointer" onClick={() => setActiveTab('discovery')}>
              <div className="absolute top-[48px] bottom-[-24px] left-[27px] w-[2px] bg-indigo-500/40 z-0"></div>
              
              {/* Intense swirling deep purple halo */}
              <div className="absolute -inset-1.5 rounded-[22px] bg-gradient-to-r from-indigo-600 via-purple-500 to-indigo-600 opacity-40 blur-xl animate-pulse z-0"></div>
              
              <div className="relative z-10 bg-[#1E1B4B]/80 backdrop-blur-2xl border border-indigo-400/60 rounded-[20px] shadow-[0_8px_32px_rgba(79,70,229,0.4)] flex flex-col transform hover:scale-[1.02] transition-all duration-300 overflow-hidden">
                <div className="absolute inset-0 pointer-events-none">
                  {/* Purple pulsing status line */}
                  <div className="absolute bottom-0 left-0 h-1.5 w-full bg-indigo-950/80">
                    <div className="h-full bg-gradient-to-r from-transparent via-indigo-400 to-transparent w-full animate-[pulseLine_1.5s_linear_infinite] shadow-[0_0_20px_rgba(129,140,248,1)]"></div>
                  </div>
                  {/* Subtle data flow / grid animation inside */}
                  <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIj48L3JlY3Q+CjxwYXRoIGQ9Ik0wIDBMOCA4Wk04IDBMMCA4WiIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utd2lkdGg9IjEiPjwvcGF0aD4KPC9zdmc+')] mix-blend-overlay animate-pulse"></div>
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
                </div>
                
                <div className="flex items-start justify-between relative z-10 px-4 pt-5">
                   <div className="flex items-center gap-4">
                     <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 border-[1.5px] border-indigo-300 shadow-[0_0_25px_rgba(99,102,241,0.8)] flex items-center justify-center shrink-0">
                       <span className="font-black text-white text-[17px]">2</span>
                     </div>
                     <span className="font-black text-[17px] text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] tracking-wide">Project Discovery</span>
                   </div>
                   <div className="flex flex-col items-end gap-1.5 shrink-0 pt-1">
                     <span className="text-[11px] text-indigo-200 font-bold tracking-widest uppercase shadow-sm">In Progress</span>
                     <Map size={20} className="text-indigo-300" />
                   </div>
                </div>
                
                {/* 3D Code Dependency Models & Live Scan Status */}
                <div className="mt-4 mb-4 mx-5 ml-[76px] flex items-center justify-between bg-black/30 rounded-lg p-2 border border-white/5 relative z-10">
                   <div className="flex items-center gap-2.5">
                     <div className="w-5 h-5 flex items-center justify-center animate-spin-slow">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-300/90 drop-shadow-[0_0_5px_rgba(165,180,252,0.8)]"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                     </div>
                     <span className="text-[10px] font-mono text-indigo-200/90 tracking-wider">Scan Status:</span>
                   </div>
                   <span className="text-[11px] font-black text-indigo-300 animate-pulse tracking-wider">68% Complete</span>
                </div>
              </div>
            </div>

            {/* Upcoming Steps 3, 4, 5, 6 */}
            {[
              { num: 3, title: 'Testing Strategy', id: 'test-recommendation' },
              { num: 4, title: 'Execute Tests', id: 'project-runner' },
              { num: 5, title: 'Test Results', id: 'results' },
              { num: 6, title: 'Reports & Downloads', id: 'summary' }
            ].map((step, idx) => {
               const isLast = idx === 3;
               return (
                <div key={step.num} className="relative mb-4 group cursor-pointer" onClick={() => setActiveTab(step.id)}>
                  {!isLast && <div className="absolute top-[40px] bottom-[-20px] left-[27px] w-[2px] bg-[#334155] z-0"></div>}
                  
                  <div className="relative z-10 bg-slate-900/60 backdrop-blur-md border border-slate-700/50 rounded-2xl p-4 flex flex-col hover:bg-slate-800/80 hover:border-slate-600/80 transition-all duration-300">
                    <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                      {/* Latent data lines */}
                      <div className="absolute bottom-0 left-0 h-1 w-full bg-slate-800/80">
                        <div className="h-full bg-slate-500/20 w-1/4 animate-[slideRight_4s_linear_infinite] shadow-[0_0_8px_rgba(148,163,184,0.1)]"></div>
                      </div>
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 shadow-[inset_0_0_20px_rgba(255,255,255,0.03)] rounded-2xl"></div>
                      {/* Pulsing blue-white light edges on hover */}
                      <div className="absolute inset-0 rounded-2xl border border-transparent group-hover:border-blue-400/20 transition-colors duration-500"></div>
                    </div>
                    
                    <div className="flex items-start justify-between relative z-10">
                       <div className="flex items-center gap-4">
                         <div className="w-10 h-10 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center shrink-0 shadow-inner group-hover:shadow-[0_0_15px_rgba(96,165,250,0.15)] transition-shadow">
                           <span className="font-bold text-slate-500 text-sm group-hover:text-slate-300 transition-colors">{step.num}</span>
                         </div>
                         <span className="font-bold text-[14px] text-slate-400 group-hover:text-slate-200 transition-colors tracking-wide">{step.title}</span>
                       </div>
                       <div className="flex flex-col items-end gap-1 shrink-0 pt-0.5">
                         <span className="text-[10px] text-slate-600 font-bold tracking-wide uppercase group-hover:text-slate-400 transition-colors">Upcoming</span>
                       </div>
                    </div>
                  </div>
                </div>
               );
            })}

          </div>
        </div>
      </aside>
      """

import re
app_content = re.sub(old_sidebar_pattern, new_sidebar, app_content, flags=re.DOTALL)

with open(app_path, 'w', encoding='utf-8') as f:
    f.write(app_content)

print("Sidebar replaced successfully with cyber-grid design!")
