import React, { useState, useEffect } from 'react';
import { FileText, CheckCircle, XCircle, AlertTriangle, Download, Loader, PieChart, Layers } from 'lucide-react';
import { motion } from 'framer-motion';
import { 
  getPlaywrightStatus, 
  getSeleniumStatus, 
  getBrdDownloadUrl,
  getUiTestCasesDownloadUrl,
  getApiTestCasesDownloadUrl,
  getPlaywrightReportDownloadUrl,
  getSeleniumReportDownloadUrl
} from '../api';

export default function Summary({ repoUrl }) {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    successRate: 0,
  });

  const extractRepoName = (url) => {
    if (!url) return '';
    try {
      const parts = url.split('/');
      let name = parts[parts.length - 1];
      if (name.endsWith('.git')) name = name.replace('.git', '');
      return name;
    } catch (e) {
      return url;
    }
  };

  const repoName = extractRepoName(repoUrl);

  useEffect(() => {
    if (!repoName) {
      setLoading(false);
      return;
    }

    const fetchMetrics = async () => {
      try {
        const [pwResponse, selResponse] = await Promise.allSettled([
          getPlaywrightStatus(repoName),
          getSeleniumStatus(repoName)
        ]);

        let total = 0;
        let passed = 0;
        let failed = 0;
        let skipped = 0;

        if (pwResponse.status === 'fulfilled' && pwResponse.value) {
          const pw = pwResponse.value;
          total += pw.totalTests || 0;
          passed += pw.passedTests || 0;
          failed += pw.failedTests || 0;
          skipped += pw.skippedTests || 0;
        }

        if (selResponse.status === 'fulfilled' && selResponse.value) {
          const sel = selResponse.value;
          total += sel.totalTests || 0;
          passed += sel.passedTests || 0;
          failed += sel.failedTests || 0;
          skipped += sel.skippedTests || 0;
        }

        const successRate = total > 0 ? Math.round((passed / total) * 100) : 0;

        setMetrics({
          total,
          passed,
          failed,
          skipped,
          successRate
        });
      } catch (error) {
        console.error("Error fetching test metrics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [repoName]);

  const MetricCard = ({ title, value, icon: Icon, colorClass, bgColorClass }) => (
    <div className="bg-white rounded-2xl p-6 shadow-card border border-[#EAECF0] flex items-center gap-5 transition-transform hover:-translate-y-1">
      <div className={`w-14 h-14 rounded-full flex items-center justify-center ${bgColorClass}`}>
        <Icon size={28} className={colorClass} />
      </div>
      <div>
        <p className="text-sm font-semibold text-[#667085] mb-1">{title}</p>
        <h3 className="text-3xl font-black text-[#101828]">{value}</h3>
      </div>
    </div>
  );

  const DownloadCard = ({ title, description, url, icon: Icon, disabled }) => (
    <div className={`bg-white rounded-2xl p-6 shadow-card border border-[#EAECF0] flex flex-col transition-all ${disabled ? 'opacity-60 grayscale' : 'hover:border-brand-300 hover:shadow-lg'}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 bg-[#F7F8FC] rounded-xl flex items-center justify-center text-[#667085]">
          <Icon size={24} />
        </div>
        <a 
          href={disabled ? '#' : url}
          target={disabled ? "_self" : "_blank"}
          rel="noopener noreferrer"
          className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 ${disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-brand-50 text-brand-700 hover:bg-brand-100'}`}
          onClick={(e) => disabled && e.preventDefault()}
        >
          <Download size={16} />
          Download
        </a>
      </div>
      <h4 className="text-lg font-bold text-[#101828] mb-2">{title}</h4>
      <p className="text-sm text-[#667085] leading-relaxed">{description}</p>
    </div>
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-[#667085]">Aggregating metrics and preparing reports...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-fadeIn w-full">
      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-[#EAECF0] w-full">
        <div className="mb-6">
          <h2 className="text-2xl font-black text-[#101828] flex items-center gap-3 mb-2">
            <PieChart className="text-brand-500" size={28} />
            Execution Summary
          </h2>
          <p className="text-base text-[#667085]">
            Overview of test execution metrics and central repository for all generated artifacts.
          </p>
        </div>

      {/* Metrics Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        <MetricCard 
          title="Total Test Cases" 
          value={metrics.total} 
          icon={Layers} 
          colorClass="text-blue-600"
          bgColorClass="bg-blue-50"
        />
        <MetricCard 
          title="Passed" 
          value={metrics.passed} 
          icon={CheckCircle} 
          colorClass="text-green-600"
          bgColorClass="bg-green-50"
        />
        <MetricCard 
          title="Failed" 
          value={metrics.failed} 
          icon={XCircle} 
          colorClass="text-red-600"
          bgColorClass="bg-red-50"
        />
        <MetricCard 
          title="Success Rate" 
          value={`${metrics.successRate}%`} 
          icon={AlertTriangle} 
          colorClass="text-amber-600"
          bgColorClass="bg-amber-50"
        />
      </motion.div>
      </div>

      {/* Downloads Section */}
      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-[#EAECF0] w-full">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <h3 className="text-xl font-bold text-[#101828] mb-6 flex items-center gap-2">
          <Download className="text-brand-500" size={24} />
          Report Downloads
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <DownloadCard 
            title="BRD Report"
            description="Business Requirements Document generated during the Discovery phase outlining project scope and specifications."
            url={getBrdDownloadUrl(repoName)}
            icon={FileText}
          />
          <DownloadCard 
            title="UI Test Cases Summary"
            description="Comprehensive listing of all generated UI test cases in PDF or ZIP format."
            url={getUiTestCasesDownloadUrl(repoName)}
            icon={FileText}
          />
          <DownloadCard 
            title="API Test Cases Summary"
            description="Comprehensive listing of all generated API test cases in PDF or ZIP format."
            url={getApiTestCasesDownloadUrl(repoName)}
            icon={FileText}
          />
          <DownloadCard 
            title="Playwright Execution Report"
            description="Detailed HTML report containing traces, screenshots, and videos of UI test executions."
            url={getPlaywrightReportDownloadUrl(repoName)}
            icon={FileText}
          />
          <DownloadCard 
            title="Selenium Execution Report"
            description="Coming Soon. Detailed HTML report containing logs and results of Selenium/API test executions."
            url="#"
            icon={FileText}
            disabled={true}
          />
        </div>
      </motion.div>
      </div>
    </div>
  );
}
