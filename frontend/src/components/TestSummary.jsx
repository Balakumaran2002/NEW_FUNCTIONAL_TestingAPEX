import React from "react";
import { CheckCircle, XCircle, AlertCircle, ExternalLink, RefreshCw, FlaskConical, Beaker, Download } from "lucide-react";

/**
 * TestSummary
 * 
 * Displays test results for a migrated project.
 * Props:
 *   framework — 'playwright' or 'selenium'
 *   status  — the status object returned by GET /api/{framework}/{repo}/status
 *   onRun   — callback to trigger test run
 *   onViewReport — callback to open the HTML report
 *   onDownloadReport — callback to trigger the report zip download
 *   loading — bool: true while tests are being kicked off
 */
export default function TestSummary({ framework, status, onRun, onViewReport, onDownloadReport, loading }) {
  if (!status) return null;

  const {
    testFilesCount,
    totalTests,
    passedTests,
    failedTests,
    skippedTests,
    executionTime,
    status: testStatus,
    htmlReportUrl,
    errorMessage,
  } = status;
  
  const isAvailable = status.playwrightAvailable || status.seleniumAvailable;
  const FrameworkIcon = framework === 'playwright' ? FlaskConical : Beaker;
  const frameworkName = framework === 'playwright' ? 'Playwright' : 'Selenium';

  // ── Running / loading ───────────────────────────────────────────────
  const isRunning = testStatus === "RUNNING" || loading;
  if (isRunning) {
    return (
      <div className="p-5 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 flex flex-col gap-3">
        <div className="flex items-center gap-3 animate-pulse">
          <RefreshCw size={18} className="text-indigo-500 animate-spin shrink-0" />
          <div>
            <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">Running {frameworkName} Tests…</p>
            <p className="text-xs text-slate-400 mt-0.5">Executing test suites and generating reports…</p>
          </div>
        </div>

        {status?.testFiles && status.testFiles.length > 0 && (
          <div className="mt-2 bg-white/60 dark:bg-dark-900/50 rounded-xl p-3 border border-indigo-500/10">
            <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 mb-2 flex items-center gap-1.5">
              <FlaskConical size={12} /> Files being executed:
            </p>
            <ul className="text-[11px] text-slate-600 dark:text-slate-400 font-mono space-y-1.5">
              {status.testFiles.map((file, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                  </span>
                  {file}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  // ── Not available ───────────────────────────────────────────────────
  if (!isAvailable) {
    return (
      <div className="p-5 rounded-2xl bg-slate-100/50 dark:bg-dark-900/40 border border-slate-200/30 dark:border-dark-800/40 flex items-start gap-3">
        <FrameworkIcon size={18} className="text-slate-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">{frameworkName} Tests Not Found</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">
            {errorMessage || `No ${frameworkName} configuration or test files detected in this project.`}
          </p>
        </div>
      </div>
    );
  }

  // ── Not yet run ──────────────────────────────────────────────────────
  if (testStatus === "NOT_RUN") {
    return (
      <div className="p-5 rounded-2xl border border-violet-500/20 bg-violet-500/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FrameworkIcon size={18} className="text-violet-500 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-violet-700 dark:text-violet-400">
                {frameworkName} Tests Available
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {testFilesCount} test file{testFilesCount !== 1 ? "s" : ""} detected.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────
  if (testStatus === "ERROR") {
    return (
      <div className="p-5 rounded-2xl border border-rose-500/20 bg-rose-500/5">
        <div className="flex items-start gap-3 mb-3">
          <AlertCircle size={18} className="text-rose-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">Test Run Failed</p>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed whitespace-pre-wrap max-h-24 overflow-auto">
              {errorMessage}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Results: PASSED / FAILED / NO_TESTS ─────────────────────────────
  const isPassed = testStatus === "PASSED" || testStatus === "COMPLETED";
  const isNoTests = testStatus === "NO_TESTS";

  const statusConfig = isPassed
    ? { label: "COMPLETED", border: "border-emerald-500/30", bg: "bg-emerald-500/5", text: "text-emerald-600 dark:text-emerald-400", icon: <CheckCircle size={20} className="text-emerald-500" /> }
    : isNoTests
    ? { label: "NO TESTS", border: "border-slate-400/30", bg: "bg-slate-100/40 dark:bg-dark-900/30", text: "text-slate-500", icon: <AlertCircle size={20} className="text-slate-400" /> }
    : { label: "FAILED", border: "border-rose-500/30", bg: "bg-rose-500/5", text: "text-rose-600 dark:text-rose-400", icon: <XCircle size={20} className="text-rose-500" /> };

  return (
    <div className={`p-5 rounded-2xl border ${statusConfig.border} ${statusConfig.bg}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FrameworkIcon size={16} className="text-violet-500" />
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">{frameworkName} Test Summary</h4>
        </div>
        <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${statusConfig.border} ${statusConfig.text}`}>
          {statusConfig.icon}
          {statusConfig.label}
        </span>
      </div>

      {/* Stats list */}
      <div className="flex flex-col gap-1 mb-4 text-sm">
        <div><span className="font-semibold text-slate-500">Total Tests:</span> <span className="font-bold text-slate-700 dark:text-slate-300">{totalTests}</span></div>
        <div><span className="font-semibold text-slate-500">Passed:</span> <span className="font-bold text-emerald-600 dark:text-emerald-400">{passedTests}</span></div>
        <div><span className="font-semibold text-slate-500">Failed:</span> <span className="font-bold text-rose-600 dark:text-rose-400">{failedTests}</span></div>
        <div><span className="font-semibold text-slate-500">Skipped:</span> <span className="font-bold text-amber-600 dark:text-amber-400">{skippedTests}</span></div>
        <div><span className="font-semibold text-slate-500">Execution Time:</span> <span className="font-bold text-slate-700 dark:text-slate-300">{executionTime || "—"}</span></div>
        <div>
          <span className="font-semibold text-slate-500">Status:</span>{' '}
          <span className={`font-bold ${statusConfig.text}`}>{statusConfig.label}</span>
        </div>
      </div>

      {status?.errorMessage && (
        <div className="text-xs text-rose-500 mb-4 p-2 bg-rose-50 dark:bg-rose-900/20 rounded">
          {status.errorMessage}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-end">
        <div className="flex gap-2">
          {htmlReportUrl && (
            <>
              <button
                onClick={onViewReport}
                className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow transition-all"
              >
                <ExternalLink size={11} /> View HTML Report
              </button>
              <button
                onClick={onDownloadReport}
                className="flex items-center gap-1 px-3 py-1.5 bg-slate-600 hover:bg-slate-700 text-white text-xs font-bold rounded-lg shadow transition-all"
              >
                <Download size={11} /> Download Report
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
