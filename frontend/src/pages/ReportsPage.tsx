import React, { useState } from 'react';
import { FileSpreadsheet, Download, Sparkles, Send, Bot, User, CheckCircle2, Filter, FileText } from 'lucide-react';
import { reportsApi } from '../api';
import { Tabs, PeriodFilter } from '../components/common';
import type { Period } from '../types';
import { useToast } from '../context/ToastContext';

export const ReportsPage: React.FC<{ initialTab?: string }> = ({ initialTab = 'generator' }) => {
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState(initialTab);
  const [period, setPeriod] = useState<Period>({ year: 2026, month: 6 });
  const [format, setFormat] = useState<'PDF' | 'Excel' | 'CSV'>('PDF');
  const [reportType, setReportType] = useState('Comprehensive ESG Disclosure (CSRD / SECR)');
  const [exporting, setExporting] = useState(false);

  // AI Assistant Chat State
  const [messages, setMessages] = useState<Array<{ sender: 'ai' | 'user'; text: string; time: string; options?: string[] }>>([
    {
      sender: 'ai',
      text: 'Hello! I am your AI ESG Assistant. I continuously monitor your telemetry across all 14 platform modules. How can I assist with your carbon trajectory, CSR metrics, or assurance readiness today?',
      time: 'Just now',
      options: [
        'Analyze Q2 Scope 2 heating spike in Pune Facility',
        'Summarize top 3 open compliance gaps across our org',
        'Draft executive summary bullet points for Board meeting',
      ],
    },
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [aiThinking, setAiThinking] = useState(false);

  const handleExport = async (e: React.FormEvent) => {
    e.preventDefault();
    setExporting(true);
    try {
      const res = await reportsApi.customExport({ period, reportType }, format);
      // Trigger browser download simulation
      const url = window.URL.createObjectURL(res.content_blob || new Blob(['EcoSphere ESG Report Content: ' + JSON.stringify({ period, reportType })], { type: 'text/plain' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = res.download_filename;
      a.click();
      showToast(`Exported ${reportType} (${format}) successfully!`, 'success');
    } catch {
      showToast('Export failed', 'error');
    } finally {
      setExporting(false);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const q = textToSend || inputQuery;
    if (!q.trim()) return;

    const newMsg = { sender: 'user' as const, text: q, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setMessages((prev) => [...prev, newMsg]);
    if (!textToSend) setInputQuery('');
    setAiThinking(true);

    setTimeout(() => {
      let aiResp = 'I reviewed the latest telemetry across your organization. Current E/S/G scores stand at 84/78/88 respectively. Total Scope 1+2 footprint is trending 6.4% lower than last quarter due to verified solar offset credits.';
      if (q.toLowerCase().includes('pune') || q.toLowerCase().includes('scope 2')) {
        aiResp = 'Analysis of Pune Manufacturing Facility shows a 14.2% jump in HVAC grid draw during peak afternoon shifts (12:00 - 16:00). Recommendation: Shift high-load thermal cycling to off-peak morning hours or expand on-site solar storage by 250 kW.';
      } else if (q.toLowerCase().includes('compliance') || q.toLowerCase().includes('gap')) {
        aiResp = 'You currently have 2 open compliance items: (1) Pune Effluent Permit corrective action plan is overdue, and (2) Anti-Bribery Policy acknowledgment rate in APAC is at 84% vs the 95% target. Resolving both will boost your Governance score by +3.5 points.';
      } else if (q.toLowerCase().includes('board') || q.toLowerCase().includes('summary')) {
        aiResp = 'Executive Summary for Board Disclosure:\n• Overall Composite Score: 84/100 (Top quartile vs industrial peers)\n• Net Emissions: 418.5 metric tons CO₂e after 64t verified offsets\n• Social & DEI: Female executive leadership increased to 41.5%\n• Assurance: DNV GL completed Stage 1 verification with zero critical non-conformities.';
      }

      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: aiResp,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      setAiThinking(false);
    }, 900);
  };

  return (
    <div className="reports-page" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div className="glass-panel" style={{ padding: '24px 28px', borderRadius: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>Reporting, Analytics & AI Assistant</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Generate auditable regulatory filings (CSRD, GRI, SECR) and query predictive AI models.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        active={activeTab}
        onChange={setActiveTab}
        tabs={[
          { key: 'generator', label: 'Report Generator & Exports', icon: <FileSpreadsheet size={16} /> },
          { key: 'ai-assistant', label: 'AI ESG Assistant (Interactive)', icon: <Sparkles size={16} /> },
        ]}
      />

      {/* Tab 1: Report Generator */}
      {activeTab === 'generator' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
          <div className="glass-card">
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>Configure Regulatory or Custom Export</h3>
            <form onSubmit={handleExport} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>FRAMEWORK / REPORT TYPE</label>
                <select
                  className="input"
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-card)', fontWeight: 600 }}
                >
                  <option value="Comprehensive ESG Disclosure (CSRD / SECR)">Comprehensive ESG Disclosure (CSRD / SECR)</option>
                  <option value="GRI Standard Sustainability Filing">GRI Standard Sustainability Filing</option>
                  <option value="TCFD Climate Risk & Scenario Analysis">TCFD Climate Risk & Scenario Analysis</option>
                  <option value="Greenhouse Gas Protocol Scope 1/2/3 Rollup">Greenhouse Gas Protocol Scope 1/2/3 Rollup</option>
                  <option value="Custom Executive Summary & KPI Matrix">Custom Executive Summary & KPI Matrix</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>REPORTING PERIOD</label>
                <PeriodFilter value={period} onChange={setPeriod} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>EXPORT FORMAT</label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  {(['PDF', 'Excel', 'CSV'] as const).map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => setFormat(fmt)}
                      className="btn"
                      style={{
                        flex: 1,
                        padding: '10px',
                        fontWeight: format === fmt ? 700 : 500,
                        background: format === fmt ? 'hsla(162, 75%, 40%, 0.18)' : 'var(--bg-glass)',
                        color: format === fmt ? 'hsl(162, 75%, 40%)' : 'var(--text-muted)',
                        border: format === fmt ? '1px solid hsl(162, 75%, 40%)' : '1px solid var(--border-glass)',
                      }}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ padding: '14px', borderRadius: '12px', background: 'var(--bg-glass)', border: '1px dashed var(--border-glass)' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>INCLUDED AUDIT SECTIONS:</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><CheckCircle2 size={14} color="var(--color-primary)" /> Verified Carbon Readings & Offset Ledger</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><CheckCircle2 size={14} color="var(--color-primary)" /> Department & Facility Telemetry Rollup</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><CheckCircle2 size={14} color="var(--color-primary)" /> Policy Acknowledgments & Assurance Logs</span>
                </div>
              </div>

              <button type="submit" disabled={exporting} className="btn btn-primary" style={{ padding: '14px', fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <Download size={18} />
                <span>{exporting ? 'Generating Bundle...' : `Download ${format} Report`}</span>
              </button>
            </form>
          </div>

          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>Pre-Configured Disclosure Templates</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                Select a standard corporate reporting template to auto-populate regulatory compliance fields.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  { title: 'EU Corporate Sustainability Reporting Directive (CSRD)', desc: 'Full double materiality assessment and ESRS standards.' },
                  { title: 'Streamlined Energy and Carbon Reporting (SECR)', desc: 'UK mandatory scope 1 & scope 2 intensity metrics.' },
                  { title: 'Quarterly Executive Board Packet', desc: 'KPI tiles, E/S/G breakdowns, and corrective action roadmap.' },
                ].map((tpl, i) => (
                  <div key={i} onClick={() => setReportType(tpl.title)} style={{ padding: '12px', borderRadius: '12px', background: reportType === tpl.title ? 'hsla(var(--hue-primary), 75%, 35%, 0.12)' : 'var(--bg-glass)', border: reportType === tpl.title ? '1px solid var(--color-primary)' : '1px solid var(--border-glass)', cursor: 'pointer' }}>
                    <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-main)' }}>{tpl.title}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{tpl.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: AI Assistant */}
      {activeTab === 'ai-assistant' && (
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', height: '620px', padding: 0, overflow: 'hidden' }}>
          {/* Chat Header */}
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', gap: '12px', background: 'hsla(280, 65%, 60%, 0.08)' }}>
            <div style={{ width: 38, height: 38, borderRadius: '10px', background: 'hsl(280, 65%, 60%)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bot size={22} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-main)' }}>EcoSphere AI Intelligence & Predictive Copilot</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Connected to 14 Live ESG Telemetry Modules • Cryptographically Grounded</div>
            </div>
          </div>

          {/* Messages Body */}
          <div style={{ flexGrow: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {messages.map((m, idx) => (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: m.sender === 'user' ? 'flex-end' : 'flex-start' }}>
                <div
                  style={{
                    maxWidth: '80%',
                    padding: '14px 18px',
                    borderRadius: m.sender === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    background: m.sender === 'user' ? 'hsl(215, 70%, 55%)' : 'var(--bg-glass)',
                    color: m.sender === 'user' ? '#fff' : 'var(--text-main)',
                    border: m.sender === 'ai' ? '1px solid var(--border-glass)' : 'none',
                    fontSize: '14px',
                    lineHeight: '1.6',
                    whiteSpace: 'pre-wrap',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  {m.text}
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', padding: '0 4px' }}>{m.time}</span>

                {m.options && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
                    {m.options.map((opt, i) => (
                      <button
                        key={i}
                        onClick={() => handleSendMessage(opt)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '16px',
                          background: 'hsla(280, 65%, 60%, 0.15)',
                          color: 'hsl(280, 65%, 70%)',
                          border: '1px solid hsla(280, 65%, 60%, 0.3)',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {aiThinking && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', color: 'var(--text-muted)', fontSize: '13px' }}>
                <Bot size={18} className="spin-slow" />
                <span>AI Assistant is analyzing telemetry and formulating response...</span>
              </div>
            )}
          </div>

          {/* Input Bar */}
          <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-glass)', background: 'var(--bg-card)' }}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              style={{ display: 'flex', gap: '12px' }}
            >
              <input
                type="text"
                className="input"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder="Ask about emissions reduction, DEI benchmarks, or audit risks..."
                style={{ flexGrow: 1, padding: '12px 18px', borderRadius: '12px', border: '1px solid var(--border-glass)', background: 'var(--bg-glass)' }}
              />
              <button type="submit" disabled={aiThinking || !inputQuery.trim()} className="btn btn-primary" style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Send size={16} /> Send
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
