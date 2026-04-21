import React, { useState, useEffect, useRef } from 'react';

/**
 * RowActionMenu — Global reusable ⋮ triple-dot action menu for any list row.
 *
 * Props:
 *   actions: Array of { label, icon, onClick, color?, divider? }
 *   align:   'left' | 'right' (default: 'right') — dropdown alignment
 */
const RowActionMenu = ({ actions = [], align = 'right', trigger }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      {/* ⋮ Trigger Component or Default Button */}
      {trigger ? (
        <div onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }} style={{ cursor: 'pointer' }}>
          {trigger}
        </div>
      ) : (
        <button
          onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
          title="Actions"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '18px',
            color: '#94a3b8',
            padding: '4px 8px',
            borderRadius: '6px',
            lineHeight: 1,
            transition: 'background 0.15s, color 0.15s',
            display: 'flex',
            flexDirection: 'column',
            gap: '3px',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#334155'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#94a3b8'; }}
        >
          <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'currentColor', display: 'block' }} />
          <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'currentColor', display: 'block' }} />
          <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'currentColor', display: 'block' }} />
        </button>
      )}

      {/* Dropdown Popup */}
      {open && (
        <div
          onClick={e => e.stopPropagation()}
          style={{
            position: 'absolute',
            [align === 'right' ? 'right' : 'left']: '0',
            top: 'calc(100% + 6px)',
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            boxShadow: '0 12px 32px rgba(0,0,0,0.14), 0 2px 6px rgba(0,0,0,0.06)',
            zIndex: 9999,
            minWidth: '180px',
            overflow: 'hidden',
            animation: 'dropdownIn 0.15s ease-out',
          }}
        >
          {actions.map((action, i) =>
            action.divider ? (
              <div key={i} style={{ height: '1px', background: '#f1f5f9', margin: '3px 0' }} />
            ) : (
              <button
                key={i}
                onClick={() => { action.onClick(); setOpen(false); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  width: '100%',
                  padding: '10px 16px',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  color: action.color || '#334155',
                  fontWeight: action.color ? '600' : '500',
                  textAlign: 'left',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = action.hoverBg || '#f8fafc'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                {action.icon && <span style={{ fontSize: '15px', flexShrink: 0 }}>{action.icon}</span>}
                {action.label}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
};

export default RowActionMenu;
