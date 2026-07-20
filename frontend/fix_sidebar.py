import re

app_path = 'c:/Users/ST-Balakumaran/Desktop/PROVA/frontend/src/App.jsx'
with open(app_path, 'r', encoding='utf-8') as f:
    app_content = f.read()

old_sidebar_pattern = r'\{\/\*\s*──\s*LEFT SIDEBAR\s*──\s*\*\/\}.*?(?=\{\/\*\s*──\s*MAIN CONTENT PANE\s*──\s*\*\/})'

new_sidebar = """{/* ── LEFT SIDEBAR ── */}
      <aside className="w-[340px] bg-white border-r border-[#EAECF0] flex flex-col z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)] flex-shrink-0 relative overflow-hidden">
        
        {/* Subtle background pattern */}
        <div className="absolute inset-0 z-0 opacity-40 pointer-events-none" style={{
          backgroundImage: `
            linear-gradient(to right, #f1f5f9 1px, transparent 1px),
            linear-gradient(to bottom, #f1f5f9 1px, transparent 1px)
          `,
          backgroundSize: '24px 24px',
          backgroundPosition: 'center center'
        }}></div>

        <div className="relative z-10 flex flex-col h-full">
          {/* Logo Section */}
          <div className="p-7 pb-4">
            <div className="flex items-center gap-4">
              <div className="w-[52px] h-[52px] rounded-2xl flex items-center justify-center text-white shadow-[0_4px_12px_rgba(91,95,246,0.3)] border border-[#5B5FF6]/20 bg-gradient-to-br from-[#7B61FF] to-[#5B5FF6] relative overflow-hidden">
                 <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white z-10">
                   <path d="M12 1L15 9L23 12L15 15L12 23L9 15L1 12L9 9L12 1Z" fill="currentColor" stroke="rgba(255,255,255,0.8)" strokeWidth="1" strokeLinejoin="round"/>
                 </svg>
              </div>
              <div>
                <h1 className="font-black text-[32px] text-[#101828] leading-none tracking-tight">PROVA</h1>
                <p className="text-[10px] text-[#5B5FF6] uppercase tracking-[0.2em] font-bold mt-1">AI Testing Platform</p>
              </div>
            </div>
          </div>
          
          {/* Dynamic Project Header (Only shows if a repo is connected) */}
          {analysisRepoUrl && (
            <div className="px-6 mb-6 mt-2">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex flex-col gap-2.5 shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between relative z-10">
                  <span className="text-[10px] text-slate-500 font-black uppercase tracking-[0.15em]">Live Project</span>
                  <div className="flex items-center gap-1.5 bg-red-50 px-2 py-0.5 rounded border border-red-100">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div>
                    <span className="text-[9px] text-red-600 font-bold uppercase tracking-wider">Recording</span>
                  </div>
                </div>
                <div className="text-[13px] font-black text-slate-800 truncate tracking-wide relative z-10">
                  {analysisRepoUrl.split('/').pop().replace('.git', '')}
                </div>
              </div>
            </div>
          )}
          
          {/* Workflow Steps */}
          <div className="flex-1 overflow-y-auto px-6 pb-10 flex flex-col custom-scrollbar relative z-10">
            {wizardNodes.map((node, index) => {
              const currentIndex = wizardNodes.findIndex(n => n.id === activeTab);
              const nodeIndex = index;
              
              let state = 'upcoming';
              if (nodeIndex < currentIndex) state = 'completed';
              else if (nodeIndex === currentIndex) state = 'in-progress';
              
              let isLocked = false;
              let lockedReason = '';
              if ((node.id === 'test-recommendation' || node.id === 'project-runner' || node.id === 'results') && !workflowState.analysisCompleted) {
                isLocked = true;
                lockedReason = 'Complete Repository Analysis before accessing this step.';
              }

              const isLast = index === wizardNodes.length - 1;

              // STYLING BASED ON STATE
              let containerStyle = "bg-white border-slate-200";
              let iconBg = "bg-slate-100 border-slate-200 text-slate-400";
              let titleStyle = "text-slate-400";
              let lineStyle = "bg-slate-200";
              let statusText = "UPCOMING";
              let statusColor = "text-slate-400";

              if (state === 'completed') {
                containerStyle = "bg-emerald-50/50 border-emerald-200 shadow-sm";
                iconBg = "bg-emerald-100 border-emerald-300 text-emerald-600";
                titleStyle = "text-emerald-900";
                lineStyle = "bg-emerald-300";
                statusText = "COMPLETED";
                statusColor = "text-emerald-600";
              } else if (state === 'in-progress') {
                containerStyle = "bg-indigo-50/50 border-[#5B5FF6]/30 shadow-[0_4px_20px_rgba(91,95,246,0.1)] transform scale-[1.02]";
                iconBg = "bg-gradient-to-br from-[#7B61FF] to-[#5B5FF6] border-[#5B5FF6] text-white shadow-md";
                titleStyle = "text-[#101828]";
                lineStyle = "bg-slate-200";
                statusText = "IN PROGRESS";
                statusColor = "text-[#5B5FF6]";
              }

              return (
                <div key={node.id} className={`relative mb-5 group ${isLocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`} onClick={() => {
                  if (isLocked) { alert(lockedReason); return; }
                  setActiveTab(node.id);
                }}>
                  {!isLast && (
                    <div className={`absolute top-[48px] bottom-[-24px] left-[27px] w-[2px] z-0 ${lineStyle}`}></div>
                  )}
                  
                  <div className={`relative z-10 backdrop-blur-xl border rounded-[20px] p-4 flex flex-col transition-all duration-300 ${containerStyle}`}>
                    
                    {state === 'in-progress' && (
                      <div className="absolute bottom-0 left-0 h-1 w-full bg-indigo-100 rounded-b-[20px] overflow-hidden">
                        <div className="h-full bg-[#5B5FF6] w-1/3 rounded-full animate-[slideRight_1.5s_ease-in-out_infinite_alternate]"></div>
                      </div>
                    )}

                    <div className="flex items-start justify-between relative z-10">
                       <div className="flex items-center gap-4">
                         <div className={`w-12 h-12 rounded-full border flex items-center justify-center shrink-0 transition-colors ${iconBg}`}>
                           {state === 'completed' ? <Check size={20} strokeWidth={3} /> : <span className="font-black text-[17px]">{node.number}</span>}
                         </div>
                         <span className={`font-black text-[15px] tracking-wide ${titleStyle}`}>{node.label}</span>
                       </div>
                       <div className="flex flex-col items-end gap-1.5 shrink-0 pt-1">
                         <span className={`text-[10px] font-bold tracking-widest uppercase ${statusColor}`}>{statusText}</span>
                         {node.id === 'dashboard' && <BookOpen size={18} className={statusColor} />}
                         {node.id === 'discovery' && <Map size={18} className={statusColor} />}
                         {node.id === 'test-recommendation' && <Target size={18} className={statusColor} />}
                         {node.id === 'project-runner' && <Play size={18} className={statusColor} />}
                         {node.id === 'results' && <FlaskConical size={18} className={statusColor} />}
                         {node.id === 'summary' && <Download size={18} className={statusColor} />}
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

app_content = re.sub(old_sidebar_pattern, new_sidebar, app_content, flags=re.DOTALL)

with open(app_path, 'w', encoding='utf-8') as f:
    f.write(app_content)

print("Sidebar reverted to white background and made dynamic again!")
