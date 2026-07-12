import React, { useState, useEffect } from 'react';
import { AlertTriangle, Search, X, Check } from 'lucide-react';
import type { Money, Period } from '../../types';
import { Modal } from './Overlays';

export interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title = 'Confirm Action',
  message,
  confirmLabel = 'Confirm & Proceed',
  cancelLabel = 'Cancel',
  destructive = true,
  onConfirm,
  onClose,
}) => {
  return (
    <Modal open={open} title={title} onClose={onClose} maxWidth="440px">
      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
          <div
            style={{
              width: 48,
              height: 48,
              border: `1px solid ${destructive ? 'var(--accent-red)' : 'var(--accent-blue)'}`,
              color: destructive ? 'var(--accent-red)' : 'var(--accent-blue)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AlertTriangle size={24} />
          </div>
        </div>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: '1.6', marginBottom: '24px' }}>{message}</p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={destructive ? 'btn btn-danger' : 'btn btn-primary'}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export interface PeriodFilterProps {
  value: Period;
  onChange: (period: Period) => void;
  showMonth?: boolean;
  allowRange?: boolean;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const PeriodFilter: React.FC<PeriodFilterProps> = ({ value, onChange, showMonth = true }) => {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'var(--bg-card)', padding: '2px 8px', borderRadius: 'var(--radius)', border: '1px solid var(--border-subtle)' }}>
      <select
        className="input"
        value={value.year}
        onChange={(e) => onChange({ ...value, year: parseInt(e.target.value) })}
        style={{ padding: '4px 8px', fontSize: '0.8rem', border: 'none', background: 'transparent', fontWeight: 700, cursor: 'pointer', width: 'auto' }}
      >
        {[2024, 2025, 2026, 2027].map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>

      {showMonth && (
        <>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>/</span>
          <select
            className="input"
            value={value.month || 6}
            onChange={(e) => onChange({ ...value, month: parseInt(e.target.value) })}
            style={{ padding: '4px 8px', fontSize: '0.8rem', border: 'none', background: 'transparent', fontWeight: 700, cursor: 'pointer', width: 'auto' }}
          >
            {MONTHS.map((m, idx) => (
              <option key={idx + 1} value={idx + 1}>
                {m}
              </option>
            ))}
          </select>
        </>
      )}
    </div>
  );
};

export interface MoneyInputProps {
  value: Money;
  onChange: (money: Money) => void;
  label?: string;
  disabled?: boolean;
}

export const MoneyInput: React.FC<MoneyInputProps> = ({ value, onChange, label, disabled = false }) => {
  const [amtStr, setAmtStr] = useState(value?.amount !== undefined ? value.amount.toString() : '0');

  useEffect(() => {
    if (value && value.amount !== undefined && parseFloat(amtStr) !== value.amount) {
      setAmtStr(value.amount.toString());
    }
  }, [value?.amount]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '' || /^\d*\.?\d*$/.test(val)) {
      setAmtStr(val);
      const num = parseFloat(val);
      if (!isNaN(num) && num >= 0) {
        onChange({ amount: num, currency: value?.currency || 'USD' });
      } else if (val === '') {
        onChange({ amount: 0, currency: value?.currency || 'USD' });
      }
    }
  };

  return (
    <div style={{ marginBottom: label ? '16px' : 0 }}>
      {label && <label>{label}</label>}
      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text"
          className="input"
          disabled={disabled}
          value={amtStr}
          onChange={handleAmountChange}
          placeholder="Amount (≥ 0)"
          style={{ flexGrow: 1, padding: '0.65rem 0.85rem', borderRadius: 'var(--radius)', border: '1px solid var(--border-subtle)', background: 'var(--bg-app)' }}
        />
        <select
          className="input"
          disabled={disabled}
          value={value?.currency || 'USD'}
          onChange={(e) => onChange({ amount: value?.amount || 0, currency: e.target.value })}
          style={{ width: '100px', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius)', border: '1px solid var(--border-subtle)', background: 'var(--bg-app)', fontWeight: 700 }}
        >
          {['USD', 'EUR', 'GBP', 'INR', 'JPY', 'AUD', 'CAD'].map((curr) => (
            <option key={curr} value={curr}>
              {curr}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export interface SearchBoxProps<T> {
  onSearch: (query: string) => Promise<T[]> | T[];
  onPick: (item: T) => void;
  renderItem: (item: T) => React.ReactNode;
  placeholder?: string;
  itemKey?: (item: T) => string;
}

export function SearchBox<T extends Record<string, any>>({
  onSearch,
  onPick,
  renderItem,
  placeholder = 'Search users, products or entities...',
  itemKey = (item) => item._id || item.id || JSON.stringify(item),
}: SearchBoxProps<T>) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<T[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await onSearch(query);
        setResults(res);
        setIsOpen(true);
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: 12 }} />
        <input
          type="text"
          className="input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          style={{ width: '100%', padding: '0.65rem 0.85rem 0.65rem 2.25rem', borderRadius: 'var(--radius)', border: '1px solid var(--border-subtle)', background: 'var(--bg-app)' }}
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setResults([]);
              setIsOpen(false);
            }}
            style={{ position: 'absolute', right: 12, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {isOpen && (
        <div
          className="glass-panel"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '4px',
            maxHeight: '260px',
            overflowY: 'auto',
            zIndex: 1100,
            boxShadow: 'none',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--border)',
            backgroundColor: 'var(--bg-card)',
          }}
        >
          {isSearching ? (
            <div style={{ padding: '12px', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Searching...</div>
          ) : results.length === 0 ? (
            <div style={{ padding: '12px', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>No matching results found</div>
          ) : (
            results.map((item) => (
              <div
                key={itemKey(item)}
                onClick={() => {
                  onPick(item);
                  setQuery('');
                  setIsOpen(false);
                }}
                style={{
                  padding: '10px 12px',
                  borderBottom: '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  transition: 'var(--transition-fast)',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-surface)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                {renderItem(item)}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export interface MultiSelectProps {
  options: Array<{ value: string; label: string }>;
  value: string[];
  onChange: (vals: string[]) => void;
  placeholder?: string;
}

export const MultiSelect: React.FC<MultiSelectProps> = ({ options, value, onChange, placeholder = 'Select items...' }) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleVal = (v: string) => {
    if (value.includes(v)) {
      onChange(value.filter((item) => item !== v));
    } else {
      onChange([...value, v]);
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div
        className="input"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          minHeight: '38px',
          padding: '4px 8px',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border-subtle)',
          background: 'var(--bg-app)',
          cursor: 'pointer',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '4px',
          alignItems: 'center',
        }}
      >
        {value.length === 0 ? (
          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{placeholder}</span>
        ) : (
          value.map((v) => {
            const opt = options.find((o) => o.value === v);
            return (
              <span
                key={v}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'var(--bg-surface)',
                  color: 'var(--text-main)',
                  border: '1px solid var(--border-subtle)',
                  padding: '2px 6px',
                  borderRadius: 'var(--radius)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                }}
              >
                {opt ? opt.label : v}
                <X
                  size={12}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleVal(v);
                  }}
                  style={{ cursor: 'pointer', color: 'var(--text-muted)' }}
                />
              </span>
            );
          })
        )}
      </div>

      {isOpen && (
        <div
          className="glass-panel"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '4px',
            maxHeight: '200px',
            overflowY: 'auto',
            zIndex: 1100,
            padding: '4px 0',
            boxShadow: 'none',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--border)',
            backgroundColor: 'var(--bg-card)',
          }}
        >
          {options.map((opt) => {
            const selected = value.includes(opt.value);
            return (
              <div
                key={opt.value}
                onClick={() => toggleVal(opt.value)}
                style={{
                  padding: '8px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  background: selected ? 'var(--bg-surface)' : 'transparent',
                  color: selected ? 'var(--accent-blue)' : 'var(--text-main)',
                  fontWeight: selected ? 700 : 400,
                }}
                onMouseEnter={(e) => !selected && (e.currentTarget.style.background = 'var(--bg-surface)')}
                onMouseLeave={(e) => !selected && (e.currentTarget.style.background = 'transparent')}
              >
                <span>{opt.label}</span>
                {selected && <Check size={12} color="var(--accent-blue)" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
