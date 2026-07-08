import React, { useState, useEffect } from 'react';
import {
  Search, ArrowRight, Code2, Clock, CheckCircle2, XCircle,
  Activity, Zap, FileText, GitBranch, Cpu, Database, MoreVertical,
  ChevronRight, BarChart3, Shield
} from 'lucide-react';
import { getStatus } from '../api';
import { getLocalJSON } from '../utils/localData';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { motion } from 'framer-motion';

// ─── Design Tokens ────────────────────────────
const T = {
  bg:        '#FAF6F2',
  card:      '#FFFFFF',
  primary:   '#FF6A00',
  secondary: '#FFB347',
  success:   '#22C55E',
  warning:   '#F59E0B',
  danger:    '#EF4444',
  textPri:   '#111111',
  textSec:   '#666666',
  textTer:   '#999999',
  border:    '#F0E6DD',
  radius:    '20px',
  radiusSm:  '12px',
  shadow:    '0 10px 30px rgba(0,0,0,0.05)',
  shadowHover: '0 20px 40px rgba(0,0,0,0.08)',
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
    Success: { bg: '#ECFDF5', color: T.success, icon: <CheckCircle2 size={13} /> },
    Running: { bg: '#FFFBEB', color: T.warning, icon: <Clock size={13} /> },
    Failed:  { bg: '#FEF2F2', color: T.danger,  icon: <XCircle size={13} /> },
  };
  const s = map[status] || map.Success;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '4px 10px', borderRadius: 20,
      background: s.bg, color: s.color,
      fontSize: 12, fontWeight: 600,
    }}>
      {s.icon} {status}
    </span>
  );
};

// ─── Progress bar (inline) ────────────────────
const ProgressBar = ({ value }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
    <span style={{ fontSize: 12, fontWeight: 600, color: T.textPri, minWidth: 32 }}>{value}%</span>
    <div style={{ flex: 1, height: 6, background: '#F3F0EB', borderRadius: 3, overflow: 'hidden' }}>
      <div style={{
        width: `${value}%`, height: '100%', borderRadius: 3,
        background: value === 100 ? T.primary : value < 50 ? T.danger : T.warning,
        transition: 'width 0.6s ease',
      }} />
    </div>
  </div>
);

