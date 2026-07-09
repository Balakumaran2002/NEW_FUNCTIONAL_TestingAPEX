import os
import re

files_to_process = [
    'src/pages/RepositoryAnalysis.jsx',
    'src/pages/MigrationCenter.jsx',
    'src/pages/ApiKeyManagement.jsx'
]

def process_file(filepath):
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        return

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Remove dark mode classes
    # Matches 'dark:something', 'dark:something/50', etc.
    content = re.sub(r'\bdark:[a-zA-Z0-9/-]+\b', '', content)
    
    # 2. Replace colors
    replacements = {
        'bg-slate-50': 'bg-[#F7F8FC]',
        'bg-slate-100': 'bg-[#F2F4F7]',
        'text-slate-900': 'text-[#101828]',
        'text-slate-800': 'text-[#101828]',
        'text-slate-700': 'text-[#344054]',
        'text-slate-600': 'text-[#475467]',
        'text-slate-500': 'text-[#667085]',
        'text-slate-400': 'text-[#98A2B3]',
        'border-slate-100': 'border-[#F2F4F7]',
        'border-slate-200/50': 'border-[#EAECF0]',
        'border-slate-200': 'border-[#EAECF0]',
        'border-slate-300': 'border-[#D0D5DD]',
        'rounded-xl': 'rounded-2xl',
        'rounded-lg': 'rounded-xl',
        'shadow-sm': 'shadow-card',
        'shadow-md': 'shadow-soft',
        'ring-brand-500/20': 'ring-brand-500/30',
        'focus:ring-brand-500/50': 'focus:ring-brand-500/40',
        'from-brand-500 to-brand-600': 'from-brand-500 to-brand-400',
    }

    for old, new in replacements.items():
        content = content.replace(old, new)
        
    # Also clean up multiple spaces left by removing dark classes
    content = re.sub(r' +', ' ', content)
    content = content.replace('className=" ', 'className="')
    content = content.replace(' "', '"')

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Processed {filepath}")

for f in files_to_process:
    process_file(os.path.join(r'c:\Users\ST-Sivaranjini\OneDrive - SORIM TECHNOLOGIES\Desktop\Testex\Testex\frontend', f))
