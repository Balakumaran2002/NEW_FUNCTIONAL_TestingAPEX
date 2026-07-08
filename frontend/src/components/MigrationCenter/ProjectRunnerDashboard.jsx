import React from 'react';
import { Server, RefreshCw, Play, StopCircle, FlaskConical, Beaker } from 'lucide-react';

export default function ProjectRunnerDashboard({
  runnerStatus,
  runnerPort,
  runnerType,
  handleStartProject,
  handleStopProject,
  handleRestartProject,
  runnerLoading,
  testFramework,
  setTestFramework,
  handleRunTest,
  testLoading,
  testStatus,
  setTestViewActive
}) {
  return (
    <div className="mt-8 p-6 glass-card animate-fadeIn border border-indigo-500/10 shadow-lg flex flex-col gap-6">
      
      {/* Project Runner Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/50 dark:border-dark-800/50 pb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-2xl border border-indigo-500/20">
            <Server size={22} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Project Runner Dashboard
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              Automatically installs dependencies, resolves ports, and launches the app.
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4 flex-wrap">
          {/* Status Badges */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Status:</span>
            {runnerStatus === 'IDLE' && (
              <span className="px-2.5 py-1 bg-slate-100 dark:bg-dark-800 text-slate-700 dark:text-slate-300 font-bold rounded-lg border border-slate-200/50 dark:border-dark-700">
                IDLE
              </span>
            )}
            {runnerStatus === 'STARTING' && (
              <span className="px-2.5 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold rounded-lg border border-amber-500/20 animate-pulse flex items-center gap-1.5">
                <RefreshCw size={12} className="animate-spin" /> STARTING
              </span>
            )}
            {runnerStatus === 'RUNNING' && (
              <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold rounded-lg border border-emerald-500/20 flex items-center gap-1.5 shadow-[0_0_12px_rgba(16,185,129,0.15)]">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" /> RUNNING
              </span>
            )}
            {runnerStatus === 'RUNNING_JAVA' && (
              <span className="px-2.5 py-1 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold rounded-lg border border-indigo-500/20 flex items-center gap-1.5 shadow-[0_0_12px_rgba(99,102,241,0.15)]">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" /> REST API LIVE
              </span>
            )}
            {runnerStatus === 'FAILED' && (
              <span className="px-2.5 py-1 bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold rounded-lg border border-rose-500/20">
                FAILED
              </span>
            )}
            {runnerStatus === 'STOPPED' && (
              <span className="px-2.5 py-1 bg-slate-500/10 text-slate-500 dark:text-slate-400 font-bold rounded-lg border border-slate-500/20">
                STOPPED
              </span>
            )}
          </div>

          {runnerPort && (
            <div className="text-xs bg-slate-100 dark:bg-dark-800/80 px-2.5 py-1 rounded-lg border border-slate-200/40 dark:border-dark-700/40">
              <span className="text-slate-400">Port:</span> <span className="font-bold font-mono text-indigo-500">{runnerPort}</span>
            </div>
          )}

          {runnerType && (
            <div className="text-xs bg-slate-100 dark:bg-dark-800/80 px-2.5 py-1 rounded-lg border border-slate-200/40 dark:border-dark-700/40">
              <span className="text-slate-400">Type:</span> <span className="font-bold text-slate-600 dark:text-slate-300">{runnerType}</span>
            </div>
          )}

          {/* Primary Action Buttons */}
          {runnerStatus === 'IDLE' || runnerStatus === 'STOPPED' || runnerStatus === 'FAILED' ? (
            <button
              onClick={handleStartProject}
              disabled={runnerLoading || testLoading}
              className="flex items-center gap-1.5 px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold rounded-xl text-xs shadow-md transition-all disabled:opacity-50"
            >
              <Play size={12} fill="currentColor" /> Run Project
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleRestartProject}
                disabled={runnerLoading || testLoading}
                className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs shadow-md transition-all disabled:opacity-50"
              >
                <RefreshCw size={12} /> Restart
              </button>
              <button
                onClick={handleStopProject}
                disabled={runnerLoading || testLoading}
                className="flex items-center gap-1.5 px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl text-xs shadow-md transition-all disabled:opacity-50"
              >
                <StopCircle size={12} /> Stop
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Functional Test Box */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-violet-500/10 text-violet-500 rounded-2xl border border-violet-500/20">
            <FlaskConical size={22} />
          </div>
          <div>
            <h3 className="text-md font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Functional Test Suite
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              Select a framework and run automated E2E testing for the application's UI.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center bg-slate-100 dark:bg-dark-800/80 p-1 rounded-xl border border-slate-200/40 dark:border-dark-700/40">
            <button
              onClick={() => { setTestFramework('playwright'); setTestViewActive(true); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                testFramework === 'playwright'
                  ? 'bg-white dark:bg-dark-900 text-violet-600 shadow-sm border border-slate-200/50 dark:border-dark-700'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Playwright
            </button>
            <button
              onClick={() => { setTestFramework('selenium'); setTestViewActive(true); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                testFramework === 'selenium'
                  ? 'bg-white dark:bg-dark-900 text-violet-600 shadow-sm border border-slate-200/50 dark:border-dark-700'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Selenium
            </button>
          </div>
          
          <div className="flex items-center gap-2 text-xs">
            {testStatus === 'RUNNING' && (
              <span className="px-2.5 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold rounded-lg border border-amber-500/20 animate-pulse flex items-center gap-1.5">
                <RefreshCw size={12} className="animate-spin" /> TESTING
              </span>
            )}
            {testStatus === 'COMPLETED' && (
              <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold rounded-lg border border-emerald-500/20">
                COMPLETED
              </span>
            )}
          </div>

          <button
            onClick={handleRunTest}
            disabled={testLoading || runnerStatus === 'IDLE' || runnerStatus === 'STOPPED' || runnerStatus === 'FAILED'}
            className="flex items-center gap-1.5 px-5 py-2 bg-gradient-to-r from-violet-500 to-fuchsia-600 hover:from-violet-600 hover:to-fuchsia-700 text-white font-bold rounded-xl text-xs shadow-md transition-all disabled:opacity-50"
          >
            <Beaker size={12} /> Run Test
          </button>
        </div>
      </div>
    </div>
  );
}