// ─── Custom Tooltip for charts ────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload) return null;
  return (
    <div style={{
      background: '#fff', border: `1px solid ${T.border}`, borderRadius: 12,
      padding: '10px 14px', boxShadow: T.shadow, fontSize: 12,
    }}>
      <p style={{ fontWeight: 700, color: T.textPri, marginBottom: 4 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color, margin: 0 }}>
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
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
    // Load stats from localStorage (real data only)
    const localStats = getLocalJSON('assistant_stats', { reposAnalyzed: 0, migrationsRun: 0, filesConverted: 0 });
    setStats(localStats);

    // Load migration history from localStorage (real data only)
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

  // Normalize migration formats (bridge format saved by MigrationCenter and expected by Dashboard)
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

  // Derive KPI values from normalized data
  const applied = normalizedMigrations.filter(m => m.status === 'Success').length || 0;
  const failed = normalizedMigrations.filter(m => m.status === 'Failed').length || 0;
  const inProgress = normalizedMigrations.filter(m => m.status === 'Running').length || 0;
  const total = applied + failed + inProgress;
  const successRate = total > 0 ? Math.round((applied / total) * 100) : 0;



  return (
    <div style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}>
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>

        {/* ═══ MAIN CONTENT ═══ */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* ── HERO BANNER ── */}
          <Card style={{ padding: 0, overflow: 'hidden', position: 'relative', height: 280 }}>
            <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
              {/* Left text */}
              <div style={{ flex: 1, padding: '28px 40px' }}>
                <span style={{
                  display: 'inline-block', padding: '6px 14px', borderRadius: 8,
                  background: `${T.primary}15`, color: T.primary,
                  fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.2,
                }}>
                  Enterprise Testing Assistant
                </span>
                <h1 style={{
                  marginTop: 16, fontSize: 28, fontWeight: 800,
                  color: T.textPri, lineHeight: 1.25, letterSpacing: -0.5,
                }}>
                  Laura- The Test Assistant
                </h1>
                <div style={{ marginTop: 24, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <button
                    onClick={() => setActiveTab('analysis')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '12px 24px', borderRadius: 12,
                      background: T.primary, color: '#fff',
                      fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(255,106,0,0.3)',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(255,106,0,0.4)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(255,106,0,0.3)'; }}
                  >
                    Analyze Repository <ArrowRight size={15} />
                  </button>

                </div>
              </div>

              {/* Right illustration */}
              <div style={{
                width: 320, height: 260, position: 'relative',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginRight: 20,
              }}>
                {/* Java holographic image projection */}
                <div style={{
                  position: 'relative', width: 140, height: 180,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  animation: 'javaFloat 4s ease-in-out infinite, javaSlide 6s ease-in-out infinite',
                }}>
                  {/* Glowing background halo */}
                  <div style={{
                    position: 'absolute', width: 200, height: 200,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(0,240,255,0.2) 0%, rgba(255,0,122,0.1) 50%, transparent 70%)',
                    filter: 'blur(30px)',
                    zIndex: 0,
                  }} />

                  {/* Holographic Projection Laser Grid/Saucer at the bottom */}
                  <div style={{
                    position: 'absolute', bottom: 15, width: 100, height: 6,
                    borderRadius: '50%',
                    border: '1.5px solid #00F0FF',
                    boxShadow: '0 0 10px #00F0FF, inset 0 0 6px #00F0FF',
                    background: 'rgba(0, 240, 255, 0.1)',
                    transform: 'rotateX(75deg)',
                    zIndex: 1,
                  }} />
                  <div style={{
                    position: 'absolute', bottom: 12, width: 6, height: 6,
                    borderRadius: '50%',
                    background: '#00F0FF',
                    boxShadow: '0 0 8px #00F0FF',
                    zIndex: 1,
                  }} />

                  {/* Laser beam light projection cone */}
                  <div style={{
                    position: 'absolute', bottom: 15, width: 80, height: 110,
                    background: 'linear-gradient(to top, rgba(0,240,255,0.15) 0%, rgba(255,0,122,0.02) 100%)',
                    clipPath: 'polygon(15% 0%, 85% 0%, 100% 100%, 0% 100%)',
                    transformOrigin: 'bottom center',
                    zIndex: 1,
                  }} />

                  {/* Holographic Java Logo Image */}
                  <div style={{ position: 'relative', zIndex: 2, transform: 'translateY(-15px)' }}>
                    <img 
                      src="/java_logo.png" 
                      alt="Java Hologram Logo"
                      style={{
                        width: 75,
                        height: 'auto',
                        filter: 'drop-shadow(0 0 8px rgba(0, 240, 255, 0.8)) drop-shadow(0 0 15px rgba(255, 0, 122, 0.5))',
                        opacity: 0.9,
                        animation: 'holoGlitch 6s linear infinite',
                      }}
                    />
                    {/* Futuristic tech target scope overlay */}
                    <div style={{
                      position: 'absolute', top: '50%', left: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: 95, height: 95,
                      borderRadius: '50%',
                      border: '0.8px dashed rgba(0,240,255,0.4)',
                      animation: 'spin 20s linear infinite',
                    }} />
                  </div>
                </div>
                {/* Floating badges */}
                <div style={{
                  position: 'absolute', top: 20, right: 30,
                  background: '#fff', borderRadius: 12, padding: '8px 10px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                  animation: 'floatBadge 3s ease-in-out infinite',
                }}>
                  <CheckCircle2 size={18} color={T.success} />
                </div>
                <div style={{
                  position: 'absolute', bottom: 30, left: 20,
                  background: '#fff', borderRadius: 12, padding: '8px 10px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                  animation: 'floatBadge 3.5s ease-in-out infinite 0.5s',
                }}>
                  <Shield size={18} color={T.primary} />
                </div>
                <div style={{
                  position: 'absolute', top: 50, left: 10,
                  background: '#fff', borderRadius: 12, padding: '8px 10px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                  animation: 'floatBadge 4s ease-in-out infinite 1s',
                }}>
                  <Code2 size={18} color="#6366F1" />
                </div>
                <div style={{
                  position: 'absolute', bottom: 50, right: 10,
                  background: '#fff', borderRadius: 12, padding: '8px 10px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                  animation: 'floatBadge 3.2s ease-in-out infinite 0.8s',
                }}>
                  <Database size={18} color={T.success} />
                </div>
              </div>
            </div>
          </Card>

          {/* ── KPI ROW ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 160px', gap: 16 }}>
            {/* Test Applied */}
            <Card style={{ padding: '24px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: `${T.primary}12`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <FileText size={22} color={T.primary} />
                </div>
                <div>
                  <p style={{ fontSize: 12, color: T.textSec, fontWeight: 500, margin: 0 }}>Test Applied</p>
                  <p style={{ fontSize: 28, fontWeight: 800, color: T.textPri, margin: '2px 0 0' }}>{total}</p>
                </div>
              </div>
            </Card>

            {/* Test Succeed */}
            <Card style={{ padding: '24px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: `${T.success}12`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <CheckCircle2 size={22} color={T.success} />
                </div>
                <div>
                  <p style={{ fontSize: 12, color: T.textSec, fontWeight: 500, margin: 0 }}>Test Succeed</p>
                  <p style={{ fontSize: 28, fontWeight: 800, color: T.textPri, margin: '2px 0 0' }}>{applied}</p>
                </div>
              </div>
            </Card>

            {/* Test Failed */}
            <Card style={{ padding: '24px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: `${T.danger}12`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <XCircle size={22} color={T.danger} />
                </div>
                <div>
                  <p style={{ fontSize: 12, color: T.textSec, fontWeight: 500, margin: 0 }}>Test Failed</p>
                  <p style={{ fontSize: 28, fontWeight: 800, color: T.textPri, margin: '2px 0 0' }}>{failed}</p>
                </div>
              </div>
            </Card>

            {/* Circular Progress & Success Rate */}
            <Card style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: 56, height: 56 }}>
                  <CircularProgressbar
                    value={successRate}
                    text={`${successRate}%`}
                    styles={buildStyles({
                      textSize: '24px',
                      textColor: T.textPri,
                      pathColor: T.success,
                      trailColor: '#F3F0EB',
                      pathTransitionDuration: 1.2,
                    })}
                  />
                </div>
                <span style={{ marginTop: 8, fontSize: 11, fontWeight: 700, color: T.textSec, letterSpacing: 0.5 }}>Success Rate</span>
              </div>
            </Card>
          </div>


        </div>

        {/* ═══ RIGHT SIDEBAR ═══ */}
        <div style={{ width: 260, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 24 }}>



          {/* ── RECENT ACTIVITY ── */}
          <Card style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: T.textPri, margin: 0 }}>Recent Activity</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { label: 'Selenium Tests Executed', time: 'Just now', color: T.success },
                { label: 'Playwright Report Generated', time: '1 hr ago', color: T.primary },
                { label: 'E2E Testing Completed', time: '2 hrs ago', color: T.primary },
                { label: 'Test Environment Scanned', time: '5 hrs ago', color: '#3B82F6' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: item.color, marginTop: 4, flexShrink: 0,
                    boxShadow: `0 0 0 3px ${item.color}25`,
                  }} />
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: T.textPri, margin: 0 }}>{item.label}</p>
                    <p style={{ fontSize: 11, color: T.textTer, margin: '2px 0 0' }}>{item.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* ── SYSTEM STATUS ── */}
          <Card style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: T.textPri, margin: 0 }}>System Status</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                'AI Engine', 'RAG Engine', 'Migration API',
                'Conversion API', 'Database', 'Redis Cache',
              ].map((name, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: (name === 'RAG Engine' && !status.ragInitialized) ? T.warning : T.success,
                    }} />
                    <span style={{ fontSize: 13, color: T.textPri, fontWeight: 500 }}>{name}</span>
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 600,
                    color: (name === 'RAG Engine' && !status.ragInitialized) ? T.warning : T.success,
                  }}>
                    {(name === 'RAG Engine' && !status.ragInitialized) ? 'Loading' : 'Healthy'}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Inline keyframes for floating animation */}
      <style>{`
        @keyframes javaFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        @keyframes javaSlide {
          0%, 100% { transform: translateX(0px); }
          50% { transform: translateX(15px); }
        }
        @keyframes holoGlitch {
          0%, 100% { opacity: 0.9; transform: scale(1); filter: drop-shadow(0 0 8px rgba(0, 240, 255, 0.8)) hue-rotate(-10deg); }
          92% { opacity: 0.9; transform: scale(1); }
          93% { opacity: 0.7; transform: scaleY(0.98) skewX(2deg); filter: hue-rotate(50deg) saturate(2); }
          94% { opacity: 0.9; transform: scale(1); }
          95% { opacity: 0.5; transform: scaleX(1.03) skewX(-2deg); filter: hue-rotate(-60deg); }
          96% { opacity: 0.9; transform: scale(1); }
        }
        @keyframes spin {
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }
        @keyframes floatBadge {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}
