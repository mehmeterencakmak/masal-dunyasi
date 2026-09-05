// ─── CUSTOM SELECT DROPDOWN ──────────────────────────────────────────
import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  minWidth?: number;
}

export default function CustomSelect({ value, onChange, options, minWidth = 160 }: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find(o => o.value === value) ?? options[0];

  // Dışarı tıklanınca kapat
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div
      ref={ref}
      style={{ position: 'relative', minWidth, userSelect: 'none' }}
    >
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          padding: '10px 14px',
          background: open ? 'var(--bg-card-solid)' : 'var(--bg-input)',
          border: `1.5px solid ${open ? 'var(--primary)' : 'var(--border)'}`,
          borderRadius: '12px',
          fontSize: '13.5px',
          fontWeight: '700',
          fontFamily: 'var(--font-sans)',
          color: 'var(--text-main)',
          cursor: 'pointer',
          outline: 'none',
          transition: 'all 0.2s ease',
          boxShadow: open ? '0 0 0 3px var(--primary-glow)' : '0 1px 3px rgba(0,0,0,0.05)',
          whiteSpace: 'nowrap',
        }}
      >
        <span>{selected.label}</span>
        <ChevronDown
          size={15}
          style={{
            color: open ? 'var(--primary)' : '#94a3b8',
            transition: 'transform 0.25s ease',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            flexShrink: 0,
          }}
        />
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            right: 0,
            minWidth,
            background: 'var(--bg-card-solid)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1.5px solid var(--border-hover)',
            borderRadius: '14px',
            boxShadow: '0 12px 40px rgba(0,0,0,0.15), 0 4px 12px var(--primary-glow)',
            overflow: 'hidden',
            zIndex: 999,
            animation: 'dropdownFadeIn 0.18s ease',
          }}
        >
          {options.map((opt, i) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '10px 16px',
                  fontSize: '13.5px',
                  fontWeight: isSelected ? '700' : '500',
                  fontFamily: 'var(--font-sans)',
                  color: isSelected ? 'var(--primary)' : 'var(--text-main)',
                  background: isSelected ? 'var(--primary-glow)' : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease, color 0.15s ease',
                  borderBottom: i < options.length - 1 ? '1px solid var(--border)' : 'none',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => {
                  if (!isSelected) {
                    (e.currentTarget as HTMLButtonElement).style.background = 'var(--primary-glow)';
                  }
                }}
                onMouseLeave={e => {
                  if (!isSelected) {
                    (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                  }
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
