import React from 'react';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';

export interface TabItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
}

export interface TabsProps {
  tabs: TabItem[];
  active: string;
  onChange: (key: string) => void;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, active, onChange }) => {
  return (
    <div className="tabs-container" style={{ borderBottom: '1px solid var(--border-subtle)', marginBottom: '20px', display: 'flex', gap: '8px', overflowX: 'auto' }}>
      {tabs.map((t) => {
        const isActive = t.key === active;
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            style={{
              padding: '10px 14px',
              border: 'none',
              background: 'transparent',
              color: isActive ? 'var(--text-main)' : 'var(--text-muted)',
              borderBottom: isActive ? '2px solid var(--accent-blue)' : '2px solid transparent',
              fontWeight: isActive ? 700 : 500,
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              borderRadius: 0,
              transition: 'var(--transition-fast)',
              whiteSpace: 'nowrap',
            }}
          >
            {t.icon}
            <span>{t.label}</span>
            {t.badge !== undefined && (
              <span
                style={{
                  background: 'var(--bg-surface)',
                  color: 'var(--text-main)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '9px',
                  fontWeight: 700,
                  padding: '1px 5px',
                  borderRadius: 'var(--radius)',
                  marginLeft: '4px'
                }}
              >
                {t.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export interface WizardStep {
  title: string;
  description?: string;
  validate?: () => boolean | string; // returns true if valid, or error string
  render: () => React.ReactNode;
}

export interface WizardProps {
  steps: WizardStep[];
  onComplete: () => void;
  onCancel?: () => void;
  submitLabel?: string;
}

export const Wizard: React.FC<WizardProps> = ({ steps, onComplete, onCancel, submitLabel = 'Submit & Create' }) => {
  const [current, setCurrent] = React.useState(0);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const handleNext = () => {
    setErrorMsg(null);
    const step = steps[current];
    if (step.validate) {
      const res = step.validate();
      if (typeof res === 'string') {
        setErrorMsg(res);
        return;
      }
      if (res === false) {
        setErrorMsg('Please complete all required fields correctly before proceeding.');
        return;
      }
    }
    if (current < steps.length - 1) {
      setCurrent((c) => c + 1);
    } else {
      onComplete();
    }
  };

  const handleBack = () => {
    setErrorMsg(null);
    if (current > 0) setCurrent((c) => c - 1);
  };

  return (
    <div className="wizard-container">
      {/* Stepper Progress */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', position: 'relative' }}>
        {steps.map((s, i) => {
          const isPast = i < current;
          const isCurrent = i === current;
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : 'initial' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2 }}>
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 'var(--radius)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '12px',
                    background: isPast ? 'var(--bg-surface)' : isCurrent ? 'var(--bg-app)' : 'var(--bg-app)',
                    color: isPast ? 'var(--text-main)' : isCurrent ? 'var(--accent-blue)' : 'var(--text-muted)',
                    border: isPast
                      ? '1px solid var(--border)'
                      : isCurrent
                      ? '1px solid var(--accent-blue)'
                      : '1px solid var(--border-subtle)',
                    transition: 'var(--transition-fast)',
                  }}
                >
                  {isPast ? <Check size={14} /> : i + 1}
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: isCurrent ? 700 : 500,
                    color: isCurrent ? 'var(--text-main)' : 'var(--text-muted)',
                    marginTop: '4px',
                    textAlign: 'center',
                    maxWidth: '90px',
                  }}
                >
                  {s.title}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div
                  style={{
                    flexGrow: 1,
                    height: '1px',
                    background: isPast ? 'var(--accent-blue)' : 'var(--border-subtle)',
                    margin: '0 8px',
                    transform: 'translateY(-10px)',
                    transition: 'var(--transition-fast)',
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {errorMsg && (
        <div style={{ padding: '10px 14px', border: '1px solid var(--accent-red)', borderRadius: 'var(--radius)', background: 'var(--bg-card)', color: 'var(--accent-red)', fontSize: '0.8rem', fontWeight: 600, marginBottom: '16px' }}>
          {errorMsg}
        </div>
      )}

      {/* Step Body */}
      <div className="wizard-step-content" style={{ minHeight: '220px', marginBottom: '20px' }}>
        <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '4px', fontFamily: 'var(--font-display)' }}>{steps[current].title}</h4>
        {steps[current].description && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px' }}>{steps[current].description}</p>}
        {steps[current].render()}
      </div>

      {/* Wizard Footer Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
        <div>
          {onCancel && (
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              Cancel
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="button" className="btn btn-secondary" disabled={current === 0} onClick={handleBack} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ChevronLeft size={14} /> Back
          </button>
          <button type="button" className="btn btn-primary" onClick={handleNext} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {current === steps.length - 1 ? (
              <span>{submitLabel}</span>
            ) : (
              <>
                <span>Next</span> <ChevronRight size={14} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
