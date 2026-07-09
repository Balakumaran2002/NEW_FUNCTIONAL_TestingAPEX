import React, { useState } from 'react';
import { 
  Mail, Lock, Eye, EyeOff, 
  Code2, BrainCircuit, Rocket, Shield, PlayCircle, FileText, 
  Settings, Zap, BarChart3, Database, ShieldCheck
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username.toLowerCase() === 'siva' && password === '1234') {
      onLogin();
    } else {
      setError('Invalid credentials. Hint: use siva / 1234');
    }
  };

  return (
    <div className="flex min-h-screen bg-white font-sans text-[#101828]">
      {/* ── LEFT PANE: BRANDING & FEATURES ── */}
      <div className="hidden lg:flex w-[55%] flex-col relative overflow-hidden bg-[#F8FAFC]">
        {/* Background Decorative Elements */}
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-br from-[#EEF2FF] to-[#F3E8FF] rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-[#E0E7FF] to-[#EBEFFF] rounded-full blur-3xl opacity-70 translate-y-1/3 -translate-x-1/4"></div>
        
        {/* Wavy lines placeholder using SVG */}
        <svg className="absolute inset-0 w-full h-full text-[#5B5FF6]/5 pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path d="M0,50 Q25,30 50,50 T100,50 L100,100 L0,100 Z" fill="currentColor" opacity="0.3" />
          <path d="M0,70 Q25,50 50,70 T100,70 L100,100 L0,100 Z" fill="currentColor" opacity="0.5" />
        </svg>

        <div className="relative z-10 flex flex-col h-full p-12 lg:p-16 xl:p-20">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#5B5FF6] to-[#7B61FF] flex items-center justify-center text-white font-bold text-2xl shadow-lg">
              P
            </div>
            <div>
              <h1 className="font-extrabold text-2xl tracking-tight leading-none text-[#101828]">PROVA</h1>
              <p className="text-[10px] font-semibold text-[#667085] uppercase tracking-widest mt-0.5">AI Functional Testing Platform</p>
            </div>
          </div>

          {/* Hero Content */}
          <div className="mb-12">
            <h2 className="text-4xl xl:text-5xl font-extrabold text-[#101828] mb-2 leading-tight">
              From Code to Confidence.<br/>
              <span className="text-[#5B5FF6]">Automatically.</span>
            </h2>
            <p className="text-[#475467] text-lg max-w-xl mt-6 leading-relaxed">
              PROVA is an AI-powered functional testing platform that analyzes your code, creates intelligent test cases and executes them across UI, API and more – delivering comprehensive test results in minutes.
            </p>
          </div>

          {/* Workflow Diagram */}
          <div className="flex items-center gap-4 mb-14 max-w-xl">
            <div className="flex flex-col items-center text-center gap-3 flex-1">
              <div className="w-12 h-12 rounded-full bg-[#5B5FF6] flex items-center justify-center text-white shadow-md">
                <Code2 size={20} />
              </div>
              <div>
                <p className="font-bold text-sm text-[#101828]">Connect</p>
                <p className="text-[11px] text-[#667085] mt-1 leading-tight">Connect any repository<br/>Java, Python & more</p>
              </div>
            </div>
            <div className="h-[1px] w-12 bg-gray-300 relative border-t border-dashed border-gray-400">
               <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 border-t-2 border-r-2 border-gray-400 transform rotate-45"></div>
            </div>
            <div className="flex flex-col items-center text-center gap-3 flex-1">
              <div className="w-12 h-12 rounded-full border-2 border-[#12B76A] bg-white flex items-center justify-center text-[#12B76A] shadow-sm">
                <BrainCircuit size={24} />
              </div>
              <div>
                <p className="font-bold text-sm text-[#101828]">Analyze & Generate</p>
                <p className="text-[11px] text-[#667085] mt-1 leading-tight">AI analyzes code and creates<br/>BRD, test cases & test scripts</p>
              </div>
            </div>
            <div className="h-[1px] w-12 bg-gray-300 relative border-t border-dashed border-gray-400">
               <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 border-t-2 border-r-2 border-gray-400 transform rotate-45"></div>
            </div>
            <div className="flex flex-col items-center text-center gap-3 flex-1">
              <div className="w-12 h-12 rounded-full bg-[#7B61FF] flex items-center justify-center text-white shadow-md">
                <Rocket size={20} />
              </div>
              <div>
                <p className="font-bold text-sm text-[#101828]">Execute & Report</p>
                <p className="text-[11px] text-[#667085] mt-1 leading-tight">Execute tests across UI, API<br/>and get AI-powered insights</p>
              </div>
            </div>
          </div>

          <h3 className="font-bold text-[#101828] mb-4">Functional Testing. Simplified by AI.</h3>
          
          {/* Feature Grid */}
          <div className="grid grid-cols-2 gap-4 max-w-2xl mb-auto">
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-[#EAECF0] flex items-start gap-3">
              <div className="mt-0.5 text-[#12B76A]"><BrainCircuit size={20} /></div>
              <div>
                <h4 className="font-bold text-xs text-[#101828] mb-1">AI Repository Analysis</h4>
                <p className="text-[10px] text-[#667085] leading-tight">Understand your codebase and business logic</p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-[#EAECF0] flex items-start gap-3">
              <div className="mt-0.5 text-[#7B61FF]"><FileText size={20} /></div>
              <div>
                <h4 className="font-bold text-xs text-[#101828] mb-1">BRD & Test Case Creation</h4>
                <p className="text-[10px] text-[#667085] leading-tight">Generate BRD, test cases, RTM and more</p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-[#EAECF0] flex items-start gap-3">
              <div className="mt-0.5 flex gap-1 items-center bg-green-50 text-green-600 px-1.5 py-0.5 rounded text-[10px] font-bold">Se</div>
              <div>
                <h4 className="font-bold text-xs text-[#101828] mb-1">Multi-Framework Testing</h4>
                <p className="text-[10px] text-[#667085] leading-tight">Test on Playwright, Selenium and API Platforms</p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-[#EAECF0] flex items-start gap-3">
              <div className="mt-0.5 text-[#4F8CFF]"><PlayCircle size={20} /></div>
              <div>
                <h4 className="font-bold text-xs text-[#101828] mb-1">Smart Execution</h4>
                <p className="text-[10px] text-[#667085] leading-tight">Parallel execution for faster and reliable results</p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-[#EAECF0] flex items-start gap-3">
              <div className="mt-0.5 text-[#F79009]"><Zap size={20} /></div>
              <div>
                <h4 className="font-bold text-xs text-[#101828] mb-1">AI Insights & RCA</h4>
                <p className="text-[10px] text-[#667085] leading-tight">AI-powered root cause analysis and suggestions</p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-[#EAECF0] flex items-start gap-3">
              <div className="mt-0.5 text-[#5B5FF6]"><BarChart3 size={20} /></div>
              <div>
                <h4 className="font-bold text-xs text-[#101828] mb-1">Comprehensive Reports</h4>
                <p className="text-[10px] text-[#667085] leading-tight">Detailed reports with coverage and metrics</p>
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="flex items-center gap-8 mt-12 pt-8 border-t border-[#EAECF0]">
            <div className="flex items-center gap-2">
              <Settings size={18} className="text-[#5B5FF6]" />
              <div>
                <p className="font-bold text-[#101828] leading-tight">20+</p>
                <p className="text-[10px] text-[#667085]">Frameworks</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Rocket size={18} className="text-[#5B5FF6]" />
              <div>
                <p className="font-bold text-[#101828] leading-tight">10x</p>
                <p className="text-[10px] text-[#667085]">Faster Testing</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Database size={18} className="text-[#5B5FF6]" />
              <div>
                <p className="font-bold text-[#101828] leading-tight">95%</p>
                <p className="text-[10px] text-[#667085]">Test Coverage</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-[#5B5FF6]" />
              <div>
                <p className="font-bold text-[#101828] leading-tight">24/7</p>
                <p className="text-[10px] text-[#667085]">AI Assistance</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANE: LOGIN FORM ── */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white relative">
        {/* Background Dot Pattern */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#101828 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md bg-white rounded-3xl p-10 sm:p-12 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] border border-[#EAECF0] relative z-10"
        >
          <div className="text-center mb-8">
            <h2 className="text-2xl font-extrabold text-[#101828] mb-2">Welcome back!</h2>
            <p className="text-[#667085] text-sm">Login to your PROVA account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-[#344054] mb-1.5">Email Address / Username</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail size={18} className="text-[#98A2B3]" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-[#D0D5DD] rounded-xl text-sm placeholder-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-[#5B5FF6]/30 focus:border-[#5B5FF6] transition-all bg-white"
                  placeholder="Enter your email or username"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#344054] mb-1.5">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock size={18} className="text-[#98A2B3]" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-3 border border-[#D0D5DD] rounded-xl text-sm placeholder-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-[#5B5FF6]/30 focus:border-[#5B5FF6] transition-all bg-white"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#98A2B3] hover:text-[#667085]"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <a href="#" className="text-xs font-bold text-[#5B5FF6] hover:text-[#4F46E5]">Forgot Password?</a>
            </div>

            {error && (
              <div className="text-xs text-[#F04438] bg-[#FEF3F2] p-2 rounded-lg text-center font-medium">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 px-4 bg-gradient-to-r from-[#5B5FF6] to-[#7B61FF] hover:from-[#4F46E5] hover:to-[#6B4CFF] text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg hover:shadow-[#5B5FF6]/20 transition-all transform active:scale-[0.98] mt-2"
            >
              Log In
            </button>
          </form>

          <div className="mt-8 mb-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#EAECF0]"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 bg-white text-[#667085]">or continue with</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <button type="button" className="flex justify-center items-center py-2.5 px-4 border border-[#D0D5DD] rounded-xl hover:bg-slate-50 transition-colors bg-white shadow-sm">
              <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              <span className="ml-2 text-xs font-bold text-[#344054]">GitHub</span>
            </button>
            <button type="button" className="flex justify-center items-center py-2.5 px-4 border border-[#D0D5DD] rounded-xl hover:bg-slate-50 transition-colors bg-white shadow-sm">
              <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span className="ml-2 text-xs font-bold text-[#344054]">Google</span>
            </button>
            <button type="button" className="flex justify-center items-center py-2.5 px-4 border border-[#D0D5DD] rounded-xl hover:bg-slate-50 transition-colors bg-white shadow-sm">
              <svg className="w-[18px] h-[18px]" viewBox="0 0 21 21">
                <path fill="#f25022" d="M1 1h9v9H1z"/>
                <path fill="#00a4ef" d="M1 11h9v9H1z"/>
                <path fill="#7fba00" d="M11 1h9v9h-9z"/>
                <path fill="#ffb900" d="M11 11h9v9h-9z"/>
              </svg>
              <span className="ml-2 text-xs font-bold text-[#344054]">Microsoft</span>
            </button>
          </div>

          <div className="mt-8 text-center">
            <p className="text-xs text-[#667085]">
              New to PROVA? <a href="#" className="font-bold text-[#5B5FF6] hover:text-[#4F46E5]">Create an account</a>
            </p>
          </div>
        </motion.div>

        <div className="absolute bottom-8 flex items-center gap-2 text-[#667085] bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm border border-[#EAECF0]">
          <Shield size={16} className="text-[#12B76A]" />
          <div className="text-[10px]">
            <p className="font-bold text-[#344054]">Enterprise-grade security</p>
            <p>Your data is encrypted and secure</p>
          </div>
        </div>
      </div>
    </div>
  );
}
