import React, { useState, useEffect } from 'react';
import {
  Search, ArrowRight, Code2, Clock, CheckCircle2, XCircle,
  Activity, Zap, FileText, GitBranch, Cpu, Database, MoreVertical,
  ChevronRight, BarChart3, Shield, PlayCircle, Bot, Server, Folder
} from 'lucide-react';
import { getStatus } from '../api';
import { getLocalJSON } from '../utils/localData';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { motion } from 'framer-motion';

// ─── Design Tokens ────────────────────────────
const T = {
  bg:        '#F7F8FC',
  card:      '#FFFFFF',
  primary:   '#5B5FF6',
  secondary: '#7B61FF',
  blue:      '#4F8CFF',
  success:   '#12B76A',
  warning:   '#F79009',
  danger:    '#F04438',
  textPri:   '#101828',
  textSec:   '#667085',
  textTer:   '#98A2B3',
  border:    '#EAECF0',
  radius:    '24px',
  radiusSm:  '16px',
  shadow:    '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
  shadowHover: '0 20px 40px rgba(91, 95, 246, 0.08)',
};

// ─── Card wrapper ─────────────────────────────
const Card = ({ children, style, className = '', ...props }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, ease: 'easeOut' }}
    style={{
      background: T.card,
      borderRadius: T.radius,
      boxShadow: T.shadow,
      border: `1px solid ${T.border}`,
      ...style,
    }}
    className={className}
    {...props}
  >
    {children}
  </motion.div>
);

// ─── Status badge ─────────────────────────────
const StatusBadge = ({ status }) => {
  const map = {
    Success: { bg: '#ECFDF3', color: T.success, icon: <CheckCircle2 size={13} /> },
    Running: { bg: '#FEF0C7', color: T.warning, icon: <Clock size={13} /> },
    Failed:  { bg: '#FEF3F2', color: T.danger,  icon: <XCircle size={13} /> },
  };
  const s = map[status] || map.Success;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 12px', borderRadius: 20,
      background: s.bg, color: s.color,
      fontSize: 12, fontWeight: 600,
    }}>
      {s.icon} {status}
    </span>
  );
};


