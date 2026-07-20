import re

with open('c:/Users/ST-Balakumaran/Desktop/PROVA/frontend/src/pages/Discovery.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# First fix the extra block inserted at line 579
bad_block = """                       <div className="text-[14px] font-bold text-[#101828] truncate">{testMetrics?.type ?? 'Not Detected'}</div>
                     </div>
                   </div>
          </div>
          
          <div className="px-6 pb-6 flex flex-col flex-1">
               {/* EXECUTIVE SUMMARY */}
               <div className="mb-6">
                 <h4 className="text-[12px] uppercase tracking-wider font-extrabold text-indigo-700 flex items-center gap-2 mb-3 bg-indigo-50/80 px-3 py-2 rounded-lg border border-indigo-100 w-max shadow-sm">
                   <Target size={16} className="text-indigo-600" /> EXECUTIVE SUMMARY
                 </h4>
                 <div className="bg-[#F8F5FF] rounded-2xl p-5">
                   <p className="text-[#51369B] text-[14px] leading-relaxed font-semibold">
                     {appPurpose || 'The Student Management System is designed to provide a web-based interface for educational institutions to efficiently manage student records, including their personal details and basic administrative information.'}
                   </p>
                 </div>
               </div>"""

good_block = """                       <div className="text-[14px] font-bold text-[#101828] truncate">{testMetrics?.type ?? 'Not Detected'}</div>
                     </div>
                   </div>"""

content = content.replace(bad_block, good_block)

# Now fix the missing block at line 489
missing_trigger = """            <div className="h-0.5 w-full bg-indigo-100 mt-4 rounded-full"></div>
                 </div>
               </div>
               
               {/* CORE BUSINESS MODULES */}"""

missing_replacement = """            <div className="h-0.5 w-full bg-indigo-100 mt-4 rounded-full"></div>
          </div>
          
          <div className="px-6 pb-6 flex flex-col flex-1">
               {/* EXECUTIVE SUMMARY */}
               <div className="mb-6">
                 <h4 className="text-[12px] uppercase tracking-wider font-extrabold text-indigo-700 flex items-center gap-2 mb-3 bg-indigo-50/80 px-3 py-2 rounded-lg border border-indigo-100 w-max shadow-sm">
                   <Target size={16} className="text-indigo-600" /> EXECUTIVE SUMMARY
                 </h4>
                 <div className="bg-[#F8F5FF] rounded-2xl p-5">
                   <p className="text-[#51369B] text-[14px] leading-relaxed font-semibold">
                     {appPurpose || 'The Student Management System is designed to provide a web-based interface for educational institutions to efficiently manage student records, including their personal details and basic administrative information.'}
                   </p>
                 </div>
               </div>
               
               {/* CORE BUSINESS MODULES */}"""

content = content.replace(missing_trigger, missing_replacement)

with open('c:/Users/ST-Balakumaran/Desktop/PROVA/frontend/src/pages/Discovery.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Fixed file.')
