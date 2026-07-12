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
    <div className="tabs-container" style={{ borderBottom: '1px solid var(--border-glass)', marginBottom: '24px', display: 'flex', gap: '8px', overflowX: 'auto' }}>
      {tabs.map((t) => {
        const isActive = t.key === active;
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            style={{
              padding: '12px 18px',
              border: 'none',
              background: isActive ? 'hsla(var(--hue-primary), 75%, 35%, 0.12)' : 'transparent',
              color: isActive ? 'var(--color-primary)' : 'var(--text-muted)',
              borderBottom: isActive ? '2px solid var(--color-primary)' : '2px solid transparent',
              fontWeight: isActive ? 700 : 500,
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              borderRadius: '8px 8px 0 0',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap',
            }}
          >
            {t.icon}
            <span>{t.label}</span>
            {t.badge !== undefined && (
              <span
                style={{
                  background: isActive ? 'var(--color-primary)' : 'hsla(var(--hue-primary), 20%, 50%, 0.2)',
                  color: isActive ? '#fff' : 'var(--text-muted)',
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: '12px',
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px', position: 'relative' }}>
        {steps.map((s, i) => {
          const isPast = i < current;
          const isCurrent = i === current;
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : 'initial' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '14px',
                    background: isPast ? 'hsl(162, 75%, 35%)' : isCurrent ? 'hsl(215, 70%, 50%)' : 'var(--bg-glass)',
                    color: isPast || isCurrent ? '#fff' : 'var(--text-muted)',
                    border: isCurrent ? '2px solid hsl(215, 70%, 50%)' : '1px solid var(--border-glass)',
                    boxShadow: isCurrent ? '0 0 0 4px hsla(215, 70%, 50%, 0.2)' : 'none',
                    transition: 'all 0.3s ease',
                  }}
                >
                  {isPast ? <Check size={18} /> : i + 1}
                </div>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: isCurrent ? 700 : 500,
                    color: isCurrent ? 'var(--text-main)' : 'var(--text-muted)',
                    marginTop: '6px',
                    textAlign: 'center',
                    maxWidth: '100px',
                  }}
                >
                  {s.title}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div
                  style={{
                    flexGrow: 1,
                    height: '2px',
                    background: isPast ? 'hsl(162, 75%, 35%)' : 'var(--border-glass)',
                    margin: '0 12px',
                    transform: 'translateY(-12px)',
                    transition: 'all 0.3s ease',
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {errorMsg && (
        <div style={{ padding: '12px 16px', borderRadius: '8px', background: 'hsla(0, 80%, 55%, 0.12)', color: 'hsl(0, 80%, 55%)', fontSize: '13px', fontWeight: 600, marginBottom: '20px' }}>
          {errorMsg}
        </div>
      )}

      {/* Step Body */}
      <div className="wizard-step-content" style={{ minHeight: '260px', marginBottom: '24px' }}>
        <h4 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '6px' }}>{steps[current].title}</h4>
        {steps[current].description && <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>{steps[current].description}</p>}
        {steps[current].render()}
      </div>

      {/* Wizard Footer Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-glass)', paddingTop: '20px' }}>
        <div>
          {onCancel && (
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              Cancel
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button type="button" className="btn btn-secondary" disabled={current === 0} onClick={handleBack} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ChevronLeft size={16} /> Back
          </button>
          <button type="button" className="btn btn-primary" onClick={handleNext} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {current === steps.length - 1 ? (
              <span>{submitLabel}</span>
            ) : (
              <>
                <span>Next</span> <ChevronRight size={16} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