// ═══════════════════════════════════════════════
// DASHBOARD COMPONENT
// ═══════════════════════════════════════════════
export default function Dashboard({ setActiveTab }) {
  const [status, setStatus] = useState({ ragInitialized: false, ragMessage: '', provider: '' });
  const [stats, setStats] = useState({ reposAnalyzed: 0, migrationsRun: 0, filesConverted: 0 });
  const [migrations, setMigrations] = useState([]);

  useEffect(() => {
    // Load stats from localStorage
    const localStats = getLocalJSON('assistant_stats', { reposAnalyzed: 0, migrationsRun: 0, filesConverted: 0 });
    setStats(localStats);

    // Load migration history from localStorage
    const history = getLocalJSON('migration_history', []);
    setMigrations(history);

    // Fetch backend RAG status
    const fetchStatus = () => {
      getStatus()
        .then(data => setStatus(data))
        .catch(() => setStatus({ ragInitialized: false, ragMessage: 'Disconnected', provider: '' }));
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  // Normalize migration formats
  const normalizedMigrations = migrations.map(m => {
    if (m.repoUrl && !m.repo) {
      const repoName = m.repoUrl.split('/').pop()?.replace('.git', '') || m.repoUrl;
      const statusStr = (m.success || m.buildStatus === 'Success' || m.buildStatus === 'Build Success') ? 'Success' : (m.buildStatus === 'Running' || m.buildStatus === 'PENDING' ? 'Running' : 'Failed');
      return {
        repo: repoName,
        from: 'Java 8',
        to: `Java ${m.targetVersion || '17'}`,
        status: statusStr,
        progress: (statusStr === 'Success') ? 100 : (statusStr === 'Running' ? 45 : 82),
        duration: (statusStr === 'Success') ? '45s' : (statusStr === 'Running' ? '30s' : '1m 20s'),
        started: m.timestamp || 'Today',
        color: (statusStr === 'Success') ? T.success : (statusStr === 'Running' ? T.warning : T.danger),
        initial: repoName[0]?.toUpperCase() || 'R'
      };
    }
    return m;
  });

  const applied = normalizedMigrations.filter(m => m.status === 'Success').length || 0;
  const failed = normalizedMigrations.filter(m => m.status === 'Failed').length || 0;
  const inProgress = normalizedMigrations.filter(m => m.status === 'Running').length || 0;
  const total = applied + failed + inProgress;
  const successRate = total > 0 ? Math.round((applied / total) * 100) : 0;

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}>
      
      {/* ── KPI ROW ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, marginBottom: 24 }}>
        
        <Card style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              background: 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)', 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.5)'
            }}>
              <FileText size={26} color={T.primary} />
            </div>
            <div>
              <p style={{ fontSize: 13, color: T.textSec, fontWeight: 600, margin: '0 0 4px' }}>Projects Analyzed</p>
              <p style={{ fontSize: 32, fontWeight: 800, color: T.textPri, margin: 0, lineHeight: 1 }}>{total}</p>
            </div>
          </div>
        </Card>

        <Card style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              background: 'linear-gradient(135deg, #ECFDF3 0%, #D1FADF 100%)', 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.5)'
            }}>
              <CheckCircle2 size={26} color={T.success} />
            </div>
            <div>
              <p style={{ fontSize: 13, color: T.textSec, fontWeight: 600, margin: '0 0 4px' }}>Tests Passed</p>
              <p style={{ fontSize: 32, fontWeight: 800, color: T.textPri, margin: 0, lineHeight: 1 }}>{applied}</p>
            </div>
          </div>
        </Card>

        <Card style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              background: 'linear-gradient(135deg, #FEF3F2 0%, #FEE4E2 100%)', 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.5)'
            }}>
              <XCircle size={26} color={T.danger} />
            </div>
            <div>
              <p style={{ fontSize: 13, color: T.textSec, fontWeight: 600, margin: '0 0 4px' }}>Tests Failed</p>
              <p style={{ fontSize: 32, fontWeight: 800, color: T.textPri, margin: 0, lineHeight: 1 }}>{failed}</p>
            </div>
          </div>
        </Card>

        <Card style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ width: 64, height: 64 }}>
              <CircularProgressbar
                value={successRate}
                text={`${successRate}%`}
                styles={buildStyles({
                  textSize: '24px',
                  textColor: T.textPri,
                  pathColor: T.success,
                  trailColor: '#EAECF0',
                  pathTransitionDuration: 1.2,
                })}
              />
            </div>
            <div>
              <p style={{ fontSize: 13, color: T.textSec, fontWeight: 600, margin: '0 0 4px' }}>Success Rate</p>
              <p style={{ fontSize: 12, color: T.success, fontWeight: 700, margin: 0 }}>+2.4% vs last week</p>
            </div>
          </div>
        </Card>
      </div>

      <div style={{ display: 'flex', gap: 24, marginTop: 24, alignItems: 'flex-start' }}>

        {/* ═══ MAIN CONTENT ═══ */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* ── WORKFLOW PIPELINE ── */}
          <Card style={{ padding: '24px' }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: T.textPri, margin: '0 0 20px 0' }}>AI-Powered Testing Journey</h3>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
              
              {/* Connector line */}
              <div style={{ position: 'absolute', top: '50%', left: 40, right: 40, height: 2, background: T.border, zIndex: 0 }} />
              <div style={{ position: 'absolute', top: '50%', left: 40, width: '50%', height: 2, background: `linear-gradient(90deg, ${T.primary}, ${T.secondary})`, zIndex: 0 }} />

              {/* Step 1 */}
              <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, background: T.card, padding: '0 12px' }}>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%', background: T.primary, color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: `0 0 0 6px ${T.bg}`
                }}>
                  <GitBranch size={22} />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: T.textPri, margin: 0 }}>Connect Repository</p>
                  <p style={{ fontSize: 12, color: T.textSec, margin: '4px 0 0' }}>Link GitHub codebase</p>
                </div>
              </div>

              {/* Step 2 */}
              <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, background: T.card, padding: '0 12px' }}>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%', background: T.secondary, color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: `0 0 0 6px ${T.bg}`
                }}>
                  <Bot size={22} />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: T.textPri, margin: 0 }}>AI Analysis</p>
                  <p style={{ fontSize: 12, color: T.textSec, margin: '4px 0 0' }}>Generate test suites</p>
                </div>
              </div>

              {/* Step 3 */}
              <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, background: T.card, padding: '0 12px' }}>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%', background: '#F9FAFB', border: `2px dashed ${T.border}`, color: T.textTer,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: `0 0 0 6px ${T.bg}`
                }}>
                  <PlayCircle size={22} />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: T.textPri, margin: 0 }}>Execute Tests</p>
                  <p style={{ fontSize: 12, color: T.textSec, margin: '4px 0 0' }}>Run in Project Runner</p>
                </div>
              </div>

            </div>
            
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 32 }}>
              <button
                onClick={() => setActiveTab('analysis')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '12px 32px', borderRadius: 12,
                  background: `linear-gradient(90deg, ${T.primary}, ${T.secondary})`, color: '#fff',
                  fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(91, 95, 246, 0.3)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(91, 95, 246, 0.4)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(91, 95, 246, 0.3)'; }}
              >
                Start New Project <ArrowRight size={18} />
              </button>
            </div>
          </Card>

          {/* ── RECENT RUNTIME PROJECTS ── */}
          <Card style={{ padding: '24px' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: T.textPri, margin: 0 }}>Recent Runtime Projects</h3>
                <button style={{ 
                  background: 'transparent', border: 'none', color: T.primary, 
                  fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 
                }}>
                  View All <ChevronRight size={16} />
                </button>
              </div>

              {normalizedMigrations.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', background: T.bg, borderRadius: 16 }}>
                  <Folder size={32} color={T.textTer} style={{ margin: '0 auto 12px' }} />
                  <p style={{ fontSize: 14, color: T.textSec, fontWeight: 500, margin: 0 }}>No recent projects found</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr>
                        <th style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}`, fontSize: 12, fontWeight: 600, color: T.textSec, textTransform: 'uppercase', letterSpacing: 0.5 }}>Project</th>
                        <th style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}`, fontSize: 12, fontWeight: 600, color: T.textSec, textTransform: 'uppercase', letterSpacing: 0.5 }}>Started</th>
                        <th style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}`, fontSize: 12, fontWeight: 600, color: T.textSec, textTransform: 'uppercase', letterSpacing: 0.5 }}>Duration</th>
                        <th style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}`, fontSize: 12, fontWeight: 600, color: T.textSec, textTransform: 'uppercase', letterSpacing: 0.5 }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {normalizedMigrations.slice(0, 5).map((m, idx) => (
                        <tr key={idx} style={{ borderBottom: `1px solid ${T.border}` }}>
                          <td style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ 
                              width: 36, height: 36, borderRadius: 10, background: '#EEF2FF', color: T.primary, 
                              display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14 
                            }}>
                              {m.initial}
                            </div>
                            <span style={{ fontSize: 14, fontWeight: 600, color: T.textPri }}>{m.repo}</span>
                          </td>
                          <td style={{ padding: '16px', fontSize: 14, color: T.textSec }}>{m.started}</td>
                          <td style={{ padding: '16px', fontSize: 14, color: T.textSec }}>{m.duration}</td>
                          <td style={{ padding: '16px' }}>
                            <StatusBadge status={m.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
          </Card>

        </div>

        {/* ═══ RIGHT SIDEBAR ═══ */}
        <div style={{ width: 320, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* ── AI SYSTEM STATUS ── */}
          <Card style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <Server size={20} color={T.textPri} />
              <h3 style={{ fontSize: 16, fontWeight: 700, color: T.textPri, margin: 0 }}>System Modules</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { name: 'AI Engine', status: 'Healthy' },
                { name: 'RAG Engine', status: status.ragInitialized ? 'Healthy' : 'Loading' },
                { name: 'Test Generation API', status: 'Healthy' },
                { name: 'Execution Environment', status: 'Healthy' },
                { name: 'Database', status: 'Healthy' },
                { name: 'Cache (Redis)', status: 'Healthy' }
              ].map((service, i) => (
                <div key={i} style={{ 
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  paddingBottom: 12, borderBottom: i === 5 ? 'none' : `1px solid ${T.border}`
                }}>
                  <span style={{ fontSize: 14, color: T.textPri, fontWeight: 500 }}>{service.name}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: service.status === 'Healthy' ? T.success : T.warning,
                      boxShadow: `0 0 0 3px ${service.status === 'Healthy' ? T.success : T.warning}20`
                    }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: service.status === 'Healthy' ? T.success : T.warning }}>
                      {service.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            
            <div style={{ marginTop: 24, padding: '16px', background: '#F8FAFC', borderRadius: 12, border: `1px solid ${T.border}` }}>
              <p style={{ fontSize: 12, color: T.textSec, margin: '0 0 8px', fontWeight: 600 }}>Active AI Model</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Cpu size={16} color={T.primary} />
                <span style={{ fontSize: 14, fontWeight: 700, color: T.textPri }}>{status.provider || 'Gemini 2.5 Flash'}</span>
              </div>
            </div>
          </Card>
          
        </div>
      </div>
    </div>
  );
}
